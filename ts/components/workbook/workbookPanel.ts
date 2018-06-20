namespace WorkbookPanel {
    let $workbookPanel: JQuery; // $("#workbookPanel")
    let $workbookTopbar: JQuery; // $workbookPanel.find(".topSection")
    let $workbookSection: JQuery; // $workbookPanel.find(".bottomSection")
    let $newWorkbookCard: JQuery; // $workbookPanel.find(".newWorkbookBox")
    let $welcomeCard: JQuery; // $workbookTopbar.find(".welcomeBox")
    let $wkbkMenu: JQuery; //$workbookPanel.find("#wkbkMenu")
    const sortkey: string = "modified"; // No longer user configurable
    let wasMonitorActive: boolean = false; // Track previous monitor panel state for when
                                  // workbook closes
    const newBoxSlideTime: number = 700;
    let $fileUpload: JQuery;
    let $dropDownCard: JQuery;   //stores the most recently clicked parent of the dropDown Menu

    let downloadingWKBKs: string[];
    let duplicatingWKBKs: string[];
    
    /**
    * WorkbookPanel.setup
    * initial set up variables and event listeners
    */
    export function setup(): void {
        $workbookPanel = $("#workbookPanel");
        $workbookTopbar = $workbookPanel.find(".topSection");
        $workbookSection = $workbookPanel.find(".bottomSection");
        $newWorkbookCard = $workbookPanel.find(".newWorkbookBox");
        $welcomeCard = $workbookTopbar.find(".welcomeBox");
        $fileUpload = $("#WKBK_uploads");
        $wkbkMenu = $workbookPanel.find("#wkbkMenu");
        xcMenu.add($wkbkMenu);
        downloadingWKBKs = [];
        duplicatingWKBKs = [];

        addTopbarEvents();
        addWorkbookEvents();
        setupDragDrop();

        let closeTimer: number = null;
        let doneTimer: number = null;
        // open or close workbook view
        $("#homeBtn").click(function() {
            $(this).blur();
            const $container: JQuery = $("#container");
            const $dialogWrap: JQuery = $("#dialogWrap");

            //remove the dataset hint
            $("#showDatasetHint").remove();

            if (WorkbookPanel.isWBMode()) {
                if (!$workbookPanel.is(":visible")) {
                    // on monitor view or something else
                    $container.removeClass("monitorMode setupMode");
                    if (!wasMonitorActive) {
                        MonitorPanel.inActive();
                    }
                } else if ($container.hasClass("noWorkbook") ||
                           $container.hasClass("switchingWkbk")) {
                    let msg: string = "";
                    if ($container.hasClass("switchingWkbk")) {
                        msg = WKBKTStr.WaitActivateFinish;
                    } else {
                        msg = WKBKTStr.NoActive;
                    }
                    $dialogWrap.find("span").text(msg);
                    // do not allow user to exit without entering a workbook
                    $workbookPanel.addClass("closeAttempt");
                    $dialogWrap.removeClass("doneCloseAttempt");
                    $dialogWrap.addClass("closeAttempt");
                    clearTimeout(closeTimer);
                    clearTimeout(doneTimer);
                    closeTimer = <any>setTimeout(function() {
                        $workbookPanel.removeClass("closeAttempt");
                    }, 200);
                    doneTimer = <any>setTimeout(function() {
                        $dialogWrap.removeClass("closeAttempt")
                                    .addClass("doneCloseAttempt");
                    }, 2000);
                } else {
                    // default, exit the workbook
                    WorkbookPanel.hide();
                    $container.removeClass("monitorMode setupMode");
                }
            } else {
                WorkbookPanel.show();
            }
        });
    };

    /**
    * WorkbookPanel.initialize
    * Sets up visiable workbook list
    */
    export function initialize(): void {
        try {
            getWorkbookInfo();
        } catch (error) {
            Alert.error(ThriftTStr.SetupErr, error);
        }
    };

    /**
    * WorkbookPanel.show
    * Shows the workbook panel
    * @param isForceShow - boolean, if true no transition animation is shown
    */
    export function show(isForceShow: boolean = false): void {
        $workbookPanel.show();
        $("#container").addClass("workbookMode");

        if (isForceShow) {
            getWorkbookInfo(isForceShow);
            $workbookPanel.removeClass("hidden"); // no animation if force show
            $("#container").addClass("wkbkViewOpen noMenuBar");
        } else {
            setTimeout(function() {
                $workbookPanel.removeClass("hidden");
                $("#container").addClass("wkbkViewOpen");
            }, 100);
        }

        WorkbookPanel.listWorkbookCards();
    };

    /**
    * WorkbookPanel.hide
    * hides the workbook panel
    * @param immediate - boolean, if true no transition animation is shown
    */
    export function hide(immediate: boolean = false): void {
        if ($workbookPanel.hasClass("hidden")) {
            return;
        }
        $workbookPanel.addClass("hidden");
        $workbookSection.find(".workbookBox").remove();
        $("#container").removeClass("wkbkViewOpen");

        if (immediate) {
            $workbookPanel.hide();
            $("#container").removeClass("workbookMode noMenuBar");
        } else {
            setTimeout(function() {
                $workbookPanel.hide();
                $("#container").removeClass("workbookMode noMenuBar");
            }, 400);
        }

        xcTooltip.hideAll();
        StatusBox.forceHide();
    };

    /**
    * WorkbookPanel.forceShow
    * forces the workbook panel to show
    */
    export function forceShow(): void {
        // When it's forceShow, no older workbooks are displayed
        $("#container").addClass("noWorkbook noMenuBar");
        $("#container").removeClass("wkbkViewOpen");
        WorkbookPanel.show(true);
    };

    /**
    * WorkbookPanel.goToMonitor
    * Shows the monitor panel
    */
    export function goToMonitor(): void {
        $("#container").removeClass("setupMode wkbkViewOpen");
        $("#container").addClass("monitorMode noMenuBar");
        MainMenu.tempNoAnim();

        if (!MonitorPanel.isGraphActive()) {
            wasMonitorActive = false;
            MonitorPanel.active();
        } else {
            wasMonitorActive = true;
        }
    };

    /**
    * WorkbookPanel.goToSetup
    * Shows the setup panel
    */
    export function goToSetup(): void {
        $("#container").removeClass("monitorMode");
        $("#container").addClass("setupMode noMenuBar");
        MainMenu.tempNoAnim();
        if ($("#monitor-setup").hasClass("firstTouch")) {
            $("#monitor-setup").removeClass("firstTouch");
            MonitorConfig.refreshParams(true);
        }
    };

    /**
    * WorkbookPanel.isWBMode
    * checks if the window is in the workbook panel
    */
    export function isWBMode(): boolean {
        return $("#container").hasClass("workbookMode");
    };

    /**
    * WorkbookPanel.edit
    * Edits the name and description of a workbook
    * @param workbookId - the id of the workbook to edit
    * @param newName - the new name for the workbook
    * @param description - the new description, optional
    * @param isNew - if it is a new workbook focus the name for inline editing
    */
    export function edit(workbookId: string, newName: string, description?: string, isNew: boolean = false): XDPromise<void> {
        const $workbookBox: JQuery = getWorkbookBoxById(workbookId);
        const workbook: WKBK = WorkbookManager.getWorkbook(workbookId);
        const oldWorkbookName: string = workbook.getName();
        const oldDescription: string = workbook.getDescription() || "";
        if (oldWorkbookName === newName && oldDescription === description) {
            return PromiseHelper.resolve();
        } else {
            const deferred: XDDeferred<void> = PromiseHelper.deferred();
            let promise: XDPromise<string>;
            if (oldWorkbookName === newName) {
                // only update description
                promise = WorkbookManager.updateDescription(workbookId, description);
            } else {
                promise = WorkbookManager.renameWKBK(workbookId, newName, description);
            }
            $workbookBox.addClass("loading")
                            .find(".loadSection .text").text(WKBKTStr.Updating);
            const loadDef: XDDeferred<void> = PromiseHelper.deferred();
            setTimeout(function() {
                // if only update description, it could blink the UI if update
                // is too fast, so use this to slow it down.
                loadDef.resolve();
            }, 500);

            PromiseHelper.when(promise, loadDef.promise())
            .then(function(curWorkbookId) {
                updateWorkbookInfo($workbookBox, <string>curWorkbookId);
                deferred.resolve();
            })
            .fail(function(error) {
                handleError(error, $workbookBox);
                deferred.reject(error);
            })
            .always(function() {
                $workbookBox.removeClass("loading")
                            .find(".loadSection .text").text(WKBKTStr.Creating);
                if (isNew) {
                    $workbookBox.find(".workbookName").focus().select();
                    $workbookBox.find(".workbookName").addClass("focussed");
                }
            })

            return deferred.promise();
        }
    };

    /**
    * WorkbookPanel.listWorkbookCards
    * Creates the list of workbook cards
    */
    export function listWorkbookCards(): void {
        let html: string = "";
        let sorted: WKBK[] = [];
        const workbooks: object = WorkbookManager.getWorkbooks();
        for (let id in workbooks) {
            sorted.push(workbooks[id]);
        }
        $workbookPanel.find(".workbookBox").not($newWorkbookCard).remove();

        const activeWKBKId: string = WorkbookManager.getActiveWKBK();
        // sort by workbook.name
        const isNum: boolean = (sortkey === "created" || sortkey === "modified");
        let activeWorkbook: WKBK;

        sorted = sortObj(sorted, sortkey, isNum);
        sorted.forEach(function(workbook) {
            if (workbook.getId() === activeWKBKId) {
                activeWorkbook = workbook;
            } else {
                html = createWorkbookCard(workbook) + html;
            }
        });
        // active workbook always comes first
        if (activeWorkbook != null) {
            html = createWorkbookCard(activeWorkbook) + html;
        }

        $newWorkbookCard.after(html);
        // Add tooltips to all descriptions
        const $descriptions: JQuery = $workbookSection.find(".workbookBox .description");
        for (let i: number = 0; i < $descriptions.length; i++) {
            xcTooltip.add($descriptions.eq(i),
                            {title: xcHelper.escapeHTMLSpecialChar($descriptions.eq(i).text())});
        }
    }

    /**
    * WorkbookPanel.updateWorkbooks
    * Updates workbook info from a socket call
    * @param info - The information passed from socket including operation and workbook id
    */
    export function updateWorkbooks(info: any): void {
        if ($dropDownCard &&
            $dropDownCard.attr("data-workbook-id") === info.triggerWkbk) {
            if (info.action === "rename") {
                $dropDownCard.attr("data-workbook-id",
                                WorkbookManager.getIDfromName(info.newName));
            } else if (info.action === "delete") {
                if ($wkbkMenu.is(":visible")) {
                    xcMenu.close($wkbkMenu);
                }
            }
        }
    }

    function addTopbarEvents(): void {
        // Events for the top bar, welcome message, news, etc
        // Welcome message listener
        // News-Help listener
        // Tutorial listener

        // go to monitor panel
        $workbookTopbar.find(".monitorBtn, .monitorLink").click(function(e) {
            e.preventDefault(); // prevent monitor link from actually navigating
            WorkbookPanel.goToMonitor();
        });

        // from monitor to workbook panel
        $("#monitorPanel").find(".backToWB").click(function() {
            $("#container").removeClass("monitorMode setupMode");
            $("#container").addClass("wkbkViewOpen");
            if (!wasMonitorActive) {
                MonitorPanel.inActive();
            }
        });
    }

    function addWorkbookEvents(): void {
        // New Workbook card
        $("#createWKBKbtn").click(function() {
            let wbName: string;
            const workbooks: object = WorkbookManager.getWorkbooks();
            wbName = wbDuplicateName('New Workbook', workbooks, 0);
            const $btn: JQuery = $(this);
            $btn.addClass("inActive").blur();
            WorkbookPanel.createNewWorkbook(wbName)
            .always(function() {
                $btn.removeClass("inActive");
            });
        });

        $("#browseWKBKbtn").click(function() {
            $("#WKBK_uploads").click();
        });

        $fileUpload.change(function() {
            if ($fileUpload.val() !== "") {
                changeFilePath();
            }
        });

        $workbookSection.on("blur", ".workbookName", function() {
            const $workbookBox: JQuery = $(this).closest(".workbookBox");
            const $this: JQuery = $(this);
            if ($this.val() === $this.parent().attr("data-original-title")) {
                $this.removeClass("focussed");
                $this.removeClass("error");
                $this.attr("disabled", "disabled");
                return;
            }
            if (!validateName($this.val(), $workbookBox.attr("data-workbook-id"), $this)) {
                $this.addClass("error");
                $this.val($this.parent().attr("data-original-title"));
            } else {
                WorkbookPanel.edit($workbookBox.attr("data-workbook-id"), $(this).val())
                .then(function() {
                    $this.removeClass("focussed");
                    $this.attr("disabled", "disabled");
                })
                .fail(function() {
                    $this.addClass("error");
                    $this.val($this.parent().attr("data-original-title"));
                });
            }
        });

        $workbookSection.on("keypress", ".workbookName", function(event) {
            $(this).removeClass("error");
            if (event.which === keyCode.Enter) {
                $(this).blur();
            }
        });

        $workbookSection.on("click", ".vertBarBtn", function() {
            xcTooltip.hideAll();
            StatusBox.forceHide();
        });

        // Events for the actual workbooks
        // anywhere on workbook card
        $workbookSection.on("click", ".activate", function(event) {
            if ($(event.target).hasClass("preview") || $(event.target).hasClass("dropDown") || $(event.target).hasClass("focussed")) {
                return;
            }
            activateWorkbook($(this).closest(".workbookBox"));
        });

        // Edit button
        $wkbkMenu.on("click", ".modify", function() {
            const workbookId: string = $dropDownCard.attr("data-workbook-id");
            WorkbookInfoModal.show(workbookId);
        });

        //Download Button
        $wkbkMenu.on("click", ".download", function() {
            const workbookId: string = $dropDownCard.attr("data-workbook-id");
            const workbook: WKBK = WorkbookManager.getWorkbook(workbookId);
            const workbookName: string = workbook.getName();

            //$dlButton.addClass("inActive");
            downloadingWKBKs.push(workbookName);

            WorkbookManager.downloadWKBK(workbookName)
            .fail(function(err) {
                StatusBox.show(err.error, $dropDownCard, false, {
                    detail: err.log
                });
            })
            .always(function() {
                const index: number = downloadingWKBKs.indexOf(workbookName);
                if (index !== -1) {
                    downloadingWKBKs.splice(index, 1);
                }
            });
        });

        // Duplicate button
        $wkbkMenu.on("click", ".duplicate", function() {
            const workbookId: string = $dropDownCard.attr("data-workbook-id");
            // Create workbook names in a loop until we find a workbook name
            // that we can use
            const $dropDownMenu: JQuery = $dropDownCard.find(".dropDown");
            let currentWorkbookName: string = $dropDownCard.find(".workbookName").val();
            const currentWorkbooks: object = WorkbookManager.getWorkbooks();
            currentWorkbookName = wbDuplicateName(currentWorkbookName, currentWorkbooks, 0);

            duplicatingWKBKs.push(currentWorkbookName);

            const deferred1: XDPromise<JQuery> = createLoadingCard($dropDownCard);
            const deferred2: XDPromise<string> = WorkbookManager.copyWKBK(workbookId,
                                                    currentWorkbookName);

            PromiseHelper.when(deferred1, deferred2)
            .then(function($fauxCard, newId) {
                replaceLoadingCard(<JQuery>$fauxCard, newId);
            })
            .fail(function($fauxCard, error) {
                handleError(error, $dropDownMenu);
                removeWorkbookBox($fauxCard);
            })
            .always(function() {
                const index: number = duplicatingWKBKs.indexOf(currentWorkbookName);
                if (index !== -1) {
                    duplicatingWKBKs.splice(index, 1);
                }
            });
        });

        // Delete button
        $wkbkMenu.on("click", ".delete", function() {
            Alert.show({
                "title": WKBKTStr.Delete,
                "msg": WKBKTStr.DeleteMsg,
                "onConfirm": function() {
                    deleteWorkbookHelper($dropDownCard);
                }
            });
        });

        // deactivate button
        $wkbkMenu.on("click", ".deactivate", function() {
            Alert.show({
                "title": WKBKTStr.Deactivate,
                "msg": WKBKTStr.DeactivateMsg,
                "onConfirm": function() {
                    deactiveWorkbook($dropDownCard);
                }
            });
        });

        $wkbkMenu.on("click", ".newTab", function() {
            activateWorkbook($dropDownCard, true);
        });

        $workbookSection.on("click", ".preview", function() {
            const $workbookBox: JQuery = $(this).closest(".workbookBox");
            const workbookId: string = $workbookBox.attr("data-workbook-id");
            WorkbookPreview.show(workbookId);
        });

        $workbookSection.on("contextmenu", ".workbookBox", function(event) {
            event.preventDefault();
            $dropDownCard = $(this);

            openDrodDown();
        });

        $workbookSection.on("click", ".dropDown", function() {
            $dropDownCard = $(this).closest(".workbookBox");

            openDrodDown();
        });

        $workbookSection.on("mouseenter", ".tooltipOverflow", function() {
            const $div: JQuery = $(this).find(".workbookName");
            xcTooltip.auto(this, $div[0]);
        });
    }

    function updateWorkbookInfo($workbookBox: JQuery, workbookId: string): void {
        $workbookBox.attr("data-workbook-id", workbookId);
        const workbook: WKBK = WorkbookManager.getWorkbook(workbookId);
        let modified: string = workbook.modified;
        const description: string = workbook.getDescription() || "";
        const name: string = workbook.getName();
        if (modified) {
            modified = moment(modified).format("M-D-Y h:mm A");
        } else {
            modified = "";
        }

        $workbookBox.find(".modifiedTime").text(modified);
        $workbookBox.find(".description").text(description);
        $workbookBox.find(".workbookName").val(name);
        if (description.trim().length > 0) {
            xcTooltip.add($workbookBox.find(".description"), {title: xcHelper.escapeHTMLSpecialChar(description)});
        } else {
            xcTooltip.remove($workbookBox.find(".description"));
        }

        const $subHeading: JQuery = $workbookBox.find(".subHeading");
        xcTooltip.changeText($subHeading, name);
    }

    function updateWorkbookInfoWithReplace($card: JQuery, workbookId: string): void {
        const workbook: WKBK = WorkbookManager.getWorkbook(workbookId);
        const $updateCard: JQuery = $(createWorkbookCard(workbook));
        $card.replaceWith($updateCard);
    }

    function getWorkbookInfo(isForceMode: boolean = false): void {
        const $welcomeMsg: JQuery = $welcomeCard.find(".description");
        const $welcomeUser: JQuery = $welcomeCard.find(".heading .username");
        const user: string = XcUser.getCurrentUserName();
        $welcomeUser.text(user);

        if (isForceMode) {
            // forceMode does not have any workbook info
            $welcomeMsg.text(WKBKTStr.NewWKBKInstr);
            return;
        }
        $welcomeMsg.text(WKBKTStr.CurWKBKInstr);
    }

    /**
    * WorkbookPanel.createNewWorkbook
    * Creates a new workbook
    * @param workbookName - the name of the workbook
    * @param description - description of the new workbook, optional
    * @param file - if uploading a workbook the .tar.gz file, optional
    */
    export function createNewWorkbook(workbookName: string, description?: string, file?: File): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        checkFileSize(file)
        .then(function() {
            return XcUser.CurrentUser.commitCheck();
        })
        .then(function() {
            let deferred1: XDPromise<string>;
            if (!file) {
                deferred1 = WorkbookManager.newWKBK(workbookName);
            } else {
                deferred1 = WorkbookManager.uploadWKBK(workbookName, file);
            }
            let $sibling: JQuery;
            if (WorkbookManager.getActiveWKBK()) {
                $sibling = getWorkbookBoxById(WorkbookManager.getActiveWKBK());
            } else {
                $sibling = $newWorkbookCard;
            }
            const deferred2: XDPromise<JQuery> = createLoadingCard($sibling);
            return PromiseHelper.when(deferred1, deferred2);
        })
        .then(function(id, $fauxCard) {
            replaceLoadingCard($fauxCard, <string>id, true);
            return WorkbookPanel.edit(<string>id, workbookName, description, true);
        })
        .then(deferred.resolve)
        .fail(function(error, $fauxCard, isCancel) {
            if (isCancel) {
                deferred.resolve();
                return;
            }

            handleError(error || WKBKTStr.CreateErr, $("#createWKBKbtn"));
            removeWorkbookBox($fauxCard);
            deferred.reject(error);
        });
        return deferred.promise();
    }

    function checkFileSize(file: File): XDPromise<void> {
        if (file == null) {
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const size: number = file.size;
        const sizeLimit: number = 5 * MB; // 5MB
        if (size <= sizeLimit) {
            deferred.resolve();
        } else {
            const msg: string = xcHelper.replaceMsg(ErrWRepTStr.LargeFileUpload, {
                size: xcHelper.sizeTranslator(sizeLimit)
            });
            Alert.show({
                title: null,
                msg: msg,
                onConfirm: deferred.resolve,
                onCancel: function() {
                    deferred.reject(null, null, true);
                }
            });
        }
        return  deferred.promise();
    }

    function createLoadingCard($sibling: JQuery): XDPromise<JQuery> {
        let deferred: XDDeferred<JQuery> = PromiseHelper.deferred();
        // placeholder
        const workbook: WKBK = new WKBK({
            "id": "",
            "name": ""
        });
        const extraClasses: string[] = ["loading", "new"];
        const html: string = createWorkbookCard(workbook, extraClasses);

        const $newCard: JQuery = $(html);
        $sibling.after($newCard);

        // need to remove "new" class from workbookcard a split second
        // after it's appended or it won't animate
        setTimeout(function() {
            $newCard.removeClass("new");
        }, 100);

        setTimeout(function() {
            deferred.resolve($newCard);
        }, newBoxSlideTime);

        return deferred.promise();
    }

    function replaceLoadingCard($card: JQuery, workbookId: string, isNewWKBK: boolean = false): JQuery {
        const classes: string[] = ["loading"];
        const workbook: WKBK = WorkbookManager.getWorkbook(workbookId);
        const $updateCard: JQuery = $(createWorkbookCard(workbook, classes, isNewWKBK));
        $card.replaceWith($updateCard);

        const animClasses: string = ".label, .info, .workbookName, .rightBar";
        $updateCard.removeClass("loading")
            .addClass("finishedLoading")
            .find(animClasses).hide().fadeIn();
        setTimeout(function() {
            $updateCard.removeClass("finishedLoading");
        }, 500);
        return $updateCard;
    }

    function getWorkbookBoxById(workbookId: string): JQuery {
        const $workbookBox: JQuery = $workbookPanel.find(".workbookBox").filter(function() {
            return $(this).attr("data-workbook-id") === workbookId;
        });
        return $workbookBox;
    }

    function activateWorkbook($workbookBox: JQuery, newTab: boolean = false): void {
        const workbookId: string = $workbookBox.attr("data-workbook-id");
        const activeWKBKId: string = WorkbookManager.getActiveWKBK();
        if (!newTab) {
            if (activeWKBKId === workbookId) {
                WorkbookPanel.hide();
            } else {
                alertActivate(workbookId, activeWKBKId)
                .then(function() {
                    WorkbookManager.switchWKBK(workbookId)
                    .fail(function(error) {
                        handleError(error, $workbookBox);
                        // has chance that inactivate the fromWorkbook
                        // but fail to activate the toWorkbook
                        if (WorkbookManager.getActiveWKBK() == null
                            && activeWKBKId != null) {
                            const $activeWKBK: JQuery = getWorkbookBoxById(activeWKBKId);
                            updateWorkbookInfoWithReplace($activeWKBK, activeWKBKId);
                        }
                    });
                });
            }
        } else {
            alertActivate(workbookId, activeWKBKId)
            .then(function() {
                WorkbookManager.switchWKBK(workbookId, true, $workbookBox)
                .fail(function(error) {
                    handleError(error, $workbookBox);
                });
            });
        }
    }

    function alertActivate(workbookId: string, activeWKBKId: string): XDPromise<void> {
        if (activeWKBKId == null) {
            // no activate workbook case
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const workbook: WKBK = WorkbookManager.getWorkbook(workbookId);
        const txCache: Object = Transaction.getCache();
        const keys: string[] = Object.keys(txCache);
        if (keys.length === 0) {
            // when no opeartion running
            if (workbook.hasResource()) {
                return PromiseHelper.resolve();
            } else {
                // when activate inactive workbook
                Alert.show({
                    title: WKBKTStr.Activate,
                    msg: WKBKTStr.ActivateInstr,
                    onConfirm: deferred.resolve,
                    onCancel: deferred.reject
                });
                return deferred.promise();
            }
        }
        
        const key: string = keys[0];
        const operation: Object = txCache[key].getOperation();
        const msg: string = xcHelper.replaceMsg(WKBKTStr.SwitchWarn, {
            op: operation
        });

        Alert.show({
            title: AlertTStr.Title,
            msg: msg,
            onConfirm: deferred.resolve,
            onCancel: deferred.reject
        });
        return deferred.promise();
    }

    function deleteWorkbookHelper($workbookBox: JQuery): void {
        const workbookId: string = $workbookBox.attr("data-workbook-id");
        WorkbookManager.deleteWKBK(workbookId)
        .then(function() {
            removeWorkbookBox($workbookBox);
        })
        .fail(function(error) {
            handleError(error, $workbookBox);
        });
    }

    function removeWorkbookBox($workbookBox: JQuery): void {
        if ($workbookBox == null) {
            return;
        }
        $workbookBox.addClass("removing");
        setTimeout(function() {
            $workbookBox.remove();
        }, 600);
    }

    function validateName(wbName: string, wbId: string, $wbCard: JQuery): boolean {
        return xcHelper.validate([
            {
                "$ele": $wbCard,
                "formMode": true
            },
            {
                "$ele": $wbCard,
                "formMode": true,
                "error": ErrTStr.InvalidWBName,
                "check": function() {
                    return !xcHelper.checkNamePattern(<PatternCategory>"workbook", <PatternAction>"check", wbName);
                }
            },
            {
                "$ele": $wbCard,
                "formMode": true,
                "error": xcHelper.replaceMsg(WKBKTStr.Conflict, {
                    "name": wbName
                }),
                "check": function() {
                    const workbooks: object = WorkbookManager.getWorkbooks();
                    for (let wkbkId in workbooks) {
                        if (workbooks[wkbkId].getName() === wbName && wbId !== wkbkId) {
                            return true;
                        }
                    }
                    return false;
                }
            }
        ]);
    }

    function handleError(error: any, $ele: JQuery): void {
        if (error && error.canceled) {
            return;
        }
        let errorText: string;
        let log: string;
        if (typeof error === "object" && error.error != null) {
            if (error.status === StatusT.StatusCanceled) {
                return;
            }
            errorText = error.error;
            log = error.log;
        } else if (typeof error === "string") {
            errorText = error;
        } else {
            errorText = JSON.stringify(error);
        }
        StatusBox.show(errorText, $ele, false, {
            "detail": log,
            "persist": true
        });
    }

    function deactiveWorkbook($workbookBox: JQuery): void {
        const workbookId: string = $workbookBox.attr("data-workbook-id");
        const isActiveWkbk: boolean = WorkbookManager.getActiveWKBK() === workbookId;
        WorkbookManager.deactivate(workbookId)
        .then(function() {
            updateWorkbookInfoWithReplace($workbookBox, workbookId);
            if (isActiveWkbk) {
                $("#container").addClass("noWorkbook noMenuBar");
            }
        })
        .fail(function(error) {
            handleError(error, $workbookBox);
        });
    }

    function createWorkbookCard(workbook: WKBK, extraClasses?: string[], isNewWKBK: boolean = false): string {
        const workbookId: string = workbook.getId() || "";
        let workbookName: string = workbook.getName() || "";
        const createdTime: string = workbook.getCreateTime() || "";
        let createdTimeDisplay: string = createdTime;
        const modifiedTime: string = workbook.getModifyTime() || "";
        let modifiedTimeDisplay: string = modifiedTime;
        let createdTimeTip: string = "";
        let modifiedTimeTip: string = "";
        const description: string = workbook.getDescription() || "";
        const numWorksheets: number = workbook.getNumWorksheets() || 0;
        let time: moment.Moment;

        extraClasses = extraClasses || [];

        if (workbook.isNoMeta()) {
            extraClasses.push("noMeta");
            workbookName += " (" + WKBKTStr.NoMeta + ")";
        }

        if (createdTime) {
            time = moment(createdTime);
            createdTimeDisplay = time.calendar();
            createdTimeTip = xcTimeHelper.getDateTip(time);
        }

        if (modifiedTime) {
            time = moment(modifiedTime);
            modifiedTimeDisplay = time.calendar();
            modifiedTimeTip = xcTimeHelper.getDateTip(time);
        }
        let isActive: string;

        if (workbook.hasResource()) {
            extraClasses.push("active");
            isActive = WKBKTStr.Active;
        } else {
            isActive = WKBKTStr.Inactive;
            extraClasses.push("noResource");
        }

        let loadSection: string = "loadSection";
        if (isBrowserSafari) {
            loadSection += " safari";
        }

        const html: string =
            '<div class="box box-small workbookBox ' +
            extraClasses.join(" ") + '"' +
            ' data-workbook-id="' + workbookId +'">' +
                '<div class="innerBox">' +
                    '<div class="' + loadSection + '">' +
                        '<div class="refreshIcon">' +
                            '<img src="' + paths.waitIcon + '">' +
                        '</div>' +
                        '<div class="animatedEllipsisWrapper">' +
                            '<div class="text">' +
                                WKBKTStr.Creating +
                            '</div>' +
                            '<div class="animatedEllipsis">' +
                                '<div>.</div>' +
                                '<div>.</div>' +
                                '<div>.</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="content activate">' +
                        '<div class="innerContent">' +
                            '<div class="infoSection topInfo">' +
                                '<div class="subHeading tooltipOverflow" ' +
                                ' data-toggle="tooltip" data-container="body"' +
                                ' data-original-title="' + workbookName + '">' +
                                    '<input type="text" class="workbookName ' +
                                    'tooltipOverflow"' +
                                    ' value="' + workbookName + '"' +
                                    (isNewWKBK ? '' : ' disabled') +
                                    ' spellcheck="false"/>' +
                                '</div>' +
                                '<div class="description textOverflowOneLine">' +
                                    xcHelper.escapeHTMLSpecialChar(description) +
                                '</div>' +
                                '<div class="row clearfix">' +
                                    '<div class="label">' +
                                        TimeTStr.Created + ':' +
                                    '</div>' +
                                    '<div class="info createdTime" ' +
                                        createdTimeTip + '">' +
                                        createdTimeDisplay +
                                    '</div>' +
                                '</div>' +
                                '<div class="row clearfix">' +
                                    '<div class="label">' +
                                        TimeTStr.LastSaved + ':' +
                                    '</div>' +
                                    '<div class="info modifiedTime" ' +
                                        modifiedTimeTip + '">' +
                                        modifiedTimeDisplay +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                            '<div class="infoSection bottomInfo">' +
                                '<div class="row clearfix">' +
                                    '<div class="label">' +
                                        WKBKTStr.WS + ':' +
                                    '</div>' +
                                    '<div class="info numWorksheets">' +
                                        numWorksheets +
                                    '</div>' +
                                '</div>' +
                                '<div class="row clearfix">' +
                                    '<div class="label">' +
                                        WKBKTStr.State + ':' +
                                    '</div>' +
                                    '<div class="info isActive">' +
                                        isActive +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        '<i class="preview icon xi-show xc-action" ' +
                        ' data-toggle="tooltip" data-container="body"' +
                        ' data-placement="top"' +
                        ' data-title="' + CommonTxtTstr.Preview + '"' +
                        '></i>' +
                        '<i class="dropDown icon xi-ellipsis-h xc-action" ' +
                        ' data-toggle="tooltip" data-container="body"' +
                        ' data-placement="top"' +
                        ' data-title="' + WKBKTStr.MoreActions + '"' +
                        '></i>' +
                    '</div>' +
                '</div>' +
            '</div>';

        return html;
    }

    function changeFilePath(dragFile?: File): void {
        let path: string;
        let file: File;
        if (dragFile) {
            file = dragFile;
        } else {
            file = (<HTMLInputElement>$fileUpload[0]).files[0];
        }

        path = file.name.replace(/C:\\fakepath\\/i, '').trim();
        let wbName: string = path.substring(0, path.indexOf(".")).trim()
                    .replace(/ /g, "");
        wbName = <string>xcHelper.checkNamePattern(<PatternCategory>"Workbook", <PatternAction>"fix", wbName);

        const workbooks: object = WorkbookManager.getWorkbooks();
        wbName = wbDuplicateName(wbName, workbooks, 0);

        WorkbookPanel.createNewWorkbook(wbName, null, file)
        .fail(function(error) {
            StatusBox.show(error.error || error, $("#browseWKBKbtn"));
        })
        .always(function() {
            $fileUpload.val("");
        });
    }

    function wbDuplicateName(wbName: string, workbooks: object, n: number): string {
        if (n >= 10) {
            console.log("Too many attempts to find unique name.");
            return xcHelper.randName(wbName);
        }
        let numbering: string = "";
        if (n > 0) {
            numbering = "_" + n;
        }
        for (let wkbkId in workbooks) {
            if (workbooks[wkbkId].getName() === wbName + numbering) {
                return wbDuplicateName(wbName, workbooks, n + 1);
            }
        }
        return wbName + numbering;
    }

    function sortObj(objs: WKBK[], key: string, isNum: boolean): WKBK[] {
        if (isNum) {
            objs.sort(function(a, b) {
                return (a[key] - b[key]);
            });
        } else {
            objs.sort(function(a, b) {
                return a[key].localeCompare(b[key]);
            });
        }

        return objs;
    }

    function openDrodDown(): void {
        if ($dropDownCard.hasClass("loading")) {
            return;
        }

        const workbookId: string = $dropDownCard.attr("data-workbook-id");
        const workbook: WKBK = WorkbookManager.getWorkbook(workbookId);
        const workbookName: string = workbook.getName();

        const $dropDownLocation: JQuery = $dropDownCard.find(".dropDown");

        let index: number = downloadingWKBKs.indexOf(workbookName);
        if (index !== -1) {
            $wkbkMenu.find(".download").addClass("inActive");
        } else {
            $wkbkMenu.find(".download").removeClass("inActive");
        }

        index = duplicatingWKBKs.indexOf(workbookName);
        if (index !== -1) {
            $wkbkMenu.find(".duplicate").addClass("inActive");
        } else {
            $wkbkMenu.find(".duplicate").removeClass("inActive");
        }

        if ($dropDownCard.hasClass("active")) {
            $wkbkMenu.find(".delete").addClass("xc-hidden");
            $wkbkMenu.find(".deactivate").removeClass("xc-hidden");

            if (workbookId === WorkbookManager.getActiveWKBK()) {
                $wkbkMenu.find(".newTab").addClass("inActive");
            } else {
                $wkbkMenu.find(".newTab").removeClass("inActive");
            }
        } else {
            $wkbkMenu.find(".deactivate").addClass("xc-hidden");
            $wkbkMenu.find(".delete").removeClass("xc-hidden");
            $wkbkMenu.find(".newTab").removeClass("inActive");
        }
        xcHelper.dropdownOpen($dropDownLocation, $wkbkMenu);
    }

    function setupDragDrop(): void {
        new DragDropUploader({
            $container: $workbookPanel.find(".mainContent"),
            text: "Drop a workbook file to upload",
            onDrop: function(files) {
                changeFilePath(files);
            },
            onError: function(error) {
                switch (error) {
                    case ('invalidFolder'):
                        Alert.error(UploadTStr.InvalidUpload,
                                    UploadTStr.InvalidFolderDesc);
                        break;
                    case ('multipleFiles'):
                        Alert.show({
                            title: UploadTStr.InvalidUpload,
                            msg: UploadTStr.OneFileUpload
                        });
                        break;
                    default:
                        break;
                }
            }
        });
    }

    if (window["unitTestMode"]) {
        WorkbookPanel["__testOnly__"] = {
            changeFilePath: changeFilePath
        }
    }
}