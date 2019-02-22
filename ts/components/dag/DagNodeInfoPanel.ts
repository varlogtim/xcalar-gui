class DagNodeInfoPanel {
    private static _instance: DagNodeInfoPanel;
    private _$panel: JQuery;
    private _isShowing: boolean;
    private _activeNode: DagNode;
    private _isRowStatsCollapsed: boolean;

    public static get Instance() {
        return this._instance || (this._instance = new DagNodeInfoPanel());
    }

    private constructor() {
        this._$panel = $("#dagNodeInfoPanel");
        this._isShowing = false;
        this._isRowStatsCollapsed = true;
        this._addEventListeners();
    }

    public show(node: DagNode, needsRefresh = true): boolean {
        if (node == null) {
            return false;
        }
        if (!MainMenu.isFormOpen()) {
            $("#dataflowMenu").find(".menuSection").addClass("xc-hidden");
            this._$panel.removeClass("xc-hidden");
        }
        if (this._activeNode === node && !needsRefresh) {
            return true;
        }

        this._activeNode = node;
        this._isShowing = true;
        this._$panel.find(".nodeType").text(node.getDisplayNodeType());

        this._updateTitleSection();
        this._updateConfigSection();
        this._updateStatusSection();
        this._updateStatsSection();
        this._updateAggregatesSection();
        this._updateUDFSection();
        this._updateDescriptionSection();
        this._updateSubGraphSection();
        this._updateLock();
        return true;
    }

    public hide(): boolean {
        if (!this._isShowing) {
            return false;
        }
        this._isShowing = false;
        this._activeNode = null;
        this._$panel.addClass("xc-hidden");
        this._$panel.find(".row.restore").remove();
        xcTooltip.hideAll();
        if (!MainMenu.isFormOpen()) {
            $("#dagList").removeClass("xc-hidden");
        }
        return true;
    }

    public isOpen(): boolean {
        return this._isShowing;
    }

    public getActiveNode(): DagNode {
        if (!this._isShowing) {
            return null;
        }
        return this._activeNode;
    }

    public update(nodeId: DagNodeId, attribute: string): boolean {
        if (this._activeNode == null ||
            nodeId !== this._activeNode.getId()
        ) {
            return false;
        }
        switch (attribute) {
            case ("lock"):
                this._updateLock();
                break;
            case ("title"):
                this._updateTitleSection();
                break;
            case ("params"):
                this._updateConfigSection();
                this._updateUDFSection();
                break;
            case ("status"):
                this._updateStatusSection();
                break;
            case ("stats"):
                this._updateStatsSection();
            case ("aggregates"):
                this._updateAggregatesSection();
                break;
            case ("description"):
                this._updateDescriptionSection();
                break;
            default:
                console.warn(attribute, "attribute not found");
                break;
        }
        return true;
    }

    private _addEventListeners(): void {
        const self = this;

        this._$panel.on("click", ".closeBtn", () => {
            this.hide();
            DagViewManager.Instance.deselectNodes();
        });

        this._$panel.on("click", ".collapsible .rowHeading", function(event) {
            if ($(event.target).closest(".editConfig").length) {
                return;
            }
            const $row = $(this).closest(".row")

            if ($row.hasClass("rowStats")) {
                const prevTop = $row.offset().top;
                // const prevScrollTop = this._$panel.find(".nodeInfoSection").scrollTop();
                self._$panel.find(".rowStats").toggleClass("collapsed");
                const topDiff = $row.offset().top - prevTop;
                const curScrollTop = self._$panel.find(".nodeInfoSection").scrollTop();
                self._$panel.find(".nodeInfoSection").scrollTop(curScrollTop + topDiff);
                self._isRowStatsCollapsed = !self._isRowStatsCollapsed;
            } else {
                $row.toggleClass("collapsed");
                if ($row.hasClass("udfsRow") && !$row.hasClass("collapsed")) {
                    self._viewUDFs();
                }
            }
        });

        this._$panel.find(".editConfig").click(function() {
            if ($(this).hasClass("unavailable")) {
                return;
            }
            DagNodeMenu.execute("configureNode", {
                node: self._activeNode
            });
        });

        this._$panel.on("click", ".restore .action", () => {
            this._restoreDataset();
        });

        this._$panel.on("click", ".skewStatsRow", function() {
            SkewInfoModal.Instance.show(null, {tableInfo: $(this).data("skewinfo")});
        });
    }

    private _updateLock(): void {
        const dagNodeType: DagNodeType = this._activeNode.getType();
        const uneditable = (dagNodeType === DagNodeType.CustomInput ||
            dagNodeType === DagNodeType.CustomOutput ||
            dagNodeType === DagNodeType.Custom ||
            DagViewManager.Instance.getActiveArea().hasClass("viewOnly") ||
            !(DagViewManager.Instance.getActiveTab() instanceof DagTabUser ||
            DagViewManager.Instance.getActiveTab() instanceof DagTabCustom));
        if (uneditable || DagViewManager.Instance.isNodeLocked(this._activeNode.getId())) {
            xcHelper.disableElement(this._$panel.find(".editConfig"), "");
        } else {
            xcHelper.enableElement(this._$panel.find(".editConfig"));
        }
    }

    private _updateTitleSection(): void {
        if (this._activeNode.getTitle()) {
            this._$panel.find(".nodeTitle").removeClass("xc-hidden");
            this._$panel.find(".nodeTitle").text(this._activeNode.getTitle());
        } else {
            this._$panel.find(".nodeTitle").addClass("xc-hidden");
        }
    }

    private _updateConfigSection(): void {
        this._$panel.find(".configRow").removeClass("xc-hidden");
        let params = this._getConfig();
        this._$panel.find(".configSection").text(params);
    }

    private _getConfig(): string {
        let param = this._activeNode.getParam();
        if (this._activeNode instanceof DagNodeDataset ||
            this._activeNode instanceof DagNodeDFIn
        ) {
            // dataset node and link in node add schem
            param.schema = this._activeNode.getSchema();
        }
        return JSON.stringify(param, null, 4);
    }

    private _updateStatusSection(): void {
        this._$panel.find(".row.restore").remove();
        let html = `<div class="statusIcon state-${this._activeNode.getState()}"></div>${this._activeNode.getState()}`
        this._$panel.find(".statusSection").html(html);
        const error: string = this._activeNode.getError();
        if (this._activeNode.getState() === DagNodeState.Error && error) {
            if (this._activeNode instanceof DagNodeDataset) {
                this._renderRestoreButton();
            }
            this._$panel.find(".errorSection").text(error);
            this._$panel.find(".errorRow").removeClass("xc-hidden");
        } else {
            this._$panel.find(".errorRow").addClass("xc-hidden");
        }
    }

    private _updateStatsSection(): void {
        const node = this._activeNode;
        const overallStats = node.getOverallStats();
        if (overallStats.started) {
            this._$panel.find(".progressRow").removeClass("xc-hidden");
            let pct: string;
            if (overallStats.state === DgDagStateT.DgDagStateReady) {
                pct = "100%";
            } else {
                pct = "Step " + overallStats.curStep + ": " + overallStats.curStepPct + "%";
            }

            this._$panel.find(".progressSection").text(pct);
            this._$panel.find(".timeRow").removeClass("xc-hidden");
            this._$panel.find(".timeSection").text(xcHelper.getElapsedTimeStr(overallStats.time));
            this._$panel.find(".statsRow").removeClass("xc-hidden");
            const operationsStats = node.getIndividualStats(true);
            let statsHtml: HTML = "";
            let skewInfos = [];
            operationsStats.forEach((stats) => {
                let operationName = stats.type.substr("XcalarApi".length);
                let skewText = DagView.getSkewText(stats.skewValue);
                let skewColorRaw = DagView.getSkewColor(skewText);
                let skewColor = skewColorRaw;
                if (skewColor) {
                    skewColor = "color:" + skewColor;
                }
                let rowStatsClass = "";
                if (this._isRowStatsCollapsed) {
                    rowStatsClass = "collapsed";
                }

                skewInfos.push({
                    rows: stats.rows,
                    totalRows: stats.numRowsTotal,
                    size: stats.size,
                    skewValue: skewText,
                    skewColor: skewColorRaw
                });
                statsHtml += `<div class="operationStats">
                    <div class="statsRow subRow">
                        <div class="label">Operation: </div>
                        <div class="value"><b>${operationName}</b></div>
                    </div>
                    <div class="statsRow subRow">
                        <div class="label">Progress: </div>
                        <div class="value">${stats.pct}%</div>
                    </div>`;
                if (stats.state !== DgDagStateTStr[DgDagStateT.DgDagStateReady]) {
                    // only show states other than ready as 100% would already
                    // indicate that it's ready
                    statsHtml += `<div class="statsRow subRow">
                                    <div class="label">State: </div>
                                    <div class="value">${stats.state}</div>
                                </div>`;
                }

                statsHtml += `<div class="row statsRow subRow rowStats collapsible ${rowStatsClass}">
                        <div class="rowHeading">
                            <div class="label">Rows: </div>
                            <div class="value">${xcHelper.numToStr(stats.numRowsTotal)}</div>
                            <i class="icon xi-arrow-down"></i>
                        </div>
                        <div class="rowSection rowsPerNode">`;
                stats.rows.forEach((row, j) => {
                    statsHtml += `<div class="statsRow subRow">
                                <div class="label">Node ${j + 1}</div>
                                <div class="value">${xcHelper.numToStr(row)}</div>
                            </div>`;
                });

                statsHtml += `</div>
                    </div>
                    <div class="statsRow subRow skewStatsRow" ${xcTooltip.Attrs} data-original-title="${TblTStr.ClickToDetail}">
                        <div class="label">Skew: </div>
                        <div class="value" style="${skewColor}">${skewText}</div>
                    </div>
                    <div class="statsRow subRow">
                        <div class="label">Elapsed Time: </div>
                        <div class="value">${xcHelper.getElapsedTimeStr(stats.elapsedTime)}</div>
                    </div>
                </div>`;

            });
            this._$panel.find(".statsSection").html(statsHtml);
            this._$panel.find(".statsSection").find(".skewStatsRow").each(function(i) {
                $(this).data("skewinfo", skewInfos[i]);
            });
        } else {
            this._$panel.find(".progressRow").addClass("xc-hidden");
            this._$panel.find(".timeRow").addClass("xc-hidden");
            this._$panel.find(".statsRow").addClass("xc-hidden");
        }
    }

    private _updateAggregatesSection(): void {
        if (this._activeNode.getAggregates && this._activeNode.getAggregates().length) {
            this._$panel.find(".aggsSection").text(this._activeNode.getAggregates().join(", "));
            this._$panel.find(".aggsRow").removeClass("xc-hidden");
        } else {
            this._$panel.find(".aggsRow").addClass("xc-hidden");
        }
    }

    private _updateUDFSection(): void {
        if (this._activeNode instanceof DagNodeMap && this._activeNode.getUsedUDFModules().size > 0) {
            this._$panel.find(".udfsRow").removeClass("xc-hidden").addClass("collapsed");
            this._$panel.find(".udfsSection").empty().addClass("xc-hidden");
        } else {
            this._$panel.find(".udfsRow").addClass("xc-hidden");
        }
    }

    private _updateDescriptionSection(): void {
        if (this._activeNode.getDescription()) {
            this._$panel.find(".descriptionRow").removeClass("xc-hidden");
            this._$panel.find(".descriptionSection").text(this._activeNode.getDescription());
        } else {
            this._$panel.find(".descriptionRow").addClass("xc-hidden");
        }
    }

    private _updateSubGraphSection(): void {
        if (this._activeNode instanceof DagNodeCustom) {
            const subNodes: Map<string, DagNode> = this._activeNode.getSubGraph().getAllNodes();
            let nodeNames: string[] = [];
            subNodes.forEach((node) => {
                if (node instanceof DagNodeCustomInput ||
                    node instanceof DagNodeCustomOutput) {
                    return;
                }
                nodeNames.push(node.getDisplayNodeType());
            });
            if (nodeNames.length) {
                this._$panel.find(".subGraphSection").text(nodeNames.join(", "));
                this._$panel.find(".subGraphRow").removeClass("xc-hidden");
                this._$panel.find(".configRow").addClass("xc-hidden");
            } else {
                this._$panel.find(".subGraphRow").addClass("xc-hidden");
                this._$panel.find(".configRow").removeClass("xc-hidden");
            }
        } else {
            this._$panel.find(".configRow").removeClass("xc-hidden");
            this._$panel.find(".subGraphRow").addClass("xc-hidden");
        }
    }

    private _renderRestoreButton(): void {
        if (!(this._activeNode instanceof DagNodeDataset)) {
            return;
        }
        const node: DagNodeDataset = <DagNodeDataset>this._activeNode;
        const dsName: string = node.getDSName();
        if (DS.getDSObj(dsName) != null) {
            return;
        }
        const html: HTML = '<div class="row restore">' +
                                '<div>' +
                                    '<span class="action xc-action">' + DSTStr.Restore + '</span>' +
                                    '<i class="icon xi-restore action xc-action"></i>' +
                                    '<i class="hint qMark icon xi-unknown"' +
                                    ' data-toggle="tooltip"' +
                                    ' data-container="body"' +
                                    ' data-placement="top"' +
                                    ' data-title="' + TooltipTStr.RestoreDS + '"' +
                                    '>' +
                                '</div>' +
                            '</div>';
        const $section: JQuery = this._$panel.find(".nodeInfoSection");
        $section.find(".row.restore").remove();
        $section.prepend(html);
    }

    private _restoreDataset(): void {
        const node: DagNodeDataset = <DagNodeDataset>this._activeNode;
        const shareDS: boolean = DagViewManager.Instance.getActiveTab() instanceof DagTabPublished;
        DS.restoreSourceFromDagNode([node], shareDS);
    }

    private _viewUDFs() {
        // Show the loading message
        this._$panel.find(".udfsSection").removeClass("xc-hidden");
        this._$panel.find(".udfsSection").html(this._genLoadingHTML())

        // Call API to get resolutions
        this._getUDFResolution(<DagNodeMap>this._activeNode, DagViewManager.Instance.getActiveTab())
        .then((udfRes) => {
            const convertedMap: Map<string, string> = new Map();
            udfRes.forEach((path, moduleName) => {
                convertedMap.set(moduleName, UDFFileManager.Instance.nsPathToDisplayPath(path));
            });
            return convertedMap;
        })
        .then((udfRes) => {
            // Show the resolution info.
            this._$panel.find(".udfsSection").html(this._genUDFHTML(udfRes));
        })
        .fail(() => {
            // Show the error message
            this._$panel.find(".udfsSection").html(this._genErrorHTML());
        });
    }

    private _getUDFResolution(dagNode: DagNodeMap, activeTab: DagTab): XDPromise<Map<string, string>> {
        if (activeTab instanceof DagTabPublished) {
            return activeTab.getNodeUDFResolution(dagNode);
        } else {
            return dagNode.getModuleResolutions();
        }
    }

    private _genLoadingHTML(): HTML {
        return `<p class="message">${StatusMessageTStr.Loading}</p>`;
    }

    private _genErrorHTML(): HTML {
        return `<p class="message">${StatusMessageTStr.Error}</p>`;
    }

    private _genUDFHTML(udfInfo: Map<string, string>): HTML {
        let html = '';
        udfInfo.forEach((resolution, moduleName) => {
            html +=
                `<div class="row">
                    <div class="subRow">
                        <div class="label">Module:</div>
                        <div title="${moduleName}" class="type value">${moduleName}</div>
                    </div>
                    <div class="subRow">
                        <div class="label">Resolution:</div>
                        <div title="${resolution}" class="field value">${resolution}</div>
                    </div>
                </div>`;
        });
        return html;
    }
}
