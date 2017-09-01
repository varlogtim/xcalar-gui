window.DFParamModal = (function($, DFParamModal){
    var $dfParamModal; // $("#dfParamModal")
    var $paramLists;    // $("#dagModleParamList")
    var $editableRow;   // $dfParamModal.find(".editableRow")
    var $advancedOpts;
    var type;   // dataStore, filter, or export

    var modalHelper;
    var dropdownHelper;
    var filterFnMap = {}; // stores fnName: numArgs
    var defaultParam;
    var xdpMode;
    var hasChange = false;

    var paramListTrLen = 3;
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

    var crt;
    var cover = document.createElement('div');
    cover.innerHTML = '<div class="cover"></div>';

    DFParamModal.setup = function() {
        // constant
        $dfParamModal = $("#dfParamModal");
        $paramLists = $("#dagModleParamList");
        $editableRow = $dfParamModal.find(".editableRow");
        $advancedOpts = $dfParamModal.find(".advancedOpts");
        xdpMode = XVM.getLicenseMode();
        modalHelper = new ModalHelper($dfParamModal, {
            resizeCallback: function() {
                var tableW = $paramLists.closest(".tableContainer").width();
                $paramLists.width(tableW);
            }
        });

        $dfParamModal.find('.cancel, .close').click(function() {
            closeDFParamModal();
        });

        $dfParamModal.find('.confirm').click(function() {
            storeRetina();
        });

        $dfParamModal.on('focus', '.paramVal', function() {
            $(this).select().siblings(".paramEdit").addClass('selected');
        });

        $dfParamModal.on('blur', '.paramVal', function() {
            $(this).siblings(".paramEdit").removeClass('selected');
        });

        $dfParamModal.on('click', '.paramEdit', function() {
            $(this).siblings(".paramVal").focus();
        });

        $dfParamModal.on('click', '.checkbox', function() {
            var $checkbox = $(this);
            $checkbox.toggleClass("checked");
            if ($checkbox.hasClass("checked")) {
                // remove value from input if click on "no value" box
                $checkbox.closest(".row").find(".paramVal").val("");
            }
        });

        $dfParamModal.on("input", ".paramVal", function() {
            // remove "no value" check if the input has text
            $(this).closest(".row").find(".checkbox").removeClass("checked");
        });

        $dfParamModal.on('keydown', '.editableParamDiv', function(event) {
            return (event.which !== keyCode.Enter);
        });

        $dfParamModal.on("click", ".editableTable .defaultParam", function() {
            setParamDivToDefault($(this).siblings("input"));
        });

        $dfParamModal.on("click", ".addParam", function() {
            $dfParamModal.find(".addParam").hide();
            $dfParamModal.find(".newParam").show();
            $dfParamModal.find(".newParam").focus();
        });

        $dfParamModal.on("blur", ".newParam", function() {
            addNewParam();
            return false;
        });

        $dfParamModal.on("keydown", ".newParam", function(event) {
            if (event.which === keyCode.Enter) {
                $dfParamModal.find(".newParam").focusout();
                return false;
            }
        });

        $dfParamModal.on("click", ".deleteParam", function() {
            var $toDelete = $(this).closest(".draggableDiv").find(".value");
            var toDeleteName = $($toDelete).text();
            var retName = $dfParamModal.data("df");
            var df = DF.getDataflow(retName);
            if (df.paramMapInUsed[toDeleteName]) {
                StatusBox.show(ErrTStr.InUsedNoDelete, $(this), false, {
                    'side': 'right'
                });
                return false;
            }
            df.removeParameter(toDeleteName);
            $(this).closest(".draggableDiv").remove();
            hasChange = true;
        });

        function addNewParam() {
            if ($dfParamModal.find(".newParam:visible").length === 0) {
                return;
            }
            var $input = $dfParamModal.find('.newParam');
            var paramName = $input.val().trim();
            var retName = $dfParamModal.data("df");
            var df = DF.getDataflow(retName);

            if (paramName === "") {
                $dfParamModal.find(".newParam").hide();
                $dfParamModal.find(".addParam").show();
            }
            var isValid = xcHelper.validate([
                {
                    "$ele": $input
                },
                {
                    "$ele": $input,
                    "error": ErrTStr.NoSpecialCharOrSpace,
                    "check": function() {
                        return !xcHelper.checkNamePattern("param", "check",
                            paramName);
                    }
                }
            ]);

            if (!isValid) {
                return;
            }
            var text;
            if (df.paramMap.hasOwnProperty(paramName)) {
                text = xcHelper.replaceMsg(ErrWRepTStr.ParamConflict, {
                    "name": paramName
                });
                StatusBox.show(text, $input);
                return;
            }
            if (systemParams.hasOwnProperty(paramName)) {
                text = xcHelper.replaceMsg(ErrWRepTStr.SystemParamConflict, {
                    "name": paramName
                });
                StatusBox.show(text, $input);
                return;
            }
            df.addParameter(paramName);
            var newParam = generateDraggableParams(paramName);
            $(newParam).insertBefore($dfParamModal.find(".inputSection"));
            $input.val("");
            $dfParamModal.find(".newParam").hide();
            $dfParamModal.find(".addParam").show();
            hasChange = true;
        }

        var checkInputTimeout;
        $dfParamModal.on("input", ".editableParamDiv", function() {
            var $input = $(this);
            suggest($input);
            clearTimeout(checkInputTimeout);
            checkInputTimeout = setTimeout(function() {
                checkInputForParam($input);
            }, 200);
        });

        $dfParamModal.on('click', function(event) {
            var $target = $(event.target);
            if ($target.closest('.dropDownList').length === 0) {
                $dfParamModal.find('.list').hide();
            }
        });

        $dfParamModal.on("click", ".advancedOpts .radioButton", function() {
            if (xdpMode === XcalarMode.Mod) {
                return showLicenseTooltip(this);
            }
            if ($('#dfViz').hasClass("hasUnexpectedNode")) {
                return showUnexpectedNodeTip(this);
            }
            var $radioButton = $(this).closest(".radioButton");
            $radioButton.siblings().removeClass("active");
            $radioButton.addClass("active");

            var $section = $dfParamModal.find(".innerEditableRow.filename");
            var $input = $section.find("input");
            var $label = $section.find(".static");

            // toggle the input val between two options
            var currentVal = $input.val();
            $input.val($input.data("cache") || "");
            $input.data("cache", currentVal);

            if ($radioButton.data("option") === "default") {
                $dfParamModal.removeClass("import").addClass("default");
                $label.text(DFTStr.ExportTo + ":");
                checkInputForParam($input);
            } else {
                $dfParamModal.removeClass("default").addClass("import");
                $label.text(DFTStr.ExportToTable + ":");

                if (!$input.hasClass("touched")) {
                    // first time set the naame table
                    var retName = $dfParamModal.data("df");
                    var df = DF.getDataflow(retName);
                    if (df && df.activeSession) {
                        $input.val(df.newTableName);
                    }
                    $input.addClass("touched");
                }
                $paramLists.empty();
                fillUpRows();
            }
        });
    };

    DFParamModal.show = function($currentIcon) {
        var deferred = jQuery.Deferred();
        type = $currentIcon.data('type');
        var tableName = $currentIcon.data('table') || // For aliased tables
                        $currentIcon.data('tablename');
        var dfName = DFCard.getCurrentDF();
        var df = DF.getDataflow(dfName);
        var id = df.getNodeId(tableName);

        $dfParamModal.data({
            "id": id,
            "df": dfName
        });

        $dfParamModal.removeClass("type-dataStore type-filter type-export");
        $dfParamModal.addClass("type-" + type);
        if (type === "filter") {
            $dfParamModal.height(550);
        } else {
            $dfParamModal.height(630);
        }

        var paramValue = $currentIcon.data('paramValue');
        defaultParam = paramValue;

        getExportInfo(type)
        .always(function(info) {
            setupInputText(paramValue, info);
            $("#dfParamModal .editableRow .defaultParam").click();
            var draggableInputs = "";
            DF.getDataflow(dfName).parameters.forEach(function(paramName) {
                if (!systemParams.hasOwnProperty(paramName)) {
                    draggableInputs += generateDraggableParams(paramName);
                }
            });

            var createNewParam = '<div class="inputSection">'+
                                 '<input class="newParam" type="text" placeholder="' +
                                  DFTStr.EnterNewParam +
                                 '"style="display:none" spellcheck="false">'+
                                 '<div class="btn btn-icon addParam">' +
                                 '<i class="icon xi-plus"></i>' +
                                 '<div class="message">'+
                                 DFTStr.NewParam +
                                 '</div>'+
                                 '</div>' +
                                 '</div>';
            $dfParamModal.find('.draggableParams.currParams')
                         .html(draggableInputs + createNewParam);
            draggableInputs = "";
            for (var key in systemParams) {
                draggableInputs += generateDraggableParams(key);
            }
            $dfParamModal.find('.draggableParams.systemParams')
                           .removeClass("hint")
                                .html(draggableInputs);
            fillUpRows(); // parameterlist table
            populateSavedFields(id, dfName);

            modalHelper.setup();
            setupDummyInputs();

            if (type === "filter") {
                filterSetup()
                .then(deferred.resolve)
                .fail(deferred.reject);
            } else {
                if (type === "export") {
                    exportSetup();
                    var retName = $dfParamModal.data("df");
                    var df = DF.getDataflow(retName);
                    if (df && df.activeSession) {
                        $dfParamModal.find(".innerEditableRow.filename input").val(df.newTableName);
                        $paramLists.empty();
                        fillUpRows();
                    }
                }
                dropdownHelper = null;
                deferred.resolve();
            }
        });

        return deferred.promise();
    };

    DFParamModal.paramDragStart = function(event) {
        // duplicate the current parameter and set the opacity to be low
        crt = event.target.cloneNode(true);
        crt.style.opacity = 0.5;
        crt.style.position = "absolute";
        if ($(event.target).closest(".draggableParams").hasClass("currParams")) {
            document.getElementsByClassName("currParams")[0].appendChild(crt);
            document.getElementsByClassName("currParams")[0].appendChild(cover);
        } else {
            document.getElementsByClassName("systemParams")[0].appendChild(crt);
            document.getElementsByClassName("systemParams")[0].appendChild(cover);
        }
        // Used cover to cover the duplicated element
        var top = $(crt).position().top;
        var left = $(crt).position().left;
        $dfParamModal.find(".cover").css({
            'top': top,
            'left': left,
            'position': "absolute",
            'width': $(crt).width() * 2,
            'height': $(crt).height() * 2
        });
        event.dataTransfer.effectAllowed = "copyMove";
        event.dataTransfer.dropEffect = "copy";
        // must add datatransfer to support firefox drag drop
        event.dataTransfer.setData("text", "");
        event.dataTransfer.setData("id", event.target.id);
        event.dataTransfer.setDragImage(crt, 0, 0);
        event.stopPropagation();
        var $origin = $(event.target).parent();
        var origin;
        if ($origin.hasClass('draggableParams')) {
            origin = 'home';
        } else {
            origin = $origin.data('target');
        }

        $dfParamModal.find('input.editableParamDiv').each(function() {
            var width = $(this).width();
            $(this).siblings('.dummyWrap').show().width(width);
            $(this).hide();
        });

        var val;
        var valLen;
        var html = "";
        var chr;
        $dfParamModal.find('input.editableParamDiv').each(function() {
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
        if ($(event.target).closest(".draggableParams").hasClass("currParams")) {
            document.getElementsByClassName("currParams")[0].removeChild(crt);
            document.getElementsByClassName("currParams")[0].removeChild(cover);
        } else {
            document.getElementsByClassName("systemParams")[0].removeChild(crt);
            document.getElementsByClassName("systemParams")[0].removeChild(cover);
        }
        event.stopPropagation();
        $editableRow.data('copying', false);
        $dfParamModal.find('.dummyWrap').hide();
        $dfParamModal.find('input.editableParamDiv').show();
    };

    DFParamModal.paramDropLine = function(event) {
        event.stopPropagation();
        var $dropTarget = $(event.target);
        var $dropTargParent = $dropTarget.parent();
        var paramId = event.dataTransfer.getData("id");

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
        var paramId = event.dataTransfer.getData("id");

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

    function getExportInfo(type) {
        if (type !== "export") {
            return PromiseHelper.resolve({});
        } else {
            var deferred = jQuery.Deferred();
            DSExport.getDefaultPath()
            .then(function(path) {
                deferred.resolve({defaultPath: path});
            })
            .fail(deferred.reject);
            return deferred.promise();
        }
    }

    function setupDummyInputs() {
        var $dummyInputs = $dfParamModal.find('.dummy');
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
    }


    function filterSetup() {
        var deferred = jQuery.Deferred();
        var $list = $dfParamModal.find('.tdWrapper.dropDownList');

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
            "container": "#dfParamModal",
            "bounds": "#dfParamModal .modalTopMain",
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
            // var fns = ret.fnDescs;
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
        return deferred.promise();
    }

    function exportSetup() {
        var $list = $dfParamModal.find('.tdWrapper.dropDownList');

        var dropdownHelper = new MenuHelper($list, {
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

                $list.find('.scrollArea.bottom').css('bottom', 1);
                setTimeout(function() {
                    $list.find('.scrollArea.bottom').css('bottom', 0);
                });
            },
            "container": "#dfParamModal",
            "bounds": "#dfParamModal .modalTopMain",
            "bottomPadding": 2,
            "exclude": '.draggableDiv, .defaultParam'
        });
        dropdownHelper.setupListeners();

        $list.find("input").change(function() {
            var func = $.trim($(this).val());
            updateNumArgs(func);
        });

        $list.find('ul').html(getExportTargetList());
        var $input = $list.find("input.editableParamDiv");
        var func = $.trim($input.val());
        updateNumArgs(func);
    }

    // options:
    //      defaultPath: string, for export
    function setupInputText(paramValue, options) {
        var defaultText = ""; // The html corresponding to Current Query:
        var editableText = ""; // The html corresponding to Parameterized
                                // Query:
        var advancedOpts = "";
        options = options || {};
        if (type === "dataStore") {
            var encodePath = xcHelper.encodeDisplayURL(paramValue[0]);
            defaultText += '<div class="templateRow">' +
                                '<div>' +
                                    DFTStr.PointTo + ':' +
                                '</div>' +
                                '<div class="boxed large">' +
                                    xcHelper.escapeHTMLSpecialChar(encodePath) +
                                '</div>' +
                            '</div>' +
                            '<div class="templateRow">' +
                                '<div>' +
                                    'Pattern' + ':' +
                                '</div>' +
                                '<div class="boxed large">' +
                                    xcHelper.escapeHTMLSpecialChar(paramValue[1]) +
                                '</div>' +
                            '</div>';

            editableText += '<div class="innerEditableRow filename">' +
                                '<div class="static">' +
                                    DFTStr.PointTo + ':' +
                                '</div>' +
                                getParameterInputHTML(0, "large") +
                            '</div>' +
                            '<div class="innerEditableRow">' +
                                '<div class="static">' +
                                    'Pattern' + ':' +
                                '</div>' +
                                getParameterInputHTML(1, "large allowEmpty") +
                            '</div>';
        } else if (type === "export") {

            var path = options.defaultPath || "";
            if (path[path.length - 1] !== "/") {
                path += "/";
            }
            var expName = xcHelper.stripCSVExt(xcHelper
                                        .escapeHTMLSpecialChar(paramValue[0]));
            defaultText += '<div class="templateRow">' +
                                '<div>' +
                                    DFTStr.ExportTo + ':' +
                                '</div>' +
                                '<div class="boxed large">' +
                                    expName +
                                '</div>' +
                            '</div>' +
                            '<div class="templateRow">' +
                                '<div>' +
                                    'Target' + ':' +
                                '</div>' +
                                '<div class="boxed large">' +
                                    xcHelper.escapeHTMLSpecialChar(paramValue[1]) +
                                '</div>' +
                            '</div>';
            editableText +=
                            '<div class="innerEditableRow filename">' +
                                '<div class="static">' +
                                    DFTStr.ExportTo + ':' +
                                '</div>' +
                                getParameterInputHTML(0, "medium-small") +
                            '</div>' +
                            '<div class="innerEditableRow target">' +
                                '<div class="static">' +
                                    'Target' + ':' +
                                '</div>' +
                                getParameterInputHTML(1, "medium-small", {export: true}) +
                            '</div>' +
                            '</div>';
            advancedOpts = '<div class="optionBox radioButtonGroup">' +
                                '<div class="radioButton"' +
                                ' data-option="default">' +
                                    '<div class="radio">' +
                                        '<i class="icon xi-radio-selected"></i>' +
                                        '<i class="icon xi-radio-empty"></i>' +
                                    '</div>' +
                                    '<div class="label">' +
                                        DFTStr.Default +
                                    '</div>' +
                                '</div>' +
                                '<div class="radioButton" data-option="import">' +
                                    '<div class="radio">' +
                                        '<i class="icon xi-radio-selected"></i>' +
                                        '<i class="icon xi-radio-empty"></i>' +
                                    '</div>' +
                                    '<div class="label">' +
                                        DFTStr.Import +
                                    '</div>' +
                                '</div>' +
                            '</div>';
        } else { // not a datastore but a table
            paramValue = paramValue[0];
            if (!checkForOneParen(paramValue)) {
                defaultText += '<div>' +
                                'Filter' + ':' +
                            '</div>' +
                            '<div class="boxed large">' +
                                xcHelper.escapeHTMLSpecialChar(paramValue) +
                            '</div>';

                editableText += '<div class="static">' +
                                'Filter' + ':' +
                            '</div>' +
                            getParameterInputHTML(0, "large");
            } else {
                var retStruct = xcHelper.extractOpAndArgs(paramValue, ',');

                defaultText += '<div>' + type + ':</div>' +
                                '<div class="boxed medium">' +
                                    xcHelper.escapeHTMLSpecialChar(
                                        retStruct.args[0]) +
                                '</div>';

                editableText += '<div class="static">' +
                                    type + ':' +
                                '</div>';

                if (type === "filter") {

                    defaultText += '<div class="static">by</div>' +
                                    '<div class="boxed small">' +
                                    xcHelper.escapeHTMLSpecialChar(retStruct.op) +
                                    '</div>';
                    for (var i = 1; i < retStruct.args.length; i++) {
                        defaultText += '<div class="boxed medium">' +
                                            xcHelper.escapeHTMLSpecialChar(
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

        $dfParamModal.find('.template').html(defaultText);
        $editableRow.html(editableText);
        if (type === "export") {
            $advancedOpts.html(advancedOpts);
            $dfParamModal.addClass("export");
            if (xdpMode === XcalarMode.Demo) {
                xcHelper.disableMenuItem($dfParamModal.find(".advancedOpts [data-option='default']"),
                    {"title": TooltipTStr.NotInDemoMode});
                $dfParamModal.find(".advancedOpts [data-option='import']").click();
            } else {
                var retName = $dfParamModal.data("df");
                var df = DF.getDataflow(retName);
                if (df && df.activeSession) {
                    $dfParamModal.find(".advancedOpts [data-option='import']").click();
                } else {
                    $dfParamModal.find(".advancedOpts [data-option='default']").click();
                }
            }
        } else {
            $dfParamModal.removeClass("export");
            $advancedOpts.html("");
        }
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
        var $paramPart = $dfParamModal.find(".editableTable");
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
            $dfParamModal.find(".editableRow").append(editableText);
        }

        modalHelper.refreshTabbing();
        $editableDivs.each(function() {
            checkInputForParam($(this));
        });
    }

    function addParamToLists(paramName, paramVal, isSystemParam) {
        var $row = $paramLists.find(".unfilled:first");

        if ($row.length === 0) {
            $row = $(trTemplate);
            $paramLists.append($row);
            xcHelper.scrollToBottom($paramLists.closest(".tableContainer"));
        }

        $row.find(".paramName").text(paramName)
            .end()
            .find(".paramVal").val(paramVal === null ? "" : paramVal).removeAttr("disabled")
            .end()
            .removeClass("unfilled");
        if (isSystemParam) {
            $row.addClass("systemParams");
        } else {
            $row.addClass("currParams");
        }
        if (paramVal === "") {
            // When it's from restore and val is empty, it mease
            // previously this param is saved as "allow empty"
            $row.find(".checkbox").addClass("checked");
        }
    }

    function setParamDivToDefault($paramDiv) {
        var target = $paramDiv.data("target");
        var paramNames = [];
        var defaultVal = $dfParamModal.find(".templateTable .boxed")
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
        if ($dfParamModal.hasClass("export") && $dfParamModal.hasClass("import")) {
            return;
        }
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
                if (systemParams.hasOwnProperty(param)) {
                    addParamToLists(param, CommonTxtTstr.DefaultVal, true);
                } else {
                    var df = DF.getDataflow(DFCard.getCurrentDF());
                    var paramVal = df.getParameter(param);
                    addParamToLists(param, paramVal, false);
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

    // parameter - value table
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
        var $paramPart = $dfParamModal.find(".editableTable");
        var $editableDivs = $paramPart.find('input.editableParamDiv');
        var $paramInputs = $dfParamModal.find('input.editableParamDiv');
        var isValid = true;
        var params;
        var dagNodeId = $dfParamModal.data("id");
        var retName = $dfParamModal.data("df");
        var radioButton = $dfParamModal.find(".radioButton.active");
        if (radioButton.length === 1 && $(radioButton).data("option") === "import") {
            storeExportToTableNode();
        } else {
            storeOtherNodes();
        }
        return deferred.promise();

        function storeExportToTableNode() {
            var activeSession = true;
            var newTableName = $paramInputs.val().trim();
            var isValid = checkExistingTableName($paramInputs);
            if (!isValid) {
                deferred.reject();
                return;
            } else {
                var activeSessionOptions = {
                    "activeSession": activeSession,
                    "newTableName": newTableName
                };
                DF.saveAdvancedExportOption(retName, activeSessionOptions);
                df = DF.getDataflow(retName);
                df.updateParameterizedNode(dagNodeId, {"paramType": XcalarApisT.XcalarApiExport}, true);
                closeDFParamModal();
                deferred.resolve();
                return;
            }
        }
        function storeOtherNodes() {
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
                return;
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
                return;
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
                return;
            }

            if (hasInvalidExportPath(params)) {
                deferred.reject();
                return;
            }

            if (hasInvalidExportTarget(params)) {
                deferred.reject();
                return;
            }

            var retName = $dfParamModal.data("df");
            var df = DF.getDataflow(retName);
            var paramInfo;
            updateRetina()
            .then(function(paramInformation) {
                // store meta
                paramInfo = paramInformation;
                df.updateParameters(params);
                if (type === "export") {
                    DF.deleteActiveSessionOption(retName);
                }
                return PromiseHelper.alwaysResolve(df.updateParamMapInUsed());
            })
            .then(function() {
                DFCard.updateRetinaTab(retName);
                var noParams = params.length === 0;
                if (!df.getParameterizedNode(dagNodeId)) {
                    var val = genOrigQueryStruct();
                    df.addParameterizedNode(dagNodeId, val, paramInfo, noParams);
                } else {
                    // Only updates view. Doesn't change any stored information
                    df.updateParameterizedNode(dagNodeId, paramInfo, noParams);
                }

                if (DF.hasSchedule(retName)) {
                    return DF.updateScheduleForDataflow(retName);
                } else {
                    return PromiseHelper.resolve();
                }
            })
            .then(function() {
                // show success message??
                DF.commitAndBroadCast(retName);
                hasChange = false;
                var successMsg;
                if (params.length) {
                    successMsg = SuccessTStr.OperationParameterized;
                } else {
                    successMsg = SuccessTStr.ChangesSaved;
                }
                xcHelper.showSuccess(successMsg);
                deferred.resolve();
            })
            .fail(function(error) {
                updateRetinaErrorHandler(error);
                deferred.reject();
            });
        }

        function genOrigQueryStruct() {

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
                        var arg;
                        paramQuery = [str1, filterText];
                        for (var i = 2; i < $oldVals.length; i++) {
                            arg = $.trim($oldVals.eq(i).text());
                            paramQuery.push(arg);
                        }
                    }
                    break;
                case ("dataStore"):
                    paramType = XcalarApisT.XcalarApiBulkLoad;
                    var url = $.trim($oldVals.eq(0).text());
                    var pattern =  $.trim($oldVals.eq(1).text());
                    paramQuery = [url, pattern];
                    break;
                case ("export"):
                    paramType = XcalarApisT.XcalarApiExport;
                    var fileName = $.trim($oldVals.eq(0).text());
                    var targetName = $.trim($oldVals.eq(1).text());
                    fileName += ".csv";
                    paramQuery = [fileName, targetName];
                    break;
            }

            return {
                "paramType": paramType,
                "paramValue": paramQuery
            };
        }

        function decodeURL(url) {
            if (url.startsWith(FileProtocol.mapR) &&
                defaultParam && defaultParam[0])
            {
                var defaultPath = defaultParam[0];
                var index = defaultPath.indexOf("@");
                if (index > 0) {
                    // encodePreifx is "mapr://redacted:redacted"
                    var prefix = defaultPath.substring(0, index + 1);
                    var encodePrefix = xcHelper.encodeDisplayURL(prefix);
                    if (url.startsWith(encodePrefix)) {
                        // if not changed, then restore, otherwise,
                        // it's the change of user/passowrd
                        return xcHelper.decodeDisplayURL(defaultPath, url);
                    }
                }
            }
            return url;
        }

        // will close the modal if passes checks
        function updateRetina() {
            var deferred = jQuery.Deferred();
            var paramType = null;
            var paramValue;
            var paramValues = {};
            var paramQuery;
            var error = false;
            switch (type) {
                case ("filter"):
                    paramType = XcalarApisT.XcalarApiFilter;
                    if ($editableDivs.length === 1) {
                        paramValue = $.trim($editableDivs.eq(0).val());
                    } else {
                        var filterText = $.trim($editableDivs.eq(1).val());
                        var str1 = $.trim($editableDivs.eq(0).val());
                        var filterExists = checkIfValidFilter(filterText,
                                                              $editableDivs.eq(1),
                                                              params);

                        if (!filterExists) {
                            deferred.reject(ErrTStr.FilterTypeNoSupport);
                            return (deferred.promise());
                        }

                        var additionalArgs = "";
                        var arg;
                        for (var i = 2; i < $editableDivs.length; i++) {
                            arg = $.trim($editableDivs.eq(i).val());
                            additionalArgs += arg + ",";
                        }
                        additionalArgs = additionalArgs.slice(0, -1);
                        if (additionalArgs.length) {
                            additionalArgs = "," + additionalArgs;
                        }

                        paramValue = filterText + "(" + str1 +
                                                    additionalArgs + ")";
                    }
                    paramValues.filterStr = paramValue;
                    paramQuery = [paramValue];
                    break;
                case ("dataStore"):
                    paramType = XcalarApisT.XcalarApiBulkLoad;
                    var url = $.trim($editableDivs.eq(0).val());
                    url = decodeURL(url);
                    var pattern = $.trim($editableDivs.eq(1).val());
                    paramValues.datasetUrl = url;
                    paramValues.namePattern = pattern;
                    paramQuery = [url, pattern];
                    break;
                case ("export"):
                    paramType = XcalarApisT.XcalarApiExport;
                    var fileName = $.trim($editableDivs.eq(0).val());
                    fileName += ".csv";
                    var targetName = $.trim($editableDivs.eq(1).val());

                    paramValues.fileName = fileName;
                    paramValues.targetName = targetName;
                    var paramTargetName = getTargetName(targetName, params);
                    var target = DSExport.getTarget(paramTargetName);
                    if (target) {
                        paramValues.targetType = target.type;
                        paramQuery = [fileName, targetName, paramValues.targetType];
                    } else {
                        error = "target not found";
                    }
                    break;
                default:
                    deferred.reject("currently not supported");
                    break;
            }
            if (error) {
                deferred.reject(error);
            } else if (paramType == null) {
                deferred.reject("currently not supported");
            } else {
                closeDFParamModal(true);
                XcalarUpdateRetina(retName, dagNodeId, paramType, paramValues)
                .then(function() {
                    return XcalarGetRetina(retName);
                })
                .then(function(retStruct) {
                    DF.getDataflow(retName).retinaNodes =
                                                retStruct.retina.retinaDag.node;
                    var paramInfo = {
                        "paramType": paramType,
                        "paramValue": paramQuery
                    };
                    deferred.resolve(paramInfo);
                })
                .fail(deferred.reject);
            }

            return (deferred.promise());
        }
    }

    function checkExistingTableName($input) {
        var isValid = xcHelper.tableNameInputChecker($input, {
            "onErr": function() {},
            side: "left"
        });
        return isValid;
    }

    function updateRetinaErrorHandler(error) {
        if (error === ErrTStr.FilterTypeNoSupport) {
            // modal would still be open
            var $editableDivs = $dfParamModal.find(".editableTable")
                                             .find('input.editableParamDiv');
            StatusBox.show(error, $editableDivs.eq(1));
        } else {
            Alert.error(DFTStr.UpdateParamFail, error);
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
            find = "<" + xcHelper.escapeRegExp(param) + ">";
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

    function getTargetName(targetName, params) {
        var numParams = params.length;
        var find;
        var rgx;
        var param;
        var val;
        var paramTargetName = targetName;
        for (var i = 0; i < numParams; i++) {
            param = params[i].name;
            val = params[i].val;
            find = "<" + xcHelper.escapeRegExp(param) + ">";
            rgx = new RegExp(find, 'g');
            paramTargetName = paramTargetName.replace(rgx, val);
        }
        return paramTargetName;
    }

    // returns true if doesn't have .extension
    function hasInvalidExportPath(params) {
        if (type !== "export") {
            return false;
        }

        var $input = $dfParamModal.find(".editableTable")
                                .find("input.editableParamDiv").eq(0);
        var val =  $input.val();
        for (var i = 0; i < params.length; i++) {
            var name = xcHelper.escapeRegExp(params[i].name);
            var regex = new RegExp("<" + name + ">", "g");
            val = val.replace(regex, params[i].val);
        }

        if (val.includes("/")) {
            StatusBox.show(DFTStr.InvalidExportPath, $input);
            return true;
        } else {
            return false;
        }
    }

    function hasInvalidExportTarget(params) {
        if (type !== "export") {
            return false;
        }

        var $input = $dfParamModal.find(".editableTable")
                                .find("input.editableParamDiv").eq(1);
        var targetName =  $input.val();
        var paramTargetName = getTargetName(targetName, params);
        var target = DSExport.getTarget(paramTargetName);
        if (target) {
            return false;
        } else {
            StatusBox.show(DFTStr.InvalidTarget, $input);
            return true;
        }
    }

    function getParameterInputHTML(inputNum, extraClass, options) {
        var divClass = "editableParamDiv boxed";
        options = options || {};
        if (extraClass != null) {
            divClass += " " + extraClass;
        }
        var td = '';
        if (options.filter || options.export) {
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

        if (options.filter || options.export) {
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

    function getExportTargetList() {
        var res = "";
        var exportTargetObj = DSExport.getTargets();
        if (exportTargetObj) {
            var targets = exportTargetObj[0].targets;
            for (var i = 0; i < targets.length; i++) {
                var target = targets[i];
                if (target) {
                    res += "<li name=" + target.name + ">" + target.name + "</li>";
                }
            }
        }
        return res;
    }

    function populateSavedFields(dagNodeId, retName) {
        var df = DF.getDataflow(retName);
        var retinaNode = df.getParameterizedNode(dagNodeId);
        var paramMap = df.paramMap;
        var nameMap = {};
        // Here's what we are doing:
        // For parameterized nodes, the retDag is actually the post-param
        // version, so we must store the original pre-param version.
        // This is what is stored in the df's paramMap and parameterizedNodes
        // struct. Upon getting the dag, we first assume that everything is not
        // parameterized, and stick everything into the template. We then
        // iterate through the parameterized nodes array and apply the
        // parameterization by moving the template values to the new values,
        // and setting the template values to the ones that are stored inside
        // paramMap.
        if (retinaNode != null && retinaNode.paramValue != null) {
            var $templateVals = $dfParamModal.find(".template .boxed");
            var i = 0;
            var parameterizedVals = [];
            var paramVal;

            $templateVals.each(function() {
                parameterizedVals.push(decodeURI($(this).text()));
            });

            for (; i < retinaNode.paramValue.length; i++) {
                if (!$templateVals.eq(i).length) {
                    // more params than there are divs
                    var html = '<div class="boxed medium"></div>';
                    $dfParamModal.find(".template").append(html);
                    $templateVals = $dfParamModal.find(".template .boxed");
                }
                paramVal = retinaNode.paramValue[i];
                if (retinaNode.paramType === XcalarApisT.XcalarApiExport &&
                    i === 0) {
                    paramVal = xcHelper.stripCSVExt(paramVal);
                }
                $templateVals.eq(i).text(paramVal);
            }
            $dfParamModal.find(".template .boxed:gt(" +
                            (retinaNode.paramValue.length - 1) + ")").remove();
            if ($dfParamModal.find(".template .boxed").length === 1) {
                $dfParamModal.find(".template").find(".static").remove();
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

            // keep the order of paramName the in df.parameters
            df.parameters.forEach(function(paramName) {
                if (nameMap.hasOwnProperty(paramName)
                    && (!systemParams.hasOwnProperty(paramName))) {
                    addParamToLists(paramName, paramMap[paramName], false);
                }
            });

            for (var systemParam in systemParams) {
                if (nameMap.hasOwnProperty(systemParam)) {
                    addParamToLists(systemParam, CommonTxtTstr.DefaultVal,
                    true);
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
                    (systemParams.hasOwnProperty(paramName)
                    ? ""
                    : '<i class="icon xi-close deleteParam"></i>') +
                '</div>';

        return (html);
    }

    function closeDFParamModal(noCommit) {
        if (!noCommit) {
            if (hasChange) {
                hasChange = false;
                var retName = $dfParamModal.data("df");
                DF.commitAndBroadCast(retName);
            }
        }
        modalHelper.clear();
        $editableRow.empty();
        $dfParamModal.find('.draggableParams').empty();
        $paramLists.empty();
        defaultParam = null;
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
