/**
 * Base class of the Operation Panels.
 * It is a singleton.
 */
class BaseOpPanel {
    /**
     * Create DOM element from a string
     * @param htmlStr HTML string
     * @returns DOM element
     */
    public static createElementFromString(htmlStr: string): JQuery {
        return $($.trim(htmlStr));
    }

    /**
     * Creat DOM element specified by tagName
     * @param tagName HTML tag
     * @returns JQuery element
     * @description
     * Trying to create a element by using document.creatElement()
     * If the browser doesn't support document.createElement(), fallback to JQuery's way
     * Performance: document.createElement(tagName) is much faster than $(tagName)
     */
    public static createElement(tagName: string): JQuery {
        if (document && document.createElement) {
            return $(document.createElement(tagName));
        } else {
            return $(tagName);
        }
    }


    /**
     * Find a element in DOM by attribute data-xcid
     * @param $container The container element
     * @param xcid Value of data-xcid
     * @description The HTML looks like: <div data-xcid="yourXcID">...</div>
     */
    public static findXCElement(container: JQuery, xcid: string): JQuery {
        return container.find(`[data-xcid="${xcid}"]`);
    }

    /**
     * Read template content from a DOM element
     * @param container A ancestor element of the template
     * @param xcid Value of data-xcid
     */
    public static readTemplate(container: JQuery, xcid: string): string {
        return this.findXCElement(container, xcid).html();
    }


    public static craeteColumnListHTML(
        colType: ColumnType,
        colName: string,
        noTooltip: boolean = false
    ): HTML {
        const colNameTemplate: HTML = noTooltip ?
        '<div class="colName textOverflowOneLine">' +
            colName +
        '</div>'
        :
        '<div class="colName textOverflowOneLine' +
        ' tooltipOverflow"' +
        ' data-toggle="tooltip"' +
        ' data-container="body"' +
        ' data-placement="top"' +
        ' data-title="' + xcStringHelper.escapeHTMLSpecialChar(colName) + '">' +
            colName +
        '</div>';
        const html: HTML =
            '<div class="typeIcon flexContainer flexRow type-' + colType + '">' +
            '<div class="flexWrap flex-left" ' +
            ' data-toggle="tooltip"' +
            ' data-title="' + colType + '"' +
            ' data-container="body"' +
            ' data-placement="top"' +
            '>' +
            '<span class="iconHidden"></span>' +
            '<span class="type icon"></span>' +
            '</div>' +
            '<div class="flexWrap flex-mid">' +
                colNameTemplate +
            '</div>' +
            '<div class="flexWrap flex-right"></div>' +
            '</div>';
        return html;
    }

    public static createAddClauseButton(typeId: string): HTML {
        const html: HTML =
        '<div class="addArgWrap addArgWrapLarge">' +
            '<button class="btn btn-rounded addArg addExtraArg" data-typeid="' +
                typeId + '">' +
                '<span class="text">' + ExtTStr.AddClause + '</span>' +
            '</button>' +
        '</div>';
        return html;
    }

    public static getBasicColTypes(includeMixed: boolean = false): ColumnType[] {
        const types = [ColumnType.string, ColumnType.integer, ColumnType.float,
        ColumnType.boolean, ColumnType.timestamp, ColumnType.money];
        if (includeMixed) {
            types.push(ColumnType.mixed);
        }
        return types;
    }

