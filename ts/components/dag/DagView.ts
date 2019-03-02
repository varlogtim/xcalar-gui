class DagView {
    private $dfArea: JQuery;
    private dagTab: DagTab;
    private tabId: string;
    private graph: DagGraph;

    public static horzPadding = 200;
    public static vertPadding = 100;
    public static nodeHeight = 28;
    public static nodeWidth = 103;
    public static gridSpacing = 20;
    public static zoomLevels = [.25, .5, .75, 1, 1.5, 2];
    public static iconOrder = ["descriptionIcon", "lockIcon", "aggregateIcon", "paramIcon"];
    public static iconMap = {
        "descriptionIcon": "\ue966",
        "lockIcon": "\ue940",
        "aggregateIcon": "\ue939",
        "paramIcon": "\ue9ea"
    };

    private containerSelector: string = "#dagView";
    private static $dagView: JQuery;
    private static $dfWrap: JQuery;
    private static _$operatorBar: JQuery;

    private static horzNodeSpacing = 140;// spacing between nodes when auto-aligning
    private static vertNodeSpacing = 60;
    private static gridLineSize = 12;
    private static titleLineHeight = 11;
    public static inConnectorWidth = 6;
    private lockedNodeIds = {};
    private static dagEventNamespace = 'DagView';

    private isSqlPreview = false;
    private _isFocused: boolean;

    constructor($dfArea: JQuery, graph: DagGraph, containerSelector: string, dagTab?: DagTab) {
        this.$dfArea = $dfArea;
        this.graph = graph;
        this.dagTab = dagTab || DagTabManager.Instance.getTabById(graph.getTabId());
        this.containerSelector = containerSelector;
    }

    public static setup() {
        DagView.$dagView = $("#dagView");
        DagView.$dfWrap = DagView.$dagView.find(".dataflowWrap");
        DagView._$operatorBar = DagView.$dagView.find(".operatorWrap");
    }

    private static lineFunction: Function = d3.svg.line()
                                            .x(function (d) { return d.x; })
                                            .y(function (d) { return d.y; })
                                            .interpolate("cardinal");

    public static getAutoAlignPositions(graph: DagGraph): {
        nodeInfos: NodeMoveInfo[],
        maxX: number,
        maxY: number
    } {
        const nodes: DagNode[] = graph.getSortedNodes();
        let treeGroups = {};
        let seen = {};
        for (let i = nodes.length - 1; i >= 0; i--) {
            if (nodes[i].getChildren().length === 0) {
                // group nodes into trees
                DagView._splitIntoTrees(nodes[i], seen, treeGroups, i);
            }
        }

        let startingWidth: number = 0;
        const allNodeInfos = [];
        let overallMaxDepth = 0;

        for (let i in treeGroups) {
            const group = treeGroups[i];
            const nodes = {};
            DagView._alignNodes(group[0], nodes, startingWidth);
            for (let j = 0; j < group.length; j++) {
                if (group[j].getParents().length === 0) {
                    // adjust positions of nodes so that children will never be
                    // to the left of their parents
                    DagView._adjustPositions(group[j], nodes, {});
                }
            }
            let maxDepth = 0;
            let maxWidth = 0;
            let minDepth = 0;
            for (let j in nodes) {
                maxDepth = Math.max(nodes[j].depth, maxDepth);
                minDepth = Math.min(nodes[j].depth, minDepth);
                maxWidth = Math.max(nodes[j].width, maxWidth);
            }
            overallMaxDepth = Math.max(maxDepth - minDepth, overallMaxDepth);

            for (let j in nodes) {
                allNodeInfos.push({
                    type: "dagNode",
                    id: j,
                    position: {
                        x: ((maxDepth - nodes[j].depth) * DagView.horzNodeSpacing) + (DagView.gridSpacing * 2),
                        y: (nodes[j].width * DagView.vertNodeSpacing) + (DagView.gridSpacing * 2)
                    }
                });
            }
            startingWidth = (maxWidth + 1);
        }
        const graphHeight = DagView.vertNodeSpacing * (startingWidth - 1) + DagView.gridSpacing;
        const graphWidth = DagView.horzNodeSpacing * overallMaxDepth + DagView.gridSpacing;
        let maxX = graphWidth;
        let maxY = graphHeight;
        const comments = graph.getAllComments();
        comments.forEach((comment) => {
            const pos = comment.getPosition();
            const dimensions = comment.getDimensions();
            maxX = Math.max(maxX, pos.x + dimensions.width);
            maxY = Math.max(maxY, pos.y + dimensions.height);
        });
        return {
            nodeInfos: allNodeInfos,
            maxX: maxX,
            maxY: maxY
        }
    }

    public updateOperationTime(isCurrent: boolean = false): void {
        if (!this.isFocused()) {
            return;
        }

        const timeStr: string = this._getOperationTime();
        let text: string = "";
        if (timeStr != null) {
            let title: string = CommonTxtTstr.LastOperationTime;
            if (isCurrent || this.graph.getExecutor() != null) {
                title = CommonTxtTstr.OperationTime;
            }
            text = title + ": " + timeStr;
        }
        StatusMessage.updateLocation(true, text); // update operation time
    }

    public static newSQLFunc(numInput) {
        DagTabManager.Instance.newSQLFunc();
        // add input
        const base: number = 40;
        const inc: number = 80;
        for (let i = 0; i < numInput; i++) {
            let x: number = base;
            let y: number = base + i * inc;
            DagViewManager.Instance.autoAddNode(DagNodeType.SQLFuncIn, null, null, null, x, y);
        }

        // add output
        const numIncSpace = 10;
        let x = base + inc * numIncSpace;
        let y = base + inc * (numInput - 1) / 2;
        DagViewManager.Instance.autoAddNode(DagNodeType.SQLFuncOut, null, null, null, x, y);
    }

    /**
     * DagView.newTabFromSource
     * @param type
     * @param config
     */
    public static newTabFromSource(type: DagNodeType, config: any) {
        try {
            MainMenu.openPanel("dagPanel");
            let tabId: string = DagTabManager.Instance.newTab();
            let position: number = DagView.gridSpacing * 2;
            let node: DagNode = DagViewManager.Instance.autoAddNode(type, null, null, config,
                position, position);
            if (node != null) {
                DagNodeMenu.execute("configureNode", {
                    node: node,
                    exitCallback: () => {
                        DagViewManager.Instance.removeNodes([node.getId()], tabId);
                    }
                });
            }
        } catch (e) {
            console.error(e);
        }
    }

    public static getSkewText(skew) {
        return ((skew == null || isNaN(skew))) ? "N/A" : String(skew);
    }

        /**
     * Cleanup job after a tab is closed
     * @param graph
     * @description
     * #1 Remove all event handlers listening on the DagGraph associated with the closed tab
     * #2 ...
     */
    public static cleanupClosedTab(graph: DagGraph) {
        try {
            if (graph != null) {
                graph.events.off(`.${DagView.dagEventNamespace}`);
            }
        } catch(e) {
            console.error(e);
        }
    }

    public static selectNode($node: JQuery): void {
        $node.addClass("selected");
        if ($node.hasClass("operator")) {
            DagView._setSelectedStyle($node);
        }
    }

    public static deselectNode($node) {
        $node.removeClass("selected");
        $node.find(".selection").remove();
    }


    /**
     * DagView.addNodeIcon adds a small icon and reorders other icons to fit the new one in
     * @param $node
     * @param iconType
     * @param tooltip
     */
    public static addNodeIcon($node: JQuery, iconType: string, tooltip: string) {
        let left: number;
        let top: number;
        if (iconType === "tableIcon") {
            top = 1;
            left = DagView.nodeWidth - 19;
            drawIcon(iconType, left, top, "\uea07", tooltip, -1);
        } else {
            const icons = $node.data("icons") || [];
            if (icons.indexOf(iconType) > -1) {
                return;
            } else {
                icons.push(iconType);
            }
            // sort icons in order of DagView.iconOrder
            icons.sort(function(a, b) {
                return DagView.iconOrder.indexOf(a) - DagView.iconOrder.indexOf(b);
            });
            $node.find(".nodeIcon").remove();
            // store the icon order
            $node.data("icons", icons);
            top = DagView.nodeHeight;
            for (let i = 0; i < icons.length; i++) {
                if (icons[i] === iconType) {
                    drawIcon(icons[i], (i * 15 )+ 22, top, DagView.iconMap[iconType], xcHelper.escapeDblQuoteForHTML(tooltip), i);
                    $node.data(iconType.toLowerCase(), tooltip);
                } else {
                    let tip: string = $node.data(icons[i].toLowerCase())
                    drawIcon(icons[i], (i * 15 )+ 22, top, DagView.iconMap[icons[i]], tip, i);
                }
            }
        }

        function drawIcon(iconType, left, top, icon, tooltip, index) {
            let text: string = icon;
            let fontSize: number = 7;
            let iconTop: number = 3;
            if (iconType === "paramIcon") {
                text = "<>";
                iconTop = 2;
            }
            if (iconType === "aggregateIcon") {
                fontSize = 6;
            }

            const g = d3.select($node.get(0)).append("g")
            .attr("class", iconType + " nodeIcon index" + index)
            .attr("transform", `translate(${left}, ${top})`);
            g.append("circle")
                .attr("cx", 3.5)
                .attr("cy", 0)
                .attr("r", 6)
                .style("fill", "#849CB0");
            g.append("text")
                .attr("font-family", "icomoon")
                .attr("font-size", fontSize)
                .attr("fill", "white")
                .attr("x", 0)
                .attr("y", iconTop)
                .text(function (_d) {return text});

            xcTooltip.add($node.find("." + iconType), {
                title: tooltip
            });
        }
    }

    /**
     * removes icon and repositions other icons
     * @param $node
     * @param iconType
     */
    public static removeNodeIcon($node: JQuery, iconType: string) {
        const $icon: JQuery = $node.find("." + iconType);
        if (!$icon.length) {
            return;
        }
        let icons = $node.data("icons");
        let index = icons.indexOf(iconType);
        $icon.remove();
        $node.data("icons", icons);
        $node.removeData(iconType.toLowerCase());

        // shift all following icons to the left;
        for (let i = index + 1; i < icons.length; i++) {
            let left = ((i - 1) * 15) + 22;
            d3.select($node.find(`.nodeIcon.index${i}`).get(0))
                .attr("transform", `translate(${left}, ${DagView.nodeHeight})`)
                .attr("class", icons[i] + " nodeIcon index" + (i - 1));
        }
        icons.splice(index, 1);
    }

    private static _dagLineageTipTemplate(x, y, text): HTML {
        return '<div class="dagTableTip lineageTip" ' +
            'style="left:' + x + 'px;top:' + y + 'px;">' +
            '<div>' + text + '</div>' +
            '</div>';
    }

    private static _getSkewInfo(name, rows, skew, totalRows, inputSize): {
        name: string,
        value: number,
        text: string,
        color: string,
        rows: number[],
        totalRows: number,
        size: number
    } {
        const skewText = DagView.getSkewText(skew);
        const skewColor = DagView.getSkewColor(skewText);
        return {
            name: name,
            value: skew,
            text: skewText,
            color: skewColor,
            rows: rows,
            totalRows: totalRows,
            size: inputSize
        };
    }

    public static getSkewColor(skewText: string) {
        if (skewText === "N/A") {
            return "";
        }
        const skew: number = Number(skewText);
        /*
            0: hsl(104, 100%, 33)
            25%: hsl(50, 100%, 33)
            >= 50%: hsl(0, 100%, 33%)
        */
        let h = 104;
        if (skew <= 25) {
            h = 104 - 54 / 25 * skew;
        } else if (skew <= 50) {
            h = 50 - 2 * (skew - 25);
        } else {
            h = 0;
        }
        return 'hsl(' + h + ', 100%, 33%)';
    }


    private static _getGeometryInfo(posList: Coordinate[]): {
        centroid: Coordinate,
        max: Coordinate,
        min: Coordinate
    } {
        const centroid = { x: 0, y: 0 };
        const max = { x: 0, y: 0 };
        const min = { x: null, y: null };

        if (posList == null || posList.length === 0) {
            return {
                centroid: centroid, max: max, min: min
            };
        }

        let sumX = 0;
        let sumY = 0;
        for (const { x, y } of posList) {
            max.x = Math.max(max.x, x);
            max.y = Math.max(max.y, y);
            min.x = min.x == null ? x : Math.min(min.x, x);
            min.y = min.y == null ? y : Math.min(min.y, y);
            sumX += x;
            sumY += y;
        }
        const len = posList.length;
        centroid.x = Math.floor(sumX / len);
        centroid.y = Math.floor(sumY / len);

        return {
            centroid: centroid, max: max, min: min
        }
    }

    private static _createCustomNode(
        dagNodeInfos,
        connection: DagSubGraphConnectionInfo
    ): {
            node: DagNodeCustom,
            connectionIn: NodeConnection[],
            connectionOut: NodeConnection[]
        } {
        const customNode = new DagNodeCustom();
        const nodeIdMap = new Map<DagNodeId, DagNodeId>();

        // Create sub graph
        const dagNodes = dagNodeInfos.map((nodeInfo) => {
            nodeInfo = xcHelper.deepCopy(nodeInfo);
            const newNode = customNode.getSubGraph().newNode(nodeInfo);
            nodeIdMap.set(nodeInfo.nodeId, newNode.getId());
            return newNode;
        });

        const dagMap = new Map<string, DagNode>();
        for (const dagNode of dagNodes) {
            dagMap.set(dagNode.getId(), dagNode);
        }

        // Restore internal connections
        const newInnerConnection = connection.inner.map((connection) => {
            return {
                parentId: nodeIdMap.get(connection.parentId),
                childId: nodeIdMap.get(connection.childId),
                pos: connection.pos
            };
        });
        customNode.getSubGraph().restoreConnections(newInnerConnection);

        // Setup input
        const inputConnection: NodeConnection[] = [];
        for (const connectionInfo of connection.in) {
            const inPortIdx = customNode.addInputNode({
                node: dagMap.get(nodeIdMap.get(connectionInfo.childId)),
                portIdx: connectionInfo.pos
            });
            if (connectionInfo.parentId != null) {
                // parentId could be null, in case the connection has been deleted
                inputConnection.push({
                    parentId: connectionInfo.parentId,
                    childId: customNode.getId(),
                    pos: inPortIdx
                });
            }
        }
        // Assign input ports to input ends. One port per parent.
        for (const inNodeId of connection.endSets.in) {
            const node = dagMap.get(nodeIdMap.get(inNodeId));
            // if multi-parents case, assign one port by default
            const numMaxParents = node.getMaxParents() < 0 ? 1 : node.getMaxParents();
            let pos = node.getNextOpenConnectionIndex();
            while (pos >= 0 && pos < numMaxParents) {
                customNode.addInputNode({
                    node: node,
                    portIdx: pos
                });
                pos = node.getNextOpenConnectionIndex();
            }
        }

        // Setup output
        const outputConnection: NodeConnection[] = [];
        if (connection.out.length > 0) {
            // Output nodes with children outside
            const outConnection = connection.out[0]; // We dont support multiple outputs now
            customNode.addOutputNode(
                dagMap.get(nodeIdMap.get(outConnection.parentId)),
                0 // We dont support multiple output now, so set to zero
            );
            outputConnection.push({
                parentId: customNode.getId(),
                childId: outConnection.childId,
                pos: outConnection.pos
            });
        } else if (connection.endSets.out.size > 0) {
            // Potential output nodes without child
            const nodeId = Array.from(connection.endSets.out)[0]; // We dont support multiple outputs now
            customNode.addOutputNode(
                dagMap.get(nodeIdMap.get(nodeId)),
                0 // We dont support multiple output now, so set to zero
            );
        }

        return {
            node: customNode,
            connectionIn: inputConnection,
            connectionOut: outputConnection
        };
    }

    private static _setSelectedStyle($operators: JQuery): void {
        $operators.each(function() {
            const $operator = $(this);
            if ($operator.find('.selection').length > 0) {
                return;
            }
            const rect = d3.select($operator[0]).insert('rect', ':first-child');
            rect.classed('selection', true);
            rect.attr('x', '-3')
            .attr('y', '-5')
            .attr('width', DagView.nodeWidth + 5)
            .attr('height', DagView.nodeHeight + 10)
            .attr('fill', 'rgba(150, 225, 255, 0.2)')
            .attr('stroke', 'rgba(0, 188, 255, 0.78)')
            .attr('stroke-width', '1')
            .attr('rx', '16')
            .attr('ry', '43');
        });
    }

    private static _calculateDimensions(
        dimensions: Dimensions, elCoors: Coordinate
    ): Dimensions {
        return {
            width: Math.max(elCoors.x + DagView.horzPadding, dimensions.width),
            height: Math.max(elCoors.y + DagView.vertPadding, dimensions.height)
        };
    }

        // sets endpoint to have depth:0, width:0. If endpoint is a join,
    // then left parent will have depth:1, width:0 and right parent will have
    // depth: 1, width: 1 and so on.
    private static _alignNodes(node, seen, width) {
        let greatestWidth = width;
        _alignHelper(node, 0, width);

        function _alignHelper(node, depth, width) {
            const nodeId = node.getId();
            if (seen[nodeId] != null) {
                return;
            }
            seen[nodeId] = {
                depth: depth,
                width: width
            };

            greatestWidth = Math.max(width, greatestWidth);
            const parents = node.getParents();

            let numParentsDrawn = 0;
            for (let i = 0; i < parents.length; i++) {
                if (!parents[i]) {
                    continue;
                }
                if (seen[parents[i].getId()] != null) {
                    numParentsDrawn++;
                }
            }

            for (let i = 0; i < parents.length; i++) {
                if (parents[i] != null &&
                    seen[parents[i].getId()] == null) {
                    let newWidth;
                    if (numParentsDrawn === 0) {
                        newWidth = width;
                    } else {
                        newWidth = greatestWidth + 1;
                    }
                    _alignHelper(parents[i], depth + 1, newWidth);
                    numParentsDrawn++;
                }
            }
            const children = node.getChildren();

            let numChildrenDrawn = 0;
            for (let i = 0; i < children.length; i++) {
                if (seen[children[i].getId()] != null) {
                    numChildrenDrawn++;
                }
            }

            for (let i = 0; i < children.length; i++) {
                if (seen[children[i].getId()] == null) {
                    let newWidth;
                    if (numChildrenDrawn === 0) {
                        newWidth = width;
                    } else {
                        newWidth = greatestWidth + 1;
                    }
                    _alignHelper(children[i], depth - 1, newWidth);
                    numChildrenDrawn++;
                }
            }
        }
    }

    // adjust positions of nodes so that children will never be
    // to the left of their parents
    private static _adjustPositions(node, nodes, seen) {
        seen[node.getId()] = true;
        const children = node.getChildren();
        for (let i = 0; i < children.length; i++) {
            let diff = nodes[node.getId()].depth - nodes[children[i].getId()].depth;
            let adjustmentNeeded = false;
            if (diff <= 0) {
                let adjustment = diff - 1;
                nodes[children[i].getId()].depth += adjustment;
                adjustmentNeeded = true;
            }
            if (adjustmentNeeded || seen[children[i].getId()] == null) {
                this._adjustPositions(children[i], nodes, seen);
            }
        }
    }

     // groups individual nodes into trees and joins branches with main tree
    private static _splitIntoTrees(node, seen, treeGroups, groupId) {
        const treeGroup = {};
        formTreesHelper(node);
        function formTreesHelper(node) {
            const id = node.getId();
            if (treeGroup[id]) { // already done
                return;
            }

            if (seen[id] != null) { // we've encountered this node and it's
                // part of another group so lets join its children to that group
                const mainGroupId = seen[id];
                if (groupId === mainGroupId) {
                    // already part of the same tree
                    return;
                }
                for (let i in treeGroup) {
                    seen[i] = mainGroupId; // reassigning nodes from current
                    // group to the main group that has the id of "mainGroupId"
                    let mainGroup = treeGroups[mainGroupId];
                    mainGroup.push(treeGroup[i]);
                }
                delete treeGroups[groupId];
                groupId = mainGroupId;
                return;
            }
            treeGroup[id] = node;
            seen[id] = groupId;
            if (!treeGroups[groupId]) {
                treeGroups[groupId] = [];
            }
            treeGroups[groupId].push(node);

            const parents = node.getParents();
            for (let i = 0; i < parents.length; i++) {
                if (parents[i] != null) {
                    formTreesHelper(parents[i]);
                }
            }
        }
    }

     /**
     * DagView.render
     *
     *  // restore/dredraw dataflow dimensions and nodes,
        // add connections separately after so all node elements already exist
        // adds event listeners
     */
    public render($dfArea?: JQuery, graph?: DagGraph, noEvents?: boolean): void {
        this.$dfArea = $dfArea || this.$dfArea;
        if (this.$dfArea.hasClass("rendered")) {
            return;
        }
        this.graph = graph || this.graph;
        this.tabId = this.graph.getTabId();

        this.$dfArea.empty().html(
            '<div class="dataflowAreaWrapper">' +
            '<div class="commentArea"></div>' +
            '<svg class="edgeSvg"></svg>' +
            '<svg class="operatorSvg"></svg>' +
            '</div>'
        );
        const dimensions = this.graph.getDimensions();
        const scale = this.graph.getScale();
        const $wrapper: JQuery = this.$dfArea.find(".dataflowAreaWrapper");
        if (dimensions.width > -1) {
            $wrapper.css("min-height", dimensions.height * scale);
            $wrapper.css("min-width", dimensions.width * scale);
            $wrapper.css("background-size", DagView.gridLineSize * scale);
        }
        $wrapper.children().css("transform", "scale(" + scale + ")");

        const nodes: Map<DagNodeId, DagNode> = this.graph.getAllNodes();

        nodes.forEach((node: DagNode) => {
            this._drawNode(node);
            this._addProgressTooltipForNode(node);
        });
        nodes.forEach((node: DagNode, nodeId: DagNodeId) => {
            node.getParents().forEach((parentNode, index) => {
                const parentId: DagNodeId = parentNode.getId();
                this._drawConnection(parentId, nodeId, index, node.canHaveMultiParents());
            });
        });

        const comments: Map<CommentNodeId, CommentNode> = this.graph.getAllComments();

        comments.forEach((commentNode: CommentNode) => {
            DagComment.Instance.drawComment(commentNode, this.$dfArea);
        });
        if (!noEvents) { // used in sql preview graph
            this._setupGraphEvents();
        }

        this.$dfArea.addClass("rendered");
    }

    public newGraph(): void {
        this._setupGraphEvents();
    }


    /**
     * DagView.addBackNodes
     * @param nodeIds
     * @param tabId
     * @param sliceInfo?
     * used for undoing/redoing operations
     */
    public addBackNodes(
        nodeIds: DagNodeId[],
        spliceInfo?,
        identifiers?
    ): XDPromise<void> {
        spliceInfo = spliceInfo || {};
        identifiers = identifiers || {};

        this.dagTab.turnOffSave();
        // need to add back nodes in the reverse order they were deleted
        this.deselectNodes();
        let maxXCoor: number = 0;
        let maxYCoor: number = 0;
        const nodes = [];
        let hasLinkOut: boolean = false;
        this.graph.turnOnBulkStateSwitch();
        for (let i = nodeIds.length - 1; i >= 0; i--) {
            const nodeId: DagNodeId = nodeIds[i];
            let node;
            if (nodeId.startsWith("dag")) {
                node = this.graph.addBackNode(nodeId, spliceInfo[nodeId]);
                const childrenNodes = node.getChildren();
                childrenNodes.forEach((childNode) => {
                    childNode.setIdentifiers(identifiers[childNode.getId()]);
                });
                if (node instanceof DagNodeDFOut) {
                    hasLinkOut = true;
                }
                const coors = node.getPosition();
                maxXCoor = Math.max(coors.x, maxXCoor);
                maxYCoor = Math.max(coors.y, maxYCoor);
            } else if (nodeId.startsWith("comment")) {
                node = this.graph.addBackComment(nodeId);
                const coors = node.getPosition();
                const dimensions = node.getDimensions();
                maxXCoor = Math.max(coors.x + dimensions.width, maxXCoor);
                maxYCoor = Math.max(coors.y + dimensions.height, maxYCoor);
            }
            nodes.push(node);
        }
        this.graph.turnOffBulkStateSwitch();
        const dagNodes = nodes.filter(node => {
            return node.getId().startsWith("dag");
        });

        const comments = nodes.filter(node => {
            return node.getId().startsWith("comment");
        });

        this._drawAndConnectNodes(dagNodes);

        for (let i = 0; i < comments.length; i++) {
            DagComment.Instance.drawComment(comments[i], this.$dfArea, true);
        }

        this._setGraphDimensions({ x: maxXCoor, y: maxYCoor });

        if (hasLinkOut) {
            this.checkLinkInNodeValidation();
        }
        this.dagTab.turnOnSave();
        return this.dagTab.save();
    }

      /**
     * DagView.run
     * // run the entire dag,
     * // if no nodeIds passed in then it will execute all the nodes
     */
    public run(nodeIds?: DagNodeId[], optimized?: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        this._canRun()
            .then(() => {
                return this._runValidation(nodeIds, optimized);
            })
            .then(() => {
                return this.graph.execute(nodeIds, optimized);
            })
            .then(() => {
                if (UserSettings.getPref("dfAutoPreview") === true &&
                    nodeIds != null &&
                    nodeIds.length === 1
                ) {
                    const node: DagNode = this.graph.getNode(nodeIds[0]);
                    if (node != null &&
                        !node.isOutNode() &&
                        node.getState() === DagNodeState.Complete
                    ) {
                        DagViewManager.Instance.viewResult(node, this.tabId);
                    }
                }
                deferred.resolve();
            })
            .fail((error) => {
                if (error && error.error === "cancel") {
                    deferred.reject(error);
                    return;
                }
                if (error && error.hasError && error.node) {
                    const nodeId: DagNodeId = error.node.getId();
                    const $node: JQuery = this._getNode(nodeId);
                    DagTabManager.Instance.switchTab(this.tabId);
                    StatusBox.show(error.type, $node);
                } else if (error) {
                    DagTabManager.Instance.switchTab(this.tabId);
                    if (error.hasError && error.type) {
                        error = error.type;
                    }
                    Alert.error(null, error);
                }
                deferred.reject(error);
            });

        return deferred.promise();
    }

       /**
     * DagView.unlockNode
     * @param nodeId
     */
    public unlockNode(nodeId: DagNodeId): void {
        this._getNode(nodeId).removeClass("locked");
        delete this.lockedNodeIds[nodeId];
        let hasLockedSiblings = false;
        if (Object.keys(this.lockedNodeIds).length) {
            hasLockedSiblings = true;
        }
        if (!hasLockedSiblings) {
            if (this.graph != null) {
                this.graph.unsetGraphNoDelete();
            }
        }
        DagNodeInfoPanel.Instance.update(nodeId, "lock");
    }

    /**
     * DagView.lockNode
     * @param nodeId
     */
    public lockNode(nodeId: DagNodeId): string {
        this._getNode(nodeId).addClass("locked");
        this.lockedNodeIds[nodeId] = true;
        this.graph.setGraphNoDelete();
        DagNodeInfoPanel.Instance.update(nodeId, "lock");
        return this.tabId;
    }

    /**
     * DagView.isNodeLocked
     * @param nodeId
     * @param tabId
     */
    public isNodeLocked(nodeId: DagNodeId): boolean {
        return this.lockedNodeIds[nodeId];
    }

      /**
     * DagView.pasteNodes
     *  finds new position for cloned nodes, adds to dagGraph and UI
     */
    public pasteNodes(nodeInfos): XDPromise<void> {
        if (!nodeInfos.length) {
            return PromiseHelper.reject();
        }
        if (this.dagTab instanceof DagTabPublished) {
            // cannot modify shared dag
            return PromiseHelper.reject();
        }

        this.deselectNodes();

        let minXCoor: number = this.$dfArea.width();
        let minYCoor: number = this.$dfArea.height();
        let maxXCoor: number = 0;
        let maxYCoor: number = 0;

        nodeInfos.forEach((nodeInfo) => {
            minYCoor = Math.min(nodeInfo.display.y, minYCoor);
            if (nodeInfo.display.y === minYCoor) {
                minXCoor = Math.min(nodeInfo.display.x, minXCoor);
            }
            if (nodeInfo.display.height && nodeInfo.display.width) {
                maxXCoor = Math.max(nodeInfo.display.x + nodeInfo.display.width, maxXCoor);
                maxYCoor = Math.max(nodeInfo.display.y + nodeInfo.display.height, maxYCoor);
            } else {
                maxXCoor = Math.max(nodeInfo.display.x, maxXCoor);
                maxYCoor = Math.max(nodeInfo.display.y, maxYCoor);
            }
        });

        let origMinXCoor = minXCoor;
        let origMinYCoor = minYCoor;
        minXCoor += (DagView.gridSpacing * 5);
        minYCoor += (DagView.gridSpacing * 2);
        const nextAvailablePosition = this._getNextAvailablePosition(null,
            minXCoor, minYCoor);
        minXCoor = nextAvailablePosition.x;
        minYCoor = nextAvailablePosition.y;

        let xDelta = minXCoor - origMinXCoor;
        let yDelta = minYCoor - origMinYCoor;
        maxXCoor += xDelta;
        maxYCoor += yDelta;

        const newNodeIds: DagNodeId[] = [];
        const allNewNodeIds: DagNodeId[] = [];
        const oldNodeIdMap = {};
        const allNewNodes = [];
        const nodeToRemove: bolean[] = [];

        this.dagTab.turnOffSave();

        try {
            let isSQLFunc = (this.dagTab instanceof DagTabSQLFunc);
            nodeInfos.forEach((nodeInfo) => {
                nodeInfo = xcHelper.deepCopy(nodeInfo);
                nodeInfo.display.x += xDelta;
                nodeInfo.display.y += yDelta;
                if (nodeInfo.hasOwnProperty("text")) {
                    const commentInfo = {
                        text: nodeInfo.text,
                        display: nodeInfo.display
                    };
                    const commentNode = this.graph.newComment(commentInfo);
                    allNewNodeIds.push(commentNode.getId());
                    DagComment.Instance.drawComment(commentNode, this.$dfArea, true);
                    allNewNodes.push(commentNode);
                } else if (nodeInfo.hasOwnProperty("input")) {
                    // remove parents so that when creating
                    // the new node, we don't provide a parent that doesn't exist or
                    // the parentId of the original node
                    // since this is a deep copy, nodeInfos still has the parents
                    delete nodeInfo.parents;
                    const newNode: DagNode = this.graph.newNode(nodeInfo);
                    let nodeType: DagNodeType = newNode.getType();
                    if (nodeType == DagNodeType.Aggregate &&
                        newNode.getState() == DagNodeState.Configured) {
                        newNode.beErrorState(xcHelper.replaceMsg(ErrWRepTStr.AggConflict, {
                            name: newNode.getParam().dest,
                            aggPrefix: ""
                        }));
                    }
                    const newNodeId: DagNodeId = newNode.getId();
                    oldNodeIdMap[nodeInfo.nodeId] = newNodeId;
                    newNodeIds.push(newNodeId);
                    allNewNodeIds.push(newNodeId);
                    allNewNodes.push(newNode);
                    // filter out invalid case
                    let toRemove: boolean = false;
                    if (isSQLFunc) {
                        if (!DagTabSQLFunc.isValidNode(newNode)) {
                            toRemove = true;
                        }
                    } else {
                        if (nodeType === DagNodeType.SQLFuncIn ||
                            nodeType === DagNodeType.SQLFuncOut
                        ) {
                            toRemove = true;
                        }
                    }

                    if (toRemove) {
                        this.graph.removeNode(newNode.getId(), false);
                    } else {
                        this._drawNode(newNode, true);
                    }
                    nodeToRemove.push(toRemove);
                }
            });
            if (!allNewNodeIds.length) {
                this.dagTab.turnOnSave();
                return PromiseHelper.reject();
            }

            // restore connection to parents
            const nodesMap: Map<DagNodeId, DagNode> = new Map();
            allNewNodeIds.forEach((newNodeId: DagNodeId, i) => {
                if (newNodeId.startsWith("comment")) {
                    return;
                }
                if (nodeInfos[i].parents && !nodeToRemove[i]) {
                    const newNode = allNewNodes[i];
                    nodeInfos[i].parents.forEach((parentId, j) => {
                        if (parentId == null) {
                            return; // skip empty parent slots
                        }
                        const newParentId = oldNodeIdMap[parentId];
                        if (this.graph.hasNode(newParentId) &&
                            newParentId !== newNodeId) {
                            try {
                                this.graph.connect(newParentId, newNodeId, j, false, false);
                                nodesMap.set(newNode.getId(), newNode);
                                this._drawConnection(newParentId, newNodeId, j, newNode.canHaveMultiParents());
                            } catch (e) {
                                console.error(e);
                            }
                        }
                    });

                    nodesMap.set(newNode.getId(), newNode);
                }
            });
            this.graph.checkNodesState(nodesMap);
            // XXX scroll to selection if off screen
            this._setGraphDimensions({ x: maxXCoor, y: maxYCoor });

            Log.add(SQLTStr.CopyOperations, {
                "operation": SQLOps.CopyOperations,
                "dataflowId": this.tabId,
                "nodeIds": allNewNodeIds
            });
            this.dagTab.turnOnSave();
            return this.dagTab.save();
        } catch (error) {
            this.dagTab.turnOnSave();
            throw(error);
        }
    }

    public deselectNodes(): void {
        const $selected = this.$dfArea.find(".selected");
        $selected.removeClass("selected");
        $selected.find(".selection").remove();
    }


    /**
     * DagView.newNode
     * @param dagId
     * @param nodeInfo
     */
    public newNode(nodeInfo: DagNodeInfo): DagNode {
        this.dagTab.turnOffSave();

        const node: DagNode = this.graph.newNode(nodeInfo);
        this._addNodeNoPersist(node);
        DagNodeInfoPanel.Instance.show(node);

        this.dagTab.turnOnSave();
        this.dagTab.save();
        return node;
    }


    /**
     * DagView.newComment
     */
    public newComment(
        commentInfo: CommentInfo,
        isFocus?: boolean
    ): XDPromise<void> {
        this.dagTab.turnOffSave();
        commentInfo.display.x = Math.max(0,
            Math.round(commentInfo.display.x / DagView.gridSpacing) * DagView.gridSpacing);
        commentInfo.display.y = Math.max(0,
            Math.round(commentInfo.display.y / DagView.gridSpacing) * DagView.gridSpacing);
        const commentNode = this.graph.newComment(commentInfo);
        let isSelect = false;
        if (isFocus) {
            isSelect = true;
        }
        DagComment.Instance.drawComment(commentNode, this.$dfArea, isSelect, isFocus);
        const dimensions = {
            x: commentNode.getPosition().x + commentNode.getDimensions().width,
            y: commentNode.getPosition().y + commentNode.getDimensions().height
        };
        this._setGraphDimensions(dimensions);
        Log.add(SQLTStr.NewComment, {
            "operation": SQLOps.NewComment,
            "dataflowId": this.tabId,
            "commentId": commentNode.getId()
        });
        this.dagTab.turnOnSave();
        return this.dagTab.save();
    }



    /**
     * DagView.removeNode
     * @param nodeId
     *  removes node from DagGraph, remove $element, connection lines, update
     * connector classes
     */
    public removeNodes(nodeIds: DagNodeId[]): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        this.dagTab.turnOffSave();
        const nodeIdsMap = this.lockedNodeIds || {};
        for (let i = 0; i < nodeIds.length; i++) {
            if (nodeIdsMap[nodeIds[i]]) {
                nodeIds.splice(i, 1);
                i--;
            }
        }
        //always resolves
        this._removeNodesNoPersist(nodeIds)
        .then((ret) => {
            let promise = PromiseHelper.resolve();
            let shouldSave: boolean = false;
            if (ret == null) {
                promise = PromiseHelper.reject();
            } else {
                if (ret.retinaErrorNodeIds && ret.retinaErrorNodeIds.length) {
                    StatusBox.show("Could not remove some nodes due to optimized dataflow in progress.", DagView.$dfWrap);
                }
                if (ret.hasLinkOut) {
                    this.checkLinkInNodeValidation();
                }
                shouldSave = true;
            }
            this.dagTab.turnOnSave();
            if (shouldSave) {
                return this.dagTab.save();
            } else {
                return promise;
            }
        })
        .then(deferred.resolve)
        .then(deferred.reject);

        return deferred.promise();
    }



    /**
     * DagView.copyNodes
     * @param nodeIds
     */
    public copyNodes(nodeIds: DagNodeId[]): string {
        if (!nodeIds.length) {
            return "";
        }
        return JSON.stringify(this._createNodeInfos(nodeIds, null, {
            clearState: true,
            includeTitle: false
        }), null, 4);
    }

     /**
     * DagView.cutNodes
     * @param nodeIds
     */
    public cutNodes(nodeIds: DagNodeId[]): string {
        const nodeIdsMap = this.lockedNodeIds || {};
        for (let i = 0; i < nodeIds.length; i++) {
            if (nodeIdsMap[nodeIds[i]]) {
                nodeIds.splice(i, 1);
                i--;
            }
        }
        if (!nodeIds.length) {
            return;
        }

        const nodesStr = JSON.stringify(this._createNodeInfos(nodeIds, null, {
            clearState: true,
            includeTitle: false
        }), null, 4);
        this.removeNodes(nodeIds);
        return nodesStr;
    }

    public hasOptimizedNode(nodeIds?: DagNodeId[]): boolean {
        if (nodeIds) {
            for (let i = 0; i < nodeIds.length; i++) {
                const $node = this._getNode(nodeIds[i]);
                if ($node.data("subtype") === DagNodeSubType.DFOutOptimized ||
                    $node.data("subtype") === DagNodeSubType.ExportOptimized) {
                    return true;
                }
            }
        } else {
            if (this.$dfArea.find('.operator[data-subtype="' + DagNodeSubType.DFOutOptimized + '"]').length > 0 ||
                this.$dfArea.find('.operator[data-subtype="' + DagNodeSubType.ExportOptimized + '"]').length > 0) {
                return true;
            }
        }

        return false;
    }


    /**
   * DagView.disconnect
   * @param parentNodeId
   * @param childNodeId
   * removes connection from DagGraph, connection line, updates connector classes
   */
    public disconnectNodes(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number
    ): XDPromise<void> {
        this.dagTab.turnOffSave();

        const $edge: JQuery = this.$dfArea.find('.edge[data-parentnodeid="' +
            parentNodeId +
            '"][data-childnodeid="' +
            childNodeId +
            '"][data-connectorindex="' +
            connectorIndex + '"]');

        // Currently only used by SQL node but can be extended for other nodes
        const childNode = this.graph.getNode(childNodeId);
        if (childNode == null) {
            return PromiseHelper.reject();
        }
        const identifiers = childNode.getIdentifiers();
        let setNodeConfig;
        if (childNode.getType() === DagNodeType.Set) {
            let param = childNode.getParam();
            setNodeConfig = param.columns[connectorIndex];
        }
        const wasSpliced = this.graph.disconnect(parentNodeId, childNodeId, connectorIndex);
        this._removeConnection($edge, childNodeId);
        Log.add(SQLTStr.DisconnectOperations, {
            "operation": SQLOps.DisconnectOperations,
            "dataflowId": this.tabId,
            "parentNodeId": parentNodeId,
            "childNodeId": childNodeId,
            "connectorIndex": connectorIndex,
            "wasSpliced": wasSpliced,
            "identifiers": identifiers,
            "setNodeConfig": setNodeConfig
        });

        this.dagTab.turnOnSave();
        return this.dagTab.save();
    }


    public autoAlign(): void {
        const nodePositionInfo = DagView.getAutoAlignPositions(this.graph);

        this.moveNodes(nodePositionInfo.nodeInfos, {
            x: nodePositionInfo.maxX + DagView.horzPadding,
            y: nodePositionInfo.maxY + DagView.vertPadding
        });
    }



    /**
     * DagView.autoAddNode
     * @param parentNodeId
     * @param newType
     * @description
     * adds node to dataflow graph by automatically determining position
     * 1. get parent node to determine position of new node
     * 2. use DagView.newNode to create the new node
     * 3. connect new node to parent node
     */
    public autoAddNode(
        newType: DagNodeType,
        subType?: DagNodeSubType,
        parentNodeId?: DagNodeId,
        input?: object,
        x?: number,
        y?: number,
    ): DagNode {
        let logActions = [];
        let parentNode: DagNode;
        let nextAvailablePosition: Coordinate;
        let connectToParent: boolean = false;
        let originalCoorsProvided = (x != null && y != null);
        let originalCoors = {
            x: x || DagView.gridSpacing,
            y: y || DagView.gridSpacing
        };
        let nodeInfo = {
            type: newType,
            subType: subType,
            input: input,
            display: originalCoors
        };
        this.dagTab.turnOffSave();
        const node: DagNode = this.graph.newNode(nodeInfo);
        const addLogParam: LogParam = this._addNodeNoPersist(node, { isNoLog: true });
        logActions.push(addLogParam.options);

        if (parentNodeId) {
            parentNode = this.graph.getNode(parentNodeId);
            if (parentNode == null) {
                this.dagTab.turnOnSave();
                this.dagTab.save();
                return null;
            }
            if (parentNode.getMaxChildren() !== 0 && !node.isSourceNode()) {
                connectToParent = true;
            }
            if (parentNode.getType() === DagNodeType.Sort &&
                (newType !== DagNodeType.Export &&
                    newType !== DagNodeType.PublishIMD)) {
                // do not encourage connecting to sort node if next node
                // is not an export or publish
                connectToParent = false;
            }
        }
        if (!originalCoorsProvided) {
            if (connectToParent) {
                const position: Coordinate = parentNode.getPosition();
                x = x || (position.x + DagView.horzNodeSpacing);
                y = y || (position.y + DagView.vertNodeSpacing * parentNode.getChildren().length);
            } else {
                const scale = this.graph.getScale();
                x = x || Math.round((this.$dfArea.scrollLeft() + (this.$dfArea.width() / 2)) /
                    scale / DagView.gridSpacing) * DagView.gridSpacing - DagView.gridSpacing;
                y = y || Math.round((this.$dfArea.scrollTop() + (this.$dfArea.height() / 2)) /
                    scale / DagView.gridSpacing) * DagView.gridSpacing - DagView.gridSpacing;
            }
        }
        nextAvailablePosition = this._getNextAvailablePosition(node.getId(), x, y);

        if (nextAvailablePosition.x !== originalCoors.x ||
            nextAvailablePosition.y !== originalCoors.y) {
            const nodeMoveInfo: NodeMoveInfo[] = [{
                id: node.getId(),
                type: "dagNode",
                position: nextAvailablePosition,
                oldPosition: originalCoors
            }];
            const moveLogParam = this._moveNodesNoPersist(
                nodeMoveInfo,
                null,
                { isNoLog: true }
            );
            logActions.push(moveLogParam.options);
        }

        if (connectToParent) {
            const connectLogParam = this._connectNodesNoPersist(
                parentNodeId,
                node.getId(),
                0,
                { isNoLog: true}
            );
            logActions.push(connectLogParam.options);
        }
        Log.add("Add Operation", {
            operation: SQLOps.DagBulkOperation,
            actions: logActions,
            dataflowId: this.tabId
        });
        this.dagTab.turnOnSave();
        this.dagTab.save();
        return node;
    }

    public getAllNodes(includeComments?: boolean): JQuery {
        let $nodes = this.$dfArea.find(".operator");
        if (includeComments) {
            $nodes = $nodes.add(this.$dfArea.find(".comment"));
        }
        return $nodes;
    }

    public getSelectedNodes(
        includeSelecting?: boolean,
        includeComments?: boolean
    ): JQuery {
        let selector = ".operator.selected";
        if (includeSelecting) {
            selector += ", .operator.selecting";
        }
        if (includeComments) {
            selector += ", .comment.selected";
            if (includeSelecting) {
                selector += ", .comment.selecting";
            }
        }
        return this.$dfArea.find(selector);
    }


    public getSelectedNodeIds(
        includeSelecting?: boolean,
        includeComments?: boolean
    ): DagNodeId[] {
        const $nodes: JQuery = this.getSelectedNodes(includeSelecting,
            includeComments);
        const nodeIds = [];
        $nodes.each(function () {
            nodeIds.push($(this).data("nodeid"));
        });
        return nodeIds;
    }


    public viewOptimizedDataflow(dagNode: DagNode): XDPromise<void> {
        if (!dagNode || !(dagNode instanceof DagNodeOutOptimizable)) {
            return PromiseHelper.reject("Invalid node");
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const retinaId = gRetinaPrefix + this.tabId + "_" + dagNode.getId();
        if (DagTabManager.Instance.getTabById(retinaId)) {
            DagTabManager.Instance.switchTab(retinaId);
            deferred.resolve();
        } else {
            const tabName = this.dagTab.getName();
            let dfOutName: string = dagNode instanceof DagNodeDFOut ?
                            dagNode.getParam().name : "export";
            let newTabName: string = tabName + " " + dfOutName + " optimized";
            const retinaTab = new DagTabOptimized({id: retinaId, name: newTabName});
            DagTabManager.Instance.loadTab(retinaTab)
            .then(() => {
                DagTabManager.Instance.switchTab(retinaId);
                deferred.resolve();
            })
            .fail((e) => {
                if (typeof e === "object" && e.status === StatusT.StatusRetinaNotFound) {
                    e = DFTStr.OptimizedDFNotExist;
                }
                Alert.error(DFTStr.OptimizedDFUnavailable, e);
                deferred.reject(e);
            });
        }

        return deferred.promise();
    }


    /**
     *
     * @param nodeIds
     * if no nodeIds passed, will reset all
     */
    public reset(nodeIds?: DagNodeId[]): void {
        const msg: string = nodeIds ? DagTStr.ResetMsg : DagTStr.ResetAllMsg;

        Alert.show({
            title: DagTStr.Reset,
            msg: msg,
            onConfirm: () => {
                this.dagTab.turnOffSave();
                this.graph.reset(nodeIds);
                this.dagTab.turnOnSave();
                this.dagTab.save();
            }
        });
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
        const node: DagNode = this.graph.getNode(nodeId);
        if (node == null) {
            return PromiseHelper.reject();
        }
        const oldText: string = node.getDescription();
        this.dagTab.turnOffSave();

        node.setDescription(text);
        // event will trigger a description UI

        Log.add(SQLTStr.EditDescription, {
            "operation": SQLOps.EditDescription,
            "dataflowId": this.tabId,
            "oldDescription": oldText,
            "newDescription": text,
            "nodeId": nodeId
        });
        this.dagTab.turnOnSave();
        return this.dagTab.save();
    }

      /**
     * DagView.cancel
     * // cancel entire run or execution
     */
    public cancel() {
        this.graph.cancelExecute();
    }

    public highlightLineage(nodeId: DagNodeId, childNodeId?: DagNodeId, type?: string): void {
        const $node = this._getNode(nodeId);
        const node = this.graph.getNode(nodeId);
        if (node == null) {
            return;
        }

        $node.addClass("lineageSelected");
        if (childNodeId) {
            const $edge: JQuery = this.$dfArea.find('.edge[data-parentnodeid="' +
                nodeId +
                '"][data-childnodeid="' +
                childNodeId +
                '"]');
            $edge.addClass("lineageSelected");
        }
        let tipText = "";
        if (type === "rename") {
            tipText = CommonTxtTstr.Renamed;
        } else if (type === "add" || node.getNumParent() === 0) {
            tipText = CommonTxtTstr.Created;
        } else if (type === "remove") {
            tipText = CommonTxtTstr.Removed;
        }
        if (tipText) {
            const scale = this.graph.getScale();
            const pos = node.getPosition();
            const x = scale * (pos.x + 50) - 21;
            const y = Math.max(1, scale * pos.y - 25);
            let tip: HTML = DagView._dagLineageTipTemplate(x, y, tipText);
            this.$dfArea.append(tip);
        }
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
        const connectionInfo: DagSubGraphConnectionInfo
            = this.graph.getSubGraphConnection(nodeIds);
        // Validate the sub graph
        if (connectionInfo.openNodes.length > 0) {
            // The selected node set cannot build a close sub graph
            const errNodeId = connectionInfo.openNodes[0];
            StatusBox.show(DagTStr.CustomOpIncomplete, this._getNode(errNodeId));
            return PromiseHelper.reject('Selected operator set is open');
        }
        if ((connectionInfo.out.length + connectionInfo.endSets.out.size) > 1) {
            // We only support one output for now
            const errNodeId = connectionInfo.out.length > 0
                ? connectionInfo.out[0].parentId
                : Array.from(connectionInfo.endSets.out)[0];
            StatusBox.show(DagTStr.CustomOpTooManyOutput, this._getNode(errNodeId));
            return PromiseHelper.reject('too many output');
        }
        const excludeNodeTypes = new Set([DagNodeType.DFIn, DagNodeType.DFOut]);
        for (const nodeId of nodeIds) {
            // Cannot wrap these types of nodes inside a custom operator
            let node: DagNode = this.graph.getNode(nodeId);
            if (node != null &&
                (excludeNodeTypes.has(node.getType()) ||
                node instanceof DagNodeOutOptimizable
            )) {
                StatusBox.show(DagTStr.CustomOpTypeNotSupport, this._getNode(nodeId));
                return PromiseHelper.reject('Type not support');
            }
        }
        try {
            // Turn off KVStore saving for better performance
            this.dagTab.turnOffSave();

            // Create customNode from selected nodes
            const nodeInfos = this._createNodeInfos(nodeIds);
            const {
                node: customNode,
                connectionIn: newConnectionIn,
                connectionOut: newConnectionOut
            } = DagView._createCustomNode(nodeInfos, connectionInfo);

            // Position custom operator
            const nodePosList = nodeInfos.map((nodeInfo) => ({
                x: nodeInfo.display.x,
                y: nodeInfo.display.y
            }));
            const geoInfo = DagView._getGeometryInfo(nodePosList);
            customNode.setPosition(geoInfo.centroid);
            // Position custom OP input nodes
            for (const inputNode of customNode.getInputNodes()) {
                const childGeoInfo = DagView._getGeometryInfo(
                    inputNode.getChildren().map((child) => child.getPosition())
                );
                inputNode.setPosition({
                    x: childGeoInfo.min.x - DagView.horzNodeSpacing,
                    y: childGeoInfo.centroid.y
                });
            }
            // Position custom OP output nodes
            for (const outputNode of customNode.getOutputNodes()) {
                const parentGeoInfo = DagView._getGeometryInfo(
                    outputNode.getParents().reduce((res, parent) => {
                        if (parent != null) {
                            res.push(parent.getPosition());
                        }
                        return res;
                    }, [])
                );
                outputNode.setPosition({
                    x: parentGeoInfo.max.x + DagView.horzNodeSpacing,
                    y: parentGeoInfo.centroid.y
                });
            }
            // Re-position all nodes in sub graph
            const subNodeGeoInfo = DagView._getGeometryInfo(customNode.getSubNodePositions());
            const deltaPos = {
                x: DagView.gridSpacing * 2 - subNodeGeoInfo.min.x,
                y: DagView.gridSpacing * 2 - subNodeGeoInfo.min.y
            };
            customNode.changeSubNodePostions(deltaPos);

            // Re-calculate sub graph dimensions
            let graphDimensions = customNode.getSubGraph().getDimensions();
            for (const nodePos of customNode.getSubNodePositions()) {
                graphDimensions = DagView._calculateDimensions(graphDimensions, nodePos);
            }
            customNode.getSubGraph().setDimensions(
                graphDimensions.width, graphDimensions.height);

            // Add customNode to DagView
            const customLogParam: LogParam = {
                title: SQLTStr.CreateCustomOperation,
                options: {
                    operation: SQLOps.DagBulkOperation,
                    actions: [],
                    dataflowId: this.tabId
                }
            };
            this.graph.addNode(customNode);
            const addLogParam = this._addNodeNoPersist(customNode, { isNoLog: true });
            customLogParam.options.actions.push(addLogParam.options);

            // Delete selected nodes
            const deferred: XDDeferred<void> = PromiseHelper.deferred();

            // always resolves
            this._removeNodesNoPersist(nodeIds,
                { isNoLog: true, isSwitchState: false }
            )
            .then(({logParam: removeLogParam, spliceInfos}) => {
                customLogParam.options.actions.push(removeLogParam.options);

                // Create a set, which contains all nodes splicing parent index
                const splicingNodeSet: Set<string> = new Set();
                Object.keys(spliceInfos).forEach((removedNodeId) => {
                    const relatedSpliceInfo = spliceInfos[removedNodeId];
                    Object.keys(relatedSpliceInfo).forEach((relatedNodeId) => {
                        if (relatedSpliceInfo[relatedNodeId]) {
                            splicingNodeSet.add(relatedNodeId);
                        }
                    });
                });

                // Connections to customNode
                for (const { parentId, childId, pos } of newConnectionIn) {
                    const connectLogParam = this._connectNodesNoPersist(
                        parentId,
                        childId,
                        pos,
                        { isNoLog: true, isSwitchState: false }
                    );
                    customLogParam.options.actions.push(connectLogParam.options);
                }
                for (const { parentId, childId, pos } of newConnectionOut) {
                    const needSplice = splicingNodeSet.has(childId);
                    const connectLogParam = this._connectNodesNoPersist(
                        parentId,
                        childId,
                        pos,
                        { isNoLog: true, isSwitchState: false, spliceIn: needSplice }
                    );
                    customLogParam.options.actions.push(connectLogParam.options);
                }

                // Restore the state
                const nodeStates: Map<string, number> = new Map();
                for (const nodeInfo of nodeInfos) {
                    const state = nodeInfo.state || DagNodeState.Unused;
                    const count = nodeStates.get(state) || 0;
                    nodeStates.set(state, count + 1);
                }
                const completeCount = nodeStates.get(DagNodeState.Complete) || 0;
                if (completeCount > 0 && completeCount === nodeInfos.length) {
                    // All nodes are in complete state, so set the CustomNode to complete
                    customNode.beCompleteState();
                } else {
                    customNode.switchState();
                }

                Log.add(customLogParam.title, customLogParam.options);

                // Turn on KVStore saving
                this.dagTab.turnOnSave();
                return this.dagTab.save();
            })
            .then(() => {
                deferred.resolve();
            })
            .fail(deferred.reject);

            return deferred.promise();
        } catch (e) {
            this.dagTab.turnOnSave();
            return PromiseHelper.reject(e);
        }
    }

      /**
     * Expand the Custom node into a sub graph in place for editing purpose
     * @param nodeId
     */
    public expandCustomNode(nodeId: DagNodeId): XDPromise<void> {
        const dagNode = this.graph.getNode(nodeId);
        if (dagNode == null) {
            return PromiseHelper.reject(`${nodeId} not exist`);
        }
        if (dagNode instanceof DagNodeCustom) {
            return this._expandSubgraphNode({
                dagNode: dagNode,
                logTitle: SQLTStr.ExpandCustomOperation,
                getInputParent: (node) => dagNode.getInputParent(node),
                isInputNode: (node) => (node instanceof DagNodeCustomInput),
                isOutputNode: (node) => (node instanceof DagNodeCustomOutput)
            });
        } else {
            return PromiseHelper.reject(`${nodeId} is not a Custom operator`);
        }
    }

    private _expandSubgraphNode(args: {
        dagNode: SubgraphContainerNode,
        logTitle: string,
        getInputParent: (node: any) => DagNode,
        isInputNode: (node: DagNode) => boolean,
        isOutputNode: (node: DagNode) => boolean
        preExpand?: () => void,
        isPreAutoAlign?: boolean,
    }): XDPromise<void> {
        const {
            dagNode, logTitle, getInputParent, isInputNode, isOutputNode,
            preExpand = () => { }, isPreAutoAlign = false,
        } = args;

        if (this.dagTab == null) {
            return PromiseHelper.reject(`DagTab(${this.tabId}) not exist`);
        }

        try {
            this.dagTab.turnOffSave();
            preExpand();
            const subGraph = dagNode.getSubGraph();
            const allSubNodes = subGraph.getAllNodes();
            const expandNodeIds: string[] = [];
            const expandLogParam: LogParam = {
                title: logTitle,
                options: {
                    operation: SQLOps.DagBulkOperation,
                    actions: [],
                    dataflowId: this.tabId
                }
            };
            const dagIds = [];
            allSubNodes.forEach(dagNode => {
                dagIds.push(dagNode.getId());
            });
            const connections: NodeConnection[] = [];
            const dagInfoList = this._createNodeInfos(dagIds, subGraph, {includeStats: true});
            const oldNodeIdMap = {};
            const newAggregates: AggregateInfo[] = [];
            dagInfoList.forEach((dagNodeInfo: DagNodeInfo) => {
                if (dagNodeInfo.type == DagNodeType.Aggregate) {
                    let aggParam = dagNodeInfo.input;
                    if (aggParam.dest != "" && !DagAggManager.Instance.hasAggregate(this.dagTab.getId(), aggParam.dest)) {
                        let agg: string = aggParam.dest;
                        if (agg[0] == gAggVarPrefix) {
                            agg = agg.substr(1);
                        }
                        agg = DagAggManager.Instance.wrapAggName(this.dagTab.getId(), agg);
                        newAggregates.push({
                            value: null,
                            dagName: agg,
                            aggName: aggParam.dest,
                            tableId: null,
                            backColName: null,
                            op: null,
                            node: null,
                            graph: this.tabId
                        });
                    }
                }
            })
            DagAggManager.Instance.bulkAdd(newAggregates);
            const aggNodeUpdates: Map<string, string> = new Map<string, string>();
            dagInfoList.forEach((dagNodeInfo: DagNodeInfo) => {
                const parents: DagNodeId[] = dagNodeInfo.parents;
                const oldNodeId = dagNodeInfo["nodeId"];
                dagNodeInfo.graph = this.graph;
                const node: DagNode = DagNodeFactory.create(dagNodeInfo);
                const nodeId: string = node.getId();
                oldNodeIdMap[oldNodeId] = nodeId;
                // Figure out connections
                if (isInputNode(node)) {
                    return;
                } else if (isOutputNode(node)) {
                    dagNode.getChildren().forEach((child) => {
                        child.findParentIndices(dagNode).forEach((i) => {
                            connections.push({
                                parentId: parents[0],
                                childId: child.getId(),
                                pos: i
                            });
                        });
                    });
                    return;
                } else {
                    for (let i = 0; i < parents.length; i++) {
                        let parentNode = subGraph.getNode(parents[i]);
                        if (isInputNode(parentNode)) {
                            parentNode = getInputParent(parentNode);
                        }
                        if (parentNode == null) {
                            continue;
                        }
                        connections.push({
                            parentId: parentNode.getId(),
                            childId: nodeId,
                            pos: i
                        });
                    }
                }
                // Add sub nodes to graph
                expandNodeIds.push(nodeId);
                this.graph.addNode(node);
                if (node.getType() == DagNodeType.Aggregate) {
                    // Update agg dagId
                    let aggName: string = DagAggManager.Instance.wrapAggName(this.dagTab.getId(), node.getParam().dest);
                    aggNodeUpdates.set(aggName, node.getId());
                }
                const addLogParam = this._addNodeNoPersist(node, {
                    isNoLog: true
                });
                expandLogParam.options.actions.push(addLogParam.options);
                this._addProgressTooltipForNode(node);
            });

            DagAggManager.Instance.updateNodeIds(aggNodeUpdates);
            const deferred: XDDeferred<void> = PromiseHelper.deferred();

            // remove the container node from graph
            // always resolves
            this._removeNodesNoPersist(
                [dagNode.getId()],
                { isNoLog: true, isSwitchState: false })
            .then(({ logParam: removeLogParam, spliceInfos }) => {
                expandLogParam.options.actions.push(removeLogParam.options);

                // Create a set, which contains all nodes splicing parent index
                const splicingNodeSet: Set<string> = new Set();
                Object.keys(spliceInfos).forEach((removedNodeId) => {
                    const relatedSpliceInfo = spliceInfos[removedNodeId];
                    Object.keys(relatedSpliceInfo).forEach((relatedNodeId) => {
                        if (relatedSpliceInfo[relatedNodeId]) {
                            splicingNodeSet.add(relatedNodeId);
                        }
                    });
                });

                // restore edges
                for (const { parentId, childId, pos } of connections) {
                    const newParentId = oldNodeIdMap[parentId] || parentId;
                    const needSplice = splicingNodeSet.has(childId);
                    const connectLogParam = this._connectNodesNoPersist(
                        newParentId,
                        childId,
                        pos,
                        { isNoLog: true, spliceIn: needSplice, isSwitchState: false }
                    );
                    expandLogParam.options.actions.push(connectLogParam.options);
                }

                // Stretch the graph to fit the expanded nodes
                const autoAlignPos: Map<string, Coordinate> = new Map();
                if (isPreAutoAlign) {
                    for (const posInfo of DagView.getAutoAlignPositions(subGraph).nodeInfos) {
                        const nodeId = oldNodeIdMap[posInfo.id];
                        if (nodeId != null) {
                            autoAlignPos.set(nodeId, Object.assign({}, posInfo.position));
                        }
                    }
                }
                const moveInfo = this._getExpandPositions(
                    dagNode.getPosition(),
                    expandNodeIds,
                    autoAlignPos
                );
                const moveLogParam = this._moveNodesNoPersist(
                    moveInfo.nodePosInfos,
                    null,
                    { isNoLog: true }
                );
                expandLogParam.options.actions.push(moveLogParam.options);

                Log.add(expandLogParam.title, expandLogParam.options);
                this.dagTab.turnOnSave();
                return this.dagTab.save();
            })
            .then(deferred.resolve)
            .fail(deferred.reject);
            return deferred.promise();
        } catch (e) {
            console.error(e);
            this.dagTab.turnOnSave();
            return PromiseHelper.reject(e);
        }
    }

    private _getExpandPositions(
        sourceNodeCoord: Coordinate,
        expandNodeIds: (DagNodeId | CommentNodeId)[],
        prePositionMap: Map<string, Coordinate> = new Map()
    ): {
            nodePosInfos: NodeMoveInfo[], maxX: number, maxY: number
        } {
        const result = { nodePosInfos: [], maxX: 0, maxY: 0 };
        const expandNodeIdSet = new Set(expandNodeIds);

        // Get all the nodes' position info in the target graph
        const allNodePosInfos: NodeMoveInfo[] = [];
        const origNodePositions: Coordinate[] = [];
        const expandNodePositions: Coordinate[] = [];
        this.graph.getAllNodes().forEach((node) => {
            const nodeId = node.getId();
            const nodePos = prePositionMap.has(nodeId)
                ? Object.assign({}, prePositionMap.get(nodeId))
                : Object.assign({}, node.getPosition());

            allNodePosInfos.push({
                id: nodeId,
                type: 'dagNode',
                position: nodePos
            });
            if (expandNodeIdSet.has(nodeId)) {
                expandNodePositions.push(nodePos);
            } else {
                origNodePositions.push(nodePos);
            }
        });
        this.graph.getAllComments().forEach((node) => {
            const nodeId = node.getId();
            const nodePos = prePositionMap.has(nodeId)
                ? Object.assign({}, prePositionMap.get(nodeId))
                : Object.assign({}, node.getPosition());

            allNodePosInfos.push({
                id: nodeId,
                type: 'comment',
                position: nodePos
            });
            if (expandNodeIdSet.has(nodeId)) {
                expandNodePositions.push(nodePos);
            } else {
                origNodePositions.push(nodePos);
            }
        });

        // Calculate geometry information before expanding
        const origGeoInfo = DagView._getGeometryInfo(
            [sourceNodeCoord].concat(origNodePositions)
        );

        // Calculate geometry infomation of expanded nodes
        const expandGeoInfo = DagView._getGeometryInfo(expandNodePositions);

        const expandDimensions: Dimensions = {
            width: expandGeoInfo.max.x - expandGeoInfo.min.x,
            height: expandGeoInfo.max.y - expandGeoInfo.min.y
        };

        // Calculate the new positions
        const expandDeltaX = sourceNodeCoord.x - expandGeoInfo.centroid.x;
        const expandDeltaY = sourceNodeCoord.y - expandGeoInfo.centroid.y;
        const deltaX = Math.floor(expandDimensions.width / 2);
        const deltaY = Math.floor(expandDimensions.height / 2);
        for (const posInfo of allNodePosInfos) {
            const newPosInfo: NodeMoveInfo = {
                id: posInfo.id, type: posInfo.type, position: {
                    x: 0, y: 0
                }
            };
            if (expandNodeIdSet.has(posInfo.id)) {
                // Position the expand nodes according to the position of source node
                newPosInfo.position.x = posInfo.position.x + expandDeltaX;
                newPosInfo.position.y = posInfo.position.y + expandDeltaY;
            } else {
                // Position other nodes according to the geometry size of expaned nodes
                if (posInfo.position.x >= sourceNodeCoord.x) {
                    newPosInfo.position.x = posInfo.position.x + deltaX;
                } else {
                    newPosInfo.position.x = posInfo.position.x - deltaX;
                }
                if (posInfo.position.y >= sourceNodeCoord.y) {
                    newPosInfo.position.y = posInfo.position.y + deltaY;
                } else {
                    newPosInfo.position.y = posInfo.position.y - deltaY;
                }
            }
            result.nodePosInfos.push(newPosInfo);
        }

        // Shift the positions, so that nobody is out of bound
        const newGeoInfo = DagView._getGeometryInfo(result.nodePosInfos.map((info) => info.position));
        const shiftDeltaX = origGeoInfo.min.x - newGeoInfo.min.x;
        const shiftDeltaY = origGeoInfo.min.y - newGeoInfo.min.y;
        for (const posInfo of result.nodePosInfos) {
            posInfo.position.x += shiftDeltaX;
            posInfo.position.y += shiftDeltaY;
        }

        // Calculate the screen dimension
        result.maxX = newGeoInfo.max.x + shiftDeltaX;
        result.maxY = newGeoInfo.max.y + shiftDeltaY;

        return result;
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
        const dagNode = this.graph.getNode(nodeId);
        if (dagNode == null) {
            return PromiseHelper.reject(`Node(${nodeId}) not found`);
        }
        const newNode = DagNodeFactory.create(dagNode.getNodeCopyInfo());
        if (newNode instanceof DagNodeCustom) {
            newNode.getSubGraph().reset();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        DagCategoryBar.Instance.addOperator({
            categoryName: DagCategoryType.Custom,
            dagNode: newNode,
            isFocusCategory: true
        })
            .then((newName) => {
                if (dagNode instanceof DagNodeCustom) {
                    dagNode.setCustomName(newName);
                    const $opTitle = this._getNode(dagNode.getId()).find('.opTitle');
                    $opTitle.text(dagNode.getCustomName());
                }
            })
            .then(() => this.dagTab.save())
            .then(() => deferred.resolve())
            .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * Open a tab to show customOp's sub graph for editing
     * @param nodeId
     */
    public editCustomOperator(nodeId: DagNodeId): void {
        const dagNode = this.graph.getNode(nodeId);
        if (dagNode == null) {
            return;
        }
        if (dagNode instanceof DagNodeCustom) {
            DagTabManager.Instance.newCustomTab(dagNode);
        }
    }

    /**
     * Open a tab to show SQL sub graph for viewing purpose
     * @param nodeId
     */
    public static inspectSQLNode(
        nodeId: DagNodeId,
        tabId: string,
        sqlPreview?: boolean
    ): XDPromise<void> {
        const dagTab = DagTabManager.Instance.getTabById(tabId);
        const graph = dagTab.getGraph();
        const dagNode = graph.getNode(nodeId);
        if (dagNode == null || !(dagNode instanceof DagNodeSQL)) {
            return PromiseHelper.reject();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let subGraph = dagNode.getSubGraph();
        let promise = PromiseHelper.resolve();

        if (!subGraph) {
            const params: DagNodeSQLInputStruct = dagNode.getParam();
            if (!params.sqlQueryStr) {
                return PromiseHelper.reject(SQLErrTStr.NeedConfiguration);
            }
            const paramterizedSQL = xcHelper.replaceMsg(params.sqlQueryStr,
                DagParamManager.Instance.getParamMap(), true);
            const queryId = xcHelper.randName("sql", 8);
            promise = dagNode.compileSQL(paramterizedSQL, queryId);
        }
        promise
            .then(() => {
                DagTabManager.Instance.newSQLTab(dagNode, sqlPreview);
                const newDagView: DagView = DagViewManager.Instance.getActiveDagView();
                newDagView.autoAlign();
                deferred.resolve();
            })
            .fail(deferred.reject);
        return deferred.promise();
    }

     /**
     * Expand the SQL node into a sub graph in place for editing purpose
     * @param nodeId
     */
    public expandSQLNode(nodeId: DagNodeId): XDPromise<void> {
        const dagNode = this.graph.getNode(nodeId);
        if (dagNode == null) {
            return PromiseHelper.reject(`${nodeId} not exist`);
        }
        if (dagNode instanceof DagNodeSQL) {
            return this.expandSQLNodeInTab(dagNode);
        } else {
            return PromiseHelper.reject(`${nodeId} is not a SQL operator`);
        }
    }

      /**
     * DagView.expandSQLNodeInTab
     */
    public expandSQLNodeInTab(
        dagNode: DagNodeSQL,
        rawXcQuery: boolean = false
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let promise = PromiseHelper.resolve();
        let subGraph = dagNode.getSubGraph();
        if (!subGraph) {
            const params: DagNodeSQLInputStruct = dagNode.getParam();
            if (!params.sqlQueryStr) {
                return PromiseHelper.reject(SQLErrTStr.NeedConfiguration);
            }
            const paramterizedSQL = xcHelper.replaceMsg(params.sqlQueryStr,
                DagParamManager.Instance.getParamMap(), true);
            const queryId = xcHelper.randName("sql", 8);
            promise = dagNode.compileSQL(paramterizedSQL, queryId);
        }
        promise
            .then(() => {
                if (rawXcQuery) {
                    // give the partially optimized subgraph
                    dagNode.updateSubGraph(null, true);
                }
                return this._expandSubgraphNode({
                    dagNode: dagNode,
                    logTitle: SQLTStr.ExpandSQLOperation,
                    getInputParent: (node) => dagNode.getInputParent(node),
                    isInputNode: (node) => (node instanceof DagNodeSQLSubInput),
                    isOutputNode: (node) => (node instanceof DagNodeSQLSubOutput),
                    preExpand: () => {
                    },
                    isPreAutoAlign: true
                });
            })
            .then(deferred.resolve)
            .fail(deferred.reject)
            .always(() => {
                if (rawXcQuery) {
                    // restore the fully optimized subgraph
                    dagNode.updateSubGraph(null, false);
                }
            });

        return deferred.promise();
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
        const prevScale: number = this.graph.getScale();
        let scaleIndex: number = DagView.zoomLevels.indexOf(prevScale);
        let scale: number;
        if (scaleIndex == -1 && newScale == null) {
            for (let i = 0; i < DagView.zoomLevels.length; i++) {
                if (DagView.zoomLevels[i] > prevScale) {
                    if (isZoomIn) {
                        scaleIndex = i
                    } else {
                        scaleIndex = i-1;
                    }
                    break;
                }
            }
        }
        else if (isZoomIn) {
            scaleIndex++;
        } else {
            scaleIndex--;
        }

        if (newScale != null) {
            scale = newScale;
        }
        else if (scaleIndex < 0 || scaleIndex >= DagView.zoomLevels.length) {
            return;
        } else {
            scale = DagView.zoomLevels[scaleIndex];
        }

        this.graph.setScale(scale);
        const deltaScale: number = scale / prevScale;
        const $dfAreaWrap: JQuery = this.$dfArea.find(".dataflowAreaWrapper");
        const prevScrollTop: number = this.$dfArea.scrollTop();
        const prevScrollLeft: number = this.$dfArea.scrollLeft();
        const prevMidHeight: number = this.$dfArea.height() / 2;
        const prevMidWidth: number = this.$dfArea.width() / 2;

        $dfAreaWrap.children().css("transform", "scale(" + scale + ")");
        const dimensions = this.graph.getDimensions();
        if (dimensions.width > -1) {
            $dfAreaWrap.css("min-width", dimensions.width * scale);
            $dfAreaWrap.css("min-height", dimensions.height * scale);
        }
        $dfAreaWrap.css("background-size", DagView.gridLineSize * scale);
        // do not adjust scrolltop or scrollLeft if at 0
        if (this.$dfArea.scrollTop()) {
            const midHeight = this.$dfArea.height() / 2;
            const scrollTop = deltaScale * (prevScrollTop + prevMidHeight) -
                midHeight;
                this.$dfArea.scrollTop(scrollTop);
        }
        if (this.$dfArea.scrollLeft()) {
            const midWidth = this.$dfArea.width() / 2;
            const scrollLeft = deltaScale * (prevScrollLeft + prevMidWidth) -
                midWidth;
                this.$dfArea.scrollLeft(scrollLeft);
        }
        this.graph.getAllNodes().forEach((node) => {
            const nodeInfo = {
                position: node.getPosition()
            };
            this._repositionProgressTooltip(nodeInfo, node.getId());
        });
    }

     /**
     * Check if modification to graph/nodes should be disabled, Ex. it's showing the subGraph of a customNode
     */
    public isDisableActions(): boolean {
        return (this.dagTab instanceof DagTabCustom ||
            this.dagTab instanceof DagTabSQL ||
            this.dagTab instanceof DagTabProgress ||
            this.dagTab instanceof DagTabPublished);
    }

    public isViewOnly(): boolean {
        return this.$dfArea.hasClass("viewOnly");
    }

    public isLocked(): boolean {
        return this.$dfArea.hasClass("locked");
    }

    public addProgress(nodeId: DagNodeId): void {
        this.updateOperationTime(true);
        const g = d3.select(this.$dfArea.find('.operator[data-nodeid = "' + nodeId + '"]')[0]);
        g.selectAll(".opProgress")
            .remove(); // remove old progress
        g.append("text")
            .attr("class", "opProgress")
            .attr("font-family", "Open Sans")
            .attr("font-size", "11")
            .attr("fill", "#44515c")
            .attr("x", DagView.nodeWidth + 2)
            .attr("y", DagView.nodeHeight + 3)
            .text("0%");
    }

     // assumes every node in queryStateOuput corresponds to 1 UI node
    public calculateAndUpdateProgress(
        queryStateOutput,
        nodeId: DagNodeId
    ): void {
        const progress: number = xcHelper.getQueryProgress(queryStateOutput);
        const pct: number = Math.round(100 * progress);
        if (isNaN(pct)) {
            return;
        }
        // let tab: DagTab = this.dagTab || SQLExecutor.getTab(this.tabId);

        const node: DagNode = this.graph.getNode(nodeId);
        if (node == null) {
            return;
        }

        if (node.getType() === DagNodeType.SQL) {
            let subGraph = (<DagNodeSQL>node).getSubGraph();
            const subTabId: string = subGraph.getTabId();
            subGraph.updateProgress(xcHelper.deepCopy(queryStateOutput.queryGraph.node));

            if (subTabId) {
                subGraph.getAllNodes().forEach((node, nodeId) => {
                    const overallStats = node.getOverallStats();
                    const nodeStats = node.getIndividualStats();
                    const times: number[] = [];
                    const skewInfos = [];
                    nodeStats.forEach((nodeStat) => {
                        if (nodeStat.type !== XcalarApisT.XcalarApiDeleteObjects) {
                            const skewInfo = DagView._getSkewInfo("temp name", nodeStat.rows, nodeStat.skewValue, nodeStat.numRowsTotal, nodeStat.size);
                            skewInfos.push(skewInfo);
                        }
                        times.push(nodeStat.elapsedTime);
                    });

                    this.updateNodeProgress(nodeId, subTabId, overallStats, skewInfos, times);
                });
            }
        }

        this._updateGraphProgress(nodeId, queryStateOutput.queryGraph.node);
        const overallNodeStats = node.getOverallStats();
        const nodeStats = node.getIndividualStats();
        const times: number[] = [];
        const skewInfos = [];
        nodeStats.forEach((nodeStat) => {
            if (nodeStat.type !== XcalarApisT.XcalarApiDeleteObjects) {
                const skewInfo = DagView._getSkewInfo("temp name", nodeStat.rows, nodeStat.skewValue, nodeStat.numRowsTotal, nodeStat.size);
                skewInfos.push(skewInfo);
            }
            times.push(nodeStat.elapsedTime);
        });

        DagNodeInfoPanel.Instance.update(nodeId, "stats");
        this.updateNodeProgress(nodeId, this.tabId, overallNodeStats, skewInfos, times);
    }

      /**
     * updateNodeProgress
     * @param nodeId
     * @param tabId
     * @param progress
     * @param skewInfos
     * @param timeStrs
     * @param broadcast
     */
    public updateNodeProgress(
        nodeId: DagNodeId,
        tabId: string,
        stats: any,
        skewInfos?: any[],
        times?: number[],
        broadcast: boolean = true
    ): void {
        const $dfArea: JQuery = DagViewManager.Instance.getAreaByTab(tabId);
        const g = d3.select($dfArea.find('.operator[data-nodeid = "' + nodeId + '"]')[0]);
        let opProgress = g.select(".opProgress");
        if (opProgress.empty()) {
            DagViewManager.Instance.addProgress(nodeId, tabId);
            opProgress = g.select(".opProgress");
        }
        let pct: string;
        // TODO: show step
        // if (stats.state === DgDagStateT.DgDagStateReady) {
        //     pct = "100%";
        // } else {
        //     pct = "Step " + stats.curStep + ": " + stats.curStepPct + "%";
        // }
        if (stats.state === DgDagStateT.DgDagStateReady) {
            pct = "100%";
        } else {
            pct = stats.curStepPct + "%";
        }
        opProgress.text(pct);

        const dagTab: DagTab = DagTabManager.Instance.getTabById(tabId);
        if (skewInfos) {
            $dfArea.find('.runStats[data-id="' + nodeId + '"]').remove();
            if (dagTab == null) {
                // sql graph may not have tab registered with dagTabManager
                return;
            }
            const graph: DagGraph = dagTab.getGraph()
            const node: DagNode = graph.getNode(nodeId);
            if (node == null) {
                return;
            }

            this._addProgressTooltip(graph, node, $dfArea, skewInfos, times, stats.state);
            if (stats.state === DgDagStateT.DgDagStateReady) {
                const totalTime: number = times.reduce((a, b) => a + b, 0);
                const graph: DagGraph = dagTab.getGraph()
                let shouldUpdate: boolean = false;
                if (node instanceof DagNodeCustom) {
                    // custom node need to update till all is done
                    let subNodeCnt: number = 0;
                    node.getSubGraph().getAllNodes().forEach((node) => {
                        if (!(node instanceof DagNodeCustomInput) &&
                            !(node instanceof DagNodeCustomOutput)
                        ) {
                            subNodeCnt++;
                        }
                    });
                    if (subNodeCnt === times.length) {
                        shouldUpdate = true;
                    }
                } else {
                    shouldUpdate = true;
                }
                if (shouldUpdate) {
                    graph.updateOperationTime(totalTime);
                    const dagView: DagView = DagViewManager.Instance.getDagViewById(tabId);
                    if (dagView) {
                        dagView.updateOperationTime(true);
                    }
                }
            }
        }

        if (broadcast && dagTab instanceof DagTabPublished) {
            DagSharedActionService.Instance.broadcast(DagNodeEvents.ProgressChange, {
                nodeId: nodeId,
                tabId: tabId,
                stats: stats,
                skewInfos: skewInfos,
                times: times
            });
        }
    }

       /**
     * DagView.removeProgress
     * @param nodeId
     * @param tabId
     */
    public removeProgress(nodeId: DagNodeId): void {
        const g = d3.select(this.$dfArea.find('.operator[data-nodeid = "' + nodeId + '"]')[0]);
        g.selectAll(".opProgress")
            .remove();
    }

    // move this to DagViewSubGraph subclass
    public updateOptimizedDFProgress(queryStateOutput) {
        (<DagSubGraph>this.graph).updateProgress(queryStateOutput.queryGraph.node);

        this.graph.getAllNodes().forEach((node, nodeId) => {
            DagNodeInfoPanel.Instance.update(nodeId, "stats");
            const overallStats = node.getOverallStats();
            const nodeStats = node.getIndividualStats();

            const times: number[] = [];
            const skewInfos = [];
            nodeStats.forEach((nodeStat) => {
                if (nodeStat.type !== XcalarApisT.XcalarApiDeleteObjects) {
                    const skewInfo = DagView._getSkewInfo("temp name", nodeStat.rows, nodeStat.skewValue, nodeStat.numRowsTotal, nodeStat.size);
                    skewInfos.push(skewInfo);
                }
                times.push(nodeStat.elapsedTime);
            });

            this.updateNodeProgress(nodeId, this.tabId, overallStats, skewInfos, times);
        });
    }

    // update the node's stats in a graph
    private _updateGraphProgress(nodeId: DagNodeId, tableInfos): void {
        const node = this.graph.getNode(nodeId);
        if (node == null) {
            return;
        }
        let orderMap;
        if (node instanceof DagNodeSQL) {
            orderMap = {};
            // Use the original query to determine the order of operations.
            // Delete operation doesn't have "dest", so we use namePattern
            // and append xcDelete
            let query = JSON.parse(node.getXcQueryString());
            query.forEach((queryNode, i) => {
                if (queryNode.args.dest) {
                    orderMap[queryNode.args.dest] = i;
                } else if (queryNode.operation === XcalarApisTStr[XcalarApisT.XcalarApiDeleteObjects]) {
                    orderMap[queryNode.args.namePattern + "xcDelete"] = i;
                }
            });
        }
        const nodeIdInfos = {};
        tableInfos.forEach((tableInfo, i) => {
            // set the index of the operation
            if (orderMap) {
                let name;
                if (tableInfo.api === XcalarApisT.XcalarApiDeleteObjects) {
                    name = tableInfo.input.deleteDagNodeInput.namePattern + "xcDelete"
                } else {
                    name = tableInfo.name.name;
                }
                if (orderMap[name] != null) {
                    tableInfo.index = orderMap[name];
                }
            }
            if (tableInfo.index == null) {
                tableInfo.index = i;
            }

            const tableName = tableInfo.name.name;
            nodeIdInfos[tableName] = tableInfo;
        });

        node.updateProgress(nodeIdInfos, false, node instanceof DagNodeSQL);
        if (node instanceof DagNodeSQL) {
            node.updateSQLQueryHistory(true);
        }
    }

    public focus(): void {
        this._isFocused = true;
    }

    public unfocus(): void {
        this._isFocused = false;
    }


    public isFocused(): boolean {
        return this._isFocused;
    }

    public getGraph(): DagGraph {
        return this.graph;
    }

    public getTab(): DagTab {
        return this.dagTab;
    }

    private _getOperationTime(): string {
        const time: number = this.graph.getOperationTime();
        if (time === 0) {
            return null;
        } else {
            return xcHelper.getElapsedTimeStr(time);
        }
    }

    private _addProgressTooltip(
        graph: DagGraph,
        node: DagNode,
        $dfArea: JQuery,
        skewInfos,
        times: number[],
        state: DgDagStateT
    ): void {
        if (node instanceof DagNodeSQLSubInput ||
            node instanceof DagNodeSQLSubOutput ||
            node instanceof DagNodeCustomInput ||
            node instanceof DagNodeCustomOutput
        ) {
            return;
        }
        const pos = node.getPosition();
        let tip: HTML = this._nodeProgressTemplate(graph, node, pos.x, pos.y, skewInfos, times, state);
        const $tip = $(tip)
        $dfArea.append($tip);
        const width = Math.max($tip[0].getBoundingClientRect().width, 92);
        const nodeCenter = graph.getScale() * (pos.x + (DagView.nodeWidth / 2));
        $tip.css("left", nodeCenter - (width / 2));
    }

    private _addProgressTooltipForNode(
        node: DagNode
    ): void {
        try {
            const nodeStats = node.getIndividualStats();
            const overallStats = node.getOverallStats();
            if (nodeStats.length) {
                const skewInfos = [];
                const times: number[] = [];
                nodeStats.forEach((nodeStat) => {
                    if (nodeStat.type !== XcalarApisT.XcalarApiDeleteObjects) {
                        const skewInfo = DagView._getSkewInfo("temp name", nodeStat.rows, nodeStat.skewValue, nodeStat.numRowsTotal, nodeStat.size);
                        skewInfos.push(skewInfo);
                    }
                    times.push(nodeStat.elapsedTime);
                });
                this._addProgressTooltip(this.graph, node, this.$dfArea, skewInfos, times, overallStats.state);
                const nodeInfo = { position: node.getPosition() };
                this._repositionProgressTooltip(nodeInfo, node.getId());
            }
        } catch (e) {
            console.error(e);
        }
    }

    private _nodeProgressTemplate(
        graph: DagGraph,
        node: DagNode,
        nodeX: number,
        nodeY: number,
        skewInfos: any[],
        times: number[],
        state: DgDagStateT
    ): HTML {
        const nodeId: DagNodeId = node.getId();
        const tooltipMargin = 5;
        const tooltipPadding = 5;
        const rowHeight = 10;
        const scale = graph.getScale();
        const x = scale * (nodeX - 10);
        const y = Math.max(1, (scale * nodeY) - (rowHeight * 2 + tooltipPadding + tooltipMargin));
        let totalTime: number;
        if (times.length) {
            totalTime = times.reduce((total, num) => {
                return total + num;
            });
        } else {
            totalTime = 0;
        }

        const totalTimeStr = xcHelper.getElapsedTimeStr(totalTime);

        let hasSkewValue: boolean = false;
        let maxSkew: number | string = 0;
        skewInfos.forEach((skewInfo) => {
            const skew: number = skewInfo.value;
            if (!(skew == null || isNaN(skew))) {
                hasSkewValue = true;
                maxSkew = Math.max(skew, <number>maxSkew);
            }
        });
        if (!hasSkewValue) {
            maxSkew = "N/A";
        } else {
            maxSkew = String(maxSkew);
        }
        let skewColor: string = DagView.getSkewColor(maxSkew);
        let colorStyle = "";
        if (skewColor) {
            colorStyle = "color:" + skewColor;
        }
        let skewRows: string = "N/A";
        if (skewInfos.length) {
            skewRows = xcHelper.numToStr(skewInfos[skewInfos.length - 1].totalRows);
        }
        if (skewRows === "0" && node instanceof DagNodeExport) {
            skewRows = "N/A"; // don't show 0 for export nodes because stats
            // show 0 even though there are actually rows
        }
        let stateClass: string = DgDagStateTStr[state];

        let html = `<div data-id="${nodeId}" class="runStats dagTableTip ${stateClass}" style="left:${x}px;top:${y}px;">`;
        html += `<table>
                 <thead>
                    <th>Rows</th>
                    <th>Time</th>
                    <th>Skew</th>
                </thead>
                <tbody>
                    <tr>
                        <td>${skewRows}</td>
                        <td>${totalTimeStr}</td>
                        <td><span class="value" style="${colorStyle}">${maxSkew}</span></td>
                    </tr>
                </tbody>
                </table>
            </div>`;

        return html;
    }

    private _repositionProgressTooltip(nodeInfo, nodeId: DagNodeId): void {
        const $runStats = this.$dfArea.find('.runStats[data-id="' + nodeId + '"]');
        if ($runStats.length) {
            $runStats.addClass("visible"); // in case we can't get the dimensions
            // because user is hiding tips by default
            const infoRect = $runStats[0].getBoundingClientRect();
            const rectWidth = Math.max(infoRect.width, 92); // width can be 0 if tab is not visible
            const rectHeight = Math.max(infoRect.height, 25);
            const scale = this.graph.getScale();
            const nodeCenter = nodeInfo.position.x + 1 + (DagView.nodeWidth / 2);
            $runStats.css({
                left: scale * nodeCenter - (rectWidth / 2),
                top: Math.max(1, (scale * nodeInfo.position.y) - (rectHeight + 5))
            });
            $runStats.removeClass("visible");
        }
    }

    // always resolves
    private _removeNodesNoPersist(
        nodeIds: DagNodeId[],
        options?: {
            isSwitchState?: boolean,
            isNoLog?: boolean
        }
    ): XDPromise<{
        logParam: LogParam,
        retinaErrorNodeIds: string[],
        hasLinkOut: boolean,
        spliceInfos: {[nodeId: string]: {[nodeId: string]: boolean}}
    }> {
        const { isSwitchState = true, isNoLog = false } = options || {};
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        if (!nodeIds.length) {
            return PromiseHelper.deferred();
        }
        let aggregates: string[] = [];
        const dagNodeIds: DagNodeId[] = [];
        const commentNodeIds: CommentNodeId[] = [];
        const allIdentifiers = {};
        const spliceInfos = {};
        const removedNodeIds: string[] = [];
        const self = this;
        nodeIds.forEach((nodeId) => {
            if (nodeId.startsWith("dag")) {
                dagNodeIds.push(nodeId);
            } else {
                commentNodeIds.push(nodeId);
            }
        });

        // XXX TODO: this remove retina is async
        // so may slow down the remove operation,
        // need to improve
        this.graph.removeRetinas(dagNodeIds)
        .always((ret) => {
            let hasLinkOut: boolean = false;
            // XXX TODO: check the slowness and fix the performance
            if (isSwitchState) {
                // isSwitchState is a flag indicating the caller is handling the state switch explicitly
                // In some cases(such as creating custom node), extra nodes need to be involved in bulkStateSwitch,
                // and special requirements need to be implemented(such as maintaining running state for custom node)
                // so make this optional
                this.graph.turnOnBulkStateSwitch();
            }
            nodeIds.forEach((nodeId) => {
                if (ret.errorNodeIds.indexOf(nodeId) > -1) {
                    return;
                }
                if (nodeId.startsWith("dag")) {
                    // Remove tabs for custom OP
                    const dagNode = this.graph.getNode(nodeId);
                    if (dagNode == null) {
                        return;
                    }
                    if (dagNode instanceof DagNodeCustom ||
                        dagNode instanceof DagNodeSQL
                    ) {
                        DagTabManager.Instance.removeTabByNode(dagNode);
                    } else if (dagNode instanceof DagNodeAggregate) {
                        let input: DagNodeAggregateInputStruct = dagNode.getParam();
                        if (input.dest != null) {
                            aggregates.push(dagNode.getAggBackName());
                        }
                    }
                    dagNodeIds.push(nodeId);
                    const childrenNodes = dagNode.getChildren();
                    childrenNodes.forEach((childNode) => {
                        allIdentifiers[childNode.getId()] = childNode.getIdentifiers();
                    });
                    const spliceInfo = this.graph.removeNode(nodeId, isSwitchState);
                    const $node = this._getNode(nodeId);
                    if ($node.data("type") === DagNodeType.DFOut) {
                        hasLinkOut = true;
                    }
                    $node.remove();
                    this.$dfArea.find('.runStats[data-id="' + nodeId + '"]').remove();
                    this.$dfArea.find('.edge[data-childnodeid="' + nodeId + '"]').remove();
                    this.$dfArea.find('.edge[data-parentnodeid="' + nodeId + '"]').each(function () {
                        const childNodeId = $(this).attr("data-childnodeid");
                        self._removeConnection($(this), childNodeId);
                    });
                    spliceInfos[nodeId] = spliceInfo;
                    if (DagNodeInfoPanel.Instance.getActiveNode() &&
                        DagNodeInfoPanel.Instance.getActiveNode().getId() === nodeId) {
                        DagNodeInfoPanel.Instance.hide();
                    }
                } else {
                    this.graph.removeComment(nodeId);
                    DagComment.Instance.removeComment(nodeId);
                }
                removedNodeIds.push(nodeId);
            });
            if (isSwitchState) {
                this.graph.turnOffBulkStateSwitch();
            }
            DagAggManager.Instance.bulkNodeRemoval(aggregates);

            const logParam: LogParam = {
                title: SQLTStr.RemoveOperations,
                options: {
                    "operation": SQLOps.RemoveOperations,
                    "dataflowId": this.tabId,
                    "nodeIds": removedNodeIds,
                    "spliceInfo": spliceInfos,
                    "identifiers": allIdentifiers
                }
            };
            if (!isNoLog) {
                Log.add(logParam.title, Object.assign({}, logParam.options));
            }
            deferred.resolve({
                logParam: logParam,
                retinaErrorNodeIds: ret.errorNodeIds,
                hasLinkOut: hasLinkOut,
                spliceInfos: spliceInfos
            });
        });
        return deferred.promise();
    }


      /**
     * @description
     * listens events for 1 dag graph. This function is called for each dag graph.
     * Make sure all events listening are also registered in cleanupClosedTab !!!
     */
    private _setupGraphEvents(): void {
        // when a graph gets locked during execution
        this._registerGraphEvent(this.graph, DagGraphEvents.LockChange, (info) => {
            this.lockUnlockHelper(info);
            if (this.dagTab instanceof DagTabPublished) {
                DagSharedActionService.Instance.broadcast(DagGraphEvents.LockChange, info);
            }
            DagTopBar.Instance.setState(this.dagTab); // refresh the stop button status
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.StateChange, (info) => {
            this.updateNodeState(info);
            if (info.state !== DagNodeState.Running) {
                // running state don't need to change
                this.dagTab.save();
            }
            if (this.dagTab instanceof DagTabPublished) {
                DagSharedActionService.Instance.broadcast(DagNodeEvents.StateChange, {
                    nodeId: info.id,
                    tabId: this.tabId,
                    state: info.state
                });
            }
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.ConnectionChange, (info) => {
            if (info.descendents.length) {
                // XXX TODO only update if nodes involved in form are affected
                FormHelper.updateColumns(info);
            }
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.ParamChange, (info) => {
            const $node: JQuery = this._getNode(info.id);

            this._drawTitleText($node, info.node);
            DagView.removeNodeIcon($node, "paramIcon");
            if (info.hasParameters) {
                DagView.addNodeIcon($node, "paramIcon", "Parameter in use");
            }
            if (info.node instanceof DagNodeDFOut) {
                this.checkLinkInNodeValidation();
            }
            DagNodeInfoPanel.Instance.update(info.id, "params");
            this.$dfArea.find('.runStats[data-id="' + info.id + '"]').remove();

            this.dagTab.save()
            .then(() => {
                if (this.dagTab instanceof DagTabPublished) {
                    DagSharedActionService.Instance.broadcast(DagNodeEvents.ParamChange, {
                        tabId: this.tabId
                    });
                }
            });

            if (!info.noAutoExecute) {
                this._autoExecute(info.node);
            }
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.AutoExecute, (info) => {
            this._autoExecute(info.node);
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.LineageSourceChange, (info) => {
            this.dagTab.save();

            if (DagTable.Instance.isTableFromTab(this.tabId)) {
                const node: DagNode = info.node;
                const set = this.graph.traverseGetChildren(node);
                set.add(node);

                const bindNodeId: DagNodeId = DagTable.Instance.getBindNodeId();
                let nodeInPreview: DagNode = null;
                set.forEach((dagNode) => {
                    dagNode.getLineage().reset(); // reset all columns' lineage
                    if (dagNode.getId() === bindNodeId) {
                        nodeInPreview = dagNode;
                    }
                });
                // XXX TODO use better way to refresh the viewer
                if (nodeInPreview != null) {
                    DagTable.Instance.close();
                    DagViewManager.Instance.viewResult(nodeInPreview);
                }
            }
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.AggregateChange, (info) => {
            this._editAggregates(info.id, info.aggregates);
            DagNodeInfoPanel.Instance.update(info.id, "aggregates");
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.TableLockChange, (info) => {
            this._editTableLock(this._getNode(info.id), info.lock);
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.TableRemove, (info) => {
            const tableName: string = info.table;
            const nodeId: DagNodeId = info.nodeId;
            if (DagTable.Instance.getBindNodeId() === nodeId) {
                DagTable.Instance.close();
            }
            const node: DagNode = info.node;
            const nodeType: DagNodeType = node.getType();
            // When not link in or link out node
            if (nodeType !== DagNodeType.DFIn && nodeType !== DagNodeType.DFOut) {
                let generalTableName = tableName;
                if (tableName.includes("#")) {
                    generalTableName = tableName.split("#")[0] + "*";
                }
                DagTblManager.Instance.deleteTable(generalTableName, true, true);
                // Delete the node's table now
                var sql = {
                    "operation": SQLOps.DeleteTable,
                    "tables": [tableName],
                    "tableType": TableType.Unknown
                };
                var txId = Transaction.start({
                    "operation": SQLOps.DeleteTable,
                    "sql": sql,
                    "steps": 1,
                    "track": true
                });
                let deleteQuery: {}[] = [{
                    operation: "XcalarApiDeleteObjects",
                    args: {
                        namePattern: tableName,
                        srcType: "Table"
                    }
                }];
                XIApi.deleteTables(txId, deleteQuery, null)
                    .then(() => {
                        Transaction.done(txId, {noSql: true});
                    })
                    .fail((error) => {
                        Transaction.fail(txId, {
                            "failMsg": "Deleting Tables Failed",
                            "error": error,
                            "noAlert": true,
                            "title": "DagView"
                        });
                    });
            }
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.RetinaRemove, (info) => {
            const retinaName: string = gRetinaPrefix + this.tabId + "_" + info.nodeId;
            XcalarDeleteRetina(retinaName)
            .then(() => {
                // remove optimized dataflow tab if opened
                DagTabManager.Instance.removeTab(retinaName);
            })
            .fail((error) => {
                if (error && error.status === StatusT.StatusRetinaInUse) {
                    StatusBox.show("Could not delete optimized dataflow.  " + error.error, $("#dagView").find(".dataflowWrap"));
                }
            });
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.TitleChange, (info) => {
            // update table preview if node's title changes
            if (DagTable.Instance.isTableFromTab(this.tabId)) {
                const tableId = DagTable.Instance.getBindNodeId();
                if (tableId === this.tabId) {
                    DagTable.Instance.updateTableName(info.tabId);
                }
            }
            DagNodeInfoPanel.Instance.update(info.id, "title");
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.DescriptionChange, (info) => {
            const $node: JQuery = this._getNode(info.id);
            DagView.removeNodeIcon($node, "descriptionIcon");
            if (info.text.length) {
                $node.addClass("hasDescription");
                DagView.addNodeIcon($node, "descriptionIcon", info.text);
            } else {
                $node.removeClass("hasDescription");
            }
            DagNodeInfoPanel.Instance.update(info.id, "description");
        });

        this._registerGraphEvent(this.graph, DagGraphEvents.TurnOffSave, (_info) => {
            this.dagTab.turnOffSave();
        });

        this._registerGraphEvent(this.graph, DagGraphEvents.TurnOnSave, (_info) => {
            this.dagTab.turnOnSave();
        });

        this._registerGraphEvent(this.graph, DagGraphEvents.Save, (_info) => {
            this.dagTab.save();
        });

        this._registerGraphEvent(this.graph, DagGraphEvents.AddSQLFuncInput, (info) => {
            if (this.dagTab instanceof DagTabSQLFunc) {
                this.dagTab.addInput(info.node);
            }
        });

        this._registerGraphEvent(this.graph, DagGraphEvents.RemoveSQLFucInput, (info) => {
            if (this.dagTab instanceof DagTabSQLFunc) {
                const changedNodes: DagNodeSQLFuncIn[] = this.dagTab.removeInput(info.order);
                this._updateTitleForNodes(changedNodes);
            }
        });

        this._registerGraphEvent(this.graph, DagGraphEvents.AddBackSQLFuncInput, (info) => {
            if (this.dagTab instanceof DagTabSQLFunc) {
                const changedNodes: DagNodeSQLFuncIn[] = this.dagTab.addBackInput(info.order);
                this._updateTitleForNodes(changedNodes);
            }
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.StartSQLCompile,(_info) => {
            this._toggleCompileLock(true);
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.EndSQLCompile, (_info) => {
            this._toggleCompileLock(false);
        });

    }

    private _registerGraphEvent(
        graph: DagGraph, event: DagGraphEvents|DagNodeEvents, handler: Function
    ): void {
        if (graph == null) {
            return;
        }
        graph.events.on(`${event}.${DagView.dagEventNamespace}`, handler);
    }

    private _drawConnection(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number,
        isMultiParent: boolean, // if childNode can have multiple (> 2) parents
        newConnection?: boolean
    ): void {
        const self = this;
        const $childNode: JQuery = this._getNode(childNodeId);
        const $childConnector: JQuery = this._getChildConnector($childNode, connectorIndex);
        $childConnector.removeClass("noConnection")
            .addClass("hasConnection");

        const svg: d3 = d3.select(this.containerSelector + ' .dataflowArea[data-id="' + this.tabId + '"] .edgeSvg');

        if (isMultiParent) {
            // if re-adding an edge from a multichildnode then increment all
            // the edges that have a greater or equal index than the removed one
            // due to splice action on children array
            this.$dfArea.find('.edge[data-childnodeid="' + childNodeId + '"]').each(function () {
                const $curEdge: JQuery = $(this);
                const index: number = parseInt($curEdge.attr('data-connectorindex'));
                if (index >= connectorIndex) {
                    const parentNodeId = $curEdge.attr("data-parentnodeid");
                    $curEdge.remove();
                    self._drawLineBetweenNodes(parentNodeId, childNodeId, index + 1, svg);
                } else if (newConnection) {
                    // only need to readjust if doing a new connection, rather
                    // than restoring connections
                    const parentNodeId = $curEdge.attr("data-parentnodeid");
                    $curEdge.remove();
                    self._drawLineBetweenNodes(parentNodeId, childNodeId, index, svg);
                }
            });
        }

        this._drawLineBetweenNodes(parentNodeId, childNodeId, connectorIndex, svg);
    }

    private _drawNode(node: DagNode, select?: boolean): JQuery {
        const pos = node.getPosition();
        let type = node.getType();
        let subType = node.getSubType() || "";
        const nodeId = node.getId();
        const $categoryBarNode = DagView._$operatorBar.find('.operator[data-type="' + type + '"]' +
        '[data-subtype="' + subType + '"]').first();
        const $node = $categoryBarNode.clone();
        if ($categoryBarNode.closest(".category-hidden").length &&
            type !== DagNodeType.Synthesize
        ) {
            $node.addClass("configDisabled");
        };

        $node.attr("transform", "translate(" + pos.x + "," + pos.y + ")");
        this._setTooltip($node, node);
        const description = node.getDescription();
        if (description) {
            $node.addClass("hasDescription");
            DagView.addNodeIcon($node, "descriptionIcon", description);
        }
        let aggs: string[] = node.getAggregates();
        if (aggs.length) {
            DagView.addNodeIcon($node, "aggregateIcon", aggs.toString());
        }

        if (DagTblManager.Instance.hasLock(node.getTable())) {
            this._editTableLock($node, true);
        }

        this._drawTitleText($node, node);

        // use .attr instead of .data so we can grab by selector
        $node.attr("data-nodeid", nodeId);
        $node.addClass("state-" + node.getState());
        if (select) {
            DagView.selectNode($node);
        }
        // Set the node display title
        const $opTitle = $node.find('.opTitle');
        $node.removeClass("xc-hidden");
        if (node instanceof DagNodeCustom) {
            $opTitle.text(node.getCustomName());
            // The custom op is hidden in the category bar, so show it in the diagram
        } else if (node instanceof DagNodeCustomInput ||
            node instanceof DagNodeCustomOutput ||
            node instanceof DagNodeSQLSubInput ||
            node instanceof DagNodeSQLSubOutput
        ) {
            $opTitle.text(node.getPortName(this.isSqlPreview));
            // The custom input/output is hidden in the category bar, so show it in the diagram
        }

        $node.appendTo(this.$dfArea.find(".operatorSvg"));

        // Update connector UI according to the number of I/O ports
        if (node instanceof DagNodeCustom) {
            const { input, output } = node.getNumIOPorts();
            this._updateConnectorIn(node.getId(), input);
            this._updateConnectorOut(node.getId(), output);
        }

        return $node;
    }



    private _updateConnectorIn(nodeId: DagNodeId, numInputs: number) {
        const g = d3.select(this._getNode(nodeId)[0]);
        DagCategoryBar.Instance.updateNodeConnectorIn(numInputs, g);
    }

    private _updateConnectorOut(nodeId: DagNodeId, numberOutputs: number) {
        const g = d3.select(this._getNode(nodeId)[0]);
        DagCategoryBar.Instance.updateNodeConnectorOut(numberOutputs, g);
    }



    public updateNodeState(nodeInfo: {
        id: DagNodeId,
        node: DagNode,
        oldState: DagNodeState,
        state: DagNodeState
    }
    ): void {
        const nodeId: DagNodeId = nodeInfo.id;
        const $node: JQuery = this._getNode(nodeId);
        for (let i in DagNodeState) {
            $node.removeClass("state-" + DagNodeState[i]);
        }
        $node.addClass("state-" + nodeInfo.state);
        if (nodeInfo.oldState === DagNodeState.Error ||
            nodeInfo.state === DagNodeState.Error
        ) {
            // when switch from error state to other state
            this._setTooltip($node, nodeInfo.node);
        }

        if (nodeInfo.state !== DagNodeState.Complete &&
            !(nodeInfo.state === DagNodeState.Error &&
                nodeInfo.oldState === DagNodeState.Running)) {
            // don't remove tooltip upon completion or if the node went from
            // running to an errored state
            this.$dfArea.find('.runStats[data-id="' + nodeId + '"]').remove();
        }
        DagNodeInfoPanel.Instance.update(nodeId, "status");
    }

   public lockUnlockHelper(info: {
        nodeIds: DagNodeId[],
        lock: boolean
    }): void {
        if (info.lock) {
            this.$dfArea.addClass("locked");
            info.nodeIds.forEach((nodeId) => {
                this.lockNode(nodeId);
            });
        } else {
            this.$dfArea.removeClass("locked");
            info.nodeIds.forEach((nodeId) => {
                this.unlockNode(nodeId);
            });
        }
    }

    private _updateTitleForNodes(nodes: DagNode[]): void {
        nodes.forEach((node) => {
            const nodeId = node.getId();
            const $node = this._getNode(nodeId);
            this._drawTitleText($node, node);
        });
    }

    private _toggleCompileLock(lock: boolean) {
        if (lock) {
            xcHelper.disableScreen(this.$dfArea, {id: "compileBackground", styles: {
                width: this.$dfArea.find(".dataflowAreaWrapper").width(),
                height: this.$dfArea.find(".dataflowAreaWrapper").height()
            }});
        } else {
            xcHelper.enableScreen($("#compileBackground"));
        }
    }

    /**
     *
     * @param nodeId
     * returns $(".operator") element
     */
    private _getNode(
        nodeId: DagNodeId
    ): JQuery {
        return this.$dfArea.find('.operator[data-nodeid="' + nodeId + '"]');
    }

    private _drawTitleText($node: JQuery, node: DagNode): void {
        const g = d3.select($node.get(0));
        // draw node title
        let title: string = node.getTitle();
        if (title === "") {
            // if no title, use blank space so there's clickable width
            title = " ".repeat(20);
        }
        const titleLines: string[] = title.split("\n");
        const titleHeight: number = DagView.nodeHeight + 14;
        g.select(".nodeTitle").remove();

        const textSvg = g.append("text")
            .attr("class", "nodeTitle")
            .attr("fill", "#44515C")
            .attr("font-size", 10)
            .attr("transform", "translate(" + ((DagView.nodeWidth / 2) + 1) + "," +
                titleHeight + ")")
            .attr("text-anchor", "middle")
            .attr("font-family", "Open Sans");
        titleLines.forEach((line, i) => {
            textSvg.append("tspan")
                .text(line)
                .attr("x", 0)
                .attr("y", i * DagView.titleLineHeight);
        });

        // draw param title
        g.select(".paramTitle").remove();
        const paramHintObj: { hint: string, fullHint: string } = node.getParamHint(this.isSqlPreview);
        const paramHint = paramHintObj.hint;
        const fullParamHint = paramHintObj.fullHint;
        const parmLines: string[] = paramHint.split("\n");
        const paramHeight: number = titleHeight + 1 + titleLines.length * DagView.titleLineHeight;
        const paramTextSvg: d3 = g.append("text")
            .attr("class", "paramTitle")
            .attr("fill", "#44515C")
            .attr("font-size", 10)
            .attr("transform", "translate(" + ((DagView.nodeWidth / 2) + 1) + "," +
                paramHeight + ")")
            .attr("text-anchor", "middle")
            .attr("font-family", "Open Sans");
        parmLines.forEach((line, i) => {
            paramTextSvg.append("tspan")
                .text(line)
                .attr("x", 0)
                .attr("y", i * DagView.titleLineHeight);
        });
        xcTooltip.add(<any>paramTextSvg, { title: fullParamHint, placement: "bottom auto" });
    }

        /**
     * Adds or removes a lock icon to the node
     * @param $node: JQuery node
     * @param lock: true if we add a lock, false otherwise
     */
    private _editTableLock(
        $node: JQuery, lock: boolean
    ): void {
        if (lock) {
            DagView.addNodeIcon($node, "lockIcon", "Result locked");
        } else {
            DagView.removeNodeIcon($node, "lockIcon");
        }
    }


    /**
     *
     * @param nodeId
     * @param aggregates
     */
    private _editAggregates(
        nodeId: DagNodeId,
        aggregates: string[]
    ): void {
        const $node = this._getNode(nodeId);
        DagView.removeNodeIcon($node, "aggregateIcon");
        if (aggregates.length) {
            $node.addClass("hasAggregates");
            DagView.addNodeIcon($node, "aggregateIcon", aggregates.toString());
        } else {
            $node.removeClass("hasAggregate");
        }
    }

    private _setTooltip($node: JQuery, node: DagNode): void {
        if (node.getState() !== DagNodeState.Error) {
            xcTooltip.remove($node.find(".main"));
        } else {
            const title: string = (node.getState() === DagNodeState.Error) ?
                node.getError() : this._formatTooltip(node.getParam());

            xcTooltip.add($node.find(".main"), {
                title: title,
                classes: "preWrap leftAlign wide"
            });
        }

        DagView.removeNodeIcon($node, "paramIcon");
        if (node.hasParameters()) {
            DagView.addNodeIcon($node, "paramIcon", "Parameter in use");
        }
    }

    // for param tooltip
    private _formatTooltip(param): string {
        let title = xcHelper.escapeHTMLSpecialChar(JSON.stringify(param, null, 2));
        if (title === "{}") {
            title = "empty";
        } else {
            if (title.indexOf("{\n") === 0 && title.lastIndexOf("}") === title.length - 1) {
                title = title.slice(2, -1);
            }
        }
        return title;
    }

    private _autoExecute(dagNode: DagNode): void {
        if (UserSettings.getPref("dfAutoExecute") === true) {
            if (dagNode.getState() == DagNodeState.Configured) {
                const optimized: boolean = (dagNode instanceof DagNodeOutOptimizable &&
                                           dagNode.isOptimized());
                this.run([dagNode.getId()], optimized);
            }
        }
    }

    public checkLinkInNodeValidation(): void {
        if (this.graph == null) {
            return;
        }
        this.graph.getAllNodes().forEach((node) => {
            if (node instanceof DagNodeDFIn) {
                const state: DagNodeState = node.getState();
                if (state === DagNodeState.Configured ||
                    state === DagNodeState.Error && node.isLinkingError()
                ) {
                    node.switchState();
                }
            }
        });
    }

    private _canRun(): XDPromise<void> {
        if (this.dagTab instanceof DagTabPublished) {
            const deferred: XDDeferred<void> = PromiseHelper.deferred();
            DagSharedActionService.Instance.checkExecuteStatus(this.tabId)
            .then((isExecuting) => {
                if (isExecuting) {
                    deferred.reject(DFTStr.InExecution);
                } else {
                    deferred.resolve();
                }
            })
            .fail(deferred.reject);

            return deferred.promise();
        } else {
            return PromiseHelper.resolve();
        }
    }

    // a check that is done right before execution to allow users to confirm
    // and continue if an error is found - one case is if a parameter with no
    // value is found -- we can prompt the user to continue or abandon the execution
    private _runValidation(nodeIds: DagNodeId[], optimized: boolean): XDPromise<any> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const ret = this.graph.executionPreCheck(nodeIds, optimized)
        if (!ret) {
            return PromiseHelper.resolve();
        } else if (ret.status === "confirm" && ret.msg) {
            Alert.show({
                "title": "Confirmation",
                "msgTemplate": ret.msg + "\n Do you wish to continue?",
                "onConfirm": function() {
                    deferred.resolve();
                },
                "onCancel": function() {
                    deferred.reject({
                        error: "cancel"
                    });
                }
            });
        } else {
            deferred.reject(ret);
        }

        return deferred.promise();
    }


    private _getNextAvailablePosition(nodeId: DagNodeId, x: number, y: number): Coordinate {
        let positions = {};
        let positionConflict = true;

        this.graph.getAllNodes().forEach(node => {
            if (node.getId() === nodeId) {
                return;
            }
            const pos: Coordinate = node.getPosition();
            if (!positions[pos.x]) {
                positions[pos.x] = {};
            }
            positions[pos.x][pos.y] = true;
        });

        while (positionConflict) {
            positionConflict = false;
            if (positions[x] && positions[x][y]) {
                positionConflict = true;
                y += DagView.gridSpacing;
                x += DagView.gridSpacing;
            }
        }
        return {
            x: x,
            y: y
        }
    }

    private _getChildConnector($childNode: JQuery, index: number): JQuery {
        let $childConnector: JQuery;
        let $childConnectors = $childNode.find(".connector.in");
        if ($childConnectors.hasClass("multi")) {
            $childConnector = $childConnectors.eq(0);
        } else {
            $childConnector = $childConnectors.eq(index);
            if (!$childConnector.length) {
                // in case more connections exist than number of connection
                // divs
                $childConnector = $childConnectors.last();
            }
        }
        return $childConnector;
    }

    private _drawLineBetweenNodes(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number,
        svg: d3
    ): void {
        const parentNode: DagNode = this.graph.getNode(parentNodeId);
        const childNode: DagNode = this.graph.getNode(childNodeId);
        if (parentNode == null || childNode == null) {
            return;
        }
        let numParents = childNode.getMaxParents();
        let numConnections = connectorIndex;
        let isMulti = false;
        if (numParents === -1) {
            numParents = childNode.getNumParent();
            isMulti = true;
        }

        const parentCoors: Coordinate = {
            x: parentNode.getPosition().x + DagView.nodeWidth,
            y: parentNode.getPosition().y + (DagView.nodeHeight / 2)
        };

        const childCoors: Coordinate = {
            x: childNode.getPosition().x,
            y: childNode.getPosition().y + 2 +
                ((DagView.nodeHeight - 4) / (numParents + 1) * (1 + numConnections))
        };

        const edge = svg.append("g")
            .attr("class", "edge")
            .attr("data-childnodeid", childNodeId)
            .attr("data-parentnodeid", parentNodeId)
            .attr("data-connectorindex", connectorIndex.toString());

        edge.append("path")
            .attr("class", "visibleLine")
            .attr("d", DagView.lineFunction([parentCoors, childCoors]));

        edge.append("path")
            .attr("class", "invisibleLine")
            .attr("d", DagView.lineFunction([parentCoors, childCoors]));
        if (isMulti || childNode.getType() === DagNodeType.Custom) {
            // stagger the numbers
            const midX = ((3 * parentCoors.x + ((connectorIndex + 1) *
                childCoors.x)) / (4 + connectorIndex));
            const midY = (2 * parentCoors.y + ((connectorIndex * .5 + 1) *
                childCoors.y)) / (3 + (connectorIndex * .5));
            edge.append("text")
                .attr("class", "connectorIndex")
                .attr("fill", "#627483")
                .attr("font-size", "12px")
                .attr("letter-spacing", "-2")
                .attr("x", midX + "px")
                .attr("y", (midY - 2) + "px")
                .text("#" + (connectorIndex + 1))
        }
    }

    private _deselectAllNodes(): void {
        const $selected = DagView.$dfWrap.find(".selected");
        $selected.removeClass("selected");
        $selected.find(".selection").remove();
    }

    private _setGraphDimensions(elCoors: Coordinate, force?: boolean) {
        if (this.graph == null) {
            return;
        }
        let height: number;
        let width: number;

        if (force) {
            this.graph.setDimensions(elCoors.x, elCoors.y);
            width = elCoors.x;
            height = elCoors.y;
        } else {
            const dimensions = DagView._calculateDimensions(this.graph.getDimensions(), elCoors);
            width = dimensions.width;
            height = dimensions.height;
            this.graph.setDimensions(width, height);
        }

        const scale = this.graph.getScale();
        this.$dfArea.find(".dataflowAreaWrapper").css("min-width", width * scale);
        this.$dfArea.find(".dataflowAreaWrapper").css("min-height", height * scale);
        this.$dfArea.find(".dataflowAreaWrapper").css("background-size", DagView.gridLineSize * scale);
    }

    private _createNodeInfos(
        nodeIds: DagNodeId[],
        graph?: DagGraph,
        options: {
            clearState?: boolean // true if we're copying nodes
            includeStats?: boolean,
            includeTitle?: boolean // indicates we're doing a cut/copy and paste
        } = {}
    ): any[] {
        graph = graph || this.graph;
        // check why we need it
        const clearState: boolean = options.clearState || false;
        const includeStats: boolean = options.includeStats || false;
        const includeTitle: boolean = (options.includeTitle == null) ? true : options.includeTitle;
        let nodeInfos = [];
        nodeIds.forEach((nodeId) => {
            if (nodeId.startsWith("dag")) {
                const node: DagNode = graph.getNode(nodeId);
                if (node == null) {
                    return;
                }
                let parentIds: DagNodeId[] = [];
                let minParents: number = node.getMinParents();
                let parents = node.getParents();
                // if node requires at least 2 parents, and a parent isn't found
                // then we push in a null, but if the node requires 1 parent
                // we can just not push anything and keep parents == []
                for (let i = 0; i < parents.length; i++) {
                    const parent = parents[i];
                    if (parent) {
                        const parentId: DagNodeId = parent.getId();

                        if (nodeIds.indexOf(parentId) === -1) {
                            if (minParents > 1) {
                                parentIds.push(null);
                            }
                        } else {
                            parentIds.push(parentId);
                        }
                    } else {
                        if (minParents > 1) {
                            parentIds.push(null);
                        }
                    }
                }

                const nodeInfo = node.getNodeCopyInfo(clearState, includeStats, includeTitle);
                nodeInfo.parents = parentIds;
                nodeInfos.push(nodeInfo);
            } else if (nodeId.startsWith("comment")) {
                const comment: CommentNode = graph.getComment(nodeId);
                nodeInfos.push({
                    nodeId: nodeId,
                    display: xcHelper.deepCopy(comment.getDisplay()),
                    text: comment.getText()
                });
            }
        });

        return nodeInfos;
    }

    public validateAndPaste(content: string): void {
        let parsed = false;
        try {
            if (!content) {
                return;
            }
            const nodesArray = JSON.parse(content);
            parsed = true;
            if (!Array.isArray(nodesArray)) {
                throw ("Dataflow nodes must be in an array.");
            }
            let nodeSchema = DagNode.getCopySchema();
            let nodeSchemaValidateFn = (new Ajv()).compile(nodeSchema);
            let commentSchema = CommentNode.getCopySchema();
            let commentSchemaValidateFn = (new Ajv()).compile(commentSchema);
            for (let i = 0; i < nodesArray.length; i++) {
                const node = nodesArray[i];
                let valid;
                let validate;
                if (node.hasOwnProperty("text")) {
                    validate = commentSchemaValidateFn;
                } else {
                    validate = nodeSchemaValidateFn;
                }
                valid = validate(node);
                if (!valid) {
                    // only saving first error message
                    const msg = DagNode.parseValidationErrMsg(node, validate.errors[0], node.hasOwnProperty("text"));
                    throw (msg);
                }

                if (!node.hasOwnProperty("text")) {
                    // validate based on node type
                    const nodeClass = DagNodeFactory.getNodeClass(node);
                    let nodeSpecificSchema;
                    if (node.type === DagNodeType.Custom) {
                        nodeSpecificSchema = DagNodeCustom.getCopySpecificSchema();
                    } else {
                        nodeSpecificSchema = nodeClass.specificSchema;
                    }
                    if (!nodeClass["validateFn"]) {
                        // cache the validation function within the nodeClass
                        let ajv = new Ajv();
                        nodeClass["validateFn"] = ajv.compile(nodeSpecificSchema);
                    }
                    valid = nodeClass["validateFn"](node);
                    if (!valid) {
                        // only saving first error message
                        const msg = DagNode.parseValidationErrMsg(node, nodeClass["validateFn"].errors[0]);
                        throw (msg);
                    }
                }
            }
            this.pasteNodes(nodesArray);
        } catch (err) {
            console.error(err);
            let errStr: string;
            if (!parsed) {
                errStr = "Cannot paste invalid format. Nodes must be in a valid JSON format."
            } else if (typeof err === "string") {
                errStr = err;
            } else {
                errStr = xcHelper.parseJSONError(err).error;
            }
            StatusBox.show(errStr, DagView.$dfWrap);
        }
    }

    private _removeConnection(
        $edge: JQuery,
        childNodeId: DagNodeId
    ): void {
        const connectorIndex: number = parseInt($edge.attr('data-connectorindex'));
        $edge.remove();
        const $childNode: JQuery = this._getNode(childNodeId);
        const $childConnector: JQuery = this._getChildConnector($childNode, connectorIndex);
        const self = this;
        if ($childConnector.hasClass("multi")) {
            // if removing an edge from a multichildnode then decrement all
            // the edges that have a greater index than the removed one
            // due to splice action on children array
            const svg: d3 = d3.select(this.containerSelector + ' .dataflowArea[data-id="' + this.tabId + '"] .edgeSvg');
            this.$dfArea.find('.edge[data-childnodeid="' + childNodeId + '"]').each(function () {
                const $curEdge: JQuery = $(this);
                const index: number = parseInt($curEdge.attr('data-connectorindex'));
                if (index > connectorIndex) {
                    const parentNodeId = $curEdge.attr("data-parentnodeid");
                    if (!self._getNode(parentNodeId).length) {
                        // parent could be removed and this could be a second
                        // connection to it
                        $curEdge.attr("data-connectorindex", index - 1);
                        return true;
                    }
                    $curEdge.remove();
                    self._drawLineBetweenNodes(parentNodeId, childNodeId, index - 1, svg);
                } else {
                    const parentNodeId = $curEdge.attr("data-parentnodeid");
                    if (!self._getNode(parentNodeId).length) {
                        // parent could be removed and this could be a second
                        // connection to it
                        return true;
                    }
                    $curEdge.remove();
                    self._drawLineBetweenNodes(parentNodeId, childNodeId, index, svg);
                }
            });
        } else  {
            let node: DagNode = self.graph.getNode(childNodeId);
            if (node != null && node.getNumParent() === 0) {
                $childConnector.removeClass("hasConnection")
                .addClass("noConnection");
            }
        }
    }

       /**
     * DagView.moveNodes
     * @param dagId
     * @param nodeInfos
     * @param graphDimensions
     */
    public moveNodes(
        nodeInfos: NodeMoveInfo[],
        graphDimensions?: Coordinate
    ): XDPromise<void> {
        if (this.dagTab instanceof DagTabPublished) {
            return;
        }
        this.dagTab.turnOffSave();
        this._moveNodesNoPersist(nodeInfos, graphDimensions);
        this.dagTab.turnOnSave();
        return this.dagTab.save();
    }

    private _moveNodesNoPersist(
        nodeInfos: NodeMoveInfo[],
        graphDimensions?: Coordinate,
        options?: {
            isNoLog?: boolean
        }
    ): LogParam {
        const { isNoLog = false } = (options || {});
        let maxXCoor: number = 0;
        let maxYCoor: number = 0;
        let svg: d3 = d3.select(this.containerSelector + ' .dataflowArea[data-id="' + this.tabId + '"] .edgeSvg');
        const $operatorArea = this.$dfArea.find(".operatorSvg");
        const $commentArea: JQuery = this.$dfArea.find(".commentArea");
        const self = this;

        nodeInfos.forEach((nodeInfo, i) => {
            if (nodeInfo.type === "dagNode") {
                const nodeId = nodeInfo.id;
                const $el = this._getNode(nodeId);
                const node: DagNode = this.graph.getNode(nodeId);
                if (node == null) {
                    return;
                }
                nodeInfos[i].oldPosition = xcHelper.deepCopy(node.getPosition())
                this.graph.moveNode(nodeId, {
                    x: nodeInfo.position.x,
                    y: nodeInfo.position.y,
                });

                $el.attr("transform", "translate(" + nodeInfo.position.x + "," +
                    nodeInfo.position.y + ")");

                maxXCoor = Math.max(nodeInfo.position.x, maxXCoor);
                maxYCoor = Math.max(nodeInfo.position.y, maxYCoor);

                // positions this element in front
                $el.appendTo($operatorArea);

                // redraw all paths that go out from this node
                this.$dfArea.find('.edge[data-parentnodeid="' + nodeId + '"]').each(function () {
                    const childNodeId: DagNodeId = $(this).attr("data-childnodeid");
                    let connectorIndex: number = parseInt($(this).attr("data-connectorindex"));
                    $(this).remove();

                    self._drawLineBetweenNodes(nodeId, childNodeId, connectorIndex, svg);
                });

                // redraw all paths that lead into this node
                this.$dfArea.find('.edge[data-childnodeid="' + nodeId + '"]').each(function () {
                    const parentNodeId = $(this).attr("data-parentnodeid");
                    let connectorIndex = parseInt($(this).attr("data-connectorindex"));
                    $(this).remove();

                    self._drawLineBetweenNodes(parentNodeId, nodeId, connectorIndex, svg);
                });
                // move runStats if it has one
                this._repositionProgressTooltip(nodeInfo, nodeId);
            } else {
                // comment node
                const id = nodeInfo.id;
                const comment = this.graph.getComment(id);
                nodeInfos[i].oldPosition = xcHelper.deepCopy(comment.getPosition());
                comment.setPosition(nodeInfo.position);
                const $el = this.$dfArea.find('.comment[data-nodeid="' + id + '"]');
                $el.css({
                    left: nodeInfo.position.x,
                    top: nodeInfo.position.y
                });
                const dimensions = comment.getDimensions();
                maxXCoor = Math.max(nodeInfo.position.x + dimensions.width, maxXCoor);
                maxYCoor = Math.max(nodeInfo.position.y + dimensions.height, maxYCoor);

                $el.appendTo($commentArea);
            }
        });

        if (graphDimensions) {
            this._setGraphDimensions(graphDimensions, true);
        } else {
            this._setGraphDimensions({ x: maxXCoor, y: maxYCoor });
        }

        const logParam: LogParam = {
            title: SQLTStr.MoveOperations,
            options: {
                "operation": SQLOps.MoveOperations,
                "dataflowId": this.tabId,
                "nodeInfos": nodeInfos
            }
        };
        if (!isNoLog) {
            Log.add(logParam.title, logParam.options);
        }

        return logParam;
    }

    // handles drag n drop
    public operatorMousedown(event, $opMain) {
        let $operator = $opMain.closest(".operator");
        let isDagNode = true;
        if (!$operator.length) {
            $operator = $opMain;
            isDagNode = false;
        }

        // if not shift clicking, deselect other nodes
        // if shiftx clicking, and this is selected, then deselect it
        // but don't allow dragging on deselected node
        if (!$operator.hasClass("selected") && !event.shiftKey) {
            this.deselectNodes();
        } else if ($operator.hasClass("selected") && event.shiftKey) {
            DagView.deselectNode($operator);
            return;
        }
        DagView.selectNode($operator);

        const nodeId: DagNodeId = $operator.data("nodeid");
        if (isDagNode) {
            const node: DagNode = this.graph.getNode(nodeId);
            DagNodeInfoPanel.Instance.show(node, false);
        }

        if (event.which !== 1) {
            return;
        }
        if ($(event.target).closest(".ui-resizable-handle").length ||
            $(event.target).is("textarea")) {
            if (!event.shiftKey) {
                this.deselectNodes();
                DagView.selectNode($operator);
            }
            return;
        }
        if (this.dagTab instanceof DagTabPublished) {
            return;
        }

        const $elements = $operator.add(this.$dfArea.find(".selected"));

        // the description icon and large node title cause the
        // desired dimensions of the operator element to be altered so we
        // undo its effects by using offsets
        const elOffsets = [];
        $elements.each(function () {
            const $el = $(this);
            const elOffset = { x: 0, y: 0 };
            if ($el.is(".operator")) {
                const outerLeft = this.getBoundingClientRect().left;
                const innerLeft = $(this).find('.main')[0].getBoundingClientRect().left;
                elOffset.x = (innerLeft - DagView.inConnectorWidth) - outerLeft;
            }
            elOffsets.push(elOffset);
        });

        new DragHelper({
            event: event,
            $element: $operator,
            $elements: $elements,
            $container: DagView.$dagView,
            $dropTarget: this.$dfArea.find(".dataflowAreaWrapper"),
            round: DagView.gridSpacing,
            padding: DagView.gridSpacing,
            scale: this.graph.getScale(),
            elOffsets: elOffsets,
            onDragStart: (_$els) => {
            },
            onDragEnd: ($els, _event, data) => {
                let nodeInfos = [];
                $els.each(function (i) {
                    const id = $(this).data("nodeid");
                    if ($(this).hasClass("operator")) {
                        nodeInfos.push({
                            type: "dagNode",
                            id: id,
                            position: data.coors[i]
                        });
                    } else if ($(this).hasClass("comment")) {
                        nodeInfos.push({
                            type: "comment",
                            id: id,
                            position: data.coors[i]
                        });
                    }
                });
                this.moveNodes(nodeInfos);
            },
            onDragFail: (wasDragged: boolean) => {
                if (!wasDragged) {
                    // did not drag
                    if (!event.shiftKey) {
                        this._deselectAllNodes();
                        DagView.selectNode($operator);
                    }
                    // if no drag, treat as right click and open menu

                    if (!$opMain.hasClass("comment") && !event.shiftKey) {
                        let contextMenuEvent = $.Event("contextmenu", {
                            pageX: event.pageX,
                            pageY: event.pageY
                        });
                        $opMain.trigger(contextMenuEvent);
                    }
                }
            },
            move: true
        });

    }

     // connecting 2 nodes dragging the parent's connector
    public connectorOutMousedown(event, $parentConnector) {
        const self = this;
        if (event.which !== 1) {
            return;
        }
        if (self.dagTab instanceof DagTabPublished) {
            return;
        }
        const $parentNode = $parentConnector.closest(".operator");
        const parentNodeId: DagNodeId = $parentNode.data("nodeid");

        if (self.isNodeLocked(parentNodeId)) {
            return;
        }

        let $candidates: JQuery;
        let path;
        let parentCoors;
        let scale: number = self.graph.getScale();

        new DragHelper({
            event: event,
            $element: $parentConnector.parent(),
            $container: DagView.$dagView,
            $dropTarget: self.$dfArea.find(".dataflowAreaWrapper"),
            offset: {
                x: 0,
                y: -2
            },
            scale: scale,
            noCursor: true,
            onDragStart: (_$el: JQuery, _e: JQueryEventObject) => {
                const $operators: JQuery = self.$dfArea.find(".operator");
                $candidates = $operators.filter(function () {
                    const childNodeId = $(this).data("nodeid");
                    if (childNodeId === parentNodeId) {
                        return false;
                    }
                    let node: DagNode = self.graph.getNode(childNodeId);
                    if (node == null) {
                        return false;
                    }
                    let index = node.getNextOpenConnectionIndex();
                    if (index === -1) {
                        return false;
                    } else {
                        return self.graph.canConnect(parentNodeId, childNodeId, index, true);
                    }
                });
                $operators.addClass("noDrop");
                $candidates.removeClass("noDrop").addClass("dropAvailable");
                const offset = self._getDFAreaOffset();
                const rect = $parentConnector[0].getBoundingClientRect();
                parentCoors = {
                    x: (rect.right + offset.left) - 6,
                    y: (rect.top + offset.top) + 12
                };
                // setup svg for temporary line
                self.$dfArea.find(".dataflowAreaWrapper").append('<svg class="secondarySvg"></svg>');
                const svg: d3 = d3.select('#dagView .dataflowArea[data-id="' + self.tabId + '"] .secondarySvg');

                const edge: d3 = svg.append("g")
                    .attr("class", "edge tempEdge");

                path = edge.append("path");
                path.attr("class", "visibleLine");
            },
            onDrag: (coors) => {
                const offset = self._getDFAreaOffset();
                const childCoors = {
                    x: (coors.x + offset.left) + 2,
                    y: (coors.y + offset.top) + 11
                };
                path.attr("d", DagView.lineFunction([parentCoors, childCoors]));
            },
            onDragEnd: (_$el, event) => {
                let $childNode: JQuery;
                $candidates.removeClass("dropAvailable noDrop");

                self.$dfArea.find(".secondarySvg").remove();
                // check if location of drop matches position of a valid
                // $operator
                $candidates.each(function () {
                    const rect: ClientRect = this.getBoundingClientRect();
                    const left: number = rect.left;
                    const right: number = rect.right;
                    const top: number = rect.top;
                    const bottom: number = rect.bottom;
                    if (event.pageX >= left && event.pageX <= right &&
                        event.pageY >= top && event.pageY <= bottom) {
                        $childNode = $(this);
                        return false;
                    }
                });

                if (!$childNode) {
                    console.log("invalid connection");
                    return;
                }

                // Figure out the connectorIn element of the child node
                let $childConnectorIn: JQuery = null;
                $childNode.find('.connector.in').each((_index, elem) => {
                    const rect: ClientRect = elem.getBoundingClientRect();
                    if (event.pageX >= rect.left && event.pageX <= rect.right &&
                        event.pageY >= rect.top && event.pageY <= rect.bottom) {
                        $childConnectorIn = $(elem);
                        return false;
                    }
                });

                const childNodeId: DagNodeId = $childNode.data("nodeid");
                const childNode: DagNode = self.graph.getNode(childNodeId);
                if (childNode == null) {
                    return;
                }
                const connectorIndex: number = $childConnectorIn == null
                    ? childNode.getNextOpenConnectionIndex() // drop in the area other than connectors, connect to the next available input
                    : (childNode.canHaveMultiParents() // drop in one of the connectors
                        ? childNode.getNextOpenConnectionIndex() // it's a multi-connection(such as Set) node, connect to the next available input
                        : parseInt($childConnectorIn.data('index'))); // it's a normal node, connect to the corresponding input
                if (!self.graph.canConnect(parentNodeId, childNodeId, connectorIndex)) {
                    StatusBox.show(DagTStr.CycleConnection, $childNode);
                    return;
                }
                const warning = self._connectionWarning(childNodeId, parentNodeId);
                if (warning) {
                    Alert.show({
                        title: warning.title,
                        msg: warning.msg,
                        onConfirm: () => {
                            self.connectNodes(parentNodeId, childNodeId, connectorIndex);
                        }
                    });
                } else {
                    self.connectNodes(parentNodeId, childNodeId,
                        connectorIndex);
                }
            },
            onDragFail: (wasDragged: boolean) => {
                if (wasDragged) {
                    $candidates.removeClass("dropAvailable noDrop");
                    self.$dfArea.find(".secondarySvg").remove();
                }
            },
            copy: true
        });

    }

    // connecting 2 nodes dragging the child's connector
    public connectorInMousedown(event, $childConnector) {
        const self = this;
        if (event.which !== 1) {
            return;
        }
        if (self.dagTab instanceof DagTabPublished) {
            return;
        }

        const $childNode = $childConnector.closest(".operator");
        const childNodeId: DagNodeId = $childNode.data("nodeid");
        if (self.isNodeLocked(childNodeId)) {
            return;
        }
        let $candidates: JQuery;
        let path;
        let childCoors;
        let otherParentId;

        const childNode = self.graph.getNode(childNodeId);
        if (childNode == null) {
            return;
        }
        const canHaveMultiParents: boolean = childNode.canHaveMultiParents();
        const connectorIndex = canHaveMultiParents
            ? childNode.getNextOpenConnectionIndex()
            : parseInt($childConnector.data("index"));
        // if child connector is in use, when drag finishes we will remove
        // this connection and replace with a new one
        const isReconnecting = childNode.getParents()[connectorIndex] != null;

        let scale = self.graph.getScale();
        new DragHelper({
            event: event,
            $element: $childConnector.parent(),
            $container: DagView.$dagView,
            $dropTarget: self.$dfArea.find(".dataflowAreaWrapper"),
            offset: {
                x: 5,
                y: 3
            },
            scale: scale,
            noCursor: true,
            onDragStart: (_$el: JQuery, _e: JQueryEventObject) => {
                if (isReconnecting) {
                    // connection already taken, temporarily remove connection
                    // and create a new one when drop finishes or add it back
                    // if drop fails
                    const $curEdge = self.$dfArea.find('.edge[data-childnodeid="' +
                        childNodeId +
                        '"][data-connectorindex="' +
                        connectorIndex + '"]');
                    otherParentId = $curEdge.data("parentnodeid");
                    self.graph.disconnect(otherParentId, childNodeId,
                        connectorIndex, false);
                }
                const $operators: JQuery = self.$dfArea.find(".operator");
                $candidates = $operators.filter(function () {
                    const parentNodeId = $(this).data("nodeid");
                    if (childNodeId === parentNodeId) {
                        return false;
                    }

                    return self.graph.canConnect(parentNodeId, childNodeId,
                        connectorIndex, true);
                });

                $operators.addClass("noDrop");
                $candidates.removeClass("noDrop").addClass("dropAvailable");
                const offset = self._getDFAreaOffset();
                const rect = $childConnector.parent()[0].getBoundingClientRect();
                childCoors = {
                    x: (rect.left + offset.left) + 4,
                    y: (rect.top + offset.top) + 6
                };
                if (canHaveMultiParents) {
                childCoors.y += 5;
                }
                // setup svg for temporary line
                self.$dfArea.find(".dataflowAreaWrapper").append('<svg class="secondarySvg"></svg>');
                const svg: d3 = d3.select('#dagView .dataflowArea[data-id="' + self.tabId + '"] .secondarySvg');

                const edge = svg.append("g")
                    .attr("class", "edge tempEdge");

                path = edge.append("path");
                path.attr("class", "visibleLine");
            },
            onDrag: (coors) => {
                const offset = self._getDFAreaOffset();
                const parentCoors = {
                    x: (coors.x + offset.left) + 3,
                    y: (coors.y + offset.top) + 4
                };
                if (canHaveMultiParents) {
                    parentCoors.y += 5;
                }
                path.attr("d", DagView.lineFunction([childCoors, parentCoors]));
            },
            onDragEnd: (_$el, event) => {
                let $parentNode: JQuery;
                $candidates.removeClass("dropAvailable noDrop");

                self.$dfArea.find(".secondarySvg").remove();
                // check if location of drop matches position of a valid
                // $operator
                $candidates.each(function () {
                    const rect: ClientRect = this.getBoundingClientRect();
                    const left: number = rect.left;
                    const right: number = rect.right;
                    const top: number = rect.top;
                    const bottom: number = rect.bottom;
                    if (event.pageX >= left && event.pageX <= right &&
                        event.pageY >= top && event.pageY <= bottom) {
                        $parentNode = $(this);
                        return false;
                    }
                });

                if (!$parentNode) {
                    if (isReconnecting) {
                        self.graph.connect(otherParentId, childNodeId,
                            connectorIndex, true, false);
                    }
                    return;
                }

                const parentNodeId: DagNodeId = $parentNode.data("nodeid");

                if (!self.graph.canConnect(parentNodeId, childNodeId,
                    connectorIndex)) {
                    StatusBox.show(DagTStr.CycleConnection, $childNode);
                    if (isReconnecting) {
                        self.graph.connect(otherParentId, childNodeId,
                            connectorIndex, true, false);
                    }
                    return;
                }
                if (isReconnecting) {
                    self.graph.connect(otherParentId, childNodeId,
                        connectorIndex, true, false);
                }

                const warning = self._connectionWarning(childNodeId, parentNodeId);
                if (warning) {
                    Alert.show({
                        title: warning.title,
                        msg: warning.msg,
                        onConfirm: () => {
                            self.connectNodes(parentNodeId, childNodeId, connectorIndex, isReconnecting);
                        }
                    });
                } else {
                    self.connectNodes(parentNodeId, childNodeId,
                        connectorIndex, isReconnecting);
                }
            },
            onDragFail: (wasDragged: boolean) => {
                if (wasDragged) {
                    $candidates.removeClass("dropAvailable noDrop");
                    self.$dfArea.find(".secondarySvg").remove();
                    if (isReconnecting) {
                        self.graph.connect(otherParentId, childNodeId,
                            connectorIndex, true, false);
                    }
                }
            },
            copy: true
        });
    }

    public nodeTitleEditMode($origTitle): void {
        if (this.dagTab instanceof DagTabPublished) {
            return;
        }
        const nodeId: DagNodeId = $origTitle.closest(".operator").data("nodeid");
        const node = this.graph.getNode(nodeId);
        if (node == null) {
            return;
        }
        if (node instanceof DagNodeSQLFuncIn) {
            // not allow modify input node in sql mode
            return;
        }

        const rect = $origTitle[0].getBoundingClientRect();
        const offset = this._getDFAreaOffset();
        const left = rect.left + offset.left + (rect.width / 2);
        const top = rect.top + offset.top;
        const minWidth = 90;
        const origVal = node.getTitle();
        let html: HTML = `<textarea class="editableNodeTitle" spellcheck="false"
                    style="top:${top}px;left:${left}px;">${origVal}</textarea>`;
        let $textArea = $(html);
        $origTitle.closest(".dataflowAreaWrapper").append($textArea);
        sizeInput();
        $textArea.focus()
        if (node.checkHasTitleChange()) {
            $textArea.caret(origVal.length);
        } else {
            $textArea.selectAll();
        }
        $origTitle.hide();

        $textArea.blur(() => {
            const newVal: string = $textArea.val().trim();
            this.editNodeTitle(nodeId, newVal);
            $textArea.remove();
            $origTitle.show();
        });

        $textArea.on("input", sizeInput);
        function sizeInput() {
            $textArea.height(DagView.titleLineHeight);
            $textArea.width(minWidth);
            if ($textArea[0].scrollWidth > $textArea.width()) {
                $textArea.width($textArea[0].scrollWidth + 1);
            }
            if ($textArea[0].scrollHeight > $textArea.height()) {
                $textArea.height($textArea[0].scrollHeight);
            }
        }
    }

        /**
     *
     * @param nodeId
     * @param title
     */
    public editNodeTitle(
        nodeId: DagNodeId,
        title: string
    ): XDPromise<void> {
        const node = this.graph.getNode(nodeId);
        if (node == null) {
            return PromiseHelper.reject();
        }
        const oldTitle = node.getTitle();
        const $node = this._getNode(nodeId);
        this.dagTab.turnOffSave();

        node.setTitle(title, true);
        this._drawTitleText($node, node);

        // XXX TODO: update paramTitle's height
        Log.add(SQLTStr.EditNodeTitle, {
            "operation": SQLOps.EditNodeTitle,
            "dataflowId": this.tabId,
            "oldTitle": oldTitle,
            "newTitle": title,
            "nodeId": nodeId
        });

        this.dagTab.turnOnSave();
        return this.dagTab.save();
    }

    // show warning if connecting to sort node and sort node is not terminal node
    private _connectionWarning(childNodeId: DagNodeId, parentNodeId: DagNodeId): {
        title: string,
        msg: string
    } {
        const childNode = this.graph.getNode(childNodeId);
        const parentNode = this.graph.getNode(parentNodeId);
        if (childNode == null || parentNode == null) {
            return null;
        }
        const childType = childNode.getType();

        if (parentNode.getType() === DagNodeType.Sort &&
            (childType !== DagNodeType.Export &&
                childType !== DagNodeType.PublishIMD)) {
            return {
                title: DagTStr.SortConnectWarningTitle,
                msg: DagTStr.SortConnectWarning
            }
        } else {
            return null;
        }
    }

    private _getDFAreaOffset() {
        const containerRect = this.$dfArea[0].getBoundingClientRect();
        const offsetTop = this.$dfArea.scrollTop() - containerRect.top;
        const offsetLeft = this.$dfArea.scrollLeft() - containerRect.left;

        return {
            top: offsetTop,
            left: offsetLeft
        }
    }


    /**
     * DagView.connectNodes
     * @param parentNodeId
     * @param childNodeId
     * @param connectorIndex
     * @param isReconnect
     * connects 2 nodes and draws line
     */
    public connectNodes(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number,
        isReconnect?: boolean,
        spliceIn?: boolean,
        identifiers?: Map<number, string>,
        setNodeConfig?: {sourceColumn: string, destColumn: string, columnType: ColumnType, cast: boolean}[]
    ): XDPromise<void> {
        if (this.dagTab instanceof DagTabPublished) {
            return PromiseHelper.reject();
        }

        this.dagTab.turnOffSave();
        this._connectNodesNoPersist(parentNodeId, childNodeId, connectorIndex,  {
            isReconnect: isReconnect,
            spliceIn: spliceIn,
            identifiers: identifiers,
            setNodeConfig: setNodeConfig
        });
        this.dagTab.turnOnSave();
        return this.dagTab.save();
    }

        // force connect can be true if undoing an operation where we are connecting
    // to an index that is currently taken, in which case we have to move the
    // other indices
    private _connectNodesNoPersist(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number,
        options?: {
            isReconnect?: boolean,
            spliceIn?: boolean,
            isSwitchState?: boolean,
            isNoLog?: boolean,
            identifiers?: Map<number, string>,
            setNodeConfig?: {sourceColumn: string, destColumn: string, columnType: ColumnType, cast: boolean}[]
        }
    ): LogParam {
        const {
            isReconnect = false, isSwitchState = true, isNoLog = false,
            spliceIn = false
        } = options || {};
        let prevParentId = null;
        if (isReconnect) {
            const $curEdge = this.$dfArea.find('.edge[data-childnodeid="' +
                childNodeId +
                '"][data-connectorindex="' +
                connectorIndex + '"]');
            prevParentId = $curEdge.data("parentnodeid");
            this.graph.disconnect(prevParentId, childNodeId, connectorIndex);

            this._removeConnection($curEdge, childNodeId);
        }

        this.graph.connect(parentNodeId, childNodeId, connectorIndex, false, isSwitchState,
            spliceIn);
        const childNode = this.graph.getNode(childNodeId);
        this._drawConnection(parentNodeId, childNodeId, connectorIndex, childNode.canHaveMultiParents(), true);
        childNode.setIdentifiers(options.identifiers);
        if (options.setNodeConfig && childNode != null) {
            (<DagNodeSet> childNode).reinsertColumn(options.setNodeConfig, connectorIndex);
        }

        const logParam: LogParam = {
            title: SQLTStr.ConnectOperations,
            options: {
                "operation": SQLOps.ConnectOperations,
                "dataflowId": this.tabId,
                "parentNodeId": parentNodeId,
                "childNodeId": childNodeId,
                "connectorIndex": connectorIndex,
                "prevParentNodeId": prevParentId,
                "spliceIn": spliceIn
            }
        };
        if (!isNoLog) {
            Log.add(logParam.title, Object.assign({}, logParam.options));
        }

        return logParam;
    }

    private _addNodeNoPersist(
        node,
        options?: {
            isNoLog?: boolean
        }
    ): LogParam {
        let { isNoLog = false } = options || {};

        this._deselectAllNodes();
        const nodeId = node.getId();
        const $node = this._drawNode(node);
        DagView.selectNode($node);
        this._setGraphDimensions(xcHelper.deepCopy(node.getPosition()))

        const logParam: LogParam = {
            title: SQLTStr.AddOperation,
            options: {
                "operation": SQLOps.AddOperation,
                "dataflowId": this.tabId,
                "nodeId": nodeId
            }
        };
        if (!isNoLog) {
            Log.add(logParam.title, Object.assign({}, logParam.options));
        }

        return logParam;
    }


    private _drawAndConnectNodes(
        nodes: DagNode[]
    ): void {
        for (let i = 0; i < nodes.length; i++) {
            this._drawNode(nodes[i]);
        }
        this._drawAllNodeConnections(nodes);
    }

    private _drawAllNodeConnections(nodes: DagNode[]): void {
        const drawnConnections = {};
        nodes.forEach((node) => {
            const nodeId = node.getId();
            node.getParents().forEach((parentNode, index) => {
                const connectionId = parentNode.getId() + "-" + nodeId + "-" + index;
                if (drawnConnections[connectionId]) {
                    return;
                }
                drawnConnections[connectionId] = true;
                this._drawConnection(parentNode.getId(), nodeId, index, node.canHaveMultiParents());
            });

            const seen = {};
            node.getChildren().forEach((childNode) => {
                const childNodeId = childNode.getId();
                if (seen[childNodeId]) {
                    // node's child will connect to all indices of parent
                    // so don't repeat if we see this child again
                    return;
                }
                seen[childNodeId] = true;
                childNode.getParents().forEach((parent, index) => {
                    if (parent === node) {
                        const connectionId = nodeId + "-" + childNode.getId() + "-" + index;
                        if (drawnConnections[connectionId]) {
                            return;
                        }
                        drawnConnections[connectionId] = true;
                        this._drawConnection(nodeId, childNode.getId(), index, childNode.canHaveMultiParents());
                    }
                });
            });
        });
    }
}