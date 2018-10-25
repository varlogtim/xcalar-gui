class ColAssignmentModel {
    protected resultCols: ProgCol[];
    protected selectedColsList: ProgCol[][];
    protected candidateColsList: ProgCol[][];
    protected allColsList: ProgCol[][];
    protected event: Function;
    protected options;
    private readonly validTypes: ColumnType[] = [];

    public constructor(
        allColSets: ProgCol[][],
        selectedColSets:{
            sourceColumn: string,
            destColumn: string,
            columnType: ColumnType,
            cast: boolean
        }[][],
        event: Function,
        options?
    ) {
        [ColumnType.string, ColumnType.integer, ColumnType.float,
        ColumnType.boolean, ColumnType.mixed].forEach((type) => {
            this.validTypes.push(type);
        });
        this.event = event;
        this.initialize(allColSets, selectedColSets);
        this.options = options || {};
    }

    /**
     * Return the whole model info
     */
    public getModel(): {
        result: ProgCol[],
        selected: ProgCol[][],
        candidate: ProgCol[][],
        all: ProgCol[][];
    } {
        return {
            result: this.resultCols,
            selected: this.selectedColsList,
            candidate: this.candidateColsList,
            all: this.allColsList
        }
    }

    /**
     * Add a column from candidate list to selected list
     * @param listIndex {number} index of which node
     * @param colIndex {number} index of which column
     */
    public addColumn(listIndex: number, colIndex: number): void {
        const progCol: ProgCol = this.candidateColsList[listIndex][colIndex];
        this.resultCols.push(new ProgCol({
            name: this._normalizeColName(progCol.getBackColName()),
            type: null
        }));
        if (this.options.showCast && this.selectedColsList.length === 1) {
            this.resultCols[this.resultCols.length - 1].type = progCol.getType();
        }
        this.selectedColsList.forEach((selectedCols, index) => {
            if (index === listIndex) {
                selectedCols.push(progCol);
            } else {
                selectedCols.push(null);
            }
        });
        this.update();
    }

    public addBlankRow(): void {
        this.resultCols.push(new ProgCol({
            name: "",
            type: null
        }));
        this.selectedColsList.forEach(selectedCols => {
            selectedCols.push(null);
        });
        this.update();
    }

    /**
     * Remove a column in all nodes
     * @param colIndex {number} the index of the column
     */
    public removeColumnForAll(colIndex: number): void {
        this.resultCols.splice(colIndex, 1);
        this.selectedColsList.forEach((selectedCols) => {
            selectedCols.splice(colIndex, 1);
        });
        this.update();
    }

    /**
     * Remove a column
     * @param listIndex {number} index of the node list
     * @param colIndex {number} index of the column
     */
    public removeColumn(listIndex: number, colIndex: number): void {
        this.selectedColsList[listIndex][colIndex] = null;
        let allNullCol: boolean = this.selectedColsList.filter((selectedCols) => {
            return selectedCols[colIndex] != null;
        }).length === 0;

        if (allNullCol && !this.options.preventAutoRemoveCol) {
            this.removeColumnForAll(colIndex);
        } else {
            this.resultCols[colIndex].type = null; // reset result type
        }
        this.update();
    }

    /**
     * Select a column
     * @param listIndex {number} index of the node list
     * @param colIndex {number} index of the column
     * @param indexToSelect {number} index in the all columns to select
     */
    public selectColumn(
        listIndex: number,
        colIndex: number,
        indexToSelect: number
    ): void {
        const colToSelect: ProgCol = this.allColsList[listIndex][indexToSelect];
        const colName: string = colToSelect.getBackColName();
        let usedIndex: number;
        this.selectedColsList[listIndex].forEach((col, index) => {
            if (col != null && index !== colIndex &&
                col.getBackColName() === colName
            ) {
                usedIndex = index;
                return false; // stop loop
            }
        });
        this.selectedColsList[listIndex][colIndex] = colToSelect;
        this.resultCols[colIndex].type = null; // when select, reset result type to null
        // same column is used in other col, remove that

        if (!this.resultCols[colIndex].getBackColName()) {
            const normalizedName = this._normalizeColName(colName);
            this.resultCols[colIndex].setBackColName(normalizedName)
            this.resultCols[colIndex].name = normalizedName;
        }
        if (this.options.showCast && this.selectedColsList.length === 1) {
            this.resultCols[colIndex].type = colToSelect.getType();
        }

        if (usedIndex != null) {
            this.removeColumn(listIndex, usedIndex);
        }
        this.update();
    }

    /**
     * Set result column's name or type
     * @param colIndex {number} column index
     * @param name {string} name to set
     * @param type {ColumnType} column type to set
     */
    public setResult(colIndex: number, name: string, type: ColumnType): void {
        const resultCol: ProgCol = this.resultCols[colIndex];
        if (name != null) {
            resultCol.setBackColName(name);
        }
        if (type != null) {
            resultCol.type = type;
        }
    }

    /**
     * Validate if the num of parent is valid,
     * @return {error: string} Return error string if invalid
     */
    public validateNodes(): {error: string} {
        if (this.allColsList.length < 2) {
            return {error: UnionTStr.OneTableToUnion2};
        } else {
            return null;
        }
    }

    /**
     * @return {object} Return error when no result col or col name is invalid
     */
    public validateResult(advancedMode: boolean = false): {index: number, error: string} {
        if (this.resultCols.length === 0) {
            return {index: null, error: UnionTStr.SelectCol};
        }
        const nameMap = {};

        for (let i = 0; i < this.resultCols.length; i++) {
            let error: string;
            const colName: string = this.resultCols[i].getBackColName();
            if (colName.length === 0) {
                error = advancedMode ? UnionTStr.FillDestCol : ErrTStr.NoEmpty;
            } else {
                error = xcHelper.validateColName(colName, false);
            }
            if (error == null && nameMap[colName]) {
                error = ErrTStr.DuplicateColNames;
            }

            if (error == null && this.options.validateType && !this.resultCols[i].getType()) {
                error = UnionTStr.ChooseType;
            }

            if (error != null) {
                return {
                    index: i,
                    error: error
                }
            }
            nameMap[colName] = true;
        }
        return null;
    }

    /**
     * @return {object} Return error type is not match
     */
    public validateCast(): {index: number, error: string} {
        for (let colIndex = 0; colIndex < this.resultCols.length; colIndex++) {
            const resultCol: ProgCol = this.resultCols[colIndex];
            if (resultCol.getType() != null) {
                continue;
            }
            // check if all selected cols has the same time
            let firstSelectedType: ColumnType = null;
            for (let listIndex = 0; listIndex < this.selectedColsList.length; listIndex++) {
                const selectedCol: ProgCol = this.selectedColsList[listIndex][colIndex];
                if (selectedCol == null) {
                    continue;
                } else if (selectedCol.type === ColumnType.mixed) {
                    return {
                        index: colIndex,
                        error: UnionTStr.MixType
                    }
                } else if (firstSelectedType == null) {
                    firstSelectedType = <ColumnType>selectedCol.getType();
                } else if (firstSelectedType !== selectedCol.getType()) {
                    return {
                        index: colIndex,
                        error: UnionTStr.Cast
                    }
                }
            }
        }
        return null;
    }

    public validateAdvancedMode(paramStr: string): {error: string} {
        try {
            // XXX TODO: check what's the status of it
            return null;
        } catch (e) {
            console.error(e);
            return {error: "invalid configuration"};
        }
    }

    public initialize(colSets, selectedColSets) {
        // initialize all columns
        this.resultCols = [];
        this.selectedColsList = [];
        this.candidateColsList = [];
        this.allColsList = [];

        colSets.forEach((cols) => {
            this.allColsList.push(cols.map(a => a));
        });
        // initialize select cols list
        this.selectedColsList = this.allColsList.map(() => []);

        // restore selected columns
        const hasCast: boolean[] = [];
        for (let listIndex = 0; listIndex < selectedColSets.length; listIndex++) {
            this.selectedColsList[listIndex] = this.selectedColsList[listIndex] || [];
            const selectedCols = selectedColSets[listIndex];
            const colMap: Map<string, ProgCol> = this._getNameMap(this.allColsList[listIndex]);
            for (let colIndex = 0; colIndex < selectedCols.length; colIndex++) {
                const selectedCol = selectedCols[colIndex];
                const colName: string = selectedCol.sourceColumn;
                this.selectedColsList[listIndex][colIndex] = (colName == null) ?
                null : colMap.get(colName);
                hasCast[colIndex] = hasCast[colIndex] || selectedCol.cast;
            }
        }

        // intialize result list
        if (selectedColSets[0] != null) {
            this.resultCols = selectedColSets[0].map((col, colIndex) => {
                return new ProgCol({
                    backName: col.destColumn,
                    type: hasCast[colIndex] ? col.columnType : null
                });
            });
        }

        // initialize candidate list
        this.allColsList.forEach((_col, listIndex) => {
            this.candidateColsList[listIndex] = this._getCandidateCols(listIndex);
        });
    }

    public getParam() {
        const colTypes: ColumnType[] = <ColumnType[]>this.resultCols.map((col) => col.getType());
        for (let colIndex = 0; colIndex < colTypes.length; colIndex++) {
            if (colTypes[colIndex] != null) {
                continue;
            }

            for (let listIndex = 0; listIndex < this.selectedColsList.length; listIndex++) {
                const progCol: ProgCol = this.selectedColsList[listIndex][colIndex];
                if (progCol != null) {
                    colTypes[colIndex] = progCol.getType();
                    break;
                }
            }
        }

        const columns = this.selectedColsList.map((selectedCols) => {
            return selectedCols.map((progCol, i) => {
                const resultCol: ProgCol = this.resultCols[i];
                if (progCol == null) {
                    return {
                        sourceColumn: null,
                        destColumn: resultCol.getBackColName(),
                        columnType: colTypes[i],
                        cast: false
                    }
                } else {
                    return {
                        sourceColumn: progCol.getBackColName(),
                        destColumn: resultCol.getBackColName(),
                        columnType: colTypes[i],
                        cast: (colTypes[i] !== progCol.getType())
                    }
                }
            });
        });

        return {
            columns: columns
        }
    }

    public update(): void {
        this.allColsList.forEach((_col, listIndex) => {
            this.candidateColsList[listIndex] = this._getCandidateCols(listIndex);
        });

        if (this.event != null) {
            this.event();
        }
    }

    public refreshColumns(allCols, removedSets?): void {
        removedSets = removedSets || [];
        // for column sets that were removed, remove from selectedColList by
        // setting to null and then splicing rather than just splicing because
        // then it wouldn't match up with the indices in removedSets
        for (let i = 0; i < this.selectedColsList.length; i++) {
            if (removedSets.indexOf(i) > -1) {
                this.selectedColsList[i] = null;
            }
        }
        this.selectedColsList = this.selectedColsList.filter((colSet) => {
            return colSet != null;
        });
        // selected cols that no longer exist in allCols will be set to null
        for (let i = 0; i < this.selectedColsList.length; i++) {
            const cols = this.selectedColsList[i];
            for (let j = 0; j < cols.length; j++) {
                let col;
                if (cols[j]) {
                    col = allCols[i].find((newCol) => {
                        return newCol.getBackColName() === cols[j].getBackColName();
                    });
                }

                if (!col) {
                    cols[j] = null;
                }
            }
        }
        // if there's more tables now exist, push new set
        const lenDiff = allCols.length - this.selectedColsList.length;
        for (let i = 0; i < lenDiff; i++) {
            const colSet = [];
            if (this.selectedColsList[0]) {
                for (let j = 0; j < this.selectedColsList[0].length; j++) {
                    colSet.push(null);
                }
            }
            this.selectedColsList.push(colSet);
        }
        // check for empty rows and splice them away
        if (this.selectedColsList[0]) {
            for (let i = 0; i < this.selectedColsList[0].length; i++) {
                let hasVal = false;
                for (let j = 0; j < this.selectedColsList.length; j++) {
                    if (this.selectedColsList[j][i]) {
                        hasVal = true;
                        break;
                    }
                }
                if (!hasVal) {
                    for (let j = 0; j < this.selectedColsList.length; j++) {
                        this.selectedColsList[j].splice(i, 1);
                        this.resultCols.splice(i, 1);
                    }
                    i--;
                }
            }
        }
        this.allColsList = allCols;
        if (!allCols.length) {
            this.resultCols = [];
        }
        this.update();
    }

    private _getCandidateCols(listIndex: number): ProgCol[] {
        const map: Map<string, ProgCol> = this._getNameMap(this.selectedColsList[listIndex]);
        return this.allColsList[listIndex].filter((col) => {
            const colType = col.getType();
            return (!map.has(col.getBackColName()) &&
                    this.validTypes.includes(colType));
        });
    }

    private _normalizeColName(name: string): string {
        const map: Map<string, ProgCol> = this._getNameMap(this.resultCols);
        let checkName = (name: string) => !map.has(name);
        name = xcHelper.parsePrefixColName(name).name;
        return xcHelper.uniqueName(name, checkName, null);
    }

    private _getNameMap(progCols: ProgCol[]): Map<string, ProgCol> {
        const progColMap: Map<string, ProgCol> = new Map();
        if (progCols == null) {
            return progColMap;
        }
        progCols.forEach((progCol) => {
            if (progCol != null) {
                progColMap.set(progCol.getBackColName(), progCol);
            }
        });
        return progColMap;
    }
}