    /**
    * xcHelper.addAggInputEvents
    * @param $aggInput
    */
    public static addAggInputEvents($aggInput: JQuery) {
       // focus, blur, keydown, input listeners ensures the aggPrefix
       // is always the first chracter in the colname input
       // and is only visible when focused or changed
       $aggInput.on('focus.aggPrefix', function() {
           // XXX FIX me, JQuery has no caret so has to use any
           const $input: any = $(this);
           if ($input.val().trim() === "") {
               $input.val(gAggVarPrefix);
               if ($input.caret() === 0 &&
                   ($input[0]).selectionEnd === 0) {
                   $input.caret(1);
               }
           }
       });

       $aggInput.on('blur.aggPrefix', function() {
           const $input: JQuery = $(this);
           if ($input.val().trim() === gAggVarPrefix) {
               $input.val("");
           }
       });

       $aggInput.on('keydown.aggPrefix', function(event) {
           // XXX FIX me, JQuery has no caret so has to use any
           const $input: any = $(this);
           if ($input.caret() === 0 &&
               ($input[0]).selectionEnd === 0) {
               event.preventDefault();
               $input.caret(1);
               return false;
           }
       });

       $aggInput.on('input.aggPrefix', function() {
           // XXX FIX me, JQuery has no caret so has to use any
           const $input: any = $(this);
           const val: string = $input.val();
           const trimmedVal: string = $input.val().trim();
           if (trimmedVal[0] !== gAggVarPrefix) {
               var caretPos = $input.caret();
               $input.val(gAggVarPrefix + val);
               if (caretPos === 0) {
                   $input.caret(1);
               }
           }
       });
    }


    public static counter = 0; // used to give is panel a unique id

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    public getEditor(): CodeMirror.EditorFromTextArea {
        return this._editor;
    }

    public isOpen(): boolean {
        return this._formHelper.isOpen();
    }

    public panelResize(): void {
        // implemented by inheritor
    }

    private static _instance = null;
    protected $panel: JQuery;
    private advancedMode: boolean;
    protected _formHelper: FormHelper = null;
    protected _editor: CodeMirror.EditorFromTextArea;
    private _exitCallback: Function;
    private _closeCallback: Function;
    private udfMap;
    private xdfMap;
    private panelNum: number;
    protected allColumns: ProgCol[];
    private aggMap;
    protected _dagNode: DagNode;
    protected _cachedBasicModeParam: string;
    protected codeMirrorOnlyColumns = false;
    protected codeMirrorNoAggs = false;
    protected _formCount = 0;
    private _validationList: { elem: HTMLElement, validate: () => string }[] = [];
    private _columnPicker: {
        target: HTMLElement; // The column name input box element
        setData: (colName: string) => void; // The callback function, which will be called when clicking a column in preview table
    } = { target: null, setData: null };

    protected constructor() {
        this.allColumns = [];
    }

    protected setup($panel: JQuery, options?: FormHelperOptions): void {
        options = options || {};
        this.panelNum = ++BaseOpPanel.counter;
        this.$panel = $panel;
        this._formHelper = new FormHelper($panel, options);
        this._setupEditor($panel);
        this._setupModeSwitch($panel);
        this._setupRestoreBtn();
        this._addBasicEventListeners();
        MainMenu.registerPanels(this);
    }

    protected _setupColumnPicker(opName: string): void {
        const opNameNoSpace: string = opName.toLowerCase().trim().replace(/ /g, "");
        const columnPickerOptions: ColumnPickerOptions = {
            state: `${opNameNoSpace}State`,
            keepFocus: true,
            colCallback: ($table) => {
                try {
                    const colClicked = xcUIHelper.getValueFromCell($table);
                    if (this.advancedMode && this._editor) {
                        this._editor.replaceSelection(colClicked);
                    } else {
                        const currentElement = document.activeElement;
                        if (currentElement !== this._columnPicker.target) {
                            return;
                        }

                        if (colClicked.length > 0 && this._columnPicker.setData) {
                            this._columnPicker.setData(colClicked);
                        }
                    }
                } catch(e) {
                    console.log(e);
                }
            }
        };
        this._formHelper.setup({"columnPicker": columnPickerOptions});
    }

    protected _setColumnPickerTarget(
        target: HTMLElement, setData: (colName: string) => void
    ): void {
        this._columnPicker.target = target;
        this._columnPicker.setData = setData;
    }

