class TblFunc {
    /* Possible Options:
        includeHeader: boolean, default is false. If set, column head will be
                        included when determining column width
        fitAll: boolean, default is false. If set, both column head and cell widths
                will be included in determining column width
        minWidth: integer, default is 10. Minimum width a column can be.
        maxWidth: integer, default is 2000. Maximum width a column can be.
        unlimitedWidth: boolean, default is false. Set to true if you don't want to
                        limit the width of a column
        dataStore: boolean, default is false. Set to true if measuring columns
                    located in the datastore panel
        dblClick: boolean, default is false. Set to true when resizing using a
                    double click,
        multipleCols: boolean, default is false. Set to true if this is one of many cols
        being resized so we don't call matchHeaders() multiple times
    */

   /**
    * TblFunc.autosizeCol
    * @param $th th element to resize
    * @param options option for resizing
    * includeHeader: If set, column head will be included when determining column width.
    * fitAll: If set, both column head and cell widths will be included in determining column width.
    * minWidth: Minimum width a column can be.
    * maxWidth: Maximum width a column can be.
    * unlimitedWidth: Set to true if you don't want to limit the width of a column.
    * dataStore: Set to true if measuring columns located in the datastore panel.
    * dblClick: Set to true when resizing using a double click.
    * multipleCols: Set to true if this is one of many cols being resized so we
    *               don't call matchHeaders() multiple times.
    */
    public static autosizeCol(
        $th: JQuery,
        options: {
            includeHeader: boolean,
            fitAll: boolean,
            minWidth: number,
            maxWidth: number,
            datastore: boolean
            dblClick: boolean,
            unlimitedWidth: boolean
            multipleCols: boolean
        }
    ): number {
        const colNum: number = $th.index();
        const $table: JQuery = $th.closest(".dataTable");

        const includeHeader: boolean = options.includeHeader || false;
        const fitAll: boolean = options.fitAll || false;
        const minWidth: number = options.minWidth || (gRescol.cellMinWidth - 5);
        const maxWidth: number = options.maxWidth || 700;
        const datastore: boolean = options.datastore || false;

        let table: TableMeta = null;
        if (!datastore) {
            const tableId: TableId = xcHelper.parseTableId($table);
            table = gTables[tableId];
        }

        const widestTdWidth: number = TblFunc.getWidestTdWidth($th, {
            "includeHeader": includeHeader,
            "fitAll": fitAll,
            "datastore": datastore
        });
        let newWidth: number = Math.max(widestTdWidth, minWidth);
        // dblClick is autoSized to a fixed width
        if (!options.dblClick) {
            let originalWidth: number = minWidth;
            if (table != null) {
                originalWidth = <number>table.getCol(colNum).width;
            }

            newWidth = Math.max(newWidth, originalWidth);
        }

        if (!options.unlimitedWidth) {
            newWidth = Math.min(newWidth, maxWidth);
        }

        $th.outerWidth(newWidth);
        if (table != null) {
            table.tableCols[colNum - 1].width = newWidth;
        } else if (datastore) {
            $("#dsTableWrap").width($("#dsTable").width());
        }
        if (!options.multipleCols) {
            TblFunc.matchHeaderSizes($table);
        }
        return newWidth;
    }

    /**
     * TblFunc.getWidestTdWidth
     * @param $el a data cell element
     * @param options
     */
    public static getWidestTdWidth(
        $el: JQuery,
        options: {
            includeHeader: boolean,
            fitAll: boolean,
            datastore: boolean
        }
    ) {
        const includeHeader: boolean = options.includeHeader || false;
        const fitAll: boolean = options.fitAll || false;
        const colNum: number = $el.index();
        const $table: JQuery = $el.closest('.dataTable');
        let headerWidth: number = 0;

        if (fitAll || includeHeader) {
            let extraPadding: number = 48;
            if (options.datastore) {
                extraPadding += 4;
            }
            let $th: JQuery;
            if ($table.find('.col' + colNum + ' .dataCol').length === 1) {
                $th = $table.find('.col' + colNum + ' .dataCol');
            } else {
                $th = $table.find('.col' + colNum + ' .editableHead');
            }
            if (!$th.length) {
                $th = $el;
                extraPadding -= 40;
            }

            headerWidth = xcHelper.getTextWidth($th) + extraPadding;
            // include prefix width
            if ($th.closest('.xcTable').length) {
                const prefixText: string = $th.closest('.header').find('.prefix').text();
                const prefixWidth: number = xcHelper.getTextWidth(null, prefixText);
                headerWidth = Math.max(headerWidth, prefixWidth);
            }

            if (!fitAll) {
                return headerWidth;
            }
        }

        // we're going to take advantage of monospaced font
        //and assume text length has an exact correlation to text width
        let $largestTd: JQuery = $table.find('tbody tr:first td:eq(' + colNum + ')');
        let longestText: number = 0;
        $table.find('tbody tr').each(function() {
            const $td: JQuery = $(this).children(':eq(' + colNum + ')');
            let textLength: number;
            if (options.datastore) {
                textLength = $.trim($td.text()).length;
            } else {
                textLength = $.trim($td.find('.displayedData').text()).length;
            }
            if (textLength > longestText) {
                longestText = textLength;
                $largestTd = $td;
            }
        });

        const padding: number = 10;
        let largestWidth: number = xcHelper.getTextWidth($largestTd) + padding;
        if (fitAll) {
            largestWidth = Math.max(headerWidth, largestWidth);
        }

        return largestWidth;
    }

