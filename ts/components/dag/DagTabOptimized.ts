class DagTabOptimized extends DagTab {
    public static readonly PATH = "Optimized Dataflows(SDK Use Only)/";
    public static readonly retinaCheckInterval = 2000;
    protected _dagGraph: DagSubGraph;
    private _isDoneExecuting: boolean;
    private _isFocused: boolean;
    private _isDeleted: boolean;
    private _queryCheckId: number;
    private _retinaName: string;
    private _hasQueryStateGraph: boolean;
    private _executor: DagGraphExecutor;
    private _inProgress: boolean; // will be true if tab is created when executeRetina
    // is called. If this flag is true, we don't stop checking progress until
    // executeRetina turns it off

    constructor(options: {
        id: string,
        name: string,
        queryNodes?: any[],
        executor?: DagGraphExecutor
    }) {
        const {id, name, queryNodes, executor} = options;
        super(name, id, null);
        this._isDoneExecuting = false;
        this._isFocused = false;
        this._queryCheckId = 0;
        this._hasQueryStateGraph = false;
        if (queryNodes) {
            const graph = this._constructGraphFromQuery(queryNodes);
            graph.startExecution(queryNodes, executor);
            this._executor = executor;
            this._inProgress = true;
        } else {
            this._inProgress = false;
        }
        if (this._id.startsWith(gRetinaPrefix)) {
            this._retinaName = this._id;
        } else {
            this._retinaName = this._name;
        }
    }

    public getPath(): string {
        return DagTabOptimized.PATH + this.getName();
    }

    /**
     * Do not save this Tab in the kvStore
     */
    public save(): XDPromise<void> {
        return PromiseHelper.resolve();
    }
    /**
     * gets the DagGraph for this tab
     * @returns {DagGraph}
     */
    public getGraph(): DagSubGraph {
        return this._dagGraph;
    }

    public load(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._isDoneExecuting = false;

        XcalarGetRetinaJson(this._retinaName)
        .then((retina) => {
            this._dagGraph = this._constructGraphFromQuery(retina.query);
            this._dagGraph.startExecution(retina.query, null);
            this.setGraph(this._dagGraph);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // do nothing
    public discardUnsavedChange(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    // do nothing
    public download(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    // do nothing
    public upload(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    public focus() {
        if (this._isFocused) {
            return;
        }
        this._isFocused = true;
        if (this._isDoneExecuting) {
            return;
        }
        this._statusCheckInterval(true);
    }

    public unfocus() {
        this._queryCheckId++;
        this._isFocused = false;
    }

    public isFocused() {
        return this._isFocused;
    }

    public delete(): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        this._isDoneExecuting = false;
        this._isFocused = false;
        this._isDeleted = true;
        this._queryCheckId++;

        XcalarDeleteRetina(this._retinaName)
        .then(deferred.resolve)
        .fail((error) => {
            this._isDeleted = false;
            deferred.reject(error);
        });

        return deferred.promise();
    }

    public endStatusCheck(): XDPromise<any> {
        this._inProgress = false;
        return this._getAndUpdateRetinaStatuses();
    }

    private _constructGraphFromQuery(queryNodes: any[]): DagSubGraph {
        const nameIdMap = {};
        const idToNamesMap = {};
        const retStruct = DagGraph.convertQueryToDataflowGraph(queryNodes);
        const nodeJsons = retStruct.dagInfoList;
        const nodeInfos = [];
        nodeJsons.forEach((nodeJson) => {
            idToNamesMap[nodeJson.id] = [];
            nameIdMap[nodeJson.table] = nodeJson.id;
            if (nodeJson.subGraphNodes) {
                // map the index nodes to the containing dagNodeId
                nodeJson.subGraphNodes.forEach((subGraphNodeJson) => {
                    nameIdMap[subGraphNodeJson.table] = nodeJson.id;
                    idToNamesMap[nodeJson.id].push(subGraphNodeJson.table);
                });
            }

            idToNamesMap[nodeJson.id].push(nodeJson.table);
            nodeInfos.push({
                node: DagNodeFactory.create(nodeJson),
                parents: nodeJson.parents
            });
        });
        const comments: CommentInfo[] = [];
        const graphInfo = {
            comments: comments,
            display: <Dimensions>{scale: 1},
            nodes: nodeInfos,
            operationTime: null
        };

        const graph: DagSubGraph = new DagSubGraph(retStruct.tableNewDagIdMap, retStruct.dagIdToTableNamesMap);
        graph.rebuildGraph(graphInfo);
        graph.initializeProgress();
        this._dagGraph = graph;
        const positionInfo = DagView.getAutoAlignPositions(this._dagGraph);
        positionInfo.nodeInfos.forEach((nodeInfo) => {
            graph.moveNode(nodeInfo.id, {
                x: nodeInfo.position.x + 100,
                y: nodeInfo.position.y + 100,
            });
        });
        graph.setDimensions(positionInfo.maxX + DagView.horzPadding + 100,
                            positionInfo.maxY + DagView.vertPadding + 100);

        return graph;
    }

    private _statusCheckInterval(firstRun?: boolean): void {
        // shorter timeout on the first call
        let checkTime = firstRun ? 0 : DagTabOptimized.retinaCheckInterval;
        const checkId = this._queryCheckId
        setTimeout(() => {
            if (this._isDoneExecuting || !this._isFocused || this._isDeleted ||
                checkId !== this._queryCheckId) {
                return; // retina is finished or unfocused, no more checking
            }

            this._getAndUpdateRetinaStatuses()
            .always((_ret) => {
                if (this._isDoneExecuting || !this._isFocused || this._isDeleted) {
                    return; // retina is finished or unfocused, no more checking
                }

                this._statusCheckInterval();
            });

        }, checkTime);
    }

    private _getAndUpdateRetinaStatuses(): XDPromise<any> {
        const deferred = PromiseHelper.deferred();

        const checkId = this._queryCheckId;
        XcalarQueryState(this._retinaName)
        .then((queryStateOutput) => {
            if (this._isDeleted) {
                return deferred.reject();
            }
            if (!this._hasQueryStateGraph) {
                // change the graph from the xcalarGetRetina graph to the
                // xcalarQueryState graph
                this._hasQueryStateGraph = true;
                this._rerenderQueryStateGraph(queryStateOutput);
            }
            if (checkId !== this._queryCheckId) {
                return deferred.reject();
            }
            this._isDoneExecuting = queryStateOutput.queryState !== QueryStateT.qrProcessing;
            if (this._isDoneExecuting) {
                this._inProgress = false;
                DagViewManager.Instance.endOptimizedDFProgress(this._id, queryStateOutput);
                this._dagGraph.setExecutor(null);
                if (this._isFocused) {
                    DagTopBar.Instance.setState(this);
                }
            } else {
                if (!this._dagGraph.getExecutor()) {
                    this._dagGraph.setExecutor(new DagGraphExecutor(null, this._dagGraph, {
                        optimized: true,
                        retinaName: this._retinaName
                    }));
                    if (this._isFocused) {
                        DagTopBar.Instance.setState(this);
                    }
                }
                DagViewManager.Instance.updateOptimizedDFProgress(this._id, queryStateOutput);
            }
            deferred.resolve(queryStateOutput);
        })
        .fail((error) => {
            if (this._inProgress && error.status === StatusT.StatusQrQueryNotExist) {
                // ok to fail if query doesn't exist yet
                deferred.resolve();
            } else {
                this._isDoneExecuting = true;
                this._dagGraph.stopExecution();
                if (this._isFocused) {
                    DagTopBar.Instance.setState(this);
                }
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    // change the graph from the xcalarGetRetina graph to the
    // xcalarQueryState graph
    private _rerenderQueryStateGraph(queryStateOutput) {
        DagViewManager.Instance.cleanupClosedTab(this._dagGraph);
        this._dagGraph = this._constructGraphFromQuery(queryStateOutput.queryGraph.node);
        this._dagGraph.startExecution(queryStateOutput.queryGraph.node, null);
        this.setGraph(this._dagGraph);
        this._trigger("rerender");
    }
}