    protected _clearColumnPickerTarget(): void {
        this._columnPicker.target = null;
        this._columnPicker.setData = null;
    }

    protected showPanel(formName?: string, options?: ShowPanelInfo): XDPromise<void> {
        if (this._formHelper.isOpen()) {
            return PromiseHelper.reject();
        }
        this._formCount++;
        let formCount = this._formCount;
        this._reset();
        this._formHelper.showView(formName, this);
        MainMenu.setFormOpen();
        options = options || {};
        this._exitCallback = options.exitCallback || function () { };
        this._closeCallback = options.closeCallback || function () { };
        if (options.nonConfigurable) {
            $("#dataflowMenu .opPanel .bottomSection .btnWrap")
                .addClass("xc-disabled");
            if (this._editor) {
                this._editor.setOption("readOnly", true);
            }
        } else {
            $("#dataflowMenu .opPanel .opSection, .bottomSection .btnWrap")
                .removeClass("xc-disabled");
            if (this._editor) {
                this._editor.setOption("readOnly", false);
            }
        }
        this._formHelper.waitForSetup();
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        XDFManager.Instance.waitForSetup()
        .always(() => {
            if (formCount !== this._formCount) {
                return deferred.reject();
            }
            this._formHelper.unwaitForSetup();
            this._setupOperationsMap(options.udfDisplayPathPrefix);
            this._setupAggMap();
            deferred.resolve();
        });
        return deferred.promise();
    }

    protected hidePanel(isSubmit?: boolean): boolean {
        this._clearColumnPickerTarget();
        if (!this._formHelper.isOpen()) {
            return false;
        }
        this._formCount++;
        this._formHelper.unwaitForSetup();
        this._formHelper.removeWaitingBG();
        this._formHelper.hideView();
        this._formHelper.clear();
        this.allColumns = [];
        this.udfMap = {};
        this.xdfMap = {};
        this.aggMap = {};
        // unlocks the node associated with the form
        this._closeCallback();

        if (!isSubmit) {
            // when form is closed without submitting, we remove the node if it
            // was generate by the preview table column menu
            this._exitCallback();
        }
        return true;
    }

    protected toggleCheckbox($checkbox: JQuery, isCheck: boolean = true): void {
        if (isCheck) {
            if (!$checkbox.hasClass('checked')) {
                $checkbox.addClass('checked');
            }
        } else {
            $checkbox.removeClass('checked');
        }
    }

    protected _getPanel(): JQuery {
        return this.$panel;
    }


    public refreshColumns(_options?): void {
        // implemented by inheritor
    }

    protected _updateMode(toAdvancedMode: boolean) {
        const $panel: JQuery = this.$panel;
        const $switch: JQuery = $panel.find(".bottomSection .switch");
        if (toAdvancedMode) {
            $switch.addClass("on");
            $panel.addClass("advanced");
            this.advancedMode = true;
            if (this._editor) {
                this._editor.refresh();
            }
        } else {
            $switch.removeClass("on");
            $panel.removeClass("advanced");
            this.advancedMode = false;
            if (this._editor) {
                this._editor.setValue("");
            }
        }
    }

    protected _reset(): void {
        this._updateMode(false);
        if (this._editor) {
            this._editor.clearHistory();
        }
    }

    protected _isAdvancedMode(): boolean {
        return this.advancedMode;
    }

    protected _restoreBasicModeParams() {
        let val: string = this._cachedBasicModeParam;
        if (val == null) {
            console.error("cachedBasicModeParam is unset");
            val = "";
        }
        this._editor.setValue(val);
    }

    protected _switchMode(_toAdvancedMode: boolean): { error: string } {
        return null;
    }

