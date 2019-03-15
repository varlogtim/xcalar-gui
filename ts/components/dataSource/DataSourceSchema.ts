class DataSourceSchema {
    private _$container: JQuery;
    private _events: object;
    private _caseInSensitive: boolean;

    public constructor($section: JQuery) {
        this._$container = $section;
        this._events = {};
        this._caseInSensitive = false;
        this._addEventListeners();
    }

    public show(): void {
        this._toggleDisplay(true);
    }

    public hide(): void {
        this._toggleDisplay(false);
    }

    public setAutoSchema(): void {
        this._toggleSchemaCheckbox(true);
    }

    public setSchema(schema: ColSchema[]): void {
        this._toggleSchemaCheckbox(false);
        this._addSchema(schema);
    }

    public reset(): void {
        this._toggleSchemaCheckbox(false);
        this._showSchemaError(null);
    }

    public validate(): {schema: ColSchema[], primaryKeys: string[]} | null {
        let res = this._validateSchema(false);
        return res.error ? null : res;
    }

    public registerEvent(event: string, callback: Function): DataSourceSchema {
        this._events[event] = callback;
        return this;
    }

    public toggleCaseInsensitive(caseInsensitive: boolean): void {
        this._caseInSensitive = caseInsensitive;
    }

    private _getContainer(): JQuery {
        return this._$container
    }

    private _getCheckboxEl(): JQuery {
        return this._getContainer().find(".checkboxSection .checkbox");
    }

    private _getSchemaTextAreaEl(): JQuery {
        return this._getContainer().find("textarea");
    }

    private _getSchemaWizardEl(): JQuery {
        return this._getContainer().find(".schemaWizard");
    }

    private _toggleDisplay(show: boolean): void {
        let $container = this._getContainer();
        this._getSchemaTextAreaEl().val("");
        if (show) {
            $container.removeClass("xc-hidden");
        } else {
            $container.addClass("xc-hidden");
        }
    }

    private _toggleSchemaCheckbox(check: boolean): void {
        let $checkbox = this._getCheckboxEl();
        if ($checkbox.length === 0) {
            return; // has no checkbox
        }
        let $schemaPart = this._getSchemaTextAreaEl().add(this._getSchemaWizardEl());
        if (check == null) {
            check = !$checkbox.hasClass("checked");
        }
        
        if (check) {
            $checkbox.addClass("checked");
            $schemaPart.addClass("xc-disabled");
        } else {
            $checkbox.removeClass("checked");
            $schemaPart.removeClass("xc-disabled");
        }
    }

    private _isAutoDetect(): boolean {
        let $checkbox = this._getCheckboxEl();
        return $checkbox.length && $checkbox.hasClass("checked");
    }

    private _addSchema(colSchema: ColSchema[]): void {
        this._getSchemaTextAreaEl().val(JSON.stringify(colSchema));
    }

    private _showSchemaError(error: string): void {
        this._getContainer().find(".schemaError").text(error || "");
    }

    private _checkSchema(): ColSchema[] {
        let res = this._validateSchema(true);
        let error: string = res.error;
        if (error === ErrTStr.NoEmpty) {
            // empty case is not checked here
            error = null;
        }
        this._showSchemaError(error);
        return res.schema;
    } 

    private _validateSchema(ignoreError: boolean): {
        schema: ColSchema[],
        schemaToSuggest: ColSchema[],
        primaryKeys: string[],
        pkOrders: {name: string, order: number}[],
        error: string
    } {
        if (this._isAutoDetect()) {
            return {
                schema: null,
                schemaToSuggest: null,
                primaryKeys: null,
                pkOrders: null,
                error: null
            };
        }
        var $textArea = this._getSchemaTextAreaEl();
        let res = this._parseSchema($textArea.val().trim());
        if (res.error == null) {
            res.error = this._triggerEvent(DataSourceSchemaEvent.ValidateSchema, res.schema);
        }
        if (res.error) {
            if (!ignoreError) {
                StatusBox.show(res.error, $textArea, false);
            }
        }
        return res;
    }

    private _parseSchema(val: string): {
        schema: ColSchema[],
        schemaToSuggest: ColSchema[],
        primaryKeys: string[],
        pkOrders: {name: string, order: number}[],
        error: string
    } {
        if (val === "") {
            return {
                schema: null,
                schemaToSuggest: [],
                primaryKeys: null,
                pkOrders: null,
                error: ErrTStr.NoEmpty
            };
        }
        
        let validTypes: ColumnType[] = BaseOpPanel.getBasicColTypes();
        let schema: ColSchema[] = [];
        let schemaToSuggest: ColSchema[] = [];
        let pkOrders: {name: string, order: number}[] = [];
        let usedPkOrders: Set<number> = new Set();
        let error: string = null;

        try {
            if (val[0] !== "[") {
                val = "[" + val;
            }
            if (val[val.length - 1] !== "]") {
                val = val + "]";
            }

            let parsed = JSON.parse(val);
            let nameCache = {};
            parsed.forEach((column) => {
                if (typeof column !== "object") {
                    error = error || "Invalid schema, should include name and type attribute";
                    schemaToSuggest.push({
                        name: "",
                        type: null
                    });
                    return;
                }
                let name: string = null;
                let type: ColumnType = null;
                let pk: string = null;

                for (let key in column) {
                    let trimmedKey = key.trim();
                    if (trimmedKey === "name") {
                        name = column[key];
                    } else if (trimmedKey === "type") {
                        type = column[key];
                    } else if (trimmedKey === "pk") {
                        pk = column[key];
                    }
                }

                if (name != null && this._caseInSensitive) {
                    name = name.toUpperCase();
                }

                if (!name) {
                    error = error || "Invalid schema, name attribute should exist for each entry and cannot be null or empty";
                } else if (!type) {
                    error = error || "Invalid schema, type attribute should exist for each entry and cannot be null or empty";
                }  else if (nameCache.hasOwnProperty(name)) {
                    error = error || "Column " + name + " occurs more than 1 time in the schema";
                    name = null;
                } else if (!validTypes.includes(type)) {
                    error = error || "Invalid type: " + type;
                } else {
                    let nameError = xcHelper.validateColName(name);
                    if (nameError) {
                        error = error || nameError;
                        name = null;
                    } else {
                        nameCache[name] = true;
                        schema.push({
                            name: name,
                            type: type
                        });
                    }
                }

                if (pk != null) {
                    let pkOrder: number = Number(pk);
                    if (isNaN(pkOrder)) {
                        error = error || "Invalid primary key order for column \"" + name + "\", please specify a number";
                    } else if (pkOrder < 0) {
                        error = error || "Primay key order should be a position number";
                    } else if (usedPkOrders.has(pkOrder)) {
                        error = error || "Primary key with the same order of " + pk + " already exist.";
                    } else {
                        pkOrders.push({name: name, order: pkOrder});
                        usedPkOrders.add(pkOrder);
                    }
                }

                schemaToSuggest.push({
                    name: name,
                    type: type
                });
            });
        } catch (e) {
            error = ErrTStr.ParseSchema;
        }

        if (error != null) {
            // error case
            schema = null;
        }

        let primaryKeys: string[] = error ? null : this._getPrimaryKeysFromOrder(pkOrders);
        return {
            schema: schema,
            schemaToSuggest: schemaToSuggest,
            primaryKeys: primaryKeys,
            pkOrders: pkOrders,
            error: error
        };
    }

    private _changeSchema(): void {
        let schema: ColSchema[] = this._checkSchema();
        let isAutoDetect: boolean = this._isAutoDetect();
        this._triggerEvent(DataSourceSchemaEvent.ChangeSchema, {
            autoDetect: isAutoDetect,
            schema: schema
        });
    }

    private _getPrimaryKeysFromOrder(
        pkOrders: {name: string, order: number}[]
    ): string[] {
        pkOrders.sort((pk1, pk2) => {
            return pk1.order - pk2.order
        });
        // as column name is upper case, primary key must by uppercase
        // when pass into xiApi
        return pkOrders.map((pk) => pk.name.toUpperCase());
    }

    private _addPKOrderToSchema(
        schema: ColSchema[],
        pkOrder: {name: string, order: number}[],
    ): {name: string, type: ColumnType, pk?: number}[] {
        try {
            if (pkOrder.length === 0) {
                return schema;
            }
            let map: Map<string, number> = new Map();
            pkOrder.forEach((pk) => {
                map.set(pk.name, pk.order);
            });
            let schemaWithPks: {name: string, type: ColumnType, pk?: number}[] = schema.map((colInfo) => {
                let name: string = colInfo.name;
                let newColInfo = {
                    name: name,
                    type: colInfo.type
                };
                if (map.has(name)) {
                    newColInfo["pk"] = map.get(name);
                }
                return newColInfo;
            });
            return schemaWithPks;
        } catch (e) {
            console.error(e);
        }
        return schema;
    }

    private _triggerEvent(event, ...args): any {
        if (typeof this._events[event] === 'function') {
            return this._events[event].apply(this, args);
        } else {
            return null;
        }
    }

    private _addEventListeners(): void {
        let $container = this._getContainer();
        $container.find(".checkboxSection").on("click", () => {
            this._toggleSchemaCheckbox(null);
            this._changeSchema();
        });

        this._getSchemaWizardEl().click(() => {
            let initialSchema: ColSchema[] = this._triggerEvent(DataSourceSchemaEvent.GetHintSchema);
            let res = this._validateSchema(true);
            let currentSchema: ColSchema[] = res.schema || res.schemaToSuggest || [];
            let currentPkOrders = res.pkOrders;
            let callback = (schema: ColSchema[]): void => {
                schema = this._addPKOrderToSchema(schema, currentPkOrders);
                this._showSchemaError(null);
                this._addSchema(schema);
                this._triggerEvent(DataSourceSchemaEvent.ChangeSchema, {
                    autoDetect: false,
                    schema: schema
                });
            };
            SchemaSelectionModal.Instance.show(initialSchema, currentSchema, callback);
        });

        let inputTimer = null;
        this._getSchemaTextAreaEl().on("input", () => {
            clearTimeout(inputTimer);
            inputTimer = setTimeout(() => {
                this._changeSchema();
            }, 500);
        });
    }
}