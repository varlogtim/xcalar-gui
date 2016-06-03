window.FnBar = (function(FnBar, $) {
    var $functionArea; // $("#functionArea");
    var $fnBar;        // $("#fnBar");
    var $fnBarClone;   // $('.fnBarClone');

    var $lastColInput = null;
    var searchHelper;

    FnBar.setup = function() {
        $functionArea = $("#functionArea");
        $fnBar = $("#fnBar");
        $fnBarClone = $functionArea.find('.fnBarClone');
        setupSearchHelper();
        var initialTableId; //used to track table that was initially active
        // when user started searching
        var skipParen; // state for moving cursor if next char is ) and
                       // user presses )

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
                    $lastColInput = null;
                } else {
                    $functionArea.removeClass('searching');
                }
                highlightBrackets();
            },
            "keydown": function(event) {
                if (event.which === keyCode.Backspace) {
                    var oldStr = $fnBar.val();
                    var oldCaret = $fnBar.caret();
                    var prevChar = oldStr[oldCaret - 1];
                    var nextIsBracket = oldStr.substring(oldCaret);

                    // remove opening and closing paren if nothing in between
                    if (nextIsBracket.indexOf(")") === 0 &&
                        prevChar === "(") {
                        // Immediate close bracket
                        $fnBar.val(oldStr.substring(0, oldCaret) +
                                   oldStr.substring(oldCaret + 1));
                        $fnBar.caret(oldCaret);
                        highlightBrackets();
                    }
                }
            },
            "keypress": function(event) {
                if (event.which === 40) {
                    // Open paren
                    var oldStr = $fnBar.val();
                    var oldCaret = $fnBar.caret();
                    var valInFrontCaret = oldStr[oldCaret];

                    // autoclose parenthesis
                    if (valInFrontCaret === undefined ||
                        valInFrontCaret === " " ||
                        valInFrontCaret === ")") {
                        var newStr = oldStr.substring(0, oldCaret) +
                                 ")" + oldStr.substring(oldCaret);
                        $fnBar.val(newStr);
                        $fnBar.caret(oldCaret);
                        highlightBrackets();
                        skipParen = true;
                    } else {
                        skipParen = false;
                    }
                } else if (event.which === 41) {
                    // close paren
                    // skip close parenthesis if cursor is before )
                    if (skipParen) {
                        var oldStr = $fnBar.val();
                        var oldCaret = $fnBar.caret();
                        if (oldStr[oldCaret] === ")") {
                            $fnBar.caret(oldCaret + 1);
                            event.preventDefault();
                        } else {
                            console.warn('inspect this case', oldCaret, oldStr);
                        }
                    }
                    skipParen = false;

                } else if (event.which === keyCode.Enter) {
                    skipParen = false;
                    var val = $fnBar.val();
                    var mismatch = xcHelper.checkMatchingBrackets(val);
                    if (mismatch.index === -1) {
                        functionBarEnter();
                    } else {
                        var savedStr = $fnBar.val();
                        var savedColInput = $lastColInput;
                        var funcStr = "\"" + val.slice(0, mismatch.index) +
                                        "<span style='color:red;" +
                                        "font-weight:bold;'>" +
                                        mismatch.char + "</span>" +
                                        val.slice(mismatch.index + 1) + "\"";

                        Alert.show({
                            "title"      : AlertTStr.BracketsMis,
                            "msgTemplate": ErrTStr.BracketsMis + "<br/>" + funcStr,
                            "isAlert"    : true,
                            "onCancel"   : function() {
                                if (savedColInput) {
                                    savedColInput.trigger({
                                        type : "mousedown",
                                        which: 1
                                    });
                                    $fnBar.removeAttr("disabled");
                                    $fnBar.val(savedStr);
                                    highlightBrackets();
                                    $fnBar.focus();
                                } else {
                                    $fnBar.removeAttr("disabled");
                                }
                            }
                        });
                        $fnBar.val(savedStr);
                        highlightBrackets();
                        $fnBar.prop("disabled", "true");
                    }

                }
            },
            "mousedown": function() {
                $(this).addClass("inFocus");
                $fnBar.attr('placeholder', WSTStr.SearchTableAndColumn);
                skipParen = false;
            },
            "focus": function() {
                initialTableId = gActiveTableId;
                skipParen = false;
            },
            "blur": function() {
                $(this).removeClass("inFocus");
                $fnBar.attr('placeholder', "");
                skipParen = false;

                var keepVal = false;
                if ($lastColInput) {
                    keepVal = true;
                }

                var options = {keepVal: keepVal};
                searchHelper.clearSearch(function() {
                    $functionArea.removeClass('searching');
                }, options);
            }
        });

        $functionArea.on('mousedown', function(e) {
            // keep fnbar focused even when you click outside of it
            if ($(e.target).attr('id') === 'functionArea') {
                e.preventDefault();
                e.stopPropagation();

                $('.menu').hide();
                removeMenuKeyboardNavigation();
                $('.highlightBox').remove();

                gMouseEvents.setMouseDownTarget($fnBar);
                $fnBar.focus();
            }
        });
    };

    FnBar.focusOnCol = function($colInput, tableId, colNum, forceFocus) {
        if (!forceFocus && $lastColInput != null &&
            $colInput.get(0) === $lastColInput.get(0) &&
            !$fnBar.parent().hasClass('searching'))
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
            highlightBrackets();
        } else {
            var userStr = progCol.userStr;
            userStr = userStr.substring(userStr.indexOf('='));
            $fnBar.val(userStr).addClass('active').removeClass('disabled');
            highlightBrackets();
            $fnBar.parent().removeClass('searching');
        }
    };

    FnBar.clear = function(noSave) {
        if (!noSave) {
            saveInput();
        } else {
            $fnBar.removeClass('disabled');
        }
        $lastColInput = null;
        $fnBar.val("").removeClass("active");
        highlightBrackets();
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
            "ignore"              : "=",
            "arrowsPreventDefault": true
        });

        searchHelper.setup();
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

            var operation = getOperationFromFuncStr(newFuncStr);

            ColManager.execCol(operation, newFuncStr, tableId, colNum)
            .then(function(ret) {
                if (ret === "update") {
                    updateTableHeader(tableId);
                    TableList.updateTableInfo(tableId);
                    KVStore.commit();
                }
            });
        }
    }

    function getOperationFromFuncStr(funcStr) {
        var operation = funcStr.substring(funcStr.indexOf("=") + 1).trim();
        operation = operation.substr(0, operation.indexOf("("));
        return (operation);
    }

    function highlightBrackets() {
        // XX disabling due misalignment of highlight if input is scrolled
        return;
        // var val = $fnBar.val();
        // if (val === "") {
        //     $fnBarClone.empty();
        //     return;
        // }

        // var mismatch = xcHelper.checkMatchingBrackets(val);
        // if (mismatch.index > -1) {
        //     var index = mismatch.index;
        //     val = val.slice(0, index) + "<span>" + mismatch.char + "</span>" +
        //     val.slice(index + 1);
        // }
        // $fnBarClone.html(val);
    }

    return (FnBar);
}({}, jQuery));
