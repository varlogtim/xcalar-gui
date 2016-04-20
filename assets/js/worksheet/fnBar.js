window.FnBar = (function(FnBar, $) {
    var $functionArea; // $("#functionArea");
    var $fnBar;        // $("#fnBar");

    var $lastColInput = null;
    var searchHelper;

    FnBar.setup = function() {
        $functionArea = $("#functionArea");
        $fnBar = $("#fnBar");

        setupSearchHelper();
        var initialTableId; //used to track table that was initially active
        // when user started searching

        $fnBar.on({
            "input": function() {
                var val = $(this).val();
                var trimmedVal = val.trim();
                if (trimmedVal.indexOf('=') !== 0) {
                    $functionArea.addClass('searching');
                    var args = {
                        "value"         : trimmedVal,
                        "searchBar"     : searchHelper,
                        "initialTableId": initialTableId
                    };
                    ColManager.execCol("search", null, null, null, args);
                } else {
                    $functionArea.removeClass('searching');
                }
            },
            "keypress": function(event) {
                if (event.which === 40) {
                    /** Jerene WIP here
                    setTimeout(function() {
                        var e = jQuery.Event('keypress');
                        e.which = 41;
                        $fnBar.trigger(e);
                    }, 0);
                    */
                } else if (event.which === 41) {
                    // we can decide whether the way sublime handles it is good
                } else if (event.which === keyCode.Enter) {
                    if (matchBracket()) {
                        functionBarEnter();
                    } else {
                        var savedStr = $fnBar.val();
                        var savedColInput = $lastColInput;
                        Alert.show({
                            "title"  : AlertTStr.BracketsMis,
                            "msg"    : ErrTStr.BracketsMis,
                            "isAlert": true,
                            "cancel" : function() {
                                savedColInput.trigger({
                                    type: "mousedown",
                                    which: 1
                                });
                                $fnBar.removeAttr("disabled");
                                $fnBar.val(savedStr);
                                $fnBar.focus();
                            }
                        });
                        $fnBar.val(savedStr);
                        $fnBar.prop("disabled", "true");
                    }
                }
            },
            "mousedown": function() {
                $(this).addClass("inFocus");
                $fnBar.attr('placeholder', WSTStr.SearchTableAndColumn);
            },
            "focus": function() {
                initialTableId = gActiveTableId;
            },
            "blur": function() {
                $(this).removeClass("inFocus");
                $fnBar.attr('placeholder', "");
                searchHelper.clearSearch(function() {
                    $functionArea.removeClass('searching');
                });
            }
        });
    };

    FnBar.focusOnCol = function($colInput, tableId, colNum, forceFocus) {
        if (!forceFocus && $lastColInput != null &&
            $colInput.get(0) === $lastColInput.get(0))
        {
            // the function bar origin hasn't changed so just return
            // and do not rehighlight or update any text
            return;
        }

        $lastColInput = $colInput;
        var progCol = gTables[tableId].tableCols[colNum - 1];
        if ($colInput.parent().hasClass("editable")) {
            if (!progCol.isNewCol) {
                throw "Error Case, only new column can be editable";
            }

            $fnBar.val(FnBarTStr.NewCol).addClass("disabled")
                                        .removeClass('active');
        } else {
            var userStr = progCol.userStr;
            userStr = userStr.substring(userStr.indexOf('='));
            $fnBar.val(userStr).addClass('active').removeClass('disabled');
        }
    };

    FnBar.clear = function(noSave) {
        // var val = $fnBar.val();
        // var trimmedVal = val.trim();
        if (!noSave) {
            saveInput();
        } else {
            $fnBar.removeClass('disabled');
        }
        $lastColInput = null;
        $fnBar.val("").removeClass("active");
    };

    function saveInput() {
        if (!$lastColInput || !$lastColInput.length) {
            return;
        }
        var fnBarVal = $fnBar.val().trim();
        if (fnBarVal.indexOf("=") === 0) {
            fnBarVal = fnBarVal.substring(1);
        } else {
            return;
        }
        fnBarVal = fnBarVal.trim();
        var $colInput = $lastColInput;
        var $table   = $colInput.closest('.dataTable');
        var tableId  = xcHelper.parseTableId($table);
        var colNum   = xcHelper.parseColNum($colInput);
        var table    = gTables[tableId];
        var tableCol = table.tableCols[colNum - 1];

        tableCol.userStr = "\"" + tableCol.name + "\"" + " = " +
                            fnBarVal;
    }

    function setupSearchHelper() {
        searchHelper = new SearchBar($functionArea, {
            "removeSelected": function() {
                $('.xcTable:visible').find('.selectedCell')
                                     .removeClass('selectedCell');
            },
            "highlightSelected": function($match) {
                if ($match.is('th')) {
                    highlightColumn($match);
                    $('#mainFrame').find('.tblTitleSelected')
                                   .removeClass('tblTitleSelected');
                    $('.dagWrap.selected').removeClass('selected')
                                          .addClass('notSelected');
                    RowScroller.empty();
                } else if ($match.is('.tableTitle')) {
                    var tableId = $match.closest('.xcTableWrap').data('id');
                    focusTable(tableId, true);
                }
            },
            "scrollMatchIntoView": function($match) {
                var $mainFrame = $('#mainFrame');
                var mainFrameWidth = $mainFrame.width();
                var matchOffsetLeft = $match.offset().left;
                var scrollLeft = $mainFrame.scrollLeft();
                var matchWidth = $match.width();
                if (matchOffsetLeft > mainFrameWidth - matchWidth) {
                    $mainFrame.scrollLeft(matchOffsetLeft + scrollLeft -
                                        ((mainFrameWidth - matchWidth) / 2));
                } else if (matchOffsetLeft < 25) {
                    $mainFrame.scrollLeft(matchOffsetLeft + scrollLeft -
                                        ((mainFrameWidth - matchWidth) / 2));
                }
            },
            "ignore": "="
        });

        searchHelper.setup();
    }

    function matchBracket() {
        var fnBarVal = $fnBar.val();
        var numOpens = 0;

        var inQuotes = false;
        var escaped = false;
        for (var i = 0; i<fnBarVal.length; i++) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (inQuotes) {
                if (fnBarVal[i] === '"') {
                    inQuotes = false;
                }
                continue;
            }
            if (fnBarVal[i] === '"') {
                inQuotes = true;
            } else if (fnBarVal[i] === '\\') {
                escaped = true;
            } else if (fnBarVal[i] === "(") {
                numOpens++;
            } else if (fnBarVal[i] === ")") {
                numOpens--;
                if (numOpens < 0) {
                    return (false);
                }
            }
        }
        if (numOpens === 0) {
            return (true);
        }
        return (false);
    }

    function functionBarEnter() {
        var fnBarVal = $fnBar.val();
        var fnBarValTrim = fnBarVal.trim();
        var $colInput = $lastColInput;

        if (!$colInput || !$colInput.length) {
            return;
        }

        if (fnBarValTrim.indexOf('=') === 0) {
            var $table   = $colInput.closest('.dataTable');
            var tableId  = xcHelper.parseTableId($table);
            var colNum   = xcHelper.parseColNum($colInput);
            var table    = gTables[tableId];
            var tableCol = table.tableCols[colNum - 1];
            var colName  = tableCol.name;
            $fnBar.blur();

            if (tableCol.isNewCol && colName === "") {
                // when it's new column and do not give name yet
                StatusBox.show(ErrTStr.NoEmpty, $colInput);
                return;
            }

            $fnBar.removeClass("inFocus");

            var newFuncStr = '"' + colName + '" ' + fnBarValTrim;
            var oldUsrStr  = tableCol.userStr;

            $colInput.blur();
            // when usrStr not change
            if (newFuncStr === oldUsrStr) {
                return;
            }

            $colInput.closest('th').removeClass('unusedCell');
            $table.find('td:nth-child(' + colNum + ')')
                  .removeClass('unusedCell');
            var isValid = checkFuncSyntaxValidity(fnBarValTrim);
            if (!isValid) {
                return;
            }
            var operation = getOperationFromFuncStr(newFuncStr);

            ColManager.execCol(operation, newFuncStr, tableId, colNum)
            .then(function() {
                updateTableHeader(tableId);
                TableList.updateTableInfo(tableId);
                KVStore.commit();
            });
        }
    }

    function getOperationFromFuncStr(funcStr) {
        var operation = funcStr.substring(funcStr.indexOf("=") + 1).trim();
        operation = operation.substr(0, operation.indexOf("("));
        return (operation);
    }

    function checkFuncSyntaxValidity(funcStr) {
        if (funcStr.indexOf("(") === -1 || funcStr.indexOf(")") === -1) {
            return false;
        }

        var count = 0;
        var strLen = funcStr.length;
        for (var i = 0; i < strLen; i++) {
            if (funcStr[i] === "(") {
                count++;
            } else if (funcStr[i] === ")") {
                count--;
            }
            if (count < 0) {
                return false;
            }
        }

        return (count === 0);
    }

    return (FnBar);
}({}, jQuery));
