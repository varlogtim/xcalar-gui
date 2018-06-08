namespace Alert {
    let modalHelper: ModalHelper;

    interface AlertButton {
        name: string; // name of the button
        className: string; // class of the button
        func: Function; // callback to trigger when click,
        tooltip: string; // tooltip to add
    }

    interface BasicAlertOptions {
        onConfirm?: Function; // callback to trigger when click confirm button
        onCancel?:  Function; // callback to trigger when click cancel button
        lockScreen?: boolean; // if screen should be frozen
        highZindex?: boolean; // if true then will set z-index above locked background modal,
        ultraHighZindex?: boolean; // if true then will set z-index above locked waiting screen
        align?: string; // it is left, with do left align,
        sizeToText?: boolean; // when set true, size the modal to align text
        noLogout?: boolean; // remove log out button when  set true
        keepFnBar?: boolean;
        noCancel?: boolean; // remove cancel button
        expired?: boolean; // expire license case
        logout?: boolean; // want user to logout case
        msgTemplate?: string;
    }

    export interface AlertOptions extends BasicAlertOptions {
        title: string; // title of the alert
        instr?: string; // instruction information
        instrTemplate?: string; // instead of change instr text, change it's html
        msg?: string; // alert content
        msgTemplate?: string; // instead of change alert text, change its html
        detail?: string; // detail of the error/message
        isAlert?: boolean; // if it is an alert or a confirm
        isCheckBox?: boolean; // if checkbox is enabled or disabled
        buttons?: AlertButton[]; // buttons to show instead of confirm button
        hideButtons?: string[]; // array of button class names to hide, values can be: logout, copyLog, or cancel
    }

    export interface AlertErrorOptions extends BasicAlertOptions {}
    /**
     * Alert.setup
     */
    export function setup(): void {
        const $modal: JQuery = getModal();
        modalHelper = new ModalHelper($modal, {
            "center": {"verticalQuartile": true},
            "sizeToDefault": true
        });

        $("#alertDetail .detailAction").click(() => {
            $modal.toggleClass("expandDetail");
        });
    }

    /**
     * Alert.show
     * @param options
     */
    export function show(options: AlertOptions = <AlertOptions>{}): string {
        const $modal = getModal();
        if (options.noLogout) {
            $modal.find(".btn.logout").remove();
        }

        if (isModalLocked($modal, options.lockScreen)) {
            return $modal.data("id");
        }

        const id: string = setModalId($modal);

        // call it here because Alert.show() may be called when another alert is visible
        reset();

        setTitle(options.title);
        setMessage(options.msg, options.msgTemplate);
        setDetail($modal, options.detail);
        setInstruction($modal, options.instr, options.instrTemplate);
        setCheckBox($modal, options.isCheckBox);
        setButtons($modal, options);

        if (options.lockScreen) {
            setLockScreen($modal);
        }
        setZIndex($modal, options);
        setTextAlign(options.align);
        modalHelper.setup(getExtraOptions(options));

        setButtonSize($modal);
        setModalSize($modal, options.sizeToText);

        return id;
    }

    /**
     * Alert.error
     * @param title
     * @param error
     * @param options
     */
    export function error(
        title: string,
        error: string | object,
        options?: AlertErrorOptions
    ): string {
        let msg: string;
        let log: string = null;

        if (typeof error === "object") {
            const e: any = <any>error;
            // if it's an try/catch error, code will also goes here
            msg = (e.error && typeof e.error === "string") ?
            e.error : AlertTStr.ErrorMsg;
            log = e.log;
        } else {
            msg = error;
        }

        if (msg === undefined) {
            msg = title;
        }

        const alertOptions: AlertOptions = $.extend(options, {
            title: title,
            msg: msg,
            detail: log,
            isAlert: true
        });
        return Alert.show(alertOptions);
    }

    /**
     * Alert.forceClose
     */
    export function forceClose() {
        closeModal();
        const $modal: JQuery = getModal();
        const $modalBg: JQuery = getModalBg();
        $modal.removeClass("locked");
        $modalBg.removeClass("locked");
    }

    /**
     * Alert.hide
     * hides the alert modal but doesn't close/reset it
     */
    export function hide() {
        const $modal: JQuery = getModal();
        $modal.addClass("xc-hidden");
    }

    /**
     * Alert.unhide
     */
    export function unhide() {
        const $modal: JQuery = getModal();
        $modal.removeClass("xc-hidden");
    }

    /**
     * Alert.updateMsg
     * @param id
     * @param msg
     */
    export function updateMsg(id: string, msg: string): void {
        const $modal: JQuery = getModal();
        if (id == null || $modal.data("id") !== id) {
            console.error("wrong alert id!");
            return;
        }
        $("#alertContent .text").text(msg);
    }

    /**
     * Alert.isOpen
     */
    export function isOpen(): boolean {
        const $modal: JQuery = getModal();
        return $modal.is(":visible");
    }

    function closeModal(): void {
        modalHelper.clear({"close": () => {
            // alert modal has its own closer
            return closeHelper();
        }});
        const $modal: JQuery = getModal();
        $modal.removeData("id");
    }

    function closeHelper(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $modal: JQuery = getModal();
        if (hasOtherModalOpen()) {
            // apart from alert modal, other modal is on
            $modal.hide();
            deferred.resolve();
        } else {
            const fadeOutTime: number = gMinModeOn ? 0 : 300;
            const $modalBg: JQuery = getModalBg();
            $modal.hide();
            $modalBg.fadeOut(fadeOutTime, deferred.resolve);
        }

        return deferred.promise();
    }

    function reset(): void {
        const $modal = getModal();
        const $btnSection = getButtonSection();
        $btnSection.find(".funcBtn").remove();
        $btnSection.find(".copyLog, .logout, .genSub, .adminSupport").remove();
        // remove all event listener
        $modal.off(".alert");
        $modal.find(".confirm, .cancel, .close").show();
    }

    function getModal(): JQuery {
        return  $("#alertModal");
    }

    function getModalBg(): JQuery {
        return $("#modalBackground");
    }

    function getButtonSection(): JQuery {
        return $("#alertActions");
    }

    function getAlertContent(): JQuery {
        return $("#alertContent");
    }

    function getCheckBox(): JQuery {
        return $("#alertCheckBox");
    }

    function getExtraOptions(options: AlertOptions): object {
        const extraOptions: object = {
            keepFnBar: options.keepFnBar
        };
        if (options.lockScreen) {
            extraOptions['noEsc'] = true;
        }
        return extraOptions;
    }

    function isModalLocked($modal: JQuery, lockScreen: boolean): boolean {
        if ($modal.hasClass("locked")) {
            // this handle the case that some modal failure handler
            // may close the modal and it will hide modalBackground
            const $modalBg: JQuery = getModalBg();
            $modalBg.show();
            $modalBg.addClass("locked");
            // alert modal is already opened and locked due to connection error
            return true;
        } else if ($("#container").hasClass("supportOnly") && lockScreen) {
            // do not show any more modals that lock the screen
            return true;
        } else {
            return false;
        }
    }

    function hasOtherModalOpen(): boolean {
        return $(".modalContainer:visible:not(#alertModal):" +
        "not(.noBackground)").length > 0;
    }

    // set modal id
    function setModalId($modal: JQuery): string {
        const id: string = "alert" + new Date().getTime();
        $modal.data("id", id);
        return id;
    }

    function setLockScreen($modal: JQuery): void {
        const $modalBg: JQuery = getModalBg();
        $modal.addClass("locked");
        $modalBg.addClass("locked");
        $("#container").addClass("locked");
        // should not show initial screen
        $("#initialLoadScreen").hide();
    }

    function setZIndex($modal: JQuery, options: AlertOptions): void {
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
    }

    function setTextAlign(align: string): void {
        const $text: JQuery = $("#alertContent .text");
        if (align === "left") {
            $text.addClass("left-align");
        } else {
            $text.removeClass("left-align");
        }
    }

    function setButtonSize($modal) {
        if ($modal.find("button:visible").length > 3) {
            $modal.addClass("flex");
        } else {
            $modal.removeClass("flex");
        }
    }

    function setModalSize($modal: JQuery, sizeToText: boolean): void {
        if (typeof isBrowserIE !== 'undefined' && isBrowserIE) { // all text will be on 1 line otherwise
            const width: number = $modal.width();
            setTimeout(() => {
                $modal.width(parseInt(<any>width) + 1);
                setTimeout(() => {
                    $modal.width(width);
                });
            });
        } else if (sizeToText) {
            const $section: JQuery = $("#alertContent");
            const diff: number = $section.find(".text").height() - $section.height();
            if (diff > 0) {
                const height: number = Math.min($modal.height() + diff, $(window).height());
                $modal.height(height);
                modalHelper.center({verticalQuartile: true});
            }
        }
    }

    function setTitle(title: string): void {
        const modalTitle: string = title || AlertTStr.Title;
        $("#alertHeader").find(".text").text(modalTitle);
    }

    function setMessage(msg: string | null, msgTemplate?: string): void {
        const $alertContent: JQuery = getAlertContent();
        if (msgTemplate) {
            // put inside span so innerHtml isn't affected by flexbox
            $alertContent.find(".text").html('<span>' + msgTemplate + '</span>');
        } else {
            $alertContent.find(".text").empty().text(msg || '');
        }
    }

    function setDetail($modal: JQuery, detail: string): void {
        const $text = $("#alertDetail").find(".detailContent");
        if (detail) {
            $modal.addClass("hasDetail").removeClass("expandDetail");
            $text.text(detail);
        } else {
            $modal.removeClass("hasDetail").removeClass("expandDetail");
            $text.text("");
        }
    }

    function setInstruction(
        $modal: JQuery,
        instr: string,
        instrTemplate: string
    ): void {
        const $alertInstr: JQuery = $("#alertInstruction");
        if (instr || instrTemplate) {
            if (instrTemplate) {
                $alertInstr.find(".text").html(instrTemplate);
            } else {
                $alertInstr.find(".text").text(instr);
            }
            $alertInstr.show();
            $modal.addClass("hasInstr");
        } else {
            $alertInstr.hide();
            $modal.removeClass("hasInstr");
        }
    }

    function setCheckBox($modal: JQuery, isCheckBox: boolean): void {
        // set checkbox,  default is unchecked
        const $checkbox: JQuery = getCheckBox();
        $checkbox.find(".checkbox").removeClass("checked");
        if (isCheckBox) {
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
    }


    function setButtons($modal: JQuery, options: AlertOptions): void {
        // set close and cancel button
        $modal.on("click.alert", ".close, .cancel", (event) => {
            event.stopPropagation();
            closeModal();
            if (options.onCancel instanceof Function) {
                let hasChecked = null;
                if (options.isCheckBox) {
                    const $checkbox: JQuery = getCheckBox();
                    hasChecked = $checkbox.find(".checkbox").hasClass("checked");
                }
                options.onCancel(hasChecked);
            }
        });

        // set confirm button
        $modal.on("click.alert", ".confirm", (event) => {
            event.stopPropagation();
            closeModal();
            if (options.onConfirm instanceof Function) {
                options.onConfirm();
            }
        });

        const $btnSection: JQuery = getButtonSection();
        const $confirmBtn: JQuery = $btnSection.find(".confirm");

        if (options.noCancel) {
            $modal.find(".close, .cancel").hide();
        }

        if (options.buttons) {
            $modal.find(".cancel").text(AlertTStr.CANCEL);
            $confirmBtn.hide();
            options.buttons.forEach((btnOption: AlertButton) => {
                let className: string = "funcBtn";
                if (btnOption.className) {
                    className += " " + btnOption.className;
                }

                const $btn: JQuery = $confirmBtn.clone();
                $btnSection.prepend($btn);

                $btn.show()
                    .text(btnOption.name)
                    .addClass(className);
                $btn.click((event) => {
                    event.stopPropagation();
                    closeModal();
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
            $modal.find(".close, .cancel").hide();
            $confirmBtn.hide();

            const $copyLogBtn: JQuery = xcHelper.supportButton("log");
            const $logoutBtn: JQuery = xcHelper.supportButton(null);
            const $adminSupportBtn: JQuery = xcHelper.supportButton("adminSupport");
            const $supportBtn: JQuery = xcHelper.supportButton("support");

            if (options.expired) {
                $btnSection.prepend($logoutBtn);
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
}
