class PTblManager {
    private static _instance: PTblManager;
    public static readonly DSSuffix: string = "-xcalar-ptable";
    public static readonly InternalColumns: string[] = ["XcalarRankOver", "XcalarOpCode", "XcalarBatchId"];
    public static readonly PKPrefix: string = "XcalarRowNumPk";
    public static readonly IMDDependencyKey = "/sys/imd_dependencies";

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _tableMap: Map<string, PbTblInfo>;
    private _tables: PbTblInfo[];
    private _initizlied: boolean;
    private _cachedSelectTableResult: {[key: string]: string};
    private _loadingTables: {[key: string]: PbTblInfo};
    private _datasetTables: {[key: string]: PbTblInfo};

    public constructor() {
        this._tableMap = new Map();
        this._tables = [];
        this._initizlied = false;
        this._loadingTables = {};
        this._datasetTables = {};
        this._cachedSelectTableResult = {};
    }

    public createTableInfo(name: string): PbTblInfo {
        return new PbTblInfo({
            name: name,
            index: null,
            keys: null,
            updates: [],
            size: 0,
            createTime: null,
            active: true,
            columns: null,
            rows: 0,
            batchId: null
        });
    }

    /**
     * PTblManager.Instance.addTable
     * @param tableName
     */
    public addTable(tableName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._addOneTable(tableName)
        .then(() => {
            XcSocket.Instance.sendMessage("refreshIMD", {
                "action": "add",
                "tables": [tableName]
            }, null);
            deferred.resolve();
        })
        .fail(() => {
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    public getTableMap(): Map<string, PbTblInfo> {
        return this._tableMap;
    }

    public getTables(): PbTblInfo[] {
        let tables: PbTblInfo[] = this.getAvailableTables();
        for (let table in this._loadingTables) {
            tables.push(this._loadingTables[table]);
        }
        for (let table in this._datasetTables) {
            tables.push(this._datasetTables[table]);
        }
        return tables;
    }

    /**
     * PTblManager.Instance.getAvailableTables
     */
    public getAvailableTables(): PbTblInfo[] {
        let tables: PbTblInfo[] = this._tables.map((table) => table);
        return tables;
    }

    public getTableByName(tableName: string): PbTblInfo | null {
        let table = this._tableMap.get(tableName);
        if (table != null) {
            return table;
        }
        table = this._loadingTables[tableName];
        if (table != null) {
            return table;
        }
        table = this._datasetTables[tableName];
        if (table != null) {
            return table;
        }
        return null;
    }

    /**
     * PTblManager.Instance.hasTable
     * @param tableName
     * @param checkCache
     */
    public hasTable(tableName): boolean {
        if (this.getTableByName(tableName) != null) {
            return true;
        }
        return false;
    }

    /**
     * PTblManager.Instance.getTablesAsync
     * @param refresh
     */
    public getTablesAsync(refresh?: boolean): XDPromise<PbTblInfo[]> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        let promise: XDPromise<PublishTable[]>;
        if (this._initizlied && !refresh) {
            promise = PromiseHelper.resolve(this._tables);
        } else {
            promise = this._listTables();
        }

        promise
        .then(() => {
            this._initizlied = true;
            deferred.resolve(this.getTables());
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public getTableDisplayInfo(tableInfo: PbTblInfo): PbTblDisplayInfo {
        let tableDisplayInfo: PbTblDisplayInfo = {
            index: null,
            name: null,
            rows: "N/A",
            size: "N/A",
            createTime: "N/A",
            status: null
        };

        try {
            tableDisplayInfo.index = tableInfo.index;
            tableDisplayInfo.name = tableInfo.name;

            let active: boolean = tableInfo.active;
            tableDisplayInfo.status = active ? PbTblStatus.Active : PbTblStatus.Inactive;
            tableDisplayInfo.rows = active && tableInfo.rows ? xcHelper.numToStr(tableInfo.rows) : "N/A";
            tableDisplayInfo.size = active && tableInfo.size ? <string>xcHelper.sizeTranslator(tableInfo.size) : "N/A";
            tableDisplayInfo.createTime = active && tableInfo.createTime ? moment(tableInfo.createTime * 1000).format("HH:mm:ss MM/DD/YYYY") : "N/A";
        } catch (e) {
            console.error(e);
        }
        return tableDisplayInfo;
    }

    public getTableSchema(tableInfo: PbTblInfo): PbTblColSchema[] {
        if (!tableInfo) {
            return [];
        }
        return tableInfo.getSchema();
    }

    /**
     * PTblManager.Instance.getSchemaArrayFromDataset
     * @param dsName
     */
    public getSchemaArrayFromDataset(dsName): XDPromise<ColSchema[][]> {
        return this._getSchemaArrayFromDataset(dsName);
    }

    /**
     * PTblManager.Instance.createTableFromSource
     * @param tableInfo
     * @param args
     * @param primaryKeys
     */
    public createTableFromSource(
        tableInfo: PbTblInfo,
        args: {
            name: string,
            sources: {
                targetName: string,
                path: string,
                recursive: boolean,
                fileNamePattern: string
            }[],
            typedColumns: any[],
            moduleName: string,
            funcName: string,
            udfQuery: object,
            schema: ColSchema[]
        },
        primaryKeys: string[],
    ): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        let dsOptions = $.extend({}, args);
        let tableName: string = tableInfo.name;
        let dsName: string = this._getDSNameFromTableName(tableName);
        dsOptions.name = tableName + PTblManager.DSSuffix;
        dsOptions.fullName = dsName;
        let dsObj = new DSObj(dsOptions);
        let sourceArgs = dsObj.getImportOptions();

        const totalStep: number = 3;
        let txId = Transaction.start({
            "msg": TblTStr.Create + ": " + tableName,
            "operation": SQLOps.TableFromDS,
            "track": true,
            "steps": totalStep
        });

        let hasDataset: boolean = false;
        let schema: ColSchema[] = args.schema;
        this._loadingTables[tableName] = tableInfo;

        let currentStep: number = 1;
        let currentMsg: string = TblTStr.Importing;
        this._refreshTblView(tableInfo, currentMsg, currentStep, totalStep);

        this._createDataset(txId, dsName, sourceArgs)
        .then(() => {
            hasDataset = true;
            currentStep = 2;
            currentMsg = TblTStr.CheckingSchema;
            this._refreshTblView(tableInfo, currentMsg, currentStep, totalStep);
            return this._checkSchemaInDatasetCreation(dsName, schema);
        })
        .then((finalSchema) => {
            currentStep = 3;
            currentMsg = TblTStr.Creating;
            this._refreshTblView(tableInfo, currentMsg, currentStep, totalStep);
            return this._createTable(txId, dsName, tableName, finalSchema, primaryKeys);
        })
        .then(() => {
            return PTblManager.Instance.addTable(tableName);
        })
        .then(() => {
            Transaction.done(txId, {
                noNotification: true,
                noCommit: true
            });
            delete this._loadingTables[tableName];
            deferred.resolve(tableName);
        })
        .fail((error, isSchemaError) => {
            let noAlert: boolean = false;
            delete this._loadingTables[tableName];
            if (hasDataset) {
                if (isSchemaError === true) {
                    noAlert = true;
                    this.addDatasetTable(dsName);
                } else {
                    XIApi.deleteDataset(txId, dsName);
                }
            }
            Transaction.fail(txId, {
                noAlert: noAlert,
                noNotification: true,
                error: error
            });
            deferred.reject(error, hasDataset);
        });

        return deferred.promise();
    }

    /**
     * PTblManager.Instance.createTableFromDataset
     * @param dsName
     * @param tableName
     * @param schema
     * @param primaryKeys
     * @param noDatasetDeletion? {optional}
     */
    public createTableFromDataset(
        dsName: string,
        tableName: string,
        schema: ColSchema[],
        primaryKeys: string[],
        noDatasetDeletion?: boolean
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let txId = Transaction.start({
            "msg": TblTStr.Create + ": " + tableName,
            "operation": SQLOps.TableFromDS,
            "track": true,
            "steps": 1
        });
        const tableInfo: PbTblInfo = this._datasetTables[tableName];
        delete this._datasetTables[tableName];
        this._loadingTables[tableName] = tableInfo;
        this._refreshTblView(tableInfo, TblTStr.Creating, 1, 1);

        this._createTable(txId, dsName, tableName, schema, primaryKeys, noDatasetDeletion)
        .then(() => {
            return PTblManager.Instance.addTable(tableName);
        })
        .then(() => {
            delete this._loadingTables[tableName];
            Transaction.done(txId, {
                noCommit: true,
                noNotification: true
            });
            deferred.resolve();
        })
        .fail((error) => {
            delete this._loadingTables[tableName];
            if (tableInfo != null) {
                this._datasetTables[tableName] = tableInfo;
            }
            Transaction.fail(txId, {
                error: error,
                noNotification: true,
                noAlert: true
            });
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * PTblManager.Instance.createTableFromView
     * @param pks
     * @param columns
     * @param viewName
     * @param tableName
     */
    public createTableFromView(
        pks: string[],
        columns: ProgCol[],
        viewName: string,
        tableName: string
    ): XDPromise<void> {
        const deferred:XDDeferred<void> = PromiseHelper.deferred();
        const txId: number = Transaction.start({
            operation: "publishIMD",
            track: true,
        });

        let info = this.createTableInfo(tableName);
        // Load message tells anyone looking at the table info that
        // this table isnt created yet
        // Primarily used when checking for duplicates
        info.loadMsg = "Creating Table"
        this._loadingTables[tableName] = info;
        XIApi.publishTable(txId, pks, viewName, tableName,
            xcHelper.createColInfo(columns))
        .then(() => {
            // need to update the status and activated tables
            return PromiseHelper.alwaysResolve(this._listOneTable(tableName));
        })
        .then(() => {
            delete this._loadingTables[tableName];
            Transaction.done(txId, {
                noCommit: true
            });
            deferred.resolve();
        })
        .fail((error) => {
            delete this._loadingTables[tableName];
            Transaction.fail(txId, {
                noAlert: true,
                noNotification: true
            });
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * PTblManager.Instance.addDatasetTable
     * @param dsName
     */
    public addDatasetTable(dsName: string): void {
        if (!dsName.endsWith(PTblManager.DSSuffix)) {
            return;
        }
        let tableName: string = this._getTableNameFromDSName(dsName);
        let tableInfo: PbTblInfo = PTblManager.Instance.createTableInfo(tableName);
        tableInfo.beDatasetState(dsName);
        this._datasetTables[tableName] = tableInfo;
    }

    /**
     * PTblManager.Instance.activateTables
     * @param tableNames
     */
    public activateTables(tableNames: string[]): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let succeeds: string[] = [];
        let failures: string[] = [];
        this._getIMDDependency()
        .then((imdDenendencies) => {
            let set: Set<string> = new Set();
            const promises = [];
            tableNames.forEach((tableName) => {
                if (!set.has(tableName)) {
                    let tablesToActivate = this._checkActivateDependency(tableName, imdDenendencies);
                    tablesToActivate.forEach((table) => {
                        set.add(table);
                        let func = (): XDPromise<void> => {
                            return this._activateOneTable(table, succeeds, failures);
                        };
                        promises.push(func);
                    });
                }
            });
            return PromiseHelper.chain(promises);
        })
        .then(() => {
            if (failures.length > 0) {
                let error: string = failures.join("\n");
                Alert.error(IMDTStr.ActivatingFail, error);
            }
            XcSocket.Instance.sendMessage("refreshIMD", {
                "action": "activate",
                "tables": succeeds
            }, null);
            deferred.resolve();
        })
        .fail((error) => {
            Alert.error(IMDTStr.ActivatingFail, error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    // XXX TODO, combine with deactivateTables in IMDPanel
    /**
     * PTblManager.Instance.deactivateTables
     * @param tableNames
     */
    public deactivateTables(tableNames: string[]): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        Alert.show({
            'title': IMDTStr.DeactivateTable,
            'msg': xcHelper.replaceMsg(IMDTStr.DeactivateTablesMsg, {
                "tableName": tableNames.join(", ")
            }),
            'onConfirm': () => {
                this._deactivateTables(tableNames)
                .then((succeeds, failures) => {
                    if (failures.length > 0) {
                        let error: string = failures.join("\n");
                        Alert.error(IMDTStr.DeactivateTableFail, error);
                    }
                    XcSocket.Instance.sendMessage("refreshIMD", {
                        "action": "deactivate",
                        "tables": succeeds
                    }, null);
                    deferred.resolve();
                })
                .fail((error) => {
                    Alert.error(IMDTStr.DeactivateTableFail, error);
                    deferred.reject(error);
                });
            },
            'onCancel': () => {
                deferred.reject();
            }
        });

        return deferred.promise();
    }

    /**
     * PTblManager.Instance.deleteTables
     * @param tableNames
     */
    public deleteTables(tableNames: string[]): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        Alert.show({
            'title': IMDTStr.DelTable,
            'msg': xcHelper.replaceMsg(IMDTStr.DelTableMsg, {
                "tableName": tableNames.join(", ")
            }),
            'onConfirm': () => {
                this._deleteTables(tableNames)
                .then((succeeds, failures) => {
                    if (failures.length > 0) {
                        let error: string = failures.join("\n");
                        Alert.error(IMDTStr.DelTableFail, error);
                    }
                    XcSocket.Instance.sendMessage("refreshIMD", {
                        "action": "delete",
                        "tables": succeeds
                    }, null);
                    deferred.resolve();
                })
                .fail((error) => {
                    Alert.error(IMDTStr.DelTableFail, error);
                    deferred.reject(error);
                });
            },
            'onCancel': () => {
                deferred.reject();
            }
        });

        return deferred.promise();
    }

    /**
     * PTblManager.Instance.selectTable
     */
    public selectTable(tableInfo: PbTblInfo, limitedRows: number): XDPromise<string> {
        return tableInfo.viewResultSet(limitedRows);
    }

    public updateInfo(arg: {"action": string, "tables": string[]}): void {
        try {
            let action = arg.action;
            let tables = arg.tables;
            switch (action) {
                case "activate":
                    this._updateActivated(tables);
                    break;
                case "deactivate":
                    this._updateDeactivated(tables);
                    break;
                case "delete":
                    this._updateDeleted(tables);
                    break;
                case "add":
                    this._updateAdded(tables);
                    break;
                default:
                    console.error("unsupported update action", action);
                    break;
            }
        } catch (e) {
            console.error(e);
        }
    }

    private _updateActivated(tables: string[]): void {
        let promies = [];
        tables.forEach((tableName) => {
            let tableInfo: PbTblInfo = this._tableMap.get(tableName);
            tableInfo.beActivated();
            promies.push(this._listOneTable(tableName));
        });

        PromiseHelper.when(...promies)
        .always(() => {
            TblSource.Instance.refresh();
        });
    }

    private _updateDeactivated(tables: string[]): void {
        tables.forEach((tableName) => {
            let tableInfo: PbTblInfo = this._tableMap.get(tableName);
            tableInfo.beDeactivated();
        });
        TblSource.Instance.refresh();
    }

    private _updateDeleted(tables: string[]): void {
        tables.forEach((tableName) => {
            this._tableMap.delete(tableName);
        });

        this._tables = this._tables.filter((tableInfo) => {
            let tableName = tableInfo.name;
            return this._tableMap.has(tableName);
        });
        TblSource.Instance.refresh();
    }

    private _updateAdded(tables: string[]): void {
        this._addOneTable(tables[0]);
        TblSource.Instance.refresh();
    }

    private _deactivateTables(tableNames: string[]): XDPromise<string[]> {
        const deferred: XDDeferred<string[]> = PromiseHelper.deferred();
        const succeeds: string[] = [];
        const failures: string[] = [];
        const promises = tableNames.map((tableName) => {
            return (): XDPromise<void> => {
                return this._deactivateOneTable(tableName, succeeds, failures);
            }
        });

        PromiseHelper.chain(promises)
        .then(() => {
            deferred.resolve(succeeds, failures);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _addOneTable(tableName: string): XDPromise<void> {
        // cached tableInfo first in case list fails
        tableName = tableName.toUpperCase();
        if (!this._tableMap.has(tableName)) {
            let tableInfo = this.createTableInfo(tableName);
            tableInfo.index = this._tables.length;
            this._tables.push(tableInfo);
            this._tableMap.set(tableName, tableInfo);
        }
        return this._listOneTable(tableName);
    }

    private _deactivateOneTable(
        tableName: string,
        succeeds: string[],
        failures: string[]
    ): XDPromise<void> {
        let tableInfo: PbTblInfo = this._tableMap.get(tableName);
        if (!tableInfo || !tableInfo.active) {
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        tableInfo.deactivate()
        .then(() => {
            succeeds.push(tableName);
            deferred.resolve();
        })
        .fail((error) => {
            let errorMsg = this._getErrorMsg(tableName, error);
            failures.push(errorMsg);
            deferred.resolve(); // still resolve it
        });
        return deferred.promise();
    }

    private _activateOneTable(
        tableName: string,
        succeeds: string[],
        failures: string[]
    ): XDPromise<void> {
        let tableInfo: PbTblInfo = this._tableMap.get(tableName);
        if (!tableInfo || tableInfo.active) {
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        // mark activating in case any table
        // that has dependency need to be activated
        TblSource.Instance.markActivating(tableName);

        tableInfo.activate()
        .then(() => {
            return PromiseHelper.alwaysResolve(this._listOneTable(tableName));
        })
        .then(() => {
            succeeds.push(tableName);
            deferred.resolve();
        })
        .fail((error) => {
            let errorMsg = this._getErrorMsg(tableName, error);
            failures.push(errorMsg);
            deferred.resolve(); // still resolve it
        });
        return deferred.promise();
    }

    private _deleteTables(tableNames: string[]): XDPromise<string[]> {
        const deferred: XDDeferred<string[]> = PromiseHelper.deferred();
        const succeeds: string[] = [];
        const failures: string[] = [];
        const promises = tableNames.map((tableName) => {
            return (): XDPromise<void> => {
                return this._deleteOneTable(tableName, succeeds, failures);
            }
        });

        PromiseHelper.chain(promises)
        .then(() => {
            deferred.resolve(succeeds, failures);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _deleteOneTable(
        tableName: string,
        succeeds: string[],
        failures: string[]
    ): XDPromise<void> {
        let tableInfo: PbTblInfo = this._tableMap.get(tableName);
        if (tableInfo == null) {
            return this._deleteDSTable(tableName, failures);
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        
        this._checkDeleteDependency(tableName)
        .then(() => {
            return tableInfo.delete();
        })
        .then(() => {
            this._tableMap.delete(tableName);
            for (let i = 0; i < this._tables.length; i++) {
                if (this._tables[i] === tableInfo) {
                    this._tables.splice(i, 1);
                }
            }
            delete this._cachedSelectTableResult[tableName];
            succeeds.push(tableName);
            deferred.resolve();
        })
        .fail((error) => {
            let errorMsg: string = this._getErrorMsg(tableName, error);
            failures.push(errorMsg);
            deferred.resolve(); // still resolve it
        });
        return deferred.promise();
    }

    private _deleteDSTable(tableName: string, failures: string[]): XDPromise<void> {
        let tableInfo: PbTblInfo = this._datasetTables[tableName];
        if (tableInfo == null) {
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        tableInfo.delete()
        .then(() => {
            delete this._datasetTables[tableName];
            deferred.resolve();
        })
        .fail((error) => {
            let errorMsg = this._getErrorMsg(tableName, error);
            failures.push(errorMsg);
            deferred.resolve(); // still resolve it
        });
        return deferred.promise();
    }

    private _getDSNameFromTableName(tableName: string): string {
        return xcHelper.wrapDSName(tableName) + PTblManager.DSSuffix;
    }

    private _getTableNameFromDSName(dsName: string): string {
        let parseRes = xcHelper.parseDSName(dsName);
        let tableName: string = parseRes.dsName;
        // remove the suffix
        if (tableName.endsWith(PTblManager.DSSuffix)) {
            tableName = tableName.substring(0, tableName.length - PTblManager.DSSuffix.length);
        }
        return tableName;
    }

    private _createDataset(txId: number, dsName: string, sourceArgs: any): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        XIApi.loadDataset(txId, dsName, sourceArgs)
        .then(deferred.resolve)
        .fail((error, loadError) => {
            deferred.reject(loadError || error);
        });

        return deferred.promise();
    }

    private _checkSchemaInDatasetCreation(
        dsName: string,
        schema: ColSchema[]
    ): XDPromise<ColSchema[]> {
        if (schema != null) {
            return PromiseHelper.resolve(schema, false);
        }
        const deferred: XDDeferred<ColSchema[]> = PromiseHelper.deferred();
        this._getSchemaArrayFromDataset(dsName)
        .then((schemaArray, hasMultipleSchema) => {
            if (hasMultipleSchema) {
                let error: string = xcHelper.replaceMsg(TblTStr.MultipleSchema, {
                    name: this._getTableNameFromDSName(dsName)
                })
                deferred.reject({
                    error: error
                }, true);
            } else {
                let schema: ColSchema[] = schemaArray.map((schemas) => schemas[0]);
                deferred.resolve(schema);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // XXX TODO combine with getSchemaMeta in ds.js
    private _getSchemaArrayFromDataset(
        dsName: string,
    ): XDPromise<ColSchema[][]> {
        const deferred: XDDeferred<ColSchema[][]> = PromiseHelper.deferred();
        XcalarGetDatasetsInfo(dsName)
        .then((res) => {
            try {
                let hasMultipleSchema: boolean = false;
                let schemaArray: ColSchema[][] = [];
                let dataset = res.datasets[0];
                let indexMap: {[key: string]: number} = {};
                dataset.columns.forEach((colInfo) => {
                    // if the col name is a.b, in XD it should be a\.b
                    const name = xcHelper.escapeColName(colInfo.name);
                    const type = xcHelper.convertFieldTypeToColType(<any>DfFieldTypeT[colInfo.type]);
                    let index = indexMap[name];
                    if (index == null) {
                        // new columns
                        index = schemaArray.length;
                        indexMap[name] = index;
                        schemaArray[index] = [{
                            name: name,
                            type: type
                        }];
                    } else {
                        // has multiple schema
                        hasMultipleSchema = true;
                        schemaArray[index].push({
                            name: name,
                            type: type
                        });
                    }
                });
                deferred.resolve(schemaArray, hasMultipleSchema);
            } catch (e) {
                console.error(e);
                deferred.reject({
                    error: "Parse Schema Error"
                });
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * Step 1: synthesize dataset to xcalar table
     * Step 2: generate row num as primary key if not specified
     * Step 3: Create publish table
     */
    private _createTable(
        txId: number,
        dsName: string,
        tableName: string,
        schema: ColSchema[],
        primaryKeys: string[],
        noDatasetDeletion?: boolean
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const validTypes: ColumnType[] = BaseOpPanel.getBasicColTypes();
        schema = schema.filter((colInfo) => {
            return validTypes.includes(colInfo.type);
        });

        const colInfos: ColRenameInfo[] = xcHelper.getColRenameInfosFromSchema(schema);
        const pbColInfos: ColRenameInfo[] = [];
        colInfos.forEach((colInfo) => {
            // make sure column is uppercase
            let upperCaseCol: string = colInfo.new.toUpperCase();
            colInfo.new = upperCaseCol;
            pbColInfos.push({
                orig: upperCaseCol,
                new: upperCaseCol,
                type: colInfo.type
            });
        });
        const parsedDsName = parseDS(dsName);
        let synthesizeTable: string = tableName + Authentication.getHashId();
        let tableToDelete: string = null;
        if (primaryKeys == null || primaryKeys.length === 0) {
            primaryKeys = [];
        }

        // Synthesize is necessary in the event we are publishing straight from a dataset
        XIApi.synthesize(txId, colInfos, parsedDsName, synthesizeTable)
        .then((resTable) => {
            tableToDelete = resTable;
            return XIApi.publishTable(txId, primaryKeys, resTable, tableName, pbColInfos);
        })
        .then(() => {
            // Dataset need to be delete at the end in case fail case
            // need to restore the dataset
            if (!noDatasetDeletion) {
                XIApi.deleteDataset(txId, dsName);
            }
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(() => {
            if (tableToDelete != null) {
                XIApi.deleteTable(txId, tableToDelete);
            }
        });

        return deferred.promise();
    }

    private _listOneTable(tableName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarListPublishedTables(tableName, false, true)
        .then((result) => {
            try {
                let oldTableInfo = this._tableMap.get(tableName);
                let index: number = oldTableInfo ? oldTableInfo.index : this._tables.length;
                let tableInfo: PbTblInfo = this._tableInfoAdapter(result.tables[0], index);
                this._tableMap.set(tableName, tableInfo);
                this._tables[index] = tableInfo;
            } catch (e) {
                console.error(e);
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _listTables(): XDPromise<PublishTable[]> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        let oldTables = this._tables || [];

        XcalarListPublishedTables("*", false, true)
        .then((result) => {
            this._tables = result.tables.map(this._tableInfoAdapter);
            this._updateTableMap();
            this._updateTablesInAction(oldTables);
            deferred.resolve(this._tables);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _updateTablesInAction(oldTables: PbTblInfo[]): void {
        try {
            oldTables.forEach((oldTableInfo) => {
                let oldState = oldTableInfo.state;
                if (oldState === PbTblState.Activating ||
                    oldState === PbTblState.Deactivating
                ) {
                    let name = oldTableInfo.name;
                    if (this._tableMap.has(name)) {
                        let tableInfo = this._tableMap.get(name);
                        if (oldState === PbTblState.Activating &&
                            !tableInfo.state
                        ) {
                            // still activating
                            tableInfo.state = oldState;
                        } else if (oldState === PbTblState.Deactivating &&
                            tableInfo.active
                        ) {
                            // still deactivating
                            tableInfo.state = oldState;
                        }
                    }
                }
            });
        } catch (e) {
            console.error(e);
        }
    }

    private _updateTableMap(): void {
        this._tableMap.clear();
        this._tables.forEach((tableInfo) => {
            this._tableMap.set(tableInfo.name, tableInfo);
        });
    }

    private _tableInfoAdapter(table: PublishTable, index: number): PbTblInfo {
        let tableInfo: PbTblInfo = new PbTblInfo({
            index: index,
            batchId: null,
            name: null,
            active: null,
            rows: null,
            size: null,
            createTime: null,
            columns: [],
            keys: [],
            updates: []
        });
        tableInfo.restoreFromMeta(table);
        return tableInfo;
    }

    private _refreshTblView (
        tableInfo: PbTblInfo,
        text: string,
        step: number,
        totalStep: number
    ): void {
        let msg: string = `Step ${step}/${totalStep}: ${text}`;
        tableInfo.loadMsg = msg;
        TblSourcePreview.Instance.refresh(tableInfo);
    }

    private _getErrorMsg(tableName: string, error: ThriftError): string {
        let errorMsg: string = "";
        if (typeof error === "object") {
            errorMsg = error.log || error.error;
        } else {
            errorMsg = error || ErrTStr.Unknown;
        }
        return tableName + ": " + errorMsg;
    }

    private _getIMDDependencyKVStore(): KVStore {
        let kvStore = new KVStore(PTblManager.IMDDependencyKey, gKVScope.GLOB);
        return kvStore;
    }

    private _getIMDDependency(): XDPromise<object> {
        let deferred: XDDeferred<object> = PromiseHelper.deferred();
        let kvStore = this._getIMDDependencyKVStore();
        kvStore.getAndParse()
        .then((res) => {
            deferred.resolve(res || {});
        })
        .fail(() => {
            deferred.resolve({}); // still resolve it
        });
        return deferred.promise();
    }

    private _checkDeleteDependency(tableName): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._getIMDDependency()
        .then((imdDenendencies) => {
            try {
                let dependendcy = imdDenendencies[tableName];
                if (dependendcy != null) {
                    let children: string[] = Object.keys(dependendcy.children);
                    if (children.length > 0) {
                        let error: string = IMDTStr.DeleteHasDependency + " " + children.join(", ");
                        return PromiseHelper.reject({
                            error: error
                        });
                    }
                }
                deferred.resolve();
            } catch (e) {
                console.error(e);
                deferred.resolve(); // still reolsve
            }

        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _checkActivateDependency(
        tableName: string,
        imdDenendencies: object
    ): string[] {
        try {
            let dependendcyTables: string[] = [];
            // level traversal, if the dependent table is in
            // deeper level, it should come in later
            let stack: string[] = [];
            stack.push(tableName);
            while(stack.length) {
                let table: string = stack.pop();
                dependendcyTables.push(table);
                let dependendcy = imdDenendencies[table];
                let parents: string[] = [];
                if (dependendcy != null) {
                    parents = Object.keys(dependendcy.parents);
                }
                if (parents.length > 0) {
                    stack = stack.concat(parents);
                }
            }

            // make dependent table comes first
            let resTables: string[] = [];
            let set: Set<string> = new Set();
            for (let i = dependendcyTables.length - 1; i >= 0; i--) {
                let table = dependendcyTables[i];
                if (!set.has(table)) {
                    set.add(table);
                    resTables.push(table);
                }
            }
            return resTables;
        } catch (e) {
            console.error(e);
            return [tableName];
        }
    }
}