    /**
     * TblFunc.matchHeaderSizes
     * @param $table table element
     */
    public static matchHeaderSizes($table: JQuery): void {
        // concurrent build table may make some $table be []
        if ($table.length === 0) {
            return;
        }
        TblFunc.alignScrollBar($table);
    }

    public static repositionOnWinResize() {
        const table: TableMeta = gTables[gActiveTableId];
        if (table && table["resultSetCount"] !== 0) {
            TableComponent.update();
        }
        // XXX TODO remove this hack
        // for Dag Table
        TblFunc.alignLockIcon();

        // for tableScrollBar
        TblFunc.moveFirstColumn(null);
        TblManager.adjustRowFetchQuantity();
    }

    /**
     * TblFunc.alignLockIcon
     */
    public static alignLockIcon(): void {
        if (isBrowserMicrosoft || isBrowserSafari) {
            return;
        }
        const $container: JQuery = DagTable.Instance.getView();
        if ($container == null) {
            return;
        }
        const $tableWrap: JQuery = $container.find(".xcTableWrap");
        if ($tableWrap.hasClass('tableDragging')) {
            return null;
        }
        const $lockTableIcon: JQuery = $tableWrap.find('.lockedTableIcon');
        if ($lockTableIcon.length === 0) {
            return;
        }
        const containerRect: ClientRect = $container[0].getBoundingClientRect();
        const rect: ClientRect = $tableWrap[0].getBoundingClientRect();
        const center: number = containerRect.left - rect.left + containerRect.width / 2;
        $lockTableIcon.css('left', center);
    }
    
    /**
     * TblFunc.focusTable
     * @param tableId
     * @param focusDag
     */
    public static focusTable(tableId: TableId): void {
        const table: TableMeta = gTables[tableId];
        if (table && table.modelingMode) {
            return;
        }
        if ($("#xcTableWrap-" + tableId).hasClass("tableLocked")) {
            return;
        }

        const alreadyFocused: boolean = (gActiveTableId === tableId);
        if (!alreadyFocused && gActiveTableId) {
            TblManager.unHighlightCells(gActiveTableId);
        }
        const $xcTheadWrap: JQuery = $('#xcTheadWrap-' + tableId);
        $xcTheadWrap.find('.tableTitle').addClass('tblTitleSelected');
        // unhighlight any selected columns from all other tables
        $('.xcTable:not(#xcTable-' + tableId + ')').find('.selectedCell')
                                                   .removeClass('selectedCell');
        gActiveTableId = tableId;
        TableComponent.update();
        $('.dagWrap').addClass('notSelected').removeClass('selected');
        $('#dagWrap-' + tableId).addClass('selected').removeClass('notSelected');
    }

    /**
     * TblFunc.isTableScrollable
     * @param tableId
     */
    public static isTableScrollable(tableId: TableId): boolean {
        const $firstRow: JQuery = $('#xcTable-' + tableId).find('tbody tr:first');
        const topRowNum: number = xcHelper.parseRowNum($firstRow);
        const tHeadHeight: number = $('#xcTheadWrap-' + tableId).height();
        const tBodyHeight: number = $('#xcTable-' + tableId).height();
        const tableWrapHeight: number = $('#xcTableWrap-' + tableId).height();
        if ((tHeadHeight + tBodyHeight) >= (tableWrapHeight)) {
            return true;
        }
        const table: TableMeta = gTables[tableId];
        if (topRowNum === 0 &&
            table != null &&
            table.currentRowNumber === table.resultSetMax) {
            return false;
        } else {
            return true;
        }
    }

