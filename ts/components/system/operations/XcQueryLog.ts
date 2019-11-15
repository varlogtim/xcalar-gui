/**
 * XcQueryLog handles the data structure and manipulation of a list of XcQuery.
 * It implements basic log operations(add, remove ...), as well as persisting(kvstore)
 * functions such as load, store and archive.
 */
class XcQueryLog {
    private MAX_FLUSH_SIZE: number;
    private LOG_LIFE_TIME: number;

    private _queries: Map<string, XcQuery>; // will be populated by xcQuery objs with transaction id as key
    private _archiveKeys: Set<string>; // kvstore keys(with prefix) need to be archived
    // _dirtyData is tracking the logs have been changed, so that we can write them back selectively
    // (rathen than write all the logs even only some of them are changed)
    // Only the updated(new, modified) logs are tracked for now
    // We may also want to track deleted logs in the future(We delete them immediately now)
    // So keep it as a nested object
    private _dirtyData: {
        update: Set<string>
    };

    public constructor() {
        this.MAX_FLUSH_SIZE = 1024 * 1024 * 10; // 10MB
        this.LOG_LIFE_TIME = 90 * 24 * 3600 * 1000; // 90 days
        this._queries = new Map<string, XcQuery>();
        this._archiveKeys = new Set<string>();
        this._dirtyData = {
            update: new Set<string>()
        };
    }

    /**
     * Add a query to the log
     * @param id
     * @param query
     * @param isSetDirty true: mark as updated, so that it will be flushed to kvstore
     */
    public add(id: number, query: XcQuery, isSetDirty: boolean): void {
        const key = this._createCacheKey(id);
        this._queries.set(key, query);
        if (isSetDirty) {
            this.setUpdated(id);
        }
    }

    /**
     * Mark a query as updated, so that it will be flushed to kvstore
     * @param id
     */
    public setUpdated(id: number): void {
        this._dirtyData.update.add(this._createCacheKey(id));
    }

    /**
     * Get a query
     * @param id
     * @returns XcQuery object; null if not exist
     */
    public get(id: number): XcQuery {
        const key = this._createCacheKey(id);
        return this._queries.get(key);
    }

    /**
     * Get a query, and mark it as updated
     * @param id
     * @returns XcQuery object; null if not exist
     */
    public getForUpdate(id: number): XcQuery {
        const query = this.get(id);
        if (query != null) {
            this.setUpdated(id);
        }
        return query;
    }

    /**
     * Check if a query exists in the cache
     * @param id
     */
    public has(id: number): boolean {
        return this._queries.has(this._createCacheKey(id));
    }

    /**
     * Get the number of queries in the log cache
     */
    public size(): number {
        return this._queries.size;
    }

    /**
     * Remove a query from log cache and kvstore
     * @param id
     */
    public async remove(id: number): Promise<void> {
        const key = this._createCacheKey(id);
        const query = this._queries.get(key);
        if (query != null) {
            this._queries.delete(key);
            this._dirtyData.update.delete(key);
            await this._removeFromStorage(query);
        }
    }

    /**
     * Flush modified queries to kvstore, and archive old queries
     */
    public async flush(): Promise<void> {
        const queryKvMap = new Map<string, string>();

        // Get the kvKey and durable object of the updated operations
        for (const id of this._dirtyData.update.keys()) {
            const query = this._queries.get(id);
            const [queryObj, key] = query.getDurable();
            if (queryObj == null || key == null) {
                console.error(`getDurable error: id = ${id}`);
                continue; // This should never happen
            }
            queryKvMap.set(
                this._createKvKey(`${key}`),
                JSON.stringify(queryObj)
            );
        }

        // Persist to kvstore
        await this._batchUpsertKeys(queryKvMap, this.MAX_FLUSH_SIZE);

        // Clear the dirty set after writing to kvstore
        this._clearDirty();

        // Piggyback the archive
        await this._archive();
    }

