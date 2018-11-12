class DagTblManager {
    private clockLimit;
    private cache: {[key: string]: DagTblCacheInfo};
    private _kvStore: KVStore;
    private timer: number;
    // The interval determines how fast tables are deleted, locked, or reset.
    // A lower interval will cause more kvstore interactions but will keep the cache as up-to-date
    // as possible. A low interval can be compensated with a higher clockLimit.
    private interval: number;
    private configured: boolean;
    // Wire in reading a heuristic/setting for how many times we retry

    private static _instance: DagTblManager;
    public static get Instance() {
        return this._instance || (this._instance = new DagTblManager(-1));
    }

    public constructor(clockLimit: number) {
        this.clockLimit = clockLimit;
        let key: string = KVStore.getKey("gDagTableManagerKey");
        this._kvStore = new KVStore(key, gKVScope.WKBK);
        this.cache = {};
        this.interval = 30000;
        this.configured = false;
    }

    public setup(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._kvStore.getAndParse()
        .then((res) => {
            if (res == null) {
                this._kvStore.put("{}", true, true);
                this.cache = {};
            } else {
                this.cache = res;
            }
            return XcalarGetTables("*");
        })
        .then((res: XcalarApiListDagNodesOutputT) => {
                this._synchWithBackend(res);
                this.timer = window.setInterval(() => {DagTblManager.Instance.sweep()}, this.interval);
                this.configured = true;
                deferred.resolve();
        })
        .fail((error: ThriftError) => {
            console.error(AlertTStr.AutoTblManagerError);
            this.configured = false;
            this.cache = {};
            deferred.resolve();
        });

        return deferred.promise();
    }

    /**
     * Resets the Sweep interval
     * @param interval Number of milliseconds before each sweep happens
     */
    public setSweepInterval(interval: number): void {
        if (!this.configured) {
            return;
        }
        this.interval = interval;
        window.clearInterval(this.timer);
        this.timer = window.setInterval(() => {DagTblManager.Instance.sweep()}, this.interval);
    }

    /**
     * Sets clocklimit
     * @param limit Number of timeouts before a table is deleted.
     */
    public setClockTimeout(limit: number): void {
        if (!this.configured) {
            return;
        }
        this.clockLimit = limit;
    }

    /**
     * Does one sweep through the cache.
     * A sweep raises clockCount and deals with marked flags.
     * If clockCount == limit, an object is deleted.
     */
    public sweep(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (!this.configured) {
            return deferred.resolve();
        }
        XcalarGetTables("*")
        .then((res: XcalarApiListDagNodesOutputT) => {
            this._synchWithBackend(res);
            let toDelete: string[] = [];
            let cacheInfo: DagTblCacheInfo;
            Object.keys(this.cache).forEach((key) => {
                cacheInfo = this.cache[key];
                if (cacheInfo.markedForReset) {
                    cacheInfo.clockCount = 0;
                    cacheInfo.markedForReset = false;
                } else {
                    cacheInfo.clockCount++;
                }

                if ((this.clockLimit != -1 &&
                        cacheInfo.clockCount >= this.clockLimit &&
                        !cacheInfo.locked) ||
                        cacheInfo.markedForDelete) {
                    delete this.cache[key];
                    toDelete.push(key);
                }
            });
            return this._queryDelete(toDelete);
        })
        .then(() => {
            let jsonStr = JSON.stringify(this.cache);
            return this._kvStore.put(jsonStr, true, true);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    /**
     * Adds a table to the table cache
     * @param name Table name
     */
    public addTable(name: string): void {
        if (!this.configured) {
            return;
        }
        this.cache[name] = {
            name: name,
            locked: false,
            markedForReset: false,
            markedForDelete: false,
            clockCount: 0,
            timestamp: xcHelper.getCurrentTimeStamp()
        };
    }

    /**
     * Resets a table's clock count to 0. Should be atomic
     * @param name: name of the table used
     */
    public resetTable(name: string): boolean {
        if (!this.configured || this.cache[name] == null) {
            return false;
        }
        this.cache[name].markedForReset = true;
        this.cache[name].timestamp = xcHelper.getCurrentTimeStamp();
        return true;
    }

    /**
     * Deletes table(s) (if a regex is specified) from the
     * @param name Table name
     * @param forceDelete if true, deletes locked tables. if false, ignores locked tables
     * @param regEx If true, uses "name" to patternmatch
     */
    public deleteTable(name: string, forceDelete: boolean, regEx?: boolean): void {
        if (!this.configured) {
            return;
        }
        if (regEx) {
            let match: RegExp = new RegExp(name);
            let toDelete: string[] = Object.keys(this.cache)
                .filter((key) => match.test(key));
            toDelete.forEach((key: string) => {
                if (!this.cache[key].locked || forceDelete) {
                    this.cache[key].markedForDelete = true;
                }
            });
        } else {
            if (!this.cache[name]) {
                return;
            }
            if (!this.cache[name].locked || forceDelete) {
                this.cache[name].markedForDelete = true;
            }
        }
    }

    /**
     * Returns if the table still exists
     * @param name Table name
     */
    public hasTable(name: string): boolean {
        return (this.configured && this.cache[name] != null && !this.cache[name].markedForDelete);
    }

    /**
     * Returns if the table is locked
     * @param name Table name
     */
    public hasLock(name: string): boolean {
        return (this.configured && this.cache[name] != null &&
            this.cache[name].locked && !this.cache[name].markedForDelete);
    }

    /**
     * Toggles the lock on a table
     * @param name Table name
     * @returns {boolean}
     */
    public toggleTableLock(name: string): boolean {
        if (!this.configured || this.cache[name] == null || this.cache[name].markedForDelete) {
            return false;
        }
        this.cache[name].locked = !this.cache[name].locked;
        return true;
    }

    /**
     * Returns the timestamp for a table.
     * @param name Table name
     * @returns {number}
     */
    public getTimeStamp(name: string): number {
        if (!this.configured || this.cache[name] == null || this.cache[name].markedForDelete) {
            return -1;
        }
        return this.cache[name].timestamp;
    }

    /**
     * Forces a sweep that only deletes tables marked for deletion.
     */
    public forceDeleteSweep(): XDPromise<void> {
        window.clearInterval(this.timer);
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (!this.configured) {
            return deferred.resolve();
        }
        let tables: string[] = [];
        for (let key in this.cache) {
            if (this.cache[key].markedForDelete) {
                delete this.cache[key];
                tables.push(key);
            }
        }
        this._queryDelete(tables)
        .then(() => {
            let jsonStr = JSON.stringify(this.cache);
            return this._kvStore.put(jsonStr, true, true);
        })
        .then(() => {
            this.timer = window.setInterval(() => {DagTblManager.Instance.sweep()}, this.interval);
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    /**
     * Clears out the cache of tables.
     * @param force if true, deletes locked tables as well
     */
    public emptyCache(force: boolean): XDPromise<void> {
        window.clearInterval(this.timer);
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (!this.configured) {
            return deferred.resolve();
        }
        let tables: string[] = [];
        if (force) {
            tables = Object.keys(this.cache);
            this.cache = {};
        } else {
            for (let key in this.cache) {
                if (!this.cache[key].locked) {
                    delete this.cache[key];
                    tables.push(key);
                }
            }
        }
        this._queryDelete(tables)
        .then(() => {
            let jsonStr = JSON.stringify(this.cache);
            return this._kvStore.put(jsonStr, true, true);
        })
        .then(() => {
            this.timer = window.setInterval(() => {DagTblManager.Instance.sweep()}, this.interval);
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    /** resets the cache so that all tables have clockCycle of 0.
     * @param removeLocks if true, removes all table locks.
    */
    public forceReset(removeLocks: boolean): XDPromise<void> {
        window.clearInterval(this.timer);
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (!this.configured) {
            return deferred.resolve();
        }
        XcalarGetTables("*")
        .then((res: XcalarApiListDagNodesOutputT) => {
            this._synchWithBackend(res);
            Object.keys(this.cache).forEach((name: string) => {
                this.cache[name].clockCount = 0;
                if (removeLocks) {
                    this.cache[name].locked = false;
                }
            });
            let jsonStr: string = JSON.stringify(this.cache);
            return this._kvStore.put(jsonStr, true, true)
        })
        .then(() => {
            this.timer = window.setInterval(() => {DagTblManager.Instance.sweep()}, this.interval);
            deferred.resolve;
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    // Tells us if table "table" is safe to delete.
    private _safeToDeleteTable(table: string): boolean {
        const self = DagTblManager.Instance;
        const graph: DagGraph = DagView.getActiveDag();
        const dagID: string = graph.getTabId();
        const dataflowMatch: RegExp = new RegExp(dagID);
        if (self.cache[table].locked) {
            // Keep locked tables to ensure a consistent lock table usage
            return false;
        }
        // It's safe to delete the table if not in the current dataflow
        // or if it's already marked for deletion
        if (!dataflowMatch.test(table) || self.cache[table].markedForDelete) {
            return true;
        }
        // It's safe to delete the table if
        let info: DagTblCacheInfo = self.cache[table];
        let dagNodeID: string = self._getNodeId(info.name);
        // It's safe to delete the table if made from outside methods
        if (dagNodeID == "") {
            return true;
        }
        let node: DagNode;
        try {
            node = graph.getNode(dagNodeID);
        } catch (e) {
            // node doesn't exist, we can delete the table
            return true;
        }
        if (node.getState() == DagNodeState.Running) {
            // This table should be kept because we are still executing this node
            return false;
        } else if (node.getState() != DagNodeState.Complete) {
            // Table was an error table, or somehow survived a previous purge, so get rid of it
            return true;
        }

        // We know the node was successful, so the table can
        // only be deleted if it won't foreseeably be reused.
        let childrenComplete: boolean = true;
        let children: DagNode[] = node.getChildren();
        for (let i = 0; i < children.length; i++) {
            let child: DagNode = children[i];
            if (child.getState() != DagNodeState.Complete &&
                child.getState() != DagNodeState.Unused) {
                childrenComplete = false;
                break;
            }
        }
        let nodeTable = node.getTable();
        if (childrenComplete) {
            return true;
        }

        if (nodeTable == info.name) {
            // This table will probably be re-used, as it's the "final" table of the node.
            return false;
        }
        let nodeTableInfo = this.cache[nodeTable];
        if (!nodeTableInfo) {
            // Since the info doesnt exist, we're probably going to be
            // re-running this node, we just aren't in the process of re-running yet
            // Thus this table doesnt matter.
            return true;
        }

        // Finally, we check if this table was used in the creation process
        // of its current node, or one of its children. If children, we have to keep
        // it since they are not complete yet. We also keep indexes
        const indexMatch: RegExp = new RegExp(".index");
        return (nodeTableInfo.timestamp > info.timestamp &&
            !indexMatch.test(info.name));
    }

    /**
     * To be used in the case of running out of memory. Deletes all tables except the ones
     * in the current dataflow tab.
     */
    public emergencyClear() {
        window.clearInterval(this.timer);
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (!this.configured) {
            deferred.resolve();
        }
        XcalarGetTables("*")
        .then((res: XcalarApiListDagNodesOutputT) => {
            this._synchWithBackend(res);
            let toDelete: string[] = Object.keys(this.cache).filter(this._safeToDeleteTable);
            toDelete.forEach((key) => {
                delete this.cache[key];
            })
            return this._queryDelete(toDelete);
        })
        .then(() => {
            let jsonStr = JSON.stringify(this.cache);
            return this._kvStore.put(jsonStr, true, true);
        })
        .then(() => {
            this.timer = window.setInterval(() => {DagTblManager.Instance.sweep()}, this.interval);
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    /**
     * Updates the cache based off the results from a XcalarGetTables call
     * @param res Tables currently in the backend
     */
    private _synchWithBackend(res: XcalarApiListDagNodesOutputT) {
        let backObject = {};
        res.nodeInfo.forEach((node: XcalarApiDagNodeInfoT) => {
            backObject[node.name] = true;
        });
        let backTableNames: string[] = Object.keys(backObject);
        let cacheTableNames: string[] = Object.keys(this.cache);
        let removedTables: string[] = cacheTableNames.filter(x => !backObject[x]);
        let addedTables: string[] = backTableNames.filter(x => !this.cache[x]);
        removedTables.forEach((name: string) => {
            if (!this.cache[name].markedForDelete) {
                console.error("The table " + name + " was deleted in a way that XD does not support.");
            }
            delete this.cache[name];
        });
        addedTables.forEach((name: string) => {
            this.cache[name] = {
                name: name,
                clockCount: 0,
                locked: false,
                markedForDelete: false,
                markedForReset: false,
                timestamp: xcHelper.getCurrentTimeStamp()
            };
        });
        return;
    }

    private _getNodeId(name: string): string {
        let matches: string[] = name.match("table_DF2_.*_(dag_.*?)(.index)?#");
        if (matches.length > 0) {
            return matches[1];
        }
        return "";
    }

    private _queryDelete(tables: string[]): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (tables.length == 0) {
            return deferred.resolve();
        }
        var sql = {
            "operation": SQLOps.DeleteTable,
            "tables": tables,
            "tableType": TableType.Unknown
        };
        var txId = Transaction.start({
            "operation": SQLOps.DeleteTable,
            "sql": sql,
            "steps": tables.length,
            "track": true
        });
        const visibleTable = DagTable.Instance.getTable();
        let deleteQuery: {}[] = tables.map((name: string) => {
            if (name == visibleTable) {
                DagTable.Instance.close();
            }
            return {
                operation: "XcalarApiDeleteObjects",
                args: {
                    namePattern: name,
                    srcType: "Table"
                }
            }
        });
        XIApi.deleteTables(txId, deleteQuery, null)
        .then(() => {
            Transaction.done(txId, null);
            deferred.resolve()
        })
        .fail((error) => {
            Transaction.fail(txId, {
                "failMsg": "Deleting Tables Failed",
                "error": error,
                "noAlert": true,
                "title": "Table Manager"
            });
            deferred.reject(error);
        });

        return deferred.promise();
    }
}