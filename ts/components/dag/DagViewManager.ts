class DagViewManager {
    private containerSelector: string = "#dagView";
    private $dagView: JQuery;
    private $dfWrap: JQuery;
    private activeDag: DagGraph;
    private activeDagTab: DagTab;

    private isSqlPreview = false;
    private activeDagView: DagView;
    private dagViewMap: Map<string, DagView>;

    private static _instance: DagViewManager;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    constructor() {}

    public setup(): void {
        this.$dagView = $("#dagView");
        this.$dfWrap = this.$dagView.find(".dataflowWrap");

        DagView.setup();

        this.activeDag = null;
        this.activeDagTab = null;
        this.activeDagView = null;
        this.dagViewMap = new Map();

        this._addEventListeners();
        this._addDagViewListeners();
        this._setupDagSharedActionEvents();
        // this._setupMode();

        DagTopBar.Instance.setup();
        DagCategoryBar.Instance.setup();
        DagCategoryBar.Instance.loadCategories(); // Async call
        DagNodeMenu.setup();
        DagComment.Instance.setup();
        DagParamManager.Instance.setup();

        if (UserSettings.getPref("dfProgressTips")) {
            this.toggleProgressTips(true);
        }
        if (UserSettings.getPref("dfConfigInfo")) {
            this.toogleConfigInfo(true);
        }
    }

    /**
     * Called when dag panel becomes visible, listeners that are removed when
     * panel closes.
     */
    public show(): void {
        const self = this;
        this.toggleSqlPreview(false);
        $("#container").addClass("activePanel-modelingDagPanel");
        DagCategoryBar.Instance.showOrHideArrows();

        const $activeDfArea = this.$dfWrap.find(".dataflowArea.active");
        if ($activeDfArea.length) {
            const tabId = $activeDfArea.data("id");
            if (this.dagViewMap.has(tabId)) {
                this.activeDagView = this.dagViewMap.get(tabId);
                this.activeDag = this.activeDagView.getGraph();
                this.activeDagTab = this.activeDagView.getTab();
            }
        }
        if (this.activeDagView) {
            this.activeDagView.focus();
        }

        let resizeTimer;
        $(window).on("resize.dagViewResize", function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                DagCategoryBar.Instance.showOrHideArrows();
            }, 300);
        });

        $(document).on("copy.dataflowPanel", function (e) {
            if (!self.activeDagView) {
                return;
            }
            if ($(e.target).is("body")) {
                // proceed
            } if ($(e.target).is(".xcClipboardArea")) {
                return;
            } else if (window.getSelection().toString().length &&
                window.getSelection().toString() !== " ") {
                // if an actual target is selected,
                // then let the natural event occur
                return;
            }

            const nodesStr = self.copyNodes(self.getSelectedNodeIds(true, true));
            e.originalEvent.clipboardData.setData("text/plain", nodesStr);
            e.preventDefault(); // default behaviour is to copy any selected text
        });

        $(document).on("cut.dataflowPanel", function (e) {
            if (!self.activeDagView) {
                return;
            }
            if (self.isDisableActions()) {
                return;
            }
            if ($(e.target).is("body")) {
                // proceed
            } if ($(e.target).is(".xcClipboardArea")) {
                return;
            } else if (window.getSelection().toString().length &&
                window.getSelection().toString() !== " ") {
                // if an actual target is selected,
                // then let the natural event occur
                return;
            }

            const nodesStr = self.cutNodes(self.getSelectedNodeIds(true, true));
            e.originalEvent.clipboardData.setData("text/plain", nodesStr);
            e.preventDefault(); // default behaviour is to copy any selected text
        });

        $(document).on("paste.dataflowPanel", function (e: JQueryEventObject) {
            if (!self.activeDagView) {
                return;
            }
            if (self.isDisableActions()) {
                return;
            }
            if ($(e.target).is("input") || $(e.target).is("textarea")) {
                return; // use default paste event
            }
            let content = e.originalEvent.clipboardData.getData('text/plain');
            self.activeDagView.validateAndPaste(content);
        });

        $(document).on("keydown.dataflowPanel", function (e: JQueryEventObject) {
            if (self.activeDag == null ||
                self.activeDag.isLocked() ||
                $("#container").hasClass("formOpen") ||
                $("input:focus").length || $("textarea:focus").length ||
                $('[contentEditable="true"]').length
            ) {
                return;
            }
            switch (e.which) {
                case (keyCode.Backspace):
                case (keyCode.Delete):
                    if (self.isDisableActions()) {
                        break;
                    }
                    DagNodeMenu.close();
                    self.activeDagView.removeNodes(self.activeDagView.getSelectedNodeIds(true, true));
                    break;
                case (keyCode.Y):
                case (keyCode.Z):
                    checkUndoRedo(e);
                    break;
                default:
                    break;
            }
        });

        function checkUndoRedo(event: JQueryEventObject): void {
            if (!(isSystemMac && event.metaKey) &&
                !(!isSystemMac && event.ctrlKey)) {
                return;
            }
            if (FormHelper.activeForm ||
                !$('#modelingDagPanel').hasClass('active') ||
                $('#container').hasClass('columnPicker') ||
                $('.modalContainer:not(#aboutModal):visible').length ||
                $('textarea:focus').length ||
                $('input:focus').length
            ) {
                return;
            }

            event.preventDefault();
            xcMenu.close();
            // TblManager.unHighlightCells();

            if (event.which === keyCode.Y ||
                (event.which === keyCode.Z && event.shiftKey)) {
                if ($("#redo").hasClass("disabled")) {
                    Log.repeat();
                } else {
                    $('#redo').click();
                }
            } else if (event.which === keyCode.Z) {
                $('#undo').click();
            }
        }
    }

    /**
     * Called when navigating away from dag panel
     */
    public hide(): void {
        $(window).off(".dagViewResize");
        $(document).off(".dataflowPanel");
        $("#container").removeClass("activePanel-modelingDagPanel");
        if (this.activeDagView) {
            this.activeDagView.unfocus();
        }
    }

     /**
     * Returns the current activeDag
     * @returns {DagGraph}
     */
    public getActiveDag(): DagGraph {
        return this.activeDag;
    }

    public getActiveTab(): DagTab {
        return this.activeDagTab;
    }

    public getAreaByTab(tabId: string): JQuery {
        return this._getAreaByTab(tabId);
    }


    public getActiveArea(): JQuery {
        return this._getActiveArea();
    }

    public focusOnNode(nodeId: DagNodeId, tabId: string): XDPromise<JQuery> {
        const deferred: XDDeferred<JQuery> = PromiseHelper.deferred();

        let dagTab: DagTab = DagList.Instance.getDagTabById(tabId);
        if (dagTab == null){
            return PromiseHelper.reject();
        }
        DagTabManager.Instance.loadTab(dagTab)
        .then(() => {
            const $node: JQuery = DagViewManager.Instance.getNode(nodeId);
            $node.length ? deferred.resolve($node) : deferred.reject();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public addDataflowHTML($container: JQuery, tabId: string, isViewOnly?: boolean, isProgressGraph?: boolean) {
        $container.append(
            '<div class="dataflowArea ' +  (isViewOnly? 'viewOnly': '') + ' ' +
                (isProgressGraph? 'progressGraph': '') + '" data-id="' +tabId + '">\
                <div class="dataflowAreaWrapper">\
                    <div class="commentArea"></div>\
                    <svg class="edgeSvg"></svg>\
                    <svg class="operatorSvg"></svg>\
                </div>\
            </div>'
        );
    }

    /**
     * DagView.getNode
     * @param nodeId
     * @param tabId?
     * @param $dataflowArea?
     * returns $(".operator") element
     */
    public getNode(
        nodeId: DagNodeId,
        tabId?: string,
        $dataflowArea?: JQuery
    ): JQuery {
        if (tabId) {
            $dataflowArea = this._getAreaByTab(tabId);
        }
        $dataflowArea = $dataflowArea || this._getActiveArea();
        return $dataflowArea.find('.operator[data-nodeid="' + nodeId + '"]');
    }

        /**
     * DagView.viewResult
     * @param dagNodeId
     */
    public viewResult(dagNode: DagNode, tabId?: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        try {
            if (dagNode instanceof DagNodeJupyter) {
                dagNode.showJupyterNotebook();
                deferred.resolve();
            } else if (dagNode instanceof DagNodeAggregate) {
                this._viewAgg(dagNode);
                deferred.resolve();
            } else {
                // all other nodes
                tabId = tabId || this.activeDagTab.getId();
                DagTable.Instance.previewTable(tabId, dagNode)
                    .then(deferred.resolve)
                    .fail((error) => {
                        Alert.error(AlertTStr.Error, error);
                        deferred.reject(error);
                    });
            }
        } catch (e) {
            console.error(e);
            Alert.error(AlertTStr.Error, ErrTStr.Unknown);
            deferred.reject(e);
        }

        return deferred.promise();
    }

    /**
     * DagViewManager.Instance.removeProgress
     * @param nodeId
     * @param tabId
     */
    public removeProgress(nodeId: DagNodeId, tabId: string): void {
        if (this.dagViewMap.has(tabId)) {
            this.dagViewMap.get(tabId).removeProgress(nodeId);
        }
    }

    /**
     * DagViewManager.Instance.switchActiveDagTab
     * Switches the current active tab, updating activeDag and activeDagTab
     * @param dagTab The tab we want to make active.
     */
    public switchActiveDagTab(dagTab: DagTab) {
        const $oldDfArea: JQuery = this._getActiveArea();
        this.activeDagTab = dagTab;
        this.activeDag = dagTab.getGraph();
        if (this.activeDagView) {
            this.activeDagView.unfocus();
        }
        if (this.dagViewMap.has(dagTab.getId())) {
            this.activeDagView = this.dagViewMap.get(dagTab.getId());
        }
        DagCategoryBar.Instance.updateCategories(this.activeDagTab);
        this.render();
        this.activeDagView.focus();
        this._updateDagView();
        DagTable.Instance.switchTab(dagTab.getId());
        DagSearch.Instance.switchTab($oldDfArea);
        this.activeDagView.updateOperationTime();
    }

    public endOptimizedDFProgress(queryName: string, queryStateOutput): void {
        let tab: DagTabProgress = <DagTabProgress>DagTabManager.Instance.getTabById(queryName);
        if (!tab) {
            return;
        }

        this.updateOptimizedDFProgress(queryName, queryStateOutput);
        tab.getGraph().endProgress(queryStateOutput.queryState, queryStateOutput.elapsed.milliseconds);
    }


    public updateOptimizedDFProgress(queryName, queryStateOutput): void {
        const dagView: DagView = this.dagViewMap.get(queryName);
        if (!dagView) {
            return;
        }

        dagView.updateOptimizedDFProgress(queryStateOutput);
    }

    public renderSQLPreviewDag(dagTab: DagTab): void {
        this.toggleSqlPreview(true);
        this.activeDagTab = dagTab;
        this.activeDag = dagTab.getGraph();
        this.$dfWrap.removeClass("xc-hidden");
        this.render($(this.containerSelector + " .dataflowArea"), this.activeDag, dagTab, true);
    }

    public toggleSqlPreview(sqlPreview: boolean) {
        this.isSqlPreview = sqlPreview;
        if (this.isSqlPreview) {
            this.containerSelector = "#sqlDataflowArea";
        } else {
            this.containerSelector = "#dagView";
        }
        this.$dfWrap = $(this.containerSelector + " .dataflowWrap");
    }


    /**
     * DagViewManager.Instance.resetActiveDagTab
     */
    public resetActiveDagTab(): void {
        this.activeDagTab = null;
        this.activeDag = null;
        this.activeDagView = null;
        DagCategoryBar.Instance.updateCategories(this.activeDagTab);
        this._updateDagView();
    }


    public selectNodes(tabId: string, nodeIds?: DagNodeId[]): void {
        if (!nodeIds) {
            DagView.selectNode(this._getAreaByTab(tabId).find(".operator"));
        } else {
            nodeIds.forEach((nodeId) => {
                const $node: JQuery = this.getNode(nodeId, tabId);
                DagView.selectNode($node);
            });
        }
    }

    public render($dfArea?: JQuery, graph?: DagGraph, dagTab?: DagTab, noEvents?: boolean) {
        // set activedag here
        $dfArea = $dfArea || this._getActiveArea();
        if ($dfArea.hasClass("rendered")) {
            return;
        }
        graph = graph || this.activeDag;
        const tabId = graph.getTabId();
        const newDagView = new DagView($dfArea, graph, this.containerSelector, dagTab);
        this.dagViewMap.set(graph.getTabId(), newDagView);


        if (this.activeDag && tabId === this.activeDag.getTabId()) {
            // when rerendering graph, need to reset activeDag to new graph
            this.activeDag = graph;
            this.activeDagView = newDagView;
            this.activeDagTab = DagTabManager.Instance.getTabById(tabId);
        }
        newDagView.render(null, null, noEvents);
    }

    public addProgress(nodeId: DagNodeId, tabId: string): void {
        const dagView: DagView = this.dagViewMap.get(tabId);
        if (dagView) {
            dagView.addProgress(nodeId);
        }
    }

    public calculateAndUpdateProgress(
        queryStateOutput,
        nodeId: DagNodeId,
        tabId: string
    ): void {
        const dagView: DagView = this.dagViewMap.get(tabId);
        if (dagView) {
            dagView.calculateAndUpdateProgress(queryStateOutput, nodeId);
        }
    }

    public getDagViewById(tabId: string): DagView {
        return this.dagViewMap.get(tabId);
    }

    public newGraph(): void {
        this.activeDagView.newGraph();
    }


    /**
     * DagViewManager.Instance.newNode
     * @param dagId
     * @param nodeInfo
     */
    public newNode(nodeInfo: DagNodeInfo): DagNode {
        return this.activeDagView.newNode(nodeInfo);
    }


    /**
     * DagViewManager.Instance.newComment
     */
    public newComment(
        commentInfo: CommentInfo,
        isFocus?: boolean
    ): XDPromise<void> {
        return this.activeDagView.newComment(commentInfo, isFocus);
    }

    /**
     * DagViewManager.Instance.addBackNodes
     * @param nodeIds
     * @param tabId
     * @param sliceInfo?
     * used for undoing/redoing operations
     */
    public addBackNodes(
        nodeIds: DagNodeId[],
        tabId: string,
        spliceInfo?,
        identifiers?
    ): XDPromise<void> {
        return this.dagViewMap.get(tabId).addBackNodes(nodeIds, spliceInfo, identifiers);
    }

    /**
     * DagViewManager.Instance.run
     * // run the entire dag,
     * // if no nodeIds passed in then it will execute all the nodes
     */
    public run(nodeIds?: DagNodeId[], optimized?: boolean): XDPromise<void> {
        return this.activeDagView.run(nodeIds, optimized);
    }

    /**
     * DagViewManager.Instance.unlockNode
     * @param nodeId
     */
    public unlockNode(nodeId: DagNodeId, tabId: string): void {
        if (this.dagViewMap.has(tabId)) {
            this.dagViewMap.get(tabId).unlockNode(nodeId);
        }
    }

    /**
     * DagViewManager.Instance.lockNode
     * @param nodeId
     */
    public lockNode(nodeId: DagNodeId, tabId?: string): string {
        if (!tabId) {
            tabId = this.activeDagTab.getId();
        }
        if (this.dagViewMap.has(tabId)) {
            return this.dagViewMap.get(tabId).lockNode(nodeId);
        }
    }

     /**
     * DagViewManager.Instance.isNodeLocked
     * @param nodeId
     * @param tabId
     */
    public isNodeLocked(nodeId: DagNodeId, tabId?: string): boolean {
        tabId = tabId || this.activeDagTab.getId();
        if (this.dagViewMap.has(tabId)) {
            return this.dagViewMap.get(tabId).isNodeLocked(nodeId);
        }
        return false;
    }

    public deselectNodes(): void {
        if (this.activeDagView) {
            this.activeDagView.deselectNodes();
        }
    }


    /**
     * DagViewManager.Instance.removeNode
     * @param nodeId
     *  removes node from DagGraph, remove $element, connection lines, update
     * connector classes
     */
    public removeNodes(nodeIds: DagNodeId[], tabId: string): XDPromise<void> {
        return this.dagViewMap.get(tabId).removeNodes(nodeIds);
    }

    /**
     * DagViewManager.Instance.moveNodes
     * @param dagId
     * @param nodeInfos
     * @param graphDimensions
     */
    public moveNodes(
        tabId: string,
        nodeInfos: NodeMoveInfo[],
        graphDimensions?: Coordinate
    ): XDPromise<void> {
        if (!this.dagViewMap.has(tabId)) {
            return PromiseHelper.reject();
        }
        return this.dagViewMap.get(tabId).moveNodes(nodeInfos, graphDimensions);
    }


    /**
     * DagViewManager.Instance.copyNodes
     * @param nodeIds
     */
    public copyNodes(nodeIds: DagNodeId[]): string {
        if (!nodeIds.length) {
            return "";
        }
        return this.activeDagView.copyNodes(nodeIds);
    }

     /**
     * DagViewManager.Instance.cutNodes
     * @param nodeIds
     */
    public cutNodes(nodeIds: DagNodeId[]): string {
        return this.activeDagView.cutNodes(nodeIds);
    }

    public hasOptimizedNode(nodeIds?: DagNodeId[]): boolean {
        return this.activeDagView.hasOptimizedNode(nodeIds);
    }


    /**
     * DagViewManager.Instance.disconnect
     * @param parentNodeId
     * @param childNodeId
     * removes connection from DagGraph, connection line, updates connector classes
     */
    public disconnectNodes(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number,
        tabId: string
    ): XDPromise<void> {
        return this.dagViewMap.get(tabId).disconnectNodes(parentNodeId, childNodeId, connectorIndex);
    }


    /**
     * DagViewManager.Instance.connectNodes
     * @param parentNodeId
     * @param childNodeId
     * @param connectorIndex
     * @param tabId
     * @param isReconnect
     * connects 2 nodes and draws line
     */
    public connectNodes(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number,
        tabId: string,
        isReconnect?: boolean,
        spliceIn?: boolean,
        identifiers?: Map<number, string>,
        setNodeConfig?: {sourceColumn: string, destColumn: string, columnType: ColumnType, cast: boolean}[]
    ): XDPromise<void> {
        if (!this.dagViewMap.has(tabId)) {
            return PromiseHelper.reject();
        }
        return this.dagViewMap.get(tabId).connectNodes(parentNodeId, childNodeId, connectorIndex, isReconnect, spliceIn, identifiers, setNodeConfig);
    }


    /**
     * DagViewManager.Instance.autoAlign
     * @param tabId
     */
    public autoAlign(tabId: string): void {
        this.dagViewMap.get(tabId).autoAlign();
    }

    public getActiveDagView() {
        return this.activeDagView;
    }

    public getAutoAlignPositions(graph: DagGraph): {
        nodeInfos: NodeMoveInfo[],
        maxX: number,
        maxY: number
    } {
        return DagView.getAutoAlignPositions(graph);
    }

    public autoAddNode(
        newType: DagNodeType,
        subType?: DagNodeSubType,
        parentNodeId?: DagNodeId,
        input?: object,
        x?: number,
        y?: number
    ): DagNode {
        return this.activeDagView.autoAddNode(newType, subType, parentNodeId, input, x, y);
    }

    public getAllNodes(includeComments?: boolean): JQuery {
        return this.activeDagView.getAllNodes(includeComments);
    }

    public getSelectedNodes(
        includeSelecting?: boolean,
        includeComments?: boolean
    ): JQuery {
        return this.activeDagView.getSelectedNodes(includeSelecting, includeComments);
    }

    public getSelectedNodeIds(
        includeSelecting?: boolean,
        includeComments?: boolean
    ): DagNodeId[] {
        return this.activeDagView.getSelectedNodeIds(includeSelecting, includeComments);
    }


    public viewOptimizedDataflow(dagNode: DagNode, tabId: string): XDPromise<void> {
        return this.dagViewMap.get(tabId).viewOptimizedDataflow(dagNode);
    }

    public reset(nodeIds?: DagNodeId[]): void {
        this.activeDagView.reset(nodeIds);
    }

      /**
     *
     * @param $node
     * @param text
     */
    public editDescription(
        nodeId: DagNodeId,
        text: string
    ): XDPromise<void> {
        return this.activeDagView.editDescription(nodeId, text);
    }

          /**
     *
     * @param $node
     * @param text
     */
    public editNodeTitle(
        nodeId: DagNodeId,
        tabId: string,
        text: string
    ): XDPromise<void> {
        return this.dagViewMap.get(tabId).editNodeTitle(nodeId, text);
    }


    /**
     * DagViewManager.Instance.cancel
     * cancel entire run or execution
     */
    public cancel() {
        this.activeDagView.cancel();
    }

    public highlightLineage(nodeId: DagNodeId, childNodeId?: DagNodeId, type?: string): void {
        this.activeDagView.highlightLineage(nodeId, childNodeId, type);
    }

    /**
     * Replace a group of nodes with a custom operator
     * @param nodeIds list of nodeIds need to be nested in the custom operator
     * @returns Promise with void
     * @description
     * 1. Create a custom operator with deep copies of the selected nodes
     * 2. Delete the selected nodes from current graph
     * 3. Add the custom operator to current graph
     * 4. Restore the connections
     * 5. Position the custom operator & update UI
     * 6. Persist the change to KVStore
     */
    public wrapCustomOperator(nodeIds: DagNodeId[]): XDPromise<void> {
        return this.activeDagView.wrapCustomOperator(nodeIds);
    }

    /**
     * Expand the Custom node into a sub graph in place for editing purpose
     * @param nodeId
     */
    public expandCustomNode(nodeId: DagNodeId): XDPromise<void> {
        return this.activeDagView.expandCustomNode(nodeId);
    }

    /**
     * Share a custom operator(node). Called by the node popup menu.
     * @param nodeId
     * @description
     * 1. Find the DagNode needs to be shared in the active DagGraph
     * 2. Make a deep copy of the node
     * 3. Call DagCategoryBar to add the copy to the category bar(and extra actions, such as persisting)
     * 4. Change the display name of the node
     * 5. Persist the tab to KVStore
     */
    public shareCustomOperator(nodeId: DagNodeId): XDPromise<void> {
        return this.activeDagView.shareCustomOperator(nodeId);
    }


    /**
     * Open a tab to show customOp's sub graph for editing
     * @param nodeId
     */
    public editCustomOperator(nodeId: DagNodeId): void {
        this.activeDagView.editCustomOperator(nodeId);
    }

    /**
     * DagViewManager.Instance.createSQLFunc
     * @param nodeIds
     */
    public createSQLFunc(): void {
        SQLFuncSettingModal.Instance.show((numInput) => {
            DagView.newSQLFunc(numInput);
            DagList.Instance.gotToSQLFuncFolder();
        });
    }

    /**
     * Open a tab to show SQL sub graph for viewing purpose
     * @param nodeId
     */
    public inspectSQLNode(
        nodeId: DagNodeId,
        tabId: string,
        sqlPreview?: boolean
    ): XDPromise<void> {
        // return this.dagViewMap.get(tabId).inspectSQLNode(nodeId, sqlPreview);
        return DagView.inspectSQLNode(nodeId, tabId, sqlPreview);
    }

     /**
     * Expand the SQL node into a sub graph in place for editing purpose
     * @param nodeId
     */
    public expandSQLNode(nodeId: DagNodeId): XDPromise<void> {
        return this.activeDagView.expandSQLNode(nodeId);
    }

    /**
     * DagViewManager.Instance.expandSQLNodeInTab
     */
    public expandSQLNodeInTab(
        dagNode: DagNodeSQL,
        dagTab: DagTab,
        rawXcQuery: boolean = false
    ): XDPromise<void> {
        return this.dagViewMap.get(dagTab.getId()).expandSQLNodeInTab(dagNode, rawXcQuery);
    }

    /**
     * Change the zoom level (scale) of the active graph
     * @param isZoomIn
     * @description
     * 1. find the next zoom level
     * 2. store the change in scale
     * 3. set the scale in graph
     * 4. adjust dataflowAreaWrapper min-height and min-width
     * 5. adjust scrollbar
     */
    public zoom(isZoomIn: boolean, newScale?: number): void {
        this.activeDagView.zoom(isZoomIn, newScale);
    }

    /**
     * Check if modification to graph/nodes should be disabled, Ex. it's showing the subGraph of a customNode
     */
    public isDisableActions(): boolean {
        return this.activeDagView.isDisableActions();
    }

    public isViewOnly(): boolean {
        return this.activeDagView.isViewOnly();
    }

    public isLocked($dfArea): boolean {
        return $dfArea.hasClass("locked");
    }

    public toggleProgressTips(show?: boolean): void {
        if (show) {
            this.$dagView.addClass("showProgressTips");
        } else {
            this.$dagView.removeClass("showProgressTips");
        }
    }

    public toogleConfigInfo(show?: boolean): void {
        if (show) {
            this.$dagView.addClass("showConfigInfo");
        } else {
            this.$dagView.removeClass("showConfigInfo");
        }
        DagSearch.Instance.update();
    }


    /**
     * Cleanup job after a tab is closed
     * pass in either graph or graphId
     * @param graph
     * @description
     * #1 Remove all event handlers listening on the DagGraph associated with the closed tab
     * #2 ...
     */
    public cleanupClosedTab(graph?: DagGraph, graphId?: string) {
        if (!graph) {
            const dagView: DagView = this.dagViewMap.get(graphId);
            if (dagView) {
                graph = dagView.getGraph();
            }
        }
        if (!graph) {
            return;
        }
        DagView.cleanupClosedTab(graph);
        this.dagViewMap.delete(graph.getTabId());
    }

    /**
     * DagViewManager.Instance.newTab
     */
    public newTab(): void {
        DagTabManager.Instance.newTab();
    }

    // public editNodeTitle()

    private _addEventListeners(): void {
        let mainAreaHeight;
        let $tableArea;
        let $parent;
        this.$dfWrap.resizable({
            handles: "n",
            containment: 'parent',
            minHeight: 40,
            start: () => {
                $parent = this.$dfWrap.parent();
                $parent.addClass("resizing");
                mainAreaHeight = $parent.height();
                $tableArea = $("#dagViewTableArea");
            },
            resize: (_event, ui) => {
                let pct = ui.size.height / mainAreaHeight;
                if (ui.position.top <= 100) {
                    // ui.position.top = 100;
                    pct = (mainAreaHeight - 100) / mainAreaHeight;
                    this.$dfWrap.height(mainAreaHeight - 100);
                    this.$dfWrap.css("top", 100);
                }

                $tableArea.height(100 * (1 - pct) + "%");
            },
            stop: (_event, ui) => {
                let pct = ui.size.height / mainAreaHeight;
                if (ui.position.top <= 100) {
                    ui.position.top = 100;
                    pct = (mainAreaHeight - 100) / mainAreaHeight;
                }
                let pctTop = ui.position.top / mainAreaHeight;

                this.$dfWrap.css("top", 100 * pctTop + "%");
                this.$dfWrap.height(100 * pct + "%");
                $tableArea.height(100 * (1 - pct) + "%");
                $parent.removeClass("resizing");
                $tableArea = null;
                $parent = null;
            }
        });

        this.$dagView.find(".dataflowWrapBackground").on("click", ".newTab", () => {
            this.newTab();
        });
    }

    private _addDagViewListeners(): void {
        const self = this;

        // moving node in dataflow area to another position
        this.$dfWrap.on("mousedown", ".operator .main, .comment", function (event) {
            self.activeDagView.operatorMousedown(event, $(this));
        });

         // connecting 2 nodes dragging the parent's connector
        this.$dfWrap.on("mousedown", ".operator .connector.out", function (event) {
            self.activeDagView.connectorOutMousedown(event, $(this));
        });

         // connecting 2 nodes dragging the child's connector
        this.$dfWrap.on("mousedown", ".operator .connector.in", function (event) {
            self.activeDagView.connectorInMousedown(event, $(this));
        });

         // drag select multiple nodes
        let $dfArea;
        let $els;
        this.$dfWrap.on("mousedown", function (event) {
            if (event.which !== 1 || self.activeDagTab == null) {
                return;
            }
            let $target = $(event.target);
            $dfArea = self._getActiveArea();
            if ($target.closest(".dataflowAreaWrapper").length &&
                !$target.closest(".operator").length &&
                !$target.closest(".selection").length &&
                !$target.closest(".comment").length &&
                !$target.closest(".editableNodeTitle").length &&
                !$target.closest(".ui-resizable-handle").length) {
                new RectSelection(event.pageX, event.pageY, {
                    "id": "dataflow-rectSelection",
                    "$container": $dfArea.find(".dataflowAreaWrapper"),
                    "$scrollContainer": $dfArea,
                    "onStart": () => {
                        $dfArea.addClass("drawing");
                        $els = $dfArea.find(".operator");
                        $els = $els.add($dfArea.find(".comment"));
                        DagView.deselectNode($els);
                    },
                    "onDraw": _drawRect,
                    "onEnd": _endDrawRect
                });
            } else if ($target.closest(".operator").length) {
                const $operator = $target.closest(".operator");
                if (!$operator.hasClass("selected")) {
                    self._deselectAllNodes();
                    DagView.selectNode($operator);
                    const nodeId: DagNodeId = $operator.data("nodeid");
                    const node: DagNode = self.activeDag.getNode(nodeId);
                    DagNodeInfoPanel.Instance.show(node);
                }
            }
        });


        this.$dfWrap.on("click", ".descriptionIcon", function () {
            const nodeId: DagNodeId = $(this).closest(".operator")
                .data("nodeid");
            DagDescriptionModal.Instance.show(nodeId);
        });

        this.$dfWrap.on("dblclick", ".nodeTitle", function () {
            self.activeDagView.nodeTitleEditMode($(this));
        });

        this.$dfWrap.on("click", ".paramTitle", function () {
            if (self.activeDagTab == null || self.activeDag == null) {
                return; // error case
            }
            if (self.activeDagTab instanceof DagTabProgress) {
                return; // invalid case
            }
            const $node: JQuery = $(this).closest(".operator");
            const node: DagNode = self.activeDag.getNode($node.data("nodeid"));
            if (node != null) {
                DagNodeMenu.execute("configureNode", {
                    node: node
                });
            }
        });

        function _drawRect(
            bound: ClientRect,
            selectTop: number,
            selectRight: number,
            selectBottom: number,
            selectLeft: number
        ): void {
            $els.each(function () {
                const $el = $(this);
                let opRect: ClientRect;
                if ($el.is(".operator")) {
                    opRect = $(this).find(".main")[0].getBoundingClientRect();
                } else {
                    opRect = this.getBoundingClientRect();
                }
                const opTop = opRect.top - bound.top;
                const opLeft = opRect.left - bound.left;
                const opRight = opRect.right - bound.left;
                const opBottom = opRect.bottom - bound.top;
                if (opTop > selectBottom || opLeft > selectRight ||
                    opRight < selectLeft || opBottom < selectTop) {
                    $el.removeClass("selecting");
                } else {
                    $el.addClass("selecting");
                }
            });
        }
        function _endDrawRect(_event: JQueryEventObject): void {
            $dfArea.removeClass("drawing");
            const $selectedEls = $dfArea.find(".selecting");
            if ($selectedEls.length === 0) {
                self.deselectNodes();
                DagNodeInfoPanel.Instance.hide();
            } else {
                $selectedEls.each(function () {
                    const $node = $(this);
                    $node.removeClass("selecting");
                    DagView.selectNode($node);
                });
            }
            $els = null;
        }
    }

    private _deselectAllNodes(): void {
        const $selected = this.$dfWrap.find(".selected");
        $selected.removeClass("selected");
        $selected.find(".selection").remove();
    }

    private _updateDagView(): void {
        const $dfWrapBg: JQuery = this.$dagView.find(".dataflowWrapBackground");
        DagNodeInfoPanel.Instance.hide();
        if (this.activeDagTab == null) {
            this.$dfWrap.addClass("xc-hidden");
            $dfWrapBg.removeClass("xc-hidden");
            this.$dagView.find(".searchArea, .categoryWrap, .operatorWrap").addClass("xc-disabled");
        } else {
            this.$dfWrap.removeClass("xc-hidden");
            $dfWrapBg.addClass("xc-hidden");
            this.$dagView.find(".searchArea, .categoryWrap, .operatorWrap").removeClass("xc-disabled");
            this._deselectAllNodes();
        }
        DagTopBar.Instance.setState(this.activeDagTab);
        this._checkNodeValidation();
    }

    private _checkNodeValidation(): void {
        if (!this.activeDagTab) {
            return;
        }
        this.activeDagView.checkLinkInNodeValidation();
    }




    private _viewAgg(dagNode: DagNodeAggregate): void {
        try {
            let aggVal: string | number = dagNode.getAggVal();
            const evalStr: string = dagNode.getParam().evalString;
            const op: string = evalStr.substring(0, evalStr.indexOf("("));
            const title: string = xcHelper.replaceMsg(AggTStr.AggTitle, {
                op: op
            });
            if (typeof aggVal === "string") {
                aggVal = `"${aggVal}"`;
            } else {
                aggVal = xcHelper.numToStr(<number>aggVal);
            }
            const msg: string = xcHelper.replaceMsg(AggTStr.AggMsg, {
                val: aggVal
            });
            Alert.show({
                title: title,
                msg: msg,
                isAlert: true
            });
        } catch (e) {
            console.error(e);
            Alert.error(AlertTStr.Error, ErrTStr.Unknown);
        }
    }

    private _getAreaByTab(tabId: string): JQuery {
        const index: number = DagTabManager.Instance.getTabIndex(tabId, this.isSqlPreview);
        if (index < 0) {
            return $();
        }
        return this.$dfWrap.find(".dataflowArea").eq(index);
    }


    private _getActiveArea(): JQuery {
        return this.$dfWrap.find(".dataflowArea.active");
    }


    private _setupDagSharedActionEvents(): void {
        const service = DagSharedActionService.Instance;
        service
            .on(DagNodeEvents.ProgressChange, (info) => {
                this._updateSharedProgress(info);
            })
            .on(DagNodeEvents.StateChange, (info) => {
                this._updateNodeState(info);
            })
            .on(DagNodeEvents.ParamChange, (info) => {
                const tabId: string = info.tabId;
                const tab: DagTab = info.tab;
                if (this.activeDagTab.getId() === tabId) {
                    Alert.show({
                        title: DFTStr.Refresh,
                        msg: DFTStr.RefreshMsg,
                        isAlert: true
                    });
                }

                const $dfArea: JQuery = this._getAreaByTab(tabId);
                $dfArea.addClass("xc-disabled");
                const promise = DagTabManager.Instance.reloadTab(tab);
                xcHelper.showRefreshIcon($dfArea, true, promise);

                promise
                    .then(() => {
                        this._getAreaByTab(tabId).removeClass("rendered");
                        if (this.activeDagTab.getId() === tabId) {
                            this.switchActiveDagTab(tab);
                        }
                    })
                    .always(() => {
                        $dfArea.removeClass("xc-disabled");
                    });
            })
            .on(DagGraphEvents.LockChange, (info) => {
                const dagView: DagView = this.dagViewMap.get(info.tabId);
                if (dagView) {
                    dagView.lockUnlockHelper(info);
                }
            });
    }

    private _updateSharedProgress(progressInfo: {
        nodeId: DagNodeId,
        tabId: string,
        stats: any,
        skewInfos: any[],
        times: number[]
    }): void {
        const nodeId: DagNodeId = progressInfo.nodeId;
        const tabId: string = progressInfo.tabId;
        this.activeDagView.updateNodeProgress(nodeId, tabId, progressInfo.stats,
            progressInfo.skewInfos, progressInfo.times, false);
        if (progressInfo.stats.state === DgDagStateT.DgDagStateReady) {
            this.activeDagView.removeProgress(nodeId);
        }
    }


    private _updateNodeState(nodeInfo: {
        id: DagNodeId,
        tabId: string,
        node: DagNode,
        oldState: DagNodeState,
        state: DagNodeState
    }
    ): void {
        const tabId: string = nodeInfo.tabId;
        const dagView: DagView = this.dagViewMap.get(tabId);
        if (!dagView) {
            return;
        }
        dagView.updateNodeState(nodeInfo);
    }

}