    private _setupModeSwitch($panel: JQuery): void {
        const $switcher = $panel.find(".bottomSection .switcher");
        $switcher.on("click", ".switch", (event) => {
            const $switch: JQuery = $(event.target).closest(".switch");
            const toAdvanceMode: boolean = $switch.hasClass("on") ? false : true;
            const error: { error: string } = this._switchMode(toAdvanceMode);
            if (error == null) {
                this._updateMode(toAdvanceMode);
            } else {
                const $e = toAdvanceMode ? $panel.find(".opSection") : $panel.find(".advancedEditor");
                StatusBox.show(error.error, $e);
            }
        });
    }

    private _setupRestoreBtn(): void {
        this.$panel.find(".restoreAdvanced").click(() => {
            this._restoreBasicModeParams();
        });
    }

    private _setupEditor($panel: JQuery): void {
        const self = this;
        const $editor: JQuery = $panel.find(".advancedEditor textArea");
        if (!$editor.length) {
            return;
        }
        this._editor = CodeMirror.fromTextArea(<HTMLTextAreaElement>$editor[0], {
            "mode": {
                "name": "application/json"
            },
            "lint": true,
            "lineNumbers": true,
            "lineWrapping": true,
            "indentWithTabs": false,
            "indentUnit": 4,
            "matchBrackets": true,
            "autoCloseBrackets": true,
            "search": true,
            "gutters": ["CodeMirror-lint-markers"],
        });


        var keysToIgnore = [keyCode.Left, keyCode.Right, keyCode.Down,
        keyCode.Up, keyCode.Tab, keyCode.Enter,
        keyCode.Escape];

        this._editor.on("keyup", function (_cm, e) {
            if (keysToIgnore.indexOf(e.keyCode) < 0) {
                self._editor.execCommand("autocompleteOpPanel" + self.panelNum);
            }
        });

        // set up codemirror autcomplete command
        CodeMirror.commands["autocompleteOpPanel" + self.panelNum] = function (cm) {
            CodeMirror.showHint(cm, CodeMirror.hint["opPanel" + self.panelNum + "Hint"], {
                alignWithWord: true,
                completeSingle: false,
                completeOnSingleClick: true
            });
        };
        // var timer1;
        // set up autcomplete hint function that filters matches
        CodeMirror.registerHelper("hint", "opPanel" + self.panelNum + "Hint", (editor) => {
            var word = /[\w$:^\s]+/; // allow : and ^
            var wordNoSpace = /[\w$:^]+/; // allow : and ^ and space
            var cur = editor.getCursor();
            var line = cur.line;
            var fnBarText = editor.getLine(cur.line);
            var list = [];
            var seen = {};
            var end = cur.ch;
            var start = end;
            while (end && wordNoSpace.test(fnBarText.charAt(end))) {
                ++end;
            }
            while (start && word.test(fnBarText.charAt(start - 1))) {
                --start;
            }
            while (start && fnBarText.charAt(start) === " " && start < end) {
                ++start;
            }
            var curWord = (start !== end && fnBarText.slice(start, end));
            if (!curWord) {
                return;
            }
            let originalWord = curWord;
            curWord = curWord.toLowerCase();
            // search columnNames
            this.allColumns.forEach(function (progCol) {
                const colName = progCol.getBackColName();
                const colNameLower = colName.toLowerCase();
                if (colNameLower.indexOf(curWord) !== -1 &&
                    !seen.hasOwnProperty(colName)) {

                    seen[colName] = true;
                    list.push({
                        text: colName,
                        displayText: colName,
                        render: renderList,
                        className: "colName"
                    });
                }
            });

            if (!this.codeMirrorOnlyColumns) {
                // search xdfMap
                for (var xdfFn in this.xdfMap) {
                    searchMapFunction(xdfFn, this.xdfMap[xdfFn]);
                }

                // search udfMap
                for (var udfFn in this.udfMap) {
                    searchMapFunction(udfFn, this.udfMap[udfFn]);
                }

                if (!this.codeMirrorNoAggs) {
                    // search aggMap
                    for (var agg in this.aggMap) {
                        const aggLower = agg.toLowerCase();
                        if (aggLower.indexOf(curWord) !== -1 &&
                            !seen.hasOwnProperty(agg)) {
                            list.push({
                                text: agg,
                                displayText: agg,
                                render: renderList,
                                className: "colName"
                            });
                        }
                    }
                }
            }

            list.sort(function (a, b) {
                return a.displayText.length - b.displayText.length;
            });
            // do not show hint if only hint is an exact match
            if (list.length === 1 && originalWord === list[0].text) {
                list = [];
            }

            return ({
                list: list,
                from: CodeMirror.Pos(line, start),
                to: CodeMirror.Pos(line, end)
            });

            function searchMapFunction(fnName, mapFuncs) {
                const fnNameLower = fnName.toLowerCase();
                if (fnNameLower.lastIndexOf(curWord, 0) === 0 &&
                    !seen.hasOwnProperty(fnName)) {
                    seen[fnName] = true;
                    var mapFunc;
                    for (var i = 0; i < mapFuncs.length; i++) {
                        mapFunc = mapFuncs[i];
                        list.push({
                            text: mapFunc.fnName + "()",
                            displayText: mapFunc.fnName,
                            template: mapFunc.template,
                            templateTwo: mapFunc.templateTwo,
                            argDescs: mapFunc.modArgDescs,
                            hint: autocompleteSelect,
                            render: renderOpLi,
                            className: "operator"
                        });
                    }
                }
            }
        });

        function autocompleteSelect(cm, data, completion) {
            const line = cm.getCursor().line;
            var text = completion.templateTwo || completion.text;
            cm.replaceRange(text, data.from, data.to, "complete");
            var firstEndIndex;

            // highlight arguments and place cursor right after the end of the
            // first argument
            if (completion.argDescs) {
                var start = text.indexOf('(');
                var arg;
                for (var i = 0; i < completion.argDescs.length; i++) {
                    arg = completion.argDescs[i];
                    start = text.indexOf(arg, start);
                    if (!firstEndIndex && arg.length) {
                        // firstStartIndex = data.from.ch + start;
                        firstEndIndex = data.from.ch + start + arg.length;
                    }

                    cm.markText({ line: line, ch: data.from.ch + start },
                        { line: line, ch: data.from.ch + start + arg.length },
                        { className: "argDesc", atomic: true });
                }
            }
            if (firstEndIndex) {
                cm.setCursor(line, firstEndIndex);
                // xx selection doesn't work on atomic sections
                // cm.setSelection({line: 0, ch: firstStartIndex},
                //                 {line: 0, ch: firstEndIndex});
            } else {
                var to = data.from.ch + text.length - 1;
                cm.setCursor(line, to);
            }
        }

        function renderOpLi(el, _data, cur) {
            el.innerHTML = '<span class="displayText">' + cur.displayText +
                '</span><span class="template">' + cur.template +
                '</span>';
        }

        function renderList(el, _data, cur) {
            el.appendChild(document.createTextNode(cur.displayText));
        }
    }

