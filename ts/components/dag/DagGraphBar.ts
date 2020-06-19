class DagGraphBar {
    private static _instance: DagGraphBar;
    private _curDagTab: DagTab;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    /**
     * DagGraphBar.Instance.toggleDisable
     * @param disable
     */
    public toggleDisable(disable: boolean): void {
        // Not use this.$dagView as it's called before setup
        let $btns: JQuery = this._getGraphBar().find(".topButtons");
        if (disable) {
            $btns.addClass("xc-disabled");
        } else {
            $btns.removeClass("xc-disabled");
        }
    }

    public setup(): void {
        this._addEventListeners();
        this._setupActionMenu();
    }

    public reset(): void {
        this._checkZoom();
        this._updateHeader();
    }

    public lock(): void {
        this._getGraphBar().addClass("locked");
    }

    public unlock(): void {
        this._getGraphBar().removeClass("locked");
    }

    /**
     * DagGraphBar.Instance.setState
     * @param dagTab
     */
    public setState(dagTab: DagTab): void {
        let activeTab: DagTab = DagViewManager.Instance.getActiveTab();
        if (activeTab && dagTab !== activeTab) {
            return;
        }
        let $topBar = this._getGraphBar();
        const $btns: JQuery = $topBar.find(".topButtons");
        if (dagTab == null) {
            $btns.find(".topButton:not(.noTabRequired)").addClass("xc-disabled");
            this._getMenu().find("li:not(.noTabRequired)").addClass("xc-disabled");
            return;
        }
        this._curDagTab = dagTab;

        $btns.find(".topButton").removeClass("xc-disabled");
        this._getMenu().find("li").removeClass("xc-disabled");

        const $userAndPublishOnlyBtns: JQuery = $btns.find(".run");
        if (dagTab instanceof DagTabUser) {
            $userAndPublishOnlyBtns.removeClass("xc-disabled");
        } else {
            $userAndPublishOnlyBtns.addClass("xc-disabled");
        }

        const isViewOnly: boolean = (dagTab instanceof DagTabProgress ||
        dagTab instanceof DagTabSQLExecute);
        if (isViewOnly) {
            $topBar.addClass("viewOnly");
        } else {
            $topBar.removeClass("viewOnly");
        }

        const graph: DagGraph = dagTab.getGraph();
        $topBar.removeClass("canceling");
        if (graph != null && graph.getExecutor() != null) {
            $topBar.addClass("running");
            $btns.find(".stop").removeClass("xc-disabled");
            $btns.find(".run, .stop").addClass("running");
            if (graph.getExecutor().isCanceled()) {
                $topBar.addClass("canceling");
            }
        } else {
            $topBar.removeClass("running");
            $btns.find(".stop").addClass("xc-disabled");
            $btns.find(".run, .stop").removeClass("running");
        }

        if (graph != null) {
            let scale = Math.round(graph.getScale() * 100);
            $topBar.find(".zoomPercentInput").val(scale);
        }
        if (dagTab instanceof DagTabSQLFunc) {
            $topBar.addClass("sqlFunc");
        } else {
            $topBar.removeClass("sqlFunc");
        }

        if (dagTab instanceof DagTabSQLExecute) {
            $topBar.addClass("sqlExecute");
        } else {
            $topBar.removeClass("sqlExecute");
        }

        if (dagTab instanceof DagTabMain) {
            $topBar.addClass("mainFunc");
            // XXX hack
            $("#dagView").addClass("mainFunc");
        } else {
            $topBar.removeClass("mainFunc");
            $("#dagView").removeClass("mainFunc");
            DagCategoryBar.Instance.showOrHideArrows();
        }
        this.updateNumNodes(dagTab);
    }

    public updateNumNodes(dagTab: DagTab): void {
        if (dagTab == null || dagTab !== this._curDagTab) {
            return;
        }
        const graph: DagGraph = dagTab.getGraph();
        if (!graph) {
            return;
        }
        const $topBar = this._getGraphBar();
        const nodes = graph.getAllNodes();
        let numNodes = 0;
        nodes.forEach(n => {
            if (!(n instanceof DagNodeSQL)|| !n.isHidden()) {
                numNodes++;
            }
        });

        $topBar.find(".numNodes").text(xcStringHelper.numToStr(numNodes));
        if (!numNodes) {
            $topBar.addClass("noNodes");
        } else {
            $topBar.removeClass("noNodes");
        }
    }

    private _getGraphBar(): JQuery {
        return $("#dagGraphBar");
    }

    private _addEventListeners(): void {
        const self = this;
        let $topBar = this._getGraphBar();
        $topBar.find(".run > span").click(function() {
            DagViewManager.Instance.run();
        });

        $topBar.find(".stop").click(function() {
            DagViewManager.Instance.cancel();
        });

        $topBar.find(".useInSQL").click(function() {
            const dagTab = DagViewManager.Instance.getActiveTab();
            if (dagTab instanceof DagTabSQLFunc) {
                SQLWorkSpace.Instance.tableFuncQuery(dagTab.getName());
            }
        });

        $topBar.find(".undo").click(function() {
            if ($(this).hasClass("disabled") || $(this).hasClass("locked")) {
                return;
            }
            let dagTab = DagViewManager.Instance.getActiveDag();
            if (!dagTab || dagTab.isLocked()) {
                return;
            }
            Log.undo();
        });

        $topBar.find(".redo").click(function() {
            if ($(this).hasClass("disabled") || $(this).hasClass("locked")) {
                return;
            }
            let dagTab = DagViewManager.Instance.getActiveDag();
            if (!dagTab || dagTab.isLocked()) {
                return;
            }
            Log.redo();
        });

        $topBar.find(".zoomIn").click(function() {
            DagViewManager.Instance.zoom(true);
            self._updateZoom();
        });

        $topBar.find(".zoomOut").click(function() {
            DagViewManager.Instance.zoom(false);
            self._updateZoom();
        });

        $topBar.find(".zoomPercentInput").on('keyup', function(e) {
            if (e.which == keyCode.Enter) {
                e.preventDefault();
                let percent: number = $(this).val();
                if (percent <= 0 || percent > 200) {
                    StatusBox.show("Zoom must be between 1% and 200%",
                        $(this));
                    return;
                }
                percent = Math.round(percent) || 1;
                $(this).val(percent);
                DagViewManager.Instance.zoom(true, percent / 100)
                self._checkZoom();
            }
        });

        $topBar.find(".zoomPercentInput").blur(() => {
            // if user types without saving, we should reset the zoom to the
            // last saved zoom
            this._updateZoom();
        });

        $topBar.find(".editSQLGraph").click(() => {
            const dagTab = DagViewManager.Instance.getActiveTab();
            if (dagTab instanceof DagTabSQLExecute) {
                DagTabManager.Instance.convertNoEditableTab(dagTab);
            }
        });

        this._setupRunButton();
    }

    private _setupRunButton(): void {
        const $run = this._getGraphBar().find(".run");
        new MenuHelper($run, {
            onOpen: ($dropdownList) => {
                this._renderGraphHeaderList($dropdownList);
            },
            onSelect: ($li) => {
                if ($li.hasClass("hint")) {
                    return;
                }
                const nodeId = $li.data("id");
                DagViewManager.Instance.runWithHead(nodeId);
            },
            onClose: () => {
                DagViewManager.Instance.higlightGraph(null);
            },
            onlyClickIcon: true,
            container: "#dagViewContainer",
            bounds: "#dagViewContainer"
        }).setupListeners();

        $run.on("mouseenter", "li", (event) => {
            const $li = $(event.currentTarget);
            if ($li.hasClass("hint")) {
                return;
            }
            const nodeId = $li.data("id");
            DagViewManager.Instance.higlightGraph(nodeId);
        });

        $run.on("mouseleave", "li", () => {
            DagViewManager.Instance.higlightGraph(null);
        });
    }

    private _updateZoom(): void {
        let dagTab = DagViewManager.Instance.getActiveDag();
        if (dagTab != null) {
            let percent = Math.round(dagTab.getScale() * 100);
            $("#dagGraphBar .zoomPercent input").val(percent);
            this._checkZoom();
        }
    }

    private _checkZoom(): void {
        let $topBar = this._getGraphBar();
        const $zoomIn = $topBar.find(".zoomIn");
        const $zoomOut = $topBar.find(".zoomOut");
        $zoomIn.removeClass("disabled");
        $zoomOut.removeClass("disabled");
        let dagTab = DagViewManager.Instance.getActiveDag();
        if (dagTab == null) {
            return;
        }
        const scale = dagTab.getScale();
        let scaleIndex = DagView.zoomLevels.indexOf(scale);
        if (scaleIndex == -1) {
            if (scale < DagView.zoomLevels[0]) {
                scaleIndex = 0;
            } else {
                scaleIndex = 1;
            }
        }
        if (scaleIndex === 0) {
            $zoomOut.addClass("disabled");
        } else if (scaleIndex === DagView.zoomLevels.length - 1) {
            $zoomIn.addClass("disabled");
        }
    }

    private _updateHeader(): void {
        const $header = $("#dagView .categoryBar .sectionHeader");
        const dagTab = DagViewManager.Instance.getActiveTab();
        if (dagTab instanceof DagTabSQLExecute) {
            $header.text(SQLTStr.Graph);
        } else {
            $header.text(AppTStr.Builder);
        }
    }

    private _getMenu(): JQuery {
        return $("#dagView .optionsMenu");
    }


    private _setupActionMenu(): void {
        const $menu: JQuery = this._getMenu();
        xcMenu.add($menu);

        this._getGraphBar().find(".optionsBtn").click(function () {
            const $target = $(this);
            MenuHelper.dropdownOpen($target, $menu, {
                "offsetY": -1,
                "toggle": true
            });
        });

        // param and aggregates managed in DagAggManager and ParamAggManager
    }

    private _renderGraphHeaderList($dropdownList: JQuery): void {
        $dropdownList.find("li").remove();
        let list: HTML = "";
        try {
            const graph = DagViewManager.Instance.getActiveDag();
            const nodeHeasMap = graph.getNodeHeadsMap();
            nodeHeasMap.forEach((nodeId, head) => {
                list += '<li data-id="' + nodeId + '">' + head + '</li>';
            });
        } catch (e) {
            console.error(e);
        }
        if (!list) {
            list = '<li class="hint">No functions</li>';
        }
        $dropdownList.find("ul").prepend(list);
    }
}