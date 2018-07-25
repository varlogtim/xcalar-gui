interface DragHelperOptions {
    $container: JQuery,
    $dropTarget: JQuery,
    $element: JQuery,
    $elements?: JQuery,
    onDragStart?: Function,
    onDrag?: Function,
    onDragEnd: Function,
    onDragFail: Function,
    copy?: boolean,
    move?: boolean,
    event: JQueryEventObject
    offset?: Coordinate,
    noCursor?: boolean
}

interface DragHelperCoordinate {
    left: number,
    top: number,
    height: number,
    width: number
}

interface Coordinate {
    x: number,
    y: number
}

class DragHelper {
    protected $container: JQuery;
    protected $dropTarget: JQuery;
    protected onDragStartCallback: Function;
    protected onDragCallback: Function;
    protected onDragEndCallback: Function;
    protected onDragFailCallback: Function;
    protected $el: JQuery;
    protected $els: JQuery;
    protected $draggingEl: JQuery;
    protected $draggingEls: JQuery;
    protected mouseDownCoors: Coordinate;
    protected isDragging: boolean;
    protected targetRect: ClientRect;
    protected isOffScreen: boolean;
    protected offset: Coordinate;
    protected copying: boolean;
    protected origPositions: Coordinate[];
    protected currentDragCoor: DragHelperCoordinate;
    protected customOffset: Coordinate;
    protected dragContainerPositions: Coordinate[];
    protected noCursor: boolean;
    protected lastY: number;
    protected currY: number;
    protected scrollUpCounter: number;

    public constructor(options: DragHelperOptions) {
        this.$container = options.$container;
        this.$dropTarget = options.$dropTarget;
        this.$el = options.$element;
        if (options.$elements) {
            this.$els = options.$elements;
        } else {
            this.$els = this.$el;
        }
        this.onDragStartCallback = options.onDragStart;
        this.onDragCallback = options.onDrag;
        this.onDragEndCallback = options.onDragEnd;
        this.onDragFailCallback = options.onDragFail;
        this.copying = options.copy || false;
        this.$draggingEl = null;
        this.mouseDownCoors = {x: 0, y: 0};
        this.targetRect = new DOMRect();
        this.isOffScreen = false;
        this.origPositions = [];
        this.currentDragCoor = {left: 0, top: 0, height: 0, width: 0};
        this.isDragging = false;
        this.customOffset = options.offset || {x: 0, y: 0};
        this.dragContainerPositions = [];
        this.noCursor = options.noCursor || false;
        this.scrollUpCounter = 0;

        const self = this;
        this.mouseDownCoors = {
            x: options.event.pageX,
            y: options.event.pageY
        };
        this.lastY = this.mouseDownCoors.y;
        this.currY = this.lastY;

        $(document).on("mousemove.checkDrag", function(event: JQueryEventObject) {
            self.checkDrag(event);
        });

        $(document).on("mouseup.endDrag", function(event: JQueryEventObject) {
            self.endDrag(event);
        });
    }

    private checkDrag(event: JQueryEventObject): void {
        if (Math.abs(this.mouseDownCoors.x - event.pageX) < 2 &&
            Math.abs(this.mouseDownCoors.y - event.pageY) < 2) {
                return;
        }
        this.isDragging = true;
        $(document).off("mousemove.checkDrag");
        this.onDragStart(event);
    }

    private onDragStart(event: JQueryEventObject): void {
        const self = this;

        const cursorStyle = '<div id="moveCursor"></div>';
        $("body").addClass("tooltipOff").append(cursorStyle);
        if (this.noCursor) {
            $("#moveCursor").addClass("arrowOnly");
        }

        this.$els.each(function() {
            const elRect: DOMRect = this.getBoundingClientRect();
            self.origPositions.push({
                x: elRect.left,
                y: elRect.top
            });
        });

        this.targetRect = this.$dropTarget.parent()[0].getBoundingClientRect();

        this.createClone();
        this.positionDraggingEl(event);
        this.adjustScrollBar();

        $(document).on("mousemove.onDrag", function(event) {
            self.onDrag(event);
        });
        if (this.onDragStartCallback) {
            this.onDragStartCallback(this.$els, event);
        }
    }

    private onDrag(event: JQueryEventObject): void {
        this.currY = event.pageY;
        this.positionDraggingEl(event);
        if (this.onDragCallback) {
            this.onDragCallback({
                x: this.currentDragCoor.left,
                y: this.currentDragCoor.top
            });
        }
    }