    /**
     * Fetch next page of active queries from kvstore to log cache;
     * The out-dated ones will be recorded for archive
     * @param count
     */
    public async loadMore(count: number): Promise<XcQuery[]> {
        const { loaded, archive } = await this._loadMore(count);
        if (this._archiveKeys.size === 0) {
            for (const key of archive) {
                this._archiveKeys.add(key);
            }
        }

        return this.addFromDurables(loaded);
    }

    /**
     * Add queries from list of durables(XcQueryDurable)
     * @param durablesUnsorted
     * @returns List of added XcQuery, sorted by time+sqlNum DESC
     */
    public addFromDurables(durablesUnsorted: XcQueryDurable[]): Array<XcQuery> {
        const minQueryId = this._getMinId();
        const queryList: Array<XcQuery> = new Array();

        if (durablesUnsorted == null) {
            return [];
        }
        const sortedQueries = durablesUnsorted.concat([]);
        sortedQueries.sort(querySqlSorterDesc);

        const logs: XcLog[] = Log.getLogs();
        const errorLogs: XcLog[] = Log.getErrorLogs();
        const numQueries: number = sortedQueries.length;

        for (let i = 0; i < numQueries; i++) {
            const queryDurable: XcQueryDurable = sortedQueries[i];
            const xcLog = queryDurable.state === QueryStatus.Error
                ? errorLogs[queryDurable.sqlNum]
                : logs[queryDurable.sqlNum];

            let name; // string or sqlops
            let cli: string;
            if (xcLog) {
                name = xcLog.options.operation;
                if (name === SQLOps.Retina &&
                    xcLog.options.retName) {
                    name += " " + xcLog.options.retName;
                }
                if (queryDurable.state === QueryStatus.Error) {
                    cli = queryDurable.queryStr;
                } else {
                    cli = xcLog.cli;
                    if (cli != null && cli.slice(-1) === ",") {
                        cli = cli.slice(0, -1);
                    }
                }
            } else {
                name = queryDurable.name;
                cli = queryDurable.queryStr;
            }
            if (!name) {
                continue; // info is not stored in log due to an overwritten
                          // undo so we skip
            }

            const fullName: string = queryDurable.fullName || name;
            const queryId: number = Math.min(minQueryId, 0) - 1 - i;
            const query = new XcQuery({
                "version": queryDurable.version,
                "name": name,
                "fullName": fullName,
                "time": queryDurable.time,
                "id": queryId,
                "numSteps": 1,
                "queryStr": cli,
                "sqlNum": queryDurable.sqlNum,
                "elapsedTime": queryDurable.elapsedTime,
                "opTime": queryDurable.opTime,
                "opTimeAdded": queryDurable.opTimeAdded,
                "outputTableName": queryDurable.outputTableName,
                "outputTableState": queryDurable.outputTableState,
                "state": queryDurable.state,
                "type": "restored",
                "error": queryDurable.error,
                "srcTables": null,
                "cancelable": null,
                "queryMeta": queryDurable.queryMeta
            });

            queryList.push(query);
            this.add(queryId, query, false);
        }

        return queryList;

        function querySqlSorterDesc(a: XcQueryDurable, b: XcQueryDurable): number {
            if (a.time > b.time) {
                return -1;
            } else if (a.time < b.time) {
                return 1;
            } else {
                if (a.sqlNum > b.sqlNum) {
                    return -1;
                } else {
                    return 1;
                }
            }
        }
    }

    /**
     * Get all queries in the log cache;
     * Do not mutate, as they are references
     */
    public getAll(): {[id: string]: XcQuery} {
        const allQueries = {};
        for (const [id, query] of this._queries.entries()) {
            allQueries[id] = query;
        }
        return allQueries;
    }

    private _createCacheKey(id: number): string {
        return `${id}`;
    }

    private _getKvPrefix(): string {
        return KVStore.getKey("gQueryListPrefix");
    }

    private _getArchiveKvPrefix(): string {
        return KVStore.getKey("gQueryArchivePrefix");
    }

