class SQLExecutor {
    private static _tabs: Map<string, DagTabUser> = new Map();

    public static getTab(tabId: string): DagTabUser {
        return SQLExecutor._tabs.get(tabId);
    }

    public static setTab(tabId: string, dagTab: DagTabUser): void {
        SQLExecutor._tabs.set(tabId, dagTab);
    }

    public static deleteTab(tabId: string): void {
        SQLExecutor._tabs.delete(tabId);
    }

    private _sql: string;
    private _newSql: string;
    private _sqlNode: DagNodeSQL;
    private _tempTab: DagTabUser;
    private _tempGraph: DagGraph;
    private _identifiers: {};
    private _identifiersOrder: number[];
    private _schema: {};
    private _batchId: {};
    private _status: SQLStatus;
    private _sqlTabCached: boolean;
    private _sqlFunctions: {};
    private _advancedDebug: boolean;

    public constructor(sqlStruct: SQLParserStruct, advancedDebug?: boolean) {
        this._sql = sqlStruct.sql.replace(/;+$/, "");
        this._newSql = sqlStruct.newSql ? sqlStruct.newSql.replace(/;+$/, "") :
                                                                     this._sql;
        this._sqlFunctions = sqlStruct.functions;
        this._identifiersOrder = [];
        this._identifiers = {};
        this._schema = {};
        this._batchId = {};
        this._status = SQLStatus.None;
        this._sqlTabCached = false;
        this._advancedDebug = advancedDebug || false;

        const tables: string[] = sqlStruct.identifiers || [];
        const tableMap = PTblManager.Instance.getTableMap();
        tables.forEach((identifier, idx) => {
            let pubTableName = identifier.toUpperCase();
            // pub table name can't have backticks. If see backticks, it must be for escaping in SQL
            if (pubTableName[0] === "`" && pubTableName[identifier.length - 1] === "`") {
                pubTableName = pubTableName.slice(1, -1);
            }
            if (tableMap.has(pubTableName)) {
                const columns = [];
                tableMap.get(pubTableName).columns.forEach((column) => {
                    const upperName = column.name.toUpperCase();
                    if (!upperName.startsWith("XCALARRANKOVER") &&
                        !upperName.startsWith("XCALAROPCODE") &&
                        !upperName.startsWith("XCALARBATCHID") &&
                        !upperName.startsWith("XCALARROWNUMPK")) {
                        columns.push(column);
                    }
                });
                this._schema[pubTableName] = columns;
                this._batchId[pubTableName] = tableMap.get(pubTableName).batchId;
            } else {
                throw new Error("Cannot find published table: " + pubTableName);
            }
            this._identifiersOrder.push(idx + 1);
            this._identifiers[idx + 1] = pubTableName;
        });

        this._sqlNode = <DagNodeSQL>DagNodeFactory.create({
            type: DagNodeType.SQL
        });
        this._createDataflow();
    }

    public getStatus(): SQLStatus {
        return this._status;
    }

    public setStatus(status: SQLStatus): void {
        if (this._status === SQLStatus.Done ||
            this._status === SQLStatus.Failed ||
            this._status === SQLStatus.Cancelled) {
            return;
        }
        if (status === SQLStatus.Cancelled && this._status === SQLStatus.Running) {
            this._tempGraph.cancelExecute();
        }
        this._status = status;
    }

    public compile(callback): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let tabId: string = this._tempTab.getId();
        SQLExecutor.setTab(tabId, this._tempTab);

        let finish = () => {
            SQLExecutor.deleteTab(tabId);
            if (this._status === SQLStatus.Done) {
                this._updateStatus(SQLStatus.Done);
            } else if (this._status === SQLStatus.Cancelled) {
                this._updateStatus(SQLStatus.Cancelled);
            } else {
                this._status = SQLStatus.Failed;
                this._updateStatus(SQLStatus.Failed);
            }
            if (typeof callback === "function") {
                callback();
            }
        };

        if (this._status === SQLStatus.Cancelled) {
            finish();
            return PromiseHelper.reject(SQLStatus.Cancelled);
        }

