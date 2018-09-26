class DagNodeDFOut extends DagNodeOut {
    protected input: DagNodeDFOutInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.DFOut;
    }

    public getParam(): DagNodeDFOutInput {
        return {
            name: this.input.name || ""
        };
    }

    public setParam(input: DagNodeDFOutInput = <DagNodeDFOutInput>{}): void {
        this.input = {
            name: input.name
        };
        super.setParam();
    } 
}