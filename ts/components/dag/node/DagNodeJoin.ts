class DagNodeJoin extends DagNode {
    protected input: DagNodeJoinInput;

    public constructor(options?: DagNodeInfo) {
        options = options || <DagNodeInfo>{};
        super(options);
        this.type = DagNodeType.Join;
        this.maxParents = 2;
        this.minParents = 2;
        this.display.icon = "&#xe93e;";
        this.input = new DagNodeJoinInput(<DagNodeJoinInputStruct>options.input, this);
    }

    public static readonly specificSchema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "additionalProperties": true,
        "required": [
          "parents"
        ],
        "properties": {
          "parents": {
            "$id": "#/properties/parents",
            "type": "array",
            "maxItems": 2,
            "items": {
              "$id": "#/properties/parents/items",
              "type": ["string", "null"],
              "pattern": "^(.*)$"
            }
          },
          "subType": {
            "$id": "#/properties/subType",
            "type": ["string", "null"],
            "enum": [DagNodeSubType.LookupJoin, DagNodeSubType.FilterJoin, null]
          }
        }
    };

    /**
     * Set join node's parameters
     * @param input {DagNodeJoinInputStruct}
     * @param input.joinType {string} Join type
     * @param input.columns column infos from left table and right table
     * @param input.evalString {string} Optional, eavlString in join
     */
    public setParam(input: DagNodeJoinInputStruct = <DagNodeJoinInputStruct>{}) {
        this.input.setInput({
            joinType: input.joinType,
            left: input.left,
            right: input.right,
            evalString: input.evalString,
            keepAllColumns: input.keepAllColumns
        });
        super.setParam();
    }

    // XXX TODO: verify it's correctness
    public lineageChange(
        _columns: ProgCol[],
        replaceParameters?: boolean
    ): DagLineageChange {
        try {
            const param: DagNodeJoinInputStruct = this.input.getInput(replaceParameters);
            const parents: DagNode[] = this.getParents();
            const lCols: ProgCol[] = parents[0].getLineage()
                .getColumns(replaceParameters);
            const includeJoinOn = this._isIncludeJoinOn(param.joinType);
            const lChanges: DagLineageChange = this._getColAfterJoin(
                lCols, param.left,
                includeJoinOn.left,
                param.keepAllColumns);
            if (this._isSkipRightTable(param.joinType)) {
                return {
                    columns: lChanges.columns,
                    changes: lChanges.changes
                };
            } else {
                const rCols: ProgCol[] = parents[1].getLineage()
                    .getColumns(replaceParameters);
                const rChanges: DagLineageChange = this._getColAfterJoin(
                    rCols,
                    param.right,
                    includeJoinOn.right,
                    param.keepAllColumns);
                return {
                    columns: lChanges.columns.concat(rChanges.columns),
                    changes: lChanges.changes.concat(rChanges.changes)
                };
            }
        } catch {
            return { columns: [], changes: [] };
        }
    }

    public applyColumnMapping(renameMap, index: number): {} {
        const newRenameMap = xcHelper.deepCopy(renameMap);
        const input = this.input.getInput();
        try {
            let side: string;
            if (index === 0) {
                side = "left";
            } else {
                side = "right";
            }
            input.evalString = this._replaceColumnInEvalStr(input.evalString, renameMap.columns);
            input[side].columns.forEach((columnName, i) => {
                if (renameMap.columns[columnName]) {
                    input[side].columns[i] = renameMap.columns[columnName];
                }
            });
            input[side].rename.forEach((renameInfo) => {
                if (renameInfo.prefix) {
                    const originalPrefix = renameInfo.sourceColumn;
                    if (renameMap.prefixes[originalPrefix]) {
                        delete newRenameMap.prefixes[renameInfo.sourceColumn];
                        renameInfo.sourceColumn = renameMap.prefixes[originalPrefix];
                        const originalRenamedPrefix = renameInfo.destColumn;

                        // mapping: a::classid -> x::teacherId
                        // join renamed prefix "a" to "b"
                        // new mapping: b::classId -> b::teacherId

                        // go through each column that matches same prefix
                        // and updated the new renameMap with the
                        // renamed prefix
                        for (let oldColName in newRenameMap.columns) {
                            const oldParsedColName = xcHelper.parsePrefixColName(oldColName);
                            if (oldParsedColName.prefix === originalPrefix) {
                                const newParsedColName = xcHelper.parsePrefixColName(newRenameMap.columns[oldColName]);
                                const prevColName = xcHelper.getPrefixColName(originalRenamedPrefix, oldParsedColName.name);// "b::classId"
                                const newDestColName = xcHelper.getPrefixColName(originalRenamedPrefix, newParsedColName.name);// "b::teacherId"
                                delete newRenameMap.columns[oldColName];
                                newRenameMap.columns[prevColName] = newDestColName;
                            }
                        }
                    }
                } else {
                    if (renameMap.columns[renameInfo.sourceColumn]) {
                        const prevColName = renameInfo.sourceColumn;
                        renameInfo.sourceColumn = renameMap.columns[prevColName];
                        delete newRenameMap.columns[prevColName];
                    }
                }
            });
            this.input.setInput(input);
        } catch(err) {
            console.error(err);
        }

        super.setParam(null, true);
        return newRenameMap;
    }

    /**
     * Check if the joinType is converted from node subType
     */
    public isJoinTypeConverted(): boolean {
        return this.input.isJoinTypeConverted();
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeJoinInputStruct = this.getParam();
        if (input.joinType && typeof input.joinType === "string") {
            hint = xcHelper.capitalize(input.joinType);
            hint += " " + input.left.columns.join(", ") + "\n";
            hint += "with " + input.right.columns.join(", ") + "\n";
        }
        return hint;
    }

    protected _getColumnsUsedInInput(): Set<string> {
        const set: Set<string> = new Set();
        const input: DagNodeJoinInputStruct = this.getParam();
        this._getColumnsFromJoinTableInput(input.left, set);
        this._getColumnsFromJoinTableInput(input.right, set);
        return set;
    }

    private _isSkipRightTable(joinType: string) {
        const noRenameType: Set<string> = new Set([
            JoinOperatorTStr[JoinOperatorT.LeftSemiJoin],
            JoinOperatorTStr[JoinOperatorT.LeftAntiJoin]
        ]);
        return noRenameType.has(joinType);
    }

    private _isIncludeJoinOn(joinType: string): {
        left: boolean, right: boolean
    } {
        if (joinType === JoinOperatorTStr[JoinOperatorT.RightOuterJoin]) {
            return { left: false, right: true };
        } else {
            return { left: true, right: false };
        }
    }

    private _getColAfterJoin(
        allColumns: ProgCol[],
        joinInput: DagNodeJoinTableInput,
        addJoinOn: boolean,
        isKeepAllColumns: boolean
    ): DagLineageChange {
        const changes: {from: ProgCol, to: ProgCol}[] = [];
        const colMap: Map<string, ProgCol> = new Map();
        const fixedColSet: Set<string> = new Set();

        allColumns.forEach((progCol) => {
            colMap.set(progCol.getBackColName(), progCol);
        });

        // 1. Get fixed cols
        const fixedCols: ProgCol[] = addJoinOn
            ? joinInput.columns.map((colName) => {
                fixedColSet.add(colName);
                // We don't support type casting in Join for now, but keep the code in case we wanna re-enable it
                // const colType: ColumnType = joinInput.casts == null
                //     ? colMap.get(colName).getType()
                //     : joinInput.casts[index] || colMap.get(colName).getType();
                const colType: ColumnType = colMap.get(colName).getType();
                const frontName: string = xcHelper.parsePrefixColName(colName).name;
                return ColManager.newPullCol(frontName, colName, colType);
            }) : [];

        // 2. Get selected cols
        const keepColSet = new Set(joinInput.keepColumns);
        const selectedCols: ProgCol[] = isKeepAllColumns
            ? allColumns.filter((progCol) => {
                return !fixedColSet.has(progCol.getBackColName());
            })
            : allColumns.filter((progCol) => {
                const colName = progCol.getBackColName();
                return !fixedColSet.has(colName) && keepColSet.has(colName);
            }); 

        // 3. combine fixed cols and selected cols
        const finalCols: ProgCol[] = fixedCols.concat(selectedCols);

        // 4. rename columns
        const prefixRenameMap: Map<string, string> = new Map(); // Prefix rename map
        const columnRenameMap: Map<string, string> = new Map(); // Derived column rename map
        for (const renameInfo of joinInput.rename) {
            const { sourceColumn, destColumn, prefix } = renameInfo;
            if (sourceColumn === destColumn) {
                continue; // Do not show the changes with no name change
            }
            if (prefix) {
                prefixRenameMap.set(sourceColumn, destColumn);
            } else {
                columnRenameMap.set(sourceColumn, destColumn);
            }
        }
        for (let i = 0; i < finalCols.length; i++) { // Apply rename to every columns
            const progCol: ProgCol = finalCols[i];
            const parsed: PrefixColInfo = xcHelper.parsePrefixColName(progCol.getBackColName());
            if (parsed.prefix.length > 0) {
                // Prefixed column
                const prefixAfterRename = prefixRenameMap.get(parsed.prefix);
                if (prefixAfterRename != null) {
                    const newName = xcHelper.getPrefixColName(prefixAfterRename, parsed.name);
                    const newProgCol: ProgCol = ColManager.newPullCol(parsed.name, newName, progCol.getType());
                    finalCols[i] = newProgCol;
                    changes.push({ from: progCol, to: newProgCol });
                }
            } else {
                // Derived column
                const newName = columnRenameMap.get(parsed.name);
                if (newName != null) {
                    const newProgCol: ProgCol = ColManager.newPullCol(newName, newName, progCol.getType());
                    finalCols[i] = newProgCol;
                    changes.push({ from: progCol, to: newProgCol });
                }
            }
        }

        return {
            columns: finalCols,
            changes: changes
        };
    }

    private _getColumnsFromJoinTableInput(
        tableInput: DagNodeJoinTableInput,
        set: Set<string>
    ): void {
        if (tableInput == null) {
            return;
        }
        if (tableInput.columns != null) {
            tableInput.columns.forEach((colName) => {
                set.add(colName);
            });
        }

        if (tableInput.rename != null) {
            tableInput.rename.forEach((renameInfo) => {
                if (renameInfo != null && !renameInfo.prefix) {
                    set.add(renameInfo.sourceColumn);
                }
            });
        }
    }

}