    private adjustScrollBar(): void {
        if (!this.isDragging) {
            return;
        }
        const self = this;
        const pxToIncrement = 20;
        const horzPxToIncrement = 40;
        const deltaY = this.currY - this.lastY;
        const timer = 40;
        if (deltaY < 1) {
            this.scrollUpCounter++;
        } else {
            this.scrollUpCounter = 0;
        }

        if (this.currentDragCoor.left < this.targetRect.left) {
            const curScrollLeft: number = this.$dropTarget.parent().scrollLeft();
            this.$dropTarget.parent().scrollLeft(curScrollLeft - pxToIncrement);
            if (!this.isOffScreen) {
                this.isOffScreen = true;
                this.$draggingEl.addClass("isOffScreen");
            }
        } else if (this.currentDragCoor.top < this.targetRect.top) {
            // only scroll up if staying still or mouse is moving up
            if (this.scrollUpCounter * timer > 400) {
                const curScrollTop: number = this.$dropTarget.parent().scrollTop();
                this.$dropTarget.parent().scrollTop(curScrollTop - pxToIncrement);
            }

            if (!this.isOffScreen) {
                this.isOffScreen = true;
                this.$draggingEl.addClass("isOffScreen");
            }
        } else if ((this.currentDragCoor.top + this.currentDragCoor.height) > this.targetRect.bottom) {
            const curScrollTop: number = this.$dropTarget.parent().scrollTop();
            if (this.$dropTarget.parent()[0].scrollHeight - curScrollTop -
            this.$dropTarget.parent().outerHeight() <= 1) {
                const height: number = this.$dropTarget.height();
                this.$dropTarget.css("min-height", height + 10);
            }
            this.$dropTarget.parent().scrollTop(curScrollTop + pxToIncrement);

        } else if ((this.currentDragCoor.left + this.currentDragCoor.width) > this.targetRect.right) {
            const curScrollLeft: number = this.$dropTarget.parent().scrollLeft();
            if (this.$dropTarget.parent()[0].scrollWidth - curScrollLeft -
            this.$dropTarget.parent().outerWidth() <= 1) {
                const width: number = this.$dropTarget.find(".sizer").width();
                this.$dropTarget.find(".sizer").css("min-width", width + 20);
                this.$dropTarget.css("min-width", width + 20);
            }
            this.$dropTarget.parent().scrollLeft(curScrollLeft + horzPxToIncrement);

        } else if (this.isOffScreen) {
            this.isOffScreen = false;
            this.$draggingEl.removeClass("isOffScreen");
        }

        this.lastY = this.currY;

        setTimeout(function() {
            self.adjustScrollBar();
        }, timer);
    }

    private createClone(): void {
        const self = this;
        let minX: number = this.targetRect.right;
        let maxX: number = 0;
        let minY: number = this.targetRect.bottom;
        let maxY: number = 0;

        // find the left most element, right most, top-most, bottom-most
        // so we can create a div that's sized to encapsulate all dragging elements
        // and append these to the div
        this.$els.each(function() {
            let rect = this.getBoundingClientRect();
            minX = Math.min(minX, rect.left);
            maxX = Math.max(maxX, rect.right);
            minY = Math.min(minY, rect.top);
            maxY = Math.max(maxY, rect.bottom);
        });
        let width: number = maxX - minX;
        let height: number = maxY - minY;
        const left: number = minX;
        const top: number = minY;

        this.offset = {
            x: left - this.mouseDownCoors.x + this.customOffset.x,
            y: top - this.mouseDownCoors.y + this.customOffset.y
        };

        this.$draggingEl = $('<div class="dragContainer" style="width:' +
                            width + 'px;height:' + height + 'px;left:' + left +
                            'px;top:' + top + 'px;"></div>');
        this.currentDragCoor = {
            left: left,
            top: top,
            width: width,
            height: height
        };

        const $clones: JQuery = this.$els.clone();
        this.$draggingEl.append($clones);

        $clones.each(function(i: number) {
           let cloneLeft = self.origPositions[i].x - left;
           let cloneTop = self.origPositions[i].y - top;
            $(this).css({
                left: cloneLeft,
                top: cloneTop
            });
            self.dragContainerPositions.push({
                x: cloneLeft,
                y: cloneTop
            })
        });
        this.$container.append(this.$draggingEl);

        if (this.copying) {
            this.$draggingEls = $clones;
            this.$draggingEl.addClass("clone");
        } else {
            this.$draggingEls = this.$els;
            this.$draggingEls.addClass("dragSelected");
        }
    }

    private positionDraggingEl(event) {
        this.currentDragCoor.left = event.pageX + this.offset.x,
        this.currentDragCoor.top = event.pageY + this.offset.y

        this.$draggingEl.css({
            left: this.currentDragCoor.left,
            top: this.currentDragCoor.top
        });
    }

    protected endDrag(event: JQueryEventObject): void {
        const self = this;
        $("body").removeClass("tooltipOff");
        $("#moveCursor").remove();
        $(document).off("mousemove.checkDrag");
        $(document).off("mousemove.onDrag");
        $(document).off("mouseup.endDrag");
        if (!this.isDragging) {
            this.isDragging = false;
            this.onDragFailCallback();
            return;
        }
        this.positionDraggingEl(event);
        this.isDragging = false;
        this.$draggingEl.removeClass("dragging clone");

        let deltaX: number = self.currentDragCoor.left - self.targetRect.left + self.$dropTarget.parent().scrollLeft();
        let deltaY: number = self.currentDragCoor.top - self.targetRect.top + self.$dropTarget.parent().scrollTop();
        let coors: Coordinate[] = [];

        // check if item was dropped within left and top boundaries of drop target
        if (deltaX >= 0 && deltaY > 0) {
            this.dragContainerPositions.forEach(function(pos) {
                coors.push({
                    x: deltaX + pos.x,
                    y: deltaY + pos.y
                });
            });
        }

        this.$draggingEls.removeClass("dragSelected");
        this.$draggingEl.remove();

        if (coors.length) {
            this.onDragEndCallback(this.$draggingEls, event, {coors: coors});
        }
    }
}