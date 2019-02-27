class DagTopBar {
    private static _instance: DagTopBar;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private $topBar: JQuery;

    public setup(): void {
        this.$topBar = $("#dagViewBar");
        this._addEventListeners();
    }

    public reset(): void {
        this._checkZoom();
    }

    public lock(): void {
        this.$topBar.addClass("locked");
    }

    public unlock(): void {
        this.$topBar.removeClass("locked");
    }

    /**
     * DagTopBar.Instance.setState
     * @param dagTab
     */
    public setState(dagTab: DagTab): void {
        const $btns: JQuery = this.$topBar.find(".topButtons");
        if (dagTab == null) {
            $btns.find(".topButton:not(.noTabRequired)").addClass("xc-disabled");
            return;
        }

        $btns.find(".topButton").removeClass("xc-disabled");

        const $userAndPublishOnlyBtns: JQuery = $btns.find(".run, .optimizedRun");
        if (dagTab instanceof DagTabUser || dagTab instanceof DagTabPublished) {
            $userAndPublishOnlyBtns.removeClass("xc-disabled");
        } else {
            $userAndPublishOnlyBtns.addClass("xc-disabled");
        }

        const graph: DagGraph = dagTab.getGraph();
        if (graph != null && graph.getExecutor() != null) {
            $btns.find(".stop").removeClass("xc-disabled");
        } else {
            $btns.find(".stop").addClass("xc-disabled");
        }

        if (graph != null) {
            let scale = graph.getScale() * 100;
            this.$topBar.find(".zoomPercentInput").val(scale);
        }

        this._toggleButtonsInSQLFunc(dagTab);
    }

    private _toggleButtonsInSQLFunc(dagTab: DagTab): void {
        const $btns: JQuery = this.$topBar.find(".topButtons");
        const $btnsToHideInSQLMode: JQuery = $btns.find(".optimizedRun");
        if (dagTab instanceof DagTabSQLFunc) {
            $btnsToHideInSQLMode.addClass("xc-hidden");
        } else {
            $btnsToHideInSQLMode.removeClass("xc-hidden");
        }
    }

    private _addEventListeners(): void {
        const self = this;
        this.$topBar.find(".run").click(function() {
            DagViewManager.Instance.run();
        });

        this.$topBar.find(".optimizedRun").click(function() {
            DagViewManager.Instance.run(null, true);
        });

        this.$topBar.find(".stop").click(function() {
            DagViewManager.Instance.cancel();
        });

        this.$topBar.find(".undo").click(function() {
            if ($(this).hasClass("disabled")) {
                return;
            }
            let dagTab = DagViewManager.Instance.getActiveDag();
            if (!dagTab || dagTab.isLocked()) {
                return;
            }
            Log.undo();
        });

        this.$topBar.find(".redo").click(function() {
            if ($(this).hasClass("disabled")) {
                return;
            }
            let dagTab = DagViewManager.Instance.getActiveDag();
            if (!dagTab || dagTab.isLocked()) {
                return;
            }
            Log.redo();
        });

        this.$topBar.find(".zoomIn").click(function() {
            DagViewManager.Instance.zoom(true);
            let percent = DagViewManager.Instance.getActiveDag().getScale() * 100;
            $("#dagViewBar .zoomPercent input").val(percent);
            self._checkZoom();
        });

        this.$topBar.find(".zoomOut").click(function() {
            DagViewManager.Instance.zoom(false);
            let percent = DagViewManager.Instance.getActiveDag().getScale() * 100;
            $("#dagViewBar .zoomPercent input").val(percent);
            self._checkZoom();
        });

        this.$topBar.find(".zoomPercent").on('keyup', function(e) {
            if (e.which == 13) {
                e.preventDefault();
                let percent: number = $(this).find("input").val();
                if (percent <= 0 || percent > 200) {
                    StatusBox.show("Zoom must be between 0% and 200%",
                        $(this));
                    return;
                }
                DagViewManager.Instance.zoom(true, percent / 100)
                self._checkZoom();
            }
        });

        // settings button
        this.$topBar.find(".setting").click(() => {
            DFSettingsModal.Instance.show();
        });
    }

    private _checkZoom(): void {
        const $zoomIn = this.$topBar.find(".zoomIn");
        const $zoomOut = this.$topBar.find(".zoomOut");
        $zoomIn.removeClass("disabled");
        $zoomOut.removeClass("disabled");
        const scale = DagViewManager.Instance.getActiveDag().getScale();
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
}