    private async _loadMore(count: number): Promise<{
        loaded: XcQueryDurable[],
        archive: string[]
    }> {
        const earlierThan = this._getEarliestTime();
        // List all the query keys
        const {keys: allKeys} = await PromiseHelper.convertToNative(
            KVStore.list(this._getKvKeyPattern(), gKVScope.WKBK)
        );

        // Get keys earlier than ...
        const sortedKeys: string[] = [];
        const archiveKeys: string[] = [];
        for (const kvKey of allKeys) {
            const time = this._parseTimeFromKey(kvKey);
            if (this._needArchive(time)) {
                archiveKeys.push(kvKey);
                continue;
            }
            const isEarlier = (!Number.isNaN(time)) && time <= earlierThan;
            if (isEarlier) {
                sortedKeys.push(kvKey);
            }
        }

        // Sort keys by DESC
        sortedKeys.sort((a, b) => {
            return this._parseTimeFromKey(b) - this._parseTimeFromKey(a);
        });

        // Remove dups
        const existingKeys = new Set<string>();
        for (const query of this._queries.values()) {
            const durableInfo = query.getDurable();
            existingKeys.add(this._createKvKey(`${durableInfo[1]}`));
        }
        const loadKeys: string[] = [];
        for (const kvKey of sortedKeys) {
            if (existingKeys.has(kvKey)) {
                continue;
            }
            loadKeys.push(kvKey);
            if (loadKeys.length >= count) {
                break;
            }
        }

        // Split into batches
        const batchSize = 10;
        const keyBatch: Array<string[]> = new Array();
        let currentBatch: string[] = [];
        for (const key of loadKeys) {
            currentBatch.push(key);
            if (currentBatch.length >= batchSize) {
                keyBatch.push(currentBatch);
                currentBatch = [];
            }
        }
        if (currentBatch.length > 0) {
            keyBatch.push(currentBatch);
        }

        // Call kvstore batch by batch
        const queries: XcQueryDurable[] = [];
        for (const keys of keyBatch) {
            const kvstore = new KVStore(keys, gKVScope.WKBK);
            const kvMap = await PromiseHelper.convertToNative(kvstore.multiGet());
            for (const content of kvMap.values()) {
                try {
                    queries.push(JSON.parse(content));
                } catch {
                    // Do nothing, just skip the invalid value
                }
            }
        }

        return {
            loaded: queries,
            archive: archiveKeys
        };
    }

    private async _archive(): Promise<void> {
        if (this._archiveKeys.size === 0) {
            return;
        }

        // Split into batches: reduce the memory consumption
        const groupSize = 20;
        const keyGroups: Array<string[]> = new Array();
        let currentGroup: Array<string> = new Array();
        for (const kvKey of this._archiveKeys.values()) {
            if (currentGroup.length >= groupSize) {
                keyGroups.push(currentGroup);
                currentGroup = new Array();
            }
            currentGroup.push(kvKey);
        }
        if (currentGroup.length > 0) {
            keyGroups.push(currentGroup);
        }

        // Archive group by group
        for (const keys of keyGroups) {
             // Remove from active list
             const activeKvMap = await this._batchPopKeys(keys, 10);
             // Add archive keys
             const archiveKvMap: Map<string, string> = new Map();
             for (const [activeKey, value] of activeKvMap.entries()) {
                 const durableKey = this._parseDurableKey(activeKey);
                 const archiveKey = this._createArchiveKvKey(durableKey);
                 archiveKvMap.set(archiveKey, value);
             }
             await this._batchUpsertKeys(archiveKvMap, this.MAX_FLUSH_SIZE);
        }

        // Clear the key set
        this._archiveKeys.clear();
    }

