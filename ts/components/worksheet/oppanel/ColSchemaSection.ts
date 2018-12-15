class ColSchemaSection {
    private _$section: JQuery;
    private _initialSchema: ColSchema[];

    public constructor($section: JQuery) {
        this._$section = $section;
        this._addEventListeners();
    }

    public setInitialSchema(schema: ColSchema[]): void {
        this._initialSchema = schema;
    }

    public render(schema: ColSchema[]): void {
        this.clear();
        if (schema.length > 0) {
            this._addList(schema);
        }
    }

    public clear(): void {
        this._addNoSchemaHint();
    }

    public getSchema(ingore: boolean): ColSchema[] {
        const schema: ColSchema[] = [];
        const $contentSection: JQuery = this._getContentSection();
        let valid: boolean = true;
        $contentSection.find(".part").each((_index, el) => {
            const $part: JQuery = $(el);
            const $name: JQuery = $part.find(".name input");
            const name: string = $name.val().trim();
            if (!ingore && !name) {
                StatusBox.show(ErrTStr.NoEmpty, $name);
                valid = false;
                return false; // stop loop
            }
            const $type: JQuery = $part.find(".type .text");
            const colType: ColumnType = <ColumnType>$type.text();
            if (!ingore && !colType) {
                StatusBox.show(ErrTStr.NoEmpty, $type);
                valid = false;
                return false; // stop loop
            }
            schema.push({
                name: name,
                type: colType
            });
        });
        if (!ingore && valid && schema.length === 0) {
            valid = false;
            StatusBox.show(ErrTStr.NoEmptySchema, $contentSection);
        }
        return valid ? schema : null;
    }

    private _getContentSection(): JQuery {
        return this._$section.find(".listSection .content");
    }

    private _addNoSchemaHint(): void {
        const html: HTML =
            '<div class="hint">' +
                OpPanelTStr.DFLinkInNoSchema +
            '</div>';
        this._getContentSection().html(html);
    }

    private _addList(schema: ColSchema[], $rowToReplace?: JQuery): void {
        const $contentSection: JQuery = this._getContentSection();
        $contentSection.find(".hint").remove();
        const dropdownList: HTML =
        '<div class="list">' +
            '<ul></ul>' +
            '<div class="scrollArea top">' +
                '<i class="arrow icon xi-arrow-up"></i>' +
            '</div>' +
            '<div class="scrollArea bottom">' +
                '<i class="arrow icon xi-arrow-down"></i>' +
            '</div>' +
        '</div>';
        const fixedSchemaMap: {[key: string]: ColumnType} = {};
        const initialSchema: ColSchema[] = this._initialSchema || [];
        initialSchema.forEach((colInfo) => {
            fixedSchemaMap[colInfo.name] = colInfo.type;
        });
        const list: JQuery[] = schema.map((col) => {
            let name: string =  col.name || "";
            let type: string = col.type || "";
            let typeDropdownPart: HTML = "";
            if (fixedSchemaMap[name]) {
                type = fixedSchemaMap[name];
            } else {
                typeDropdownPart =
                    '<div class="iconWrapper">' +
                        '<i class="icon xi-arrow-down"></i>' +
                    '</div>' +
                    dropdownList;
            }
            const row: HTML =
            '<div class="part">' +
                '<div class="name dropDownList">' +
                    '<i class="remove icon xi-close-no-circle xc-action fa-8"></i>' +
                    '<input value="' + name + '" spellcheck="false">' +
                    dropdownList +
                '</div>' +
                '<div class="type dropDownList">' +
                    '<div class="text">' + type + '</div>' +
                    typeDropdownPart +
                '</div>' +
            '</div>';
            return $(row);
        });

        list.forEach(($row) => {
            this._addHintDropdown($row.find(".name.dropDownList"));
            this._addTypeDropdwn($row.find(".type.dropDownList"));
            if ($rowToReplace != null) {
                $rowToReplace.after($row);
            } else {
                $contentSection.append($row);
            }
        });

        if ($rowToReplace != null) {
            $rowToReplace.remove();
        }
    }

    private _removeList($row: JQuery): void {
        $row.remove();
        if (this._$section.find(".part").length === 0) {
            this._addNoSchemaHint();
        }
    }

    private _selectList($row: JQuery, schema: ColSchema): void {
        const index: number = $row.index();
        let $rowWithSamaeName: JQuery = null;
        const $contentSection: JQuery = this._getContentSection();
        $contentSection.find(".part").each((i, el) => {
            const $currentRow = $(el);
            if (index !== i &&
                $currentRow.find(".name input").val() === schema.name
            ) {
                $rowWithSamaeName = $currentRow;
                return false; // stop loop
            }
        })
        if ($rowWithSamaeName != null) {
            schema.type = schema.type || <ColumnType>$rowWithSamaeName.find(".type").text();
            this._addList([{name: "", type: null}], $rowWithSamaeName);
        }
        this._addList([schema], $row);
    }

    private _getSelector(): string {
        const $panel: JQuery = this._$section.closest(".opPanel");
        const selector: string = `#${$panel.attr("id")}`;
        return selector;
    }

    private _addHintDropdown($dropdown: JQuery): void {
        const selector: string = this._getSelector();
        const hintDropdown = new MenuHelper($dropdown, {
            onOpen: ($curDropdown) => {
                this._populateHintDropdown($curDropdown);
            },
            onSelect: ($li) => {
                if (!$li.hasClass("hint")) {
                    const schema: ColSchema = {
                        name: $li.text(),
                        type: $li.data("type")
                    };
                    this._selectList($li.closest(".part"), schema);
                }
            },
            container: selector,
            bounds: selector
        }).setupListeners();

        // colName hint dropdown
        let hintTimer: number;
        $dropdown.on("input", "input", (event) => {
            const $input: JQuery = $(event.currentTarget);
            clearTimeout(hintTimer);
            hintTimer = window.setTimeout(() => {
                this._populateHintDropdown($dropdown, $input.val().trim());
                hintDropdown.openList();
            }, 200);
        });
    }

    private _populateHintDropdown(
        $dropdown: JQuery,
        keyword: string = ""
    ): void {
        let html: HTML = "";
        let schemaMap: {[key: string]: ColSchema} = {};
        let cacheSchema = (colInfo) => {
            const colName: string = colInfo.name;
            if (colName && colName.includes(keyword)) {
                schemaMap[colName] = colInfo;
            }
        };
        const index: number = $dropdown.closest(".part").index();
        let currentSchema: ColSchema[] = this.getSchema(true);
        currentSchema.splice(index, 1); // remove the current row
        currentSchema.forEach(cacheSchema);

        const initialSchema: ColSchema[] = this._initialSchema || [];
        initialSchema.forEach(cacheSchema);

        const schema = [];
        for (let name in schemaMap) {
            schema.push(schemaMap[name]);
        }

        // sort by name
        schema.sort((a, b) => {
            let aName = a.name.toLowerCase();
            let bName = b.name.toLowerCase();
            return (aName < bName ? -1 : (aName > bName ? 1 : 0));
        });

        schema.forEach((colInfo) => {
            const colName = colInfo.name;
            const type = colInfo.type;
            html +=
            '<li data-type="' + type + '">' +
                BaseOpPanel.craeteColumnListHTML(type, colName) +
            '</li>';
        });

        if (!html) {
            html = `<li class="hint">${CommonTxtTstr.NoResult}</li>`;
        }
        $dropdown.find("ul").html(html);
    }

    private _addTypeDropdwn($dropdown: JQuery) {
        const selector: string = this._getSelector();
        new MenuHelper($dropdown, {
            onOpen: ($curDropdown) => {
                this._populateTypeDropdown($curDropdown);
            },
            onSelect: ($li) => {
                const $text: JQuery = $li.closest(".dropDownList").find(".text");
                $text.text($li.text());
            },
            container: selector,
            bounds: selector
        }).setupListeners();
    }

    private _populateTypeDropdown($dropdown: JQuery): void {
        const validTypes = [ColumnType.boolean, ColumnType.float, ColumnType.integer,
        ColumnType.string, ColumnType.timestamp, ColumnType.mixed, ColumnType.unknown];
        const html: HTML = validTypes.map((colType) => {
            const li: HTML =
                '<li>' +
                    '<i class="icon xi-' + colType + '"></i>' +
                    '<span class="name">' + colType + '</span>' +
                '</li>';
            return li;
        }).join("");
        $dropdown.find("ul").html(html);
    }

    private _addEventListeners(): void {
        const $section: JQuery = this._$section;
        $section.on("click", ".clear", () => {
            this.clear();
        });

        $section.on("click", ".addColumn", () => {
            this._addList([{name: "", type: null}]);
        });

        $section.on("click", ".part .remove", (event) => {
            this._removeList($(event.currentTarget).closest(".part"));
        });

        $section.on("change", ".part .name input", (event) => {
            const $nameInput: JQuery = $(event.target);
            const $part: JQuery = $nameInput.closest(".part");
            const schema: ColSchema = {
                name: $nameInput.val().trim(),
                type: <ColumnType>$part.find(".type .text").text()
            }
            this._selectList($part, schema);
        });
    }
}