    private _setupOperationsMap(udfDisplayPathPrefix?: string) {
        let udfPrefix = udfDisplayPathPrefix || UDFFileManager.Instance.getCurrWorkbookDisplayPath();
        let opMap = XDFManager.Instance.getOperatorsMapFromWorkbook(UDFFileManager.Instance.displayPathToNsPath(udfPrefix));
        this.xdfMap = {};
        this.udfMap = {};

        for (let category in opMap) {
            for (let i in opMap[category]) {
                var op = opMap[category][i];

                if (op.displayName) {
                    op.fnName = op.displayName;
                }

                var fnName = op.fnName.toLowerCase();
                if (op.category === FunctionCategoryT.FunctionCategoryUdf) {
                    if (!this.udfMap[fnName]) {
                        this.udfMap[fnName] = [];
                    }
                    this.udfMap[fnName].push(op);
                } else if (op.category !==
                    FunctionCategoryT.FunctionCategoryAggregate) {
                    if (!this.xdfMap[fnName]) {
                        this.xdfMap[fnName] = [];
                    }
                    this.xdfMap[fnName].push(op);
                }

                op.template = createFuncTemplate(op);
                var secondTemplate = createSecondaryTemplate(op);
                op.templateTwo = secondTemplate.template;
                op.modArgDescs = secondTemplate.argDescs;
            }
        }


        // the text that shows up in the list
        function createFuncTemplate(op) {
            var fnTemplate = op.fnName + '(';
            var len = op.argDescs.length;
            var argDesc;
            for (var j = 0; j < len; j++) {
                argDesc = op.argDescs[j].argDesc;
                fnTemplate += '<span class="argDesc">' + argDesc + '</span>';
                if (j + 1 < len) {
                    fnTemplate += ",";
                }
            }
            fnTemplate += ')';
            return fnTemplate;
        }

        // the text that shows up in the fnBar when selected
        function createSecondaryTemplate(op) {
            let fnTemplate = op.fnName + '(';
            let len = op.argDescs.length;
            let argDesc;
            let argDescs = [];
            let argDescSplit;
            for (var j = 0; j < len; j++) {
                argDesc = op.argDescs[j].argDesc.trim();
                argDescSplit = argDesc.split(" "); // separate by spaces
                if (argDescSplit.length > 2) {
                    argDesc = argDesc = "arg" + (j + 1);
                } else if (argDescSplit.length === 2) {
                    // camel case and join 2 words together
                    argDesc = argDescSplit[0] +
                        argDescSplit[1][0].toUpperCase() +
                        argDescSplit[1].slice(1);
                }
                argDescs.push(argDesc);

                fnTemplate += argDesc;
                if (j + 1 < len) {
                    fnTemplate += ", ";
                }
            }
            fnTemplate += ')';
            return { template: fnTemplate, argDescs: argDescs };
        }
    }

