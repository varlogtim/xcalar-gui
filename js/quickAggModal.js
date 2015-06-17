window.AggModal = (function($, AggModal) {
    var $modalBackground = $("#modalBackground");
    var $aggModal        = $("#quickAggDialog");

    var $aggSelect    = $("#aggOp");
    var $aggDropdown  = $("#aggOpSelect");
    var $aggTableName = $("#aggRoundedInput");

    var aggrFunctions = ["Sum", "Avg", "Min", "Max", "Count"];
    var aggCols = [];

    AggModal.setup = function () {
        $("#closeAgg").click(function() {
            resetAggTables();
        });

        $aggSelect.click(function(event) {
            event.stopPropagation();

            $aggSelect.toggleClass("open");
            $aggDropdown.toggle();
        });

        $aggDropdown.on("click", "li", function(event) {
            var $li  = $(this);

            event.stopPropagation();

            if ($li.hasClass("inactive")) {
                return;
            }

            var aggOp = $li.text();

            $aggSelect.find(".text").text(aggOp);

            if (aggOp === "Aggregate Functions") {
                $("#mainAgg1").show();
                $("#mainAgg2").hide();
            } else if (aggOp === "Correlation Coefficient") {
                $("#mainAgg1").hide();
                $("#mainAgg2").show();
            }

            hideAggOpSelect();
        });

        $aggModal.click(hideAggOpSelect);
        $aggTableName.val("tempTableName");
        
        $aggModal.draggable({
            handle     : '.modalHeader',
            cursor     : '-webkit-grabbing',
            containment: 'window'
        });

        $aggModal.resizable({
            handles    : "e, w",
            minHeight  : 300,
            minWidth   : 580,
            containment: "document"
        });
    };

    AggModal.show = function (tableNum, type) {
        $modalBackground.on("click", hideAggOpSelect);
        $aggTableName.val(gTables[tableNum].tableName);

        $aggModal.show();
        $modalBackground.fadeIn(300, function() {
            Tips.refresh();
        });
        centerPositionElement($aggModal);

        aggColsInitialize(tableNum);
        aggTableInitialize(tableNum);
        corrTableInitialize(tableNum);

        if (type === 'aggregates') {
            $aggDropdown.find('li').filter(function() {
                return ($(this).text() === "Aggregate Functions");
            }).click();
        } else if (type === 'correlation') {
            $aggDropdown.find('li').filter(function() {
                return ($(this).text() === "Correlation Coefficient");
            }).click();
        }

        xcFunction.checkSorted(tableNum)
        .then(function(tableName) {
            calcAgg(tableNum, tableName);
            calcCorr(tableNum, tableName);
        });
    };

    function aggColsInitialize(tableNum) {
        aggCols = [];

        var tableCols = gTables[tableNum].tableCols;

        for (var i = 0, colLen = tableCols.length; i < colLen; i++) {
            // XXX Skip DATA!
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

    function aggTableInitialize(tableNum) {
        var $mainAgg1 = $("#mainAgg1");

        var colLen = aggCols.length;
        var funLen = aggrFunctions.length;

        var wholeTable = '<div class="divider"></div>';

        for (var j = 0; j < colLen; j++) {
            var cols   = aggCols[j].col;
            var colNum = aggCols[j].colNum;

            wholeTable += '<div class="aggCol">' +
                            '<div class="aggTableField colLabel">' +
                                cols.name +
                            '</div>';

            var isChildOfArray = $("#xcTable" + tableNum + " .th.col" +
                                    colNum + " .header").hasClass("childOfArray");

            for (var i = 0; i < funLen; i++) {
                wholeTable += '<div class="aggTableField">';

                if (cols.type === "integer" || cols.type === "decimal") {
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

            wholeTable += "</div>";
        }

        $mainAgg1.find(".labelContainer").html(getRowLabelHTML(aggrFunctions));
        $mainAgg1.find(".argsContainer").html(wholeTable);
    }

    function corrTableInitialize(tableNum) {
        var $mainAgg2 = $("#mainAgg2");

        var colLen = aggCols.length;

        var wholeTable = '<div class="divider"></div>';

        for (var j = 0; j < colLen; j++) {
            var cols   = aggCols[j].col;
            var colNum = aggCols[j].colNum;

            wholeTable += '<div class="aggCol">' +
                            '<div class="aggTableField colLabel">' +
                                cols.name +
                            '</div>';

            var isChildOfArray = $("#xcTable" + tableNum + " .th.col" +
                                colNum + " .header").hasClass("childOfArray");

            for (var i = 0; i < colLen; i++) {
                var vertCols = aggCols[i].col;
                wholeTable += '<div class="aggTableField aggTableFlex" ';
                var backgroundOpacity =
                                    "style='background-color:rgba(66,158,212,";
                if (i === j) {
                    wholeTable += ">1";
                } else if (i > j) {
                    wholeTable += backgroundOpacity + "0)'";
                    wholeTable += ">See other";
                } else if ((cols.type === "integer" || cols.type === "decimal")
                           && (vertCols.type === "integer" ||
                               vertCols.type === "decimal"))
                {
                    // XXX now agg on child of array is not supported
                    if (isChildOfArray) {
                        wholeTable += backgroundOpacity + "0)'";
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
                    wholeTable += backgroundOpacity + "0)'";
                    wholeTable += ">N/A";
                }
                wholeTable += "</div>";
            }
            wholeTable += "</div>";
        }

        var vertLabels = [];
        aggCols.forEach(function(colInfo) {
            vertLabels.push(colInfo.col.name);
        });

        $mainAgg2.find(".labelContainer").html(getRowLabelHTML(vertLabels));
        $mainAgg2.find(".argsContainer").html(wholeTable);
    }

    function getRowLabelHTML(operations) {
        var html =
            '<div class="aggCol">' +
                '<div class="aggTableField colLabel blankSpace"></div>';

        for (var i = 0, len = operations.length; i < len; i++) {
            html += '<div class="aggTableField rowLabel">' +
                        operations[i] +
                    '</div>';
        }
        return (html);
    }

    function hideAggOpSelect() {
        $aggDropdown.hide();
        $aggSelect.removeClass('open');
    }


    function calcCorr(tableNum, tableName) {
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

            if (cols.type === "integer" || cols.type === "decimal") {
                // for duplicated columns, no need to trigger thrift call
                if (dupCols[j]) {
                    console.log("Duplicated column", j);
                    continue;
                }

                var dups = checkDupCols(j);
                dups.forEach(function(dupColNum) {
                    dupCols[dupColNum] = true;
                });

                var $colHeader = $("#xcTable" + tableNum + " .th.col" +
                                    colNum + " .header");
                // XXX now agg on child of array is not supported
                if (!$colHeader.hasClass("childOfArray")) {
                    for (var i = 0; i < j; i++) {
                        if (i === j) {
                            // Must be 1 so skip
                            continue;
                        }
                        var vertCols = aggCols[i].col;
                        if (vertCols.type !== "integer" &&
                            vertCols.type !== "decimal")
                        {
                            continue;
                        }
                        var sub = corrString.replace(/[$]arg1/g, cols.name);
                        sub = sub.replace(/[$]arg2/g, vertCols.name);
                        // Run correlation function
                        runCorr(tableName, sub, i, j, dups);
                    }
                }
            }
        }
    }

    function calcAgg(tableNum, tableName) {
        var colLen = aggCols.length;
        var funLen = aggrFunctions.length;
        // First we need to determine if this is a dataset-table
        // or just a regular table
        var dupCols = [];

        for (var j = 0; j < colLen; j++) {
            var cols   = aggCols[j].col;
            var colNum = aggCols[j].colNum;
            // XXX Skip DATA!
            if (cols.type === "integer" || cols.type === "decimal") {
                // for duplicated columns, no need to trigger thrift call
                if (dupCols[j]) {
                    console.log("Duplicated column", j);
                    continue;
                }

                var dups = checkDupCols(j);
                dups.forEach(function(dupColNum) {
                    dupCols[dupColNum] = true;
                    if (dupColNum > j) {
                        $("#mainAgg2 .argsContainer").find(".aggCol").eq(dupColNum)
                            .find(".aggTableField:not(.colLabel)").eq(j)
                                .html("1").css("background-color", "");
                    }
                });

                var $colHeader = $("#xcTable" + tableNum + " .th.col" +
                                    colNum + " .header");
                // XXX now agg on child of array is not supported
                if (!$colHeader.hasClass("childOfArray")) {
                    for (var i = 0; i < funLen; i++) {
                        runAggregate(tableName, cols.func.args[0],
                                    aggrFunctions[i], i, j, dups);
                    }
                }
            }
        }
    }

    function checkDupCols(colNo) {
        var args = aggCols[colNo].col.func.args[0];
        var dups = [];

        for (var i = colNo + 1, len = aggCols.length; i < len; i++) {
            var cols = aggCols[i].col;
            if (cols.func.args &&
                (cols.func.args[0] === args) &&
                (cols.func.func !== "raw"))
            {
                dups.push(i);
            }
        }
        return (dups);
    }

    function runAggregate(tableName, fieldName, opString, row, col, dups) {
        XcalarAggregate(fieldName, tableName, opString)
        .done(function(value) {
            var val;

            try {
                var obj = jQuery.parseJSON(value);
                val = obj.Value;
            } catch (error) {
                console.error(error, obj);
                val = "";
            }

            $("#mainAgg1 .argsContainer").find(".aggCol").eq(col)
                .find(".aggTableField:not(.colLabel)").eq(row).html(val);

            dups.forEach(function(colNum) {
                $("#mainAgg1 .argsContainer").find(".aggCol").eq(colNum)
                    .find(".aggTableField:not(.colLabel)").eq(row).html(val);
            });
        });
    }

    function runCorr(tableName, evalStr, row, col, dups) {
        XcalarAggregateHelper(tableName, evalStr)
        .done(function(value) {
            var val;

            try {
                var obj = jQuery.parseJSON(value);
                val = obj.Value;
            } catch (error) {
                console.error(error, obj);
                val = "";
            }

            if (jQuery.isNumeric(val)) {
                val = parseFloat(val);

                $("#mainAgg2 .argsContainer").find(".aggCol").eq(col)
                .find(".aggTableField:not(.colLabel)").eq(row).html(val)
                    .css("background-color", "rgba(66, 158, 212," + val + ")");
            }

            dups.forEach(function(colNum) {
                var $container =
                    $("#mainAgg2 .argsContainer").find(".aggCol").eq(colNum)
                        .find(".aggTableField:not(.colLabel)").eq(row);

                $container.html(val);

                if (jQuery.isNumeric(val)) {
                    $container.css("background-color",
                                    "rgba(66, 158, 212," + val + ")");
                }
            });
        });
    }

    function resetAggTables() {
        $('#mainTable').off();
        $modalBackground.off("click", hideAggOpSelect);
        $aggModal.hide();
        $modalBackground.fadeOut(300, function() {
            Tips.refresh();
        });
        $aggModal.width(920).height(670);
    }

    return (AggModal);
}(jQuery, {}));
