class DagTabSQL extends DagTab {
    private _SQLNode: DagNodeSQL;

    constructor(options: {
        id: string,
        name: string,
        SQLNode: DagNodeSQL,
    }) {
        const { id, name, SQLNode } = options;
        super(name, id, null);
        this._SQLNode = SQLNode;
    }

    /**
     * Saves this Tab in the kvStore
     */
    public save(): XDPromise<void> {
        return DagTabManager.Instance.saveParentTab(this.getId());
    }

    /**
     * gets the DagGraph for this tab
     * @returns {DagGraph}
     */
    public getGraph(): DagGraph {
        return this._SQLNode.getSubGraph();
    }

    // do nothing
    public discardUnsavedChange(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    // do nothing
    public load(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    // do nothing
    public delete(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    // do nothing
    public download(): XDPromise<void> {
        return PromiseHelper.resolve();
    }
}