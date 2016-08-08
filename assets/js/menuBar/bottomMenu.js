window.BottomMenu = (function($, BottomMenu) {
    var delay = 200;
    var clickable = true;
    var $menuPanel; //$("#bottomMenu");
    // var slideTimeout;
    var isMenuOpen;

    BottomMenu.setup = function() {
        $menuPanel = $("#bottomMenu");
        setupButtons();
        SQL.setup();
        UDF.setup();
        // CLIBox.setup();
        Help.setup();
    };

    BottomMenu.initialize = function() {
        try {
            UDF.initialize();
        } catch (error) {
            console.error(error);
            Alert.error(ThriftTStr.SetupErr, error);
        }
    };

    BottomMenu.clear = function() {
        UDF.clear();
        SQL.clear();
        // CLIBox.clear();
    };

    BottomMenu.close = function(topMenuOpening) {
        if ($menuPanel.hasClass('poppedOut')) {
            setTimeout(function() {
                closeMenu(topMenuOpening);
            }, 100);
        } else {
            closeMenu(topMenuOpening);
        }
        popInModal();
    };

    BottomMenu.isMenuOpen = function() {
        return (isMenuOpen);
    };

    // setup buttons to open bottom menu
    function setupButtons() {
        $menuPanel.on("click", ".close", function() {
            if ($menuPanel.hasClass('poppedOut')) {
                setTimeout(function() {
                    closeMenu();
                }, 100);
            } else {
                closeMenu();
            }
            popInModal();
        });

        $menuPanel.on("click", ".popOut", function() {
            if ($menuPanel.hasClass('poppedOut')) {
                popInModal();
            } else {
                popOutModal();
            }
        });

        $menuPanel.draggable({
            "handle"     : ".heading.draggable",
            "cursor"     : "-webkit-grabbing",
            "containment": "window"
        });

        var sideDragging;
        $menuPanel.on('mousedown', '.ui-resizable-handle', function() {
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
        var udfEditorVisible = false;
        var $udfSection = $('#udfSection');
        var $udfFnSection = $('#udf-fnSection');
        var editor; // cannot assign it here because may not be ready

        $menuPanel.resizable({
            "handles"  : "n, e, s, w, se",
            "minWidth" : 296,
            "minHeight": 300,
            "start"    : function() {
                if (!$menuPanel.hasClass('poppedOut')) {
                    poppedOut = false;
                } else {
                    poppedOut = true;
                }

                udfEditorVisible = $udfSection.hasClass('active') &&
                                   !$udfFnSection.hasClass('hidden');
                if (udfEditorVisible) {
                    editor = UDF.getEditor();
                }

                // set boundaries so it can't resize past window
                var panelRight = $menuPanel[0].getBoundingClientRect().right;
                var panelBottom = $menuPanel[0].getBoundingClientRect().bottom;

                if (sideDragging === "left") {
                    $menuPanel.css('max-width', panelRight - 10);
                } else if (sideDragging === "right") {
                    panelRight = $(window).width() - panelRight +
                                 $menuPanel.width();
                    $menuPanel.css('max-width', panelRight);
                } else if (sideDragging === "top") {
                    $menuPanel.css('max-height', panelBottom);
                } else if (sideDragging === "bottom") {
                    panelBottom = $(window).height() - panelBottom +
                                  $menuPanel.height();
                    $menuPanel.css('max-height', panelBottom);
                } else if (sideDragging === "bottomRight") {
                    panelRight = $(window).width() - panelRight +
                                 $menuPanel.width();
                    $menuPanel.css('max-width', panelRight);
                    panelBottom = $(window).height() - panelBottom +
                                  $menuPanel.height();
                    $menuPanel.css('max-height', panelBottom);
                }

                if ($menuPanel.width() > 425) {
                    menuIsSmall = false;
                } else {
                    menuIsSmall = true;
                }
            },
            "stop": function() {
                $menuPanel.css('max-width', '').css('max-height', '');

                if ($menuPanel.width() > 425) {
                    $menuPanel.removeClass('small');
                } else {
                    $menuPanel.addClass('small');
                }
                if (udfEditorVisible) {
                    editor.refresh();
                }
            },
            "resize": function(event, ui) {
                if (ui.size.width > smallWidth) {
                    if (menuIsSmall) {
                        menuIsSmall = false;
                        $menuPanel.removeClass('small');
                    }
                } else if (!menuIsSmall) {
                    menuIsSmall = true;
                    $menuPanel.addClass('small');
                }
                if (udfEditorVisible) {
                    editor.refresh();
                }

                if (!poppedOut) {
                    return;
                }
                if (ui.position.left <= 0) {
                    $menuPanel.css('left', 0);
                }
                if (ui.position.top <= 0) {
                    $menuPanel.css('top', 0);
                }
            }
            // containment: "document"
        });

        // $menuPanel.on("resize", function() {
        //     CLIBox.realignNl();
        // });

        $("#bottomMenuBarTabs").on("click", ".sliderBtn", function() {
            if (!clickable) {
                return;
            }
            toggleSection($(this).index());
        });
    }

    function closeMenu(topMenuOpening) {
        $("#bottomMenu").removeClass("open");
        $('#container').removeClass('bottomMenuOpen');
        isMenuOpen = false;
        // recenter table titles if on workspace panel
        
        $("#bottomMenuBarTabs .sliderBtn.active").removeClass("active");
        if (topMenuOpening) {
            noAnim();
        } else if ($('#workspacePanel').hasClass('active')) {
            moveTableTitles(null, {
                "offset"       : -285,
                "menuAnimating": true,
                "animSpeed"    : delay
            });
        }
    }

    function toggleSection(sectionIndex) {
        if (sectionIndex == null) {
            sectionIndex = 0;
        }

        var $menuSections = $menuPanel.find(".menuSection");
        var $sliderBtns = $("#bottomMenuBarTabs .sliderBtn");
        var $section = $menuSections.eq(sectionIndex);

        if ($menuPanel.hasClass("open") && $section.hasClass("active")) {
            // section is active, close right side bar
            if (!$menuPanel.hasClass('poppedOut')) {
                // disable closing if popped out
                closeMenu();
            }
        } else {
            // bottom menu was closed or it was open and we're switching to
            // this section
            var wasOpen = $menuPanel.hasClass('open');
            $sliderBtns.removeClass("active");
            $sliderBtns.eq(sectionIndex).addClass("active");

            $menuSections.removeClass("active");
            // mark the section and open the menu
            $section.addClass("active");
            var isBottomMenuOpening = false;
            if ($('#mainMenu').hasClass('open')) {
                isBottomMenuOpening = true;
                MainMenu.close(isBottomMenuOpening);
                noAnim();
            }

            $menuPanel.addClass("open");
            $('#container').addClass('bottomMenuOpen');
            isMenuOpen = true;
            // recenter table titles only if: on workspace panel,
            // main menu was not open && bottom menu was not open
            if (!isBottomMenuOpening && !wasOpen) {
                if ($('#workspacePanel').hasClass('active')) {
                    moveTableTitles(null, {
                        "offset"       : 285,
                        "menuAnimating": true,
                        "animSpeed"    : delay
                    });
                }
            } else {
                $('#container').addClass('noMenuAnim');
                setTimeout(function() {
                    $('#container').removeClass('noMenuAnim');
                }, delay);
            }

            if ($section.attr("id") === "sqlSection") {
                SQL.scrollToBottom();
                $("#sqlButtonWrap").removeClass("xc-hidden");
            } else {
                $("#sqlButtonWrap").addClass("xc-hidden");
            }
            // if ($section.attr("id") === "cliSection") {
            //     CLIBox.realignNl();
            // }
            OperationsView.closeOpSection();
            JoinModal.close();

        }

        // dealay the next click as the menu open/close has animation
        clickable = false;
        setTimeout(function() {
            clickable = true;
        }, delay);
    }

    function noAnim() {
        $menuPanel.addClass('noAnim');
        setTimeout(function() {
            $menuPanel.removeClass('noAnim');
        }, delay);
    }

    function popOutModal() {
        var offset = $menuPanel.offset();

        $menuPanel.addClass('poppedOut');
        $menuPanel.find('.popOut')
                .attr('data-original-title', SideBarTStr.PopBack)
                .removeClass("xi_popout").addClass("xi_popin");
        $('.tooltip').hide();
        $menuPanel.css({
            "left": offset.left - 5,
            "top" : offset.top - 5
        });
        $('#container').addClass('bottomMenuOut');
    }

    function popInModal() {
        $menuPanel.removeClass('poppedOut');
        $menuPanel.attr('style', "");
        $menuPanel.find('.popOut')
                .attr('data-original-title', SideBarTStr.PopOut)
                .removeClass("xi_popin").addClass("xi_popout");
        $('.tooltip').hide();
        // CLIBox.realignNl();
        $('#container').removeClass('bottomMenuOut');
    }

    return (BottomMenu);
}(jQuery, {}));
