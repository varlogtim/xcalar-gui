
class MapOpPanelModel extends GeneralOpPanelModel {
    protected dagNode: DagNodeMap;
    protected tableColumns: ProgCol[];
    protected event: Function;
    protected groups: OpPanelFunctionGroup[];
    protected icv: boolean;

    /**
     * Return the whole model info
     */
    public getModel(): {
        groups: OpPanelFunctionGroup[],
        icv: boolean
    } {
        return {
            groups: this.groups,
            icv: this.icv
        }
    }

    public addGroup(): void {
        this.groups.push({
            operator: "",
            args: [],
            newFieldName: ""
        });

        this._update();
    }

    public enterFunction(value: string, opInfo, index: number): void {
        this.groups[index].operator = value;
        if (opInfo) {
            const numArgs = Math.max(Math.abs(opInfo.numArgs),
                                opInfo.argDescs.length);
            this.groups[index].args = Array(numArgs).fill("").map((_o, i) => {
                    const arg = opInfo.argDescs[i];
                    const isOptional = this._isOptional(opInfo, i);
                    return new OpPanelArg("", arg.typesAccepted, isOptional);
                });
            if (this.autofillColumns && index === 0) {
                for (let i = 0; i < this.groups[index].args.length; i++) {
                    if (this.autofillColumns[i]) {
                        this.updateArg(gColPrefix + this.autofillColumns[i].getBackColName(), 0, i);
                    }
                }
            }
            if (value === "regex" && numArgs === 2) {
                this.groups[index].args[1].setRegex(true);
            }
        } else {
            this.groups[index].args = [];
        }

        if (index === 0 && this.autofillColumns && this.autofillColumns[0]) {
            let autoGenColName: string = xcHelper.parsePrefixColName(this.autofillColumns[0].getBackColName()).name;
            if (opInfo.displayName.indexOf(":") > -1) {
                autoGenColName += "_udf";
            } else {
                autoGenColName += "_" + opInfo.displayName;
            }

            autoGenColName = xcHelper.stripColName(autoGenColName);
            autoGenColName = this._getAutoGenColName(autoGenColName);
            this.updateNewFieldName(autoGenColName, 0);
        }

        this._update();
    }

    public getColumnTypeFromArg(value): string {
        const self = this;
        let colType: string;

        const progCol: ProgCol = self.tableColumns.find((progCol) => {
            return progCol.getBackColName() === value;
        });
        if (progCol == null) {
            console.error("cannot find col", value);
            return;
        }

        colType = progCol.getType();
        if (colType === ColumnType.integer && !progCol.isKnownType()) {
            // for fat potiner, we cannot tell float or integer
            // so for integer, we mark it
            colType = ColumnType.number;
        }
        return colType;
    }

    public updateNewFieldName(newFieldName: string, groupIndex: number): void {
        this.groups[groupIndex].newFieldName = newFieldName;
    }

    public toggleICV(isICV: boolean): void {
        this.icv = isICV;
    }

