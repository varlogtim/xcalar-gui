namespace QueryManager {
    let $queryList: JQuery;   // $("#monitor-queryList")
    let $queryDetail: JQuery; // $("#monitor-queryDetail")
    let queryLists: {[key: string]: XcQuery} = {}; // will be populated by xcQuery objs with transaction id as key
    let queryCheckList: {[key: number]: number} = {}; // setTimeout timers
    let canceledQueries: {[key: number]: XcQuery} = {}; // for canceled queries that have been deleted
                              // but the operation has not returned yet
    // XXX store this as a query property
    const sysQueryTypes: string[] = [SQLOps.ProfileSort, SQLOps.ProfileBucketing,
                           SQLOps.ProfileAgg, SQLOps.ProfileStats,
                           SQLOps.RenameOrphanTable,
                           SQLOps.QuickAgg, SQLOps.Corr, SQLOps.PreviewDS,
                           SQLOps.DestroyPreviewDS];
    const nonCancelableTypes: string[] = [SQLOps.RenameTable, SQLOps.RenameOrphanTable,
                            SQLOps.DestroyDS, SQLOps.DestroyPreviewDS,
                            SQLOps.DeleteTable, SQLOps.DeleteAgg];
    const noOutputs: string[] = [SQLOps.DestroyDS, SQLOps.DestroyPreviewDS,
                            SQLOps.DeleteTable, SQLOps.DeleteAgg];

    // constant
    const checkInterval: number = 2000; // check query every 2s
    let infList: InfList;

    export interface AddQueryOptions {
        numSteps?: number,
        cancelable?: boolean,
        srcTables?: string[]
    }

    export interface AddSubQueryOptions {
        queryName?: string,
        exportFileName?: string,
        retName?: string
    }

    export interface SubQueryDoneOptions {
        retName?: string
    }

    export interface XcQueryAbbr {
        sqlNum: number,
        time: number,
        elapsedTime: number,
        opTime: number,
        opTimeAdded: boolean,
        outputTableName: string,
        outputTableState: string | number,
        state: string | number,
        name?: string,
        fullName?: string,
        queryStr?: string,
        error?: string
    }

    interface TimeObj {
        tip: string,
        text: string
    }

    /**
     * QueryManager.setup
     */
    export function setup(): void {
        $queryList = $("#monitor-queryList");
        $queryDetail = $("#monitor-queryDetail");
        infList = new InfList($queryList, {numInitial: 30});
        addEventHandlers();
    };

    // if numSteps is unknown, should take in -1
    /**
     * QueryManager.addQuery
     * @param id
     * @param name
     * @param options
     */
    export function addQuery(
        id: number,
        name: string,
        options: AddQueryOptions
    ): void {
        if (Transaction.isSimulate(id)) {
            return;
        }

        options = options || {};
        const time: number = new Date().getTime();
        const fullName: string = name + "-" + time;
        const numSteps: number = options.numSteps || -1;

        if (nonCancelableTypes.indexOf(name) > -1) {
            options.cancelable = false;
        }

        const mainQuery: XcQuery = new XcQuery({
            "name": name,
            "fullName": fullName,
            "time": time,
            "type": "xcFunction",
            "id": id,
            "numSteps": numSteps,
            "cancelable": options.cancelable,
            "srcTables": options.srcTables
        });

        queryLists[id] = mainQuery;
        const $query: JQuery = $(getQueryHTML(mainQuery));
        $queryList.find(".hint").remove();
        $queryList.append($query);

        focusOnQuery($query);

        updateStatusDetail({
            "start": getQueryTime(time),
            "op": name,
            "startTime": CommonTxtTstr.NA,
            "elapsed": CommonTxtTstr.NA,
        }, id, QueryStatus.Run, true);

        if (UserSettings.getPref("hideSysOps") &&
            sysQueryTypes.indexOf(name) > -1) {
            updateQueryTextDisplay("");
        }
    };

    // queryName will be empty if subquery doesn't belong to a xcalarQuery
    /**
     * QueryManager.addSubQuery
     * @param id
     * @param name
     * @param dstTable
     * @param query
     * @param options
     */
    export function addSubQuery(
        id: number,
        name: string,
        dstTable: string,
        query: string,
        options?: AddSubQueryOptions
    ): void {
        if (Transaction.isSimulate(id) ||
            !queryLists[id] ||
            Transaction.checkCanceled(id)) {
            return;
        }

        const mainQuery: XcQuery = queryLists[id];
        const time: number = new Date().getTime();
        options = options || {};
        const subQuery: XcSubQuery = new XcSubQuery({
            "name": name,
            "time": time,
            "query": query,
            "dstTable": dstTable,
            "id": id,
            "index": mainQuery.subQueries.length,
            "queryName": options.queryName,
            "exportFileName": options.exportFileName,
            "retName": options.retName
        });
        mainQuery.addSubQuery(subQuery);

        if (mainQuery.currStep === mainQuery.subQueries.length - 1) {
            if (options.queryName) {
                xcalarQueryCheck(id);
            } else {
                // delay first check so we don't check too early before
                // the operation has been started
                operationCheck(subQuery, 10);
            }
        }
        const $query: JQuery = $queryList.find('.query[data-id="' + id + '"]');
        if ($query.hasClass('active')) {
            updateQueryTextDisplay(mainQuery.getQuery());
        }
    };

    /**
     * QueryManager.scrollToFocused
     */
    export function scrollToFocused(): void {
        const $activeLi: JQuery = $queryList.find('.active');
        if ($activeLi.length && $('#monitorMenu').hasClass('active') &&
            !$('#monitorMenu').find('.menuSection.query')
            .hasClass('xc-hidden')) {
            const listHeight: number = $queryList.height();
            const liHeight: number = $activeLi.height();
            let position: JQueryCoordinates = $activeLi.position();
            if (position.top < 0 || position.top + liHeight > listHeight) {
                const scrollTop: number = $queryList.scrollTop();
                $queryList.scrollTop(scrollTop + position.top);
            }
        }
    };

    /**
     * QueryManager.queryDone
     * @param id
     * @param sqlNum
     */
    export function queryDone(id: number, sqlNum?: number): void {
        if (Transaction.isSimulate(id) || !queryLists[id]) {
            return;
        }

        const mainQuery: XcQuery = queryLists[id];
        mainQuery.state = QueryStatus.Done;
        if (mainQuery.name === SQLOps.ExportTable) {
            mainQuery.outputTableState = "exported";
        } else if (mainQuery.name === SQLOps.Aggr) {
            mainQuery.outputTableState = "unavailable";
        } else {
            mainQuery.outputTableState = "active";
        }

        if (sqlNum != null) {
            mainQuery.sqlNum = sqlNum;
        }

        mainQuery.setElapsedTime();
        clearIntervalHelper(id);
        updateQueryBar(id, 100);
        updateStatusDetail({
            "start": getQueryTime(mainQuery.getTime()),
            "elapsed": xcHelper.getElapsedTimeStr(mainQuery.getElapsedTime(),
                                                    null, true),
            "opTime": xcHelper.getElapsedTimeStr(mainQuery.getOpTime()),
            "total": xcHelper.getElapsedTimeStr(mainQuery.getElapsedTime(),
                                                null, true)
        }, id);
        updateOutputSection(id);
    };

    /**
     * QueryManager.subQueryDone
     * @param id
     * @param dstTable
     * @param time
     * @param options
     */
    export function subQueryDone(
        id: number, dstTable: string | null,
        time: object,
        options?: SubQueryDoneOptions
    ): void {
        if (Transaction.isSimulate(id) || !queryLists[id]) {
            return;
        }

        options = options || {};
        const mainQuery: XcQuery = queryLists[id];
        if (time != null) {
            if (mainQuery.name === SQLOps.Retina && options.retName) {
                mainQuery.setOpTime(time);
            } else {
                mainQuery.addOpTime(time);
            }
        }

        // execute retina returned, should be on last step of the group of
        // queries
        if (options.retName) {
            const lastQueryPos: number = getLastOperationPos(mainQuery, mainQuery.currStep);
            setQueriesDone(mainQuery, mainQuery.currStep, lastQueryPos);
            mainQuery.currStep = lastQueryPos;
        }

        if (mainQuery.subQueries.length &&
            mainQuery.subQueries[0].getName() === "index from DS") {
            DSCart.queryDone(mainQuery.getId());
            return;
        }

        for (let i = 0; i < mainQuery.subQueries.length; i++) {
            let subQuery: XcSubQuery = mainQuery.subQueries[i];
            if (subQuery.dstTable === dstTable || (options.retName &&
                mainQuery.currStep === i)) {
                subQuery.state = QueryStatus.Done;
                if (mainQuery.currStep === i) {
                    incrementStep(mainQuery);
                    subQuery = mainQuery.subQueries[mainQuery.currStep];
                    clearIntervalHelper(id);
                    if (mainQuery.currStep !== mainQuery.numSteps) {
                        // query is not done yet
                        while (subQuery && subQuery.state === QueryStatus.Done) {
                            incrementStep(mainQuery);
                            subQuery = mainQuery.subQueries[mainQuery.currStep];
                        }
                        if (mainQuery.currStep === mainQuery.numSteps) {
                            // query is done
                        } else if (subQuery) {
                            if (subQuery.queryName) {
                                xcalarQueryCheck(id);
                            } else {
                                operationCheck(subQuery);
                            }
                        }
                    }
                }
                break;
            }
        }
    };

    /**
     * QueryManager.removeQuery
     * @param ids
     * @param userTriggered
     */
    export function removeQuery(ids: number[] | number, userTriggered?: boolean) {
        if (!(ids instanceof Array)) {
            ids = [ids];
        }

        ids.forEach(function(id) {
            if (Transaction.isSimulate(id) || !queryLists[id]) {
                return;
            }

            if (userTriggered) {
                // do not allow user to click on trash if not started or processing
                const state: number | string = queryLists[id].state;
                if (state === QueryStateT.qrNotStarted ||
                    state === QueryStateT.qrProcessing) {
                    return;
                }
            }
            clearIntervalHelper(id);
            // we may not want to immediately delete canceled queries because
            // we may be waiting for the operation to return and clean up some
            // intermediate tables
            if (queryLists[id].state === QueryStatus.Cancel) {
                canceledQueries[id] = queryLists[id];
            }

            delete queryLists[id];
            const $query:JQuery = $queryList.find('.query[data-id="' + id + '"]');
            if ($query.hasClass('active')) {
                setDisplayToDefault();
            }
            $query.remove();
        });

        xcTooltip.hideAll();
    };

    /**
     * QueryManager.cancelQuery
     * @param id
     */
    export function cancelQuery(id: number): XDPromise<any> {
        if (Transaction.isSimulate(id)) {
            return;
        }
        const deferred: XDDeferred<object> = PromiseHelper.deferred();
        const mainQuery: XcQuery = queryLists[id];
        if (mainQuery == null) {
            // error case
            console.warn('invalid operation', 'transaction id: ' + id);
            deferred.reject('invalid operation');
            return deferred.promise();
        } else if (mainQuery.state === QueryStatus.Done) {
            console.warn('operation is done, cannot cancel');
            deferred.reject('operation is done, cannot cancel');
            return deferred.promise();
        } else if (mainQuery.state === QueryStatus.Cancel ||
                   mainQuery.state === QueryStatus.Error) {
            deferred.reject("already canceled");
            return deferred.promise();
        }

        const prevState: string | number = mainQuery.getState();

        const $query: JQuery = $queryList.find('.query[data-id="' + id + '"]');
        $query.find('.cancelIcon').addClass('disabled');

        if (!Transaction.isCancelable(id)) {
            deferred.reject('building new table, cannot cancel');
            return deferred.promise();
        }

        $('.lockedTableIcon[data-txid="' + id + '"]').remove();
        xcTooltip.hideAll();
        Transaction.cancel(id);
        unlockSrcTables(mainQuery);

        // unfinished tables will be dropped when Transaction.fail is reached
        const onlyFinishedTables: boolean = true;
        dropCanceledTables(mainQuery, onlyFinishedTables);
        tableListCanceled(mainQuery);

        const currStep: number = mainQuery.currStep;

        if (!mainQuery.subQueries[currStep]) {
            if (currStep === 0 && prevState === QueryStateT.qrNotStarted) {
                deferred.resolve();
            } else if (mainQuery.subQueries[currStep - 1]) {
                // previous subquery finished but currStep hasn't started
                deferred.resolve();
            } else {
                deferred.reject('step vs operation mismatch');
            }
            return deferred.promise();
        }

        const statusesToIgnore: number[] = [StatusT.StatusOperationHasFinished];

        // this is a xcalar query
        if (mainQuery.subQueries[currStep].queryName) {
            // Query Cancel returns success even if the operation is
            // complete, unlike cancelOp. Xc4921
            XcalarQueryCancel(mainQuery.subQueries[currStep].queryName, [])
            .then(function(ret) {
                console.info('operation cancel submitted', ret);
                deferred.resolve();
            })
            .fail(deferred.reject); // errors being handled inside XcalarCancelOp

        } else { // xcFunction
            XcalarCancelOp(mainQuery.subQueries[currStep].dstTable,
                           statusesToIgnore)
            .then(function(ret) {
                console.info('operation submitted', ret);
                deferred.resolve();
            })
            .fail(deferred.reject); // errors being handled inside XcalarCancelOp
        }
        return deferred.promise();
    };

    /**
     * QueryManager.cancelDS
     * @param id
     */
    export function cancelDS(id: number): void {
        if (Transaction.isSimulate(id)) {
            return;
        }
        const mainQuery: XcQuery = queryLists[id];
        const subQuery: XcSubQuery = mainQuery.subQueries[0];
        if (!subQuery) {
            // Load hasn't been triggered yet so no DS to cancel (rare)
            return;
        }

        const dsId: string = subQuery.dstTable.substring(gDSPrefix.length);
        const $grid: JQuery = DS.getGrid(dsId);
        DS.cancel($grid);
        // DS.cancel preps the DsObj and icon and
        // eventually calls QueryManager.cancelQuery
    };

    /**
     * QueryManager.cancelDF
     * @param id
     */
    export function cancelDF(id: number) {
        if (Transaction.isSimulate(id)) {
            return;
        }
        const mainQuery: XcQuery = queryLists[id];
        if (!mainQuery) {
            return;
        }
        if (mainQuery.subQueries[0]) {
            const retName: string = mainQuery.subQueries[0].retName;
            DFCard.cancelDF(retName, id);
        }
    };

    // this gets called after cancel is successful. It cleans up and updates
    // the query state and views
    /**
     * QueryManager.confirmCanceledQuery
     * @param id
     */
    export function confirmCanceledQuery(id: number): void {
        if (Transaction.isSimulate(id) || !queryLists[id]) {
            return;
        }
        clearIntervalHelper(id);

        const mainQuery: XcQuery = queryLists[id];
        mainQuery.state = QueryStatus.Cancel;
        mainQuery.outputTableState = "deleted";
        mainQuery.setElapsedTime();
        updateQueryBar(id, null, false, true, true);
        updateStatusDetail({
            "start": getQueryTime(mainQuery.getTime()),
            "elapsed": xcHelper.getElapsedTimeStr(mainQuery.getElapsedTime(),
                                                  true, true),
            "opTime": xcHelper.getElapsedTimeStr(mainQuery.getOpTime()),
            "total": CommonTxtTstr.NA
        }, id);
        updateOutputSection(id, true);
        const $query: JQuery = $('.query[data-id="' + id + '"]');
        $query.addClass(QueryStatus.Cancel).find('.querySteps')
              .text(xcHelper.capitalize(QueryStatus.Cancel));
        if ($query.hasClass('active')) {
            updateHeadingSection(mainQuery);
        }
        if (mainQuery.subQueries[0] &&
            mainQuery.subQueries[0].getName() === "index from DS")
        {
            const isCanceled: boolean = true;
            DSCart.queryDone(mainQuery.getId(), isCanceled);
        }
    };

    /**
     * QueryManager.cleanUpCanceledTables
     * @param id
     */
    export function cleanUpCanceledTables(id: number): void {
        if (Transaction.isSimulate(id)) {
            return;
        }
        if (!queryLists[id] && !canceledQueries[id]) {
            return;
        }
        let mainQuery: XcQuery;
        if (queryLists[id]) {
            mainQuery = queryLists[id];
        } else {
            mainQuery = canceledQueries[id];
        }

        dropCanceledTables(mainQuery, false);
        clearTableListCanceled(mainQuery);
        delete canceledQueries[id];
    };

    /**
     * QueryManager.fail
     * @param id
     * @param error
     */
    export function fail(id: number, error: string | XCThriftError): void {
        if (Transaction.isSimulate(id) || !queryLists[id]) {
            return;
        }

        const mainQuery: XcQuery = queryLists[id];
        mainQuery.state = QueryStatus.Error;
        mainQuery.outputTableState = "unavailable";
        mainQuery.sqlNum = Log.getErrorLogs().length - 1;
        if (error) {
            if (typeof error === "object" && error.error) {
                error = error.error;
            }
            if (typeof error === "string") {
                mainQuery.error = error;
            }
        }
        updateQueryTextDisplay(mainQuery.getQuery(), false, mainQuery.error);

        mainQuery.setElapsedTime();
        clearIntervalHelper(id);
        updateQueryBar(id, null, true, false, true);
        updateStatusDetail({
            "start": getQueryTime(mainQuery.getTime()),
            "elapsed": xcHelper.getElapsedTimeStr(mainQuery.getElapsedTime(),
                                                    null, true),
            "opTime": xcHelper.getElapsedTimeStr(mainQuery.getOpTime()),
            "total": CommonTxtTstr.NA
        }, id, QueryStatus.Error);
        updateOutputSection(id);
        const $query: JQuery = $('.query[data-id="' + id + '"]');
        $query.addClass(QueryStatus.Error).find('.querySteps')
              .text(xcHelper.capitalize(QueryStatus.Error));
        if ($query.hasClass('active')) {
            updateHeadingSection(mainQuery);
        }
    };

    /**
     * QueryManager.check
     * @param doNotAnimate
     */
    export function check(doNotAnimate?: boolean): void {
        // check queries
        for (const xcQuery in queryLists) {
            const query: XcQuery = queryLists[xcQuery];
            if (query.type === "restored") {
                continue;
            }
            if (query.state !== QueryStatus.Done &&
                query.state !== QueryStatus.Cancel &&
                query.state !== QueryStatus.Error) {
                for (let i = 0; i < query.subQueries.length; i++) {
                    const subQuery: XcSubQuery = query.subQueries[i];
                    if (subQuery.state !== QueryStatus.Done) {
                        if (subQuery.queryName) {
                            xcalarQueryCheck(query.getId(), doNotAnimate);
                        } else {
                            operationCheck(subQuery);
                        }
                        break;
                    }
                }
            }
        }
    };

    /**
     * QueryManager.getAll
     */
    export function getAll(): object {
        return ({
            "queryLists": queryLists,
            "queryCheckLists": queryCheckList
        });
    };

    /**
     * QueryManager.getQuery
     * @param id
     */
    export function getQuery(id: number): XcQuery {
        return queryLists[id];
    };

    /**
     * QueryManager.getCache
     */
    export function getCache(): XcQueryAbbr[] {
        // used for saving query info for browser refresh
        // put minimal query properties into an array and order by start time
        const queryObjs: XcQueryAbbr[] = [];
        let abbrQueryObj: XcQueryAbbr;
        let queryObj: XcQuery;
        const queryMap: object = {}; // we store queries into a map first to overwrite any
        // queries with duplicate sqlNums due to Log.undo/redo operations
        // then sort in an array
        for (const id in queryLists) {
            queryObj = queryLists[id];
            if (queryObj.state === QueryStatus.Done ||
                queryObj.state === QueryStatus.Cancel ||
                queryObj.state === QueryStatus.Error) {
                abbrQueryObj = {
                    "sqlNum": queryObj.sqlNum,
                    "time": queryObj.time,
                    "elapsedTime": queryObj.elapsedTime,
                    "opTime": queryObj.opTime,
                    "opTimeAdded": queryObj.opTimeAdded,
                    "outputTableName": queryObj.getOutputTableName(),
                    "outputTableState": queryObj.getOutputTableState(),
                    "state": queryObj.state
                };

                if (queryObj.sqlNum === null ||
                    queryObj.state === QueryStatus.Cancel) {
                    abbrQueryObj.name = queryObj.name;
                    abbrQueryObj.queryStr = queryObj.getQuery();
                    queryMap[queryObj.fullName] = abbrQueryObj;
                } else if (queryObj.state === QueryStatus.Error) {
                    abbrQueryObj.queryStr = queryObj.getQuery();
                    abbrQueryObj.error = queryObj.error;
                    queryMap[queryObj.fullName] = abbrQueryObj;
                } else {
                    queryMap[queryObj.sqlNum] = abbrQueryObj;
                }
            }
        }
        for (const i in queryMap) {
            queryObjs.push(queryMap[i]);
        }
        queryObjs.sort(querySqlSorter);
        return queryObjs;
    };

    /**
     * QueryManager.restore
     * @param queries
     */
    export function restore(queries: XcQueryAbbr[]): void {
        QueryManager.toggleSysOps(UserSettings.getPref("hideSysOps"));
        if (!queries) {
            return;
        }

        const logs: XcLog[] = Log.getLogs();
        const errorLogs: XcLog[] = Log.getErrorLogs();
        let xcLog: XcLog;
        let query: XcQuery;
        const numQueries: number = queries.length;
        let html: string = "";
        let name; // string or sqlops
        let fullName: string;
        let cli: string;
        for (let i = 0; i < numQueries; i++) {
            if (queries[i].state === QueryStatus.Error) {
                xcLog = errorLogs[queries[i].sqlNum];
            } else {
                xcLog = logs[queries[i].sqlNum];
            }

            if (xcLog) {
                name = xcLog.options.operation;
                if (name === SQLOps.Ext && xcLog.options.func) {
                    name += " " + xcLog.options.func;
                } else if (name === SQLOps.Retina &&
                    xcLog.options.retName) {
                    name += " " + xcLog.options.retName;
                }
                if (queries[i].state === QueryStatus.Error) {
                    cli = queries[i].queryStr;
                } else {
                    cli = xcLog.cli;
                    if (cli != null && cli.slice(-1) === ",") {
                        cli = cli.slice(0, -1);
                    }
                }
            } else {
                name = queries[i].name;
                cli = queries[i].queryStr;
            }
            if (!name) {
                continue; // info is not stored in log due to an overwritten
                          // undo so we skip
            }

            fullName = name;
            query = new XcQuery({
                "name": name,
                "fullName": fullName,
                "time": queries[i].time,
                "id": i - numQueries,
                "numSteps": 1,
                "queryStr": cli,
                "sqlNum": queries[i].sqlNum,
                "elapsedTime": queries[i].elapsedTime,
                "opTime": queries[i].opTime,
                "opTimeAdded": queries[i].opTimeAdded,
                "outputTableName": queries[i].outputTableName,
                "outputTableState": queries[i].outputTableState,
                "state": queries[i].state,
                "type": "restored",
                "error": queries[i].error
            });
            queryLists[i - numQueries] = query; // using negative keys for
            // restored queries
            html += getQueryHTML(query, true);
        }

        if (html) {
            $queryList.find('.hint').remove();
            $queryList.append(html);
            infList.restore(".query");

            focusOnQuery($queryList.find(".query").last());
        }
    };

    /**
     * QueryManager.toggleSysOps
     * @param hide
     */
    export function toggleSysOps(hide?: boolean): void {
        if (hide) {
            $queryList.addClass("hideSysOps");
            if ($queryList.find(".sysType.active").length) {
                setDisplayToDefault();
                $queryList.find(".active").removeClass(".active");
            }
        } else {
            $queryList.removeClass("hideSysOps");
        }
    };

    /**
     * QueryManager.getAllDstTables
     * @param id
     * @param force
     */
    export function getAllDstTables(id: number, force?: boolean) {
        const tables: string[] = [];
        const query: XcQuery = queryLists[id];
        if (!query) {
            return tables;
        }
        return query.getAllTableNames(force);
    };

    // stores reused indexed table names
    /**
     * QueryManager.addIndexTable
     * @param id
     * @param tableName
     */
    export function addIndexTable(id: number, tableName: string): void {
        const query: XcQuery = queryLists[id];
        if (query) {
            query.addIndexTable(tableName);
        }
    };

    /**
     * QueryManager.getIndexTables
     * @param id
     */
    export function getIndexTables(id: number): string[] {
        const tables: string[] = [];
        const query: XcQuery = queryLists[id];
        if (!query) {
            return tables;
        }
        return query.getIndexTables();
    };

    function checkCycle(callback: Function, id: number, adjustTime: number): number {
        clearIntervalHelper(id);

        let intTime: number = checkInterval;
        if (adjustTime) { // prevents check from occuring too soon after the
            // previous check
            intTime = Math.max(200, checkInterval - adjustTime);
        }

        queryCheckList[id] = window.setTimeout(function() {
            const startTime: number = Date.now();
            callback()
            .then(function() {
                if (queryCheckList[id] != null) {
                    const elapsedTime: number = Date.now() - startTime;
                    checkCycle(callback, id, elapsedTime);
                }
            });
        }, intTime);

        return queryCheckList[id];
    }

    // get the first subquery index of a group of subqueries inside of a mainquery
    function getFirstOperationPos(mainQuery: XcQuery): number {
        const currStep: number = mainQuery.currStep;
        const subQueries: XcSubQuery[] = mainQuery.subQueries;
        const queryName: string = subQueries[currStep].queryName;
        let firstOperationPos: number = currStep;
        for (let i = mainQuery.currStep; i >= 0; i--) {
            if (subQueries[i].queryName !== queryName) {
                firstOperationPos = i + 1;
                break;
            }
        }
        return (firstOperationPos);
    }

    function getLastOperationPos(mainQuery: XcQuery, start: number): number {
        const currStep: number = mainQuery.currStep;
        const subQueries: XcSubQuery[] = mainQuery.subQueries;
        const queryName: string = subQueries[currStep].queryName;
        let lastOperationPos: number = start;
        for (let i = subQueries.length - 1; i >= 0; i--) {
            if (subQueries[i].queryName === queryName) {
                lastOperationPos = i;
                break;
            }
        }
        return (lastOperationPos);
    }

    // used for xcalarQuery subqueries since QueryManager.subQueryDone does not
    // get called
    function setQueriesDone(mainQuery: XcQuery, start: number, end: number): void {
        const subQueries: XcSubQuery[] = mainQuery.subQueries;
        for (let i = start; i < end; i++) {
            subQueries[i].state = QueryStatus.Done;
        }
    }

    // checks a group of subqueries by checking the single query name they're
    // associated with
    function xcalarQueryCheck(id: number, doNotAnimate?: boolean): void {
        if (!queryLists[id]) {
            console.error("error case");
            return;
        }

        const mainQuery: XcQuery = queryLists[id];
        const firstQueryPos: number = getFirstOperationPos(mainQuery);

        const startTime: number = Date.now();
        check()
        .then(function() {
            const elapsedTime: number = Date.now() - startTime;
            checkCycle(check, id, elapsedTime);
        });

        function check(): XDPromise<any> {
            if (mainQuery.state === QueryStatus.Error ||
                mainQuery.state === QueryStatus.Cancel ||
                mainQuery.state === QueryStatus.Done) {
                return PromiseHelper.reject();
            }
            const deferred: XDDeferred<any> = PromiseHelper.deferred();
            const queryName: string = mainQuery.subQueries[mainQuery.currStep].queryName;
            xcalarQueryCheckHelper(id, queryName)
            .then(function(res) {
                if (mainQuery.state === QueryStatus.Error ||
                    mainQuery.state === QueryStatus.Cancel ||
                    mainQuery.state === QueryStatus.Done) {
                    deferred.reject();
                    return;
                }

                const numCompleted: number = res.numCompletedWorkItem;
                const lastQueryPos: number = getLastOperationPos(mainQuery, firstQueryPos);
                let currStep: number = Math.min(numCompleted + firstQueryPos,
                                        lastQueryPos);
                mainQuery.currStep = Math.max(mainQuery.currStep, currStep);
                setQueriesDone(mainQuery, firstQueryPos, currStep);
                const state: string | number = res.queryState;

                if (state === QueryStateT.qrFinished) {
                    const curSubQuery: XcSubQuery = mainQuery.subQueries[mainQuery.currStep];
                    currStep = mainQuery.currStep + 1;
                    setQueriesDone(mainQuery, firstQueryPos, currStep);
                    if (!curSubQuery.retName) {
                        // do not increment step if retina because
                        // subQueryDone() will do this when retina resolves
                        mainQuery.currStep++;
                    }
                    clearIntervalHelper(id);
                    const subQuery: XcSubQuery = mainQuery.subQueries[currStep];
                    if (subQuery) {
                        if (subQuery.queryName) {
                            xcalarQueryCheck(id, doNotAnimate);
                        } else {
                            operationCheck(subQuery);
                        }
                    }
                    deferred.reject(); // ends cycle
                } else if (state === QueryStateT.qrError ||
                           state === QueryStateT.qrCancelled) {
                    clearIntervalHelper(id);
                    updateQueryBar(id, res, true, false, doNotAnimate);
                    deferred.reject(); // ends cycle
                } else {
                    if (mainQuery.subQueries[currStep].retName) {
                        const pct: number = parseFloat((100 * DFCard.getProgress(queryName).curOpPct)
                                    .toFixed(2));
                        updateQueryBar(id, pct, false, false, doNotAnimate);
                        mainQuery.setElapsedTime();
                        updateStatusDetail({
                            "start": getQueryTime(mainQuery.getTime()),
                            "elapsed": xcHelper.getElapsedTimeStr(
                                        mainQuery.getElapsedTime(), true, true),
                            "opTime": xcHelper.getElapsedTimeStr(
                                        mainQuery.getOpTime(), true),
                            "total": xcHelper.getElapsedTimeStr(
                                        mainQuery.getElapsedTime(), null, true),
                        }, id);
                    } else {
                        operationCheckHelper(mainQuery.subQueries[currStep], id,
                                        currStep, doNotAnimate);
                    }
                    // only stop animation the first time, do not persist it
                    doNotAnimate = false;
                    deferred.resolve();// continues cycle
                }
            })
            .fail(function(error) {
                if (!error || error.status !== StatusT.StatusQrQueryNotExist) {
                    console.error("Check failed", error, queryName);
                    updateQueryBar(id, null, error, false, doNotAnimate);
                }
                clearIntervalHelper(id);
                deferred.reject();
            });

            return deferred.promise();
        }
    }

    function xcalarQueryCheckHelper(id: number, queryName: string): XDPromise<any> {
        const mainQuery: XcQuery = queryLists[id];
        const curSubQuery: XcSubQuery = mainQuery.subQueries[mainQuery.currStep];
        if (curSubQuery.retName) {
            // if retina doesn't exist in dfcard, we stil update the elapsed
            // time, but the steps and % will be at 0
            const progress: DFProgressData  = DFCard.getProgress(curSubQuery.retName);
            let status: QueryStateT;
            if (progress.pct === 1) {
                status = QueryStateT.qrFinished;
            } else {
                status = QueryStateT.qrProcessing;
            }
            const ret: object = {
                numCompletedWorkItem: progress.numCompleted,
                queryState: status
            };
            if (mainQuery.name === SQLOps.Retina && progress.opTime) {
                mainQuery.setOpTime(progress.opTime);
            }
            return PromiseHelper.resolve(ret);
        } else {
            return XcalarQueryState(queryName);
        }
    }

    function incrementStep(mainQuery: XcQuery): void {
        mainQuery.currStep++;

        const id: number = mainQuery.getId();
        const $query: JQuery = $queryList.find('.query[data-id="' + id + '"]');

        if ($query.hasClass('active')) {
            updateQueryTextDisplay(mainQuery.getQuery());
        }

        if (mainQuery.numSteps !== -1 &&
            mainQuery.currStep >= mainQuery.numSteps) {
            // show finished state for the entire query
            updateQueryBar(id, 100);
        }
    }

    function focusOnQuery($target: JQuery): void {
        if ($target.hasClass("active") || ($target.hasClass("sysType") &&
            UserSettings.getPref("hideSysOps"))) {
            return;
        }

        const queryId: number = parseInt($target.data("id"));
        $target.siblings(".active").removeClass("active");
        $target.addClass("active");

        // update right section
        const mainQuery: XcQuery = queryLists[queryId];
        let query: string = (mainQuery == null) ? "" : mainQuery.getQuery();
        let startTime: string | object;

        if (mainQuery == null) {
            console.error("cannot find query", queryId);
            query = "";
            startTime = CommonTxtTstr.NA;
        } else {
            query = mainQuery.getQuery();
            startTime = getQueryTime(mainQuery.getTime());
        }

        let totalTime: string = CommonTxtTstr.NA;
        let elapsedTime: string;
        let opTime: string;
        if (mainQuery.getState() === QueryStatus.Done ||
            mainQuery.getState() === QueryStatus.Cancel ||
            mainQuery.getState() === QueryStatus.Error) {
            elapsedTime = xcHelper.getElapsedTimeStr(mainQuery.getElapsedTime(),
                                                    null, true);
            opTime = xcHelper.getElapsedTimeStr(mainQuery.getOpTime());
            if (mainQuery.getState() === QueryStatus.Done) {
                totalTime = elapsedTime;
            }
        } else {
            if (mainQuery !== null) {
                mainQuery.setElapsedTime();
            }
            elapsedTime = xcHelper.getElapsedTimeStr(mainQuery.getElapsedTime(),
                                                     true, true);
            opTime = xcHelper.getElapsedTimeStr(mainQuery.getOpTime(), true);
        }
        updateHeadingSection(mainQuery);
        updateStatusDetail({
            "start": startTime,
            "elapsed": elapsedTime,
            "opTime": opTime,
            "total": totalTime
        }, queryId);
        updateQueryTextDisplay(query, false, mainQuery.error);
        updateOutputSection(queryId);
    }

    function updateHeadingSection(mainQuery: XcQuery): void {
        let state: string | number = mainQuery.getState();
        const id: number = mainQuery.id;
        const $text: JQuery = $queryDetail.find(".op .text");
        let name: string = mainQuery.name;
        if (sysQueryTypes.indexOf(name) > -1) {
            name = "Sys-" + name;
        }
        $text.text(name);

        if (state === QueryStateT.qrNotStarted ||
            state === QueryStateT.qrProcessing) {
            state = QueryStatus.Run;
        } else if (state === QueryStateT.qrFinished ||
                   state === QueryStatus.Done) {
            state = QueryStatus.Done;
        } else if (state === QueryStateT.qrCancelled ||
                   state === QueryStatus.Cancel) {
            state = QueryStatus.Cancel;
        } else if (state === QueryStateT.qrError ||
                    state === QueryStatus.Error) {
            state = QueryStatus.Error;
        }

        $queryDetail.find(".querySection")
                    .removeClass(QueryStatus.Run)
                    .removeClass(QueryStatus.Done)
                    .removeClass(QueryStatus.Error)
                    .removeClass(QueryStatus.Cancel)
                    .removeClass(QueryStatus.RM)
                    .addClass(state + "");
        if (state === QueryStatus.Run) {
            QueryManager.check(true);
            // we need to update the extraProgressBar even if we don't
            // have status data otherwise we'll have the progressBar of the
            // previous query
            const $progressBar: JQuery = $queryList.find('.query[data-id="' + id + '"]')
                                         .find(".progressBar");
            let prevProgress: number = 100 * $progressBar.width() /
                                             $progressBar.parent().width();
            prevProgress = prevProgress || 0; // in case of 0/0 NaN;
            updateQueryBar(id, prevProgress, false, false, true);
        } else if (state === QueryStatus.Done) {
            updateQueryBar(id, 100, false, false, true);
        } else if (state === QueryStatus.Cancel) {
            updateQueryBar(id, null, false, true, true);
        } else if (state === QueryStatus.Error) {
            updateQueryBar(id, null, true, false, true);
        }
    }

    function updateQueryTextDisplay(query: string, blank?: boolean, errorText?: string): void {
        let queryString: string = "";
        if (query) {
            let querySplit: string[] = [];
            try {
                querySplit = JSON.parse('[' + query + ']');
            } catch (error) {
                console.error(error);
            }
            for (let i = 0; i < querySplit.length; i++) {
                const subQuery: string = querySplit[i];
                queryString += '<div class="queryRow"><pre>' + JSON.stringify(subQuery, null, 2);
                if (i + 1 < querySplit.length) {
                    queryString += ',</pre></div>';
                } else {
                    queryString += '</pre></div>';
                }
            }
        } else if (!query && !blank) {
            queryString = '<div class="queryRow"></div>';
        } else {
            query = xcHelper.escapeHTMLSpecialChar(query);
            queryString = '<div class="queryRow">' + query + '</div>';
        }
        if (errorText) {
            queryString += '<div class="queryRow errorRow">' +
                           xcHelper.escapeHTMLSpecialChar(errorText) + '</div>';
        }

        $queryDetail.find(".operationSection .content").html(queryString);
    }

    // updates the status text in the main card
    function updateStatusDetail(info: object, id, status?: string, reset?: boolean): void {
        if (id != null) {
            // do not update detail if not focused on this query bar
            if (!$queryList.find('.query[data-id="' + id + '"]')
                           .hasClass('active')) {
                return;
            }
        }

        const $statusDetail: JQuery = $queryDetail.find(".statusSection");
        const $query: JQuery = $queryDetail.find(".querySection");
        for (const i in info) {
            if (i === "op") {
                let name: string = info[i];
                if (sysQueryTypes.indexOf(name) > -1) {
                    name = "Sys-" + name;
                }

                $query.find(".op .text").text(name);
            } else if (i === "start") {
                $statusDetail.find("." + i).find(".text").text(info[i].text);
                xcTooltip.add($statusDetail.find("." + i).find(".text"), {
                    title: info[i].tip
                });
            } else {
                $statusDetail.find("." + i).find(".text").text(info[i]);
            }
        }

        $query.removeClass("xc-hidden");
        if (status != null) {
            if (status === QueryStatus.RM) {
                $query.addClass("xc-hidden");
            } else {
                $query.removeClass(QueryStatus.Run)
                        .removeClass(QueryStatus.Done)
                        .removeClass(QueryStatus.Error)
                        .removeClass(QueryStatus.Cancel)
                        .addClass(status);
            }
        }

        if (reset) {
            $query.find(".progressBar").width(0);
        }
    }

    // enables or disbles the view output button
    function updateOutputSection(id: number, forceInactive?: boolean): void {
        const $focusOutputBtn: JQuery = $("#monitor-inspect");
        if (forceInactive) {
            $focusOutputBtn.addClass('btn-disabled');
            $queryDetail.find('.outputSection').find('.text')
                         .text(CommonTxtTstr.NA);
            return;
        }
        // do not update detail if not focused on this query bar
        if (!$queryList.find('.query[data-id="' + id + '"]').hasClass('active')) {
            return;
        }
        const mainQuery: XcQuery = queryLists[id];
        const queryState: string | number = mainQuery.getState();
        const dstTableState: string | number = mainQuery.getOutputTableState();

        if (queryState === QueryStatus.Done && mainQuery.getOutputTableName() &&
            sysQueryTypes.indexOf(mainQuery.getName()) === -1 &&
            noOutputs.indexOf(mainQuery.getName()) === -1) {
            const dstTableName: string = mainQuery.getOutputTableName();

            if (dstTableState === "active" || dstTableState === "exported" ||
             dstTableState === TableType.Undone) {
                if (dstTableState === "exported") {
                    $focusOutputBtn.addClass('btn-disabled');
                } else { // either active or undone
                    if (checkIfTableIsUndone(dstTableName)) {
                        mainQuery.outputTableState = TableType.Undone;
                        $focusOutputBtn.addClass('btn-disabled');
                    } else {
                        mainQuery.outputTableState = "active";
                        $focusOutputBtn.removeClass('btn-disabled');
                    }
                }
            } else {
                $focusOutputBtn.addClass('btn-disabled');
            }

            if (dstTableName.indexOf(gDSPrefix) < 0) {
                $queryDetail.find('.outputSection').find('.text')
                                               .text(dstTableName);
            } else {
                $queryDetail.find('.outputSection').find('.text')
                            .text(dstTableName.slice(gDSPrefix.length));
            }

        } else {
            $focusOutputBtn.addClass('btn-disabled');
            $queryDetail.find('.outputSection').find('.text')
                         .text(CommonTxtTstr.NA);
        }
    }

    function checkIfTableIsUndone(tableName: string): boolean {
        if (tableName.startsWith(gDSPrefix)) {
            return false;
        }

        const tableId: TableId = xcHelper.getTableId(tableName);
        if (gTables[tableId]) {
            return gTables[tableId].getType() === TableType.Undone;
        } else {
            return false;
        }
    }

    function operationCheck(subQuery: XcSubQuery, delay?: number): void {
        const id: number = subQuery.getId();
        if (!queryLists[id]) {
            console.error("error case");
            return;
        } else if (!$("#monitor-queries").hasClass("active") ||
                    !$('#monitorTab').hasClass('active')) {
            if (subQuery.getName() === "index from DS") {
                DSCart.addQuery(queryLists[id]);
            }
        }
        // only stop animation the first time, do not persist it
        const doNotAnimate: boolean = false;

        const startTime: number = Date.now();
        if (delay) {
            setTimeout(function() {
                operationCheckHelper(subQuery, id, subQuery.index, doNotAnimate)
                .then(function() {
                    const elapsedTime: number = Date.now() - startTime;
                    checkCycle(function() {
                        return operationCheckHelper(subQuery, id, subQuery.index,
                                                   doNotAnimate);
                    }, id, elapsedTime);
                });
            }, delay);
        } else {
            operationCheckHelper(subQuery, id, subQuery.index, doNotAnimate)
            .then(function() {
                const elapsedTime: number = Date.now() - startTime;
                checkCycle(function() {
                    return operationCheckHelper(subQuery, id, subQuery.index,
                                               doNotAnimate);
                }, id, elapsedTime);
            });
        }
    }

    function operationCheckHelper(
        subQuery: XcSubQuery,
        id: number,
        step: number,
        doNotAnimate: boolean
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (subQuery.state === QueryStatus.Done) {
            clearIntervalHelper(id);
            return PromiseHelper.reject();
        }

        subQuery.getProgress()
        .then(function(res) {
            if (!queryLists[id]) {
                clearIntervalHelper(id);
                return PromiseHelper.reject();
            }
            const mainQuery: XcQuery = queryLists[id];
            if (mainQuery.state === QueryStatus.Cancel ||
                mainQuery.state === QueryStatus.Done ||
                mainQuery.state === QueryStatus.Error) {
                clearIntervalHelper(id);
                return PromiseHelper.reject();
            }

            const currStep: number = mainQuery.currStep;
            // check for edge case where percentage is old
            // and mainQuery already incremented to the next step
            if (currStep !== step) {
                const numSteps: number = mainQuery.numSteps;
                const $query: JQuery = $queryList.find('.query[data-id="' + id + '"]');
                if (numSteps === -1) {
                    $query.find('.querySteps').text('step ' + (currStep + 1));
                } else if (currStep < numSteps) {
                    $query.find('.querySteps').text('step ' + (currStep + 1) +
                                                    ' of ' + numSteps);
                }
            } else {
                updateQueryBar(id, res, false, false, doNotAnimate);
            }

            mainQuery.setElapsedTime();
            updateStatusDetail({
                "start": getQueryTime(mainQuery.getTime()),
                "elapsed": xcHelper.getElapsedTimeStr(mainQuery.getElapsedTime(),
                                                      true, true),
                "opTime": xcHelper.getElapsedTimeStr(mainQuery.getOpTime(),
                                                      true),
                "total": xcHelper.getElapsedTimeStr(mainQuery.getElapsedTime(),
                                                    null, true),
            }, id);
            deferred.resolve();
        })
        .fail(function(error) {
            if (queryLists[id] && error &&
                error.status === StatusT.StatusDagNodeNotFound) {
                const mainQuery: XcQuery = queryLists[id];
                if (subQuery.name.indexOf("delete") > -1) {
                    clearIntervalHelper(id);
                    deferred.reject();
                } else {
                    if (mainQuery.state === QueryStatus.Cancel ||
                        mainQuery.state === QueryStatus.Done ||
                        mainQuery.state === QueryStatus.Error) {
                        clearIntervalHelper(id);
                        deferred.reject();
                    } else {
                        // could be that operation hasn't started yet, just keep
                        // trying
                        deferred.resolve();
                    }
                }
            } else {
                console.error("Check failed", error);
                clearIntervalHelper(id);
                deferred.reject();
            }
        });

        return deferred.promise();
    }

    function updateQueryBar(
        id: number,
        progress: string | number,
        isError?: boolean,
        isCanceled?: boolean,
        doNotAnimate?: boolean
    ): void {
        const $query: JQuery = $queryList.find('.query[data-id="' + id + '"]');
        if (progress == null && !isCanceled) {
            $query.removeClass("processing");
        }
        if ($query.hasClass("done") && !doNotAnimate) {
            return;
        }
        const mainQuery: XcQuery = queryLists[id];
        const currStep: number = mainQuery.currStep;
        const numSteps: number = mainQuery.numSteps;

        const $progressBar: JQuery = $query.find(".progressBar");
        let $extraProgressBar: JQuery = null;
        let $extraStepText: JQuery = null;
        if ($query.hasClass("active")) {
            $extraProgressBar = $queryDetail.find(".progressBar");
            $extraStepText = $queryDetail.find(".querySteps");
            if (mainQuery.cancelable) {
                $queryDetail.find('.cancelIcon').removeClass('xc-disabled');
            } else {
                $queryDetail.find('.cancelIcon').addClass('xc-disabled');
            }
        }

        let newClass: string = null;
        progress = Math.min(Math.max(parseFloat(progress + ""), 0), 100);
        if (progress >= 100 && ((numSteps > 0 && currStep >= numSteps) ||
            (mainQuery.state === QueryStatus.Done))) {
            progress = "100%";
            newClass = "done";
            $query.find('.cancelIcon').addClass('disabled');
        } else if (isError) {
            progress = "0%";
            newClass = QueryStatus.Error;
        } else if (isCanceled) {
            progress = "0%";
            newClass = QueryStatus.Cancel;
        } else {
            progress = progress + "%";
        }

        const $lockIcon: JQuery = $('.lockedTableIcon[data-txid="' + id + '"]');
        const progressCircles: ProgressCircle[] = [];
        if ($lockIcon.length) {
            $lockIcon.each(function() {
                progressCircles.push($(this).data("progresscircle"));
            });
        }

        // set width to 0 if new step is started unless it's past the last step
        if (parseInt($progressBar.data('step')) !== currStep &&
            currStep !== numSteps) {
            $progressBar.data('step', currStep);
            if (!$query.hasClass("done")) {
                $progressBar.stop().width(0).data('step', currStep);

                for (let i = 0; i < progressCircles.length; i++) {
                    progressCircles[i].update(0, 0);
                }
                if ($extraProgressBar != null) {
                    $extraProgressBar.stop().width(0);
                }
            }
        }

        // .stop() stops any previous animation;
        if (isCanceled || isError) {
            $progressBar.stop().width(progress);
            for (let i = 0; i < progressCircles.length; i++) {
                progressCircles[i].update(parseInt(progress), 0);
            }
        } else {
            $progressBar.stop().animate({"width": progress}, checkInterval,
                                        "linear", progressBarContinuation);
            for (let i = 0; i < progressCircles.length; i++) {
                progressCircles[i].update(parseInt(progress), checkInterval);
            }
        }

        progressBarContinuation();

        if ($extraProgressBar != null) {
            if (doNotAnimate) {
                if (isCanceled) {
                    $extraProgressBar.stop().width(progress);
                } else {
                    let prevProgress: number = 100 * $progressBar.width() /
                                             $progressBar.parent().width();
                    prevProgress = prevProgress || 0; // in case of NaN 0/0
                    // set extraProgressBar's to match progressBar's width
                    // and then animate extraProgressBar to it's actual pct
                    $extraProgressBar.stop().width(prevProgress + '%')
                                      .animate({"width": progress},
                                            checkInterval, "linear",
                                            progressBarContinuation);
                }
            } else {
                $extraProgressBar.stop().animate({"width": progress},
                                                 checkInterval,
                                                 "linear",
                                                 extraProgressBarContinuation);
            }
            extraProgressBarContinuation();
        }

        updateQueryStepsDisplay(mainQuery, $query, newClass, $extraStepText);

        function progressBarContinuation() {
            if (newClass != null) {
                $query.removeClass("processing").addClass(newClass);
                if (newClass === "done") {
                    $query.find('.querySteps').text(StatusMessageTStr.Completed);
                    clearIntervalHelper(id);
                }
            }
        }

        function extraProgressBarContinuation() {
            if (newClass != null && $query.hasClass("active")) {
                $queryDetail.find(".query").removeClass("processing")
                            .addClass(newClass);
            }
        }
    }

    // $extraStepText -> the main panel $queryDetail.find(".querySteps");
    function updateQueryStepsDisplay(
        mainQuery: XcQuery,
        $query: JQuery,
        newClass: string,
        $extraStepText: JQuery
    ): void {
        let displayedStep: number;
        let stepText: string;
        // if query stopped in some way or another
        if (newClass !== null) {
            if (newClass === QueryStatus.Done ||
                newClass === QueryStatus.Cancel ||
                newClass === QueryStatus.Error) {
                if (newClass === QueryStatus.Done) {
                    $query.find('.querySteps').text(StatusMessageTStr.Completed);
                } else {
                    newClass = xcHelper.capitalize(newClass);
                    $query.find('.querySteps').text(newClass);
                }
            }
        } else if (mainQuery.currStep <= mainQuery.numSteps) {
            // in progress and if total number of steps IS known
            displayedStep = Math.min(mainQuery.currStep + 1,
                                     mainQuery.numSteps);
            stepText = 'step ' + displayedStep + ' of ' +
                                            mainQuery.numSteps;
        } else if (mainQuery.numSteps === -1) {
            // in progress and if total number of steps is NOT known
            displayedStep = Math.min(mainQuery.currStep + 1,
                                     mainQuery.subQueries.length);
            if (displayedStep > 0) {
                stepText = 'step ' + displayedStep;
            }
        }
        if (stepText) {
            $query.find('.querySteps').text(stepText);
            if ($extraStepText) {
                $extraStepText.text(stepText);
            }
        } else if ($extraStepText) {
            $extraStepText.text("");
        }
    }

    function getQueryTime(time: number): TimeObj {
        const momTime: moment.Moment = moment(time);
        const timeObj: TimeObj = {
            text: momTime.calendar(),
            tip: momTime.format("h:mm:ss A M-D-Y")
        };
        return timeObj;
    }

    function addEventHandlers(): void {
        const $querySideBar: JQuery = $("#monitorMenu-query");

        $querySideBar.on("click", ".filterSection .xc-action", function() {
            filterQuery($(this));
        });

        $querySideBar.find(".bulkOptionsSection").click(function(event) {
            if (!$(event.target).closest('.bulkOptions').length) {
                if ($querySideBar.hasClass("bulkOptionsOpen")) {
                    $querySideBar.removeClass("bulkOptionsOpen");
                    $queryList.find(".checkbox").removeClass("checked");
                } else {
                    $querySideBar.addClass("bulkOptionsOpen");
                    $queryList.find(".checkbox").filter(function() {
                        return !$(this).closest(".processing").length &&
                            $(this).is(":visible");
                    }).addClass("checked");
                    xcTooltip.hideAll();
                }
            }
        });

        $queryList.on("click", ".checkbox", function() {
            const $checkbox: JQuery = $(this);
            if ($checkbox.hasClass("checked")) {
                $checkbox.removeClass("checked");
            } else {
                $checkbox.addClass("checked");
            }
        });

        $queryList.on("click", ".query", function(event) {
            const $clickTarget: JQuery = $(event.target);
            const id: number = $clickTarget.closest('.query').data('id');

            if ($clickTarget.hasClass('deleteIcon')) {
                QueryManager.removeQuery(id, true);
            } else if ($clickTarget.hasClass('cancelIcon')) {
                const mainQuery: XcQuery = queryLists[id];
                let qName: string;
                if (mainQuery) {
                    qName = mainQuery.name;
                }
                // special handling for canceling importDataSource
                if (qName === SQLOps.DSPoint) {
                    QueryManager.cancelDS(id);
                } else if (qName === SQLOps.Retina) {
                    QueryManager.cancelDF(id);
                } else {
                    QueryManager.cancelQuery(id);
                }
            } else if (!$clickTarget.closest(".checkbox").length) {
                focusOnQuery($(this));
            }
        });

        $queryDetail.on("click", ".cancelIcon", function() {
            $queryList.find(".query.active .cancelIcon").click();
        });

        $queryDetail.on("click", ".deleteIcon", function() {
            $queryList.find(".query.active .deleteIcon").click();
        });

        $("#monitor-inspect").on('click', function() {
            focusOnOutput();
        });

        bulkOptions();

        function focusOnOutput(): void {
            const queryId: number = parseInt($queryList.find('.query.active').data('id'));
            const mainQuery: XcQuery = queryLists[queryId];
            const tableName: string = mainQuery.getOutputTableName();

            if (!tableName) {
                let type: string;
                if (mainQuery.getName() === SQLOps.DSPoint) {
                    type = "dataset";
                } else {
                    type = "table";
                }
                focusOutputErrorHandler(type, mainQuery);
                return;
            }

            if (tableName.indexOf(gDSPrefix) > -1) {
                const dsId: string = tableName.slice(gDSPrefix.length);
                let $grid: JQuery = DS.getGrid(dsId);
                if ($grid.length) {
                    focusOnDSGrid($grid, dsId);
                } else {
                    DS.restore(DS.getHomeDir(true))
                    .then(function() {
                        $grid = DS.getGrid(dsId);
                        if ($grid.length) {
                            focusOnDSGrid($grid, dsId);
                        } else {
                            focusOutputErrorHandler('dataset', mainQuery);
                        }
                    })
                    .fail(function() {
                        focusOutputErrorHandler('dataset', mainQuery);
                    });
                }
                return;
            }

            const tableId: TableId = xcHelper.getTableId(tableName);

            if (tableId == null) {
                focusOutputErrorHandler('output', mainQuery);
                return;
            }

            TblManager.findAndFocusTable(tableName)
            .fail(function(res) {
                if (res && typeof res === "object") {
                    focusOutputErrorHandler('table', mainQuery, res.tableType);
                }
            });
        }

        function focusOnDSGrid($grid: JQuery, dsId: number | string): void {
            // switch to correct panels
            const $datastoreTab: JQuery = $("#dataStoresTab");
            if (!$datastoreTab.hasClass("active")) {
                $datastoreTab.click();
            }

            if (!$datastoreTab.hasClass("mainMenuOpen")) {
                $datastoreTab.find(".mainTab").click();
            }

            const $inButton: JQuery = $("#inButton");
            if (!$inButton.hasClass("active")) {
                $inButton.click();
            }

            const folderId: string = DS.getDSObj(dsId).parentId;
            DS.goToDir(folderId);
            DS.focusOn($grid);
        }

        function focusOutputErrorHandler(
            type: string,
            mainQuery: XcQuery,
            status?: string
        ): void {
            const typeUpper: string = type[0].toUpperCase() + type.slice(1);
            const title: string = xcHelper.replaceMsg(ErrWRepTStr.OutputNotFound, {
                "name": typeUpper
            });
            let desc: string;
            if (type === "output") {
                desc =ErrTStr.OutputNotFoundMsg;
            } else {
                desc = xcHelper.replaceMsg(ErrWRepTStr.OutputNotExists, {
                    "name": typeUpper
                });
            }

            Alert.error(title, desc);
            if (status) {
                mainQuery.outputTableState = status;
            } else {
                mainQuery.outputTableState = 'deleted';
            }

            $('#monitor-inspect').addClass('btn-disabled');
            $queryDetail.find('.outputSection').find('.text')
                                               .text(CommonTxtTstr.NA);
        }

        function bulkOptions(): void {
            $querySideBar.find(".bulkOptions").on("click", "li", function() {
                const action: string = $(this).data('action');

                switch (action) {
                    case ("deleteAll"):
                        const ids: number[] = [];
                        $queryList.find(".checkbox.checked").each(function() {
                            const id: number = $(this).closest(".query").data("id");
                            ids.push(id);
                        });
                        QueryManager.removeQuery(ids, true);
                        $querySideBar.removeClass("bulkOptionsOpen");
                        break;
                    case ("clearAll"):
                        $queryList.find(".checkbox.checked")
                                  .removeClass("checked");
                        break;
                    case ("selectAll"):
                        $queryList.find(".checkbox").filter(function() {
                            return !$(this).closest(".processing").length &&
                                $(this).is(":visible");
                        }).addClass("checked");
                        break;
                    default:
                        break;
                }
            });
        }
    }

    function querySqlSorter(a, b): number {
        if (a.time > b.time) {
            return 1;
        } else if (a.time < b.time) {
            return -1;
        } else {
            if (a.sqlNum > b.sqlNum) {
                return 1;
            } else {
                return -1;
            }
        }
    }

    function filterQuery($el: JQuery): void {
        if ($el.hasClass("active")) {
            return;
        }

        $el.addClass("active").siblings().removeClass("active");
        const $queries: JQuery = $queryList.find(".query").addClass("xc-hidden");
        if ($el.hasClass("error")) {
            $queryList.find(".query.error").removeClass("xc-hidden");
        } else if ($el.hasClass("processing")) {
            $queryList.find(".query.processing").removeClass("xc-hidden");
        } else if ($el.hasClass("done")) {
            $queryList.find(".query.done").removeClass("xc-hidden");
        } else {
            $queries.removeClass("xc-hidden");
        }
        QueryManager.scrollToFocused();
    }

    function getQueryHTML(xcQuery: XcQuery, restored?: boolean): string {
        const id: number = xcQuery.getId();
        const time: number = xcQuery.getTime();
        const dateObj : TimeObj = getQueryTime(time);
        const cancelClass: string = xcQuery.cancelable ? "" : " disabled";
        let statusClass: string | number = "";
        let pct: number;
        let step: string = "";
        const originalName: string = xcQuery.getName();
        let name: string = originalName;
        let tooltip: string = "";
        if (sysQueryTypes.indexOf(name) > -1) {
            name = "Sys-" + name;
            tooltip = TooltipTStr.SysOperation;
        }
        if (restored) {
            statusClass = xcQuery.state;
            if (xcQuery.state === QueryStatus.Done) {
                step = "completed";
                pct = 100;
            } else if (xcQuery.state === QueryStatus.Cancel) {
                step = QueryStatus.Cancel;
                pct = 0;
            } else if (xcQuery.state === QueryStatus.Error) {
                step = QueryStatus.Error;
                pct = 0;
            }
        } else {
            statusClass = "processing";
            pct = 0;
            step = "";
        }
        if (sysQueryTypes.indexOf(originalName) > -1) {
            statusClass += " sysType";
        }
        const html: string =
            '<div class="xc-query query no-selection ' + statusClass +
            '" data-id="' + id + '">' +
                '<div class="queryInfo">' +
                    '<div class="leftPart">' +
                        '<i class="icon queryIcon processing xi-progress"></i>' +
                        '<i class="icon queryIcon error xi-error"></i>' +
                        '<i class="icon queryIcon done xi-success"></i>' +
                    '</div>' +
                    '<div class="middlePart name" data-original-title="' +
                        tooltip + '" data-toggle="tooltip" ' +
                        'data-placement="top" data-container="body">' +
                        name +
                    '</div>' +
                    '<div class="rightPart">' +
                        '<i class="icon xi-trash xc-action deleteIcon" ' +
                        'data-container="body" data-toggle="tooltip" ' +
                        'title="' + TooltipTStr.RemoveQuery + '"></i>' +
                        '<i class="icon xi-cancel xc-action cancelIcon ' +
                        cancelClass + '" ' +
                        'data-container="body" data-toggle="tooltip" ' +
                        'title="' + TooltipTStr.CancelQuery + '"></i>' +
                        '<div class="checkbox">' +
                          '<i class="icon xi-ckbox-empty fa-13"></i>' +
                          '<i class="icon xi-ckbox-selected fa-13"></i>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="queryInfo">' +
                    '<div class="middlePart date" data-toggle="tooltip" ' +
                    'data-container="body" data-placement="top" ' +
                    'data-original-title="' + dateObj.tip + '">' +
                        CommonTxtTstr.StartTime + ": " + dateObj.text +
                    '</div>' +
                    '<div class="rightPart querySteps">' + step + '</div>' +
                '</div>' +
                '<div class="queryProgress">' +
                    '<div class="progressBar" style="width:' + pct +
                        '%" data-step="0"></div>' +
                '</div>' +
            '</div>';
        return html;
    }

    // XXX can some of the src tables be simultaneously used by another operation
    // and need to remain locked?
    function unlockSrcTables(mainQuery: XcQuery): void {
        const srcTables: object = {};

        // check original source tables
        if (mainQuery.srcTables) {
            for (let i = 0; i < mainQuery.srcTables.length; i++) {
                srcTables[mainQuery.srcTables[i]] = true;
            }
        }

        // scan query strings for other source tables in case they were missed
        const queryStr: string = mainQuery.getQuery();
        if (queryStr) {
            const queries: xcHelper.QueryParser[] = xcHelper.parseQuery(queryStr);
            for (let i = 0; i < queries.length; i++) {
                if (queries[i].srcTables) {
                    for (let j = 0; j < queries[i].srcTables.length; j++) {
                        srcTables[queries[i].srcTables[j]] = true;
                    }
                }
            }
        }

        let tableId: TableId;
        for (const table in srcTables) {
            tableId = xcHelper.getTableId(table);
            if (tableId) {
                xcHelper.unlockTable(tableId);
            }
        }
    }

    function tableListCanceled(mainQuery: XcQuery): void {
        const queryStr: string = mainQuery.getQuery();
        const queries: xcHelper.QueryParser[] = xcHelper.parseQuery(queryStr);
        const numQueries: number = queries.length;
        for (let i = 0; i < numQueries; i++) {
            if (queries[i].dstTable) {
                if (queries[i].dstTable.indexOf(gDSPrefix) === -1) {
                    TableList.addToCanceledList(queries[i].dstTable);
                }
            }
        }
    }

    function clearTableListCanceled(mainQuery: XcQuery): void {
        const queryStr: string = mainQuery.getQuery();
        const queries: xcHelper.QueryParser[] = xcHelper.parseQuery(queryStr);
        const numQueries: number = queries.length;
        for (let i = 0; i < numQueries; i++) {
            if (queries[i].dstTable) {
                if (queries[i].dstTable.indexOf(gDSPrefix) === -1) {
                    TableList.removeFromCanceledList(queries[i].dstTable);
                }
            }
        }
    }

    // drops all the tables generated, even the intermediate tables
    // or drops dataset if importDataSource operation
    function dropCanceledTables(
        mainQuery: XcQuery,
        onlyFinishedTables: boolean
    ): void {
        const queryStr: string = mainQuery.getQuery();
        const queries: xcHelper.QueryParser[] = xcHelper.parseQuery(queryStr);
        const dstTables: string[] = [];
        const dstDatasets: string[] = [];
        let numQueries: number;
        if (onlyFinishedTables) {
            numQueries = mainQuery.currStep;
        } else {
            numQueries = queries.length;
        }

        let dstTable: string;
        for (let i = 0; i < numQueries; i++) {
            dstTable = queries[i].dstTable;
            if (dstTable) {
                if (dstTable.indexOf(gRetSign) > -1) {
                    continue;// ignore ret:tableName tables
                }
                if (dstTable.indexOf(gDSPrefix) > -1) {
                    dstDatasets.push(dstTable);
                } else {
                    dstTables.push(dstTable);
                }
            }
        }
        let tableId: TableId;
        const orphanListTables: string[] = [];
        const backendTables: string[] = [];
        for (let i = 0; i < dstTables.length; i++) {
            tableId = xcHelper.getTableId(dstTables[i]);
            if (gTables[tableId]) {
                if (gTables[tableId].getType() === TableType.Orphan) {
                    orphanListTables.push(dstTables[i]);
                }
            } else {
                backendTables.push(dstTables[i]);
            }
        }
        // delete tables that are in the orphaned list
        if (orphanListTables.length) {

            TblManager.deleteTables(orphanListTables, TableType.Orphan,
                                    true, true);
        }

        // delete tables not found in gTables
        for (let i = 0; i < backendTables.length; i++) {
            const tableName: string = backendTables[i];
            deleteTableHelper(tableName);
        }

        for (let i = 0; i < dstDatasets.length; i++) {
            deleteDatasetHelper(dstDatasets[i]);
        }
    }

    function deleteTableHelper(tableName: string): void {
        XcalarDeleteTable(tableName)
        .then(function() {
            // in case any tables are in the orphaned list
            TableList.removeTable(tableName, TableType.Orphan);
        });
    }

    function deleteDatasetHelper(dsName: string): void {
        dsName = dsName.slice(gDSPrefix.length);
        XcalarDestroyDataset(dsName, null);
    }

    function clearIntervalHelper(id: number): void {
        clearTimeout(queryCheckList[id]);
        delete queryCheckList[id];
    }

    function setDisplayToDefault(): void {
        updateQueryTextDisplay("", true);
        updateStatusDetail({
            "start": CommonTxtTstr.NA,
            "elapsed": CommonTxtTstr.NA,
            "opTime": CommonTxtTstr.NA,
            "total": CommonTxtTstr.NA,
        }, null, QueryStatus.RM);
        updateOutputSection(null, true);
    }

    export let __testOnly__: any = {};

    if (typeof window !== 'undefined' && window['unitTestMode']) {
        __testOnly__.queryLists = queryLists;
        __testOnly__.queryCheckLists = queryCheckList;
        __testOnly__.canceledQueries = canceledQueries;
        __testOnly__.unlockSrcTables = unlockSrcTables;
    }
}
