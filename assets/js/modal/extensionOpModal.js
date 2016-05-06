window.ExtensionOpModal = (function(ExtensionOpModal, $) {
    var $extModal; // $("#extensionOpModal");
    var modalHelper;
    var exModName;
    var exFnName;
    var exColNum;
    var exTableId;
    var extensionMap = {};

    // constant
    var minHeight = 200;
    var minWidth = 305;
    var maxWidth = 1000;
    var $lastInputFocused;

    ExtensionOpModal.setup = function() {
        $extModal = $("#extensionOpModal");

        modalHelper = new ModalHelper($extModal, {
            "minHeight": minHeight,
            "minWidth" : minWidth,
            "noResize": true
        });

        $extModal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": 'window'
        });

        $extModal.resizable({
            "handles"    : "e, w",
            "minHeight"  : minHeight,
            "minWidth"   : minWidth,
            "containment": "document"
        });

        $extModal.on("click", ".close, .cancel", function() {
            closeExtModal();
        });

        $extModal.on("click", ".confirm", function() {
            submitForm();
        });

        addListeners();

    };

    function addListeners() {
        $extModal.on('focus', 'input', function() {
            $lastInputFocused = $(this);
        });

        $extModal.on("keypress", ".argument", function() {
            if (event.which === keyCode.Enter &&
                    !modalHelper.checkBtnFocus())
            {
                $(this).blur();
                submitForm();
            }
        });
    }

    ExtensionOpModal.show = function(colNum, tableId, modName, fnName,
                                              title) {
        exColNum = colNum;
        exTableId = tableId;
        exModName = modName;
        exFnName = fnName;

        modalHelper.setup({
            "open"  : function() {
                // modal has its own opener
                return PromiseHelper.resolve();
            }
        });

        xcHelper.toggleModal(tableId, false, {
            "fadeOutTime": 300
        });

        if (gMinModeOn) {
            $extModal.show();
        } else {
            $extModal.fadeIn(300);
        }

        $extModal.find('.modalHeader').find('.text').text(title);
        updateInputFields();
        setModalWidth();
        $('#xcTable-' + tableId).find('.col' + colNum)
                                .addClass('modalHighlighted');
        var $firstInput = $extModal.find('input').eq(0).focus();
        $lastInputFocused = $firstInput;

        $('#xcTable-' + tableId).on('click.columnPicker', '.header, td.clickable',
            function(event) {
            xcHelper.fillInputFromCell(event, $lastInputFocused, "");
        });
        $('#xcTable-' + tableId).on('mousedown', '.header, td.clickable',
                                    keepInputFocused);
    };

    ExtensionOpModal.addButton = function(modName, fnName, arrayOfFields) {
        if (!extensionMap.hasOwnProperty(modName)) {
            extensionMap[modName] = {};
        }
        extensionMap[modName][fnName] = arrayOfFields;
    };

    ExtensionOpModal.getAllButtons = function() {
        return (extensionMap);
    };

    ExtensionOpModal.close = closeExtModal;

    function keepInputFocused(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    function submitForm() {
        var argList = {};
        var $arguments = $extModal.find(".argument");
        var args = extensionMap[exModName][exFnName];
        $arguments.each(function(i) {
            argList[args[i].fieldClass] = $(this).val();
        });
        var success = ColManager.extension(exColNum, exTableId,
                                            exModName + "::" + exFnName,
                                            argList);
        if (typeof success !== "boolean" || success) {
            closeExtModal();
        } else {
            // returned fail, keep modal open to show fail error message
            // next to input
        }
    }

    function closeExtModal() {
        var time = 1;
        $extModal.fadeOut(time, function() {
            modalHelper.clear({"close": function() {
                // ops modal has its owne closer
                return PromiseHelper.resolve();
            }});

            $('#xcTable-' + exTableId).off('click.columnPicker');
            $('#xcTable-' + exTableId).off('mousedown', '.header, td.clickable',
                                        keepInputFocused);
        });
        $('#xcTable-' + exTableId).find('.col' + exColNum)
                                  .removeClass('modalHighlighted');
        var isHide = true;
        xcHelper.toggleModal(exTableId, isHide, {
            "time": time
        });
        StatusBox.forceHide();// hides any error boxes;
        $('.tooltip').hide();
    }

    function updateInputFields() {
        var $argSection = $extModal.find('.argSection');
        var args = extensionMap[exModName][exFnName];
        var inputFieldHtml = "";
        var descsHtml = "";
        var argsHtml = "";
        var allNumbers = true;
        var inputType = "text";
        for (var i = 0; i < args.length; i++) {
            inputType = "text";
            if (args[i].type === "number") {
               inputType = "number";
            } else {
                allNumbers = false;
            }
            descsHtml += '<div class="cell type-' + args[i].type +'">' +
                          args[i].name + ':</div>';
            argsHtml += '<div class="cell type-' + args[i].type + '">' +
                            '<div class="inputWrap">' +
                                '<input class="argument" ' +
                                'type="' + inputType + '" ' +
                                'spellcheck="false">';
            if (inputType === "text") {
                argsHtml += '<div class="argIconWrap">' +
                                '<span class="icon"></span>' +
                              '</div>';
            }
            argsHtml +=   '</div>' +
                        '</div>';
        }
        var $descCol = $argSection.find('.descs');
        var $argCol = $argSection.find('.args');
        $descCol.html(descsHtml);
        $argCol.html(argsHtml);

        if (allNumbers) {
            $descCol.addClass('allNumbers');
            $argCol.addClass('allNumbers');
            $extModal.addClass('allNumbers');
        } else {
            $descCol.removeClass('allNumbers');
            $argCol.removeClass('allNumbers');
            $extModal.removeClass('allNumbers');
        }
    }


    function setModalWidth() {
        var formPct = 0.85;
        var $descCol = $extModal.find('.descs');
        var $argCol = $extModal.find('.args');
        $extModal.width(maxWidth);
        var formWidth = $descCol.width() + $argCol.width();
        var modalMinWidth = formWidth / formPct;

        modalMinWidth = Math.max(modalMinWidth, minWidth);
        modalMinWidth = Math.min(modalMinWidth, maxWidth,
                                ($(window).width() - 10));
        $extModal.width(modalMinWidth);
        centerPositionElement($extModal, {
            "limitTop": true
        });
    }

    return (ExtensionOpModal);
}({}, jQuery));