    /**
     * TblFunc.moveFirstColumn
     * @param $targetTable
     * @param noScrollBar
     */
    public static moveFirstColumn(
        $targetTable: JQuery,
        noScrollBar: boolean = false
    ): void {
        const moveScrollBar: boolean = !noScrollBar;
        let $allTables: JQuery;
        const $dagViewTableArea: JQuery = $("#dagViewTableArea");
        let dagView = false;
        if ($dagViewTableArea.is(":visible")) {
            dagView = true;
            $allTables = $dagViewTableArea.find(".xcTableWrap:visible");
        } else {
            $allTables = $('.xcTableWrap:not(".inActive")');
        }
        if ((isBrowserMicrosoft || isBrowserSafari) && !moveScrollBar) {
            return;
        }

        let rightOffset: number;
        let datasetPreview: boolean;
        let mainMenuOffset: number;
        let windowWidth: number;
        let $rightTable: JQuery;

        if ($targetTable == null) {
            datasetPreview = false;
            mainMenuOffset = MainMenu.getOffset();
            windowWidth = $(window).width() - 5;
            var tableFound = false;

            $allTables.each(function() {
                rightOffset = this.getBoundingClientRect().right;
                if (!tableFound && rightOffset > mainMenuOffset) {
                    $targetTable = $(this);
                    tableFound = true;
                    if (!moveScrollBar) {
                        return false;
                    }
                }
                if (moveScrollBar && (rightOffset > windowWidth)) {
                    $rightTable = $(this);
                    return false; // stop loop
                }
            });

        } else {
            datasetPreview = true;
            mainMenuOffset = 0;
        }

        if (dagView) {
            mainMenuOffset = 0;
        }

        if (!(isBrowserMicrosoft || isBrowserSafari) &&
            $targetTable && $targetTable.length > 0
        ) {
            const $idCol: JQuery = $targetTable.find('.idSpan');
            const cellWidth: number = $idCol.outerWidth();
            let scrollLeft: number;

            if (datasetPreview) {
                const $container: JQuery = $targetTable.closest("#dsTableContainer").length
                                ? $('#dsTableContainer') : $targetTable.closest(".datasetTableWrap");
                scrollLeft = -($targetTable.offset().left -
                                $container.offset().left);
            } else if (dagView) {
                scrollLeft = $dagViewTableArea.offset().left -
                $targetTable.offset().left;
            } else {
                scrollLeft = mainMenuOffset - $targetTable.offset().left;
            }

            const rightDiff: number = rightOffset - (cellWidth + 5);
            if (rightDiff < mainMenuOffset) {
                scrollLeft += rightDiff - mainMenuOffset;
            }
            scrollLeft = Math.min($targetTable.width() - (cellWidth + 15), scrollLeft);

            scrollLeft = Math.max(0, scrollLeft);
            $idCol.css('left', scrollLeft);
            $targetTable.find('th.rowNumHead > div').css('left', scrollLeft);
            if (!datasetPreview) {
                let adjustNext: boolean = true;
                while (adjustNext) {
                    $targetTable = $targetTable.next();
                    if ($targetTable.length === 0) {
                        adjustNext = false;
                    } else {
                        rightOffset = $targetTable[0].getBoundingClientRect()
                                                     .right;
                        if (rightOffset > $(window).width()) {
                            adjustNext = false;
                        }
                        $targetTable.find('.idSpan').css('left', 0);
                        $targetTable.find('th.rowNumHead > div').css('left', 0);
                    }
                }
            }
        }

        if (moveScrollBar && !datasetPreview) {
            if (!$rightTable || !$rightTable.length) {
                $rightTable = $allTables.last();
                if (!$rightTable.length) {
                    return;
                }
            }

            rightOffset = $rightTable[0].getBoundingClientRect().right;
            var right = Math.max(5, rightOffset - windowWidth);
            $rightTable.find(".tableScrollBar").css("right", right);

            let adjustNext: boolean = true;
            while (adjustNext) {
                $rightTable = $rightTable.prev();
                if ($rightTable.length === 0) {
                    return;
                }
                rightOffset = $rightTable[0].getBoundingClientRect().right;
                if (rightOffset < mainMenuOffset) {
                    return;
                }

                $rightTable.find(".tableScrollBar").css("right", 5);
            }
        }
    }

