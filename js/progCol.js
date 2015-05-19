// this module support column related functions
window.ColManager = (function($, ColManager) {
    // new ProgCol obj
    ColManager.newCol = function(options) {
        var progCol = new ProgCol();

        for (var key in options) {
            progCol[key] = options[key];
        }

        return (progCol);

        // constructor
        function ProgCol() {
            this.index     = -1;
            this.name      = "New heading";
            this.type      = "undefined";
            this.func      = {};
            this.width     = 0;
            this.userStr   = "";
            this.isNewCol    = true;
            this.textAlign = "Center";
        };
    }
    // special case, specifically for DATA col
    ColManager.newDATACol = function(index) {
        var progCol = ColManager.newCol({
            "index"   : index,
            "name"    : "DATA",
            "type"    : "object",
            "width"   : 500,    // copy from CSS
            "userStr" : "DATA = raw()",
            "func"    : {
                "func":  "raw",
                "args": []
            },
            "isNewCol"  : false
        });

        return (progCol);
    }

    ColManager.setupProgCols = function(tableNum, tableOfEntries) {
        var keyName = tableOfEntries.keysAttrHeader.name;

        gTables[tableNum].keyName = keyName;
        // We cannot rely on addCol to create a new progCol object because
        // add col relies on gTableCol entry to determine whether or not to add
        // the menus specific to the main key
        var newProgCol = ColManager.newCol({
            "index"   : 1,
            "name"    : keyName,
            "width"   : gNewCellWidth,
            "userStr" : '"' + keyName + '" = pull(' + keyName + ')',
            "func"    : {
                "func":  "pull",
                "args": [keyName]
            },
            "isNewCol"  : false
        });

        insertColHelper(0, tableNum, newProgCol);
        // is this where we add the indexed column??
        insertColHelper(1, tableNum, ColManager.newDATACol(2));
    }

    ColManager.addCol = function(colId, tableId, name, options) {
        console.log('addCol');
        // colId will be the column class ex. col2
        // tableId will be the table name  ex. xcTable0
        var tableNum    = parseInt(tableId.substring(7));
        var $table      = $('#' + tableId);
        var $tableWrap  = $("#xcTableWrap" + tableNum);
        var table       = gTables[tableNum];
        var numCols     = table.tableCols.length;
        var colIndex    = parseInt(colId.substring(3));
        var newColid    = colIndex;

        var options     = options || {};
        var width       = options.width || gNewCellWidth;
        var resize      = options.resize || false;
        var isNewCol    = options.isNewCol || false;
        var select      = options.select || false;
        var inFocus     = options.inFocus || false;
        var newProgCol  = options.progCol;

        var columnClass;
        var color;

        if (options.direction != "L") {
            newColid += 1;
        }

        if (name == null) {
            name = "";
            select = true;
            columnClass = " newColumn";
        } else if (name == table.keyName) {
            columnClass = " indexedColumn";
        } else {
            columnClass = "";
        }

        if (select) {
            color = " selectedCell";
            $('.selectedCell').removeClass('selectedCell');
        } else if (isNewCol) {
            color = " unusedCell";
        } else {
            color = "";
        }

        if (!newProgCol) {
            var name = name || "newCol";

            newProgCol = ColManager.newCol({
                "index"   : newColid,
                "name"    : name,
                "width"   : width,
                "userStr" : '"' + name + '" = ',
                "isNewCol"  : isNewCol
            });

            insertColHelper(newColid - 1, tableNum, newProgCol);
        }
        // change table class before insert a new column
        for (var i = numCols; i >= newColid; i--) {
            $tableWrap.find('.col' + i)
                      .removeClass('col' + i)
                      .addClass('col' + (i + 1));
        }
        // insert new th column
        var options = {name: name, width: width};
        var columnHeadHTML = generateColumnHeadHTML(columnClass, color,
                                                    newColid, options);
        $tableWrap.find('.th.col' + (newColid - 1)).after(columnHeadHTML);

        // get the first row in UI and start to add td to each row
        var numRow        = $table.find("tbody tr").length;
        var idOfFirstRow  = $table.find("tbody tr:first").attr("class");
        var startingIndex = idOfFirstRow ? 
                                parseInt(idOfFirstRow.substring(3)) : 1;

        if (columnClass != " indexedColumn") {
            columnClass = ""; // we don't need to add class to td otherwise
        }

        var newCellHTML = '<td '+ 'class="' + color + ' ' + columnClass + 
                          ' col' + newColid + '">' + 
                            '&nbsp;' + 
                          '</td>';

        for (var i = startingIndex; i < startingIndex + numRow; i++) {
            $table.find(".row" + i + " .col" + (newColid - 1))
                  .after(newCellHTML);
        }

        if (inFocus) {
            $table.find('tr:first .editableHead.col' + newColid).focus();
        }

        updateTableHeader(tableNum);
        RightSideBar.updateTableInfo(table);
        adjustColGrabHeight(tableNum);
        matchHeaderSizes(newColid, $table);
    }

    ColManager.delCol = function(colNum, tableNum) {
        var table     = gTables[tableNum];
        var tableName = table.frontTableName;
        var colName   = table.tableCols[colNum - 1].name;

        delColHelper(colNum, tableNum);
        // add SQL
        SQL.add("Delete Column", {
            "operation": "delCol",
            "tableName": tableName,
            "colName"  : colName,
            "colIndex" : colNum
        });
    }

    ColManager.reorderCol = function(tableNum, oldIndex, newIndex) {
        var progCol  = removeColHelper(oldIndex, tableNum);

        insertColHelper(newIndex, tableNum, progCol);
        progCol.index = newIndex + 1;
    }

    ColManager.execCol = function(progCol, tableNum, args) {
        var deferred = jQuery.Deferred();

        switch(progCol.func.func) {
            case ("pull"):
                if (!parsePullColArgs(progCol)) {
                    var error = "Arg parsing failed";

                    console.error("Arg parsing failed");
                    deferred.reject(error);
                    break;
                }

                var startIndex;
                var numberOfRows;

                if (args) {
                    if (args.index) {
                        progCol.index = args.index;
                    }
                    if (args.startIndex) {
                        startIndex = args.startIndex;
                    }
                    if (args.numberOfRows) {
                        numberOfRows = args.numberOfRows;
                    }
                }
                if (progCol.isNewCol) {
                    progCol.isNewCol = false;
                }

                pullColHelper(progCol.func.args[0], progCol.index,
                              tableNum, startIndex, numberOfRows);

                deferred.resolve();
                break;
            case ("raw"):
                console.log("Raw data");
                deferred.resolve();
                break;
            case ("map"):
                var userStr   = progCol.userStr;
                var mapString = userStr.substring(userStr.indexOf("map",
                                                  userStr.indexOf("="))
                                                  + 4, userStr.length - 1);
                var fieldName = userStr.substring(0, userStr.indexOf("="));

                mapString = jQuery.trim(mapString);
                fieldName = jQuery.trim(fieldName);
                fieldName = fieldName.replace(/\"/g, "");
                fieldName = jQuery.trim(fieldName);

                progCol.func.func    = "pull";
                progCol.func.args[0] = fieldName;
                progCol.func.args.splice(1, progCol.func.args.length - 1);
                progCol.isNewCol       = false;
                // progCol.userStr = '"' + progCol.name + '"' + " = pull(" +
                //                   fieldName + ")";

                xcFunction.map(progCol.index, tableNum, fieldName, mapString)
                .then(deferred.resolve)
                .fail(function(error) {
                    console.log("execCol fails!");
                    deferred.reject(error);
                });
                break;
            case (undefined):
                console.log("Blank col?");
                deferred.resolve();
                break;
            default:
                console.log("No such function yet!", progCol);
                deferred.resolve();
                break;
        }

        return (deferred.promise());
    }

    ColManager.checkColDup = function ($inputs, $input) {
        // $inputs are the inputs to check names against
        // $input is the target input
        var name        = jQuery.trim($input.val());
        var isDuplicate = false;
        var title       = "Name already exists, please use another name.";

        $inputs.each(function() {
            if (isDuplicate) {
                return;
            }

            var $checkedInput = $(this);

            if (name === $checkedInput.val() && 
                $checkedInput[0] != $input[0]) {
                isDuplicate = true;
            }
        });

        $(".tooltip").hide();
        // temporarily use, will be removed when backend allow name with space
        if (/ +/.test(name) === true) {
            title = "Invalid name, cannot contain spaces between characters.";
            isDuplicate = true;
        } else if (name == 'DATA') {
            title = "The name \'DATA\' is reserved.";
            isDuplicate = true;
        }

        if (isDuplicate) {
            var container      = $input.closest('.mainPanel').attr('id');
            var $toolTipTarget = $input.parent();

            $toolTipTarget.tooltip({
                "title"    : title,
                "placement": "top",
                "trigger"  : "manual",
                "container": "#" + container,
                "template" : '<div class="tooltip error" role="tooltip">' + 
                                '<div class="tooltip-arrow"></div>' + 
                                '<div class="tooltip-inner"></div>' + 
                             '</div>'
            });

            $toolTipTarget.tooltip('show');
            $input.click(hideTooltip);

            var timeout = setTimeout(function() {
                hideTooltip();
            }, 5000);
        }

        function hideTooltip() {
            $toolTipTarget.tooltip('destroy');
            $input.off('click', hideTooltip);
            clearTimeout(timeout);
        }

        return (isDuplicate);
    }

    ColManager.delDupCols = function(index, tableNum, forwardCheck) {
        var index   = index - 1;
        var columns = gTables[tableNum].tableCols;
        var numCols = columns.length;
        var args    = columns[index].func.args;
        var start   = forwardCheck ? index : 0;
        var operation;

        if (args) {
            operation = args[0];
        }

        for (var i = start; i < numCols; i++) {
            if (i == index) {
                continue;
            }
            if (columns[i].func.args) {
                if (columns[i].func.args[0] == args
                    && columns[i].func.func != "raw") {

                    delColandAdjustLoop();
                }
            } else if (operation == undefined) {
                delColandAdjustLoop();
            }
        }

        function delColandAdjustLoop() {
            delColHelper((i+1), tableNum);
            if (i < index) {
                index--;
            }
            numCols--;
            i--;
        }
    }

    ColManager.hideCol = function(colNum, tableNum) {
        var $table   = $("#xcTable" + tableNum);
        var $th      = $table.find(".th.col" + colNum);
        var $thInput = $th.find("input");
        var $cols    = $table.find(".col" + colNum);

        $th.width(10);
        // data column should have more padding
        // and class for tbody is different
        if($thInput.hasClass("dataCol")) {
            // the padding pixel may be chosen again
            $thInput.css("padding-left","10px");
            $cols.find(".elementText").css("padding-left","15px");
        } else {
            $thInput.css("padding-left","6px");
            $cols.find(".addedBarText").css("padding-left","10px");
        }

        $table.find("td.col" + colNum).width(10);
        $cols.find(".dropdownBox").css("right","-6px");

        matchHeaderSizes(colNum, $table);
    }

    ColManager.unhideCol = function(colNum, tableNum, options) {
        var $table   = $("#xcTable" + tableNum);
        var $th      = $table.find(".th.col" + colNum);
        var $thInput = $th.find("input");
        var $cols    = $table.find(".col" + colNum);

        if (options && options.autoResize) {
            autosizeCol($th, {"resizeFirstRow": true, 
                              "includeHeader" : true});
        }

        if($thInput.hasClass("dataCol"))  {
            $cols.find(".elementText").css("padding-left", "0px");
        } else {
            $cols.find(".addedBarText").css("padding-left", "0px");
        }

        $thInput.css("padding-left", "4px");
        $cols.find(".dropdownBox").css("right", "-3px");

    }

    ColManager.textAlign = function(colNum, tableNum, alignment) {
        if (alignment.indexOf("leftAlign") > -1) {
            alignment = "Left";
        } else if (alignment.indexOf("rightAlign") > -1) {
            alignment = "Right";
        } else {
            alignment = "Center";
        }

        gTables[tableNum].tableCols[colNum - 1].textAlign = alignment;

        $("#xcTable" + tableNum).find('td.col' + colNum)
                                .removeClass('textAlignLeft')
                                .removeClass('textAlignRight')
                                .removeClass('textAlignCenter')
                                .addClass('textAlign' + alignment);
    }


    ColManager.pullAllCols = function(startIndex, jsonData, dataIndex, 
                                      tableNum, direction) 
    {
        var table          = gTables[tableNum];
        var tableCols      = table.tableCols;
        var indexedColNums = [];
        var numCols        = tableCols.length;
        var numRows        = jsonData.length;
        var nestedVals     = [];
        var tBodyHTML      = "";
        var startIndex     = startIndex || 0;
        var columnTypes    = [];
        var childArrayVals = [];

        for (var i = 0; i < numCols; i++) {
            if ((i != dataIndex) && 
                tableCols[i].func.args && 
                tableCols[i].func.args!= "") 
            {
                var nested = tableCols[i].func.args[0]
                                .replace(/\]/g, "")
                                .replace(/\[/g, ".")
                                .match(/([^\\.]|\\.)+/g);

                for (var j = 0; j < nested.length; j++) {
                    nested[j] = nested[j].replace(/\\./g, "\.");
                }

                nestedVals.push(nested);
                // get the column number of the column the table was indexed on
                if (tableCols[i].func.args && 
                    (tableCols[i].func.args[0] == table.keyName)) {
                    indexedColNums.push(i);
                }
            } else { // this is the data Column
                nestedVals.push([""]);
            }
            // track column type
            columnTypes.push(undefined);
            childArrayVals.push(false);
        }
        // loop through table tr and start building html
        for (var row = 0; row < numRows; row++) {
            var dataValue;

            if (jsonData[row] == "") {
                console.log('No DATA found in this row??');
                dataValue = "";
            } else {
                try {
                    dataValue = jQuery.parseJSON(jsonData[row]);
                } catch(err) {
                    // XXX may add extra handlers to handle the error
                    console.error(err, jsonData[row]);
                    dataValue = "";
                }
            }

            var rowNum = row + startIndex;
            tBodyHTML += '<tr class="row' + (rowNum) + '">';

            if (gTables[tableNum].bookmarks.indexOf(rowNum) > -1) {
                tBodyHTML += '<td align="center" class="col0 rowBookmarked">';
            } else {
                tBodyHTML += '<td align="center" class="col0">';
            }

            tBodyHTML += '<div class="idWrap">'+
                            '<span class="idSpan" '+
                                'data-toggle="tooltip" '+
                                'data-placement="bottom" '+
                                'data-container="body" '+
                                'title="click to add bookmark">'+
                                    (rowNum + 1) +
                            '</span>'+
                            '<div class="rowGrab"></div>'+
                          '</div></td>';

            // loop through table tr's tds
            for (var col = 0; col < numCols; col++) {
                var nested       = nestedVals[col];
                var tdValue      = dataValue;
                var childOfArray = childArrayVals[col];

                if (col != dataIndex) {
                    if (nested == undefined) {
                        console.log('Error this value should not be empty');
                    }

                    var nestedLength = nested.length;
                    for (var i = 0; i < nestedLength; i++) {
                        if (jQuery.isEmptyObject(tdValue) || 
                            tdValue[nested[i]] == undefined) 
                        {
                            tdValue = "";
                            break;
                        }

                        tdValue = tdValue[nested[i]];

                        if (i < nestedLength - 1 && !childOfArray) {
                            if (typeof tdValue == "object" && 
                                (tdValue instanceof Array)) 
                            {
                                childArrayVals[col] = true;
                            }
                        }
                    }
                    // XXX giving classes to table cells may
                    // actually be done later
                    var indexedColumnClass = "";
                    if (indexedColNums.indexOf(col) > -1) {
                        indexedColumnClass = " indexedColumn";
                    }

                    var textAlignment = "";
                    if (tableCols[col].textAlign == "Left") {
                        textAlignment = "textAlignLeft";
                    } else if (tableCols[col].textAlign == "Right") {
                        textAlignment = "textAlignRight";
                    }

                    tBodyHTML += '<td class="' + indexedColumnClass + ' ' + 
                                    textAlignment + ' col' + (col + 1) + '">' + 
                                    '<div class="addedBarTextWrap">' +
                                        '<div class="addedBarText">';
                } else {
                    // make data td;
                    tdValue = jsonData[row];
                    tBodyHTML += 
                        '<td class="col' + (col + 1) + ' jsonElement">' + 
                            '<div data-toggle="tooltip" ' + 
                                'data-placement="bottom" ' + 
                                'data-container="body" ' + 
                                'title="double-click to view" ' + 
                                'class="elementTextWrap">' + 
                                '<div class="elementText">';
                }

                //define type of the column
                if (tdValue !== "" && columnTypes[col] !== "mixed") {
                    var type = typeof tdValue;
                    if (type == "object" && (tdValue instanceof Array)) {
                        type = "array";
                    }

                    if (columnTypes[col] == undefined) {
                        columnTypes[col] = type;
                    } else if (columnTypes[col] !== type) {
                        columnTypes[col] = "mixed";
                    }
                }

                tdValue = xcHelper.parseJsonValue(tdValue);
                tBodyHTML += tdValue + '</div></div></td>';
            }
            tBodyHTML += '</tr>';
        }

        var $tBody = $(tBodyHTML);

        if (direction == 1) {
            $('#xcTable' + tableNum).find('tbody').prepend($tBody);
        } else {
            $('#xcTable' + tableNum).find('tbody').append($tBody);
        }

        // assign column type class to header menus
        var $table = $('#xcTable' + tableNum);
        for (var i = 0; i < numCols; i++) {
            var $currentTh = $table.find('th.col' + (i + 1));
            var $header = $currentTh.find('> .header');
            var type = columnTypes[i];
            if (type == undefined) {
                type = "undefined";
            }
            // XXX Fix me if DATA column should not be type object
            if (gTables[tableNum].tableCols[i].name === "DATA") {
                type = "object";
            }
            $header.removeClass("type-mixed")
                    .removeClass("type-string")
                    .removeClass("type-number")
                    .removeClass("type-object")
                    .removeClass("type-array")
                    .removeClass("type-undefined")
                    .removeClass("type-boolean")
                    .removeClass("recordNum")
                    .removeClass("childOfArray")
                    .addClass('type-' + type);
            gTables[tableNum].tableCols[i].type = type;
            if (tableCols[i].name == "recordNum") {
                $header.addClass('recordNum');
            }
            if ($currentTh.hasClass('selectedCell')) {
                highlightColumn($currentTh);
            }
            if (childArrayVals[i]) {
                $header.addClass('childOfArray');
            }
        }

        return ($tBody);
    }

    function pullColHelper(key, newColid, tableNum, startIndex, numberOfRows) {
        if (key == "" || key == undefined || /\.([0-9])/.test(key)) {
            //check for dot followed by number (invalid)
            return;
        }

        var $table   = $("#xcTable" + tableNum);
        var $dataCol = $table.find("tr:first th").filter(function() {
                return $(this).find("input").val() == "DATA";
        });

        var colid         = xcHelper.parseColNum($dataCol);
        var numRow        = -1;
        var startingIndex = -1;

        if (!startIndex) {
            startingIndex = parseInt($table.find("tbody tr:first")
                                           .attr('class').substring(3));
            numRow = $table.find("tbody tr").length;
        } else {
            startingIndex = startIndex;
            numRow = numberOfRows || gNumEntriesPerPage;
        }

        var nested = key.trim()
                        .replace(/\]/g, "")
                        .replace(/\[/g, ".")
                        .match(/([^\\.]|\\.)+/g);

       // track column type
        var columnType = undefined;

        for (var i = 0; i<nested.length; i++) {
            nested[i] = nested[i].replace(/\\./g, "\.");
        }

        var childOfArray = false;

        for (var i = startingIndex; i < numRow + startingIndex; i++) {
            var jsonStr = $table.find('.row'+i+' .col'+colid+' .elementText')
                                .text();
            var value;

            if (jsonStr == "") {
                console.log("Error: pullCol() jsonStr is empty");
                value = "";
            } else {
                try {
                    value = jQuery.parseJSON(jsonStr);
                } catch (err) {
                    // XXX may need extra handlers to handle the error
                    console.error(err, jsonStr);
                    value = "";
                }
            }

            for (var j = 0; j < nested.length; j++) {
                if (jQuery.isEmptyObject(value) || 
                    value[nested[j]] == undefined) 
                {
                    value = "";
                    break;
                }
                value = value[nested[j]];

                if (j < nested.length - 1 && !childOfArray) {
                    if (typeof value == "object" && (value instanceof Array)) {
                        childOfArray = true;
                    }
                }
            }
            //define type of the column
            if (value !== "" && columnType !== "mixed") {
                var type = typeof value;

                if (type == "object" && (value instanceof Array)) {
                    type = "array";
                }
                if (columnType == undefined) {
                    columnType = type;
                } else if (columnType !== type) {
                    columnType = "mixed";
                }
            }
            value = xcHelper.parseJsonValue(value);
            value = '<div class="addedBarTextWrap">' + 
                        '<div class="addedBarText">' + value + '</div>' + 
                    '</div>';
            $table.find('.row'+i+' .col'+newColid).html(value);
        }
        if (columnType == undefined) {
            gTables[tableNum].tableCols[newColid - 1].type = "undefined";
        } else {
            gTables[tableNum].tableCols[newColid - 1].type = columnType;
        }

        // add class to th
        var $header = $table.find('th.col' + newColid + ' div.header');

        $header.removeClass("type-mixed")
               .removeClass("type-string")
               .removeClass("type-number")
               .removeClass("type-object")
               .removeClass("type-array")
               .removeClass("type-boolean")
               .removeClass("type-undefined")
               .removeClass("recordNum")
               .removeClass("childOfArray")
               .addClass('type-' + columnType);

        if (key == "recordNum") {
            $header.addClass('recordNum');
        }
        if (childOfArray) {
            $header.addClass('childOfArray');
        }
        $table.find('th.col' + newColid).removeClass('newColumn');
    }

    function insertColHelper(index, tableNum, progCol) {
         // tableCols is an array of ProgCol obj
        var tableCols = gTables[tableNum].tableCols;

        for (var i = tableCols.length - 1; i >= index; i--) {
            tableCols[i].index += 1;
            tableCols[i + 1] = tableCols[i];
        }

        tableCols[index] = progCol;
    }

    function removeColHelper(index, tableNum) {
        var tableCols = gTables[tableNum].tableCols;
        var removed   = tableCols[index];

        for (var i = index + 1; i < tableCols.length; i++) {
            tableCols[i].index -= 1;
        }

        tableCols.splice(index, 1);

        return (removed);
    }

    function delColHelper(colNum, tableNum) {
        var table      = gTables[tableNum];
        var numCols    = table.tableCols.length;
        var $tableWrap = $("#xcTableWrap" + tableNum);

        $tableWrap.find(".col" + colNum).remove();

        removeColHelper(colNum - 1, tableNum);

        updateTableHeader(tableNum);
        RightSideBar.updateTableInfo(table);

        for (var i = colNum + 1; i <= numCols; i++) {
            $tableWrap.find(".col" + i)
                      .removeClass("col" + i)
                      .addClass("col" + (i - 1));
        }

        gRescolDelWidth(colNum, tableNum);
    }

    function parsePullColArgs(progCol) {
        if (progCol.func.func != "pull") {
            console.log("Wrong function!");
            return (false);
        }
        if (progCol.func.args.length != 1) {
            console.log("Wrong number of arguments!");
            return (false);
        }
        return (true);
    }

    return (ColManager);
}(jQuery, {}));