        this._configureSQLNode()
        .then(() => {
            if (this._status === SQLStatus.Cancelled) {
                return PromiseHelper.reject(SQLStatus.Cancelled);
            }
            DagTabManager.Instance.addSQLTabCache(this._tempTab);
            this._sqlTabCached = true;
            return DagViewManager.Instance.inspectSQLNode(this._sqlNode.getId(), tabId, true);
        })
        .then(deferred.resolve)
        .fail((e) => {
            this._status = SQLStatus.Failed;
            finish();
            deferred.reject(e);
        })
        return deferred.promise();
    }

    public execute(callback): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let tabId: string = this._tempTab.getId();
        SQLExecutor.setTab(tabId, this._tempTab);

        let finalTableName;
        let succeed: boolean = false;
        let columns: {name: string, backName: string, type: ColumnType}[];
        let finish = () => {
            SQLExecutor.deleteTab(tabId);
            if (this._status === SQLStatus.Done) {
                this._updateStatus(SQLStatus.Done);
            } else if (this._status === SQLStatus.Cancelled) {
                this._updateStatus(SQLStatus.Cancelled);
            } else {
                this._status = SQLStatus.Failed;
                this._updateStatus(SQLStatus.Failed);
            }
            if (typeof callback === "function") {
                callback(finalTableName, succeed, {columns: columns});
            }
        };

        if (this._status === SQLStatus.Cancelled
            || this._status === SQLStatus.Failed) {
            finish();
            return PromiseHelper.reject(this._status);
        }

        this._status = SQLStatus.Running;
        SQLResultSpace.Instance.showProgressDataflow(true);
        this._tempGraph.execute([this._sqlNode.getId()])
        .then(() => {
            finalTableName = this._sqlNode.getTable();
            columns = this._sqlNode.getColumns();
            this._status = SQLStatus.Done;
            return this._inspectSQLNodeAndAddToList();
        })
        .then(() => {
            DagTabManager.Instance.removeSQLTabCache(this._tempTab);
            DagViewManager.Instance.cleanupClosedTab(this._tempTab.getGraph());

            succeed = true;
            finish();
            deferred.resolve();
        })
        .fail((err) => {
            if (!this._sqlTabCached) {
                DagTabManager.Instance.addSQLTabCache(this._tempTab);
            }
            this._inspectSQLNodeAndAddToList()
            .always(() => {
                finish();
                deferred.reject(err);
            });
        });

        return deferred.promise();
    }

    public restoreDataflow(): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        let tabId: string = this._tempTab.getId();

        this._configureSQLNode(true)
        .then(() => {
            if (this._advancedDebug) {
                return this._expandSQLNodeAndAddToList();
            } else {
                return this._inspectSQLNodeAndAddToList();   
            }
        })
        .then(() => {
            deferred.resolve(tabId, this._tempTab);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _createDataflow(): void {
        this._tempGraph = new DagGraph();
        const id: string = this._advancedDebug ? null : DagTab.generateId() + ".sql";
        const name: string = "SQL " + moment(new Date()).format("HH:mm:ss ll")
        this._tempTab = new DagTabUser(name, id, this._tempGraph, false, xcTimeHelper.now());
        DagViewManager.Instance.render($(), this._tempGraph, this._tempTab, true);
        this._tempGraph.addNode(this._sqlNode);
    }

    private _configureSQLNode(noStatusUpdate: boolean = false): XDPromise<any> {
        this._sqlNode.setParam({
            sqlQueryStr: this._sql,
            identifiers: this._identifiers,
            identifiersOrder: this._identifiersOrder,
            dropAsYouGo: null
        }, true);
        const queryId = xcHelper.randName("sqlQuery", 8);
        const identifiers = new Map<number, string>();
        const pubTablesInfo = {};
        this._identifiersOrder.forEach((idx) => {
            const pubTableName = this._identifiers[idx]
            identifiers.set(idx, pubTableName);
            pubTablesInfo[pubTableName] = {
                schema: this._schema[pubTableName.toUpperCase()],
                batchId: this._batchId[pubTableName]
            };
        });
        if (!noStatusUpdate) {
            this._status = SQLStatus.Compiling;
            this._updateStatus(SQLStatus.Compiling, new Date());
        }
        const options = {
            identifiers: identifiers,
            sqlMode: true,
            pubTablesInfo: pubTablesInfo,
            sqlFunctions: this._sqlFunctions
        }
        return this._sqlNode.compileSQL(this._newSql, queryId, options);
    }

    private _updateStatus(
        status: SQLStatus,
        startTime?: Date,
        endTime?: Date
    ): void {
        const queryObj = {
            queryString: this._sql,
            dataflowId: this._tempTab.getId(),
            status: status
        }
        if (startTime) {
            queryObj["startTime"] = startTime;
        }
        if (endTime) {
            queryObj["endTime"] = endTime;
        }
        this._sqlNode.setSQLQuery(queryObj);
        this._sqlNode.updateSQLQueryHistory();
    }

    private _inspectSQLNodeAndAddToList(): XDPromise<void> {
        if (!this._sqlNode.getSubGraph()) {
            return PromiseHelper.resolve();
        }
        this._tempTab.setGraph(this._sqlNode.getSubGraph());
        DagList.Instance.addDag(this._tempTab);
        return this._saveDataflow();
    }

    private _expandSQLNodeAndAddToList(): XDPromise<void> {
        if (!this._sqlNode.getSubGraph()) {
            return PromiseHelper.resolve();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        
        DagTabManager.Instance.addSQLTabCache(this._tempTab);
        let promise = DagViewManager.Instance.expandSQLNodeInTab(this._sqlNode, this._tempTab, true);
        PromiseHelper.alwaysResolve(promise)
        .then(() => {
            DagViewManager.Instance.autoAlign(this._tempTab.getId());
            DagList.Instance.addDag(this._tempTab);
            return this._saveDataflow();
        })
        .then(() => {
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(() => {
            DagTabManager.Instance.removeSQLTabCache(this._tempTab);
        });

        return deferred.promise();
    }

    private _saveDataflow(): XDPromise<void> {
        return PromiseHelper.alwaysResolve(this._tempTab.save());
    }
}