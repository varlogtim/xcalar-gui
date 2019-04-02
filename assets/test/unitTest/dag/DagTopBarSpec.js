describe("DagTopBar Test", function() {
    let oldActiveDag;
    let topBar;
    let $topBar;

    before(function() {
        console.log("DagTopBar Test");
        if (XVM.isSQLMode()) {
            $("#modeArea").click();
        }

        oldActiveDag = DagViewManager.Instance.getActiveDag;
        DagViewManager.Instance.getActiveDag = function() {
            return null;
        };

        topBar = DagTopBar.Instance;
        $topBar = $("#dagViewBar");
    });

    it("Should lock", function() {
        $topBar.removeClass("locked");
        topBar.lock();
        expect($topBar.hasClass("locked")).to.be.true;
        $topBar.removeClass("locked");
    });
    
    it("Should unlock", function() {
        $topBar.removeClass("locked");
        topBar.unlock();
        expect($topBar.hasClass("locked")).to.be.false;
        $topBar.removeClass("locked");
    });

    it("Should render all expected buttons", function () {
        expect($topBar.find(".topButton").length).to.equal(11);
        expect($topBar.find(".undo").length).to.equal(1);
        expect($topBar.find(".redo").length).to.equal(1);
        expect($topBar.find(".run").length).to.equal(1);
        expect($topBar.find(".optimizedRun").length).to.equal(1);
        expect($topBar.find(".stop").length).to.equal(1);
        expect($topBar.find(".parameters").length).to.equal(1);
        expect($topBar.find(".aggregates").length).to.equal(1);
        expect($topBar.find(".setting").length).to.equal(1);
    })
    
    describe("zooming", function() { 
        it("Should disable zooming out button if at or below 25%", function() {
            let graph = new DagGraph();
            graph.setScale(.25);
            DagViewManager.Instance.getActiveDag = function() {
                return graph;
            };
            $topBar.find(".zoomOut").removeClass("disabled");
            topBar.reset();
            expect($topBar.find(".zoomOut").hasClass("disabled")).to.be.true;
        });

        it("Should disable zooming in button if at 200%", function() {
            let graph = new DagGraph();
            graph.setScale(2);
            DagViewManager.Instance.getActiveDag = function() {
                return graph;
            };
            $topBar.find(".zoomIn").removeClass("disabled");
            topBar.reset();
            expect($topBar.find(".zoomIn").hasClass("disabled")).to.be.true;
        });

        it("Should not disable either zooming button if between 25% and 200%", function() {
            let graph = new DagGraph();
            graph.setScale(1.5);
            DagViewManager.Instance.getActiveDag = function() {
                return graph;
            };
            $topBar.find(".zoomOut").addClass("disabled");
            $topBar.find(".zoomIn").addClass("disabled");
            topBar.reset();
            expect($topBar.find(".zoomOut").hasClass("disabled")).to.be.false;
            expect($topBar.find(".zoomIn").hasClass("disabled")).to.be.false;
        });
    });

    describe("states", function() { 
        it("Should disable most buttons on null dagtab", function () {
            topBar.setState(null);
            expect($topBar.find(".topButton.xc-disabled").length).to.equal(9);
            topBar.setState(new DagTab("name"));
            expect($topBar.find(".topButton.xc-disabled").length).to.equal(3);
        });

        it("Should disable/enable run/optimized on user/publish tabs", function () {
            topBar.setState(new DagTabUser("name"));
            expect($topBar.find(".run").hasClass("xc-disabled")).to.be.false;
            expect($topBar.find(".optimizedRun").hasClass("xc-disabled")).to.be.false;
            topBar.setState(new DagTab("name"));
            expect($topBar.find(".run").hasClass("xc-disabled")).to.be.true;
            expect($topBar.find(".optimizedRun").hasClass("xc-disabled")).to.be.true;
            topBar.setState(new DagTabPublished("name"));
            expect($topBar.find(".run").hasClass("xc-disabled")).to.be.false;
            expect($topBar.find(".optimizedRun").hasClass("xc-disabled")).to.be.false;
        });

        it("Should hide run optimized on SQLFunc", function () {
            topBar.setState(new DagTabSQLFunc("name"));
            expect($topBar.find(".run").hasClass("xc-hidden")).to.be.false;
            expect($topBar.find(".optimizedRun").hasClass("xc-hidden")).to.be.true;
        });

        it("Should set the scale correctly", function() {
            let graph = new DagGraph();
            graph.setScale(1.5);
            let tab = new DagTab("name", "3", graph);
            topBar.setState(tab);
            $topBar.find(".zoomPercentInput").val("150");
        });

        it("Should enable stop if the graph has an executor", function() {
            let graph = new DagGraph();
            graph.setExecutor(new DagGraphExecutor([], graph, {}));
            let tab = new DagTab("name", "3", graph);
            expect($topBar.find(".stop").hasClass("xc-disabled")).to.be.true;
            topBar.setState(tab);
            expect($topBar.find(".stop").hasClass("xc-disabled")).to.be.false;
        });
    });

    after(function() {
        DagViewManager.Instance.getActiveDag = oldActiveDag;
        topBar.setState(DagViewManager.Instance.getActiveTab());
    });
});