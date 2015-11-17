window.MultiCastModal = (function($, MultiCastModal) {
    var $modal = $("#multiCastModal");
    var $modalBg = $("#modalBackground");
    var $table = $("#multiCast-table");
    var $resultSection = $("#multiCast-result");
    var $castBtn = $("#multiCast-cast");

    var minHeight = 500;
    var minWidth  = 600;

    var curTableId;
    var newColTypes = [];
    var suggColFlags = [];
    var colNames = [];
    var colTypes = [];
    var recTypes = [];

    var modalHelper = new xcHelper.Modal($modal, {
        "minHeight": minHeight,
        "minWidth" : minWidth
    });

    MultiCastModal.setup = function() {
        $modal.resizable({
            handles    : "n, e, s, w, se",
            minHeight  : minHeight,
            minWidth   : minWidth,
            maxHeight  : 782,
            containment: "document"
        });

        $modal.draggable({
            "handle": ".modalHeader",
            "cursor": "-webkit-grabbing"
        });

        $modal.on("click", ".cancel, .close", function() {
            closeMultiCastModal();
        });

        $modal.on("click", ".confirm", function() {
            var len = newColTypes.length;
            var colTypeInfos = [];

            for (var colNum = 1; colNum < len; colNum++) {
                var newType = newColTypes[colNum];

                if (newType == null || newType === colTypes[colNum]) {
                    continue;
                }

                colTypeInfos.push({
                    "colNum": colNum,
                    "type"  : newType
                });
            }

            if (colTypeInfos.length > 0) {
                ColManager.changeType(colTypeInfos, curTableId);
            }
            closeMultiCastModal();
        });

        $("#multiCast-clear").click(function() {
            var $ths = $table.find("th.colSelected");
            deSelectCols($ths);
        });

        $castBtn.click(function() {
            smartSuggest();
        });

        $modal.on("click", ".row", function() {
            var colNum = $(this).data("col");
            if (colNum != null) {
                scrollToColumn($table.find("th.col" + colNum));
            }
        });

        $modal.on("mouseenter", ".tooltipOverflow", function(){
            xcHelper.autoTooltip(this);
        });
    };

    MultiCastModal.show = function(tableId) {
        curTableId = tableId;
        modalHelper.setup($modal);

        if (gMinModeOn) {
            $modalBg.show();
            $modal.show();
        } else {
            $modalBg.fadeIn(300, function() {
                $modal.fadeIn(180);
            });
        }

        buildTable(tableId);
        smartSuggest();

        var $lists = $table.find(".header:not(.unselectable) .dropDownList");

        xcHelper.dropdownList($lists, {
            "onSelect": function($li) {
                var $list  = $li.closest(".list");
                var $input = $list.siblings(".text");
                var type   = $li.text();

                $input.val(type);
                selectCols($list.closest("th"));
            },
            "container": "#multiCastModal"
        });

        $(document).on("mousedown.multiCastModal", function() {
            xcHelper.hideDropdowns($modal);
        });
    };

    function closeMultiCastModal() {
        var fadeOutTime = gMinModeOn ? 0 : 300;
        modalHelper.clear();

        $modal.hide();
        $modalBg.fadeOut(fadeOutTime);
        $table.html("");
        $resultSection.html("");

        $(document).off(".multiCastModal");

        newColTypes = [];
        suggColFlags = [];
        colNames = [];
        colTypes = [];
        recTypes = [];
        curTableId = null;
    }

    function selectCols($ths) {
        var colNum;
        var $th;
        var newColType;
        var $input;

        $ths.each(function() {
            $th = $(this);
            colNum = parseInt($th.data("col"));

            $input = $th.find(".dropDownList input");
            newColType = $input.val();

            if (newColType === colTypes[colNum]) {
                newColTypes[colNum] = null;
                $table.find(".col" + colNum).removeClass("colSelected");
                $input.addClass("initialType");
            } else {
                newColTypes[colNum] = newColType;
                $table.find(".col" + colNum).addClass("colSelected");
                $input.removeClass("initialType");
            }

            suggColFlags[colNum] = false;
        });

        updateTypeInfo();
    }

    function deSelectCols($ths) {
        var colNum;
        var $th;

        $ths.each(function() {
            $th = $(this);
            colNum = parseInt($th.data("col"));
            $table.find(".col" + colNum).removeClass("colSelected");
            $th.find(".dropDownList input").val(colTypes[colNum])
                                        .addClass("initialType");
            newColTypes[colNum] = null;
        });

        updateTypeInfo();
    }

    function smartSuggest() {
        var newType;
        var $th;
        var $input;

        for (var colNum = 1, len = recTypes.length; colNum < len; colNum++) {
            newType = recTypes[colNum];
            if (newType == null) {
                continue; // unselectable case
            }

            $th = $table.find("th.col" + colNum);
            $input = $th.find(".dropDownList input").val(newType);

            if (newType === colTypes[colNum]) {
                $table.find(".col" + colNum).removeClass("colSelected");
                $input.addClass("initialType");
                newColTypes[colNum] = null;
                suggColFlags[colNum] = false;
            } else {
                $table.find(".col" + colNum).addClass("colSelected");
                $input.removeClass("initialType");
                newColTypes[colNum] = newType;
                suggColFlags[colNum] = true;
            }
        }

        updateTypeInfo(true);
    }

    function updateTypeInfo(isFromSmartSugg) {
        var html = "";
        var len = newColTypes.length;
        var count = 0;
        var colName;
        var oldType;
        var newType;
        var newTypeClass;

        for (var colNum = 1; colNum < len; colNum++) {
            newType = newColTypes[colNum];
            if (newType == null) {
                continue;
            }

            newTypeClass = "newType";

            if (suggColFlags[colNum]) {
                newTypeClass += " highlight";
                $table.find("th.col" + colNum).addClass("highlight")
                        .find(".text").val(newType);
            } else {
                $table.find("th.col" + colNum).removeClass("highlight");
            }

            colName = colNames[colNum];
            oldType = colTypes[colNum];
            html += '<div class="row" data-col="' + colNum + '">' +
                        '<div title="' + colName + '" ' +
                        '" data-toggle="tooltip" data-placement="top" ' +
                        'data-container="body" ' +
                        'class="colName tooltipOverflow">' +
                            colName +
                        '</div>' +
                        '<div class="oldType">' +
                            oldType +
                        '</div>' +
                        '<div class="' + newTypeClass + '">' +
                            newType +
                        '</div>' +
                    '</div>';
            count++;
        }

        if (count === 0) {
            html += '<div class="instruction">';
            if (isFromSmartSugg) {
                html += 'No smart cast recommendation,<br>';
            }

            html += 'please select columns you want to cast.' +
                    '</div>';
        }

        var $label = $modal.find(".resultContainer .title .label");
        if (isFromSmartSugg) {
            $label.text("Smart Cast Result");
        } else {
            $label.text("Cast Result");
        }

        $resultSection.html(html);
    }

    function suggestType($tbody, colNum, type) {
        if (type === "float" || type === "boolean") {
            return type;
        }

        var $tds = $tbody.find("td.col" + colNum + "");
        var isNumber;
        var isInteger;
        var isFloat;
        var isOnly10;
        var isBoolean;

        $tds.each(function() {
            var text = $(this).text().trim().toLowerCase();
            if (text === "") {
                // skip this one
                return true;
            }

            if (isNumber == null || isNumber) {
                var num = Number(text);
                if (isNaN(num)) {
                    isNumber = false;
                    isInteger = false;
                    isFloat = false;
                } else {
                    isNumber = true;
                    if ((isInteger == null || isInteger) &&
                        Number.isInteger(num))
                    {
                        isInteger = true;
                        isFloat = false;

                        if ((isOnly10 == null || isOnly10) &&
                            (num === 0 || num === 1))
                        {
                            isOnly10 = true;
                        } else {
                            isOnly10 = false;
                        }
                    } else {
                        isFloat = true;
                        isInteger = false;
                    }
                }
            } else if (isBoolean == null || isBoolean) {
                isBoolean = (text === "true" || text === "false" || text === "t" || text === "f");
            }
        });

        if (type === "integer" || isInteger) {
            if (isOnly10) {
                return "boolean";
            }
            return "integer";
        } else if (isFloat) {
            return "float";
        } else if (isBoolean) {
            return "boolean";
        }

        return "string";
    }

    function scrollToColumn($th) {
        if (!$th || $th.length === 0) {
            return;
        }
        var $tableArea = $th.closest('.tableSection');
        $tableArea.scrollLeft(0);
        var tableOffset = $tableArea.offset().left;
        var tableAreaWidth = $tableArea.width();
        var thWidth = $th.width();
        var thOffset = $th.offset().left;
        var position = (thOffset - tableOffset) - (tableAreaWidth * 0.5) +
                           (thWidth * 0.5);
        $tableArea.scrollLeft(position);

        // use .colPading because .columnTab already have tooltip
        var $colPadding = $th.find(".colPadding");
        $colPadding.tooltip({
            "title"    : "Focused Column",
            "placement": "top",
            "animation": "true",
            "container": "#multiCastModal",
            "trigger"  : "manual"
        });

        $colPadding.tooltip("show");
        setTimeout(function() {
            $colPadding.tooltip("destroy");
        }, 1000);
    }

    function buildTable(tableId) {
        var validTyps = ["string", "integer", "float"];
        var tableCols = gTables[tableId].tableCols;
        var list;
        var html = '<thead>' +
                        '<tr>';

        var $tbody = $("#xcTable-" + tableId).find("tbody").clone(true);
        $tbody.find("tr:gt(17)").remove();
        $tbody.find(".col0").remove();
        $tbody.find(".jsonElement").remove();
        $tbody.find(".indexedColumn").removeClass('indexedColumn');
        $tbody.find(".addedBarTextWrap.clickable").removeClass("clickable");

        for (var i = 0, len = tableCols.length; i < len; i++) {
            var colName = tableCols[i].name;


            if (colName === "DATA") {
                continue;
            }

            var type    = tableCols[i].type;
            var colNum  = i + 1;
            var thClass = "col" + colNum + " type-" + type;

            colNames[colNum] = colName; // cache colNames
            colTypes[colNum] = type;    // cache colTypes

            if (type === "object" ||
                type === "array" ||
                type === "undefined")
            {
                thClass += " unselectable";
                recTypes[colNum] = null;
            } else {
                recTypes[colNum] = suggestType($tbody, colNum, type);
            }

            list = "";
            for (var j = 0; j < validTyps.length; j++) {
                if (validTyps[j] === type) {
                    list += '<li class="initialType">';
                } else {
                    list += '<li>';
                }

                list += validTyps[j] + '</li>';
            }

            html += '<th class="' + thClass + '" data-col="' + colNum + '">' +
                        '<div class="header">' +
                            '<div class="dropDownList">' +
                                '<input class="text no-selection initialType" ' +
                                'value="' + type + '" disabled>' +
                                '<div class="iconWrapper dropdown">' +
                                    '<span class="icon"></span>' +
                                '</div>' +
                                '<ul class="list" data-col="' + colNum + '">' +
                                    list +
                                '</ul>' +
                            '</div>' +
                            '<div class="colPadding"></div>' +
                            '<div title="' + colName +
                            '" data-toggle="tooltip" data-placement="top" ' +
                            'data-container="body" ' +
                            'class="columnTab textOverflow tooltipOverflow">' +
                                colName +
                            '</div>' +
                        '</div>' +
                    '</th>';
        }

        html += '</tr></thead>';
        html += $tbody.html();

        $table.html(html);
    }

    return (MultiCastModal);
}(jQuery, {}));
