window.BottomMenu = (function($, BottomMenu) {
    var clickable = true;
    var $menuPanel; //$("#bottomMenu");
    var isMenuOpen = false;
    var isPoppedOut = false;
    var menuAnimCheckers = [];
    var needsMainMenuBackOpen = false;

    BottomMenu.setup = function() {
        $menuPanel = $("#bottomMenu");
        setupButtons();
        Log.setup();
        UDFPanel.Instance.setup();
        HelpPanel.Instance.setup();
        DocsPanel.Instance.setup();
    };

    BottomMenu.initialize = function() {
        try {
            UDFFileManager.Instance.initialize();
        } catch (error) {
            console.error(error);
            Alert.error(ThriftTStr.SetupErr, error);
        }
        $menuPanel[0].addEventListener(transitionEnd, function(event) {
            if (!$(event.target).is("#bottomMenu")) {
                return;
            }
            if (!$menuPanel.hasClass("open")) {
                $menuPanel.find(".bottomMenuContainer").hide();
            }
            resolveMenuAnim();
        });
    };

    // BottomMenu.clear = function() {
    //     UDFPanel.Instance.clear();
    //     Log.clear();
    // };

    BottomMenu.close = function(topMenuOpening) {
        closeMenu(topMenuOpening);
        if (topMenuOpening) {
            resolveMenuAnim();
        }
    };

    BottomMenu.isMenuOpen = function() {
        return isMenuOpen;
    };

    BottomMenu.isPoppedOut = function() {
        return isPoppedOut;
    };

    BottomMenu.openSection = function(sectionIndex) {
        openMenu(sectionIndex);
    };

    // setup buttons to open bottom menu
    function setupButtons() {
        $menuPanel.on("click", ".close", function() {
            BottomMenu.close(false);
        });

        $menuPanel.on("click", ".popOut", function() {
            if ($menuPanel.hasClass('poppedOut')) {
                // width is changing
                popInModal(true);
            } else {
                popOutModal();
            }
        });

        $menuPanel.draggable({
            "handle": ".heading.draggable",
            "cursor": "-webkit-grabbing",
            "containment": "window"
        });

        var sideDragging;
        $menuPanel.on("mousedown", ".ui-resizable-handle", function() {
            var $handle = $(this);
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

        var poppedOut = false;
        var menuIsSmall = false;
        var smallWidth = 425;

        $menuPanel.resizable({
            "handles": "n, e, s, w, se",
            "minWidth": 295,
            "minHeight": 300,
            "start": function() {
                $("#container").addClass("menuResizing");
                if (!$menuPanel.hasClass("poppedOut")) {
                    poppedOut = false;
                } else {
                    poppedOut = true;
                }

                // set boundaries so it can't resize past window
                var panelRight = $menuPanel[0].getBoundingClientRect().right;
                var panelBottom = $menuPanel[0].getBoundingClientRect().bottom;

                if (sideDragging === "left") {
                    $menuPanel.css("max-width", panelRight - 10);
                } else if (sideDragging === "right") {
                    panelRight = $(window).width() - panelRight +
                                 $menuPanel.width();
                    $menuPanel.css("max-width", panelRight - 10);
                } else if (sideDragging === "top") {
                    $menuPanel.css("max-height", panelBottom);
                } else if (sideDragging === "bottom") {
                    panelBottom = $(window).height() - panelBottom +
                                  $menuPanel.height();
                    $menuPanel.css("max-height", panelBottom);
                } else if (sideDragging === "bottomRight") {
                    panelRight = $(window).width() - panelRight +
                                 $menuPanel.width();
                    $menuPanel.css("max-width", panelRight);
                    panelBottom = $(window).height() - panelBottom +
                                  $menuPanel.height();
                    $menuPanel.css("max-height", panelBottom);
                }

                if ($menuPanel.width() > 425) {
                    menuIsSmall = false;
                } else {
                    menuIsSmall = true;
                }
            },
            "stop": function() {
                $menuPanel.css("max-width", "").css("max-height", "");
                var width = $menuPanel.width();

                width = Math.min(width, $(window).width() - $("#menuBar").width() - 10);

                $menuPanel.width(width);
                if (width > 425) {
                    $menuPanel.removeClass("small");
                } else {
                    $menuPanel.addClass("small");
                }
                refreshEditor();
                $("#container").removeClass("menuResizing");
            },
            "resize": function(event, ui) {
                if (ui.size.width > smallWidth) {
                    if (menuIsSmall) {
                        menuIsSmall = false;
                        $menuPanel.removeClass("small");
                    }
                } else if (!menuIsSmall) {
                    menuIsSmall = true;
                    $menuPanel.addClass("small");
                }
                refreshEditor();

                if (!poppedOut) {
                    return;
                }
                if (ui.position.left <= 0) {
                    $menuPanel.css("left", 0);
                }
                if (ui.position.top <= 0) {
                    $menuPanel.css("top", 0);
                }
            }
            // containment: "document"
        });

        $("#bottomMenuBarTabs").on("click", ".sliderBtn", function() {
            if (!clickable) {
                return;
            }
            toggleSection($(this).index("#bottomMenuBarTabs .sliderBtn"));
        });
    }

    function closeMenu(topMenuOpening) {
        if (needsMainMenuBackOpen && !topMenuOpening) {
            needsMainMenuBackOpen = false;
            if ($(".topMenuBarTab.active").hasClass("mainMenuOpen")) {
                MainMenu.open();
                return;
            }
        }
        $menuPanel.removeClass("open");
        $("#container").removeClass("bottomMenuOpen");
        isMenuOpen = false;
        // recenter table titles if on workspace panel
        $("#bottomMenuBarTabs .sliderBtn.active").removeClass("active");
        if ((topMenuOpening && !isPoppedOut) ||  $("#container").hasClass("noWorkbookMenuBar")){
            noAnim();
        } else if (!isPoppedOut && $("#modelingDagPanel").hasClass("active")) {
            checkMenuAnimFinish()
            .then(function() {
                DagCategoryBar.Instance.showOrHideArrows();
            });
        }
        popInModal(null, topMenuOpening);
        return !topMenuOpening;
    }

    function toggleSection(sectionIndex) {
        if (sectionIndex == null) {
            sectionIndex = 0;
        }
        var hasAnim = true;

        var $menuSections = $menuPanel.find(".menuSection");
        // var $sliderBtns = $("#bottomMenuBarTabs .sliderBtn");
        var $section = $menuSections.eq(sectionIndex);

        if ($menuPanel.hasClass("open") && $section.hasClass("active")) {
            // section is active, close right side bar
            if ($menuPanel.hasClass("poppedOut")) {
                // disable closing if popped out
                return;
            } else {
                if (needsMainMenuBackOpen || $("#container").hasClass("noWorkbookMenuBar")) {
                    hasAnim = false;
                }
                closeMenu();
            }
        } else {
            hasAnim = openMenu(sectionIndex);
        }

        // dealay the next click as the menu open/close has animation
        if (hasAnim) {
            clickable = false;
            $("#menuBar").addClass("animating");
            checkMenuAnimFinish()
            .then(function() {
                $("#menuBar").removeClass("animating");
                clickable = true;
            });
        }
    }

    BottomMenu.unsetMenuCache = function() {
        needsMainMenuBackOpen = false;
    };

    function openMenu(sectionIndex) {
        // bottom menu was closed or it was open and we"re switching to
        // this section
        var $menuSections = $menuPanel.find(".menuSection");
        var $sliderBtns = $("#bottomMenuBarTabs .sliderBtn");
        var $section = $menuSections.eq(sectionIndex);
        var hasAnim = true;

        var wasOpen = $menuPanel.hasClass("open");
        $sliderBtns.removeClass("active");
        $sliderBtns.eq(sectionIndex).addClass("active");

        $menuPanel.find(".bottomMenuContainer").show();

        $menuSections.removeClass("active");
        // mark the section and open the menu
        $section.addClass("active");
        var isBottomMenuOpening = false;
        if ($("#mainMenu").hasClass("open")) {
            needsMainMenuBackOpen = true;
            isBottomMenuOpening = true;
            MainMenu.close(isBottomMenuOpening);
            noAnim();
            hasAnim = false;
        }
        if ($("#container").hasClass("noWorkbookMenuBar")) {
            isBottomMenuOpening = true;
        }

        $menuPanel.addClass("open");
        $("#container").addClass("bottomMenuOpen");
        isMenuOpen = true;
        // recenter table titles only if: on workspace panel,
        // main menu was not open && bottom menu was not open
        if (!isBottomMenuOpening && !wasOpen) {
            if ($("#modelingDagPanel").hasClass("active")) {
                checkMenuAnimFinish()
                .then(function() {
                    DagCategoryBar.Instance.showOrHideArrows();
                });
            }
        } else {
            $("#container").addClass("noMenuAnim");
            // only needed for a split second to remove animation effects
            setTimeout(function() {
                $("#container").removeClass("noMenuAnim");
            }, 0);
            DagCategoryBar.Instance.showOrHideArrows();
            hasAnim = false;
        }

        var sectionId = $section.attr("id");
        if (sectionId ==="udfSection") {
            $("#udfButtonWrap").removeClass("xc-hidden");
        } else {
            $("#udfButtonWrap").addClass("xc-hidden");
        }

        if (sectionId === "helpSection") {
            $("#helpButtonWrap").removeClass("xc-hidden");
        } else {
            $("#helpButtonWrap").addClass("xc-hidden");
        }

        refreshEditor();
        return hasAnim;
    }

    function noAnim() {
        $menuPanel.addClass("noAnim");
        setTimeout(function() {
            $menuPanel.removeClass("noAnim");
        }, 100);
    }

    function checkMenuAnimFinish() {
        var menuAnimDeferred = PromiseHelper.deferred();
        menuAnimCheckers.push(menuAnimDeferred);
        return menuAnimDeferred.promise();
    }

    function popOutModal() {
        isPoppedOut = true;
        var offset = $menuPanel.offset();

        $menuPanel.addClass("poppedOut");
        var $popOut = $menuPanel.find(".popOut");
        xcTooltip.changeText($popOut, SideBarTStr.PopBack);
        $popOut.removeClass("xi_popout").addClass("xi_popin");
        xcTooltip.hideAll();
        $menuPanel.css({
            "left": offset.left - 5,
            "top": offset.top - 5
        });
        $("#container").addClass("bottomMenuOut");
        if ($("#modelingDagPanel").hasClass("active")) {
            checkMenuAnimFinish()
            .then(function() {
                DagCategoryBar.Instance.showOrHideArrows();
            });
        }
    }

    function popInModal(adjustTables, noAnimation) {
        if (noAnimation) {
            noAnim();
        }

        $menuPanel.removeClass("poppedOut");
        $menuPanel.attr("style", "");
        var $popOut = $menuPanel.find(".popOut");
        xcTooltip.changeText($popOut, SideBarTStr.PopOut);
        $popOut.removeClass("xi_popin").addClass("xi_popout");
        xcTooltip.hideAll();
        $("#container").removeClass("bottomMenuOut");
        isPoppedOut = false;
        refreshEditor();

        if (adjustTables && $("#modelingDagPanel").hasClass("active")) {
            checkMenuAnimFinish()
            .then(function() {
                DagCategoryBar.Instance.showOrHideArrows();
            });
        }
    }

    function resolveMenuAnim() {
        for (var i = 0; i < menuAnimCheckers.length; i++) {
            if (menuAnimCheckers[i]) {
                menuAnimCheckers[i].resolve();
            }
        }
        menuAnimCheckers = [];
    }

    function refreshEditor() {
        if ($("#udfSection").hasClass("active") &&
            !$("#udf-fnSection").hasClass("xc-hidden"))
        {
            UDFPanel.Instance.getEditor().refresh();
        }
    }

    return (BottomMenu);
}(jQuery, {}));
