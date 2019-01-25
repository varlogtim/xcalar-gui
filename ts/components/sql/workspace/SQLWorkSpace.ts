class SQLWorkSpace {
    private static _instance: SQLWorkSpace;

    private _sqlEditorSpace: SQLEditorSpace;
    private _sqlResultSpace: SQLResultSpace;
    private _sqlHistorySpace: SQLHistorySpace;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._sqlEditorSpace = SQLEditorSpace.Instance;
        this._sqlResultSpace = SQLResultSpace.Instance;
        this._sqlHistorySpace = SQLHistorySpace.Instance;
    }

    public setup(): void {
        this._sqlEditorSpace.setup();
        this._sqlResultSpace.setup();
        this._sqlHistorySpace.setup();
        this._resizeEvents();
    }

    public switchMode(): void {
        this._sqlEditorSpace.switchMode();
    }

    public save(): XDPromise<void> {
        if (!XVM.isSQLMode()) {
            return PromiseHelper.resolve();
        }
        return SQLEditorSpace.Instance.save();
    }

    public refresh(): void {
        this._sqlEditorSpace.refresh();
        this._sqlHistorySpace.refresh();
    }

    public focus(): void {
        SQLWorkSpace.Instance.refresh();

        let resizeTimer;
        $(window).on("resize.sqlPanelResize", () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this._sqlEditorSpace.resize();
            }, 300);
        });
    }

    public unfocus(): void {
        $(window).off(".sqlPanelResize");
        this.save();
    }

    private _resizeEvents() {
        let $panel: JQuery = $('#sqlWorkSpacePanel');
        let $rightSection: JQuery = $panel.find(".rightSection");
        let $histSection: JQuery = $panel.find(".historySection");
        let $resultSection: JQuery = $panel.find(".resultSection");
        let rightSectionHeight: number;

        // resizable top/bottom result/history sections
        $histSection.resizable({
            handles: "n",
            containment: 'parent',
            minHeight: 36,
            start: function () {
                $panel.addClass("resizing");
                rightSectionHeight = $rightSection.height();
            },
            resize: function (_event, ui) {
                let pct = ui.size.height / rightSectionHeight;
                if (ui.position.top <= 100) {
                    pct = (rightSectionHeight - 100) / rightSectionHeight;
                    $histSection.height(rightSectionHeight - 100)
                             .css("top", 100);
                }

                $resultSection.outerHeight(100 * (1 - pct) + "%");
            },
            stop: function (_event, ui) {
                let pct = ui.size.height / rightSectionHeight;
                if (ui.position.top <= 100) {
                    ui.position.top = 100;
                    pct = (rightSectionHeight - 100) / rightSectionHeight;
                }
                let pctTop = ui.position.top / rightSectionHeight;
                $histSection.css("top", 100 * pctTop + "%")
                         .height(100 * pct + "%");
                $resultSection.outerHeight(100 * (1 - pct) + "%");
                $panel.removeClass("resizing");
            }
        });
    }
}