    protected _initialize(paramsRaw, strictCheck?: boolean, isSubmit?: boolean) {
        const self = this;
        if (!this._opCategories.length) {
            const operatorsMap = XDFManager.Instance.getOperatorsMap();
            for (let i in operatorsMap) {
                if (parseInt(i) !== FunctionCategoryT.FunctionCategoryAggregate) {
                    this._opCategories.push(parseInt(i));
                }
            }
        }
        let argGroups = [];
        let newFieldNames = [];
        for (let i = 0; i < paramsRaw.eval.length; i++) {
            let parsedEval: ParsedEval = XDParser.XEvalParser.parseEvalStr(
                paramsRaw.eval[i].evalString);

            if (parsedEval["error"]) {
                if (strictCheck) {
                    throw(parsedEval);
                } else {
                    parsedEval = {fnName:"", args: [], type: "fn", error: null};
                }
            }
            argGroups.push(parsedEval);
            newFieldNames.push(paramsRaw.eval[i].newField);
        }

        let groups = [];

        for (let i = 0; i < argGroups.length; i++) {
            let argGroup = argGroups[i];
            let args: OpPanelArg[] = [];
            const opInfo = this._getOperatorObj(argGroup.fnName);
            let lastArg;
            let hasVariableArg = false;
            let hasParamFn = false;
            if (argGroup.args.length) {
                if (!opInfo) {
                    if (isSubmit && argGroup.fnName.includes(gParamStart)) {
                        hasParamFn = true;
                        // ok to submit when parameter is found
                    } else if (argGroup.fnName.length) {
                        if (argGroup.fnName.includes(":")) {
                            throw({error: "This function was not found: " + argGroup.fnName });
                        } else {
                            throw({error: "\"" + argGroup.fnName + "\" is not a" +
                                " valid map function."});
                        }
                    } else {
                        throw({error: "Function not selected."});
                    }
                } else if (argGroup.args.length > opInfo.argDescs.length) {
                    lastArg = opInfo.argDescs[opInfo.argDescs.length - 1];
                    if (lastArg.argType === XcalarEvalArgTypeT.VariableArg ||
                        (lastArg.argDesc.indexOf("*") === 0 &&
                        lastArg.argDesc.indexOf("**") === -1)) {
                        hasVariableArg = true;
                    } else {
                        throw ({error: "\"" + argGroup.fnName + "\" only accepts " +
                            opInfo.argDescs.length + " arguments."});
                    }
                }
            }

            for (var j = 0; j < argGroup.args.length; j++) {
                let arg = argGroup.args[j].value;
                if (argGroup.args[j].type === "fn") {
                    arg = xcHelper.stringifyEval(argGroup.args[j]);
                }
                let typesAccepted;
                let isOptional;
                if (hasParamFn) {
                    typesAccepted = -2049;
                    isOptional = true;
                } else if (hasVariableArg) {
                    typesAccepted = lastArg.typesAccepted
                    isOptional = this._isOptional(opInfo, j);
                } else {
                    typesAccepted = opInfo.argDescs[j].typesAccepted;
                    isOptional = this._isOptional(opInfo, j);
                }
                const argInfo: OpPanelArg = new OpPanelArg(arg, typesAccepted,
                                                           isOptional, true);
                args.push(argInfo);
            }
            args.forEach((arg, index) => {
                const rawValue = arg.getValue();
                let value = self.formatArgToUI(rawValue);
                if (argGroup.fnName === "regex" && args.length === 2 &&
                    index === 1) {
                    arg.setRegex(true);
                }
                if (rawValue === "\"\"") {
                    arg.setIsEmptyString(true);
                }
                if (rawValue === "None") {
                    value = "";
                    arg.setIsNone(true);
                }
                arg.setValue(value);
                arg.setFormattedValue(rawValue);
                self._validateArg(arg);
            });

            groups.push({
                operator: argGroup.fnName,
                args: args,
                newFieldName: newFieldNames[i]
            });
        }

        this.groups = groups;
        this.icv = paramsRaw.icv;
    }

    protected _update(all?: boolean): void {
        if (this.event != null) {
            this.event(all);
        }
    }

    protected _getParam(): DagNodeMapInputStruct {
        const evals = [];
        this.groups.forEach(group => {
            const evalString: string = xcHelper.formulateEvalString([group]);
            evals.push({
                evalString: evalString,
                newField: group.newFieldName
            });
        });

        return {
            eval: evals,
            icv: this.icv,
        }
    }

    public validateAdvancedMode(
        paramStr: string,
        isSubmit?: boolean
    ): {error: string} {
        try {
            const param: DagNodeMapInputStruct = <DagNodeMapInputStruct>JSON.parse(paramStr);

            let error = this.dagNode.validateParam(param);
            if (error != null) {
                return error;
            }

            this._initialize(param, true, isSubmit);
            error = this.validateGroups(isSubmit);
            if (!error) {
                error = this.validateNewFieldNames();
            }

            if (error == null) {
                return null;
            } else {
                return this._translateAdvancedErrorMessage(error);
            }
        } catch (e) {
            return xcHelper.parseJSONError(e);
        }
    }

    public validateNewFieldNames() {
        const groups = this.groups;
        const nameMap = {};
        // new field name
        for (let i = 0; i < groups.length; i++) {
            const name = this.groups[i].newFieldName;
            let error = xcHelper.validateColName(name, true);
            if (error) {
                return {error: error, group: i, arg: -1, type: "newField"};
            }

            if (nameMap[name]) {
                return {
                    error: "Duplicate field name",
                    group: i,
                    arg: -1,
                    type: "newField"
                };
            }
            nameMap[name] = true;
        }
    }

    public submit() {
        let param: DagNodeMapInputStruct = this._getParam();
        let aggs: string[] = DagNode.getAggsFromEvalStrs(param.eval);
        this.dagNode.setAggregates(aggs);
        super.submit();
    }
}