    private async _batchUpsertKeys(kvMap: Map<string, string>, maxUpdateSize: number): Promise<void> {
        if (kvMap == null || kvMap.size === 0) {
            return;
        }

        // Split into batches: restrict the size of data sent to kvstore.multiPut
        const updateBatch: Array<{keys: string[], values: string[], size: number}> = new Array();
        let currentBatch: {keys: string[], values: string[], size: number} = {keys: [], values: [], size: 0};
        for (const [key, value] of kvMap.entries()) {
            if (currentBatch.size >= maxUpdateSize) {
                updateBatch.push(currentBatch);
                currentBatch = {keys: [], values: [], size: 0};
            }

            currentBatch.keys.push(key);
            currentBatch.values.push(value);
            currentBatch.size += value.length;
        }
        if (currentBatch.keys.length > 0) {
            updateBatch.push(currentBatch);
        }

        // Update kvstore batch by batch
        for (const batch of updateBatch) {
            const kvStore = new KVStore(batch.keys, gKVScope.WKBK);
            await PromiseHelper.convertToNative(kvStore.multiPut(batch.values, true));
        }
    }

    private async _batchPopKeys(keys: Array<string>, batchSize: number): Promise<Map<string, string>> {
        if (keys == null || keys.length === 0) {
            return;
        }

        // Split into batches: restrict the number of concurrent calls
        const popBatch: Array<Array<string>> = [];
        let currentBatch = new Array<string>();
        for (const key of keys) {
            if (currentBatch.length >= batchSize) {
                popBatch.push(currentBatch);
                currentBatch = new Array<string>();
            }
            currentBatch.push(key);
        }
        if (currentBatch.length > 0) {
            popBatch.push(currentBatch);
        }

        // Pop kvstore batch by batch
        const popResult: Map<string, string> = new Map();
        for (const batch of popBatch) {
            // Get the current values
            const kvstore = new KVStore(batch, gKVScope.WKBK);
            const kvMap = await PromiseHelper.convertToNative(kvstore.multiGet());
            for (const [key, value] of kvMap.entries()) {
                popResult.set(key, value);
            }
            // Delete keys
            await Promise.all(batch.map((kvKey) => {
                const kvstore = new KVStore(kvKey, gKVScope.WKBK);
                try {
                    return PromiseHelper.convertToNative(kvstore.delete());
                } catch {
                    return Promise.resolve();
                }
            }));
        }

        return popResult;
    }

    private _getMinId(): number {
        if (this._queries.size === 0) {
            return 0;
        }
        let minId = 0;
        for (const key of this._queries.keys()) {
            const id = Number.parseInt(key) || 0;
            minId = Math.min(minId, id);
        }
        return minId;
    }

    private _getEarliestTime(): number {
        let earliest = null;
        for (const query of this._queries.values()) {
            const queryTime = query.getTime();
            if (earliest == null || earliest > queryTime) {
                earliest = queryTime;
            }
        }

        return earliest || Date.now();
    }

    private _createKvKey(durableKey: string): string {
        return `${this._getKvPrefix()}/${durableKey}`;
    }

    private _createArchiveKvKey(durableKey: string): string {
        return `${this._getArchiveKvPrefix()}/${durableKey}`;
    }

    private _parseTimeFromKey(kvKey: string): number {
        const durableKey = this._parseDurableKey(kvKey);
        return XcQuery.parseTimeFromKey(durableKey);
    }

    private _parseDurableKey(kvKey: string): string {
        const prefixLength = `${this._getKvPrefix()}/`.length;
        return kvKey.substring(prefixLength);
    }

    private _getKvKeyPattern(): string {
        return `${this._getKvPrefix()}/.+`;
    }

    private _clearDirty(): void {
        this._dirtyData.update.clear();
    }

    private _needArchive(queryTime: number): boolean {
        return (Date.now() - queryTime) > this.LOG_LIFE_TIME;
    }

    private async _removeFromStorage(query: XcQuery): Promise<void> {
        if (query == null) {
            return;
        }
        const durableInfo = query.getDurable();
        const kvstore = new KVStore(this._createKvKey(`${durableInfo[1]}`), gKVScope.WKBK);
        await PromiseHelper.convertToNative(kvstore.delete());
    }
}

