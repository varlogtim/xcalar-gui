class XcTableViewer extends XcViewer {
    protected table: TableMeta;
    protected rowInput: RowInput;
    protected skew: TableSkew;
    private rowManager: RowManager;
    private dataflowTabId: string;
    private dagNode: DagNode;
    private $container: JQuery;

    public static getTableFromDagNode(dagNode: DagNode): TableMeta {
        const tableName: string = dagNode.getTable();
        // XXX this code should be change after refine the table meta structure
        const tableId: TableId = xcHelper.getTableId(tableName);
        let table: TableMeta = gTables[tableId];
        if (!table) {
            table = new TableMeta({
                tableName: tableName,
                tableId: tableId,
                tableCols: [ColManager.newDATACol()]
            });
            gTables[tableId] = table;
        }
        const columns: ProgCol[] = dagNode.getLineage().getColumns(true);
        if (columns != null && columns.length > 0) {
            table.tableCols = columns.concat(ColManager.newDATACol());
        }
        return table;
    }

    public constructor(tabId: string, dagNode: DagNode, table: TableMeta) {
        const tableName: string = table.getName(); // use table name as unique id
        super(tableName);
        this.dataflowTabId = tabId;
        this.dagNode = dagNode;
        this.table = table;
        this.rowManager = new RowManager(table, this.getView());
        this.rowInput = new RowInput(this.rowManager);
        this.skew = new TableSkew(this.table);
        this._addEventListeners();
        this._setTableMode(true);
        DagTblManager.Instance.resetTable(tableName);
    }

    public getTitle(): string {
        return this.dagNode.getTitle();
    }

    /**
     * Clear Table Preview
     */
    public clear(): XDPromise<void> {
        super.clear();
        this._removeTableIconOnDagNode();
        this.rowInput.clear();
        this.skew.clear();
        return this.table.freeResultset();
    }

    /**
     * Render the view of the data
     */
    public render($container: JQuery): XDPromise<void> {
        super.render($container);
        this.$container = $container;
        this._showTableIconOnDagNode();
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this.table.getMetaAndResultSet()
        .then(() => {
            return this._startBuildTable();
        })
        .then(() => {
            this._afterBuild();
            this._renderSkew($container);
            this._renderRowInput($container);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }
    /**
     * Return the rowManager instacne
     */
    public getRowManager(): RowManager {
        return this.rowManager;
    }

    public getDataflowTabId(): string {
        return this.dataflowTabId;
    }

    public getNodeId(): DagNodeId {
        return this.dagNode.getId();
    }

    public replace(table: TableMeta): XcTableViewer {
        return new XcTableViewer(this.dataflowTabId, this.dagNode, table);
    }

    // XXX TODO: remove the protected functions, no use anymore
    protected _afterGenerateTableShell(): void {};
    protected _afterBuildInitialTable(_tableId: TableId): void {};

    private _addEventListeners(): void {
        // XXX this is still buggy, need update!
        this.$view.scroll((event) => {
            $(event.target).scrollTop(0);
            TblFunc.moveFirstColumn(null);
            TblFunc.alignLockIcon();
        });
    }

    private _getNodeEl(): JQuery {
        return DagView.getNode(this.dagNode.getId(), this.dataflowTabId);
    }

    private _showTableIconOnDagNode(): void {
        const $node: JQuery = this._getNodeEl();
        if ($node.length && !$node.find(".tableIcon").length) {
            const g = d3.select($node.get(0)).append("g")
                    .attr("class", "tableIcon")
                    .attr("transform", "translate(65, 2)");
            g.append("rect")
                .attr("x", 0)
                .attr("y", -8)
                .attr("width", 15)
                .attr("height", "13")
                .style("fill", "#378CB3");
            g.append("text")
                .attr("font-family", "icomoon")
                .attr("font-size", 8)
                .attr("fill", "white")
                .attr("x", 3)
                .attr("y", 2)
                .text(function(_d) {return "\uea07"});
        }
    }

    private _removeTableIconOnDagNode(): void {
        const $node: JQuery = this._getNodeEl();
        if ($node.length) {
            d3.select($node.get(0)).selectAll(".tableIcon").remove();
        }
    }

    private _startBuildTable(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const table: TableMeta = this.table;
        const tableId: string = table.getId();
        let initialTableBuilt: boolean = false;

        this.rowManager.getFirstPage()
        .then((jsonData) => {
            let isEmpty: boolean = false;
            table.currentRowNumber = jsonData.length;
            if (table.resultSetCount === 0) {
                isEmpty = true;
            }

            this._generateTableShell(tableId);
            this._buildInitialTable(tableId, jsonData, isEmpty);
            initialTableBuilt = true;

            const $table: JQuery = $('#xcTable-' + tableId);
            const requiredNumRows: number = Math.min(gMaxEntriesPerPage,
                                              table.resultSetCount);
            const numRowsStillNeeded: number = requiredNumRows - $table.find('tbody tr').length;
            if (numRowsStillNeeded > 0) {
                const info = {
                    "bulk": false,
                    "dontRemoveRows": true,
                    "numRowsAdded": null,
                    "numRowsToAdd": null,
                    "missingRows": []
                };

                return this.rowManager.addRows(table.currentRowNumber,
                                            numRowsStillNeeded,
                                            RowDirection.Bottom, info);
            } else {
                return PromiseHelper.resolve();
            }
        })
        .then(deferred.resolve)
        .fail((error) => {
            if (!initialTableBuilt) {
                console.error("startBuildTable fails!", error);
                deferred.reject(error);
            } else {
                deferred.resolve();
            }
        });
        return deferred.promise();
    }

    // creates thead and cells but not the body of the table
    private _generateTableShell(tableId: TableId): void {
        const xcTableShell: string =
                '<div id="xcTbodyWrap-' + tableId + '" class="xcTbodyWrap" ' +
                'data-id="' + tableId + '"></div>' +
                '<div class="tableScrollBar">' +
                    '<div class="sizer"></div>' +
                '</div>';
        const $view: JQuery = this.getView();
        if (this instanceof XcTableInWSViewer) {
            $view.attr("id", "xcTableWrap-" + tableId)
             .attr("data-id", tableId)
             .addClass("xcTableWrap tableWrap building");
            $view.html(xcTableShell);
        } else {
            const xcTableWrap: string =
            '<div id="xcTableWrap-' + tableId + '"' +
                ' class="xcTableWrap tableWrap building" ' +
                'data-id="' + tableId + '">' +
                xcTableShell +
            '</div>';
            $view.html(xcTableWrap);
        }

        const tableShell: string = TblManager.generateTheadTbody(tableId);
        const tableHtml: string =
            '<table id="xcTable-' + tableId + '" class="xcTable dataTable" ' +
            'style="width:0px;" data-id="' + tableId + '">' +
                tableShell +
            '</table>' +
            '<div class="rowGrab last"></div>';

        this.getView().find(".xcTbodyWrap").append(tableHtml);
        this._afterGenerateTableShell();
    }

    private _buildInitialTable(
        tableId: TableId,
        jsonData: string[],
        isEmpty: boolean
    ): void {
        const numRows: number = jsonData.length;
        const $table: JQuery = $("#xcTable-" + tableId);
        this._addScrollbar();

        if (isEmpty && numRows === 0) {
            console.log('no rows found, ERROR???');
            $table.addClass('emptyTable');
            jsonData = [""];
        }

        TblManager.pullRowsBulk(tableId, jsonData, 0);
        this._addTableListeners(tableId);
        TblManager.addColListeners($table, tableId);

        if (numRows === 0) {
            $table.find('.idSpan').text("");
        }
        this._afterBuildInitialTable(tableId);
    }

    protected _afterBuild(): void {
        const tableId: TableId = this.table.getId();
        const $table: JQuery = $('#xcTable-' + tableId);
        const table: TableMeta = this.table;
        const $lastRow: JQuery = $table.find('tr:last');
        const lastRowNum: number = xcHelper.parseRowNum($lastRow);
        table.currentRowNumber = lastRowNum + 1;

        const $xcTableWrap: JQuery = $('#xcTableWrap-' + tableId);
        $xcTableWrap.removeClass("building");
        this._autoSizeDataCol(tableId);
    }

    private _autoSizeDataCol(tableId: TableId): void {
        const progCols: ProgCol[] = this.table.tableCols;
        let dataCol: ProgCol;
        let dataColIndex: number;
        for (let i = 0; i < progCols.length; i++) {
            if (progCols[i].isDATACol()) {
                dataCol = progCols[i];
                dataColIndex = i + 1;
                break;
            }
        }
        if (dataCol.width === "auto") {
            const winWidth: number = $(window).width();
            let maxWidth: number = 200;
            let minWidth: number = 150;
            if (winWidth > 1400) {
                maxWidth = 300;
            } else if (winWidth > 1100) {
                maxWidth = 250;
            }
            if (dataCol.hasMinimized()) {
                dataCol.width = minWidth;
                return;
            } else {
                dataCol.width = minWidth;
            }
            const $th: JQuery = $('#xcTable-' + tableId).find('th.col' + dataColIndex);
            TblFunc.autosizeCol($th, {
                fitAll: true,
                minWidth: minWidth,
                maxWidth: maxWidth,
                datastore: false,
                dblClick: false,
                unlimitedWidth: false,
                multipleCols: false,
                includeHeader: false
            });
        }
    }

    protected _addTableListeners(tableId: TableId): void {
        const $xcTableWrap: JQuery = $("#xcTableWrap-" + tableId);
        $xcTableWrap.on("mousedown", ".lockedTableIcon", function() {
            // handlers fire in the order that it's bound in.
            // So we are going to handle this, which removes the background
            // And the handler below will move the focus onto this table
            const txId: number = $(this).data("txid");
            if (txId == null) {
                return;
            }
            xcTooltip.refresh($(".lockedTableIcon .iconPart"), 100);
            QueryManager.cancelQuery(txId);
            xcTooltip.hideAll();
        });

        $xcTableWrap.scroll(function() {
            $(this).scrollLeft(0); // prevent scrolling when colmenu is open
            $(this).scrollTop(0); // prevent scrolling when colmenu is open
        });

        const $rowGrab: JQuery = $("#xcTbodyWrap-" + tableId).find(".rowGrab.last");
        $rowGrab.mousedown(function(event) {
            if (event.which === 1) {
                TblAnim.startRowResize($(this), event);
            }
        });
    }

    protected _setTableMode(modelingMode: boolean = false): void {
        this.table.modelingMode = modelingMode;
    }

    private _addScrollbar(): void {
        this._setupScrollMeta();
        this._setupScrollbar();
        this._infScrolling();
    }

    // TODO XXX move this into the table constructor
    private _setupScrollMeta() {
        this.table.scrollMeta = {
            isTableScrolling: false,
            isBarScrolling: false,
            base: 0,
            scale: null
        };
    }

    private _setupScrollbar(): void {
        const $view: JQuery = this.getView();
        const $table = $view.find(".xcTable");

        this.rowManager.setSizerHeight();

        const $scrollBar: JQuery = $view.find(".tableScrollBar");
        $scrollBar.width(gScrollbarWidth + 1);

        let isMouseDown: boolean = false;
        const visibleRows: number = this._getVisibleRows();
        $scrollBar.scroll(() => {
            if (isMouseDown) {
                return;
            }
            const table = this.table;
            const scrollMeta = table.scrollMeta;
            if (scrollMeta.isTableScrolling) {
                scrollMeta.isTableScrolling = false;
            } else {
                scrollMeta.isBarScrolling = true;
                let top: number = $scrollBar.scrollTop() + scrollMeta.base;
                const numRowsAbove: number = table.currentRowNumber - visibleRows;
                const rowsAboveHeight: number = this.rowManager.getRowsAboveHeight(numRowsAbove);
                top -= rowsAboveHeight;
                this.getView().find(".xcTbodyWrap").scrollTop(top);
            }
        });

        $scrollBar.on("mousedown", (event) => {
            if (event.which !== 1) {
                return;
            }
            isMouseDown = true;
            $(document).on("mouseup.tableScrollBar", () => {
                isMouseDown = false;
                $(document).off("mouseup.tableScrollBar");

                if ($table.hasClass("scrolling")) {
                    return;
                }

                const table: TableMeta = this.table;
                const scrollMeta = table.scrollMeta;
                const scrollTop: number = $scrollBar.scrollTop();
                const outerHeight: number = $scrollBar.outerHeight();
                let top: number = scrollTop * scrollMeta.scale;

                // if scrollbar is all the way at the bottom
                if (scrollMeta.scale > 1 && ($scrollBar[0].scrollHeight -
                    scrollTop - outerHeight <= 1)) {
                    top += outerHeight * scrollMeta.scale;
                }

                let rowNum: number = Math.ceil((top / gRescol.minCellHeight));
                const defaultRowNum: number = rowNum;

                let numPages: number = Math.ceil(rowNum / gNumEntriesPerPage);
                let extraHeight: number = 0;
                for (let pageNumStr in table.rowHeights) {
                    const pageNum: number = Number(pageNumStr);
                    if (pageNum < numPages) {
                        const page = table.rowHeights[pageNum];
                        for (let row in page) {
                            if (Number(row) <= rowNum) {
                                const height: number = page[row] - gRescol.minCellHeight;
                                extraHeight += height;
                                rowNum = Math.ceil(defaultRowNum -
                                    (extraHeight / gRescol.minCellHeight));

                                numPages = Math.ceil(rowNum /
                                                     gNumEntriesPerPage);
                                if (pageNum >= numPages) {
                                    extraHeight -= height;
                                    rowNum = Math.ceil(defaultRowNum -
                                        (extraHeight / gRescol.minCellHeight));
                                    break;
                                }
                            }
                        }
                    }
                }

                rowNum += 1;
                rowNum = Math.round(rowNum);
                scrollMeta.base = top - (top / scrollMeta.scale);
                this.rowInput.skipTo(rowNum);
            });
        });
    }

    private _infScrolling(): void {
        const table: TableMeta = this.table;
        if (table.resultSetCount <= 0) {
            return;
        }
        const $xcTbodyWrap: JQuery = this.getView().find(".xcTbodyWrap");
        const visibleRows: number = this._getVisibleRows();
        let needsFocusing: boolean = true;
        let focusTimer: number;
        $xcTbodyWrap.scroll(() => {
            if (gMouseStatus === "movingTable") {
                return;
            }

            const $table: JQuery = this.getView().find(".xcTable");

            if ($table.hasClass('autoScroll')) {
                $table.removeClass('autoScroll');
                return;
            }

            const deferred: XDDeferred<void> = PromiseHelper.deferred();
            const tableId: TableId = this.table.getId();
            if (needsFocusing) {
                needsFocusing = false;
                TblFunc.focusTable(tableId, false);
                clearElements();
            }

            clearTimeout(focusTimer);
            focusTimer = window.setTimeout(scrollingEnd, 200);

            this.rowInput.updateCurrentRowNum();

            const scrollTop: number = $xcTbodyWrap.scrollTop();
            const scrollMeta = table.scrollMeta;
            if (scrollMeta.isBarScrolling) {
                scrollMeta.isBarScrolling = false;
            } else {
                scrollMeta.isTableScrolling = true;
                const numRowsAbove: number = table.currentRowNumber - visibleRows;
                const rowsAboveHeight: number = this.rowManager.getRowsAboveHeight(numRowsAbove);
                let scrollBarTop: number = scrollTop + rowsAboveHeight;
                scrollBarTop -= scrollMeta.base;
                $xcTbodyWrap.siblings(".tableScrollBar")
                            .scrollTop(scrollBarTop);
            }

            const $firstRow: JQuery = $table.find('tbody tr:first');
            const topRowNum: number = xcHelper.parseRowNum($firstRow);
            let fetched: boolean = false;

            // gets this class from rowManager.addRows
            if ($table.hasClass("scrolling") || $firstRow.length === 0) {
                deferred.resolve();
            } else if (scrollTop === 0 && !$firstRow.hasClass('row0')) {
                // scrolling to top
                const numRowsToAdd: number = Math.min(gNumEntriesPerPage, topRowNum,
                                        table.resultSetMax);

                const rowNumber: number = topRowNum - numRowsToAdd;
                if (rowNumber < table.resultSetMax) {
                    fetched = true;
                    this.rowManager.addRows(rowNumber, numRowsToAdd, RowDirection.Top, {
                        bulk: false,
                        numRowsToAdd: null,
                        numRowsAdded: null,
                        dontRemoveRows: false,
                        missingRows: null
                    })
                    .then(deferred.resolve)
                    .fail(deferred.reject);
                } else {
                    deferred.resolve();
                }
            } else if (isScrollBarAtBottom()) {
                // scrolling to bottom
                if (table.currentRowNumber < table.resultSetMax) {
                    const numRowsToAdd: number = Math.min(gNumEntriesPerPage,
                                    table.resultSetMax -
                                    table.currentRowNumber);
                    fetched = true;
                    this.rowManager.addRows(table.currentRowNumber, numRowsToAdd, RowDirection.Bottom, {
                        bulk: false,
                        numRowsToAdd: null,
                        numRowsAdded: null,
                        dontRemoveRows: false,
                        missingRows: null
                    })
                    .then(deferred.resolve)
                    .fail(deferred.reject);
                } else {
                    deferred.resolve();
                }
            } else {
                deferred.resolve();
            }

            deferred
            .always(() => {
                if (fetched) {
                    if ($table.find('.jsonElement.modalHighlighted').length) {
                        JSONModal.rehighlightTds($table);
                    }
                    if (!$.isEmptyObject(table.highlightedCells)) {
                        TblManager.rehighlightCells(tableId);
                    }
                }

                this.rowInput.updateCurrentRowNum();
            });
        });

        function scrollingEnd() {
            needsFocusing = true;
        }

        function isScrollBarAtBottom() {
            return ($xcTbodyWrap[0].scrollHeight - $xcTbodyWrap.scrollTop() -
                       $xcTbodyWrap.outerHeight() <= 1);
        }

        function clearElements() {
            $(".menu:visible").hide();
            xcMenu.removeKeyboardNavigation();
        }
    }

    private _getVisibleRows(): number {
        return Math.min(gMaxEntriesPerPage, this.table.resultSetCount);
    }

    private _renderRowInput($container: JQuery): void {
        const $rowInputArea = $container.find(".rowInputArea");
        this.rowInput.render($rowInputArea);
    }

    private _renderSkew($container: JQuery): void {
        const $skewInfoArea = $container.find(".skewInfoArea");
        this.skew.render($skewInfoArea);
    }
}