    /**
     * TblFunc.scrollTable
     * @param tableId
     * @param scrollType
     * @param isUp
     */
    public static scrollTable(
        tableId: TableId,
        scrollType: string,
        isUp: boolean
    ): boolean {
        if (!$("#modelingDataflowTab").hasClass("active") ||
            tableId == null)
        {
            return false;
        }

        const $visibleMenu: JQuery = $('.menu:visible');
        if ($visibleMenu.length !== 0) {
            // if the menu is only .tdMenu, allow scroll
            if ($visibleMenu.length > 1 || !$visibleMenu.hasClass("tdMenu")) {
                return false;
            }
        }

        if ($("#functionArea .CodeMirror").hasClass("CodeMirror-focused") ||
            $(document.activeElement).is("input")) {
            return false;
        }

        // XXX TODO: fix it with rowInput
        const $rowInput: JQuery = $("#rowInputArea input");
        const $lastTarget: JQuery = gMouseEvents.getLastMouseDownTarget();
        const isInFrame: boolean = !$lastTarget.context ||
                            ($lastTarget.closest("#dagViewTableArea").length > 0 &&
                            !$lastTarget.is("input"));

        if (isInFrame && xcHelper.isTableInScreen(tableId)) {
            if (gIsTableScrolling ||
                $("#modalBackground").is(":visible") ||
                !TblFunc.isTableScrollable(tableId)) {
                // not trigger table scroll, but should return true
                // to prevent table's natural scroll
                return true;
            }

            const table: TableMeta = gTables[tableId];
            const maxRow: number = table.resultSetCount;
            const curRow: number = $rowInput.data("val");
            const rowManager: RowManager = new RowManager(table, $("#xcTableWrap-" + tableId));
            const lastRowNum: number = rowManager.getLastVisibleRowNum();
            let rowToGo: number;

            // validation check
            xcAssert((lastRowNum != null), "Error Case!");

            if (scrollType === "homeEnd") {
                // isUp === true for home button, false for end button
                rowToGo = isUp ? 1 : maxRow;
            } else {
                let rowToSkip: number;
                if (scrollType === "updown") {
                    const $xcTbodyWrap: JQuery = $("#xcTbodyWrap-" + tableId);
                    const scrollTop: number = $xcTbodyWrap.scrollTop();
                    const $trs: JQuery = $("#xcTable-" + tableId + " tbody tr");
                    const trHeight: number = $trs.height();
                    let rowNum: number;

                    if (!isUp) {
                        rowNum = xcHelper.parseRowNum($trs.eq($trs.length - 1)) + 1;
                        if (rowNum - lastRowNum > 5) {
                            // when have more then 5 buffer on bottom
                            $xcTbodyWrap.scrollTop(scrollTop + trHeight);
                            return true;
                        }
                    } else {
                        rowNum = xcHelper.parseRowNum($trs.eq(0)) + 1;
                        if (curRow - rowNum > 5) {
                            // when have more then 5 buffer on top
                            $xcTbodyWrap.scrollTop(scrollTop - trHeight);
                            return true;
                        }
                    }

                    rowToSkip = 1;
                } else if (scrollType === "pageUpdown") {
                    // this is one page's row
                    rowToSkip = lastRowNum - curRow;
                } else {
                    // error case
                    console.error("Invalid case!");
                    return false;
                }

                rowToGo = isUp ? Math.max(1, curRow - rowToSkip) :
                                Math.min(maxRow, curRow + rowToSkip);
            }

            if (isUp && curRow === 1 || !isUp && lastRowNum === maxRow) {
                // no need for backend call
                return true;
            }

            xcMenu.close();
            gMouseEvents.setMouseDownTarget(null);
            $rowInput.val(rowToGo).trigger(fakeEvent.enter);

            return true;
        }
        return false;
    }

    /**
     * TblFunc.keyEvent
     * @param event
     */
    public static keyEvent(event: JQueryEventObject): void {
        // only being used for ctrl+o to open column dropdown
        if (!(isSystemMac && event.metaKey) &&
            !(!isSystemMac && event.ctrlKey))
        {
            return;
        }
        if (letterCode[event.which] !== "o") {
            return;
        }

        if (DagTable.Instance.getTable() != null &&
            !$('#modalBackground').is(":visible") &&
            !$('textarea:focus').length &&
            !$('input:focus').length) {

            const $th: JQuery = $(".xcTable th.selectedCell");
            if ($th.length > 0) {
                event.preventDefault();
            }
            if ($th.length !== 1) {
                return;
            }

            $th.find(".dropdownBox").trigger(fakeEvent.click);
        }
    }

    public static alignScrollBar($table: JQuery): void {
        const witdh: number = $table.width();
        TblFunc.moveFirstColumn(null);
        $table.find('.rowGrab').width(witdh);
        $table.siblings('.rowGrab').width(witdh);
    }
}
