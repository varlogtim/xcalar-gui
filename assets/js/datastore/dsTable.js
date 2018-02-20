/*
 * Module for dataset sample table
 */
window.DSTable = (function($, DSTable) {
    var $dsTableContainer; // $("#dsTableContainer")
    var $tableWrap;   // $("#dsTableWrap")

    var currentRow = 0;
    var totalRows = 0;
    var previousColSelected; // used for shift clicking columns
    var lastDSToSample; // used to track the last table to samle in async call
    var defaultColWidth = 130;

    // constant
    var initialNumRowsToFetch = 40;

    DSTable.setup = function() {
        $dsTableContainer = $("#dsTableContainer");
        $tableWrap = $("#dsTableWrap");
        $dsInfoPath = $("#dsInfo-path");
        setupSampleTable();
    };

    DSTable.showError = function(dsId, error, isFetchError) {
        var dsObj = DS.getDSObj(dsId);
        if (dsObj == null) {
            // error case
            return;
        }
        showTableView(dsId);
        updateTableInfo(dsObj, true); // isLoading = true, no async call
        // hide carts
        DSCart.switchToCart(null);
        setupViewAfterError(error, isFetchError);
    };

    DSTable.show = function(dsId, isLoading) {
        var dsObj = DS.getDSObj(dsId);
        if (dsObj == null) {
            return PromiseHelper.reject("No DS");
        }

        var notLastDSError = "not last ds";

        showTableView(dsId);
        // update date part of the table info first to make UI smooth
        updateTableInfo(dsObj, isLoading);

        if (isLoading) {
            setupViewBeforeLoading(dsObj);
            // hide carts
            DSCart.switchToCart(null);
            return PromiseHelper.resolve();
        }

        var deferred = jQuery.Deferred();
        var timer;
        var $dsTable = $("#dsTable");

        if ($dsTable.length === 0 ||
            $dsTable.data("dsid") !== dsObj.getId()) {
            // when not the case of already focus on this ds and refresh again
            // only when the loading is slow, show load section

            timer = setTimeout(function() {
                setupViewBeforeLoading();
            }, 300);
        }
        DSCart.switchToCart(dsId);

        var datasetName = dsObj.getFullName();
        lastDSToSample = datasetName;

        dsObj.makeErrorInfo()
        .then(function() {
            return dsObj.fetch(0, initialNumRowsToFetch);
        })
        .then(function(jsons, jsonKeys) {
            if (lastDSToSample !== datasetName) {
                // when network is slow and user trigger another
                // get sample table code will goes here
                return PromiseHelper.reject(notLastDSError);
            } else if (dsObj.getError() != null) {
                return PromiseHelper.reject(DSTStr.PointErr);
            }
            clearTimeout(timer);
            setupViewAfterLoading(dsObj);
            getSampleTable(dsObj, jsonKeys, jsons);
            if (dsObj.numErrorEntries) {
                $("#dsInfo-error").removeClass("xc-hidden");
            } else {
                $("#dsInfo-error").addClass("xc-hidden");
            }
            deferred.resolve();
        })
        .fail(function(error) {
            clearTimeout(timer);
            var noRetry = false;
            if (error === notLastDSError ||
                lastDSToSample !== datasetName)
            {
                deferred.reject(error);
                return;
            }

            error = dsObj.getError() || error;

            var errorMsg;
            if (typeof error === "object" && error.error != null) {
                errorMsg = error.error;
                if (error.status === StatusT.StatusDatasetAlreadyDeleted) {
                    noRetry = true;
                }
            } else if (error instanceof Error){
                errorMsg = String(error);
            } else if (typeof error === "string") {
                errorMsg = error;
            } else {
                // unhanled type of error;
                errorMsg = ErrTStr.Unknown;
            }

            setupViewAfterError(errorMsg, true, noRetry);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    function showTableView(dsId) {
        $("#dsTableView").removeClass("xc-hidden");
        $("#dataCartBtn").removeClass("xc-hidden");
        $dsTableContainer.data("id", dsId);
        DSForm.hide();
    }

    function setupViewBeforeLoading(dsObj) {
        $dsTableContainer.removeClass("error");
        $dsTableContainer.addClass("loading");
        $("#dsColsBtn").addClass("xc-hidden");
        $dsTableContainer.find(".lockedTableIcon").addClass("xc-hidden");
        $tableWrap.html("");
        if (dsObj) {
            var progressAreaHtml = "";
            var txId = DS.getGrid(dsObj.getId()).data("txid");
            var $lockIcon = $dsTableContainer
                            .find('.lockedTableIcon[data-txid="' + txId + '"]');
            if ($lockIcon.length) {
                $lockIcon.removeClass("xc-hidden");
                return;
            }
            var withText = true;
            progressAreaHtml = xcHelper.getLockIconHtml(txId, 0, withText);
            $dsTableContainer.find(".loadSection").append(progressAreaHtml);
            var progressCircle = new ProgressCircle(txId, 0, withText);
            $dsTableContainer.find(".cancelLoad").data("progresscircle",
                                                       progressCircle);
        }
    }

    function setupViewAfterLoading(dsObj) {
        // update info here
        updateTableInfo(dsObj);

        $dsTableContainer.removeClass("error");
        $dsTableContainer.removeClass("loading");
        $("#dsColsBtn").removeClass("xc-hidden");
    }

    function setupViewAfterError(error, isFetchError, noRetry) {
        error = xcHelper.parseError(error);
        // backend might return this: "<string>"
        error = xcHelper.escapeHTMLSpecialChar(error);
        var startError = isFetchError
                         ? StatusMessageTStr.DSFetchFailed
                         : StatusMessageTStr.ImportDSFailed;
        error = startError + ". " + error;

        $tableWrap.html("");
        $("#dsColsBtn").addClass("xc-hidden");
        $dsTableContainer.removeClass("loading");
        $dsTableContainer.addClass("error");

        var $errorSection = $dsTableContainer.find(".errorSection");
        $errorSection.find(".error").html(error);

        var dsId = $dsTableContainer.data("id");
        var dsObj = DS.getDSObj(dsId);
        if (!noRetry && dsObj != null &&
            dsObj.getUser() === XcSupport.getUser()) {
            $errorSection.find(".suggest").removeClass("xc-hidden");
        } else {
            $errorSection.find(".suggest").addClass("xc-hidden");
        }
    }

    DSTable.hide = function() {
        $("#dsTableView").addClass("xc-hidden");
        $("#dsTableWrap").empty();
        $("#dataCartBtn").addClass("xc-hidden");
        $("#dsListSection").find(".gridItems .grid-unit.active")
                                .removeClass("active");
        $dsTableContainer.removeData("id");
    };

    DSTable.getId = function() {
        var $table = $("#dsTable");
        if ($table.is(":visible")) {
            return $table.data("dsid");
        } else {
            // when not visible
            return null;
        }
    };

    DSTable.clear = function() {
        $tableWrap.html("");
    };

    DSTable.refresh = function(resizeCols) {
        // size tableWrapper so borders fit table size
        // As user can maunally resize to have/not have scrollbar
        // we always need the scrollBarpadding
        var $dsTable = $("#dsTable");
        var tableHeight = $dsTable.height();
        var scrollBarPadding = 10;
        $tableWrap.width($dsTable.width());
        // if ($dsTable.width() > $dsTableContainer.parent().width()) {
        //     scrollBarPadding = 10;
        // } else if (resizeCols) {
        //     sizeColumns();
        //     // after resize, need another check
        //     if ($dsTable.width() > $dsTableContainer.parent().width()) {
        //         scrollBarPadding = 10;
        //     }
        // }

        if (resizeCols) {
            sizeColumns();
        }

        $dsTableContainer.height(tableHeight + scrollBarPadding);
    };

    function getSampleTable(dsObj, jsonKeys, jsons) {
        var html = getSampleTableHTML(dsObj, jsonKeys, jsons);
        $tableWrap.html(html);
        restoreSelectedColumns();
        DSTable.refresh(true);
        TblFunc.moveFirstColumn($("#dsTable"));

        // scroll cannot use event bubble so we have to add listener
        // to .datasetTbodyWrap every time it's created
        $("#dsTableWrap .datasetTbodyWrap").scroll(function() {
            dataStoreTableScroll($(this));
        });
    }

    function updateTableInfo(dsObj) {
        var dsName = dsObj.getName();
        var numEntries = dsObj.getNumEntries();
        var path = dsObj.getPathWithPattern() || CommonTxtTstr.NA;
        var target = dsObj.getTargetName();

        $dsInfoPath.text(path);

        xcTooltip.changeText($dsInfoPath, target + "\n" + path);
        xcTooltip.enable($dsInfoPath);
        $("#dsInfo-error").addClass("xc-hidden");
        $("#dsInfo-title").text(dsName);
        $("#dsInfo-author").text(dsObj.getUser());
        // there is no fail case
        $("#dsInfo-size").text(dsObj.getDisplaySize());
        $("#dsInfo-date").text(dsObj.getDate());

        var format = dsObj.getFormat() || CommonTxtTstr.NA;
        $("#dsInfo-format").text(format);
        var $dsInfoUdf = $("#dsInfo-udf");
        if (dsObj.moduleName && dsObj.moduleName.trim() !== "") {
            $dsInfoUdf.text(dsObj.moduleName + ":" + dsObj.funcName);
            xcTooltip.add($dsInfoUdf, {title: JSON.stringify(dsObj.udfQuery)});
            $dsInfoUdf.removeClass("xc-hidden");
            $dsInfoUdf.prev("span").removeClass("xc-hidden")
                      .prev("span").removeClass("xc-hidden");
        } else {
            xcTooltip.remove($dsInfoUdf);
            $dsInfoUdf.addClass("xc-hidden");
            $dsInfoUdf.prev("span").addClass("xc-hidden")
                      .prev("span").addClass("xc-hidden");
        }
        // TODO tooltip with query
        if (typeof numEntries === "number") {
            numEntries = xcHelper.numToStr(numEntries);
        } else {
            numEntries = CommonTxtTstr.NA;
        }

        $("#dsInfo-records").text(numEntries);

        totalRows = parseInt(numEntries.replace(/\,/g, ""));
    }

    function dataStoreTableScroll($tableWrapper) {
        var numRowsToFetch = 20;
        if (currentRow + initialNumRowsToFetch >= totalRows) {
            return PromiseHelper.resolve();
        }

        if ($("#dsTable").hasClass("fetching")) {
            // when still fetch the data, no new trigger
            console.info("Still fetching previous data!");
            return PromiseHelper.reject("Still fetching previous data!");
        }

        if ($tableWrapper[0].scrollHeight - $tableWrapper.scrollTop() -
                   $tableWrapper.outerHeight() <= 1) {
            if (currentRow === 0) {
                currentRow += initialNumRowsToFetch;
            } else {
                currentRow += numRowsToFetch;
            }

            $("#dsTable").addClass("fetching");
            var dsId = $("#dsTable").data("dsid");
            var deferred = jQuery.Deferred();

            scrollSampleAndParse(dsId, currentRow, numRowsToFetch)
            .then(deferred.resolve)
            .fail(function(error) {
                deferred.reject(error);
                console.error("Scroll data sample table fails", error);
            })
            .always(function() {
                // when switch ds, #dsTable will be re-built
                // so this is the only place the needs to remove class
                $("#dsTable").removeClass("fetching");
            });

            return deferred.resolve();
        } else {
            return PromiseHelper.reject("no need to scroll");
        }
    }

    function scrollSampleAndParse(dsId, rowToGo, rowsToFetch) {
        var dsObj = DS.getDSObj(dsId);
        if (dsObj == null) {
            return PromiseHelper.reject("No DS");
        }

        var deferred = jQuery.Deferred();

        dsObj.fetch(rowToGo, rowsToFetch)
        .then(function(jsons) {
            var curDSId = $("#dsTable").data("dsid");
            if (dsId !== curDSId) {
                // when change ds
                console.warn("Sample table change to", curDSId, "cancel fetch");
                deferred.resolve();
                return;
            }

            var selectedCols = {};
            var $dsTable = $("#dsTable");
            var realJsonKeys = [];

            $dsTable.find("th.th").each(function(index) {
                var $th = $(this);
                if ($th.hasClass("selectedCol")) {
                    // the first column is column 1
                    selectedCols[index + 1] = true;
                }

                var header = $th.find(".editableHead").val();
                // when scroll, it should follow the order of current header
                realJsonKeys[index] = header;
            });

            var tr = getTableRowsHTML(realJsonKeys, jsons, false, selectedCols);
            $dsTable.append(tr);
            TblFunc.moveFirstColumn($dsTable);

            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // event set up for the module
    function setupSampleTable() {
        // select table witout picking columns
        $("#noDScols").click(function() {
            var $table = $("#dsTable");
            var dsId = $table.data("dsid");
            $table.find(".colAdded").removeClass("colAdded");
            $table.find(".selectedCol").removeClass("selectedCol");

            DSCart.addItem(dsId, null);
        });

        // select all columns
        $("#selectDSCols").click(function() {
            selectAllDSCols();
        });

        // clear all columns
        $("#clearDsCols").click(function() {
            var $table = $("#dsTable");
            var dsId = $table.data("dsid");
            $table.find(".colAdded").removeClass("colAdded");
            $table.find(".selectedCol").removeClass("selectedCol");
            DSCart.removeCart(dsId);
        });

        $dsInfoPath.on("click", function() {
            // copies filepath to clipboard
            var value = $dsInfoPath.text();
            xcHelper.copyToClipboard(value);

            $dsInfoPath.parent().addClass("animate");
            setTimeout(function() {
                $dsInfoPath.parent().removeClass("animate");
            }, 1800);
        });

        var $dsTableView = $("#dsTableView");
        // reload ds with new preview size
        $dsTableView.on("click", ".errorSection .retry", function() {
            var dsId = $dsTableContainer.data("id");
            if (dsId == null) {
                console.error("cannot find ds");
                return;
            }

            rePointDS(dsId);
        });

        // click to select a column
        $tableWrap.on("click", ".header > .flexContainer", function(event) {
            var $input = $(this).find('.editableHead');
            var $table = $("#dsTable");

            if (event.shiftKey && previousColSelected) {

                var startIndex = previousColSelected.closest("th").index();
                // var highlight = gLastClickTarget.closest("th")
                //                 .hasClass('selectedCol');
                var isHighlighted = $input.closest('th')
                                          .hasClass('selectedCol');

                var endIndex = $input.closest('th').index();
                if (startIndex > endIndex) {
                    var temp = endIndex;
                    endIndex = startIndex;
                    startIndex = temp;
                }

                var $ths = $table.find('th');
                for (var i = startIndex; i <= endIndex; i++) {
                    var $th = $ths.eq(i);
                    if (isHighlighted === $th.hasClass('selectedCol')) {
                        selectColumn($th.find(".editableHead"),
                                            SelectUnit.Single);
                    }
                }
            } else {
                selectColumn($input, SelectUnit.Single);
            }
            previousColSelected = $input.closest('th');
        });

        // select all columns when clicking on row num header
        $tableWrap.on("click", ".rowNumHead", function() {
            selectAllDSCols();
        });

        // resize column
        $tableWrap.on("mousedown", ".colGrab", function(event) {
            if (event.which !== 1) {
                return;
            }
            TblAnim.startColResize($(this), event, {
                target: "datastore",
                minWidth: 25
            });
        });

        $dsTableContainer.scroll(function(){
            var $dsTable = $("#dsTable");
            $(this).scrollTop(0);
            TblFunc.moveFirstColumn($dsTable);
        });

        $dsTableContainer.on("click", ".cancelLoad", function() {
            var txId = $(this).data("txid");
            QueryManager.cancelDS(txId);
        });

        $("#showFileListBtn").click(function() {
            FileListModal.show();
        });

        $("#dsInfo-error").click(function() {
            DSImportErrorModal.show(DSTable.getId());
        });
    }

    // select all columns
    function selectAllDSCols() {
        var items = [];
        var dsId = $("#dsTable").data("dsid");

        $("#dsTable .editableHead").each(function() {
            var $input = $(this);
            var $header = $input.closest(".header");
            if (!$header.hasClass("colAdded")) {
                var colNum = xcHelper.parseColNum($input);
                var val = $input.val();
                var type = $header.data("type");
                items.push({
                    "colNum": colNum,
                    "value": val,
                    "type": type
                });
            }
        });
        highlightAllColumns();
        DSCart.addItem(dsId, items);
    }

    // select a column
    function selectColumn($input, selectAll) {
        var dsId = $("#dsTable").data("dsid");
        var $header = $input.closest(".header");
        var colNum = xcHelper.parseColNum($input);
        // unselect the column
        if ($header.hasClass("colAdded") && !selectAll) {
            highlightColumn($input, IsActive.Active);
            DSCart.removeItem(dsId, colNum);
        } else {
            highlightColumn($input);
            DSCart.addItem(dsId, {
                "colNum": colNum,
                "value": $input.val(),
                "type": $header.data("type")
            });
        }
    }

    // re-selecte columns that are in data carts
    function restoreSelectedColumns() {
        var $table = $("#dsTable");
        var dsId = $table.data("dsid");
        var $cart = DSCart.getCartElement(dsId);

        $cart.find("li").each(function() {
            var colNum = $(this).data("colnum");
            var $input = $table.find(".editableHead.col" + colNum);
            highlightColumn($input);
        });
        previousColSelected = null;
    }

    // if table is less wide than the panel, expand column widths if content is
    // oveflowing
    function sizeColumns() {
        var destWidth = $dsTableContainer.parent().width() - 40;
        var $headers = $tableWrap.find("th:gt(0)");
        // var numCols = $headers.length;
        // var destColWidth = Math.floor(destWidth / numCols);
        var bestFitWidths = [];
        var totalWidths = 0;
        var needsExpanding = [];
        var numStaticWidths = 0;
        var expandWidths = 0;

        // track which columns will expand and which will remain at
        // default colwidth
        $headers.each(function() {
            var width = TblFunc.getWidestTdWidth($(this), {
                "includeHeader": true,
                "fitAll": true,
                "datastore": true
            });
            var expanding = false;
            if (width > defaultColWidth) {
                expanding = true;
            } else {
                numStaticWidths++;
            }
            needsExpanding.push(expanding);
            width = Math.max(width, defaultColWidth);
            bestFitWidths.push(width);
            totalWidths += width;
            if (expanding) {
                expandWidths += width;
            }
        });

        var ratio = destWidth / totalWidths;
        if (ratio < 1) {
            // extra width is the remainining width that the larger columns
            // can take up
            var remainingWidth = destWidth - (numStaticWidths *
                                              defaultColWidth);
            ratio = remainingWidth / expandWidths;

            bestFitWidths = bestFitWidths.map(function(width, i) {
                if (needsExpanding[i]) {
                    return Math.max(defaultColWidth, Math.floor(width * ratio));
                } else {
                    return width;
                }
            });
        }

        $headers.each(function(i) {
            $(this).outerWidth(bestFitWidths[i]);
        });

        var $dsTable = $("#dsTable");
        $tableWrap.width($dsTable.width());
    }

    // hightligt column
    function highlightColumn($input, active) {
        var colNum = xcHelper.parseColNum($input);
        var $table = $input.closest(".datasetTable");
        var $header = $input.closest(".header");

        if (active) {
            $header.removeClass("colAdded");
            $table.find(".col" + colNum).removeClass("selectedCol");
        } else {
            $header.addClass("colAdded");
            $table.find(".col" + colNum).addClass("selectedCol");
        }
    }

    function highlightAllColumns() {
        $("#dsTable").find(".header:gt(0)").addClass("colAdded")
                     .parent().addClass("selectedCol");
        $("#dsTable").find("td:not(.lineMarker)").addClass("selectedCol");
    }

    function rePointDS(dsId) {
        // maybe it's a succes point but ds table has error
        var dsObj = DS.getErrorDSObj(dsId);
        if (dsObj != null) {
            DS.removeErrorDSObj(dsId);
        } else {
            dsObj = DS.getDSObj(dsId);
        }

        if (!dsObj) {
            Alert.error(DSTStr.NotFindDS);
            return;
        }

        var sources = dsObj.getSources();
        var files = sources.map(function(source) {
            return {
                "path": source.path,
                "recursive": source.recursive,
                "dsToReplace": dsId
            };
        });
        DSPreview.show({
            "targetName": dsObj.getTargetName(),
            "files": files,
            "format": dsObj.getFormat(),
            "pattern": sources.fileNamePattern,
            "dsName": dsObj.getName(),
            "skipRows": dsObj.skipRows,
            "moduleName": dsObj.moduleName,
            "funcName": dsObj.funcName,
            "hasHeader": dsObj.hasHeader,
            "fieldDelim": dsObj.fieldDelim,
            "lineDelim": dsObj.lineDelim,
            "quoteChar": dsObj.quoteChar,
            "typedColumns": dsObj.typedColumns,
            "udfQuery": dsObj.udfQuery,
        }, false, true);
    }

    // sample table html
    function getSampleTableHTML(dsObj, jsonKeys, jsons) {
        // validation check
        if (!dsObj || !jsonKeys || !jsons) {
            return "";
        }

        var tr = "";
        var th = "";

        var columnsType = [];  // track column type
        var numKeys = jsonKeys.length;
        numKeys = Math.min(1000, numKeys); // limit to 1000 ths
        var colStrLimit = 250;
        if (numKeys < 5) {
            colStrLimit = Math.max(1000 / numKeys, colStrLimit);
        }
        currentRow = 0;

        jsonKeys.forEach(function() {
            columnsType.push(undefined);
        });

        // table rows
        tr = getTableRowsHTML(jsonKeys, jsons, columnsType, null, colStrLimit);
        if (numKeys > 0) {
            th += '<th class="rowNumHead" title="select all columns"' +
                    ' data-toggle="tooltip" data-placement="top"' +
                    ' data-container="body"><div class="header">' +
                  '</div></th>';
        }

        // table header
        for (var i = 0; i < numKeys; i++) {
            var key = jsonKeys[i].replace(/\'/g, '&#39');
            var thClass = "th col" + (i + 1);
            var type = columnsType[i];
            var width = xcHelper.getTextWidth(null, key, {
                "defaultHeaderStyle": true
            });

            width += 2; // text will overflow without it
            width = Math.max(width, defaultColWidth); // min of 130px

            th +=
                '<th class="' + thClass + '" style="width:' + width + 'px;">' +
                    '<div class="header type-' + type + '" ' +
                         'data-type=' + type + '>' +
                        '<div class="colGrab"></div>' +
                        '<div class="flexContainer flexRow">' +
                            '<div class="flexWrap flex-left" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="top" ' +
                                'data-container="body" ' +
                                'title="' + type + '">' +
                                '<span class="iconHidden"></span>' +
                                '<span class="type icon"></span>' +
                            '</div>' +
                            '<div class="flexWrap flex-mid">' +
                                '<input spellcheck="false"' +
                                    'class="tooltipOverflow editableHead ' +
                                    'shoppingCartCol ' +
                                    thClass + '" value=\'' + key + '\' ' +
                                    'disabled ' +
                                    'data-original-title="' + key + '" ' +
                                    'data-toggle="tooltip" ' +
                                    'data-container="body" ' +'>' +
                            '</div>' +
                            '<div class="flexWrap flex-right">' +
                                '<i class="icon xi-tick fa-8"></i>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</th>';
        }

        var html =
            '<div class="datasetTbodyWrap">' +
                '<table id="dsTable" class="datasetTable dataTable" ' +
                        'data-dsid="' + dsObj.getId() + '">' +
                    '<thead>' +
                        '<tr>' + th + '</tr>' +
                    '</thead>' +
                    '<tbody>' + tr + '</tbody>' +
                '</table>' +
            '</div>';

        return (html);
    }

    function getTableRowsHTML(jsonKeys, jsons, columnsType, selectedCols,
                              colStrLimit) {
        var tr = "";
        var i  = 0;
        var knf = false;

        jsons.forEach(function(json) {
            tr += '<tr>';
            tr += '<td class="lineMarker"><div class="idSpan">' +
                    (currentRow + i + 1) + '</div></td>';
            // loop through each td, parse object, and add to table cell
            var numKeys = Math.min(jsonKeys.length, 1000); // limit to 1000 ths
            for (var j = 0; j < numKeys; j++) {
                var key = jsonKeys[j];
                var val = json[key];
                knf = false;
                // Check type
                columnsType[j] = xcHelper.parseColType(val, columnsType[j]);

                if (val === undefined) {
                    knf = true;
                }
                var parsedVal = xcHelper.parseJsonValue(val, knf);
                if (colStrLimit) {
                    var hiddenStrLen = parsedVal.length - colStrLimit;
                    if (hiddenStrLen > 0) {
                        parsedVal = parsedVal.slice(0, colStrLimit) +
                                    "...(" +
                                    xcHelper.numToStr(hiddenStrLen) + " " +
                                    TblTStr.Truncate + ")";
                    }
                }
                if (typeof parsedVal === "string") {
                    parsedVal = xcHelper.styleNewLineChar(parsedVal);
                }

                var selected  = "";
                if (selectedCols && selectedCols[j + 1]) {
                    selected = " selectedCol";
                }

                tr += '<td class="col' + (j + 1) + selected + '">' +
                        '<div class="tdTextWrap">' +
                            '<div class="tdText">' +
                                parsedVal +
                            '</div>' +
                        '</div>' +
                      '</td>';
            }

            tr += '</tr>';
            i++;
        });

        return (tr);
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DSTable.__testOnly__ = {};
        DSTable.__testOnly__.scrollSampleAndParse = scrollSampleAndParse;
        DSTable.__testOnly__.dataStoreTableScroll = dataStoreTableScroll;
    }
    /* End Of Unit Test Only */

    return (DSTable);
}(jQuery, {}));
