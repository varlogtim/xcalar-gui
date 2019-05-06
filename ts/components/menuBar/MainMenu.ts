namespace MainMenu {
    let $menuBar: JQuery; // $("#menuBar");
    let $mainMenu: JQuery; // $("#mainMenu");
    let _isMenuOpen: boolean = false;
    let menuAnimCheckers: XDDeferred<void>[] = [];
    const closedOffset: number = 65; // in pixels, how much the panels are horizonally
    // offset when a menu is closed (includes 5px padding in .mainContent)
    const openOffset: number = 350; // when the menu is open
    const defaultWidth: number = 295;
    let currWidth: number = defaultWidth;
    let _isFormOpen: boolean = false; // if export, join, map etc is open
    let ignoreRestoreState: boolean = false; // boolean flag - if closing of a form is
    // triggered by the clicking of a mainMenu tab, we do not want to restore
    // the pre-form state of the menu so we turn the flag on temporarily
    let clickable: boolean = true;
    let hasSetUp: boolean = false;
    const formPanels: BaseOpPanel[] = [];

    export function setup() {
        if (hasSetUp) {
            return;
        }
        hasSetUp = true;
        $menuBar = $("#menuBar");
        $mainMenu = $("#mainMenu");
        setupTabbing();
        setupBtns();
        setupResizable();
        MainMenu.switchMode();
    };

    export function registerPanels(panel): void {
        formPanels.push(panel);
    };

    export function switchMode(): boolean {
        const $dataflowMenu: JQuery = $("#dataflowMenu");
        const isSQLMode: boolean = XVM.isSQLMode();
        if (isSQLMode) {
            $dataflowMenu.data("tab", "sqlTab");
        } else {
            $dataflowMenu.data("tab", "modelingDataflowTab");
        }

        const $sqlModeTabs: JQuery = $("#sqlTab");
        const $advModeTabs: JQuery = $("#modelingDataflowTab, #jupyterTab, #inButton");
        let allPanelsClosed: boolean = false;
        if (isSQLMode) {
            $("#inButton").addClass("xc-hidden");
            $sqlModeTabs.removeClass("xc-hidden");
            $advModeTabs.addClass("xc-hidden");
            if ($advModeTabs.hasClass("active")) {
                $advModeTabs.removeClass("active");
                DagViewManager.Instance.hide(); // turn off listeners
                MainMenu.close(true);
                MainMenu.closeForms();
                closeMainPanels();
                allPanelsClosed = true;
            }

        } else {
            $("#inButton").removeClass("xc-hidden");
            $sqlModeTabs.addClass("xc-hidden");
            $advModeTabs.removeClass("xc-hidden");
            if ($sqlModeTabs.hasClass("active")) {
                $sqlModeTabs.removeClass("active");
                MainMenu.close(true);
                MainMenu.closeForms();
                closeMainPanels();
                allPanelsClosed = true;
            }
        }

        return allPanelsClosed;
    };

    export function openDefaultPanel(): void {
        if (XVM.isSQLMode()) {
            MainMenu.openPanel("sqlPanel");
        } else {
            MainMenu.openPanel("dagPanel");
        }
    };

    export function close(noAnim?: boolean, makeInactive?: boolean): void {
        const wasClickable: boolean = clickable;
        closeMenu($menuBar.find(".topMenuBarTab.active"), noAnim,
                  makeInactive);
        if (!noAnim && wasClickable) {
            addAnimatingClass();
        }
    };

    // checks main menu and bottom menu
    // or checks specific one if you pass in the id
    export function isMenuOpen(menu?: string): boolean {
        if (menu) {
            if (menu === "mainMenu") {
                return _isMenuOpen;
            } else {
                return BottomMenu.isMenuOpen();
            }
        } else {
            return (_isMenuOpen || BottomMenu.isMenuOpen());
        }
    };

    export function open(noAnim?: boolean): void {
        const wasClickable: boolean = clickable;
        const hasAnim: boolean = openMenu($menuBar.find(".topMenuBarTab.active"), noAnim);
        if (hasAnim && wasClickable) {
            addAnimatingClass();
        }
    };

    export function openPanel(panelId: string, subTabId?: string): void {
       let $tab: JQuery;
        switch (panelId) {
            case ("monitorPanel"):
                $tab = $("#monitorTab");
                break;
            case ("datastorePanel"):
                $tab = $("#dataStoresTab");
                break;
            case ("jupyterPanel"):
                $tab = $("#jupyterTab");
                break;
            case ("dagPanel"):
                $tab = $("#modelingDataflowTab");
                break;
            case ("sqlPanel"):
                $tab = $("#sqlWorkSpace");
                break;
            case ("helpPanel"):
                $tab = $("#helpTab");
                break;
            default:
                break;
        }
        if ($tab) {
            if (!$tab.hasClass("active") || WorkbookPanel.isWBMode()) {
                $tab.click();
            }

            if (subTabId && $tab.find("#" + subTabId).length) {
                const $subTab: JQuery =  $tab.find("#" + subTabId);
                if (!$subTab.hasClass("active")) {
                    $subTab.click();
                }
            }
        }
    };

    export function checkMenuAnimFinish(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (!$menuBar.hasClass("animating")) {
            deferred.resolve();
        } else {
            _checkMenuAnimFinish()
            .always(deferred.resolve);
        }

        return deferred.promise();
    }

    export function getOffset(): number {
        if (_isMenuOpen) {
            return (openOffset);
        } else if (BottomMenu.isMenuOpen()) {
            if (BottomMenu.isPoppedOut()) {
                return (closedOffset);
            } else {
                return (openOffset);
            }
        } else {
            return (closedOffset);
        }
    };

    export function getState(): {
        isPoppedOut: boolean,
        isTopOpen: boolean,
        isBottomOpen: boolean,
        $activeTopSection: JQuery,
        $activeBottomSection: JQuery,
        $activeDataflowMenu: JQuery
    } {
        const state = {
            isPoppedOut: BottomMenu.isPoppedOut(),
            isTopOpen: _isMenuOpen,
            isBottomOpen: BottomMenu.isMenuOpen(),
            $activeTopSection: $mainMenu.find(".commonSection.active"),
            $activeBottomSection: $("#bottomMenu").find(".menuSection.active"),
            $activeDataflowMenu: $("#dataflowMenu").find(".menuSection:not(.xc-hidden)")
        };
        return (state);
    };

    export function setFormOpen(): boolean {
        _isFormOpen = true;
        return _isFormOpen;
    };

    export function setFormClose(): boolean {
        _isFormOpen = false;
        return _isFormOpen;
    };

    export function isFormOpen(): boolean {
        return _isFormOpen;
    };

    // xx currently only supporting form views in the worksheet panel
    export function restoreState(prevState: {
        isPoppedOut: boolean,
        isTopOpen: boolean,
        isBottomOpen: boolean,
        $activeTopSection: JQuery,
        $activeBottomSection: JQuery,
        $activeDataflowMenu: JQuery
    }, ignoreClose?: boolean) {
        // ignoreRestoreState is temporarily set when mainMenu tab is clicked
        // and form is open
        // ignoreClose will be true if different menu tab has been clicked
        // and form is no longer visible
        if (!ignoreRestoreState && !ignoreClose) {
            let noAnim: boolean;
            if (prevState.isBottomOpen && !BottomMenu.isMenuOpen()) {
                BottomMenu.openSection(prevState.$activeBottomSection.index());
            }
            if (_isMenuOpen && !prevState.isTopOpen) {
                noAnim = false;
                if (prevState.isBottomOpen) {
                    noAnim = true;
                }
                MainMenu.close(noAnim);
            }
        }

        if (prevState.$activeDataflowMenu.is("#dagNodeInfoPanel") &&
            !DagNodeInfoPanel.Instance.isOpen()) {
            $("#dagList").removeClass("xc-hidden");
        } else {
            prevState.$activeDataflowMenu.removeClass("xc-hidden");
        }

    };

    export function tempNoAnim(): void {
        checkAnim(true);
    };

    export function closeForms(): void {
        if (_isFormOpen) {
            ignoreRestoreState = true;
            formPanels.forEach((panel) => {
                if (panel["close"]) {
                    panel["close"]();
                }
            });

            ignoreRestoreState = false;
        }
    };

    function setupResizable(): void {
        const $menuPanel: JQuery = $mainMenu;
        const minWidth: number = defaultWidth + 3;
        let isSmall: boolean = true;
        $mainMenu.resizable({
            "handles": "e",
            "minWidth": 295,
            "distance": 2,
            "start": function() {
                // set boundaries so it can"t resize past window
                let panelRight: number = $menuPanel[0].getBoundingClientRect().right;

                panelRight = $(window).width() - panelRight +
                             $menuPanel.width();
                $menuPanel.css("max-width", panelRight - 10);
                $mainMenu.addClass("resizing");
            },
            "resize": function(event, ui) {
                if (!isSmall && ui.size.width < minWidth) {
                    $mainMenu.removeClass("expanded");
                    isSmall = true;
                } else if (isSmall && ui.size.width >= minWidth) {
                    $mainMenu.addClass("expanded");
                    isSmall = false;
                }
                DS.resize();
            },
            "stop": function() {
                $menuPanel.css("max-width", "").css("max-height", "");
                let width: number = $menuPanel.width();

                width = Math.min(width, $(window).width() - $("#menuBar").width() - 10);

                $menuPanel.width(width);
                $mainMenu.removeClass("resizing");
                const newWidth: number = $mainMenu.width();
                if (newWidth < minWidth) {
                    $mainMenu.width(defaultWidth);
                    $mainMenu.removeClass("expanded");
                    isSmall = true;
                } else {
                    $mainMenu.addClass("expanded");
                    isSmall = false;
                }
                currWidth = newWidth;
                // let codemirror know it's area was resized
                formPanels.forEach(function(panel) {
                    if (panel.isOpen()) {
                        if (panel.getEditor && panel.getEditor()) {
                            panel.getEditor().refresh();
                        }
                        if (panel["getSQLEditor"] && panel["getSQLEditor"]()) {
                            panel["getSQLEditor"]().refresh();
                        }
                        if (panel.panelResize) {
                            panel.panelResize();
                        }
                    }
                });
            },
        });
    }

    function setupBtns(): void {
        $mainMenu.find(".minimizeBtn").click(function() {
            MainMenu.close();
        });
    }

    function setupTabbing(): void {
        const $tabs: JQuery = $menuBar.find(".topMenuBarTab");

        $tabs.click(function(event) {
            WorkbookPanel.hide(true);

            const $curTab: JQuery = $(this);
            const $target: JQuery = $(event.target);

            resolveMenuAnim();
            $menuBar.removeClass("animating");
            clickable = true;

            if ($curTab.hasClass("active")) {
                if ($curTab.hasClass("noLeftPanel")) {
                    return;
                }
                let hasAnim: boolean = false;
                if ($target.closest(".mainTab").length) {
                    // clicking on active main tab
                    if ($("#container").hasClass("noWorkbookMenuBar") &&
                        $curTab.attr("id") === "dataStoresTab"
                    ) {
                        openIMDPanel();
                    } else {
                        const $subTab = $curTab.find(".subTab.active");
                        if (!$subTab.hasClass("noLeftPanel")) {
                            hasAnim = toggleMenu($curTab);
                        }
                    }
                } else if ($target.closest(".subTab").length) {
                    const $subTab = $target.closest(".subTab");
                    if ($subTab.hasClass("noLeftPanel")) {
                        closeMenu($curTab, true);
                    } else if ($subTab.hasClass("active")) {
                        // clicking on active sub tab
                        hasAnim = toggleMenu($curTab);
                    } else if ($("#bottomMenu").hasClass("open")) {
                        openMenu($curTab, true);
                        hasAnim = false;
                    } else {
                        hasAnim = false;
                    }
                    $curTab.find(".subTab").removeClass("active");
                    $subTab.addClass("active");

                }
                if (hasAnim) {
                    addAnimatingClass();
                }
            } else { // this tab was inactive, will make active
                const $lastActiveTab: JQuery = $tabs.filter(".active");
                const lastTabId: string = $lastActiveTab.attr("id");
                $lastActiveTab.addClass("noTransition")
                              .find(".icon")
                              .addClass("noTransition");
                // we dont want transition when active tab goes to inactive
                setTimeout(function() {
                    $tabs.removeClass("noTransition")
                         .find(".icon")
                         .removeClass("noTransition");
                }, 100);

                const noAnim: boolean = true;
                const $subTab: JQuery = $curTab.find(".subTab.active");
                if ($curTab.hasClass("mainMenuOpen") &&
                    !$curTab.hasClass("noLeftPanel") &&
                    !$subTab.hasClass("noLeftPanel")) {
                    openMenu($curTab, noAnim);
                } else {
                    closeMenu($curTab, noAnim);
                }

                panelSwitchingHandler($curTab, lastTabId);
                xcUIHelper.hideSuccessBox();
            }

        });

        $mainMenu[0].addEventListener(window["transitionEnd"], function(event) {
            if (!$(event.target).is("#mainMenu")) {
                return;
            }
            resolveMenuAnim();
        });
    }

    function resolveMenuAnim(): void {
        for (let i = 0; i < menuAnimCheckers.length; i++) {
            if (menuAnimCheckers[i]) {
                menuAnimCheckers[i].resolve();
            }
        }
        menuAnimCheckers = [];
    }


    function _checkMenuAnimFinish(): XDPromise<void> {
        const menuAnimDeferred: XDDeferred<void> = PromiseHelper.deferred();
        menuAnimCheckers.push(menuAnimDeferred);

        return menuAnimDeferred.promise();
    }

    function closeMainPanels(): void {
        $menuBar.find(".topMenuBarTab").removeClass("active");
        $(".mainPanel").removeClass("active");
    }

    function panelSwitchingHandler($curTab: JQuery, lastTabId: string): void {
        if (lastTabId === "monitorTab") {
            MonitorPanel.inActive();
        } else if (lastTabId === "modelingDataflowTab") {
            DagViewManager.Instance.hide();
        } else if (lastTabId === "sqlTab") {
            SQLWorkSpace.Instance.unfocus();
        }
        closeMainPanels();
        $("#container").removeClass("monitorViewOpen");
        const curTab: string = $curTab.attr("id");
        $menuBar.find(".topMenuBarTab").removeClass("active");
        $curTab.addClass("active");

        switch (curTab) {
            case ("dataStoresTab"):
                let noWorkbook: boolean = $("#container").hasClass("noWorkbookMenuBar");
                $("#datastorePanel").addClass("active");
                DSTable.refresh();
                if ($curTab.hasClass("firstTouch")) {
                    $curTab.removeClass("firstTouch");
                    DataSourceManager.initialize();
                    DSForm.initialize();
                    if (XVM.isSQLMode() && !noWorkbook) {
                        $("#sourceTblButton").click(); // switch to source panel
                    }
                }
                if ($curTab.find(".subTab.active").length === 0 && !noWorkbook) {
                    if (XVM.isSQLMode()) {
                        $("#sourceTblButton").click(); // switch to source panel
                    } else {
                        $("#inButton").click();
                    }
                } else if ($("#sourceTblButton").hasClass("active")) {
                    // when used to focus on table source
                    TblSource.Instance.refresh();
                }
                if (noWorkbook) {
                    openIMDPanel();
                }
                DS.resize();
                break;
            case ("monitorTab"):
                $("#monitorPanel").addClass("active");
                $("#container").addClass("monitorViewOpen");
                MonitorPanel.active();
                if ($curTab.hasClass("firstTouch")) {
                    $curTab.removeClass("firstTouch");
                    QueryManager.scrollToFocused();
                }
                break;
            case ("jupyterTab"):
                BottomMenu.unsetMenuCache();
                $("#jupyterPanel").addClass("active");
                JupyterPanel.sendInit(); // used to validate session if first
                // time viewing a notebook
                break;
            case ("modelingDataflowTab"):
                $("#modelingDagPanel").addClass("active");
                DagViewManager.Instance.show();
                break;
            case ("sqlTab"):
                BottomMenu.unsetMenuCache();
                $("#sqlWorkSpacePanel").addClass("active");
                SQLWorkSpace.Instance.focus();
                break;
            case ("helpTab"):
                $("#helpPanel").addClass("active");
                break;
            default:
                $(".underConstruction").addClass("active");
        }

        StatusMessage.updateLocation(null, null);
        $(".tableDonePopupWrap").remove();
    }

    function openIMDPanel(): void {
        closeMenu($("#dataStoresTab"), true);
        $("#imdTab").click();
    }

    function openMenu($curTab: JQuery, noAnim?: boolean): boolean {
        // Don't open side menu when the UDF panel is opening the file manager,
        // Otherwise the UDF panel will be blocked by the side menu.
        if ($("#udfSection").hasClass("switching")) {
            return;
        }

        const id: string = $curTab.attr("id");
        if (id === "dataStoresTab" && $("#imdTab").hasClass("active")) {
            return;
        }

        $mainMenu.find(".commonSection").removeClass("active").filter(function() {
            return $(this).data("tab") === id;
        }).addClass("active");
        if ($("#bottomMenu").hasClass("open") && !BottomMenu.isPoppedOut()) {
            noAnim = true;
        }
        checkAnim(noAnim);
        resolveMenuAnim();

        $mainMenu.addClass("open").removeClass("closed");
        $mainMenu.width(currWidth);

        if (BottomMenu.isMenuOpen()) {
            const mainMenuOpening = true;
            BottomMenu.close(mainMenuOpening);
        }
        _isMenuOpen = true;
        $("#container").addClass("mainMenuOpen");

        $curTab.addClass("mainMenuOpen");

        if ($("#monitor-queries").hasClass("active")) {
            QueryManager.scrollToFocused();
        }
        if ($("#modelingDagPanel").hasClass("active")) {
            if (noAnim) {
                DagCategoryBar.Instance.showOrHideArrows();
            } else {
                _checkMenuAnimFinish()
                .then(function() {
                    TblFunc.moveFirstColumn();
                    DagCategoryBar.Instance.showOrHideArrows();
                });
            }
        }
        return !noAnim;
    }

    // makeInactive is used in "noWorkbook" mode
    function closeMenu($curTab: JQuery, noAnim?: boolean, makeInactive?: boolean): void {
        checkAnim(noAnim);
        $mainMenu.removeClass("open");
        $mainMenu.width(defaultWidth);
        $mainMenu.find(".commonSection").removeClass("active");

        $("#container").removeClass("mainMenuOpen");
        if (!noAnim) {
            $curTab.removeClass("mainMenuOpen");
        }

        _isMenuOpen = false;

        setCloseClass(noAnim);

        if (makeInactive) {
            $curTab.removeClass("active");
        }


        IMDPanel.redraw();
        if ($("#modelingDagPanel").hasClass("active")) {
            if (noAnim) {
                DagCategoryBar.Instance.showOrHideArrows();
            } else {
                _checkMenuAnimFinish()
                .then(function() {
                    TblFunc.moveFirstColumn();
                    DagCategoryBar.Instance.showOrHideArrows();
                });
            }
        }
    }

    // turns off animation during open or close
    function checkAnim(noAnim: boolean): void {
        $mainMenu.removeClass("noAnim");
        $("#container").removeClass("noMenuAnim");
        if (noAnim) {
            $mainMenu.addClass("noAnim");
            $("#container").addClass("noMenuAnim");

            // noAnim classes only need to take effect for a split second
            // to get rid of transition animations
            setTimeout(function() {
                $mainMenu.removeClass("noAnim");
                $("#container").removeClass("noMenuAnim");
            }, 0);
        }
    }

    function toggleMenu($curTab): boolean {
        let hasAnim: boolean;
        if ($mainMenu.hasClass("open")) {
            closeMenu($curTab);
            hasAnim = true;
        } else {
            hasAnim = openMenu($curTab);
        }
        return hasAnim;
    }

    function setCloseClass(noAnim): void {
        if (noAnim) {
            $mainMenu.addClass("closed");
        } else {
            _checkMenuAnimFinish()
            .then(function() {
                $mainMenu.addClass("closed");
            });
        }
    }

    function addAnimatingClass(): void {
        clickable = false;
        $menuBar.addClass("animating");
        _checkMenuAnimFinish()
        .then(function() {
            $menuBar.removeClass("animating");
            clickable = true;
        });
    }
}
