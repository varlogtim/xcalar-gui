describe("Dag Node Test", () => {
    it("should get id", () => {
        const node = new DagNode({id: "test"});
        expect(node.getId()).to.be.equal("test");
    });

    it("should auto generate id", () => {
        const node = new DagNode();
        expect(node.getId().startsWith("dag.")).to.be.true;
    });

    it("should get node type", () => {
        const node = new DagNode({type: DagNodeType.Filter});
        expect(node.getType()).to.equal(DagNodeType.Filter);
    });

    it("should get node's max parent that can have", () => {
        const tests = [{
            type: DagNodeType.Dataset,
            expect: 0
        }, {
            type: DagNodeType.Filter,
            expect: 1
        }, {
            type: DagNodeType.Join,
            expect: 2
        }, {
            type: DagNodeType.Union,
            expect: -1
        }];

        tests.forEach((test) => {
            const node = new DagNode({type: test.type});
            expect(node.getMaxParents()).to.equal(test.expect);
        });
    });

    it("should get node's max children that can have", () => {
        const tests = [{
            type: DagNodeType.Export,
            expect: 0
        }, {
            type: DagNodeType.Filter,
            expect: -1
        }];

        tests.forEach((test) => {
            const node = new DagNode({type: test.type});
            expect(node.getMaxChildren()).to.equal(test.expect);
        });
    });

    it("should get all parents", () => {
        const node = new DagNode();
        expect(node.getParents()).to.be.an("array");
    });

    it("should get current number of parent", () => {
        const node = new DagNode();
        expect(node.getNumParent()).to.equal(0);
    });

    it("should get all children", () => {
        const node = new DagNode();
        expect(node.getChildren()).to.be.an("array");
    });

    it("should get position", () => {
        const node = new DagNode();
        const coor = node.getPosition();
        expect(coor).to.deep.equal({x: -1, y: -1});
    });

    it("should set position", () => {
        const node = new DagNode();
        node.setPosition({x: 1, y: 2});
        const coor = node.getPosition();
        expect(coor).to.deep.equal({x: 1, y: 2});
    });

    it("should get comment", () => {
        const node = new DagNode();
        expect(node.getComment()).to.be.undefined;
    });

    it("should set comment", () => {
        const node = new DagNode();
        node.setComment("test");
        expect(node.getComment()).to.equal("test");
    });

    it("should remove comment", () => {
        const node = new DagNode();
        node.setComment("test");
        node.removeComment();
        expect(node.getComment()).to.be.undefined;
    });

    it("should get state", () => {
        const node = new DagNode();
        expect(node.getState()).to.equal(DagNodeState.Unused);
    });

    it("should set state", () => {
        const node = new DagNode();
        node.setState(DagNodeState.Complete);
        expect(node.getState()).to.equal(DagNodeState.Complete);
    });

    it("should get table", () => {
        const node = new DagNode();
        expect(node.getTable()).to.be.undefined;
    });

    it("should set tabble", () => {
        const node = new DagNode();
        node.setTable("testName");
        expect(node.getTable()).to.equal("testName");
    });

    it("should remove table", () => {
        const node = new DagNode();
        node.setTable("testName");
        node.removeTable();
        expect(node.getTable()).to.be.undefined;
    });

    it.skip("should get parameters", () => {
        const node = new DagNode();
        expect(node.getParams()).to.be.an("object");
    });

    it.skip("should set parameters", () => {
        const node = new DagNode({type: DagNodeType.Dataset});
    });

    it("should connect to parent", () => {
        const node = new DagNode({type: DagNodeType.Map});
        const parentNode = new DagNode();
        node.connectToParent(parentNode, 0);
        expect(node.getNumParent()).to.equal(1);
    });

    it("should throw error when already has parent but connect", () => {
        const node = new DagNode({type: DagNodeType.Map});
        const parentNode = new DagNode();
        try {
            node.connectToParent(parentNode, 0);
            // error case
            node.connectToParent(parentNode, 0);
        } catch (e) {
            expect(e).to.be.instanceof(Error);
            expect(node.getNumParent()).to.equal(1);
        }
    });

    it("should throw error when add agg node to wrong kinds of node", () => {
        const node = new DagNode({type: DagNodeType.Join});
        const aggNode = new DagNode({type: DagNodeType.Aggregate});
        try {
            node.connectToParent(aggNode, 0);
        } catch (e) {
            expect(e).to.be.instanceof(Error);
            expect(node.getNumParent()).to.equal(0);
        }
    });

    it("should throw error connect to node that has max parents", () => {
        const node = new DagNode({type: DagNodeType.Dataset});
        const aggNode = new DagNode();
        try {
            node.connectToParent(aggNode, 0);
        } catch (e) {
            expect(e).to.be.instanceof(Error);
            expect(node.getNumParent()).to.equal(0);
        }
    });

    it("should connect to children", () => {
        const node = new DagNode();
        const childNode = new DagNode();
        node.connectToChidren(childNode);
        expect(node.getChildren().length).to.equal(1);
    });

    it("should throw error connect to invalid node", () => {
        const node = new DagNode({type: DagNodeType.Export});
        const childNode = new DagNode();
        try {
            node.connectToChidren(childNode, 0);
        } catch (e) {
            expect(e).to.be.instanceof(Error);
            expect(node.getChildren().length).to.equal(0);
        }
    });

    it("should disconnect from parent node", () => {
        const node = new DagNode({type: DagNodeType.Map});
        const parentNode = new DagNode();
        node.connectToParent(parentNode, 0);

        node.disconnectFromParent(parentNode, 0);
        expect(node.getNumParent()).to.equal(0);
    });

    it("should throw error when disconnect at wrong position from parent node", () => {
        const node = new DagNode({type: DagNodeType.Map});
        const parentNode = new DagNode();
        try {
            node.disconnectFromParent(parentNode, 0);
        } catch (e) {
            expect(e).to.be.instanceof(Error);
            expect(node.getNumParent()).to.equal(0);
        }
    });

    it("should throw error when disconnect at wrong parent node", () => {
        const node = new DagNode({type: DagNodeType.Map});
        const parentNode = new DagNode();
        node.connectToParent(parentNode, 0);

        try {
            node.disconnectFromParent(node, 0);
        } catch (e) {
            expect(e).to.be.instanceof(Error);
            expect(node.getNumParent()).to.equal(1);
        }
    });

    it("should disconnect from child node", () => {
        const node = new DagNode();
        const childNode = new DagNode();
        node.connectToChidren(childNode);

        node.disconnectFromChildren(childNode);
        expect(node.getChildren().length).to.equal(0);
    });

    it("should throw error when disconnect wrong child node", () => {
        const node = new DagNode();
        const childNode = new DagNode();
        node.connectToChidren(childNode);

        try {
            node.disconnectFromChildren(node);
        } catch (e) {
            expect(e).to.be.instanceof(Error);
            expect(node.getChildren().length).to.equal(1);
        }
    });
});