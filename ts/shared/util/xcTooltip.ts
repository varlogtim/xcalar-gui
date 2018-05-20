namespace xcTooltip {
    export interface TooltipOptions {
        title: string;
        container?: string;
        placement?: string;
        trigger?: string;
        animation?: boolean;
    }

    // xcTooltip.Template
    export const Template: object = {
        'Error': '<div class="tooltip error" role="tooltip">' +
                    '<div class="tooltip-arrow"></div>' +
                    '<div class="tooltip-inner"></div>' +
                 '</div>'
    }

    // xcTooltip.Attrs
    export const Attrs: string = ' data-toggle="tooltip" data-container="body" ' +
                                 'data-placement="auto top" ';

    /**
     * xcTooltip.setup
     */
    export function setup(): void {
        $("body").tooltip(<any>{
            "selector": '[data-toggle="tooltip"]',
            "html": true,
            "delay": {
                "show": 250,
                "hide": 100
            }
        });

        // element's delay attribute will take precedence - unique for xcalar
        $("body").on("mouseenter", '[data-toggle="tooltip"]', function() {
            xcTooltip.hideAll();
        });
    }
    
    /**
     * xcTooltip.add, can accept multiple elements as $element
     * @param $element
     * @param options
     */
    export function add($element: JQuery, options: TooltipOptions): void {
        const defaultOptions: TooltipOptions = {
            "title": "",
            "container": "body",
            "placement": "auto top"
        };

        const toolTipOptions: TooltipOptions = $.extend(defaultOptions, options);
        $element.attr("title", "")
                .attr("data-toggle", "tooltip")
                .attr("data-container", toolTipOptions.container)
                .attr("data-placement", toolTipOptions.placement)
                .attr("data-original-title", toolTipOptions.title);
    }

    /**
     * xcTooltip.remove, can accept multiple elements as $element
     * @param $element
     */
    export function remove($element: JQuery): void {
        $element.removeAttr("title")
                .removeAttr("data-toggle")
                .removeAttr("data-container")
                .removeAttr("data-placement")
                .removeAttr("data-original-title");
        xcTooltip.hideAll();
    }

    /**
     * xcTooltip.transient, tooltip on element that only show for a short time
     * @param $element
     * @param options
     * @param delay
     */
    export function transient($element: JQuery, options: TooltipOptions, delay: number): number {
        const defaultOptions: TooltipOptions = {
            "title": "",
            "placement": "auto top",
            "animation": true,
            "container": "body",
            "trigger": "manual"
        };

        const toolTipOptions: TooltipOptions = $.extend(defaultOptions, options);
        $element.tooltip(<any>toolTipOptions);
        $element.tooltip("show");
        const $tooltip: JQuery = $element.data("bs.tooltip").$tip;
        let timer: number = null;
        if (delay != null) {
            timer = window.setTimeout(function() {
                if (document.body.contains($element[0])) {
                    $element.tooltip("destroy");
                } else {
                    $tooltip.remove();
                }
            }, delay);
        }

        return timer;
    }

    /**
     * xcTooltip.auto
     * @param element
     * @param target
     */
    export function auto(element: HTMLElement, target?: HTMLElement): void {
        const $element = $(element);
        target = target || element;

        if (target.offsetWidth < target.scrollWidth) {
            xcTooltip.enable($element);
        } else {
            xcTooltip.disable($element);
        }
    }

    /**
     * xcTooltip.hideAll
     */
    export function hideAll(): void {
        $(".tooltip").hide();
    }

    /**
     * xcTooltip.enable
     * @param $element
     */
    export function enable($element: JQuery): void {
        $element.attr("data-toggle", "tooltip");
    }

    /**
     * xcTooltip.disable
     * @param $element
     */
    export function disable($element: JQuery): void {
        $element.removeAttr("data-toggle")
                .removeAttr("title");
    }

    /**
     * xcTooltip.changeText
     * @param $element
     * @param text
     * @param allowEmpty
     */
    export function changeText(
        $element: JQuery,
        text: string,
        allowEmpty: boolean = false
    ): void {
        if (text != null || allowEmpty) {
            $element.attr("title", "")
                    .attr("data-original-title", text);
        }
    }

    /**
     * xcTooltip.refresh Shows the tooltip (And hides after delay ms)
     * @param $element Element to attach tooltip to
     * @param delay How long to show the tooltip for
     */
    export function refresh($element: JQuery, delay?: number) {
        const key: string = "xc-tooltipTimer";
        const oldTimer: number = $element.data(key);
        if (oldTimer != null) {
            // clear old timer
            clearTimeout(oldTimer);
        }

        // don't refresh tooltip if input is focused
        const $focusedEl: JQuery = $(document.activeElement);
        if ($focusedEl.is("input") || $focusedEl.is("textarea")) {
            return;
        }

        $element.tooltip("show");

        if (delay != null) {
            const timer: number = window.setTimeout(function() {
                $element.tooltip("hide");
                $element.removeData(key);
            }, delay);

            $element.data(key, timer);
        }
    }

    /**
     * xcTooltip.escapeHTML
     * @param str
     * @param ignoreTab
     */
    export function escapeHTML(str: string, ignoreTab: boolean = false): string {
        str = str.replace(/\&/g, "&amp;")
                 .replace(/\</g, "&lt;")
                 .replace(/\>/g, "&gt;")
                 .replace(/\&/g, "&amp;")
                 .replace(/\</g, "&lt;")
                 .replace(/\>/g, "&gt;")
                 .replace(/\"/g, "&quot;");
        if (!ignoreTab) {
            str = str.replace(/\\t/g, "&emsp;");
        }
        return str;
    }
}
