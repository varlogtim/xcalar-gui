window.DFParamModal = (function($, DFParamModal){
    var $dfgParamModal; // $("#dfgParameterModal")

    var $paramLists;    // $("#dagModleParamList")
    var $editableRow;   // $dfgParamModal.find(".editableRow")
    var $iconTrigger;   // Which icon triggered this modal

    var validParams = [];
    var modalHelper;
    var dropdownHelper;
    var filterFnMap = {}; // stores fnName: numArgs

    var paramListTrLen = 7;
    var trTemplate =
        '<div class="row unfilled">' +
            '<div class="cell paramNameWrap textOverflowOneLine">' +
                '<div class="paramName"></div>' +
            '</div>' +
            '<div class="cell paramValWrap textOverflowOneLine">' +
                '<input class="paramVal" spellcheck="false" disabled/>' +
                '<div class="paramEdit">' +
                    '<i class="fa-15 icon xi-edit"></i>' +
                '</div>' +
            '</div>' +
            '<div class="cell paramActionWrap">' +
                '<div class="checkbox">' +
                    '<i class="icon xi-ckbox-empty fa-15"></i>' +
                    '<i class="icon xi-ckbox-selected fa-15"></i>' +
                '</div>' +
            '</div>' +
        '</div>';

    DFParamModal.setup = function() {
        // constant
        var minHeight = 425;
        var minWidth  = 800;

        $dfgParamModal = $("#dfgParameterModal");
        $paramLists = $("#dagModleParamList");
        $editableRow = $dfgParamModal.find(".editableRow");
        modalHelper = new ModalHelper($dfgParamModal, {
            "minHeight": minHeight,
            "minWidth": minWidth,
            resizeCallback: function() {
                var tableW = $paramLists.closest(".tableContainer").width();
                $paramLists.width(tableW);
            }
        });

        $dfgParamModal.draggable({
            "handle": ".modalHeader",
            "cursor": "-webkit-grabbing",
            "containment": "window"
        });

        $dfgParamModal.resizable({
            "handles": "n, e, s, w, se",
            "minHeight": minHeight,
            "minWidth": minWidth,
            "containment": "document",
            "resize": function() {
                // need a fixed width to fix the scroll bar
                var tableW = $paramLists.closest(".tableContainer").width();
                $paramLists.width(tableW);
            }
        });

        $dfgParamModal.find('.cancel, .close').click(function() {
            closeDFParamModal();
        });

        $dfgParamModal.find('.confirm').click(function() {
            storeRetina();
        });

        $dfgParamModal.on('focus', '.paramVal', function() {
            $(this).select().siblings(".paramEdit").addClass('selected');
        });

        $dfgParamModal.on('blur', '.paramVal', function() {
            $(this).siblings(".paramEdit").removeClass('selected');
        });

        $dfgParamModal.on('click', '.paramEdit', function() {
            $(this).siblings(".paramVal").focus();
        });

        $dfgParamModal.on('click', '.checkbox', function() {
            $(this).toggleClass("checked");
        });

        $dfgParamModal.on('keypress', '.editableParamDiv', function(event) {
            return (event.which !== keyCode.Enter);
        });

        $dfgParamModal.on("click", ".editableTable .defaultParam", function() {
            setParamDivToDefault($(this).siblings("input"));
        });

        var checkInputTimeout;
        $dfgParamModal.on("input", ".editableParamDiv", function() {
            var $input = $(this);
            suggest($input);
            clearTimeout(checkInputTimeout);
            checkInputTimeout = setTimeout(function() {
                checkInputForParam($input);
            }, 200);
        });

        $dfgParamModal.on('click', function(event) {
            var $target = $(event.target);
            if ($target.closest('.dropDownList').length === 0) {
                $dfgParamModal.find('.list').hide();
            }
        });

        $dfgParamModal.draggable({
            handle: '.modalHeader',
            containment: 'window',
            cursor: '-webkit-grabbing'
        });
    };

    DFParamModal.show = function($currentIcon) {
        var deferred = jQuery.Deferred();
        var type = $currentIcon.data('type');
        var tableName = $currentIcon.data('table') || // For aliased tables
                        $currentIcon.data('tablename');
        var dfName = DFCard.getCurrentDF();
        var df = DF.getDataflow(dfName);
        var id = df.nodeIds[tableName];

        $iconTrigger = $currentIcon; // Set cache

        $dfgParamModal.data({
            "id": id,
            "dfg": dfName
        });

        var paramValue = decodeURI($currentIcon.data('paramValue'));
        setupInputText(paramValue, type);

        var draggableInputs = "";
        validParams = [];
        DF.getDataflow(dfName).parameters.forEach(function(paramName) {
            draggableInputs += generateDraggableParams(paramName);
            validParams.push(paramName);
        });

        if (draggableInputs === "") {
            draggableInputs = DFTStr.AddParamHint;
            $dfgParamModal.find('.draggableParams.currParams').addClass("hint")
                        .html(draggableInputs);
        } else {
            $dfgParamModal.find('.draggableParams.currParams').removeClass("hint")
                            .html(draggableInputs);
        }

        draggableInputs = "";
        for (var key in systemParams) {
            draggableInputs += generateDraggableParams(key);
        }
        $dfgParamModal.find('.draggableParams.systemParams').removeClass("hint")
                            .html(draggableInputs);

        fillUpRows();
        populateSavedFields(id, dfName);

        modalHelper.setup();

        var $dummyInputs = $dfgParamModal.find('.dummy');
        $dummyInputs.on('dragenter', '.line', function() {
            $dummyInputs.find('.line, .space').removeClass('hover');
            $(this).addClass('hover');
        });
        $dummyInputs.on('dragenter', '.space', function() {
            $dummyInputs.find('.line, .space').removeClass('hover');
            $(this).addClass('hover');
        });
        $dummyInputs.on('dragleave', '.line', function() {
            $(this).removeClass('hover');
        });
        $dummyInputs.on('dragleave', '.space', function() {
            $(this).removeClass('hover');
        });

        if (type === "filter") {
            var $list = $dfgParamModal.find('.tdWrapper.dropDownList');

            dropdownHelper = new MenuHelper($list, {
                "onSelect": function($li) {
                    var func = $li.text();
                    var $input = $list.find("input.editableParamDiv");

                    if (func === $.trim($input.val())) {
                        return;
                    }

                    $input.val(func);
                    updateNumArgs(func);
                },
                "onOpen": function() {
                    var $lis = $list.find('li')
                                    .sort(sortHTML)
                                    .show();
                    $lis.prependTo($list.find('ul'));
                    $list.find('ul').width($list.width() - 1);

                    //XXX 10-19-2016 need to shake it or it doesn't show up
                    $list.find('.scrollArea.bottom').css('bottom', 1);
                    setTimeout(function() {
                        $list.find('.scrollArea.bottom').css('bottom', 0);
                    });
                },
                "container": "#dfgParameterModal",
                "bounds": "#dfgParameterModal .modalTopMain",
                "bottomPadding": 2,
                "exclude": '.draggableDiv, .defaultParam'
            });
            dropdownHelper.setupListeners();

            $list.find("input").change(function() {
                var func = $.trim($(this).val());
                updateNumArgs(func);
            });

            XcalarListXdfs('*', 'Conditional*')
            .then(function(ret) {
                var numXdfs = ret.numXdfs;
                var html = "";
                var fnNames = [];
                var fns = ret.fnDescs;
                for (var i = 0; i < numXdfs; i++) {
                    fnNames.push(ret.fnDescs[i].fnName);
                    filterFnMap[ret.fnDescs[i].fnName] = ret.fnDescs[i].numArgs;
                }

                fnNames = fnNames.sort();
                for (i = 0; i < numXdfs; i++) {
                    html += '<li>' + fnNames[i] + '</li>';
                }
                $list.find('ul').html(html);

                var $input = $list.find("input.editableParamDiv");
                var func = $.trim($input.val());
                updateNumArgs(func);

                deferred.resolve();
            })
            .fail(function(error) {
                Alert.error(DFTStr.ParamModalFail, error);
                deferred.reject();
            });
        } else {
            dropdownHelper = null;
            deferred.resolve();
        }

        return deferred.promise();
    };

    DFParamModal.paramDragStart = function(event) {
        event.dataTransfer.effectAllowed = "copyMove";
        event.dataTransfer.dropEffect = "copy";
        event.dataTransfer.setData("text", event.target.id);
        event.stopPropagation();
        var $origin = $(event.target).parent();
        var origin;
        if ($origin.hasClass('draggableParams')) {
            origin = 'home';
        } else {
            origin = $origin.data('target');
        }

        $dfgParamModal.find('input.editableParamDiv').each(function() {
            var width = $(this).width();
            $(this).siblings('.dummyWrap').show().width(width);
            $(this).hide();
        });

        var val;
        var valLen;
        var html = "";
        var chr;
        $dfgParamModal.find('input.editableParamDiv').each(function() {
            val = $(this).val();
            valLen = val.length;
            html = "";
            for (var i = 0; i < valLen; i++) {
                chr = val[i];
                if (chr === " ") {
                    chr = "&nbsp;";
                }
                html += '<span class="line" ' +
                      'ondragover="DFParamModal.allowParamDrop(event)" ' +
                      'ondrop="DFParamModal.paramDropLine(event)">' + chr +
                      '</span>';
            }
            html += '<span class="space" ' +
                    'ondragover="DFParamModal.allowParamDrop(event)" ' +
                    'ondrop="DFParamModal.paramDropSpace(event)"></span>';
            $(this).siblings('.dummyWrap').find('.dummy').html(html);
        });

        $editableRow.data('origin', origin);
    };

    DFParamModal.paramDragEnd = function (event) {
        event.stopPropagation();
        $editableRow.data('copying', false);
        $dfgParamModal.find('.dummyWrap').hide();
        $dfgParamModal.find('input.editableParamDiv').show();
    };

    DFParamModal.paramDropLine = function(event) {
        event.stopPropagation();
        var $dropTarget = $(event.target);
        var $dropTargParent = $dropTarget.parent();
        var paramId = event.dataTransfer.getData("text");

        var $draggableParam = $('#' + paramId);

        var index = $dropTarget.index();
        var currentText = $dropTargParent.text();
        var firstPart = currentText.substr(0, index);
        var secondPart = currentText.substr(index - currentText.length);
        var newVal = firstPart + $draggableParam.text() + secondPart;
        $dropTargParent.text(newVal);
        $dropTargParent.parent().siblings('input').val(newVal);

        checkInputForParam($dropTargParent.parent().siblings('input'));
    };

    DFParamModal.paramDropSpace = function(event) {
        event.stopPropagation();
        var $dropTarget = $(event.target);
        var $dropTargParent = $dropTarget.parent();
        var paramId = event.dataTransfer.getData("text");

        var $draggableParam = $('#' + paramId);

        var currentText = $dropTargParent.text();
        var newVal = currentText + $draggableParam.text();
        $dropTargParent.text(newVal);

        $dropTargParent.parent().siblings('input').val(newVal);
        checkInputForParam($dropTargParent.parent().siblings('input'));
    };

    DFParamModal.allowParamDrop = function(event) {
        event.preventDefault();
    };

    function setupInputText(paramValue, type) {
        var defaultText = ""; // The html corresponding to Current Query:
        var editableText = ""; // The html corresponding to Parameterized
                                // Query:

        if (type === "dataStore") {
            defaultText += '<div>' +
                                DFTStr.PointTo + ':' +
                            '</div>' +
                            '<div class="boxed large">' +
                                xcHelper.escapeHTMLSepcialChar(paramValue) +
                            '</div>';

            editableText += '<div class="static" data-op="load">' +
                                DFTStr.PointTo + ':' +
                            '</div>' +
                            getParameterInputHTML(0, "large");
        } else if (type === "export") {
            defaultText += '<div>' +
                                DFTStr.ExportTo + ':' +
                            '</div>' +
                            '<div class="boxed large">' +
                                xcHelper.escapeHTMLSepcialChar(paramValue) +
                            '</div>';
            editableText += '<div class="static" data-op="export">' +
                                DFTStr.ExportTo + ':' +
                            '</div>' +
                            getParameterInputHTML(0, "large");
        } else { // not a datastore but a table
            if (!checkForOneParen(paramValue)) {
                defaultText += '<div>' +
                                'Filter' + ':' +
                            '</div>' +
                            '<div class="boxed large">' +
                                xcHelper.escapeHTMLSepcialChar(paramValue) +
                            '</div>';

                editableText += '<div class="static" data-op="' + type + '">' +
                                'Filter' + ':' +
                            '</div>' +
                            getParameterInputHTML(0, "large");
            } else {
                var retStruct = xcHelper.extractOpAndArgs(paramValue, ',');

                defaultText += '<div>' + type + ':</div>' +
                                '<div class="boxed medium">' +
                                    xcHelper.escapeHTMLSepcialChar(
                                        retStruct.args[0]) +
                                '</div>';

                editableText += '<div class="static" data-op="' + type + '">' +
                                    type + ':' +
                                '</div>';

                if (type === "filter") {

                    defaultText += '<div class="static">by</div>' +
                                    '<div class="boxed small">' +
                                    xcHelper.escapeHTMLSepcialChar(retStruct.op) +
                                    '</div>';
                    for (var i = 1; i < retStruct.args.length; i++) {
                        defaultText += '<div class="boxed medium">' +
                                            xcHelper.escapeHTMLSepcialChar(
                                                retStruct.args[i]) +
                                        '</div>';
                    }

                    editableText +=
                            getParameterInputHTML(0, "medium") +
                            '<div class="static">by</div>' +
                            getParameterInputHTML(1, "small", {filter: true});
                    for (var i = 1; i < retStruct.args.length; i++) {
                        editableText +=
                                getParameterInputHTML(1 + i, "medium allowEmpty");
                    }
                } else {
                    // index, sort, map etc to be added in later
                    defaultText += '<div class="static">by</div>';
                }
            }
        }

        $dfgParamModal.find('.template').html(defaultText);
        $editableRow.html(editableText);
    }

    // returns true if exactly 1 open paren exists
    function checkForOneParen(paramValue) {
        var val;
        var inQuote = false;
        var isEscaped = false;
        var singleQuote = false;
        var braceFound = false;
        for (var i = 0; i < paramValue.length; i++) {
            val = paramValue[i];
            if (isEscaped) {
                isEscaped = false;
                continue;
            }
            switch (val) {
                case ("\\"):
                    isEscaped = true;
                    break;
                case ("'"):
                    if (inQuote && singleQuote) {
                        inQuote = false;
                        singleQuote = false;
                    } else if (!inQuote) {
                        inQuote = true;
                        singleQuote = true;
                    }
                    break;
                case ('"'):
                    if (!inQuote || (inQuote && !singleQuote)) {
                        inQuote = !inQuote;
                    }
                    break;
                case ("("):
                    if (!inQuote) {
                        if (braceFound) {
                            return false;
                        } else {
                            braceFound = true;
                        }
                    }

                    break;
                default:
                    break;
            }
        }
        return braceFound;
    }

    function suggest($input) {
        var value = $.trim($input.val()).toLowerCase();
        var $list = $input.siblings('.list');
        if ($list.length === 0) {
            // when no list to suggest
            return;
        }

        $list.show().find('li').hide();

        var $visibleLis = $list.find('li').filter(function() {
            return (value === "" ||
                    $(this).text().toLowerCase().indexOf(value) !== -1);
        }).show();

        $visibleLis.sort(sortHTML).prependTo($list.find('ul'));

        if (dropdownHelper) {
            dropdownHelper.showOrHideScrollers();
        }

        if (value === "") {
            return;
        }

        // put the li that starts with value at first,
        // in asec order

        for (var i = $visibleLis.length; i >= 0; i--) {
            var $li = $visibleLis.eq(i);
            if ($li.text().startsWith(value)) {
                $list.find('ul').prepend($li);
            }
        }
        if ($list.find('li:visible').length === 0) {
            $list.hide();
        }
    }

    function sortHTML(a, b){
        return ($(b).text()) < ($(a).text()) ? 1 : -1;
    }

    function updateNumArgs(func) {
        var numArgs = filterFnMap[func];
        if (numArgs == null) { // entry could be misspelled or empty
            return;
        }
        var $paramPart = $dfgParamModal.find(".editableTable");
        var $editableDivs = $paramPart.find('input.editableParamDiv');
        var numDivs = $editableDivs.length - 1; // don't count the op div
        if (numDivs === numArgs) {
            return;
        }
        $paramPart.find(".tdWrapper:gt(" + numArgs + ")").remove();

        if (numArgs > numDivs) {
            var editableText = "";
            for (var i = numDivs; i < numArgs; i++) {
                editableText +=
                getParameterInputHTML(1 + i, "medium allowEmpty");
            }
            $dfgParamModal.find(".editableRow").append(editableText);
        }

        modalHelper.refreshTabbing();
        $editableDivs.each(function() {
            checkInputForParam($(this));
        });
    }

    function addParamToLists(paramName, paramVal, isRestore, isSystemParam) {
        var $row = $paramLists.find(".unfilled:first");

        if ($row.length === 0) {
            $row = $(trTemplate);
            $paramLists.append($row);
            xcHelper.scrollToBottom($paramLists.closest(".tableContainer"));
        }

        $row.find(".paramName").text(paramName)
            .end()
            .find(".paramVal").val(paramVal).removeAttr("disabled")
            .end()
            .removeClass("unfilled");
        if (isSystemParam) {
            $row.addClass("systemParams");
        } else {
            $row.addClass("currParams");
        }
        if (isRestore && paramVal === "") {
            // When it's from restore and val is empty, it mease
            // previously this param is saved as "allow empty"
            $row.find(".checkbox").addClass("checked");
        }
    }

    function setParamDivToDefault($paramDiv) {
        var target = $paramDiv.data("target");
        var paramNames = [];
        var defaultVal = $dfgParamModal.find(".templateTable .boxed")
                                        .eq(target).text();

        paramNames = getParamsInInput($paramDiv);

        $paramDiv.val(defaultVal);
        paramNames.forEach(function(name) {
            updateParamList(name);
        });
    }

    function getParamsInInput($input) {
        var val = $input.val();
        var len = val.length;
        var param = "";
        var params = [];
        var braceOpen = false;
        for (var i = 0; i < len; i++) {
            if (braceOpen) {
                if (val[i] === ">") {
                    params.push(param);
                    param = "";
                    braceOpen = false;
                } else {
                    param += val[i];
                }
            }
            if (val[i] === "<") {
                braceOpen = true;
            }
        }
        return (params);
    }

    function updateParamList(paramName) {
        var params = [];
        var tempParams;
        var numDups = 0;
        $editableRow.find('input').each(function() {
            tempParams = getParamsInInput($(this));
            params = params.concat(tempParams);
        });
        for (var i = 0; i < params.length; i++) {
            if (params[i] === paramName) {
                numDups++;
            }
        }

        if (numDups > 0) {
            return;
        }

        // if no dups, clear the param in param list table
        $paramLists.find(".paramName").filter(function() {
            return ($(this).text() === paramName);
        }).closest(".row").remove();

        fillUpRows();
    }

    function checkInputForParam($input) {
        var params = getParamsInInput($input);
        var param;
        var $paramNames = $paramLists.find(".paramName");
        var $paramFound;

        for (var i = 0; i < params.length; i++) {
            param = params[i];
            $paramFound = $paramNames.filter(function() {
                return ($(this).text() === param);
            });
            if (!$paramFound.length) {
                if (validParams.indexOf(param) !== -1) {
                    var dfg = DF.getDataflow($dfgParamModal.data("dfg"));
                    var paramVal = dfg.getParameter(param) || "";
                    addParamToLists(param, paramVal, false, false);
                } else if (systemParams.hasOwnProperty(param)) {
                    addParamToLists(param, CommonTxtTstr.DefaultVal, false, true);
                }
            }
        }

        params = [];
        var tempParams;
        $editableRow.find("input").each(function() {
            tempParams = getParamsInInput($(this));
            params = params.concat(tempParams);
        });

        var $params = $paramLists.find(".row:not(.unfilled)").find('.paramName');
        $params.each(function() {
            if (params.indexOf($(this).text()) === -1) {
                $(this).closest(".row").remove();
            }
        });

        fillUpRows();
    }

    function fillUpRows() {
        var curRowLen = $paramLists.find(".row").length;
        if (curRowLen < paramListTrLen) {
            var trsNeeded = paramListTrLen - curRowLen;
            var html = "";
            for (var i = 0; i < trsNeeded; i++) {
                html += trTemplate;
            }
            $paramLists.append(html);
        }
    }

    function checkValidBrackets($input) {
        var val = $input.val();
        var len = val.length;
        var braceOpen = false;
        for (var i = 0; i < len; i++) {
            if (braceOpen) {
                if (val[i] === ">") {
                    braceOpen = false;
                }
            } else if (val[i] === "<") {
                braceOpen = true;
            }
        }
        return (!braceOpen);
    }

    // submit
    function storeRetina() {
        //XX need to check if all default inputs are filled
        var deferred = jQuery.Deferred();
        var $paramPart = $dfgParamModal.find(".editableTable");
        var $editableDivs = $paramPart.find('input.editableParamDiv');
        var $paramInputs = $dfgParamModal.find('input.editableParamDiv');
        var isValid = true;
        var params;
        // check for valid brackets or invalid characters
        $paramInputs.each(function() {
            isValid = checkValidBrackets($(this));
            if (!isValid) {
                StatusBox.show(ErrTStr.UnclosedParamBracket, $(this));
                return false;
            }
            params = getParamsInInput($(this));
            for (var i = 0; i < params.length; i++) {
                isValid = xcHelper.checkNamePattern("param", "check",
                                                    params[i]);
                if (!isValid) {
                    StatusBox.show(ErrTStr.NoSpecialCharInParam, $(this));
                    var paramIndex = $(this).val().indexOf(params[i]);
                    this.setSelectionRange(paramIndex,
                                           paramIndex + params[i].length);
                    return false;
                }
            }
        });

        if (!isValid) {
            deferred.reject();
            return deferred.promise();
        }

        // check for empty param values
        $editableDivs.each(function() {
            var $div = $(this);
            if (!$div.hasClass("allowEmpty") && $.trim($div.val()) === "") {
                isValid = false;
                StatusBox.show(ErrTStr.NoEmptyMustRevert, $div);
                return false;
            }
        });

        if (!isValid) {
            deferred.reject();
            return deferred.promise();
        }

        params = [];
        var $invalidTr;
        $paramLists.find(".row:not(.unfilled)").each(function() {
            var $row = $(this);
            var name = $row.find(".paramName").text();
            var val = $.trim($row.find(".paramVal").val());
            var check = $row.find(".checkbox").hasClass("checked");

            if ($row.hasClass("currParams")) {
                if (val === "" && !check) {
                    isValid = false;
                    $invalidTr = $row;
                    return false; // stop iteration
                }

                params.push({
                    "name": name,
                    "val": val
                });
            } else if ($row.hasClass("systemParams")) {
                if (systemParams.hasOwnProperty(name)) {
                    params.push({
                        "name": name,
                        "val": systemParams[name]
                    });
                } else {
                    isValid = false;
                    $invalidTr = $row;
                    return false; // stop iteration
                }
            }
        });

        if (!isValid) {
            var $paramVal = $invalidTr.find(".paramVal");
            StatusBox.show(ErrTStr.NoEmptyOrCheck, $paramVal);
            deferred.reject();
            return deferred.promise();
        }

        if (hasInvalidExportSuffix(params)) {
            StatusBox.show(DFTStr.NoFileExt, $editableDivs.eq(0));
            deferred.reject();
            return deferred.promise();
        }

        var retName = $dfgParamModal.data("dfg");
        var dfg = DF.getDataflow(retName);
        var dagNodeId = $dfgParamModal.data("id");
        var curParamInfo;

        updateRetina()
        .then(function(paramInfo) {
            curParamInfo = paramInfo;
            // store meta
            dfg.updateParameters(params);

            DFCard.updateRetinaTab(retName);

            if (!dfg.getParameterizedNode(dagNodeId)) {
                var val = genOrigQueryStruct();
                dfg.addParameterizedNode(dagNodeId, val, curParamInfo);
            } else {
                // Only updates view. Doesn't change any stored information
                dfg.updateParameterizedNode(dagNodeId, curParamInfo);
            }

            closeDFParamModal();
            // show success message??
            xcHelper.sendSocketMessage("refreshDataflow");
            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error(DFTStr.UpdateParamFail, error);
            deferred.reject();
        });

        return deferred.promise();

        function genOrigQueryStruct() {
            var type = $iconTrigger.data('type');
            var $oldVals = $(".template .boxed");
            var paramType;
            var paramValue;
            var paramQuery;
            switch (type) {
                case ("filter"):
                    paramType = XcalarApisT.XcalarApiFilter;
                    if ($oldVals.length === 1) {
                        paramValue = $.trim($oldVals.eq(0).text());
                        paramQuery = [paramValue];
                    } else {
                        var filterText = $.trim($oldVals.eq(1).text());
                        var str1 = $.trim($oldVals.eq(0).text());
                        var additionalArgs = "";
                        var arg;
                        paramQuery = [str1, filterText];
                        for (var i = 2; i < $oldVals.length; i++) {
                            arg = $.trim($oldVals.eq(i).text());
                            additionalArgs += arg + ",";
                            paramQuery.push(arg);
                        }
                        additionalArgs = additionalArgs.slice(0, -1);
                        if (additionalArgs.length) {
                            additionalArgs = "," + additionalArgs;
                        }
                        paramValue = filterText + "(" + str1 +
                                                    additionalArgs + ")";
                    }

                    break;
                case ("dataStore"):
                    paramType = XcalarApisT.XcalarApiBulkLoad;
                    paramValue = $.trim($oldVals.eq(0).text());
                    paramQuery = [paramValue];
                    break;
                case ("export"):
                    paramType = XcalarApisT.XcalarApiExport;
                    paramValue = $.trim($oldVals.eq(0).text());
                    paramQuery = [paramValue];
                    break;
            }
            return {
                "paramType": paramType,
                "paramValue": paramValue,
                "paramQuery": paramQuery
            };
        }

        function updateRetina() {
            var deferred  = jQuery.Deferred();
            var operation = $paramPart.find(".editableRow").children().first()
                                                                    .data("op");
            var paramType = null;
            var paramValue;
            var paramQuery;
            // var paramInput = new XcalarApiParamInputT();
            switch (operation) {
                case ("filter"):
                    paramType = XcalarApisT.XcalarApiFilter;
                    if ($editableDivs.length === 1) {
                        paramValue = $.trim($editableDivs.eq(0).val());
                        paramQuery = [paramValue];
                    } else {
                        var filterText = $.trim($editableDivs.eq(1).val());
                        var str1 = $.trim($editableDivs.eq(0).val());
                        var filterExists = checkIfValidFilter(filterText,
                                                              $editableDivs.eq(1),
                                                              params);

                        if (!filterExists) {
                            deferred.reject("Filter type not currently supported.");
                            return (deferred.promise());
                        }

                        var additionalArgs = "";
                        var arg;
                        paramQuery = [str1, filterText];
                        for (var i = 2; i < $editableDivs.length; i++) {
                            arg = $.trim($editableDivs.eq(i).val());
                            additionalArgs += arg + ",";
                            paramQuery.push(arg);
                        }
                        additionalArgs = additionalArgs.slice(0, -1);
                        if (additionalArgs.length) {
                            additionalArgs = "," + additionalArgs;
                        }

                        paramValue = filterText + "(" + str1 +
                                                    additionalArgs + ")";
                    }


                    // paramInput.paramFilter = new XcalarApiParamFilterT();
                    // paramInput.paramFilter.filterStr = str;
                    break;
                case ("load"):
                    paramType = XcalarApisT.XcalarApiBulkLoad;
                    paramValue = $.trim($editableDivs.eq(0).val());
                    // paramInput.paramLoad = new XcalarApiParamLoadT();
                    // paramInput.paramLoad.datasetUrl = str;
                    paramQuery = [paramValue];
                    break;
                case ("export"):
                    paramType = XcalarApisT.XcalarApiExport;
                    paramValue = $.trim($editableDivs.eq(0).val());
                    paramQuery = [paramValue];
                    break;
                default:
                    deferred.reject("currently not supported");
                    break;
            }

            if (paramType == null) {
                deferred.reject("currently not supported");
            } else {
                XcalarUpdateRetina(retName, dagNodeId, paramType, paramValue)
                .then(function() {
                    return XcalarGetRetina(retName);
                })
                .then(function(retStruct) {
                    DF.getDataflow(retName).retinaNodes =
                                                retStruct.retina.retinaDag.node;
                    var paramInfo = {
                        "paramType": paramType,
                        "paramValue": paramValue,
                        "paramQuery": paramQuery
                    };
                    deferred.resolve(paramInfo);
                })
                .fail(deferred.reject);
            }

            return (deferred.promise());
        }
    }

    function checkIfValidFilter(filterText, $input, params) {
        var numParams = params.length;
        var find;
        var rgx;
        var param;
        var val;
        var filterParamText = filterText;
        for (var i = 0; i < numParams; i++) {
            param = params[i].name;
            val = params[i].val;
            find = "<" + param + ">";
            rgx = new RegExp(find, 'g');
            filterParamText = filterParamText.replace(rgx, val);
        }

        // Check if filterParamText matches a filter type from dropdown list
        var $lis = $input.siblings('.list').find('li');
        var filterExists = $lis.filter(function() {
            return ($(this).text() === filterParamText);
        }).length;

        return (filterExists);
    }

    // returns true if doesn't have .extension
    function hasInvalidExportSuffix(params) {
        var type = $iconTrigger.data('type');
        if (type !== "export") {
            return false;
        }
        $dfgParamModal.find(".editableTable");
        var val =  $dfgParamModal.find(".editableTable")
                                 .find('input.editableParamDiv').val();

        for (var i = 0; i < params.length; i++) {
            var regex = new RegExp("<" + params[i].name + ">", "g");
            val = val.replace(regex, params[i].val);
        }
        var index = val.indexOf(".");
        if (index === -1 || index === (val.length - 1)) {
            return true;
        } else {
            return false;
        }
    }

    function getParameterInputHTML(inputNum, extraClass, options) {
        var divClass = "editableParamDiv boxed";
        options = options || {};
        if (extraClass != null) {
            divClass += " " + extraClass;
        }
        var td = '';
        if (options.filter) {
            td += '<div class="tdWrapper dropDownList boxed ' + extraClass + '">';
        } else {
            td += '<div class="tdWrapper boxed ' + extraClass + '">';
        }

        td += '<input class="' + divClass + '" ' +
                'data-target="' + inputNum + '" ' +
                'spellcheck="false" type="text">' +
                '<div class="dummyWrap ' + divClass + '">' +
                '<div class="dummy ' + divClass + '" ' +
                'ondragover="DFParamModal.allowParamDrop(event)" ' +
                'data-target="' + inputNum + '"></div></div>';

        if (options.filter) {
            td += '<div class="list">' +
                    '<ul><li>first item</li></ul>' +
                    '<div class="scrollArea top">' +
                        '<div class="arrow"></div>' +
                    '</div>' +
                    '<div class="scrollArea bottom">' +
                        '<div class="arrow"></div>' +
                    '</div>' +
                  '</div>';
        }

        td += '<div title="' + CommonTxtTstr.DefaultVal + '" ' +
                'class="defaultParam iconWrap xc-action" ' +
                'data-toggle="tooltip" ' +
                'data-placement="top" data-container="body">' +
                    '<i class="icon xi-restore center fa-15"></i>' +
                '</div>' +
                '</div>';
        return (td);
    }

    function populateSavedFields(dagNodeId, retName) {
        var dfg = DF.getDataflow(retName);
        var retinaNode = dfg.getParameterizedNode(dagNodeId);
        var paramMap = dfg.paramMap;
        var nameMap = {};
        // Here's what we are doing:
        // For parameterized nodes, the retDag is actually the post-param
        // version, so we must store the original pre-param version.
        // This is what is stored in the dfg's paramMap and parameterizedNodes
        // struct. Upon getting the dag, we first assume that everything is not
        // parameterized, and stick everything into the template. We then
        // iterate through the parameterized nodes array and apply the
        // parameterization by moving the template values to the new values,
        // and setting the template values to the ones that are stored inside
        // paramMap.

        if (retinaNode != null && retinaNode.paramQuery != null) {
            var $templateVals = $dfgParamModal.find(".template .boxed");
            var i = 0;
            var parameterizedVals = [];

            $templateVals.each(function() {
                parameterizedVals.push(decodeURI($(this).text()));
            });

            for (; i < retinaNode.paramQuery.length; i++) {
                if (!$templateVals.eq(i).length) {
                    // more params than there are divs
                    var html = '<div class="boxed medium"></div>';
                    $dfgParamModal.find(".template").append(html);
                    $templateVals = $dfgParamModal.find(".template .boxed");
                }
                $templateVals.eq(i).text(retinaNode.paramQuery[i]);
            }
            $dfgParamModal.find(".template .boxed:gt(" +
                            (retinaNode.paramQuery.length - 1) + ")").remove();
            if ($dfgParamModal.find(".template .boxed").length === 1) {
                $dfgParamModal.find(".template").find(".static").remove();
            }

            var $editableDivs = $editableRow.find("input.editableParamDiv");

            parameterizedVals.forEach(function(query, index) {
                var html = query;
                var len = query.length;
                var p = 0;
                var startIndex;
                var endIndex;
                var paramName;

                while (p < len) {
                    startIndex = query.indexOf("<", p);
                    if (startIndex < 0) {
                        // do not find <,
                        break;
                    }

                    endIndex = query.indexOf(">", startIndex);
                    if (endIndex < 0) {
                        // do not find >,
                        break;
                    }

                    // when find a "<>"
                    paramName = query.substring(startIndex + 1, endIndex);
                    if (paramMap.hasOwnProperty(paramName)) {
                        nameMap[paramName] = true;
                    }

                    p = endIndex + 1;
                }

                $editableDivs.eq(index).val(html);
            });

            // keep the order of paramName the in dfg.parameters
            dfg.parameters.forEach(function(paramName) {
                if (nameMap.hasOwnProperty(paramName)) {
                    addParamToLists(paramName, paramMap[paramName], true, false);
                }
            });

            for (var systemParam in systemParams) {
                if (nameMap.hasOwnProperty(systemParam)) {
                    addParamToLists(systemParam, CommonTxtTstr.DefaultVal,
                    true, true);
                }
            }
        }
    }

    function generateDraggableParams(paramName) {
        var html = '<div id="draggableParam-' + paramName +
                '" class="draggableDiv" ' +
                'draggable="true" ' +
                'ondragstart="DFParamModal.paramDragStart(event)" ' +
                'ondragend="DFParamModal.paramDragEnd(event)" ' +
                'ondrop="return false" ' +
                'title="' + CommonTxtTstr.HoldToDrag + '" ' +
                'contenteditable="false">' +
                    '<i class="icon xi-move"></i>' +
                    '<span class="delim"><</span>' +
                    '<span class="value">' + paramName + '</span>' +
                    '<span class="delim">></span>' +
                '</div>';

        return (html);
    }

    function closeDFParamModal() {
        modalHelper.clear();
        $editableRow.empty();
        $dfgParamModal.find('.draggableParams').empty();
        $paramLists.empty();
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DFParamModal.__testOnly__ = {};
        DFParamModal.__testOnly__.storeRetina = storeRetina;
        DFParamModal.__testOnly__.closeDFParamModal = closeDFParamModal;
        DFParamModal.__testOnly__.checkForOneParen = checkForOneParen;
        DFParamModal.__testOnly__.suggest = suggest;
        DFParamModal.__testOnly__.checkInputForParam = checkInputForParam;
    }
    /* End Of Unit Test Only */


    return (DFParamModal);

}(jQuery, {}));
