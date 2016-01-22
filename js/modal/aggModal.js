window.AggModal = (function($, AggModal) {
    var $modalBg = $("#modalBackground");
    var $aggModal = $("#aggModal");

    var $aggInstr = $("#aggModal-instr");
    var $aggTableName = $("#aggModal-tableName");

    var $quickAgg = $("#aggModal-quickAgg");
    var $corr = $("#aggModal-corr");

    var aggrFunctions = [AggrOp.Sum, AggrOp.Avg, AggrOp.Min,
                        AggrOp.Max, AggrOp.Count];

    var aggCols = [];
    // UI cahce, not save to KVStore
    var aggCache  = {};
    var corrCache = {};
    var aggOpMap  = {};

    var minWidth  = 580;
    var minHeight = 300;
    var modalHelper = new xcHelper.Modal($aggModal, {
        "minWidth" : minWidth,
        "minHeight": minHeight
    });

    AggModal.setup = function() {
        aggOpMap[AggrOp.Sum] = 0;
        aggOpMap[AggrOp.Avg] = 1;
        aggOpMap[AggrOp.Min] = 2;
        aggOpMap[AggrOp.Max] = 3;
        aggOpMap[AggrOp.Count] = 4;

        $aggModal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": "window"
        });

        $aggModal.resizable({
            "handles"    : "n, e, s, w, se",
            "minHeight"  : minHeight,
            "minWidth"   : minWidth,
            "containment": "document"
        });

        $aggModal.on("click", ".close", function() {
            closeAggModel();
        });

        $aggModal.on("mouseenter", ".tooltipOverflow", function() {
            xcHelper.autoTooltip(this);
        });


        $quickAgg.find(".aggContainer").scroll(function() {
            var scrollTop = $(this).scrollTop();
            $quickAgg.find(".labelContainer").scrollTop(scrollTop);
        });

        $corr.find(".aggContainer").scroll(function() {
            var scrollTop = $(this).scrollTop();
            $corr.find(".labelContainer").scrollTop(scrollTop);
        });
    };

    AggModal.quickAgg = function(tableId) {
        var deferred = jQuery.Deferred();

        var table     = gTables[tableId];
        var tableName = table.tableName;
        var $table    = $("xcTable-" + tableId);

        showAggModal(table.tableName, "quickAgg");

        aggColsInitialize(table);
        aggTableInitialize($table);

        calcAgg($table, tableName, tableId)
        .then(function() {
            SQL.add("Quick Aggregate", {
                "operation": SQLOps.QuickAgg,
                "tableId"  : tableId,
                "tableName": tableName
            });

            commitToStorage();
            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error("Quick Aggregate Fails", error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    AggModal.corr = function(tableId) {
        var deferred = jQuery.Deferred();

        var table     = gTables[tableId];
        var tableName = table.tableName;
        var $table    = $("xcTable-" + tableId);

        showAggModal(table.tableName, "corr");

        aggColsInitialize(table);
        corrTableInitialize($table);

        calcCorr($table, tableName, tableId)
        .then(function() {
            SQL.add("Correlation", {
                "operation": SQLOps.Corr,
                "tableId"  : tableId,
                "tableName": tableName
            });

            commitToStorage();
            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error("Quick Aggregate Fails", error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    function showAggModal(tableName, mode) {
        var $header = $aggModal.find(".modalHeader .text");

        if (mode === "quickAgg") {
            // when it's quick aggregation
            $quickAgg.show();
            $corr.hide();
            $header.text(AggModalStr.QuickAggTitle);
            $aggInstr.text(AggModalStr.QuickAggInstr);
        } else if (mode === "corr") {
            // when it's correlation
            $quickAgg.hide();
            $corr.show();
            $header.text(AggModalStr.CorrTitle);
            $aggInstr.text(AggModalStr.CorrInstr);
        } else {
            // error case
            throw "Invalid mode in quick agg!";
        }

        $aggTableName.find(".text").text(tableName);
        modalHelper.setup();

        if (gMinModeOn) {
            $modalBg.show();
            $aggModal.show();
            showHandler();
        } else {
            $modalBg.fadeIn(300, function() {
                $aggModal.fadeIn(180);
                showHandler();
            });
        }

        function showHandler() {
            Tips.refresh();
            $aggModal.find(".aggContainer")
                    .scrollTop(0)
                    .scrollLeft(0);
        }
    }

    function aggColsInitialize(table) {
        aggCols = [];

        var tableCols = table.tableCols;
        for (var i = 0, colLen = tableCols.length; i < colLen; i++) {
            // Skip DATA!
            if (tableCols[i].name === "DATA") {
                continue;
            } else {
                aggCols.push({
                    "colNum": i + 1,
                    "col"   : tableCols[i]
                });
            }
        }
    }

    function aggTableInitialize($table) {
        var colLen = aggCols.length;
        var funLen = aggrFunctions.length;
        var wholeTable = '';

        for (var j = 0; j < colLen; j++) {
            var cols   = aggCols[j].col;
            var colNum = aggCols[j].colNum;

            wholeTable += getAggColHTML(cols.name);

            var isChildOfArray = $table.find(".th.col" + colNum + " .header")
                                        .hasClass("childOfArray");

            for (var i = 0; i < funLen; i++) {
                wholeTable += '<div class="aggTableField">';

                if (cols.type === "integer" || cols.type === "float") {
                    // XXX now agg on child of array is not supported
                    if (isChildOfArray) {
                        wholeTable += "Not Supported";
                    } else {
                        wholeTable += '<div class="spinny"></div>';
                    }
                } else {
                    wholeTable += "N/A";
                }

                wholeTable += "</div>";
            }
            // closing div from getAggColHTML();
            wholeTable += "</div>";
        }

        $quickAgg.find(".labelContainer").html(getRowLabelHTML(aggrFunctions));
        $quickAgg.find(".aggContainer").html(wholeTable);
    }

    function corrTableInitialize($table) {
        var colLen = aggCols.length;
        var wholeTable = '';

        for (var j = 0; j < colLen; j++) {
            var cols   = aggCols[j].col;
            var colNum = aggCols[j].colNum;

            wholeTable += getAggColHTML(cols.name);
            var isChildOfArray = $table.find(".th.col" + colNum + " .header")
                                        .hasClass("childOfArray");

            for (var i = 0; i < colLen; i++) {
                var vertCols = aggCols[i].col;
                var whiteBackground =
                            "style='background-color:rgb(255,255,255)'";
                var backgroundOpacity =
                                    "style='background-color:rgba(66,158,212,";
                wholeTable += '<div class="aggTableField aggTableFlex" ';

                if (i === j) {
                    wholeTable += ">1";
                } else if (i > j) {
                    wholeTable += whiteBackground;
                    wholeTable += ">See other";
                } else if ((cols.type === "integer" || cols.type === "float")
                           && (vertCols.type === "integer" ||
                               vertCols.type === "float"))
                {
                    // XXX now agg on child of array is not supported
                    if (isChildOfArray) {
                        wholeTable += whiteBackground;
                        wholeTable += ">Not Supported";
                    } else {
                        wholeTable += backgroundOpacity + "0)'";
                        wholeTable += '><div class="spinner">' +
                                        '<div class="bounce1"></div>' +
                                        '<div class="bounce2"></div>' +
                                        '<div class="bounce3"></div>' +
                                        '</div>';
                    }
                } else {
                    wholeTable += whiteBackground;
                    wholeTable += ">N/A";
                }
                wholeTable += "</div>";
            }
            // closing div from getAggColHTML();
            wholeTable += "</div>";
        }

        var vertLabels = [];
        aggCols.forEach(function(colInfo) {
            vertLabels.push(colInfo.col.name);
        });

        $corr.find(".labelContainer").html(getRowLabelHTML(vertLabels));
        $corr.find(".aggContainer").html(wholeTable);
    }

    function getAggColHTML(colName) {
        // Note: the clos </div> should be added manually outside this function
        var html =
            '<div class="aggCol">' +
                '<div class="divider"></div>' +
                '<div class="aggTableField colLabel">' +
                    '<span title="' + colName + '" ' +
                        'data-toggle="tooltip" ' +
                        'data-placement="top" ' +
                        'data-container="body" ' +
                        'class="textOverflow tooltipOverflow">' +
                        colName +
                    '</span>' +
                '</div>';
        return html;
    }

    function getRowLabelHTML(operations) {
        var html =
            '<div class="aggCol labels">' +
                '<div class="aggTableField colLabel blankSpace"></div>';

        for (var i = 0, len = operations.length; i < len; i++) {
            html += '<div class="aggTableField rowLabel">' +
                        '<span title="' + operations[i] + '" ' +
                            'data-toggle="tooltip" data-placement="top" ' +
                            'data-container="body" ' +
                            'class="textOverflow tooltipOverflow">' +
                            operations[i] +
                        '</span>' +
                    '</div>';
        }

        html += '</div>';
        return (html);
    }

    function calcCorr($table, tableName, tableId) {
        var promises = [];

        var colLen  = aggCols.length;
        var dupCols = [];
        // First we need to determine if this is a dataset-table
        // or just a regular table

        var corrString = "div(sum(mult(sub($arg1, avg($arg1)), sub($arg2," +
                         "avg($arg2)))), sqrt(mult(sum(pow(sub($arg1, " +
                         "avg($arg1)), 2)), sum(pow(sub($arg2, avg($arg2)), " +
                         "2)))))";

        for (var j = 0; j < colLen; j++) {
            var cols   = aggCols[j].col;
            var colNum = aggCols[j].colNum;

            if (cols.type === "integer" || cols.type === "float") {
                // for duplicated columns, no need to trigger thrift call
                if (dupCols[j]) {
                    // console.log("Duplicated column", j);
                    continue;
                }

                var dups = checkDupCols(j);
                for (var t = 0; t < dups.length; t++) {
                    var dupColNum = dups[t];
                    dupCols[dupColNum] = true;
                    if (dupColNum > j) {
                        $corr.find(".aggCol:not(.labels)").eq(dupColNum)
                            .find(".aggTableField:not(.colLabel)").eq(j)
                                .html("1").css("background-color", "");
                    }
                }

                var $colHeader = $table.find(".th.col" + colNum + " .header");
                // XXX now agg on child of array is not supported
                if (!$colHeader.hasClass("childOfArray")) {
                    for (var i = 0; i < j; i++) {
                        if (i === j) {
                            // Must be 1 so skip
                            continue;
                        }
                        var vertCols = aggCols[i].col;
                        if (vertCols.type !== "integer" &&
                            vertCols.type !== "float")
                        {
                            continue;
                        }
                        var sub = corrString.replace(/[$]arg1/g,
                                                     cols.getBackColName());
                        sub = sub.replace(/[$]arg2/g, vertCols.getBackColName());
                        // Run correlation function
                        var promise = runCorr(tableId, tableName,
                                                sub, i, j, dups);
                        promises.push(promise);
                    }
                }
            }
        }

        return (xcHelper.when.apply(window, promises));
    }

    function calcAgg($table, tableName, tableId) {
        var promises = [];

        var colLen = aggCols.length;
        var funLen = aggrFunctions.length;
        // First we need to determine if this is a dataset-table
        // or just a regular table
        var dupCols = [];
        for (var j = 0; j < colLen; j++) {
            var cols   = aggCols[j].col;
            var colNum = aggCols[j].colNum;
            // Skip DATA!
            if (cols.type === "integer" || cols.type === "float") {
                // for duplicated columns, no need to trigger thrift call
                if (dupCols[j]) {
                    // console.log("Duplicated column", j);
                    continue;
                }

                var dups = checkDupCols(j);
                for (var t = 0; t < dups.length; t++) {
                    var dupColNum = dups[t];
                    dupCols[dupColNum] = true;
                }

                var $colHeader = $table.find(".th.col" + colNum + " .header");
                // XXX now agg on child of array is not supported
                if (!$colHeader.hasClass("childOfArray")) {
                    for (var i = 0; i < funLen; i++) {
                        var promise = runAgg(tableId, tableName,
                                                cols.getBackColName(),
                                                aggrFunctions[i], i, j, dups);
                        promises.push(promise);
                    }
                }
            }
        }

        return (xcHelper.when.apply(window, promises));
    }

    function checkDupCols(colNo) {
        var args = aggCols[colNo].col.getBackColName();
        var dups = [];

        for (var i = colNo + 1, len = aggCols.length; i < len; i++) {
            var cols = aggCols[i].col;
            if (cols.func.func !== "raw" && cols.getBackColName() === args) {
                dups.push(i);
            }
        }
        return (dups);
    }

    function runAgg(tableId, tableName, fieldName, opString, row, col, dups) {
        var deferred = jQuery.Deferred();
        var tableAgg;
        var colAgg;

        if (aggCache.hasOwnProperty(tableId)) {
            tableAgg = aggCache[tableId];
            if (tableAgg.hasOwnProperty(fieldName)) {
                colAgg = tableAgg[fieldName];
                var aggRes = colAgg[aggOpMap[opString]];
                if (aggRes != null) {
                    applyAggResult(aggRes);
                    deferred.resolve();
                    return (deferred.promise());
                }
            }
        }

        var sqlOptions = {
            "operation": SQLOps.QuickAggAction,
            "type"     : "aggregate",
            "fieldName": fieldName,
            "aggrOp"   : opString
        };

        XcalarAggregate(fieldName, tableName, opString, sqlOptions)
        .then(function(value) {
            var val;

            try {
                var obj = jQuery.parseJSON(value);
                val = obj.Value;
            } catch (error) {
                console.error(error, obj);
                val = "--";
            }

            // cache value
            aggCache[tableId] = aggCache[tableId] || {};
            tableAgg = aggCache[tableId];
            tableAgg[fieldName] = tableAgg[fieldName] || [];
            colAgg = tableAgg[fieldName];
            colAgg[aggOpMap[opString]] = val;
            // end of cache value

            applyAggResult(val);
            deferred.resolve();
        })
        .fail(function(error) {
            applyAggResult("--");
            deferred.reject(error);
        });

        function applyAggResult(value) {
            var html = '<span class="textOverflow tooltipOverflow" ' +
                        'title="' + value +
                        '" data-toggle="tooltip" data-placement="top" ' +
                        'data-container="body">' +
                        (jQuery.isNumeric(value) ? value.toFixed(3) : value) +
                        '</span>';
            $quickAgg.find(".aggCol:not(.labels)").eq(col)
                .find(".aggTableField:not(.colLabel)").eq(row).html(html);

            dups.forEach(function(colNum) {
                $quickAgg.find(".aggCol:not(.labels)").eq(colNum)
                    .find(".aggTableField:not(.colLabel)").eq(row).html(html);
            });
        }

        return (deferred.promise());
    }

    function runCorr(tableId, tableName, evalStr, row, col, colDups) {
        var deferred = jQuery.Deferred();

        if (corrCache.hasOwnProperty(tableId)) {
            var corrRes = corrCache[tableId][evalStr];

            if (corrRes != null) {
                applyCorrResult(corrRes);
                deferred.resolve();
                return (deferred.promise());
            }
        }


        var sqlOptions = {
            "operation": SQLOps.QuickAggAction,
            "type"     : "correlation",
            "evalStr"  : evalStr
        };

        XcalarAggregateHelper(tableName, evalStr, sqlOptions)
        .then(function(value) {
            var val;

            try {
                var obj = jQuery.parseJSON(value);
                val = obj.Value;
            } catch (error) {
                console.error(error, obj);
                val = "--";
            }

            // cache value
            corrCache[tableId] = corrCache[tableId] || {};
            corrCache[tableId][evalStr] = val;
            // end of cache value

            applyCorrResult(val);
            deferred.resolve();
        })
        .fail(function(error) {
            applyCorrResult("--");

            if (error.status === StatusT.StatusXdfDivByZero) {
                // Note: Here if we have multiple fail cells
                // Alert.error will be triggered several times
                // Altought UI still looks good
                // can also consider put the fail info in the cell
                error.error += "(Only one distinct value)";
                Alert.error("Correlation Failed", error);
                deferred.resolve();
            } else {
                deferred.reject(error);
            }
        });

        function applyCorrResult(value) {
            var isNumeric = jQuery.isNumeric(value);
            var bg;

            var html = '<span class="textOverflow tooltipOverflow" ' +
                        'title="' + value +
                        '" data-toggle="tooltip" data-placement="top" ' +
                        'data-container="body">' +
                            (isNumeric ? value.toFixed(3) : value) +
                        '</span>';
            if (isNumeric) {
                value = parseFloat(value);
                if (value > 0) {
                    bg = "rgba(66, 158, 212," + value + ")";

                    $corr.find(".aggCol:not(.labels)").eq(col)
                    .find(".aggTableField:not(.colLabel)").eq(row).html(html)
                    .css("background-color", bg);
                } else {
                    bg = "rgba(200, 200, 200," + (-1 * value) + ")";

                    $corr.find(".aggCol:not(.labels)").eq(col)
                    .find(".aggTableField:not(.colLabel)").eq(row).html(html)
                    .css("background-color", bg);
                }
            } else {
                $corr.find(".aggCol:not(.labels)").eq(col)
                    .find(".aggTableField:not(.colLabel)").eq(row).html(html);
            }

            var $container;
            colDups.forEach(function(colNum) {
                // beacause of checkDupcols(), colNum > col
                // and since col > row
                // so colNum > row
                $container = $corr.find(".aggCol:not(.labels)")
                                .eq(colNum)
                                .find(".aggTableField:not(.colLabel)")
                                .eq(row).html(html);
                if (isNumeric) {
                    $container.css("background-color", bg);
                }
            });

            var rowDups = checkDupCols(row);
            var newCol;
            var newRow;
            rowDups.forEach(function(rowNum) {
                newRow = col;
                newCol = rowNum;

                if (newCol > newRow) {
                    $container = $corr.find(".aggCol:not(.labels)")
                                    .eq(newCol)
                                    .find(".aggTableField:not(.colLabel)")
                                    .eq(newRow).html(html);

                    if (isNumeric) {
                        $container.css("background-color", bg);
                    }
                }
            });
        }

        return (deferred.promise());
    }

    function closeAggModel() {
        var fadeOutTime = gMinModeOn ? 0 : 300;

        $aggModal.hide();
        $modalBg.fadeOut(fadeOutTime, function() {
            Tips.refresh();
        });
        $aggModal.width(920).height(670);
        modalHelper.clear();
    }

    return (AggModal);
}(jQuery, {}));
