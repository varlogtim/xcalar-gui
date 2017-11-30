window.TblMenu = (function(TblMenu, $) {
    var colMenuMap;
    var tableMenuMap;
    var cellMenuMap;

    TblMenu.setup = function() {
        try {
            xcMenu.add($('#tableMenu'), {hotkeys: hotKeyTrigger});
            xcMenu.add($('#colMenu'), {hotkeys: hotKeyTrigger});
            xcMenu.add($('#cellMenu'), {hotkeys: hotKeyTrigger});
            addTableMenuActions();
            addColMenuActions();
            addPrefixColumnMenuActions();
            setupHotKeys();
        } catch (error) {
            console.error(error);
        }
    };

    // show/hides menu items common to both table and dag menus
    // must provide either tableId if it's a worksheet table or $dagTable
    // if it's a dagTable
    TblMenu.showDagAndTableOptions = function($menu, tableId, $dagTable) {
        var $genIcvLi = $menu.find('.generateIcv');
        var tableInfo = Dag.getTableInfo(tableId, $dagTable);
        if (tableInfo.isIcv) {
            xcHelper.disableMenuItem($genIcvLi, {
                "title": TooltipTStr.AlreadyIcv
            });
        } else {
            if (tableInfo.generatingIcv) {
                xcHelper.disableMenuItem($genIcvLi, {
                    "title": TooltipTStr.IcvGenerating
                });
            } else if (tableInfo.canBeIcv) {
                if (tableInfo.hasDroppedParent) {
                    xcHelper.disableMenuItem($genIcvLi, {
                        "title": TooltipTStr.IcvSourceDropped
                    });
                } else {
                    xcHelper.enableMenuItem($genIcvLi);
                }
            } else {
                xcHelper.disableMenuItem($genIcvLi, {
                    "title": TooltipTStr.IcvRestriction
                });
            }
        }

        var $complimentLi = $menu.find('.complementTable');
        if (tableInfo.type === "filter") {
            if (tableInfo.generatingComplement) {
                xcHelper.disableMenuItem($complimentLi, {
                    "title": TooltipTStr.generatingComplement
                });
            } else if (tableInfo.hasDroppedParent) {
                xcHelper.disableMenuItem($complimentLi, {
                    "title": TooltipTStr.ComplementSourceDropped
                });
            } else {
                xcHelper.enableMenuItem($complimentLi);
            }
        } else {
            xcHelper.disableMenuItem($complimentLi, {
                "title": TooltipTStr.ComplementRestriction
            });
        }
    };

    function addTableMenuActions() {
        var $tableMenu = $('#tableMenu');
        var $subMenu = $('#tableSubMenu');
        var $allMenus = $tableMenu.add($subMenu);

        $tableMenu.on('mouseup', '.hideTable', function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }

            var tableId = $tableMenu.data('tableId');
            TblManager.hideTable(tableId);
        });

        $tableMenu.on('mouseup', '.unhideTable', function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            TblManager.unHideTable(tableId);
        });

        $tableMenu.on('mouseup', '.makeTempTable', function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }

            var tableId = $tableMenu.data('tableId');
            TblManager.sendTableToTempList(tableId);
        });

        $tableMenu.on('mouseup', '.deleteTable', function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            var tableName = gTables[tableId].tableName;
            // TblManager.sendTablesToTrash(tableId, TableType.Active);

            var msg = xcHelper.replaceMsg(TblTStr.DelMsg, {"table": tableName});
            Alert.show({
                "title": TblTStr.Del,
                "msg": msg,
                "onConfirm": function() {
                    TblManager.deleteTables(tableId, TableType.Active)
                    .then(function() {
                        XcSupport.memoryCheck(true);
                    });
                }
            });
        });

        $tableMenu.on('mouseup', '.exportTable', function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            ExportView.show(tableId);
        });

        $subMenu.on('mouseup', '.jupyterFullTable', function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            var tableName = gTables[tableId].tableName;
            JupyterPanel.publishTable(tableName);
        });

        $subMenu.on('keypress', '.jupyterSampleTable input', function(event) {
            if (event.which !== keyCode.Enter) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            var tableName = gTables[tableId].tableName;
            var $input = $(this);
            var numRows = $input.val().trim();
            var max = Math.min(10000, gTables[tableId].resultSetCount);

            var isValid = xcHelper.validate([
                {
                    "$ele": $input,
                    "side": "left"
                },
                {
                    "$ele": $input,
                    "error": xcHelper.replaceMsg(JupyterTStr.SampleNumError,
                                                {number: max}),
                    "side": "left",
                    "check": function () {
                        return (numRows < 1 || numRows > max);
                    }
                }
            ]);

            if (!isValid) {
                return false;
            }

            JupyterPanel.publishTable(tableName, numRows);
            $input.val("");
            $input.blur();
            xcMenu.close($allMenus);
        });

        $tableMenu.on('mouseup', '.exitOp', function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }
            var exitType = $(this).data('exittype');
            switch (exitType) {
                case ('aggregate'):
                case ('filter'):
                case ('groupby'):
                case ('map'):
                    OperationsView.close();
                    break;
                case ('export'):
                    ExportView.close();
                    break;
                case ('smartCast'):
                    SmartCastView.close();
                    break;
                case ('join'):
                    JoinView.close();
                    break;
                case ('ext'):
                    BottomMenu.close();
                    break;
                case ("dataflow"):
                    DFCreateView.close();
                    break;
                case ("sort"):
                    SortView.close();
                    break;
                case ("project"):
                    ProjectView.close();
                    break;
                default:
                    break;
            }
        });

        $tableMenu.on('mouseup', '.copyTableName', function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }
            var valArray = [];
            var tblName = $(".tblTitleSelected .tableName").val();
            var tblId = $(".tblTitleSelected .hashName").text();
            valArray.push(tblName + tblId);
            copyToClipboard(valArray);
        });

        // xx currently not visible
        $tableMenu.on('mouseup', '.copyColNames', function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }

            function getAllColNames(tableId) {
                var colNames = [];
                $.each(gTables[tableId].tableCols, function() {
                    if (this.name !== "DATA") {
                        colNames.push(this.name);
                    }
                });
                return colNames;
            }

            var wsId = WSManager.getActiveWS();
            var allColNames = [];
            $.each(WSManager.getWorksheets()[wsId].tables, function() {
                var tableColNames = getAllColNames(this);
                for (var i = 0; i < tableColNames.length; i++) {
                    var value = tableColNames[i];
                    if (allColNames.indexOf(value) === -1) {
                        allColNames.push(value);
                    }
                }
            });
            copyToClipboard(allColNames, true);
        });

        $tableMenu.on('mouseup', '.multiCast', function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            SmartCastView.show(tableId);
        });

        $tableMenu.on('mouseup', '.corrAgg', function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            AggModal.corrAgg(tableId);
        });

        // operation for move to worksheet and copy to worksheet
        $tableMenu.on('mouseenter', '.moveTable', function() {
            var $list = $subMenu.find(".list");
            $list.empty().append(WSManager.getWSLists(false));
        });

        $tableMenu.on('mouseup', '.createDf', function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            var $dagWrap = $('#dagWrap-' + tableId);
            DFCreateView.show($dagWrap);
        });

        // SUBMENU CODE

        var subMenuList = new MenuHelper($subMenu.find(".dropDownList"), {
            "onSelect": function($li) {
                var $input = $li.closest(".dropDownList").find(".wsName");
                $input.val($li.text()).focus();
            }
        });
        subMenuList.setupListeners();

        $subMenu.on('keypress', '.moveTable input', function(event) {
            if (event.which === keyCode.Enter) {
                var tableId = $tableMenu.data('tableId');
                var $input = $(this);
                var wsName = $input.val().trim();
                var $option = $input.siblings(".list").find("li").filter(function() {
                    return ($(this).text() === wsName);
                });

                var isValid = xcHelper.validate([
                    {
                        "$ele": $input,
                        "side": "left"
                    },
                    {
                        "$ele": $input,
                        "error": ErrTStr.InvalidWSInList,
                        "side": "left",
                        "check": function () {
                            return ($option.length === 0);
                        }
                    }
                ]);

                if (!isValid) {
                    return false;
                }

                var wsId = $option.data("ws");

                WSManager.moveTable(tableId, wsId);
                $input.val("");
                $input.blur();
                xcMenu.close($allMenus);
            }
        });

        $subMenu.on('mouseup', '.moveLeft', function(event) {
            if (event.which !== 1 || $(this).hasClass('unavailable')) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            var curIndex = WSManager.getTableRelativePosition(tableId);
            TblFunc.reorderAfterTableDrop(tableId, curIndex, curIndex - 1, {
                moveHtml: true
            });
        });

        $subMenu.on('mouseup', '.moveRight', function(event) {
            if (event.which !== 1 || $(this).hasClass('unavailable')) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            var curIndex = WSManager.getTableRelativePosition(tableId);
            TblFunc.reorderAfterTableDrop(tableId, curIndex, curIndex + 1, {
                moveHtml: true
            });
        });

        $subMenu.on("mouseup", ".sortByName li", function(event) {
            if (event.which !== 1) {
                return;
            }

            sortHelper(ColumnSortType.name, $(this));
        });

        $subMenu.on("mouseup", ".sortByType li", function(event) {
            if (event.which !== 1) {
                return;
            }

            sortHelper(ColumnSortType.type, $(this));
        });

        $subMenu.on("mouseup", ".sortByPrefix li", function(event) {
            if (event.which !== 1) {
                return;
            }

            sortHelper(ColumnSortType.prefix, $(this));
        });

        function sortHelper(sortKey, $li) {
            var direction;
            if ($li.hasClass("sortForward")) {
                direction = "forward";
            } else {
                direction = "reverse";
            }
            var tableId = $tableMenu.data("tableId");
            // could be long process so we allow the menu to close first
            setTimeout(function() {
                TblManager.sortColumns(tableId, sortKey, direction);
            }, 0);
        }

        $subMenu.on('mouseup', '.resizeCols li', function(event) {
            if (event.which !== 1) {
                return;
            }

            var $li = $(this);
            var tableId = $tableMenu.data('tableId');
            var resizeTo;

            if ($li.hasClass('sizeToHeader')) {
                resizeTo = 'header';
            } else if ($li.hasClass('sizeToFitAll')) {
                resizeTo = 'all';
            } else {
                resizeTo = 'contents';
            }

            // could be long process so we allow the menu to close first
            setTimeout(function() {
                TblManager.resizeColumns(tableId, resizeTo);
            }, 0);
        });

        $subMenu.find(".addNoDelete").mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $tableMenu.data("tableId");
            var tableName = gTables[tableId].getName();
            Dag.makeTableNoDelete(tableName);
            TblManager.makeTableNoDelete(tableName);
        });

        $subMenu.find(".removeNoDelete").mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }

            var tableId = $tableMenu.data("tableId");
            Dag.removeNoDelete(tableId);
            TblManager.removeTableNoDelete(tableId);
        });

        $subMenu.find(".generateIcv").mouseup(function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            var tableName = gTables[tableId].getName();
            Dag.generateIcvTable(tableId, tableName);
        });

        $subMenu.find(".complementTable").mouseup(function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }

            var tableId = $tableMenu.data('tableId');
            var tableName = gTables[tableId].getName();
            Dag.generateComplementTable(tableName);
        });

        $subMenu.find(".skewDetails").mouseup(function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }

            var tableId = $tableMenu.data('tableId');
            SkewInfoModal.show(tableId);
        });
    }

    function addColMenuActions() {
        var $colMenu = $('#colMenu');
        var $subMenu = $('#colSubMenu');
        var $cellMenu = $('#cellMenu');

        var $colMenus = $colMenu.add($subMenu);
        var $allMenus = $colMenus.add($cellMenu);

        // add new column
        $colMenu.on('mouseup', '.addColumn', function(event) {
            if (event.which !== 1) {
                return;
            }
            var colNum = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');
            var direction = ColDir.Right;

            ColManager.addNewCol(colNum, tableId, direction);
        });

        $colMenu.on('mouseup', '.hideColumn', function(event) {
            if (event.which !== 1) {
                return;
            }

            var colNums = $colMenu.data('colNums');
            var tableId = $colMenu.data('tableId');
            ColManager.delCol(colNums, tableId);
        });

        $subMenu.on('click', '.inputAction', function() {
            $(this).siblings('input').trigger(fakeEvent.enter);
        });

        $subMenu.on('keypress', 'input', function(event) {
            if (event.which === keyCode.Enter) {
                var $input = $(this);
                if ($input.closest('.extensions').length) {
                    $input.siblings('.inputAction').find('.extensions')
                                                   .trigger(fakeEvent.mouseup);
                }
            }
        });

        $subMenu.on('keypress', '.rename input', function(event) {
            if (event.which === keyCode.Enter) {
                var $input = $(this);
                var tableId = $colMenu.data('tableId');
                var colName = $input.val().trim();
                var colNum = $colMenu.data('colNum');

                if (colName === "") {
                    StatusBox.show(ErrTStr.NoEmpty, $input, null);
                    return false;
                }

                if (ColManager.checkColName($input, tableId, colNum)) {
                    return false;
                }

                ColManager.renameCol(colNum, tableId, colName);
                $input.val("").blur();
                xcMenu.close($allMenus);
            }
        });

        $subMenu.on('mouseup', '.changeFormat', function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $colMenu.data('tableId');
            var format = $(this).data("format");
            var formats = [];
            var colNums = [];
            var allColNums = $colMenu.data('colNums');
            var table = gTables[tableId];

            allColNums.forEach(function(colNum) {
                var progCol = table.getCol(colNum);
                if (progCol.isNumberCol()) {
                    formats.push(format);
                    colNums.push(colNum);
                }
            });

            ColManager.format(colNums, tableId, formats);
        });

        $subMenu.on('keypress', '.digitsToRound', function(event) {
            if (event.which !== keyCode.Enter) {
                return;
            }

            var $input = $(this);
            var decimal = parseInt($input.val().trim());
            if (isNaN(decimal) || decimal < 0 || decimal > 14) {
                // when this field is empty
                var error = xcHelper.replaceMsg(ErrWRepTStr.InvalidRange, {
                    "num1": 0,
                    "num2": 14
                });
                StatusBox.show(error, $input, null, {
                    "side": "left",
                    "closeable": true
                });
                return;
            }

            var tableId = $colMenu.data('tableId');
            var colNums = $colMenu.data('colNums');
            var decimals = getDecimals(tableId, decimal, colNums);

            ColManager.roundToFixed(colNums, tableId, decimals);
            xcMenu.close($allMenus);
        });

        $subMenu.on('mouseup', '.changeRound.default', function(event) {
            if (event.which !== 1) {
                return;
            }
            // chagne round to default value
            var tableId = $colMenu.data('tableId');
            var colNums = $colMenu.data('colNums');
            var decimals = getDecimals(tableId, -1, colNums);

            ColManager.roundToFixed(colNums, tableId, decimals);
        });

        function getDecimals(tableId, decimal, colNums) {
            var decimals = [];
            var table = gTables[tableId];

            for (var i = 0; i < colNums.length; i++) {
                var colNum = colNums[i];
                var progCol = table.getCol(colNum);
                if (progCol.getType() === ColumnType.float) {
                    decimals.push(decimal);
                } else {
                    // remove columns that are not floats
                    colNums.splice(i, 1);
                    i--;
                }
            }

            return decimals;
        }

        $subMenu.on('keypress', '.splitCol input', function(event) {
            if (event.which === keyCode.Enter) {
                var colNum = $colMenu.data("colNum");
                var tableId = $colMenu.data('tableId');
                var $li = $(this).closest("li");
                var $delimInput = $li.find(".delimiter");
                var delim = $delimInput.val();

                if (delim === "") {
                    StatusBox.show(ErrTStr.NoEmpty, $delimInput, null, {
                        "closeable": true,
                        "side": "left",
                    });
                    return;
                }

                var $numInput = $li.find(".num");
                var num = $numInput.val().trim();
                var numColToGet;

                if (num === "") {
                    numColToGet = null;
                } else {
                    numColToGet = Number(num);
                    var isValid = xcHelper.validate([
                        {
                            "$ele": $numInput,
                            "error": ErrTStr.OnlyNumber,
                            "check": function() {
                                return (isNaN(numColToGet) ||
                                        !Number.isInteger(numColToGet));
                            }
                        },
                        {
                            "$ele": $numInput,
                            "error": ErrTStr.OnlyPositiveNumber,
                            "check": function() {
                                return (numColToGet < 1);
                            }
                        }
                    ]);

                    if (!isValid) {
                        return;
                    }
                }

                ColManager.splitCol(colNum, tableId, delim, numColToGet, true);
                $delimInput.val("").blur();
                $numInput.val("").blur();
                xcMenu.close($allMenus);
            }
        });

        $colMenu.on('mouseup', '.minimize', function(event) {
            if (event.which !== 1) {
                return;
            }
            var colNums = $colMenu.data('colNums');
            var tableId = $colMenu.data('tableId');
            ColManager.minimizeCols(colNums, tableId);
        });

        $colMenu.on('mouseup', '.maximize', function(event) {
            if (event.which !== 1) {
                return;
            }
            var colNums = $colMenu.data('colNums');
            var tableId = $colMenu.data('tableId');
            ColManager.maximizeCols(colNums, tableId);
        });

        $colMenu.on('mouseup', '.corrAgg', function(event) {
            if (event.which !== 1 || $(this).hasClass('unavailable')) {
                return;
            }
            var colNums = $colMenu.data('colNums');
            var tableId = $colMenu.data('tableId');
            AggModal.corrAgg(tableId, colNums, colNums);
        });

        $subMenu.on('mouseup', 'li.textAlign', function(event) {
            if (event.which !== 1) {
                return;
            }
            var $li = $(this);
            var colNums = $colMenu.data('colNums');
            var tableId = $colMenu.data('tableId');
            ColManager.textAlign(colNums, tableId, $li.attr("class"));
        });

        $subMenu.on('mouseup', '.resize', function(event) {
            if (event.which !== 1) {
                return;
            }
            var $li = $(this);
            var colNums = $colMenu.data('colNums');
            var tableId = $colMenu.data('tableId');
            var resizeTo;

            if ($li.hasClass('sizeToHeader')) {
                resizeTo = 'header';
            } else if ($li.hasClass('sizeToFitAll')) {
                resizeTo = 'all';
            } else {
                resizeTo = 'contents';
            }

            // could be long process so we allow the menu to close first
            setTimeout(function() {
                TblManager.resizeColumns(tableId, resizeTo, colNums);
            }, 0);
        });

        $subMenu.on('mouseup', '.typeList', function(event) {
            if (event.which !== 1 || $(this).hasClass('unavailable')) {
                return;
            }

            var $li = $(this);
            var colTypeInfos = [];
            var colNum;
            // xx need to use data or class instead of text in case of language
            var newType = $li.find(".label").text().toLowerCase();
            var colNums = $colMenu.data("colNums");
            for (var i = 0, len = colNums.length; i < len; i++) {
                colNum = colNums[i];
                colTypeInfos.push({
                    "colNum": colNum,
                    "type": newType
                });
            }

            var tableId = $colMenu.data('tableId');
            ColManager.changeType(colTypeInfos, tableId);
        });

        $subMenu.on('mouseup', 'li.sort', function(event) {
            if (event.which !== 1) {
                return;
            }
            var colNums = $colMenu.data("colNums");
            var tableId = $colMenu.data('tableId');
            sortColumn(colNums, tableId, XcalarOrderingT.XcalarOrderingAscending);
        });

        $subMenu.on('mouseup', 'li.revSort', function(event) {
            if (event.which !== 1) {
                return;
            }
            var colNums = $colMenu.data("colNums");
            var tableId = $colMenu.data('tableId');

            sortColumn(colNums, tableId, XcalarOrderingT.XcalarOrderingDescending);
        });

        $subMenu.on('mouseup', '.sortView', function(event) {
            if (event.which !== 1) {
                return;
            }
            var colNums = $colMenu.data("colNums");
            var tableId = $colMenu.data('tableId');

            SortView.show(colNums, tableId);
        });

        $colMenu.on('mouseup', '.join', function(event) {
            if (event.which !== 1 || $(this).hasClass('unavailable')) {
                return;
            }
            var colNums = $colMenu.data("colNums");
            var tableId = $colMenu.data('tableId');
            JoinView.show(tableId, colNums);
        });

        $colMenu.on('mouseup', '.functions', function(event) {
            if (event.which !== 1 || $(this).hasClass('unavailable')) {
                return;
            }
            var $li = $(this);
            var tableId = $colMenu.data('tableId');
            var func = $li.data('func');
            var colNums = $colMenu.data("colNums");
            var triggerColNum = $colMenu.data("colNum");

            OperationsView.show(tableId, colNums, func, {triggerColNum:
                                                         triggerColNum});
        });

        $colMenu.on('mouseup', '.profile', function(event) {
            if (event.which !== 1 || $(this).hasClass('unavailable')) {
                return;
            }
            var colNum = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');
            Profile.show(tableId, colNum);
        });


        $colMenu.on('mouseup', '.project', function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $colMenu.data('tableId');
            var colNums = $colMenu.data("colNums");
            ProjectView.show(tableId, colNums);
        });

        $colMenu.on('mouseup', '.extensions', function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }
            var colNum = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');

            ExtensionManager.openView(colNum, tableId);
        });

        $cellMenu.on('mouseup', '.tdFilter, .tdExclude', function(event) {
            var $li =  $(this);

            if (event.which !== 1 || $li.hasClass('unavailable')) {
                return;
            }

            var colNum  = $cellMenu.data('colNum');
            var tableId = $cellMenu.data('tableId');

            var $table  = $("#xcTable-" + tableId);
            var $header = $table.find("th.col" + colNum + " .header");

            var colName = gTables[tableId].tableCols[colNum - 1].getBackColName();

            var notValid = false;
            var uniqueVals = {};
            var isExist = false;
            var colVal;

            var cells = gTables[tableId].highlightedCells;
            for (var row in cells) {
                var cellInfo = cells[row][colNum];
                if (cellInfo.isUndefined) {
                    isExist = true;
                    continue;
                }
                colVal = cellInfo.val;

                if ($header.hasClass("type-integer")) {
                    if (colVal == null || colVal === "") {
                        isExist = true;
                        continue; // continue to next iteration
                    }
                    colVal = parseInt(colVal);
                } else if ($header.hasClass("type-float")) {
                    if (colVal == null || colVal === "") {
                        isExist = true;
                        continue; // continue to next iteration
                    }
                    colVal = parseFloat(colVal);
                } else if ($header.hasClass("type-string")) {
                    // colVal = colVal + ""; // if it's number, change to string
                    // XXX for string, text is more reliable
                    // since data-val might be messed up
                    colVal = JSON.stringify(colVal);
                } else if ($header.hasClass("type-boolean")) {
                    if (colVal === "true") {
                        colVal = true;
                    } else {
                        colVal = false;
                    }
                } else if ($header.hasClass("type-mixed")) {
                    var type = cellInfo.type;
                    if (type === ColumnType.string) {
                        colVal = JSON.stringify(colVal);
                    } else if (type === ColumnType.integer ||
                        type === ColumnType.float) {
                        colVal = parseFloat(colVal);
                    } else if (type === ColumnType.boolean) {
                        if (colVal === "true") {
                            colVal = true;
                        } else {
                            colVal = false;
                        }
                    } else {
                        // should not be filtering anything else in mixed col
                        notValid = true;
                        break;
                    }
                } else {
                    notValid = true;
                    break;
                }

                uniqueVals[colVal] = true;
            }

            if (!notValid) {
                var operator = $li.hasClass("tdFilter") ? FltOp.Filter :
                                                          FltOp.Exclude;
                var options = xcHelper.getFilterOptions(operator, colName,
                                        uniqueVals, isExist);

                if (options != null) {
                    xcFunction.filter(colNum, tableId, options);
                }
            }

            TblManager.unHighlightCells();
        });

        $cellMenu.on('mouseup', '.tdJsonModal', function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $cellMenu.data('tableId');
            var rowNum  = $cellMenu.data('rowNum');
            var colNum  = $cellMenu.data('colNum');
            var $table  = $("#xcTable-" + tableId);
            var $td     = $table.find(".row" + rowNum + " .col" + colNum);
            var colType = gTables[tableId].tableCols[colNum - 1].getType();
            var isTruncated = $cellMenu.data('istruncatedtext');
            if (isTruncated) {
                // if showing modal due to truncated text, treat it as a string
                colType = ColumnType.string;
            }
            TblManager.unHighlightCells();
            JSONModal.show($td, {type: colType});
        });

        $cellMenu.on('mouseup', '.tdUnnest', function(event) {
            var $li = $(this);
            if (event.which !== 1 || $li.hasClass("unavailable")) {
                return;
            }

            var tableId = $cellMenu.data('tableId');
            var rowNum = $cellMenu.data('rowNum');
            var colNum = $cellMenu.data('colNum');

            TblManager.unHighlightCells();
            setTimeout(function() {
                ColManager.unnest(tableId, colNum, rowNum);
            }, 0);
        });

        $cellMenu.on('mouseup', '.tdCopy', function(event) {
            var $li = $(this);
            if (event.which !== 1 || $li.hasClass('unavailable')) {
                return;
            }
            var tableId = $cellMenu.data('tableId');
            var cells = [];
            for (var row in gTables[tableId].highlightedCells) {
                for (var col in gTables[tableId].highlightedCells[row]) {
                    var cellInfo = gTables[tableId].highlightedCells[row][col];
                    cells.push(cellInfo);
                }
            }

            var valArray = [];
            sortHighlightCells(cells);
            for (var i = 0, len = cells.length; i < len; i++) {
                valArray.push(cells[i].val);
            }

            copyToClipboard(valArray);
            TblManager.unHighlightCells();
        });

        $colMenu.on('mouseup', '.exitOp', function(event) {
            if (event.which !== 1) {
                return;
            }
            var exitType = $(this).data('exittype');
            switch (exitType) {
                case ('export'):
                    ExportView.close();
                    break;
                case ('aggregate'):
                case ('filter'):
                case ('groupby'):
                case ('map'):
                    OperationsView.close();
                    break;
                case ('smartCast'):
                    SmartCastView.close();
                    break;
                case ('join'):
                    JoinView.close();
                    break;
                case ('ext'):
                    BottomMenu.close();
                    break;
                case ("dataflow"):
                    DFCreateView.close();
                    break;
                case ("sort"):
                    SortView.close();
                    break;
                case ("project"):
                    ProjectView.close();
                    break;
                default:
                    break;
            }
        });
    }

    function addPrefixColumnMenuActions() {
        var $prefixColorMenu = $("#prefixColorMenu");
        $prefixColorMenu.on("mouseup", ".wrap", function(event) {
            if (event.which !== 1) {
                return;
            }

            var $wrap = $(this);
            var prefix = $prefixColorMenu.data("prefix");
            var color = $(this).data("color");

            $wrap.addClass("selected").siblings().removeClass("selected");
            TPrefix.markColor(prefix, color);
            xcMenu.close($prefixColorMenu);
        });
    }

    function sortColumn(colNums, tableId, order) {
        var colInfo = [];
        for (var i = 0; i < colNums.length; i++) {
            colInfo.push({
                colNum: colNums[i],
                order: order,
                typeToCast: null
            });
        }

        if (colNums.length > 1) {
            return xcFunction.sort(tableId, colInfo);
        }
        var colNum = colNums[0];
        var progCol = gTables[tableId].getCol(colNum);
        var type = progCol.getType();

        if (type !== "string") {
            return xcFunction.sort(tableId, colInfo);
        }

        var $tds = $("#xcTable-" + tableId).find("tbody td.col" + colNum);
        var datas = [];
        var val;

        $tds.each(function() {
            val = $(this).find('.originalData').text();
            datas.push(val);
        });

        var suggType = xcSuggest.suggestType(datas, type, 0.9);
        if (suggType === "integer" || suggType === "float") {
            var deferred = jQuery.Deferred();
            var instr = xcHelper.replaceMsg(IndexTStr.SuggInstr, {
                "type": suggType
            });

            Alert.show({
                "title": IndexTStr.SuggTitle,
                "instr": instr,
                "msg": IndexTStr.SuggMsg,
                "onCancel": deferred.reject,
                "buttons": [{
                    "name": IndexTStr.NoCast,
                    "func": function() {
                        xcFunction.sort(tableId, colInfo)
                        .then(deferred.resolve)
                        .fail(deferred.reject);
                    }
                },
                {
                    "name": IndexTStr.CastToNum,
                    "func": function() {
                        colInfo[0].typeToCast = suggType;
                        xcFunction.sort(tableId, colInfo)
                        .then(deferred.resolve)
                        .fail(deferred.reject);
                    }
                }
                ]
            });
            return deferred.promise();
        } else {
            return xcFunction.sort(tableId, colInfo);
        }
    }

    function copyToClipboard(valArray, stringify) {
        var $hiddenInput = $("<input>");
        var str = "";
        if (stringify) {
            str = JSON.stringify(valArray);
        } else {
            str = valArray.join(", ");
        }

        $("body").append($hiddenInput);
        $hiddenInput.val(str).select();
        document.execCommand("copy");
        $hiddenInput.remove();
    }

    function sortHighlightCells(cells) {
        cells.sort(function(a, b) {
            // first sort by colNum, then sort by rowNum if in same col
            var res = a.colNum - b.colNum;

            if (res === 0) {
                res = a.rowNum - b.rowNum;
            }

            return (res);
        });

        return (cells);
    }

    function setupHotKeys() {
        tableMenuMap = {
            a: "advancedOptions",
            b: "createDf",
            c: "corrAgg",
            d: "deleteTable",
            e: "exportTable",
            j: "jupyterTable",
            m: "hideTable",
            s: "multiCast",
            t: "makeTempTable",
            u: "unhideTable",
            x: "exitOp"
        };

        colMenuMap = {
            a: "aggregate",
            c: "corrAgg",
            d: "hideColumn.newColumn",
            e: "extensions",
            f: "filter",
            g: "groupby",
            h: "hideColumn",
            j: "join",
            m: "map",
            p: "profile",
            s: "sort",
            t: "changeDataType",
            x: "exitOp"
        };

        cellMenuMap = {
            c: "tdCopy",
            e: "tdJsonModal",
            f: "tdFilter",
            p: "tdUnnest",
            x: "tdExclude"
        };
    }

    TblMenu.sortColumn = sortColumn;

    function hotKeyTrigger(event, $menu) {
        var key = event.which;
        var letter = letterCode[key];

        var menuMap;
        if ($menu.attr("id") === "colMenu") {
            menuMap = colMenuMap;
        } else if ($menu.attr("id") === "tableMenu") {
            menuMap = tableMenuMap;
        } else {
            menuMap = cellMenuMap;
        }
        if (event.which === keyCode.Alt) {
            toggleHotKeys(event, $menu, menuMap);
        }

        if (!letter) {
            return;
        }

        if (menuMap.hasOwnProperty(letter)) {
            var menuAction = menuMap[letter];
            var $li = $menu.find("." + menuAction +
                            ":visible:not('.unavailable')").eq(0);
            if (!$li.length) {
                return;
            }
            event.preventDefault();
            if ($li.hasClass("parentMenu")) {
                $li.trigger(fakeEvent.mouseenter);
            } else {
                $li.trigger(fakeEvent.mouseup);
            }
        }
    }

    function toggleHotKeys(event, $menu, menuMap) {
        var removeHotKeys = function() {
            for (var letter in menuMap) {
                var $labels = $menu.find("." + menuMap[letter]).find(".label");
                $labels.each(function() {
                    var $label = $(this);
                    var text = $label.text();
                    $label.text(text);
                });
            }
            $menu.removeClass("showingHotKeys");
        };

        var addHotKeys = function() {
            for (var letter in menuMap) {
                var $labels = $menu.find("." + menuMap[letter]).find(".label");
                $labels.each(function() {
                    var $label = $(this);
                    if ($label.find(".underline").length) {
                        return true;
                    }
                    var text = $label.text();
                    var keyIndex = text.toLowerCase().indexOf(letter);
                    if (keyIndex === -1) {
                        return true;
                    }
                    var html = text.slice(0, keyIndex) +
                                '<span class="underline">' + text[keyIndex] +
                                '</span>' + text.slice(keyIndex + 1);
                    $label.html(html);
                });
            }
            $menu.addClass("showingHotKeys");
        };

        event.preventDefault();
        if ($menu.hasClass("showingHotKeys")) {
            removeHotKeys();
        } else {
            addHotKeys();
        }
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        TblMenu.__testOnly__ = {};
    }
    /* End Of Unit Test Only */

    return (TblMenu);
}({}, jQuery));

