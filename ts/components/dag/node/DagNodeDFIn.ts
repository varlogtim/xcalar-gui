class DagNodeDFIn extends DagNodeIn {
    public static readonly SELF_ID: string = "self";

    protected input: DagNodeDFInInput;
    private _graph: DagGraph; // non-persistent

    public constructor(options: DagNodeDFInInfo) {
        super(<DagNodeInInfo>options);
        this.type = DagNodeType.DFIn;
        this.display.icon = "&#xe952;"; // XXX TODO: UI design
        this.input = new DagNodeDFInInput(options.input);
        this._graph = options.graph || null;
    }

    public setParam(input: DagNodeDFInInputStruct = <DagNodeDFInInputStruct>{}): void {
        let dataflowId: string = input.dataflowId;
        if (this._graph && dataflowId === this._graph.getTabId()) {
            dataflowId = DagNodeDFIn.SELF_ID;
        }
        this.input.setInput({
            dataflowId: dataflowId,
            linkOutName: input.linkOutName
        });
        super.setParam();
    }

    public getLinkedNodeAndGraph(): {graph: DagGraph, node: DagNodeDFOut} {
        const param: DagNodeDFInInputStruct = this.input.getInput();
        const dataflowId: string = param.dataflowId;
        const linkOutName: string = param.linkOutName;
        const candidateGraphs: DagGraph[] = this._findLinkedGraph(dataflowId);
        if (candidateGraphs.length === 0) {
            throw new Error(DagNodeErrorType.NoGraph);
        }
        let dfOutNodes: DagNode[] = [];
        let resGraph: DagGraph = null;
        candidateGraphs.forEach((dagGraph) => {
            const resNodes = this._findLinkedOutNodeInGraph(dagGraph, linkOutName);
            if (resNodes.length > 0) {
                resGraph = dagGraph;
            }
            dfOutNodes = dfOutNodes.concat(resNodes);
        });
        if (dfOutNodes.length === 0) {
            throw new Error(DagNodeErrorType.NoLinkInGraph);
        }
        if (dfOutNodes.length > 1) {
            throw new Error(DagNodeErrorType.MoreLinkGraph);
        }
        return {
            graph: resGraph,
            node: <DagNodeDFOut>dfOutNodes[0]
        };
    }

    public lineageChange(_columns: ProgCol[]): DagLineageChange {
        const colums: ProgCol[] = this.getSchema().map((col) => {
            const fontName: string = xcHelper.parsePrefixColName(col.name).name;
            return ColManager.newPullCol(fontName, col.name, col.type);
        });
        return {
            columns: colums,
            changes: []
        };
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeDFInInputStruct = this.getParam();
        if (input.linkOutName) {
            hint = `Link to: ${input.linkOutName}`;
        }
        return hint;
    }

    protected _getColumnsUsedInInput() {
        return null;
    }

    // XXX TODO: This function used DagTabManager now, which is against
    // our design to make DagNode in low level. Should use
    // other ways to do it (for example, the Angluar JS service way)
    private _findLinkedGraph(dataflowId: string): DagGraph[] {
        let candidateTabs: DagTab[] = [];
        const candidateGraphs: DagGraph[] = [];
        if (dataflowId === DagNodeDFIn.SELF_ID) {
            return [this._graph];
        } else if (dataflowId != null && dataflowId != "") {
            candidateTabs = [DagTabManager.Instance.getTabById(dataflowId)];
        } else {
            candidateTabs = DagTabManager.Instance.getTabs();
        }
        candidateTabs.forEach((dagTab) => {
            if (dagTab != null) {
                const graph: DagGraph = dagTab.getGraph();
                if (graph != null) {
                    candidateGraphs.push(graph);
                }
            }
        });
        return candidateGraphs;
    }

    private _findLinkedOutNodeInGraph(graph: DagGraph, linkOutName: string): DagNode[] {
        if (graph == null) {
            throw new Error(DagNodeErrorType.NoGraph);
        }
        const dfOutNodes: DagNode[] = graph.filterNode((node) => {
            if (node.getType() === DagNodeType.DFOut) {
                const dfOutNode = <DagNodeDFOut>node;
                if (dfOutNode.getParam().name === linkOutName) {
                    return true;
                }
            } else {
                return false;
            }
        });
        return dfOutNodes;
    }
}