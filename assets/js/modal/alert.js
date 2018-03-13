window.Alert = (function($, Alert){
    var $modal;   // $("#alertModal")
    var $modalBg; // $("#modalBackground")
    var $btnSection; // $("#alertActions")

    var modalHelper;

    Alert.setup = function() {
        $modal = $("#alertModal");
        $modalBg = $("#modalBackground");
        $btnSection = $("#alertActions");

        modalHelper = new ModalHelper($modal, {
            "center": {"verticalQuartile": true},
            "sizeToDefault": true
        });

        var alertList = new MenuHelper($modal.find(".dropDownList"), {
            "onSelect": function($li) {
                $("#alertOptionInput").val($li.text()).focus();
            }
        });
        alertList.setupListeners();

        $("#alertDetail .detailAction").click(function() {
            $modal.toggleClass("expandDetail");
        });
    };

    Alert.show = function(options) {
        options = options || {};
       /* options includes:
            title: title of the alert
            instr: instruction information
            instrTemplate: instead of change instr text, change it's html
            msg: alert content
            msgTemplate: instead of change alert text, change its html
            isAlert: if it is an alert or a confirm
            isCheckBox: if checkbox is enabled or disabled
            modal: an modal element that trigger the alert
            optList: an object to setup datalist in alert modal, it contains:
                label: label to show
                list: options in the datalist
            buttons: buttons to show instead of confirm button which contains:
                name: name of the button
                className: class of the button
                func: callback to trigger when click,
                tooltip: tooltip to add
            hideButtons: array of button class names to hide,
                        values can be: logout, copyLog, or cancel
            onConfirm: callback to trigger when click confirm button
            onCancel:  callback to trigger when click cancel button
            lockScreen: if screen should be frozen
            focusOnConfirm: boolean, if true then set focus on confirm button,
            highZIndex: boolean, if true then will set z-index above locked
                        background modal,
            ultraHighZIndex: boolean, if true then will set z-index above locked
                        waiting screen
            align: it is left, with do left align,
            sizeToText: when set true, size the modal to align text
            noLogout: remove log out button when  set true
        */
        if (options.noLogout) {
            $modal.find(".btn.logout").remove();
        }

        if ($modal.hasClass("locked")) {
            // this handle the case that some modal failure handler
            // may close the modal and it will hide modalBackground
            $modalBg.show();
            $modalBg.addClass("locked");
            // alert modal is already opened and locked due to connection error
            return $modal.data("id");
        } else if ($("#container").hasClass("supportOnly") &&
            options.lockScreen) {
            // do not show any more modals that lock the screen
            return $modal.data("id");
        }

        // add id
        var id = xcHelper.randName("alert");
        $modal.data("id", id);

        // call it here because alert.show() may be called when another alert is visible
        clean();
        configAlertModal(options);

        var extraOptions = {
            "keepFnBar": options.keepFnBar
        };
        if (options.lockScreen) {
            extraOptions = {"noEsc": true};
            $modalBg.addClass("locked");
            $("#container").addClass("locked");
            // should not show initial screen
            $("#initialLoadScreen").hide();
        }

        if (options.highZindex) {
            $modal.addClass("highZindex");
        } else {
            $modal.removeClass("highZindex");
        }
        if (options.ultraHighZindex) {
            $modal.addClass("ultraHighZindex");
        } else {
            $modal.removeClass("ultraHighZindex");
        }

        var $text = $("#alertContent .text");
        if (options.align === "left") {
            $text.addClass("left-align");
        } else {
            $text.removeClass("left-align");
        }

        modalHelper.setup(extraOptions);

        if ($modal.find("button:visible").length > 3) {
            $modal.addClass("flex");
        } else {
            $modal.removeClass("flex");
        }

        if (window.isBrowserIE) { // all text will be on 1 line otherwise
            var width = $modal.width();
            setTimeout(function() {
                $modal.width(parseInt(width) + 1);
                setTimeout(function() {
                    $modal.width(width);
                });
            });
        } else if (options.sizeToText) {
            sizeToText();
        }

        return id;
    };

    Alert.error = function(title, error, options) {
        var type = typeof error;
        var msg;
        var log = null;

        if (type === "object") {
            // if it's an try/catch error, code will also goes here
            msg = error.error || AlertTStr.ErrorMsg;
            log = error.log;
        } else {
            msg = error;
        }
        if (msg === undefined) {
            msg = title;
        }

        var alertOptions = {
            "title": title,
            "msg": msg,
            "detail": log,
            "isAlert": true
        };
        alertOptions = $.extend(options, alertOptions);
        return Alert.show(alertOptions);
    };

    Alert.forceClose = function(keepBg) {
        closeAlertModal();
        $modal.removeClass("locked");
        if (!keepBg) {
            $modalBg.removeClass("locked");
        }
    };

    // hides the alert modal but doesn't close/reset  it
    Alert.tempHide = function() {
        $modal.addClass("xc-hidden");
    };

    Alert.unhide = function() {
        $modal.removeClass("xc-hidden");
    };

    Alert.getOptionVal = function() {
        var val = $("#alertOptionInput").val().trim();
        return val;
    };

    Alert.updateMsg = function(id, msg) {
        if (id == null || $modal.data("id") !== id) {
            console.error("wrong alert id!");
            return;
        }
        $("#alertContent .text").text(msg);
    };

    Alert.isChecked = function() {
        var $checkbox = $("#alertCheckBox");
        return $checkbox.find(".checkbox").hasClass("checked");
    };

    Alert.isVisible = function() {
        return $modal.is(":visible");
    };

    function closeAlertModal($modalContainer) {
        modalHelper.clear({"close": function() {
            // alert modal has its own closer
            return closeHelper($modalContainer);
        }});
        $modal.removeData("id");
    }

    function closeHelper($modalContainer) {
        var deferred = PromiseHelper.deferred();
        if ($modalContainer) {
            $modal.hide();
            $modalContainer.css("z-index", 40);
            deferred.resolve();
        } else if ($(".modalContainer:visible:not(#alertModal):" +
                     "not(.noBackground)").length > 0) {
            // apart from alert modal, other modal is on
            $modal.hide();
            deferred.resolve();
        } else {
            var fadeOutTime = gMinModeOn ? 0 : 300;
            $modal.hide();
            $modalBg.fadeOut(fadeOutTime, deferred.resolve);
        }

        return deferred.promise();
    }

    function clean() {
        $btnSection.find(".funcBtn").remove();
        $btnSection.find(".copyLog, .logout, .genSub, .adminSupport").remove();
        // remove all event listener
        $modal.off(".alert");
        $modal.find(".confirm, .cancel, .close").show();
    }

    // configuration for alert modal
    /* Cheng: how alertModal behaves when checkbox is checbox to
        "don't show again" may need further discussion */
    function configAlertModal(options) {
        options = options || {};
        // set title
        var title = options.title || AlertTStr.Title;
        $("#alertHeader").find(".text").text(title);

        // set alert message
        var $alertContent = $("#alertContent");
        var msgTemplate = options.msgTemplate || null;
        if (msgTemplate != null) {
            // put inside span so innerHtml isn't affected by flexbox
            $alertContent.find(".text").html('<span>' + msgTemplate + '</span>');
        } else {
            var msg = options.msg || "";
            $alertContent.find(".text").empty().text(msg);
        }

        if (options.detail != null && options.detail !== "") {
            $modal.addClass("hasDetail").removeClass("expandDetail");
            $("#alertDetail").find(".detailContent").text(options.detail);
        } else {
            $modal.removeClass("hasDetail").removeClass("expandDetail");
            $("#alertDetail").find(".detailContent").text("");
        }

        // set alert instruction
        var $alertInstr = $("#alertInstruction");
        if (options.instr != null || options.instrTemplate != null) {
            if (options.instrTemplate != null) {
                $alertInstr.find(".text").html(options.instrTemplate);
            } else {
                $alertInstr.find(".text").text(options.instr);
            }
            $alertInstr.show();
            $modal.addClass("hasInstr");
        } else {
            $alertInstr.hide();
            $modal.removeClass("hasInstr");
        }

        // set checkbox,  default is unchecked
        var $checkbox = $("#alertCheckBox");
        $checkbox.find(".checkbox").removeClass("checked");
        if (options.isCheckBox) {
            $modal.on("click.alert", ".checkboxSection", function(event) {
                event.stopPropagation();
                $(this).find(".checkbox").toggleClass("checked");
            });
            $checkbox.show();
            $modal.addClass("hasCheckbox");
        } else {
            $checkbox.hide();
            $modal.removeClass("hasCheckbox");
        }

        // set option list
        var $optionSection = $alertContent.find(".options");
        $("#alertOptionInput").val("");
        if (options.optList) {
            $("#alertlist").empty().append(options.optList.list);
            $("#alertOptionLabel").text(options.optList.label + ":");
            $optionSection.show();
            $modal.addClass("withOptions");
        } else {
            $optionSection.hide();
            $modal.removeClass("withOptions");
        }

        if (options.userInput) {
            $("#alertUserInputArea").removeClass("xc-hidden");
            $("#alertUserInputArea").find(".label").html(options.userInput.label);
            $("#alertUserInput").val(options.userInput.autofill);
            setTimeout(function() {
                // otherwise it doesn't get focused and range doesn't get
                // selected
                $("#alertUserInput").focus().range(0);
            }, 0);
        } else {
            $("#alertUserInputArea").addClass("xc-hidden");
            $("#alertUserInputArea").find(".label").empty();
            $("#alertUserInput").val("");
        }

        if (options.modal) {
            var $container = options.modal;
            $container.css("z-index", 15);
        }

        // set close and cancel button
        $modal.on("click.alert", ".close, .cancel", function(event) {
            event.stopPropagation();
            closeAlertModal(options.modal);
            if (options.onCancel instanceof Function) {
                options.onCancel();
            }
        });

        // set confirm button
        $modal.on("click.alert", ".confirm", function(event) {
            event.stopPropagation();
            closeAlertModal();
            if (options.onConfirm instanceof Function) {
                options.onConfirm();
            }
        });

        var $confirmBtn = $btnSection.find(".confirm");

        if (options.noCancel) {
            $modal.find(".close, .cancel").hide();
        }

        if (options.buttons) {
            $modal.find(".cancel").text(AlertTStr.CANCEL);
            $confirmBtn.hide();
            options.buttons.forEach(function(btnOption) {
                var className = "funcBtn";
                if (btnOption.className) {
                    className += " " + btnOption.className;
                }

                var $btn = $confirmBtn.clone();
                $btnSection.prepend($btn);

                $btn.show()
                    .text(btnOption.name)
                    .addClass(className);
                $btn.click(function (event) {
                    event.stopPropagation();
                    closeAlertModal();
                    if (btnOption.func instanceof Function) {
                        btnOption.func();
                    }
                });
                if (btnOption.tooltip) {
                    xcTooltip.add($btn, {title: btnOption.tooltip});
                }
            });
        } else if (options.isAlert) {
            $modal.find(".cancel").text(AlertTStr.CLOSE);
            $confirmBtn.hide();
        } else {
            $modal.find(".cancel").text(AlertTStr.CANCEL);
        }

        // lock screen if necessary
        if (options.lockScreen) {
            $modal.addClass("locked");
            $modal.find(".close, .cancel").hide();
            $confirmBtn.hide();

            var $copyLogBtn = xcHelper.supportButton("log");
            var $logoutBtn = xcHelper.supportButton();
            var $adminSupportBtn = xcHelper.supportButton("adminSupport");
            var $supportBtn = xcHelper.supportButton("support");

            if (options.expired) {
                $btnSection.prepend($logoutBtn);
            } else if (options.disconnect) {
                $btnSection.prepend($adminSupportBtn, $copyLogBtn, $supportBtn);
            } else if (options.logout) {
                $btnSection.prepend($adminSupportBtn, $logoutBtn, $copyLogBtn,
                                    $supportBtn);
            } else if (options.noLogout) {
                $btnSection.prepend($adminSupportBtn, $copyLogBtn, $supportBtn);
            } else {
                $btnSection.prepend($adminSupportBtn, $copyLogBtn, $logoutBtn,
                                    $supportBtn);
            }
        }

        if (options.hideButtons) {
            for (var i = 0; i < options.hideButtons.length; i++) {
                $modal.find("." + options.hideButtons[i]).hide();
            }
        }
    }

    function sizeToText() {
        var $section = $("#alertContent");
        var diff = $section.find(".text").height() - $section.height();
        if (diff > 0) {
            var height = Math.min($modal.height() + diff, $(window).height());
            $modal.height(height);
            modalHelper.center({"verticalQuartile": true});
        }
    }

    return (Alert);
}(jQuery, {}));
