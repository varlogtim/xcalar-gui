class CastOpPanel extends BaseOpPanel {
    // protected _$panel;
    protected _dagNode;
    private colRenameSection: ColAssignmentView;
    private prevRenameMap;
    private dataModel: ColAssignmentModel;

    public constructor() {
        super();
        super.setup($("#castOpPanel"));
        this.colRenameSection = new ColAssignmentView("#castOpPanel .columnAssignmentSection",
                {
                    labels: ["Current Name", "New Name", "Cast"],
                    resultColPosition: -1,
                    showCast: true,
                    candidateText: "Columns in this section will not be casted."
                });
        this._registerHandlers();
    }

    public show(dagNode: DagNodeMap, options: {exitCallback?: Function}): boolean {
        if (this._formHelper.isOpen()) {
            return false;
        }
        this._reset();
        this._formHelper.setup({});

        this._dagNode = dagNode;
        super.showPanel("cast", options);
        const curColumns = this.updateColumns();
        const param = dagNode.getParam();

        try {
            const selectedCols = this._paramToSelectedCols(param);
            this.dataModel = this.colRenameSection.show([curColumns], [selectedCols]);
            this._modifyColRenameSection();
            this._autoResizeView(false);
        } catch (e) {
            this._startInAdvancedMode(e);
        }
    }

    public close(isSubmit?: boolean): boolean {
        if (!this._formHelper.isOpen()) {
            return false;
        }

        super.hidePanel(isSubmit);
        this._autoResizeView(true);
        return true;
    }

    public refreshColumns(): void {
        const cols = this.updateColumns();
        this.dataModel.refreshColumns([cols]);
    }

    public updateColumns(): ProgCol[] {
        return this._dagNode.getParents().map((parentNode) => {
            return parentNode.getLineage().getColumns();
        })[0] || [];
    }

    // converts result of colAssignmentPanel into the mapInput struct
    private _colRenameToParam(colRename): DagNodeMapInputStruct {
        const evalOps = [];
        colRename.columns[0].forEach((colInfo) => {
            if (!colInfo.sourceColumn) return;
            const mapStr = xcHelper.castStrHelper(colInfo.sourceColumn,
                                                  colInfo.columnType);
            evalOps.push({
                "evalString": mapStr,
                "newField": colInfo.destColumn
            });
        });
        const paramInput: DagNodeMapInputStruct = {
            eval: evalOps,
            icv: false
        };
        return paramInput;
    }

    // converts mapInput struct into colAssignment struct
    private _paramToSelectedCols(param) {
        this.prevRenameMap = {};
        let selectedCols = param.eval.map((evalObj) => {
            const parsedEval = XDParser.XEvalParser.parseEvalStr(evalObj.evalString);
            let selectedCol;
            if (!parsedEval.error) {
                selectedCol = {
                    sourceColumn: (<ParsedEvalArg>parsedEval.args[0]).value,
                    destColumn: evalObj.newField,
                    columnType: xcHelper.getCastTypeToColType(parsedEval.fnName),
                    cast: true
                };
                this.prevRenameMap[selectedCol.sourceColumn] = selectedCol.destColumn;
            }
            return selectedCol;
        });
        selectedCols = selectedCols.filter((col) => {
            return col != null;
        });
        return selectedCols;
    }

    private _submit() {
        if (!this.validate()) {
            return false;
        }
        if (this._isAdvancedMode()) {
            // TODO advanced mode needs to propagate the column map as well
            const paramInput = JSON.parse(this._editor.getValue());
            this._dagNode.setParam(paramInput);
            this.close(true);
            return true;
        }
        const param = this.colRenameSection.getParam();
        const paramInput = this._colRenameToParam(param);
        this._dagNode.setParam(paramInput);

        const renameMap = {
            columns: {},
            prefixes: {}
        };
        param.columns[0].forEach((colInfo) => {
            if (!colInfo.sourceColumn) return;
            renameMap.columns[colInfo.sourceColumn] = colInfo.destColumn;
        });

        // if a previous instance of this map operation did a rename, remap
        // the names that were original switched
        for (let colName in this.prevRenameMap) {
            if (renameMap.columns[colName]) {
                renameMap.columns[this.prevRenameMap[colName]] = renameMap.columns[colName];
            } else {
                renameMap.columns[this.prevRenameMap[colName]] = colName;
            }
        }
        // XXX activeDag may not be the graph this node corresponds to
        const dagGraph = DagViewManager.Instance.getActiveDag();
        dagGraph.applyColumnMapping(this._dagNode.getId(), renameMap);

        this.close(true);
        return true;
    }

    private validate(): boolean {
        if (this._isAdvancedMode()) {
            const advancedErr: {error: string} = this._validateAdvancedMode(this._editor.getValue());
            if (advancedErr != null) {
                StatusBox.show(advancedErr.error, this.$panel.find(".advancedEditor"));
                return false;
            } else {
                return true;
            }
        }
        // validate result column
        const $resultInputs = this.$panel.find(".resultInput");
        const resultErr: {index: number, error: string} = this.dataModel.validateResult(false, true);
        if (resultErr != null) {
            if (resultErr.index == null) {
                StatusBox.show(resultErr.error, this.$panel.find(".resultSection"));
            } else {
                StatusBox.show(resultErr.error, $resultInputs.eq(resultErr.index), true);
            }

            return false;
        }
        return true;
    }

    private _validateAdvancedMode(paramStr: string): {error: string} {
        let jsonError = true;
        try {
            const param: DagNodeMapInputStruct = <DagNodeMapInputStruct>JSON.parse(paramStr);
            jsonError = false;

            let error = this._dagNode.validateParam(param);
            if (error != null) {
                return error;
            }
            for (let i = 0; i < param.eval.length; i++) {
                const evalObj = param.eval[i];
                const parsedEval = XDParser.XEvalParser.parseEvalStr(evalObj.evalString);
                if (parsedEval["error"]) {
                    throw(parsedEval);
                }
                const translatedType = xcHelper.getCastTypeToColType(parsedEval.fnName);
                if (translatedType == null) {
                    throw({error: "Invalid type: " + parsedEval.fnName});
                }
                if (!parsedEval.args.length) {
                    throw({error: "Field name not provided: " + evalObj.evalString});
                }
                //XXX need to validate better
                if (!evalObj.newField) {
                    throw({error: "New field name not provided: " + evalObj.evalString});
                }
            }
        } catch (e) {
            if (jsonError) {
                return xcHelper.parseJSONError(e);
            } else {
                return e;
            }
        }
    }

    private _registerHandlers() {
        this.$panel.find('.cancel, .close').on('click', () => {
            this.close();
        });
        this.$panel.find(".submit").on("click", () => {
            this._submit();
        });

    }

    private _modifyColRenameSection() {
        this.$panel.find(".tableSection .header .text")
                  .text(OpFormTStr.SelectColRename);
        this.$panel.find(".candidateSection .subHeading .text")
                  .text(OpFormTStr.NotCasted + ":");
    }

    // XXX TODO: generalize it
    private _autoResizeView(reset: boolean) {
        const $mainMenu: JQuery = $("#mainMenu");
        const $panel: JQuery = this._getPanel();
        const sectionW: number = parseFloat($panel.find(".lists").eq(0).css("min-width")) + 5;
        const minWidth: number = parseFloat($mainMenu.css("min-width"));
        if (reset) {
            $mainMenu.width(minWidth);
        } else {
            let width: number = minWidth + sectionW;
            width = Math.min(width, $("#modelingDagPanel").width() * 0.5);
            $mainMenu.width(width);
        }
    }

    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        if (toAdvancedMode) {
            const param = this.colRenameSection.getParam();
            const paramInput = this._colRenameToParam(param);
            const paramStr = JSON.stringify(paramInput, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
        } else {
            try {
                const param: DagNodeSetInputStruct = <DagNodeSetInputStruct>JSON.parse(this._editor.getValue());
                if (JSON.stringify(param, null, 4) === this._cachedBasicModeParam) {
                    // advanced mode matches basic mode so go to basic mode
                    // regardless of errors
                } else {
                    const error = this._dagNode.validateParam(param);
                    if (error) {
                        return error;
                    }
                    const advancedErr: {error: string} = this._validateAdvancedMode(this._editor.getValue());
                    if (advancedErr != null) {
                        StatusBox.show(advancedErr.error, this.$panel.find(".advancedEditor"));
                        return advancedErr;
                    }
                }
                const selectedCols = this._paramToSelectedCols(param);
                const curColumns = this.updateColumns();
                this.dataModel = this.colRenameSection.show([curColumns], [selectedCols]);
                this._modifyColRenameSection();
            } catch (e) {
                return {error: e};
            }
        }
        return null;
    }
}