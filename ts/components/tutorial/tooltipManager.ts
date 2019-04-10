namespace TooltipManager {
    // default options
    let options = {
        overlayOpacity: 0.5,
        popoverPosition: 'bottom',
        popoverHorzPadding: 19,
        popoverVertPadding: 19,
        popoverMargin: 10,
        highlightPadding: 10,
        preventSelection: false, // prevent highlighted area from being clickable
        loop: false, // if true, returns to step 1 after last step
        includeNumbering: true,
        closeOnModalClick: false, // close modal when background is clicked
        actionsRequired: ""
    };
    // let options = {};
    let $currElem: JQuery;
    let $popover: JQuery;
    let validPositions: string[] = ['left', 'right', 'top', 'bottom'];
    let arrowHeight: number = 10;
    let currElemRect: ClientRect | DOMRect;
    let pathTemplate: string = "M0 0 L20000 0 L20000 20000 L 0 20000 Z ";
    let popoverBorderWidth: number = 2;
    let resizeTimeout;
    let stepNumber: number = -1;
    let video;
    let $videoCloseArea;
    let currWalkthrough: TooltipInfo[];
    let $clickEle: JQuery;
    let title: string;



    export function start(tooltipTitle: string, tooltips: TooltipInfo[], background: boolean,
            step: number, userOptions?) {
        stepNumber = step - 1;
        currWalkthrough = tooltips;
        title = tooltipTitle;

        if (userOptions) {
            setOptions(userOptions);
        }

        if (background) {
            createOverlay();
        }

        if (!$("#fileBrowser").hasClass("xc-hidden")) {
            // Close any file browser open, just in case.
            FileBrowser.close();
        }

        /*if (options.video) {
            setupVideo();
            setupVideoBreakpoints();
            options.preventSelection = false;
        }*/
        if (options.preventSelection) {
            createElementLayer();
        }
        createHighlightBox();
        createPopover();
        createWatermark();
        nextStep();
        $(window).resize(winResize);
        // temp
        //$('#xcalarVid').attr('muted', "true");

    };

    function createOverlay() {
        let svg: string = '<svg id="intro-overlay"><g><path id="intro-path"' +
                  ' d="' + pathTemplate + '"></path></g></svg>';
        let $overlay: JQuery = $(svg);
        $('body').append($overlay);
        setTimeout(function() {
            $overlay.css('opacity', options.overlayOpacity);
        }, 0);
        if (options.closeOnModalClick) {
            $overlay.mousedown(closeWalkthrough);
        }
    }

    function createHighlightBox() {
        $('body').append('<div id="intro-highlightBox"></div>');
    }

    function createElementLayer() {
        $('body').append('<div id="intro-elementLayer"></div>');
    }

    function createPopover() {
        // UI subject to change
        let popoverHtml: string = '<div id="intro-popover" style="padding:' +
                            options.popoverVertPadding + 'px ' +
                            options.popoverHorzPadding + 'px;">' +
                            '<div class="topArea">' +
                                '<div class="title">' +
                                    title +
                                '</div>' +
                                '<div class="close">' +
                                    '<i class="icon xc-action xi-close cancel"></i>' + 
                                '</div>' +
                            '</div>' +
                            '<div class="textContainer">' +
                                '<div class="text"></div>' +
                            '</div>' +
                            '<div class="bottomArea">' + 
                                '<div class="next">' +
                                    '<i class="icon xi-next"></i>' +
                                '</div>' +
                                '<div class="intro-number"></div>' +
                            '</div>' +
                            '<div class="intro-arrow top"></div>' +
                          '</div>';
        $popover = $(popoverHtml);
        $('body').append($popover);

        // fade in popover, currently 400 ms
        $popover.css('opacity', 0);
        setTimeout(function() {
            $popover.css('opacity', 1);
        }, 100);

        if (!options.includeNumbering) {
            $popover.find('.intro-number').hide();
        } 

        $popover.find('.next').click(function() {
            nextStep();
        });

        $popover.find('.close').click(function() {
            closeWalkthrough();
        });

    }
    function createWatermark() {
        $('body').append('<p id="intro-watermark">' + introTStr.watermark +'<br/><span id="intro-watermark-sub">' + introTStr.subWatermark +'</span></p>');
    }

    /* controls nextStep whether it be forward, backwards or skipping
    *  @param {Object} arg : options include skip: boolean, back: boolean
    */
    function nextStep(arg?) {
        stepNumber++;

        clearListeners();
        // if currentStep goes past total number of steps
        if (!(arg && arg.skip) && stepNumber >= currWalkthrough.length) {
            closeWalkthrough();
            return;
        }

        /**if (options.video) {
            $popover.css({'opacity': 0});

            if (stepNumber === 0) {
                $popover.css({'visibility': 'hidden'});
            } else {
                setTimeout(function(){
                    $popover.css({'visibility': 'hidden'});
                }, 1000);
            }

            removeHighlightBox();
            video.play();
            if (stepNumber >= currWalkthrough.length) {
                return;
            }
        }*/
        // prevent currentStep from going out of range
        stepNumber = Math.max(0, stepNumber);
        stepNumber = Math.min(stepNumber, currWalkthrough.length - 1);

        if (stepNumber >= currWalkthrough.length - 1) {
            showPopoverEndState();
        }

        highlightNextElement();
    }

    function clearListeners() {
        if ($clickEle) {
            $clickEle.off("click.tooltip");
            $clickEle.off("keyup.tooltip");
        }
    }

    /*
    * Set options
    * @param {Object} userOptions : options the user wishes to change
    */
   function setOptions(userOptions) {
        for (let option in userOptions) {
            options[option] = userOptions[option];
        }

        return (options);
    };

    function highlightNextElement() {
        // clean up previous elements
        let currentStep = currWalkthrough[stepNumber];

        $currElem = $(currentStep.highlight_div);

        $currElem.addClass('intro-highlightedElement');

        currElemRect = $currElem[0].getBoundingClientRect();

        moveElementLayer();
        moveHighlightBox();
        updatePopover(true);
    }

    function moveElementLayer() {
        let rect: ClientRect | DOMRect = currElemRect;
        if (options.preventSelection) {
            $('#intro-elementLayer').css({
                width: rect.width + 4,
                height: rect.height + 8,
                top: rect.top - 2,
                left: rect.left - 2
            });
        }
    }

    function updatePopover(initial?) {
        if (!initial) {
            $popover.css('opacity', 1);
        }
        clearListeners();

        let $popoverNumber = $popover.find('.intro-number');
        $popoverNumber.text("Steps " + String(stepNumber + 1) + "/" + currWalkthrough.length);
        let $infoArrow: JQuery = $popover.find('.intro-arrow');
        $infoArrow.removeClass('top bottom left right');
        $infoArrow.css({'top': 0, 'bottom': 'auto'});

        $popover.find('.text').html(currWalkthrough[stepNumber].text);
        let windowWidth: number = $(window).width();
        let windowHeight: number = $(window).height();
        let textHeight: number = $popover.find('.text').outerHeight();
        let textWidth: number = $popover.find('.text').outerWidth();
        let popoverHeight: number = textHeight + (options.popoverVertPadding * 2) +
                            (popoverBorderWidth * 2);
        // we can't directly calculate popover width because it has a
        // width transition that changes its width over time
        let popoverWidth: number = textWidth +
                           (options.popoverHorzPadding * 2) +
                           (popoverBorderWidth * 2);
        let rect: ClientRect | DOMRect = currElemRect;
        let top: number = 0;
        let minLeft: number = 5;
        let center: number = rect.left + (rect.width / 2);
        let centerVert: number = rect.top + (rect.height / 2);
        let tempLeft: number = center - (popoverWidth / 2);
        let left: number = Math.max(minLeft, tempLeft);
        let userPosition = $currElem.data('introposition');
        let positionIndex: number = validPositions.indexOf(userPosition);
        if (positionIndex !== -1 ) {
            userPosition = validPositions[positionIndex];
        } else {
            userPosition = 'auto';
        }

        if (userPosition === 'auto') {
            if (options.popoverPosition === 'bottom') {
                let bottomOfPopover: number = rect.bottom + popoverHeight +
                                      options.popoverMargin + arrowHeight;
                if (bottomOfPopover <= windowHeight) {
                    top = rect.bottom + options.popoverMargin + arrowHeight;
                    $infoArrow.addClass('bottom');
                } else {
                    top = rect.top - popoverHeight -
                          options.popoverMargin - arrowHeight;
                    $infoArrow.addClass('top');
                }
            }
        } else {
            switch (userPosition) {
                case ('top'):
                    top = currElemRect.top - popoverHeight -
                          options.popoverMargin - arrowHeight;
                    break;
                case ('bottom'):
                    top = rect.bottom + options.popoverMargin + arrowHeight;
                    break;
                case ('left'):
                    top = currElemRect.top +
                         ((currElemRect.height - popoverHeight) / 2);
                    left = currElemRect.left - popoverWidth -
                           options.popoverMargin - arrowHeight;
                    $infoArrow.css({
                        'left': 'auto'
                    });
                    $popoverNumber.addClass('left');
                    break;
                case ('right'):
                    top = currElemRect.top +
                         ((currElemRect.height - popoverHeight) / 2);
                    left = currElemRect.right + options.popoverMargin +
                           arrowHeight;
                    break;
            }

            $infoArrow.addClass(userPosition);
        }
        top = Math.max(0, top);
        top = Math.min(windowHeight - popoverHeight, top);
        $popover.css('top', top);


        if (left + popoverWidth > windowWidth) {
            left = windowWidth - popoverWidth - options.popoverMargin;
            $infoArrow.css('left', currElemRect.left - left - 5);
            $popoverNumber.addClass('left');
        }

        $popover.css({
            'left': left
        });

        if (!$infoArrow.hasClass('left') && !$infoArrow.hasClass('right')) {
            let arrowLeft: number = Math.max(5, center - left - arrowHeight);
            let maxArrowLeft: number = popoverWidth - (arrowHeight * 2) - 5;
            arrowLeft = Math.min(arrowLeft, maxArrowLeft);
            $infoArrow.css('left', arrowLeft);
        } else {
            let currentArrowTop: number = top + popoverBorderWidth;
            let vertDiff: number = centerVert - currentArrowTop;
            // console.log(currentArrowTop, centerVert, vertDiff);
            $infoArrow.css('top', vertDiff - 10);

        }

        $popover.find('.textContainer').height(textHeight);

        let currentStep: TooltipInfo = currWalkthrough[stepNumber];

        if (currentStep.type != TooltipType.Text) {
            $popover.find(".next").addClass("unavailable");
            if (currentStep.type == TooltipType.Click) {
                $clickEle = $(currentStep.interact_div);
                $clickEle.on("click.tooltip", (e) => {
                    $clickEle.off("click.tooltip");
                    e.stopPropagation();
                    $clickEle.click();
                    nextStep();
                });
            } else if (currentStep.type == TooltipType.Value) {
                $clickEle = $(currentStep.interact_div);
                $clickEle.on("keyup.tooltip", () => {
                    if ($clickEle.val() == currentStep.value) {
                        $clickEle.off("keyup.tooltip");
                        nextStep();
                    }
                })
            }
        } else {
            $popover.find(".next").removeClass("unavailable");
        }
    }

    function moveHighlightBox() {
        let rect: ClientRect | DOMRect = currElemRect;
        $('#intro-highlightBox').css({
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left
        });

        let left: number = rect.left - options.highlightPadding;
        let right: number = rect.right + options.highlightPadding;
        let top: number = rect.top - options.highlightPadding;
        let bottom: number = rect.bottom + options.highlightPadding;
        let path: string = pathTemplate +
                   ' M' + left + ' ' + top +
                   ' L' + right + ' ' + top +
                   ' L' + right + ' ' + bottom +
                   ' L' + left + ' ' + bottom;

        if (d3) { //  how do we do a better check for d3?
            d3.select('#intro-path').transition().duration(300)
                                    .ease('ease-out').attr('d', path);
        } else {
            $('#intro-path').attr('d', path);
        }
    }

    function removeHighlightBox() {
        $('#intro-overlay path').attr('d', pathTemplate);
    }

    function winResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            if ($currElem.length) {
                currElemRect = $currElem[0].getBoundingClientRect();
                moveElementLayer();
                updatePopover();
                moveHighlightBox();
            }
            //adjustVideoClosePosition();
        }, 40);
    }

    function showPopoverEndState() {
        $popover.find('.next, .skip').addClass('unavailable');
    }


    export function closeWalkthrough() {
        stepNumber = -1;
        removeHighlightBox();

        $('#intro-overlay').css('opacity', 0);
        $('#intro-videoClose').remove();
        setTimeout(function() {
            $('#intro-overlay').remove();
        }, 300);
        $popover.css('opacity', 0).remove();
        $('#intro-highlightBox').remove();
        $('#intro-elementLayer').remove();
        $('#intro-watermark').remove();
        $('.intro-highlightedElement').removeClass('intro-highlightedElement');
        $('intro-popover').remove();
        $(window).off('resize', winResize);
    }

    /**function setupVideo() {
        let $video = $(options.video);
        video = $video[0];
        video.play();
        let closeHtml = '<div id="intro-videoClose">' +
                            '<span>' +
                                CommonTxtTstr.Exit.toUpperCase() +
                            '</span>' +
                        '</div>';
        $('body').append(closeHtml);
        $videoCloseArea = $('#intro-videoClose');
        $videoCloseArea.click(function() {
            closeWalkthrough();
        });
        video.onloadedmetadata = adjustVideoClosePosition;
        video.onended = function() {
            $('#intro-videoClose').show();
        };
    }

    function setupVideoBreakpoints() {

        video.addEventListener("timeupdate", function() {
            if (this.currentTime >= options.videoBreakpoints[stepNumber]) {
                this.pause();
                moveHighlightBox();
                // highlightNextElement();
                $popover.css({'visibility': 'visible', 'opacity': 1});
            }
        });
    }

    function adjustVideoClosePosition() {
        if (!options.video) {
            return;
        }
        let $video = $(options.video);
        let offsetTop = $video.offset().top;
        let offsetLeft = $video.offset().left;
        let width = $video.width();
        let height = $video.height();
        $videoCloseArea.css({
            top: offsetTop,
            left: offsetLeft,
            width: width,
            height: height
        });
    }*/
}

enum TooltipType {
    Click = "click",
    Text = "text",
    Value = "value"
}