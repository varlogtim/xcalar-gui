namespace BottomMenu {
    let clickable: boolean = true;
    let $bottomMenu: JQuery; //$("#bottomMenu");
    let _isMenuOpen: boolean = false;
    let _isPoppedOut: boolean = false;
    let menuAnimCheckers: XDDeferred<void>[] = [];

    export function setup(): void {
        $bottomMenu = $("#bottomMenu");
        setupButtons();
        Log.setup();
        initialize();
    };

    function initialize(): void {
        $bottomMenu[0].addEventListener(window["transitionEnd"], function(event) {
            if (!$(event.target).is("#bottomMenu")) {
                return;
            }
            if (!$bottomMenu.hasClass("open")) {
                $bottomMenu.find(".bottomMenuContainer").hide();
            }
            resolveMenuAnim();
        });
        $("#dagViewContent")[0].addEventListener(window["transitionEnd"], function(event) {
            if (!$(event.target).is("#dagViewContent")) {
                return;
            }
            resolveMenuAnim();
        });
    };

    export function close(): void {
        closeMenu();
    };

    export function isMenuOpen(): boolean {
        return _isMenuOpen;
    };

    export function isPoppedOut(): boolean {
        return _isPoppedOut;
    };

    export function openSection(sectionIndex: number): void {
        openMenu(sectionIndex);
    };

    export function openUDFMenuWithMainMenu(): void {
        openMenu(0, true);
    }

    // setup buttons to open bottom menu
    function setupButtons(): void {
        $bottomMenu.on("click", ".close", function() {
            BottomMenu.close();
        });

        $bottomMenu.on("click", ".popOut", function() {
            if ($bottomMenu.hasClass('poppedOut')) {
                // width is changing
                popInModal(true);
            } else {
                popOutModal();
            }
        });

        $bottomMenu.draggable({
            "handle": ".heading.draggable",
            "cursor": "-webkit-grabbing",
            "containment": "window"
        });

        let sideDragging: string;
        $bottomMenu.on("mousedown", ".ui-resizable-handle", function() {
            const $handle: JQuery = $(this);
            if ($handle.hasClass("ui-resizable-w")) {
                sideDragging = "left";
            } else if ($handle.hasClass("ui-resizable-e")) {
                sideDragging = "right";
            } else if ($handle.hasClass("ui-resizable-n")) {
                sideDragging = "top";
            } else if ($handle.hasClass("ui-resizable-s")) {
                sideDragging = "bottom";
            } else if ($handle.hasClass("ui-resizable-se")) {
                sideDragging = "bottomRight";
            }
        });

        let poppedOut: boolean = false;
        let menuIsSmall: boolean = false;
        const smallWidth: number = 425;

        $bottomMenu.resizable({
            "handles": "n, e, s, w, se",
            "minWidth": 295,
            "minHeight": 300,
            "start": function() {
                $("#container").addClass("menuResizing");
                if (!$bottomMenu.hasClass("poppedOut")) {
                    poppedOut = false;
                } else {
                    poppedOut = true;
                }

                // set boundaries so it can't resize past window
                let panelRight: number = $bottomMenu[0].getBoundingClientRect().right;
                let panelBottom: number = $bottomMenu[0].getBoundingClientRect().bottom;

                if (sideDragging === "left") {
                    $bottomMenu.css("max-width", panelRight - 10);
                } else if (sideDragging === "right") {
                    panelRight = $(window).width() - panelRight +
                                 $bottomMenu.width();
                    $bottomMenu.css("max-width", panelRight - 10);
                } else if (sideDragging === "top") {
                    $bottomMenu.css("max-height", panelBottom);
                } else if (sideDragging === "bottom") {
                    panelBottom = $(window).height() - panelBottom +
                                  $bottomMenu.height();
                    $bottomMenu.css("max-height", panelBottom);
                } else if (sideDragging === "bottomRight") {
                    panelRight = $(window).width() - panelRight +
                                 $bottomMenu.width();
                    $bottomMenu.css("max-width", panelRight);
                    panelBottom = $(window).height() - panelBottom +
                                  $bottomMenu.height();
                    $bottomMenu.css("max-height", panelBottom);
                }

                if ($bottomMenu.width() > 425) {
                    menuIsSmall = false;
                } else {
                    menuIsSmall = true;
                }
            },
            "resize": function(_event, ui) {
                if (ui.size.width > smallWidth) {
                    if (menuIsSmall) {
                        menuIsSmall = false;
                        $bottomMenu.removeClass("small");
                    }
                } else if (!menuIsSmall) {
                    menuIsSmall = true;
                    $bottomMenu.addClass("small");
                }
                refreshEditor();

                if (!poppedOut) {
                    return;
                }
                if (ui.position.left <= 0) {
                    $bottomMenu.css("left", 0);
                }
                if (ui.position.top <= 0) {
                    $bottomMenu.css("top", 0);
                }
            },
            "stop": function() {
                $bottomMenu.css("max-width", "").css("max-height", "");
                let width: number = $bottomMenu.width();

                width = Math.min(width, $(window).width() - $("#menuBar").width() - 10);
                $bottomMenu.width(width);
                if (width > 425) {
                    $bottomMenu.removeClass("small");
                } else {
                    $bottomMenu.addClass("small");
                }
                refreshEditor();
                $("#container").removeClass("menuResizing");
            }
        });

        $("#bottomMenuBarTabs").on("click", ".sliderBtn", function() {
            if (!clickable) {
                return;
            }
            toggleSection($(this).index("#bottomMenuBarTabs .sliderBtn"));
        });
    }

    function closeMenu() {
        $bottomMenu.removeClass("open");
        $("#container").removeClass("bottomMenuOpen");
        _isMenuOpen = false;
        // recenter table titles if on workspace panel
        $("#bottomMenuBarTabs .sliderBtn.active").removeClass("active");
        if (!_isPoppedOut && $("#sqlWorkSpacePanel").hasClass("active")) {
            checkAnimFinish()
            .then(function() {
                TblFunc.moveFirstColumn();
                DagCategoryBar.Instance.showOrHideArrows();
            });
        }
        popInModal(null, false);
    }

    function toggleSection(sectionIndex: number): void {
        if (sectionIndex == null) {
            sectionIndex = 0;
        }
        let hasAnim: boolean = true;

        const $menuSections: JQuery = $bottomMenu.find(".menuSection");
        // const $sliderBtns = $("#bottomMenuBarTabs .sliderBtn");
        const $section: JQuery = $menuSections.eq(sectionIndex);

        if ($bottomMenu.hasClass("open") && $section.hasClass("active")) {
            // section is active, close right side bar
            if ($bottomMenu.hasClass("poppedOut")) {
                // disable closing if popped out
                return;
            } else {
                closeMenu();
            }
        } else {
            hasAnim = openMenu(sectionIndex);
        }

        // dealay the next click as the menu open/close has animation
        if (hasAnim) {
            clickable = false;
            $("#menuBar").addClass("animating");
            checkAnimFinish()
            .then(function() {
                $("#menuBar").removeClass("animating");
                clickable = true;
            });
        }
    }

    function openMenu(sectionIndex: number, fromMainMenu?: boolean): boolean {
        // bottom menu was closed or it was open and we"re switching to
        // this section
        const $menuSections: JQuery = $bottomMenu.find(".menuSection");
        const $sliderBtns: JQuery = $("#bottomMenuBarTabs .sliderBtn");
        const $section: JQuery = $menuSections.eq(sectionIndex);
        let hasAnim: boolean = true;

        const wasOpen: boolean = $bottomMenu.hasClass("open");
        $sliderBtns.removeClass("active");
        let $activeBtn = $sliderBtns.eq(sectionIndex)
        $activeBtn.addClass("active");

        if (fromMainMenu) {
            $bottomMenu.addClass("fromMainMenu");
            $activeBtn.addClass("fromMainMenu");
        } else {
            $bottomMenu.removeClass("fromMainMenu");
            $activeBtn.removeClass("fromMainMenu");
        }

        $bottomMenu.find(".bottomMenuContainer").show();

        $menuSections.removeClass("active");
        // mark the section and open the menu
        $section.addClass("active");

        $bottomMenu.addClass("open");
        $("#container").addClass("bottomMenuOpen");
        _isMenuOpen = true;
        // recenter table titles only if: on workspace panel,
        // main menu was not open && bottom menu was not open
        if (!wasOpen) {
            checkAnimFinish()
            .then(function() {
                MainMenu.sizeRightPanel();
                if ($("#sqlWorkSpacePanel").hasClass("active")) {
                    TblFunc.moveFirstColumn();
                    DagCategoryBar.Instance.showOrHideArrows();
                }
                if (sectionId ==="udfSection") {
                    $("#udfButtonWrap").removeClass("xc-hidden");
                    UDFPanel.Instance.getEditor().focus();
                }
            });
        } else {
            TblFunc.moveFirstColumn();
            DagCategoryBar.Instance.showOrHideArrows();
            hasAnim = false;
        }

        const sectionId: string = $section.attr("id");
        if (sectionId ==="udfSection") {
            $("#udfButtonWrap").removeClass("xc-hidden");
            UDFPanel.Instance.switchMode(false);
        } else {
            $("#udfButtonWrap").addClass("xc-hidden");
        }



        refreshEditor();
        return hasAnim;
    }

    function noAnim(): void {
        $bottomMenu.addClass("noAnim");
        setTimeout(function() {
            $bottomMenu.removeClass("noAnim");
        }, 100);
    }

    function checkAnimFinish() {
        const menuAnimDeferred: XDDeferred<void> = PromiseHelper.deferred();
        menuAnimCheckers.push(menuAnimDeferred);
        return menuAnimDeferred.promise();
    }

    export function checkMenuAnimFinish(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (!$("#menuBar").hasClass("animating")) {
            deferred.resolve();
        } else {
            checkAnimFinish()
            .always(deferred.resolve);
        }

        return deferred.promise();
    }

    function popOutModal(): void {
        _isPoppedOut = true;
        const offset: {left: number, top: number} = $bottomMenu.offset();

        $bottomMenu.addClass("poppedOut");
        const $popOut: JQuery = $bottomMenu.find(".popOut");
        xcTooltip.changeText($popOut, SideBarTStr.PopBack);
        $popOut.removeClass("xi_popout").addClass("xi_popin");
        xcTooltip.hideAll();
        $bottomMenu.css({
            "left": offset.left - 5,
            "top": offset.top - 5
        });
        $("#container").addClass("bottomMenuOut");

        if ($("#sqlWorkSpacePanel").hasClass("active")) {
            checkAnimFinish()
            .then(function() {
                TblFunc.moveFirstColumn();
                DagCategoryBar.Instance.showOrHideArrows();
            });
        }
    }

    function popInModal(adjustTables: boolean = false, noAnimation: boolean = false): void {
        if (noAnimation) {
            noAnim();
        }

        $bottomMenu.removeClass("poppedOut");
        $bottomMenu.attr("style", "");

        const $popOut: JQuery = $bottomMenu.find(".popOut");
        xcTooltip.changeText($popOut, SideBarTStr.PopOut);
        $popOut.removeClass("xi_popin").addClass("xi_popout");
        xcTooltip.hideAll();
        $("#container").removeClass("bottomMenuOut");
        _isPoppedOut = false;

        checkAnimFinish()
        .then(function() {
            MainMenu.sizeRightPanel();
            refreshEditor();
            if (adjustTables && $("#sqlWorkSpacePanel").hasClass("active")) {
                TblFunc.moveFirstColumn();
                DagCategoryBar.Instance.showOrHideArrows();
            }
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

    function refreshEditor(): void {
        if ($("#udfSection").hasClass("active") &&
            !$("#udf-fnSection").hasClass("xc-hidden"))
        {
            UDFPanel.Instance.getEditor().refresh();
        }
    }
}
