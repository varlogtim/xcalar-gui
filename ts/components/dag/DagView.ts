namespace DagView {
    let $dagView: JQuery;
    let $dfWrap: JQuery;
    let $operatorBar: JQuery;
    let activeDag: DagGraph;

    export function setup(): void {
        if (gDionysus) {
            $("#dagButton").show();
        }
        $dagView = $("#dagView");
        $dfWrap = $dagView.find(".dataflowWrap");
        $operatorBar = $dagView.find(".operatorWrap");

        // XXX used for testing
        activeDag = new DagGraph();

        _setupSelectingAndDragDrop();
        DagTopBar.Instance.setup();
        DagCategoryBar.Instance.setup();
        DagNodeMenu.setup();
    }

    // XXX test function
    export function getActiveDag(): DagGraph {
        return activeDag;
    }

    export function selectNodes(nodeIds: DagNodeId[]) {
        nodeIds.forEach((nodeId) => {
            const $node: JQuery = DagView.getNode(nodeId);
            $node.addClass("selected");
        });
    }

    /**
     * DagView.addBackNodes
     * @param _dagId
     * @param nodeIds
     * used for undoing/redoing operations
     */
    export function addBackNodes(_dagId, nodeIds) {
        // need to add back nodes in the reverse order they were deleted
        for (let i = nodeIds.length - 1; i >= 0; i--) {
            const nodeId = nodeIds[i];
            const node = activeDag.addBackNode(nodeId);
            const type = node.getType();
            const $node = $operatorBar.find('.operator[data-type="' + type + '"]').clone();
            const pos = node.getPosition();
            $node.css({
                left: pos.x,
                top: pos.y
            });
            // use .attr instead of .data so we can grab by selector
            $node.attr("data-nodeid", nodeId);
            $node.appendTo($dfWrap.find(".dataflowArea.active"));

            node.getParents().forEach((parentNode, index) => {
                _drawConnection(parentNode.getId(), nodeId, index);
            });

            node.getChildren().forEach((childNode) => {
                childNode.getParents().forEach((parent, index) => {
                    if (parent === node) {
                        _drawConnection(nodeId, childNode.getId(), index);
                    }
                });
            });
        }
    }

    /**
     * DagView.addNode
     * @param dagId
     * @param nodeInfo
     */
    export function addNode(dagId, nodeInfo: DagNodeInfo): void {
        const node = activeDag.newNode(nodeInfo);
        const type = nodeInfo.type;
        $dfWrap.find(".operator").removeClass("selected");
        const $node = $operatorBar.find('.operator[data-type="' + type + '"]').clone();

        $node.css({
            left: nodeInfo.display.x,
            top: nodeInfo.display.y
        });
        const nodeId = node.getId();
        // use .attr instead of .data so we can grab by selector
        $node.attr("data-nodeid", nodeId);
        $node.addClass("selected");
        $node.appendTo($dfWrap.find(".dataflowArea.active"));

        Log.add(SQLTStr.AddOperation, {
            "operation": SQLOps.AddOperation,
            "dataflowId": dagId,
            "nodeId": nodeId
        });
    }

    /**
     * DagView.removeNode
     * @param nodeId
     *  removes node from DagGraph, remove $element, connection lines, update
     * connector classes
     */
    export function removeNodes(dagId, nodeIds: DagNodeId[]): void {
        nodeIds.forEach(function(nodeId) {
            activeDag.removeNode(nodeId);
            DagView.getNode(nodeId).remove();
            $dagView.find('.edge[data-childnodeid="' + nodeId + '"]').remove();
            $dagView.find('.edge[data-parentnodeid="' + nodeId + '"]').each(function() {
                const childNodeId = $(this).attr("data-childnodeid");
                _removeConnection($(this), childNodeId);
            });
        });

        Log.add(SQLTStr.RemoveOperations, {
            "operation": SQLOps.RemoveOperations,
            "dataflowId": dagId,
            "nodeIds": nodeIds
        });
    }

    /**
     * DagView.cloneNode
     * @param nodeId
     * finds new position for cloned node, adds to dagGraph and UI
     */
    export function cloneNodes(_dagId, nodeIds: DagNodeId[]): void {
        const offset = _getDFAreaOffset();
        const $originalNode = DagView.getNode(nodeIds[0]);
        const origRect = $originalNode[0].getBoundingClientRect();
        const $dfArea = $dagView.find(".dataflowArea.active");
        const spacing = 20;
        let newLeft = origRect.left;
        let topDelta = origRect.height + spacing;
        let positionConflict = true;
        let newNodeIds: DagNodeId[] = [];

        // we use the first node in the jquery array and make sure it doesn't
        // conflict in positions with another node. The other nodes in the
        // array may have a problem however

        // XXX improve detection of other node positions
        while (positionConflict) {
            positionConflict = false;
            $dfArea.find(".operator").each(function() {
                const rect = this.getBoundingClientRect();
                if (rect.left === newLeft && rect.top === origRect.top + topDelta) {
                    positionConflict = true;
                    topDelta += 10;
                    return false;
                }
            });
        }

        nodeIds.forEach((nodeId) => {
            const $node = DagView.getNode(nodeId);
            const rect = $node[0].getBoundingClientRect();
            const newPosition = {
                x: rect.left + offset.left,
                y: rect.top + offset.top + topDelta
            }

            const newNode = activeDag.cloneNode(nodeId);
            const newNodeId = newNode.getId();
            newNodeIds.push(newNodeId);
            activeDag.moveNode(newNodeId, newPosition);
            const type = newNode.getType();
            const $newEl = $operatorBar.find('.operator[data-type="' + type + '"]').clone();
            $newEl.css({
                left: newPosition.x,
                top: newPosition.y
            });
            $dfArea.append($newEl);
            $newEl.attr("data-nodeid", newNodeId);
        });

        Log.add(SQLTStr.CopyOperations, {
            "operation": SQLOps.CopyOperations,
            "dataflowId": 0,
            "nodeIds": newNodeIds
        });
    }

    /**
     * DagView.disconnect
     * @param parentNodeId
     * @param childNodeId
     * removes connection from DagGraph, connection line, updates connector classes
     */
    export function disconnectNodes(parentNodeId, childNodeId, connectorIndex) {
        const $edge: JQuery = $dagView.find('.edge[data-parentnodeid="' +
                                            parentNodeId +
                                            '"][data-childnodeid="' +
                                            childNodeId +
                                            '"][data-connectorindex="' +
                                            connectorIndex + '"]');
        activeDag.disconnect(parentNodeId, childNodeId, connectorIndex);
        _removeConnection($edge, childNodeId);
        Log.add(SQLTStr.DisconnectOperation, {
            "operation": SQLOps.DisconnectOperation,
            "dataflowId": 0,
            "parentNodeId": parentNodeId,
            "childNodeId": childNodeId,
            "connectorIndex": connectorIndex
        });
    }

    /**
     * DagView.connectNodes
     * @param parentNodeId
     * @param childNodeId
     * @param connectorIndex
     * connects 2 nodes and draws line
     */
    export function connectNodes(parentNodeId, childNodeId, connectorIndex) {
        activeDag.connect(parentNodeId, childNodeId, connectorIndex);

        _drawConnection(parentNodeId, childNodeId, connectorIndex);

        Log.add(SQLTStr.ConnectOperations, {
            "operation": SQLOps.ConnectOperations,
            "dataflowId": 0,
            "parentNodeId": parentNodeId,
            "childNodeId": childNodeId,
            "connectorIndex": connectorIndex
        });
    }

    /**
     * DagView.getNode
     * @param nodeId
     * returns $(".operator") element
     */
    export function getNode(nodeId: DagNodeId): JQuery {
        return $dagView.find('.operator[data-nodeid="' + nodeId + '"]');
    }

    /**
     * DagView.moveNodes
     * @param dagId
     * @param nodeIds
     */
    export function moveNodes(_dagId, nodeIds: DagNodeId[], positions) {
        const offset = _getDFAreaOffset();
        let svg = d3.select("#dagView .dataflowArea.active .mainSvg");
        let oldPositions = [];

        nodeIds.forEach((nodeId, i) => {
            const $el = DagView.getNode(nodeId);
            oldPositions.push(xcHelper.deepCopy(activeDag.getNode(nodeId)
                                                         .getPosition()));
            activeDag.moveNode(nodeId, {
                x: positions[i].x,
                y: positions[i].y
            });

            $el.css({
                left: positions[i].x,
                top: positions[i].y
            });

            // positions this element in front
            $el.appendTo($dfWrap.find(".dataflowArea.active"));

            // redraw all paths that go out from this node
            $dagView.find('.edge[data-parentnodeid="' + nodeId + '"]').each(function() {
                const childNodeId: DagNodeId = $(this).attr("data-childnodeid");
                let connectorIndex: number = parseInt($(this).attr("data-connectorindex"));
                $(this).remove();

                const $childNode = DagView.getNode(childNodeId);
                const $childConnector = _getChildConnector($childNode, connectorIndex);
                const $parentConnector = $el.find(".connector.out");

                _drawLineBetweenNodes($parentConnector, $childConnector,
                    nodeId, childNodeId, connectorIndex, svg, offset);
            });

            // redraw all paths that lead into this node
            $dagView.find('.edge[data-childnodeid="' + nodeId + '"]').each(function() {
                const parentNodeId = $(this).attr("data-parentnodeid");
                let connectorIndex = parseInt($(this).attr("data-connectorindex"));
                $(this).remove();

                const $childConnector = _getChildConnector($el, connectorIndex);
                const $parentConnector =  DagView.getNode(parentNodeId)
                                                 .find(".connector.out");

                _drawLineBetweenNodes($parentConnector, $childConnector,
                     parentNodeId, nodeId, connectorIndex,
                     svg, offset);
            });
        });

        let dimensionsAltered = false;
        const $dfArea = $dagView.find(".dataflowArea.active");
        let dfAreaHeight = $dfArea.outerHeight();
        const dfWrapHeight = $dfWrap.height();
        const heightDiff = dfAreaHeight - dfWrapHeight;

        let dfAreaWidth = $dfArea.find(".sizer").outerWidth();
        const dfWrapWidth = $dfWrap.width();
        const widthDiff = dfAreaWidth - dfWrapWidth;
        if (heightDiff > 0) {
            if (heightDiff < 40) {
                dfAreaHeight = dfAreaHeight + 40;
            }
            $dfArea.outerHeight(dfAreaHeight);
            dimensionsAltered = true;
        }
        if (widthDiff > 0) {
            if (widthDiff < 40) {
                dfAreaWidth = dfAreaWidth + 40;
            }
            $dfArea.outerWidth(dfAreaWidth);
            dimensionsAltered = true;
        }
        if (dimensionsAltered) {
            activeDag.setDimensions(dfAreaWidth, dfAreaHeight);
        }

        Log.add(SQLTStr.MoveOperations, {
            "operation": SQLOps.MoveOperations,
            "dataflowId": 0,
            "nodeIds": nodeIds,
            "oldPositions": oldPositions,
            "newPositions": positions
        });
    }

    /**
     * DagView.run
     * @param _dagId
     * // run the entire dag
     */
    export function run(_dagId) {
        activeDag.executeAll();
    }

    /**
     * DagView.cancel
     * @param _dagId
     * // cancel entire run or execution
     */
    export function cancel(_dagId) {

    }

    function _removeConnection($edge, childNodeId) {
        const connectorIndex: number = parseInt($edge.attr('data-connectorindex'));
        $edge.remove();

        const $childNode: JQuery = DagView.getNode(childNodeId);
        const $childConnector: JQuery = _getChildConnector($childNode, connectorIndex);

        if ($childConnector.hasClass("multi")) {
            // if removing an edge from a multichildnode then decrement all
            // the edges that have a greater index than the removed one
            // due to splice action on children array
            $dagView.find('.edge[data-childnodeid="' + childNodeId + '"]').each(function() {
                const $curEdge: JQuery = $(this);
                const index: number = parseInt($curEdge.attr('data-connectorindex'));
                if (index > connectorIndex) {
                    $curEdge.attr("data-connectorindex", index - 1);
                }
            })
        } else if (activeDag.getNode(childNodeId).getNumParent() === 0) {
             $childConnector.removeClass("hasConnection")
                            .addClass("noConnection");
        }
    }


    function _setupSelectingAndDragDrop(): void {

        // moving node in dataflow area to another position
        $dfWrap.on("mousedown", ".operator .main", function(event) {
            const $operator = $(this).closest(".operator");

            // if not shift clicking, deselect other nodes
            // if shift clicking, and this is selected, then deselect it
            // but don't allow dragging on deselected node
            if (!$operator.hasClass("selected") && !event.shiftKey) {
                $dfWrap.find(".operator").removeClass("selected");
            } else if ($operator.hasClass("selected") && event.shiftKey) {
                $operator.removeClass("selected");
                return;
            }
            $operator.addClass("selected");
            if (event.which !== 1) {
                return;
            }
            const $dfArea = $dfWrap.find(".dataflowArea.active");

            new DragHelper({
                event: event,
                $element: $operator,
                $elements: $operator.add($dfArea.find(".operator.selected")),
                $container: $dagView,
                $dropTarget: $dfArea,
                onDragStart: function(_$els) {
                },
                onDragEnd: function($els, _event, data) {
                    let nodeIds: DagNodeId[] = [];
                    $els.each(function() {
                        const nodeId = $(this).data("nodeid");
                        nodeIds.push(nodeId);
                    });
                    DagView.moveNodes(0, nodeIds, data.coors);
                },
                onDragFail: function() {
                    // did not drag
                    if (!event.shiftKey) {
                        $dfWrap.find(".operator").removeClass("selected");
                        $operator.addClass("selected");
                    }
                },
                move: true
            });
        });

        // connecting 2 nodes
        $dfWrap.on("mousedown", ".operator .connector.out", function(event) {
            if (event.which !== 1) {
                return;
            }
            const $parentConnector = $(this);
            const $parentNode = $parentConnector.closest(".operator");
            const parentNodeId: DagNodeId = $parentNode.data("nodeid");
            const $dfArea = $dfWrap.find(".dataflowArea.active");
            let $candidates: JQuery;
            new DragLineHelper({
                event: event,
                $element: $parentConnector,
                $container: $dagView,
                $dropTarget: $dfArea,
                offset: {
                    x: 0,
                    y: -2
                },
                onDragStart: function() {
                    const $operators: JQuery = $dfArea.find(".operator");
                    $candidates = $operators.filter(function() {
                        const childNodeId = $(this).data("nodeid");
                        if (childNodeId === parentNodeId) {
                            return false;
                        }
                        let index = activeDag.getNode(childNodeId).getNextOpenConnectionIndex();
                        if (index === -1) {
                            return false;
                        } else {
                            return activeDag.canConnect(parentNodeId, childNodeId, index, true);
                        }
                    });
                    $operators.addClass("noDrop");

                    $candidates.removeClass("noDrop").addClass("dropAvailable");
                },
                onDragEnd: function(_$el, event) {
                    let $childNode: JQuery;
                    $candidates.removeClass("dropAvailable noDrop");
                    // check if location of drop matches position of a valid
                    // $operator
                    $candidates.not($parentNode).each(function() {
                        const rect: DOMRect = this.getBoundingClientRect();
                        const left: number = rect.left;
                        const right: number = rect.right;
                        const top: number = rect.top;
                        const bottom: number = rect.bottom;
                        if (event.pageX > left && event.pageX < right &&
                            event.pageY > top && event.pageY < bottom) {
                            $childNode = $(this);
                            return false;
                        }
                    });

                    if (!$childNode) {
                        console.log("invalid connection");
                        return;
                    }

                    const childNodeId: DagNodeId = $childNode.data("nodeid");
                    const childNode: DagNode = activeDag.getNode(childNodeId);
                    const connectorIndex: number = childNode.getNextOpenConnectionIndex();
                    if (!activeDag.canConnect(parentNodeId, childNodeId, connectorIndex)) {
                        StatusBox.show(DagTStr.CycleConnection, $childNode)

                        return;
                    }

                    DagView.connectNodes(parentNodeId, childNodeId, connectorIndex);
                },
                onDragFail: function() {

                },
                copy: true
            });
        });

        let $dfArea;
        let $operators;
        $dfWrap.on("mousedown", ".dataflowArea", function(event) {
            let $target = $(event.target);
            $dfArea = $(this);
            if ($target.is(".dataflowArea") || $target.is(".mainSvg")) {
                new RectSelction(event.pageX, event.pageY, {
                    "id": "dataflow-rectSelection",
                    "$container": $dfArea,
                    "onStart": function() {
                        $dfArea.addClass("drawing");
                        $operators = $dfArea.find(".operator");
                        $operators.removeClass("selected");
                    },
                    "onDraw": _drawRect,
                    "onEnd": _endDrawRect
                });
            }
        });

        function _drawRect(
            bound: DOMRect,
            selectTop: number,
            selectRight: number,
            selectBottom: number,
            selectLeft: number
        ): void {
            $operators.each(function() {
                const $operator = $(this);
                const opRect = this.getBoundingClientRect();
                const opTop = opRect.top - bound.top;
                const opLeft = opRect.left - bound.left;
                const opRight = opRect.right - bound.left;
                const opBottom = opRect.bottom - bound.top;
                if (opTop > selectBottom || opLeft > selectRight ||
                    opRight < selectLeft || opBottom < selectTop)
                {
                    $operator.removeClass("selecting");
                } else {
                    $operator.addClass("selecting");
                }
            });
        }
        function _endDrawRect(): void {
            $dfArea.removeClass("drawing");
            const $operators = $dfArea.find(".operator.selecting");
            if ($operators.length === 0) {
                $dfArea.find(".operator.selected").removeClass("selected");
            } else {
                $operators.each(function() {
                    $(this).removeClass("selecting")
                           .addClass("selected");
                });
            }
        }
    }

    function _getDFAreaOffset() {
        const containerRect = $dfWrap[0].getBoundingClientRect();
        const offsetTop = $dfWrap.scrollTop() - containerRect.top;
        const offsetLeft = $dfWrap.scrollLeft() - containerRect.left;

        return {
            top: offsetTop,
            left: offsetLeft
        }
    }

    const lineFunction = d3.svg.line()
    .x(function(d) {return d.x;})
    .y(function(d) {return d.y;})
    .interpolate("cardinal");

    function _drawLineBetweenNodes($parentConnector, $childConnector,
        parentNodeId, childNodeId, connectorIndex, svg, offset) {

        const parentRect = $parentConnector[0].getBoundingClientRect();
        const parentCoors = {
        x: parentRect.right + offset.left - 1,
        y: parentRect.top + offset.top + 5
        };

        let offsetTop = $childConnector.height() / 2;
        const childRect = $childConnector[0].getBoundingClientRect();
        const childCoors = {
        x: childRect.left + offset.left,
        y: childRect.top + offset.top + offsetTop
        };

        const edge = svg.append("g")
        .attr("class", "edge")
        .attr("data-childnodeid", childNodeId)
        .attr("data-parentnodeid", parentNodeId)
        .attr("data-connectorindex", connectorIndex);

        edge.append("path")
        .attr("class", "visibleLine")
        .attr("d", lineFunction([parentCoors, childCoors]));

        edge.append("path")
        .attr("class", "invisibleLine")
        .attr("d", lineFunction([parentCoors, childCoors]));
    }

    function _getChildConnector($childNode: JQuery, index: number): JQuery {
        let $childConnector: JQuery;
        let $childConnectors = $childNode.find(".connector.in");
        if ($childConnectors.hasClass(".multi")) {
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

    function _drawConnection(parentNodeId, childNodeId, connectorIndex) {
        const $childNode = DagView.getNode(childNodeId);
        const $childConnector: JQuery = _getChildConnector($childNode, connectorIndex);
        const $parentConnector = DagView.getNode(parentNodeId).find(".connector.out");

        $childConnector.removeClass("noConnection")
                       .addClass("hasConnection");

        const offset = _getDFAreaOffset();
        const svg = d3.select("#dagView .dataflowArea.active .mainSvg");

        _drawLineBetweenNodes($parentConnector, $childConnector,
                            parentNodeId, childNodeId,
                            connectorIndex, svg, offset);
    }
}