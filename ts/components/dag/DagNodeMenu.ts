namespace DagNodeMenu {
    let $dagView: JQuery;
    let $dfWrap: JQuery;
    let $menu: JQuery;
    let position: Coordinate;

    export function setup() {
        $dagView = $("#dagView");
        $dfWrap = $dagView.find(".dataflowWrap");
        $menu = $("#dagNodeMenu");
        _setupNodeMenu();
        _setupNodeMenuActions();
    }

    export function updateExitOptions(name) {
        var $li = $menu.find(".exitOp");
        $li.attr("class", "exitOp");

        var nameUpper = xcHelper.capitalize(name);
        var label = nameUpper;
        switch (name) {
            case ('groupby'):
                label = 'Group By';
                break;
            case ('datasetoppanel'):
                label = 'Dataset';
                break;
            default:
                break;
        }
        $li.html('<span class="label">Exit ' + label + '</span>');
        $li.addClass('exit' + nameUpper.replace(/ /g,''));
    }

    function _setupNodeMenu(): void {
        position = {x: 0, y: 0};
        xcMenu.add($menu);

        $dfWrap.on("contextmenu", ".operator .main", function(event: JQueryEventObject) {
            _showNodeMenu($(this), event);
            return false; // prevent default browser's rightclick menu
        });

        // XXX undecided if we want menu to open on a regular click or just rightclick
        // $dfWrap.on("click", ".operator .main", function(event: JQueryEventObject) {
        //     _showNodeMenu($(this), event);
        // });

        $dfWrap.on("click", ".edge", function(event) {
            _showEdgeMenu($(this), event);
        });

        $dfWrap.on("contextmenu", ".edge", function(event) {
            _showEdgeMenu($(this), event);
            return false;
        });

        $dfWrap.on("contextmenu", ".comment", function(event: JQueryEventObject) {
            _showCommentMenu($(this), event);
            return false; // prevent default browser's rightclick menu
        });

        $dfWrap.on("contextmenu", function(event: JQueryEventObject) {
            _showBackgroundMenu(event);
            return false;
        });
    }

    function _setupNodeMenuActions(): void {
        const $menu: JQuery = $("#dagNodeMenu");
        $menu.on("mouseup", "li", function(event) {
            if (event.which !== 1) {
                return;
            }
            const $li: JQuery = $(this);
            const action: string = $li.data('action');
            if ($li.hasClass("unavailable") || !action) {
                return;
            }
            const nodeId = $menu.data("nodeid"); // clicked node
            const nodeIds = DagView.getSelectedNodeIds(true, true);
            const operatorIds = DagView.getSelectedNodeIds(true);
            // all selected nodes && comments

            const parentNodeId = $menu.data("parentnodeid");
            const connectorIndex = $menu.data("connectorindex");

            switch (action) {
                case ("removeNode"):
                    DagView.removeNodes(nodeIds);
                    break;
                case ("removeAllNodes"):
                    Alert.show({
                        title: DagTStr.RemoveAllOperators,
                        msg: DagTStr.RemoveAllMsg,
                        onConfirm: function() {
                            const nodes: Map<DagNodeId, DagNode> = DagView.getActiveDag().getAllNodes();
                            let nodeIdsToRemove: DagNodeId[] = [];
                            nodes.forEach((_node: DagNode, nodeId: DagNodeId) => {
                                nodeIdsToRemove.push(nodeId);
                            });
                            const comments: Map<CommentNodeId, CommentNode> = DagView.getActiveDag().getAllComments();
                            comments.forEach((_node: CommentNode, nodeId: CommentNodeId) => {
                                nodeIdsToRemove.push(nodeId);
                            });
                            DagView.removeNodes(nodeIdsToRemove);
                        }
                    });
                    break;
                case ("selectAllNodes"):
                    DagView.selectNodes();
                    break;
                case ("removeInConnection"):
                    DagView.disconnectNodes(parentNodeId, nodeId, connectorIndex);
                    break;
                case ("copyNodes"):
                    DagView.copyNodes(nodeIds);
                    break;
                case ("cutNodes"):
                    DagView.cutNodes(nodeIds);
                    break;
                case ("pasteNodes"):
                    DagView.pasteNodes();
                    break;
                case ("executeNode"):
                    DagView.run(operatorIds);
                    break;
                case ("executeAllNodes"):
                    DagView.run();
                    break;
                case ("resetNode"):
                    DagView.reset(operatorIds);
                    break;
                case ("resetAllNodes"):
                    DagView.reset();
                    break;
                case ("configureNode"):
                    const node: DagNode = DagView.getActiveDag().getNode(operatorIds[0]);
                    configureNode(node);
                    break;
                case ("previewTable"):
                    DagView.previewTable(operatorIds[0]);
                    break;
                case ("previewAgg"):
                    DagView.previewAgg(nodeIds[0]);
                    break;
                case ("description"):
                    DagDescriptionModal.Instance.show(operatorIds[0]);
                    break;
                case ("newComment"):
                    const rect = $dfWrap.find(".dataflowArea.active")[0].getBoundingClientRect();
                    const x = position.x - rect.left - DagView.gridSpacing;
                    const y = position.y - rect.top - DagView.gridSpacing;
                    DagView.newComment({
                        position: {x: x, y: y}
                    }, true);
                    break;
                case ("autoAlign"):
                    DagView.autoAlign();
                    break;
                case ("viewSchema"):
                    DagSchemaPopup.Instance.show(nodeIds[0]);
                    break;
                case ("exitOpPanel"):
                    MainMenu.closeForms();
                    break;
                case ("createCustom"):
                    DagView.wrapCustomOperator(nodeIds);
                    break;
                default:
                    break;
            }
        });
    }

    function configureNode(node: DagNode) {
        const type: DagNodeType = node.getType();
        const subType: DagNodeSubType = node.getSubType();
        switch (type) {
            case (DagNodeType.Dataset):
                DatasetOpPanel.Instance.show(node);
                break;
            case (DagNodeType.Aggregate):
                AggOpPanel.Instance.show(node);
                break;
            case (DagNodeType.Filter):
                FilterOpPanel.Instance.show(node);
                break;
            case (DagNodeType.Join):
                JoinOpPanel.Instance.show(node);
                break;
            case (DagNodeType.Map):
                if (subType === DagNodeSubType.Cast) {
                    CastOpPanel.Instance.show(node);
                } else {
                    MapOpPanel.Instance.show(node);
                }
                break;
            case (DagNodeType.GroupBy):
                GroupByOpPanel.Instance.show(node);
                break;
            case (DagNodeType.Project):
                ProjectOpPanel.Instance.show(node);
                break;
            case (DagNodeType.Set):
                SetOpPanel.Instance.show(node);
                break;
            case (DagNodeType.Export):
                console.warn("not implement yet");
                break;
            case (DagNodeType.Custom):
                DagTabManager.Instance.newCustomTab(node as any);
                break;
            default:
                throw new Error("Unsupported type");
        }
    }

    function _showEdgeMenu($edge: JQuery, event: JQueryEventObject): void {
        let classes: string = " edgeMenu ";
        xcHelper.dropdownOpen($edge, $menu, {
            mouseCoors: {x: event.pageX, y: event.pageY},
            offsetY: 8,
            floating: true,
            classes: classes
        });

        // toggle selected class when menu is open
        $edge.attr("class", "edge selected");
        $(document).on("mousedown.menuClose", function() {
            $edge.attr("class", "edge");
            $(document).off("mousedown.menuClose");
        });
        const nodeId: DagNodeId = $edge.attr("data-childnodeid");
        const parentNodeId: DagNodeId = $edge.attr("data-parentnodeid");
        $menu.data("nodeid", nodeId);
        $menu.data("parentnodeid", parentNodeId);
        $menu.data("connectorindex", $edge.attr("data-connectorindex"));
    }

    function _showNodeMenu($clickedEl: JQuery, event: JQueryEventObject): void {
        const $operator: JQuery = $clickedEl.closest(".operator");
        let nodeIds = [];
        let $operators: JQuery = $operator.add(DagView.getSelectedNodes());
        $operators.each(function() {
            nodeIds.push($(this).data("nodeid"));
        });
        const nodeId: DagNodeId = $operator.data("nodeid");
        $menu.data("nodeid", nodeId);
        $menu.data("nodeids", nodeIds);

        let classes: string = " operatorMenu ";
        $menu.find("li").removeClass("unavailable");

        if (nodeIds.length === 1) {
            classes += " single ";
            const extraClasses: string = adjustMenuForSingleNode(nodeIds[0]);
            classes += extraClasses + " ";
        }  else {
            classes += " multiple ";
        }
        if (!DagView.hasClipboard()) {
            $menu.find(".pasteNodes").addClass("unavailable");
        }
        if ($("#dagView .dataflowArea.active .comment.selected").length) {
            classes += " commentMenu ";
        }

        xcHelper.dropdownOpen($clickedEl, $menu, {
            mouseCoors: {x: event.pageX, y: event.pageY},
            offsetY: 8,
            floating: true,
            classes: classes
        });
    }

    function _showCommentMenu($clickedEl: JQuery, event: JQueryEventObject): void {
        let nodeIds = DagView.getSelectedNodeIds();
        const nodeId: DagNodeId = $(this).data("nodeid");
        $menu.data("nodeid", nodeId);
        $menu.data("nodeids", nodeIds);

        let classes: string = " commentMenu ";
        $menu.find("li").removeClass("unavailable");

        if (!DagView.hasClipboard()) {
            $menu.find(".pasteNodes").addClass("unavailable");
        }

        xcHelper.dropdownOpen($clickedEl, $menu, {
            mouseCoors: {x: event.pageX, y: event.pageY},
            offsetY: 8,
            floating: true,
            classes: classes
        });
    }

    function _showBackgroundMenu(event: JQueryEventObject) {
        let classes: string = "";
        let operatorIds = DagView.getSelectedNodeIds();
        $menu.find("li").removeClass("unavailable");
        if (!DagView.getAllNodes().length) {
            classes += " none ";
            $menu.find(".removeAllNodes, .executeAllNodes, .selectAllNodes, .autoAlign")
            .addClass("unavailable");
        }
        if ($("#dagView .dataflowArea.active .comment").length) {
            $menu.find(".removeAllNodes").removeClass("unavailable");
        }

        $menu.data("nodeids", operatorIds);

        if (operatorIds.length) {
            classes += " operatorMenu "
            if (operatorIds.length === 1) {
                classes += " single ";
                const extraClasses: string = adjustMenuForSingleNode(operatorIds[0]);
                classes += extraClasses + " ";
            } else {
                classes += " multiple ";
            }
        } else {
            classes += " backgroundMenu ";
        }
        if (!DagView.hasClipboard()) {
            $menu.find(".pasteNodes").addClass("unavailable");
        }
        if ($("#dagView .dataflowArea.active .comment.selected").length) {
            classes += " commentMenu ";
        }

        position = {x: event.pageX, y: event.pageY};

        xcHelper.dropdownOpen($(event.target), $menu, {
            mouseCoors: {x: event.pageX, y: event.pageY},
            offsetY: 8,
            floating: true,
            classes: classes
        });
    }

    function adjustMenuForSingleNode(nodeId): string {
        const dagGraph: DagGraph = DagView.getActiveDag();
        const dagNode: DagNode = dagGraph.getNode(nodeId);
        const state: DagNodeState = (dagNode != null) ? dagNode.getState() : null;
        let classes = "";
        if (dagNode != null &&
            state === DagNodeState.Complete &&
            dagNode.getTable() != null
        ) {
            $menu.find(".previewTable").removeClass("unavailable");
        } else {
            $menu.find(".previewTable").addClass("unavailable");
        }
        if (dagNode != null && dagNode.getDescription()) {
            $menu.find(".description .label").text(DagTStr.EditDescription);
        } else {
            $menu.find(".description .label").text(DagTStr.AddDescription);
        }
        if (dagNode != null && dagNode.getType() === DagNodeType.Aggregate) {
            const aggNode = <DagNodeAggregate>dagNode;
            classes = "agg";
            if (state === DagNodeState.Complete &&
                aggNode.getAggVal() != null
            ) {
                $menu.find(".previewAgg").removeClass("unavailable");
            } else {
                $menu.find(".previewAgg").addClass("unavailable");
            }
        }
        if (state === DagNodeState.Configured || state === DagNodeState.Error) {
            $menu.find(".executeNode").removeClass("unavailable");
        } else {
            $menu.find(".executeNode").addClass("unavailable");
        }
        if (state === DagNodeState.Complete) {
            $menu.find(".resetNode").removeClass("unavailable");
        } else {
            $menu.find(".resetNode").addClass("unavailable");
        }
        return classes;
    }
}