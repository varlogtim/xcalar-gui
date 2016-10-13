window.JoinView = (function($, JoinView) {
    var $mainJoin;       // $("#mainJoin")
    var $joinView;      // $("#joinView")
    var $leftTableDropdown;  // $('#joinLeftTableList');
    var $rightTableDropdown;  // $('#joinRightTableList');
    var $joinTypeSelect;     // $("#joinType")
    var $joinTableName;  // $("#joinTableNameInput")
    var $clauseContainer;      // $("#multiJoin")
    var $lastInputFocused;
    var $renameSection; // $("#joinView .renameSection")
    var isNextNew = true; // if true, will run join estimator
    var joinEstimatorType = "inner"; // if user changes join type,
                                     // rerun estimator
    var isOpen = false;
    var lImmediatesCache;
    var rImmediatesCache;
    var allClashingImmediatesCache;
    var lastSideClicked; // for column selector ("left" or "right")
    var focusedListNum;
    var mainMenuPrevState;
    var formOpenTime; // stores the last time the form was opened
    var turnOnPrefix = true; // Set to false if backend crashes

    var validTypes = ['integer', 'float', 'string', 'float'];

    var formHelper;
    var multiClauseTemplate =
        '<div class="joinClause">' +
            '<input class="clause leftClause arg" type="text" ' +
            'spellcheck="false" />' +
              '<div class="middleIcon">' +
                '<div class="iconWrapper">' +
                  '<i class="icon xi-equal-circle fa-14"></i>' +
                '</div>' +
              '</div>' +
              '<input class="clause rightClause inActive arg" type="text"' +
                ' data-original-title="' + JoinTStr.NoRightTable + '"' +
                ' data-toggle="tooltip" data-container="body"' +
                ' spellcheck="false" disabled/>' +
        '</div>';

    var renameTemplate =
        '<div class="rename">' +
            '<input class="columnName origName arg" type="text" ' +
            'spellcheck="false" disabled/>' +
            '<div class="middleIcon">' +
                '<div class="iconWrapper">' +
                    '<i class="icon xi-play-circle fa-14"></i>' +
                '</div>' +
            '</div>' +
            '<input class="columnName newName arg" type="text" ' +
              'spellcheck="false"/>' +
        '</div>';

    JoinView.setup = function () {
        $mainJoin = $("#mainJoin");
        $joinView = $("#joinView");
        $leftTableDropdown = $('#joinLeftTableList');
        $rightTableDropdown = $('#joinRightTableList');
        $joinTypeSelect = $("#joinType");
        $joinTableName = $("#joinTableNameInput");
        $clauseContainer = $mainJoin.find('.clauseContainer');
        $renameSection = $("#joinView .renameSection");

        var columnPicker = {
            "state"      : "joinState",
            "colCallback": function($target) {
                xcHelper.fillInputFromCell($target, $lastInputFocused);
            }
        };
        formHelper = new FormHelper($joinView, {
            "columnPicker": columnPicker
        });

        $joinView.find('.cancel, .close').on('click', function() {
            JoinView.close();
        });

        $joinView.find('.next, .back').click(function() {
            toggleNextView();
        });

        $("#closeJoin, #cancelJoin").click(function() {
            JoinView.close();
            resetJoinView();
        });

        $joinTableName.blur(function() {
            var tableName = $joinTableName.val().trim();
            if (tableName && /^ | $|[*#'"]/.test(tableName) === true) {
                // status box would get closed on blur event if no timeout
                setTimeout(function() {
                    StatusBox.show(ErrTStr.InvalidTableName, $joinTableName);
                }, 0);

                return;
            }
        });

        var joinTypeList = new MenuHelper($joinTypeSelect, {
            "onSelect": function($li) {
                var joinType = $li.text();
                $joinTypeSelect.find(".text").text(joinType);
                updatePreviewText();
                checkNextBtn();
            }
        });
        joinTypeList.setupListeners();

        var leftTableList = new MenuHelper($leftTableDropdown, {
            "onOpen": function() {
                fillTableLists(null, true);
            },
            "onSelect": function($li) {
                var tableName = $li.text();
                var $textBox = $leftTableDropdown.find(".text");
                var originalText = $textBox.text();

                if (originalText !== tableName) {
                    // $tableNameText.text(tableName).data('id', tableId);
                    $textBox.text(tableName);
                    $li.siblings().removeClass('selected');
                    $li.addClass('selected');
                    $joinView.find('.leftClause').val("").eq(0).focus();
                    checkNextBtn();
                    updatePreviewText();
                    focusTable(getTableIds(0));
                } else {
                    return;
                }
            }
        });
        leftTableList.setupListeners();

        var rightTableList = new MenuHelper($rightTableDropdown, {
            "onOpen": function() {
                fillTableLists(null, true);
            },
            "onSelect": function($li) {
                var tableName = $li.text();
                var $textBox = $rightTableDropdown.find(".text");
                var originalText = $textBox.text();
                $(".rightClause").removeClass("inActive")
                                 .attr("disabled", false);
                var $subHeading = $rightTableDropdown.siblings('.subHeading');
                xcTooltip.remove($(".rightClause"));
                xcTooltip.remove($subHeading.find('.tooltipWrap'));

                if (originalText !== tableName) {
                    // $tableNameText.text(tableName).data('id', tableId);
                    $textBox.text(tableName);
                    $subHeading.find('.iconWrap').removeClass('inactive');

                    $li.siblings().removeClass('selected');
                    $li.addClass('selected');
                    $joinView.find('.rightClause').val("").eq(0).focus();
                    checkNextBtn();
                    updatePreviewText();
                    focusTable(getTableIds(1));
                } else {
                    return;
                }
            }
        });
        rightTableList.setupListeners();

        $joinView.find('.tableListSections .focusTable').click(function() {
            var tableIds = getTableIds();
            var index = $joinView.find('.tableListSections .focusTable')
                                 .index($(this));
            var tableId = tableIds[index];
            xcHelper.centerFocusedTable(tableId, true);
        });


        // This submits the joined tables
        $("#joinTables").click(function() {
            $(this).blur();
            submitJoin();
        });

        // toggle keep tables
        $joinView.find('.keepTablesCBWrap').click(function() {
            $(this).find(".checkbox").toggleClass("checked");
        });

        // add multi clause
        $clauseContainer.on("click", ".placeholder", function() {
            addClause($(this));
        });

        // delete multi clause
        $clauseContainer.on("click", ".joinClause .middleIcon", function() {
            var $joinClause = $(this).closest(".joinClause");
            if ($joinClause.hasClass("placeholder")) {
                return;
            } else {
                $joinClause.slideUp(100, function() {
                    $joinClause.remove();
                    updatePreviewText();
                    checkNextBtn();
                    // reset estimator if removing a filled input
                    if ($joinClause.find('.leftClause').val().trim() !== "" ||
                        $joinClause.find('.leftClause').val().trim() !== "") {
                        isNextNew = true;
                    }
                });
            }
        });

        $joinView.on('focus', '.clause', function() {
            $lastInputFocused = $(this);
        });
        $joinView.on('input', '.clause', function() {
            updatePreviewText();
            checkNextBtn();
            isNextNew = true;
        });
        $joinView.on('change', '.clause', function() {
            updatePreviewText();
            checkNextBtn();
            isNextNew = true;
        });

        $joinView.find('.columnsWrap').on('click', 'li', function(event) {
            var $li = $(this);
            var colNum = $li.data('colnum');
            var toHighlight = false;
            if (!$li.hasClass('checked')) {
                toHighlight = true;
            }

            var $colList = $li.closest('ul');
            var isLeftSide = $colList.hasClass('leftCols');
            var toShift = event.shiftKey &&
                          (isLeftSide && lastSideClicked === "left" ||
                          !isLeftSide && lastSideClicked === "right");


            if (toShift && focusedListNum != null) {
                var start = Math.min(focusedListNum, colNum);
                var end = Math.max(focusedListNum, colNum);

                for (var i = start; i <= end; i++) {
                    if (toHighlight) {
                        selectCol(i, $colList);
                    } else {
                        deselectCol(i, $colList);
                    }
                }
            } else {
                if (toHighlight) {
                    selectCol(colNum, $colList);
                } else {
                    deselectCol(colNum, $colList);
                }
            }

            if ($li.siblings('.checked').length === 0) {
                if ($li.closest('ul').hasClass('leftCols')) {
                    $joinView.find('.leftColHeading .selectAll')
                             .removeClass('checked');
                } else {
                    $joinView.find('.rightColHeading .selectAll')
                             .removeClass('checked');
                }
            } else if ($li.siblings().length ===
                       $li.siblings('.checked').length) {
                if ($li.closest('ul').hasClass('leftCols')) {
                    $joinView.find('.leftColHeading .selectAll')
                             .addClass('checked');
                } else {
                    $joinView.find('.rightColHeading .selectAll')
                             .addClass('checked');
                }
            }

            if (isLeftSide) {
                lastSideClicked = "left";
            } else {
                lastSideClicked = "right";
            }

            focusedListNum = colNum;

            resetRenames();
        });

        function selectCol(colNum, $colList) {
            $colList.find('li[data-colnum="' + colNum + '"]')
                    .addClass('checked')
                    .find('.checkbox').addClass('checked');
        }

        function deselectCol(colNum, $colList) {
            $colList.find('li[data-colnum="' + colNum + '"]')
                    .removeClass('checked')
                    .find('.checkbox').removeClass('checked');
        }

        $joinView.find('.selectAll').on('click', function() {
            var $checkbox = $(this);
            var index = $joinView.find('.selectAll').index($checkbox);
            var $cols = $joinView.find('.columnsWrap ul').eq(index);

            if ($checkbox.hasClass('checked')) {
                $checkbox.removeClass('checked');
                $cols.find('li').removeClass('checked')
                     .find('.checkbox').removeClass('checked');
            } else {
                $checkbox.addClass('checked');
                $cols.find('li').addClass('checked')
                      .find('.checkbox').addClass('checked');
            }
            resetRenames();
        });

        // smart suggest button
        $joinView.find('.smartSuggest').click(function() {
            var $inputToCheck;
            var isLeftTableVal = false;
            var $suggErrorArea = $(this).siblings(".suggError");
            // var $suggErrorArea = $(this);
            if (hasValidTableNames()) {
                $joinView.find('.joinClause:not(.placeholder)').each(function() {
                    var $row = $(this);

                    if ($row.find('.arg').eq(0).val().trim() !== "" &&
                        $row.find('.arg').eq(1).val().trim() === "") {
                        $inputToCheck = $row.find('.arg').eq(0);
                        isLeftTableVal = true;
                    } else if ($row.find('.arg').eq(1).val().trim() !== "" &&
                        $row.find('.arg').eq(0).val().trim() === "") {
                        $inputToCheck = $row.find('.arg').eq(1);
                    }
                    if ($inputToCheck) {

                        return false; // exit .each loop
                    }
                });

                if ($inputToCheck) {
                    var tableName;
                    var otherTableName;
                    if (isLeftTableVal) {
                        tableName = $leftTableDropdown.find('.text').text();
                        otherTableName = $rightTableDropdown.find('.text')
                                                            .text();
                    } else {
                        tableName = $rightTableDropdown.find('.text')
                                                       .text();
                        otherTableName = $leftTableDropdown.find('.text')
                                                           .text();
                    }
                    var tableId = xcHelper.getTableId(tableName);
                    var suggTableId = xcHelper.getTableId(otherTableName);
                    var $inputToFill = $inputToCheck.siblings('.arg');

                    // tableId is the left table
                    // $th is the left table
                    // $suggSection is the right table
                    // suggTableId is the right table
                    var isFind = suggestJoinKey(tableId,
                                                $inputToCheck.val().trim(),
                                                $inputToFill, suggTableId);

                    if (!isFind) {
                        text = isLeftTableVal ? JoinTStr.NoMatchRight :
                                                JoinTStr.NoMatchLeft;
                        showErrorTooltip($suggErrorArea, {
                            "title"    : text,
                            "placement": "right",
                            "animation": "true",
                            "container": "body",
                            "trigger"  : "manual",
                            "template" : TooltipTemplate.Error
                        });
                    }
                } else {
                    showErrorTooltip($suggErrorArea, {
                        "title"    : 'No available column names to check',
                        "placement": "right",
                        "animation": "true",
                        "container": "body",
                        "trigger"  : "manual",
                        "template" : TooltipTemplate.Error
                    });
                }
            } else {
                // no table selected in dropdown
                showErrorTooltip($suggErrorArea, {
                    "title"    : 'Select a left and right table first',
                    "placement": "right",
                    "animation": "true",
                    "container": "body",
                    "trigger"  : "manual",
                    "template" : TooltipTemplate.Error
                });
            }

            checkNextBtn();
            updatePreviewText();
        });

        $renameSection.on("click", ".iconWrapper", function() {
            var $colToRename = $(this).closest(".rename");
            var origName = $colToRename.find(".origName").val();
            $colToRename.find(".newName").val(origName);
        });
    };

    JoinView.restore = function() {
        var keepJoinTables = UserSettings.getPref('keepJoinTables');
        if (keepJoinTables) {
            $joinView.find('.keepTablesCBWrap .checkbox').addClass('checked');
        }
    };

    JoinView.show = function(tableId, colNum, restore, restoreTime) {
        if (restoreTime && restoreTime !== formOpenTime) {
            // if restoreTime and formOpenTime do not match, it means we're
            // trying to restore a form to a state that's already been
            // overwritten
            return;
        }
        isOpen = true;
        mainMenuPrevState = MainMenu.getState();

        $('#workspaceMenu').find('.menuSection').addClass('xc-hidden');
        $joinView.removeClass('xc-hidden');
        if (!MainMenu.isMenuOpen("mainMenu")) {
            MainMenu.open();
        } else {
            BottomMenu.close(true);
        }
        formOpenTime = Date.now();

        if (!restore) {
            resetJoinView();
            fillTableLists(tableId);
            updatePreviewText();
            addClause($joinView.find('.placeholder'), true, tableId, colNum);
        }
        formHelper.setup();

        $("body").on("keypress.joinModal", function(event) {
            switch (event.which) {
                case keyCode.Enter:
                    // when focus on a button, no trigger
                    if (formHelper.checkBtnFocus()) {
                        return;
                    }
                    if ($joinView.hasClass('nextStep')) {
                        $('#joinTables').click();
                    } else {
                        $joinView.find('.next').click();
                    }

                    break;
                default:
                    break;
            }
        });
    };

    JoinView.close = function() {
        if (!isOpen) {
            return;
        }

        isOpen = false;
        lastSideClicked = null;
        focusedListNum = null;
        MainMenu.restoreState(mainMenuPrevState);
        $joinView.addClass('xc-hidden');
        formHelper.clear();
        $("body").off(".joinModal");
        $lastInputFocused = null;
        StatusBox.forceHide();// hides any error boxes;
        $('.tooltip').hide();
    };

    function toggleNextView() {
        if ($joinView.hasClass('nextStep')) {
            // go to step 1
            $joinView.removeClass('nextStep');
            formHelper.refreshTabbing();
            lastSideClicked = null;
            focusedListNum = null;
        } else {
            // go to step 2
            if (checkFirstView()) {
                if (isNextNew) {
                    estimateJoinSize();
                    displayAllColumns();
                    isNextNew = false;
                    resetRenames();
                } else if ($joinTypeSelect.find(".text").text() !==
                           joinEstimatorType) {
                    // Rerun estimator since type is now different
                    estimateJoinSize();
                }

                $joinView.addClass('nextStep');
                if ($joinTableName.val().trim() === "") {
                    $joinTableName.focus();
                }

                // clear any empty column rows
                $clauseContainer.find(".joinClause:not(.placeholder)")
                .each(function() {
                    var $joinClause = $(this);
                    var lClause = $joinClause.find(".leftClause").val().trim();
                    var rClause = $joinClause.find(".rightClause").val().trim();

                    if (lClause === "" && rClause === "") {
                        $joinClause.remove();
                    }
                });

                formHelper.refreshTabbing();
            } else {
                // checkfirstview is handling errors
                return;
            }
        }
        $joinView.scrollTop(0);
    }

    function checkFirstView() {
        // var newTableName = newTableName + Authentication.getHashId();

        var lCols = [];
        var rCols = [];
        var $invalidClause = null;

        // check validation
        $clauseContainer.find(".joinClause:not(.placeholder)").each(function() {
            var $joinClause = $(this);
            var lClause = $joinClause.find(".leftClause").val().trim();
            var rClause = $joinClause.find(".rightClause").val().trim();

            if (lClause !== "" && rClause !== "") {
                lCols.push(lClause);
                rCols.push(rClause);
                return true;
            } else if (!(lClause === "" && rClause === "")){
                $invalidClause = $joinClause;
                return false;   // stop loop
            }
        });

        if ($invalidClause != null || lCols.length === 0) {
            invalidMultiCaluseTooltip($invalidClause);
            return false;
        }

        var tableIds = getTableIds();
        var leftColRes = xcHelper.convertFrontColNamesToBack(lCols, tableIds[0],
                                                    validTypes);

        var errorText;
        // xx need to refactor below
        if (leftColRes.invalid) {
            var $input =
            $clauseContainer.find('.joinClause .leftClause').filter(function() {
                return ($(this).val() === leftColRes.name);
            }).eq(0);
            if (leftColRes.reason === 'notFound') {

                errorText = xcHelper.replaceMsg(ErrWRepTStr.InvalidCol, {
                    "name": leftColRes.name
                });
            } else if (leftColRes.reason === 'type') {
                errorText = xcHelper.replaceMsg(ErrWRepTStr.InvalidColType, {
                    "name": leftColRes.name,
                    "type": leftColRes.type
                });
            }
            showErrorTooltip($input, {
                "title"    : errorText,
                "placement": "top",
                "animation": "true",
                "container": "body",
                "trigger"  : "manual",
                "template" : TooltipTemplate.Error
            });
            return false;
        } else {
            var rightColRes = xcHelper.convertFrontColNamesToBack(rCols,
                                                                  tableIds[1],
                                                                  validTypes);
            if (rightColRes.invalid) {
                var $input =
                $clauseContainer.find('.joinClause .rightClause').filter(function() {
                    return ($(this).val() === rightColRes.name);
                }).eq(0);
                if (rightColRes.reason === 'notFound') {

                    errorText = xcHelper.replaceMsg(ErrWRepTStr.InvalidCol, {
                        "name": rightColRes.name
                    });
                } else if (rightColRes.reason === 'type') {
                    errorText = xcHelper.replaceMsg(ErrWRepTStr.InvalidColType, {
                        "name": rightColRes.name,
                        "type": rightColRes.type
                    });
                }
                showErrorTooltip($input, {
                    "title"    : errorText,
                    "placement": "top",
                    "animation": "true",
                    "container": "body",
                    "trigger"  : "manual",
                    "template" : TooltipTemplate.Error
                });
                return (false);
            } else {
                return (true);
            }
        }

        return (true);
    }

    function estimateJoinSize() {
        var tableIds = getTableIds();
        var cols = getClauseCols();
        var rTableName = gTables[tableIds[1]].getName();
        var argList = {
            "leftLimit" : 100,
            "rightLimit": 100,
            "joinType"  : $joinTypeSelect.find(".text").text(),
            "lCol"      : cols[0],
            "rCol"      : cols[1],
            "rTable"    : new XcSDK.Table(rTableName),
            "unlock"    : true,
            "fromJoin"  : true
        };

        var $estimatorWrap = $joinView.find('.estimatorWrap');
        $estimatorWrap.find('.title').text(JoinTStr.EstimatingJoin);
        $estimatorWrap.find('.value').empty();

        var extOptions = {
            noNotification: true
        };

        joinEstimatorType = $joinTypeSelect.find(".text").text();

        ExtensionManager.trigger(tableIds[0], "UExtDev", "estimateJoin",
                                 argList, extOptions)
        .then(function(ret) {
            $joinView.find('.estimatorWrap .title')
                     .text(JoinTStr.EstimatedJoin + ':');
            $estimatorWrap.find('.min .value').text(ret.minSum);
            $estimatorWrap.find('.med .value').text(ret.expSum);
            $estimatorWrap.find('.max .value').text(ret.maxSum);
        })
        .fail(function() {
            $joinView.find('.estimatorWrap .title')
                     .text(JoinTStr.EstimatedJoin + ':');
            $estimatorWrap.find('.value').text('N/A');
        });
    }

    // generates all left and right table columns to keep
    function displayAllColumns() {
        var tableIds = getTableIds();
        var lHtml = getTableColList(tableIds[0]);
        var rHtml = getTableColList(tableIds[1]);
        $joinView.find('.leftCols').html(lHtml);
        $joinView.find('.rightCols').html(rHtml);
        $joinView.find('.selectAll').addClass('checked');
    }

    function resetRenames() {
        $("#leftTableRenames").find(".rename").remove();
        $("#rightTableRenames").find(".rename").remove();
        $renameSection.find(".tableRenames").hide();
        $renameSection.hide();
        formHelper.refreshTabbing();
    }

    function hasValidTableNames() {
        var tableIds = getTableIds();
        return (gTables[tableIds[0]] && gTables[tableIds[1]]);
    }

    // returns array of 2 table ids if no args passed in
    // or returns corresponding id if index passed in
    function getTableIds(index) {
        if (index != null) {
            var tableName;
            if (index === 0) {
                tableName = $leftTableDropdown.find('.text').text();
            } else {
                tableName = $rightTableDropdown.find('.text').text();
            }
            return xcHelper.getTableId(tableName);
        } else {
            var lTableName = $leftTableDropdown.find('.text').text();
            var rTableName = $rightTableDropdown.find('.text').text();
            var lTableId = xcHelper.getTableId(lTableName);
            var rTableId = xcHelper.getTableId(rTableName);
            return ([lTableId, rTableId]);
        }
    }

    function hasColsAndTableNames() {
        if (hasValidTableNames()) {
            var columnPairs = [];
            var pair;
            var lClause;
            var rClause;

            $joinView.find(".joinClause:not(.placeholder)").each(function() {
                var $joinClause = $(this);
                lClause = $joinClause.find(".leftClause").val().trim();
                rClause = $joinClause.find(".rightClause").val().trim();
                pair = [lClause, rClause];
                columnPairs.push(pair);
            });

            var numPairs = columnPairs.length;
            // var leftColText;
            // var rightColText;
            var validColPairFound = false;

            for (var i = 0; i < numPairs; i++) {
                if ((columnPairs[i][0] && !columnPairs[i][1]) ||
                    (columnPairs[i][1] && !columnPairs[i][1])) {
                    validColPairFound = false;
                    break;
                }
                if (columnPairs[i][0] && columnPairs[i][1]) {
                    validColPairFound = true;
                }
            }
            return (validColPairFound);
        } else {
            return (false);
        }
    }


    function getClauseCols() {
        var tableIds = getTableIds();
        var lTableId = tableIds[0];
        var rTableId = tableIds[1];
        var lCols = [];
        var rCols = [];

        $clauseContainer.find(".joinClause:not(.placeholder)").each(function() {
            var $joinClause = $(this);
            var lClause = $joinClause.find(".leftClause").val().trim();
            var rClause = $joinClause.find(".rightClause").val().trim();

            if (lClause !== "" && rClause !== "") {
                lCols.push(lClause);
                rCols.push(rClause);
            }
        });

        var lTable = gTables[lTableId];
        lCols = lCols.map(function(colName) {
            var progCol = lTable.getColByFrontName(colName);
            var backColName = progCol.getBackColName();
            var colType = progCol.getType();
            return new XcSDK.Column(backColName, colType);
        });

        var rTable = gTables[rTableId];
        rCols = rCols.map(function(colName) {
            var progCol = rTable.getColByFrontName(colName);
            var backColName = progCol.getBackColName();
            var colType = progCol.getType();
            return new XcSDK.Column(backColName, colType);
        });

        return ([lCols, rCols]);
    }

    function checkNextBtn() {
        var $nextBtn = $joinView.find('.next');
        var isDisabled = $nextBtn.hasClass('btn-disabled');
        if (hasColsAndTableNames()) {
            $nextBtn.removeClass('btn-disabled');
            if (isDisabled) {
                isNextNew = true;
                formHelper.refreshTabbing();
            }
        } else {
            $nextBtn.addClass('btn-disabled');
            if (!isDisabled) {
                isNextNew = true;
                formHelper.refreshTabbing();
            }
        }
    }

    function getTableColList(tableId) {
        var html = "";
        var allCols = gTables[tableId].tableCols;
        for (var i = 0; i < allCols.length; i++) {
            var progCol = allCols[i];
            if (!progCol.isEmptyCol() && !progCol.isDATACol()) {
                html += '<li class="checked" data-colnum="' + i + '">' +
                            '<span class="text">' +
                                allCols[i].name +
                            '</span>' +
                            '<div class="checkbox checked">' +
                                '<i class="icon xi-ckbox-empty fa-13"></i>' +
                                '<i class="icon xi-ckbox-selected fa-13"></i>' +
                            '</div>' +
                        '</li>';
            }
        }
        return (html);
    }

    function submitJoin() {
        // check validation
        // if submit is enabled, that means first view is already valid

        var newTableName = $joinTableName.val().trim();

        if (newTableName === "") {
            StatusBox.show(ErrTStr.NoEmpty, $joinTableName, true);
            return;
        }
        if (/^ | $|[*#'"]/.test(newTableName) === true) {
            StatusBox.show(ErrTStr.InvalidTableName, $joinTableName, true);
            return;
        }
        if (newTableName.length >=
            XcalarApisConstantsT.XcalarApiMaxTableNameLen) {
            StatusBox.show(ErrTStr.TooLong, $joinTableName, true);
            return;
        }

        var validTableName = xcHelper.checkDupTableName(newTableName);
        if (!validTableName) {
            StatusBox.show(ErrTStr.TableConflict, $joinTableName, true);
            return;
        }

        formHelper.disableSubmit();
        var joinType = $joinTypeSelect.find(".text").text();
        var tableName = newTableName + Authentication.getHashId();
        joinSubmitHelper(joinType, tableName);

        // XXX some bugs here
        formHelper.enableSubmit();

    }

    function joinSubmitHelper(joinType, newTableName) {
        var lCols = [];
        var rCols = [];
        var $invalidClause = null;

        // check validation
        $clauseContainer.find(".joinClause:not(.placeholder)").each(function() {
            var $joinClause = $(this);
            var lClause = $joinClause.find(".leftClause").val().trim();
            var rClause = $joinClause.find(".rightClause").val().trim();

            if (lClause !== "" && rClause !== "") {
                lCols.push(lClause);
                rCols.push(rClause);
                return true;
            } else if (!(lClause === "" && rClause === "")){
                $invalidClause = $joinClause;
                return false;   // stop loop
            }
        });

        if ($invalidClause != null || lCols.length === 0) {
            invalidMultiCaluseTooltip($invalidClause);
            return false;
        }

        var tableIds = getTableIds();
        var lTableId = tableIds[0];
        var rTableId = tableIds[1];
        var lTable = gTables[lTableId];
        var rTable = gTables[rTableId];
        var lColNums = [];
        var rColNums = [];
        var $colLis;
        var lColsToKeep = [];
        var rColsToKeep = [];

        // set up "joining on" columns
        for (var i = 0; i < lCols.length; i++) {
            var col = lTable.getColByFrontName(lCols[i]);
            lColNums[i] = lTable.getColNumByBackName(col.backName) - 1;
        }

        for (var i = 0; i < rCols.length; i++) {
            var col = rTable.getColByFrontName(rCols[i]);
            rColNums[i] = rTable.getColNumByBackName(col.backName) - 1;
        }

        // set up "keeping" columns
        $colLis = $joinView.find('.leftCols li.checked');
        $colLis.each(function(i) {
            var name = $(this).text();
            var col = lTable.getColByFrontName(name);
            lColsToKeep[i] = col.backName;
        });


        $colLis = $joinView.find('.rightCols li.checked');
        $colLis.each(function(i) {
            var name = $(this).text();
            var col = rTable.getColByFrontName(name);
            rColsToKeep[i] = col.backName;
        });

        // 1) We check whether the column name resolution is already there
        // 2) If it is, then we check whether the resolution is satisfactory.
        // 3) If it is, then we skip the checking and go straight to join
        // Else, we trigger the resolution again

        // XXX When a column is deselected or selected, we should only remove
        // that one column from prefix. Currently just going to remove all
        if ($renameSection.is(":visible")) {
            // Already in rename mode. Verify that the renames are correct
            var $leftRenames = $("#leftTableRenames .rename");
            var $leftOrigNames = $leftRenames.find(".origName");
            var $leftNewNames = $leftRenames.find(".newName");
            var $rightRenames = $("#rightTableRenames .rename");
            var $rightOrigNames = $rightRenames.find(".origName");
            var $rightNewNames = $rightRenames.find(".newName");
            var lImmediates = xcHelper.deepCopy(lImmediatesCache);
            var rImmediates = xcHelper.deepCopy(rImmediatesCache);
            var i = -1;

            // Check that none are empty
            for (i = 0; i < $leftNewNames.length; i++) {
                if ($($leftNewNames[i]).val().trim().length === 0) {
                    StatusBox.show(ErrTStr.NoEmpty, $leftRenames.eq(i), true);
                    return false;
                }
            }

            for (i = 0; i < $rightNewNames.length; i++) {
                if ($($rightNewNames[i]).val().trim().length === 0) {
                    StatusBox.show(ErrTStr.NoEmpty, $rightRenames.eq(i), true);
                    return false;
                }
            }

            // Convert to array of old and newNames
            var leftRenameArray = [];
            var rightRenameArray = [];
            for (i = 0; i < $leftOrigNames.length; i++) {
                var origName = $($leftOrigNames[i]).val();
                var newName = $($leftNewNames[i]).val();
                leftRenameArray.push({"orig": origName, "new": newName});
            }

            for (i = 0; i < $rightOrigNames.length; i++) {
                var origName = $($rightOrigNames[i]).val();
                var newName = $($rightNewNames[i]).val();
                rightRenameArray.push({"orig": origName, "new": newName});
            }

            // Get array of all new immediates by updating the old with the new
            for (i = 0; i < $leftOrigNames.length; i++) {
                var index = lImmediates.indexOf(leftRenameArray[i].orig);
                lImmediates[index] = leftRenameArray[i].new;
            }
            for (i = 0; i<$rightOrigNames.length; i++) {
                var index = rImmediates.indexOf(rightRenameArray[i].orig);
                rImmediates[index] = rightRenameArray[i].new;
            }

            // Find out whether any of the immediate names still clash
            for (i = 0; i < $leftRenames.length; i++) {
                if (rImmediates.indexOf($leftRenames.eq(i).find(".newName")
                                                    .val()) > -1) {
                    StatusBox.show(ErrTStr.ColumnConflict, $leftRenames.eq(i),
                                   true);
                    return false;
                }
                var firstIdx = lImmediates.indexOf($leftRenames.eq(i)
                                                       .find(".newName").val());
                if (lImmediates.indexOf($leftRenames.eq(i).find(".newName")
                                                   .val(), firstIdx + 1) > -1) {
                    StatusBox.show(ErrTStr.ColumnConflict, $leftRenames.eq(i),
                                   true);
                    return false;
                }
            }

            for (i = 0; i < $rightRenames.length; i++) {
                if (lImmediates.indexOf($rightRenames.eq(i).find(".newName")
                                                     .val()) > -1) {
                    StatusBox.show(ErrTStr.ColumnConflict, $rightRenames.eq(i),
                                   true);
                    return false;
                }
                var firstIdx = rImmediates.indexOf($rightRenames.eq(i)
                                                       .find(".newName").val());
                if (rImmediates.indexOf($rightRenames.eq(i).find(".newName")
                                                   .val(), firstIdx + 1) > -1) {
                    StatusBox.show(ErrTStr.ColumnConflict, $rightRenames.eq(i),
                                   true);
                    return false;
                }
            }

            // Dedup left and right rename arrays since checks are all passed
            leftRenameArray = leftRenameArray.filter(removeNoChanges);
            rightRenameArray = rightRenameArray.filter(removeNoChanges);

            // Remove user's renames from autoRename array and auto rename the
            // rest
            autoResolveImmediatesCollisions(allClashingImmediatesCache,
                                            lColsToKeep, rColsToKeep,
                                            leftRenameArray, rightRenameArray);

            proceedWithJoin(leftRenameArray, rightRenameArray);
            return true;
        }

        // XXX We should consider caching tableMeta as part of gTables
        var lTableName = xcHelper.getTableNameFromId(lTableId);
        var rTableName = xcHelper.getTableNameFromId(rTableId);
        PromiseHelper.when(XcalarGetTableMeta(lTableName),
                           XcalarGetTableMeta(rTableName))
        .then(function(lTableMeta, rTableMeta) {
            // function getFatPtr(valueAttr) {
            //     if (valueAttr.type === DfFieldTypeT.DfFatptr) {
            //         return true;
            //     } else {
            //         return false;
            //     }
            // }

            function getImmediates(valueAttr) {
                if (valueAttr.type === DfFieldTypeT.DfFatptr) {
                    return false;
                } else {
                    return true;
                }
            }

            function userChosenColCollision(colName) {
                if (lColsToKeep.indexOf(colName) > -1 &&
                    rColsToKeep.indexOf(colName) > -1) {
                    return true;
                } else {
                    return false;
                }
            }

            function keepOnlyNames(valueAttr) {
                return (valueAttr.name);
            }

            // Split valueAttrs into fatPtrs and immediates
            // var lFatptr = lTableMeta.valueAttrs.filter(getFatPtr);
            // var rFatptr = rTableMeta.valueAttrs.filter(getFatPtr);
            var lImmediate = lTableMeta.valueAttrs.filter(getImmediates);
            var rImmediate = rTableMeta.valueAttrs.filter(getImmediates);

            // Today we are only handing immediate collisions. Later we will
            // handle fatptr collisions and prefix renaming for those

            // Only keep column names since we are not doing anything with types
            lImmediate = lImmediate.map(keepOnlyNames);
            rImmediate = rImmediate.map(keepOnlyNames);

            lImmediatesCache = lImmediate;
            rImmediatesCache = rImmediate;

            var lImmediatesToRename = [];
            var rImmediatesToRename = [];

            for (var i = 0; i < lImmediate.length; i++) {
                if (rImmediate.indexOf(lImmediate[i]) > -1) {
                    lImmediatesToRename.push(lImmediate[i]);
                    rImmediatesToRename.push(lImmediate[i]);
                }
            }

            // If none of the columns collide are part of the user's selection
            // then we resolve it underneath the covers and let the user go
            allClashingImmediatesCache = xcHelper.deepCopy(lImmediatesToRename);
            lImmediatesToRename =
                      allClashingImmediatesCache.filter(userChosenColCollision);
            rImmediatesToRename = xcHelper.deepCopy(lImmediatesToRename);

            // Now that we have all the columns that we want to rename, we
            // display the columns and ask the user to rename them
            // XXX Remove when backend fixes their stuff
            if (!turnOnPrefix) {
                proceedWithJoin();
                return true;
            }

            if (lImmediatesToRename.length > 0) {
                $renameSection.show();
            } else {
                var leftAutoRenames = [];
                var rightAutoRenames = [];
                autoResolveImmediatesCollisions(allClashingImmediatesCache,
                                                lColsToKeep, rColsToKeep,
                                                leftAutoRenames,
                                                rightAutoRenames);
                proceedWithJoin(leftAutoRenames, rightAutoRenames);
                return true;
            }

            if (lImmediatesToRename.length > 0) {
                $("#leftTableRenames").show();
                addRenameRows($("#leftRenamePlaceholder"), lImmediatesToRename);
            }

            if (rImmediatesToRename.length > 0) {
                $("#rightTableRenames").show();
                addRenameRows($("#rightRenamePlaceholder"),
                              rImmediatesToRename);
            }
            formHelper.refreshTabbing();
            return false;
        });

        // Should not reach here
        return true;

        function proceedWithJoin(leftRenames, rightRenames) {
            var keepTable = $joinView.find('.keepTablesCBWrap')
                                    .find('.checkbox').hasClass('checked');
            var options = {
                keepLeftCols : lColsToKeep,
                keepRightCols: rColsToKeep,
                keepTables   : keepTable,
                formOpenTime : formOpenTime
            };

            JoinView.close();

            xcFunction.join(lColNums, lTableId, rColNums, rTableId, joinType,
                            newTableName, leftRenames, rightRenames, options);
        }

        function removeNoChanges(elem) {
            return (!(elem.orig === elem.new));
        }
    }

    function autoResolveImmediatesCollisions(clashes,
                                             leftColsToKeep, rightColsToKeep,
                                             leftRenameOut, rightRenameOut) {
        var suff = Math.floor(Math.random() * 1000);
        var i;
        // Remove all leftColsToKeep from clashes
        var leftClashArray = xcHelper.deepCopy(clashes);
        var rightClashArray = xcHelper.deepCopy(clashes);

        for (i = 0; i < leftColsToKeep.length; i++) {
            var idx = leftClashArray.indexOf(leftColsToKeep[i]);
            if (idx > -1) {
                leftClashArray[idx] = undefined;
            }
        }

        for (i = 0; i < rightColsToKeep.length; i++) {
            var idx = rightClashArray.indexOf(rightColsToKeep[i]);
            if (idx > -1) {
                rightClashArray[idx] = undefined;
            }
        }

        // Now that we have undefed all columns that the user has selected,
        // for every idx where both left and right are there, we clear out the
        // right one and rename the left one
        // If both are undefed, this means that the user has resolved this
        // already do we don't have to do anything.
        // If only one is undefed, then we rename the other defined one

        for (i = 0; i < leftClashArray.length; i++) {
            if (leftClashArray[i] === undefined) {
                if (rightClashArray[i] === undefined) {
                    // Both undefined, do nothing
                } else {
                    // Push right clash into rename
                    rightRenameOut.push({
                        "orig": rightClashArray[i],
                        "new" : rightClashArray[i] + "_" + suff
                    });
                }
            } else {
                // For both cases where only left is def or both are def
                // we rename the left
                leftRenameOut.push({
                    "orig": leftClashArray[i],
                    "new" : leftClashArray[i] + "_" + suff
                });
            }
        }

        return;
    }


    function addRenameRows($placeholder, renames) {
        for (var i = 0; i<renames.length; i++) {
            $rename = $(renameTemplate);
            $rename.find(".origName").val(renames[i]);
            $rename.insertBefore($placeholder);
        }
    }

    function addClause($placeholder, noAnimation, tableId, colNum) {
        var $newClause = $(multiClauseTemplate);
        if ($("#joinRightTableList .text").text().trim().length > 0) {
            var $rightClause = $newClause.find(".rightClause");
            xcTooltip.remove($rightClause);
            $rightClause.attr("disabled", false).removeClass("inActive");
        }
        var $div = $newClause.insertBefore($placeholder);
        if (tableId) {
            var colName = gTables[tableId].tableCols[colNum - 1].name;
            $div.find('.arg').eq(0).val(colName);
        } else {
            $div.find('.arg').eq(0).focus();
        }

        if (!noAnimation) {
            $div.hide().slideDown(100);
        }
        formHelper.refreshTabbing();
    }

    function resetJoinView() {
        $clauseContainer.find(".joinClause:not(.placeholder)").remove();
        $clauseContainer.find('.clause').val("");
        $joinView.find('.next').addClass('btn-disabled');
        $rightTableDropdown.find('.text').empty();
        var $subHeading = $rightTableDropdown.siblings('.subHeading');
        $subHeading.find('.iconWrap').addClass('inactive');
        xcTooltip.add($subHeading.find('.tooltipWrap'), {
            "title": JoinTStr.NoRightTable
        });
        isNextNew = true;

        updatePreviewText();
        $joinView.removeClass('nextStep');
        updateJoinTableName();
        resetRenames();
    }

    function updateJoinTableName() {
        var joinTableName = "";
        $joinTableName.val(joinTableName);
    }

    function fillTableLists(origTableId, refresh) {
        var tableLis = xcHelper.getWSTableList();

        $leftTableDropdown.find('ul').html(tableLis);
        $rightTableDropdown.find('ul').html(tableLis);
        var tableName;

        if (refresh) {
            var leftTableName = $leftTableDropdown.find('.text').text();
            $leftTableDropdown.find('li').filter(function() {
                return ($(this).text() === leftTableName);
            }).addClass('selected');

            var rightTableName = $rightTableDropdown.find('.text').text();
            $rightTableDropdown.find('li').filter(function() {
                return ($(this).text() === rightTableName);
            }).addClass('selected');
        } else {
            // select li and fill left table name dropdown
            var tableName = gTables[origTableId].getName();
            $leftTableDropdown.find('.text').text(tableName);
            $leftTableDropdown.find('li').filter(function() {
                return ($(this).text() === tableName);
            }).addClass('selected');
        }
    }

    function getType($th) {
        // match "abc type-XXX abc" and "abc type-XXX"
        var match = $th.attr("class").match(/type-(.*)/)[1];
        // match = "type-XXX" or "type-XXX abc"
        return (match.split(" ")[0]);
    }

    function invalidMultiCaluseTooltip($invalidClause) {
        var id = "#multiJoin";
        var title = JoinTStr.InvalidClause;
        if ($invalidClause == null) {
            // when no clause to join
            $invalidClause = $clauseContainer.find(".joinClause").eq(0);
        }

        showErrorTooltip($invalidClause, {
            "title"    : title,
            "placement": "top",
            "animation": "true",
            "container": id,
            "trigger"  : "manual",
            "template" : TooltipTemplate.Error
        });
    }

    var tooltipTimer;

    function showErrorTooltip($el, options) {
        $el.removeAttr('title');
        $el.removeAttr('data-original-title');
        // cannot overwrite previous title without removing the title attributes
        $el.tooltip("destroy");
        clearTimeout(tooltipTimer);
        $(".tooltip").hide();
        $el.tooltip(options);
        $el.tooltip("show");
        $el.focus();
        tooltipTimer = setTimeout(function() {
            $el.tooltip("destroy");
        }, 2000);
    }

    function suggestJoinKey(tableId, val, $inputToFill, suggTableId) {
        // var tableCols = gTables[tableId].tableCols;
        var col = gTables[tableId].getColByFrontName(val);
        var type = col.type;
        var backColName = col.backName;
        var frontColName = col.name;
        var colNum = gTables[tableId].getColNumByBackName(backColName);

        var context1 = contextCheck($('#xcTable-' + tableId), colNum, type);

        var $thToClick;
        var tableIdToClick;

        // only score that more than -50 will be suggested, can be modified
        var maxScore = -50;

        var $suggTable = $('#xcTable-' + suggTableId);
        $suggTable.find(".header").each(function(index) {
            var $curTh = $(this);

            if (index !== 0 && !$curTh.hasClass('dataCol') &&
                getType($curTh) === type) {
                var context2 = contextCheck($suggTable, index, type);

                var curColName = $curTh.find(".editableHead").val();
                var dist = getTitleDistance(frontColName, curColName);
                var score = getScore(context1, context2, dist, type);

                if (score > maxScore) {
                    maxScore = score;
                    $thToClick = $curTh;
                    tableIdToClick = suggTableId;
                }
            }
        });


        // if find the suggeest join key
        if (tableIdToClick != null) {

            var suggColName = $thToClick.find('.editableHead').val();
            $inputToFill.val(suggColName);

            return true;
        }

        return false;
    }

    function getScore(context1, context2, titleDist, type) {
        // the two value of max, min, sig2, avg..closer, score is better,
        // also, shorter distance, higher score. So those socres are negative

        var score   = 0;
        var bucket  = {};
        var bucket2 = {};
        var match   = 0;

        if (type === "string") {
            // Note: current way is hash each char and count frequency
            // change it if you have better way!
            context1.vals.forEach(function(value) {
                for (var i = 0; i < value.length; i++) {
                    bucket[value.charAt(i)] = true;
                }
            });

            context2.vals.forEach(function(value) {
                for (var i = 0; i < value.length; i++) {
                    bucket2[value.charAt(i)] = true;
                }
            });

            for (var c in bucket2) {
                if (bucket.hasOwnProperty(c)) {
                    if (/\W/.test(c)) {
                        // special char, high weight
                        match += 10;
                    } else {
                        match += 1;
                    }
                }
            }

            if (match === 0) {
                // no match
                return (-Number.MAX_VALUE);
            }

            // for string compare absolute value
            score += match * 3;
            score += Math.abs(context1.max - context2.max) * -1;
            score += Math.abs(context1.min - context2.min) * -1;
            score += Math.abs(context1.avg - context2.avg) * -2;
            score += Math.abs(context1.sig2 - context2.sig2) * -5;
            score += titleDist * -7;
        } else {
            // a base score for number,
            // since limit score to pass is -50
            match = 20;

            // for number compare relative value
            score += match * 3;
            score += calcSim(context1.max, context2.max) * -8;
            score += calcSim(context1.min, context2.min) * -8;
            score += calcSim(context1.avg, context2.avg) * -16;
            score += calcSim(context1.sig2, context2.sig2) * -40;
            score += titleDist * -7;
        }
        return score;
    }

    function calcSim(a, b) {
        var diff = a - b;
        var sum = a + b;

        if (sum === 0) {
            if (diff === 0) {
                // when a === 0 and b === 0
                return 0;
            } else {
                // a = -b, one is positive and one num is negative
                // no similarity
                return 1;
            }
        }
        // range is [0, 1), more close to 0, similar
        return Math.abs(diff / sum);
    }


    function contextCheck($table, colNum, type) {
        // only check number and string
        if (type !== "integer" && type !== "float" && type !== "string") {
            return {"max": 0, "min": 0, "total": 0, "variance": 0};
        }

        var max = Number.MIN_VALUE;
        var min = Number.MAX_VALUE;
        var total = 0;
        var datas = [];
        var values = [];
        var val;

        $table.find("td.col" + colNum).each(function() {
            $textDiv = $(this).find(".originalData");
            val = $textDiv.text();

            var d;

            if (type === "string") {
                if (val == null || val === "") {
                    // skip empty value
                    return;
                }
                d = val.length; // for string, use its length as metrics
            } else {
                d = Number(val);
            }

            values.push(val);
            datas.push(d);
            max = Math.max(d, max);
            min = Math.min(d, min);
            total += d;
        });

        var count = datas.length;
        var avg = total / count;
        var sig2 = 0;

        for (var i = 0; i < count; i++) {
            sig2 += Math.pow((datas[i] - avg), 2);
        }

        return {
            "max" : max,
            "min" : min,
            "avg" : avg,
            "sig2": sig2,
            "vals": values
        };
    }

    function getTitleDistance(name1, name2) {
        if (name1.startsWith("column") || name2.startsWith("column")) {
            // any column has auto-generate column name, then do not check
            return 0;
        }

        name1 = name1.toLowerCase();
        name2 = name2.toLowerCase();

        if (name1 === name2) {
            // same name
            return 0;
        } else if (name1.startsWith(name2) || name2.startsWith(name1)) {
            // which means the name is quite related
            return 2;
        }

        var distArray = levenshteinenator(name1, name2);
        var len = distArray.length;
        var dist = distArray[len - 1][distArray[len - 1].length - 1];

        return (dist);

        // http://andrew.hedges.name/experiments/levenshtein/levenshtein.js
        /**
         * @param String a
         * @param String b
         * @return Array
         */
        function levenshteinenator(a, b) {
            var cost;
            var m = a.length;
            var n = b.length;

            // make sure a.length >= b.length to use O(min(n,m)) space, whatever
            // that is
            if (m < n) {
                var c = a; a = b; b = c;
                var o = m; m = n; n = o;
            }

            var r = []; r[0] = [];
            for (var c = 0; c < n + 1; ++c) {
                r[0][c] = c;
            }

            for (var i = 1; i < m + 1; ++i) {
                r[i] = []; r[i][0] = i;
                for ( var j = 1; j < n + 1; ++j ) {
                    cost = a.charAt( i - 1 ) === b.charAt( j - 1 ) ? 0 : 1;
                    r[i][j] = minimator(r[i - 1][j] + 1, r[i][j - 1] + 1,
                                        r[i - 1][j - 1] + cost);
                }
            }

            return r;
        }

        /**
         * Return the smallest of the three numbers passed in
         * @param Number x
         * @param Number y
         * @param Number z
         * @return Number
         */
        function minimator(x, y, z) {
            if (x < y && x < z) {
                return x;
            }
            if (y < x && y < z) {
                return y;
            }
            return z;
        }
    }


    function updatePreviewText() {
        var joinType = $joinTypeSelect.find(".text").text();
        var lTableName = $leftTableDropdown.find(".text").text();
        var rTableName = $rightTableDropdown.find(".text").text();
        var previewText = '<span class="joinType keyword">' + joinType +
                          '</span> <span class="highlighted">' + lTableName +
                          '</span>, <span class="highlighted">' + rTableName +
                          '</span><br/><span class="keyword">ON </span>';
        var columnPairs = [];
        var pair;
        var lClause;
        var rClause;

        $joinView.find(".joinClause:not(.placeholder)").each(function() {

            var $joinClause = $(this);
            lClause = $joinClause.find(".leftClause").val().trim();
            rClause = $joinClause.find(".rightClause").val().trim();
            pair = [lClause, rClause];
            columnPairs.push(pair);
        });


        var numPairs = columnPairs.length;
        var leftColText;
        var rightColText;

        for (var i = 0; i < numPairs; i++) {
            if (columnPairs[i][0]) {
                leftColText = '<span class="highlighted">' + columnPairs[i][0] +
                              '</span>';
            } else {
                leftColText = "\"\"";
            }
            if (columnPairs[i][1]) {
                rightColText = '<span class="highlighted">' + columnPairs[i][1]+
                              '</span>';
            } else {
                rightColText = "\"\"";
            }
            if (columnPairs[i][0] || columnPairs[i][1]) {
                if (i > 0) {
                    previewText += '<span class="keyword"><br/>AND </span>';
                }
                previewText += leftColText + ' = ' + rightColText;
            }
        }
        previewText += ";";
        $joinView.find('.joinPreview').html(previewText);
    }

    return (JoinView);
}(jQuery, {}));