    private _setupAggMap() {
        this.aggMap = {};
        const aggs: {[key: string]: AggregateInfo} = DagAggManager.Instance.getAggMap();
        let tabId = DagTabManager.Instance.getPanelTabId();
        for (var a in aggs) {
            if (aggs[a].graph != tabId) {
                continue;
            }
            this.aggMap[aggs[a].aggName] = aggs[a].aggName;
        }
    }

    protected _clearValidationList() {
        this._validationList.splice(0, this._validationList.length);
    }

    protected _addValidation(elem: HTMLElement, validateFunc: () => string) {
        // XXX TODO: better not access the internal elements of a component
        this._validationList.push({
            elem: <any>$(elem).find('.selError')[0],
            validate: validateFunc
        });
    }

    protected _runValidation(): boolean {
        for (const { elem, validate } of this._validationList) {
            const err = validate();
            if (err != null) {
                StatusBox.show(err, $(elem));
                return false;
            }
        }
        return true;
    }

    private _addBasicEventListeners(): void {
        const $panel = this._getPanel();
        $panel.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });
    }

    // currently used when opening model with invalid args
    protected _startInAdvancedMode(error) {
        // the error may be a syntax error but that error is most likely caused
        // by an invalid struct so validate the input and report that error
        // instead
        let errorStr: string;
        if (error instanceof Error) {
            const inputError = this._dagNode.validateParam();
            if (inputError) {
                errorStr = inputError.error;
            }
        }
        if (!errorStr) {
            errorStr = xcHelper.parseJSONError(error).error;
        }

        MainMenu.checkMenuAnimFinish()
        .then(() => {
            StatusBox.show(errorStr,
                        this.$panel.find(".advancedEditor"),
                        false, {'side': 'right'});
        });

        this._dagNode.beErrorState(errorStr);
        this._updateMode(true);
        const paramStr = JSON.stringify(this._dagNode.getParam(), null, 4);
        this._cachedBasicModeParam = paramStr;
        this._editor.setValue(paramStr);
    }
}