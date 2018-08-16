class FilterOpPanel extends GeneralOpPanel {
    protected _dagNode: DagNodeFilter;
    private filterData;

    public constructor() {
        super();
        this._operatorName = "filter";
    }

    public setup(): void {
        const self = this;
        super.setupPanel("#filterOpPanel");

        this._$panel.find('.addFilterArg').click(function() {
            // self._addFilterGroup();
            // self._$panel.find(".andOrToggle").show();
            self.filterData.addGroup();
        });

        this._$panel.on('click', '.closeGroup', function() {
            const $group = $(this).closest('.group');
            const index = self._$panel.find(".group").index($group);
            // self._removeGroup($group);
            self.filterData.removeGroup(index);
        });

        this._functionsInputEvents();

        let argumentTimer;
        // .arg (argument input)
        this._$panel.on("input", ".arg", function(_event, options) {
            // Suggest column name
            const $input = $(this);
            const val = $input.val();
            // let inputSelf = this;

            if (val !== "" &&
                $input.closest('.inputWrap').siblings('.inputWrap')
                                            .length === 0) {
                // hide empty options if input is dirty, but only if
                // there are no sibling inputs from extra arguments
                self._hideEmptyOptions($input);
            }

            clearTimeout(argumentTimer);
            argumentTimer = setTimeout(function() {
                if (options && options.insertText) {
                    return;
                }

                self._argSuggest($input);
                self._checkIfStringReplaceNeeded();
                // argChange.bind(inputSelf)();
            }, 200);


            if (options && options.insertText) {
                argChange.bind(this)();
                self._checkIfStringReplaceNeeded();
            } else {
                self._updateStrPreview();
            }
        });

        this._$panel.on("change", ".arg", argChange);

        function argChange() {
            const $input = $(this);
            const val = $input.val();
            const $group = $input.closest(".group")
            const groupIndex = self._$panel.find(".group").index($group);
            const argIndex = $group.find(".arg:visible").index($input);
            self.filterData.updateArg(val, groupIndex, argIndex);
        }

        // toggle filter and/or
        this._$panel.find(".switch").click(function() {
            const wasAnd = $(this).hasClass("on");
            self.filterData.toggleAndOr(wasAnd);
            self._updateStrPreview(false, true);
        });
    };

    // options
    // restore: boolean, if true, will not clear the form from it's last state
    // restoreTime: time when previous operation took place
    // triggerColNum: colNum that triggered the opmodal
    public show(node: DagNodeFilter, options) {
        const self = this;
        options = options || {};
        let deferred = PromiseHelper.deferred();

        super.show(node, options)
        .then(() => {
            self.filterData = new FilterOpPanelModel(node, () => {
                self._render();
            });
            super._panelShowHelper(self.filterData);
            self._$panel.find('.functionsInput').focus();

            self._formHelper.refreshTabbing();
            self._render();

            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    protected _render(): void {
        const model = this.filterData.getModel();
        const self = this;

        self._resetForm();

        for (let i = 0; i < model.groups.length; i++) {
            let $group = this._$panel.find('.group').eq(i);
            if (!$group.length) {
                this._addFilterGroup();
                $group = this._$panel.find('.group').eq(i);
            }
            const operator: string = model.groups[i].operator;
            if (!operator) {
                continue;
            }
            const $funcInput: JQuery = $group.find(".functionsInput");
            $funcInput.val(operator);
            $funcInput.data("value", operator.trim().toLowerCase());
            if (operator !== "") {
                self._updateArgumentSection(i);
            }

            const $args = $group.find(".arg:visible").filter(function() {
                return $(this).closest(".colNameSection").length === 0;
            });

            for (let j = 0; j < model.groups[i].args.length; j++) {
                let arg = model.groups[i].args[j].value;

                $args.eq(j).val(arg);
                if ($args.eq(j).closest(".row").hasClass("boolOption")) {
                    if (arg === "true") {
                        $args.eq(j).closest(".row")
                                .find(".boolArgWrap .checkbox")
                                .addClass("checked");
                    }
                }
            }
        }

        if (model.groups.length > 1) {
            self._$panel.find(".andOrToggle").show();
            if (model.andOrOperator === "or") {
                self._$panel.find(".andOrToggle .switch").removeClass("on");
            } else {
                self._$panel.find(".andOrToggle .switch").addClass("on");
            }
        } else {
            self._$panel.find(".andOrToggle").hide();
        }

        this._checkIfStringReplaceNeeded(true);
    }

    private _functionsInputEvents() {
        const self = this;
        this._$panel.on("mousedown", ".functionsInput", function() {
            const $list = $(this).siblings('.list');
            if (!$list.is(':visible')) {
                self._hideDropdowns();
            }
        });

        this._$panel.on("click", ".functionsInput", function() {
            const $input = $(this);
            const $list = $input.siblings('.list');
            if (!$list.is(':visible')) {
                self._hideDropdowns();
                self._$panel.find('li.highlighted')
                                .removeClass('highlighted');
                // show all list options when use icon to trigger
                $list.show().find('li').sort(self._sortHTML)
                                        .prependTo($list.children('ul'))
                                        .show();
                const fnInputNum = parseInt($input.data('fninputnum'));

                self._functionsListScrollers[fnInputNum]
                            .showOrHideScrollers();

            }
        });

        this._$panel.on("keydown", ".functionsInput", function(event) {
            const $input = $(this);
            if (event.which === keyCode.Enter || event.which ===
                keyCode.Tab) {
                const $li = $input.siblings(".list").find("li.highlighted");
                if ($li.length === 1) {
                    self._fnListMouseup(event, $li);
                    return false;
                }

                const value = $input.val().trim().toLowerCase();
                const prevValue = $input.data("value");
                $input.data("value", value);

                if (value === "") {
                    self._clearFunctionsInput($input.data('fninputnum'));
                    return;
                }
                $input.blur();
                self._hideDropdowns();

                if (prevValue === value && event.which === keyCode.Tab) {
                    return;
                }

                self._enterFunctionsInput($input.data('fninputnum'));
                // prevent modal tabbing
                return (false);
            } else if (event.which === keyCode.Escape) {
                self._hideDropdowns();
                return false;
            }
        });

        this._$panel.on("input", ".functionsInput", function() {
            self._suggest($(this));
        });

        this._$panel.on("change", ".functionsInput", function() {
            if (!self._allowInputChange) {
                return;
            }

            const $input = $(this);
            const value = $input.val().trim().toLowerCase();
            $input.data("value", value);

            // find which element caused the change event;
            const $changeTarg = gMouseEvents.getLastMouseDownTarget();

            // if change caused by submit btn, don't clear the input and
            // enterFunctionsInput() will do a check for validity
            if (!$changeTarg.closest('.submit').length &&
                !self._isOperationValid($input.data('fninputnum'))) {
                self._clearFunctionsInput($input.data('fninputnum'), true);
                return;
            }

            if ($input.val() !== "") {
                self._enterFunctionsInput($input.data('fninputnum'));
            }
        });

        // click icon to toggle functions list
        this._$panel.on('click', '.functionsList .dropdown', function() {
            const $list = $(this).siblings('.list');
            self._hideDropdowns();

            self._$panel.find('li.highlighted')
                        .removeClass('highlighted');
            // show all list options when use icon to trigger
            $list.show().find('li').sort(self._sortHTML)
                                    .prependTo($list.children('ul'))
                                    .show();
            $list.siblings('input').focus();

            const fnInputNum = parseInt($list.siblings('input')
                                            .data('fninputnum'));
            self._functionsListScrollers[fnInputNum].showOrHideScrollers();
        });

        this._$panel.on('mousedown', '.functionsList .dropdown', function() {
            const $list = $(this).siblings('.list');
            if ($list.is(':visible')) {
                self._allowInputChange = false;
            } else {
                self._allowInputChange = true;
            }
        });

        // only for category list and function menu list
        this._$panel.on({
            'mousedown': function() {
                // do not allow input change
                self._allowInputChange = false;
            },
            'mouseup': function(event) {
                if (event.which !== 1) {
                    return;
                }
                self._fnListMouseup(event, $(this));
            }
        }, '.functionsList .list li');

        const $functionsList = this._$panel.find('.functionsList');
        let functionsListScroller = new MenuHelper($functionsList, {
            bounds: self._panelSelector,
            bottomPadding: 5
        });
        this._functionsListScrollers = [functionsListScroller];
    }

    protected _populateInitialCategoryField() {
        this._functionsMap = {};
        this._categoryNames = [];
        let categoryName;
        const categoryIndex = FunctionCategoryT.FunctionCategoryCondition;

        categoryName = FunctionCategoryTStr[categoryIndex].toLowerCase();
        this._categoryNames.push(categoryName);
        const ops = this._operatorsMap[categoryIndex];
        this._functionsMap[0] = ops;

        this._populateFunctionsListUl(0);
    }

    // map should not call this function
    protected _populateFunctionsListUl(groupIndex): void {
        const categoryIndex: number = FunctionCategoryT.FunctionCategoryCondition;
        const ops = this._operatorsMap[categoryIndex];
        let html: HTML = "";
        for (let i = 0, numOps = ops.length; i < numOps; i++) {
            html += '<li class="textNoCap">' + ops[i].displayName + '</li>';
        }
        this._$panel.find('.genFunctionsMenu ul[data-fnmenunum="' +
                                groupIndex + '"]')
                        .html(html);
    }

    // suggest value for .functionsInput
    protected _suggest($input): void {
        const value: string = $input.val().trim().toLowerCase();
        const $list: JQuery = $input.siblings('.list');

        this._$panel.find('li.highlighted').removeClass('highlighted');

        $list.show().find('li').hide();

        const $visibleLis: JQuery = $list.find('li').filter(function() {
            return (value === "" ||
                    $(this).text().toLowerCase().indexOf(value) !== -1);
        }).show();

        $visibleLis.sort(this._sortHTML).prependTo($list.find('ul'));
        $visibleLis.eq(0).addClass('highlighted');

        const fnInputNum = parseInt($list.siblings('input')
                                        .data('fninputnum'));
        this._functionsListScrollers[fnInputNum].showOrHideScrollers();

        if (value === "") {
            return;
        }

        // put the li that starts with value at first,
        // in asec order
        for (let i = $visibleLis.length; i >= 0; i--) {
            const $li = $visibleLis.eq(i);
            if ($li.text().startsWith(value)) {
                $list.find('ul').prepend($li);
            }
        }
    }

    // index is the argument group numbers
    protected _enterFunctionsInput(index) {
        index = index || 0;
        if (!this._isOperationValid(index)) {
            this._showFunctionsInputErrorMsg(index);
            this._clearFunctionsInput(index);
            return;
        }

        // this._updateArgumentSection(index);
        const func = this._$panel.find(".group").eq(index).find('.functionsInput').val().trim();
        const categoryNum = FunctionCategoryT.FunctionCategoryCondition;
        const ops = this._operatorsMap[categoryNum];
        const operObj = ops.find((op) => {
            return op.displayName === func;
        });
        this.filterData.enterFunction(func, operObj, index);
        this._focusNextInput(index);
    }

    protected _clearFunctionsInput(groupNum: number, keep?: boolean) {
        const $argsGroup = this._$panel.find('.group').eq(groupNum);
        if (!keep) {
            $argsGroup.find('.functionsInput')
                        .val("").attr('placeholder', "");
        }

        $argsGroup.find('.genFunctionsMenu').data('category', 'null');
        $argsGroup.find('.argsSection').last().addClass('inactive');
        $argsGroup.find('.descriptionText').empty();
        $argsGroup.find('.functionsInput').data("value", "");
        this._hideDropdowns();
        this.filterData.clearFunction(groupNum);
        this._checkIfStringReplaceNeeded(true);
    }

    protected _showFunctionsInputErrorMsg(groupNum) {
        let text = ErrTStr.NoSupportOp;
        let $target;
        groupNum = groupNum || 0;
        $target = this._$panel.find('.group').eq(groupNum)
                              .find(".functionsInput");
        if ($.trim($target.val()) === "") {
            text = ErrTStr.NoEmpty;
        }

        StatusBox.show(text, $target, false, {"offsetX": -5,
                                                preventImmediateHide: true});
    }

    // $li = map's function menu li
    // groupIndex, the index of a group of arguments (multi filter)
    protected _updateArgumentSection(groupIndex) {
        const $argsGroup = this._$panel.find('.group').eq(groupIndex);
        const categoryNum = FunctionCategoryT.FunctionCategoryCondition;
        const category = FunctionCategoryTStr[categoryNum].toLowerCase();
        // const category = this._categoryNames[categoryNum];
        const func = $argsGroup.find('.functionsInput').val().trim();
        const ops = this._operatorsMap[categoryNum];

        const operObj = ops.find((op) => {
            return op.displayName === func;
        });

        const $argsSection = $argsGroup.find('.argsSection').last();
        const firstTime = $argsSection.html() === "";
        $argsSection.removeClass('inactive');
        $argsSection.empty();
        $argsSection.data("fnname", operObj.displayName);

        let defaultValue = ""; // to autofill first arg

        if ((GeneralOpPanel.firstArgExceptions[category] &&
            GeneralOpPanel.firstArgExceptions[category].indexOf(func) !== -1) ||
            groupIndex > 0)
        {
            // do not give default value if not the first group of args
            defaultValue = "";
        } else if (!this._isNewCol && this._colName) {
            if (this._isArgAColumn(this._colName)) {
                defaultValue = gColPrefix + this._colName;
            } else {
                defaultValue = "";
            }
        }

        const numArgs = Math.max(Math.abs(operObj.numArgs),
                                operObj.argDescs.length);

        const numInputsNeeded = numArgs;

        this._addArgRows(numInputsNeeded, $argsGroup, groupIndex);
        // get rows now that more were added
        const $rows = $argsSection.find('.row');

        this._hideCastColumn(groupIndex);

        // sets up the args generated by backend, not front end arguments such
        // as new column name input
        this._setupBasicArgInputsAndDescs(numArgs, operObj, $rows, defaultValue);

        const strPreview = this._filterArgumentsSetup(operObj);

        // hide any args that aren't being used
        $rows.show().filter(":gt(" + (numArgs - 1) + ")").hide();

        const despText = operObj.fnDesc || "N/A";
        const descriptionHtml = '<b>' + OpFormTStr.Descript + ':</b> ' +
                    '<span class="instrText">' + despText + '</span>';

        $argsGroup.find('.descriptionText').html(descriptionHtml);

        this._$panel.find('.strPreview')
                        .html('<b>' + OpFormTStr.CMD + ':</b> <br>' +
                                strPreview);


        this._formHelper.refreshTabbing();

        const noHighlight = true;
        this._checkIfStringReplaceNeeded(noHighlight);
        if ((this._$panel.find('.group').length - 1) === groupIndex) {
            const noAnim = (firstTime && groupIndex === 0);
            this._scrollToBottom(noAnim);

        }
    }

    protected _addArgRows(numInputsNeeded, $argsGroup, groupIndex) {
        const self = this;
        const $argsSection = $argsGroup.find('.argsSection').last();
        let argsHtml = "";
        for (let i = 0; i < numInputsNeeded; i++) {
            argsHtml += this._getArgHtml();
        }

        $argsSection.append(argsHtml);
        this._addCastDropDownListener();
        self._suggestLists[groupIndex] = [];

        this._$panel.find('.list.hint.new').each(function() {
            const scroller = new MenuHelper($(this), {
                bounds: self._panelSelector,
                bottomPadding: 5
            });
            self._suggestLists[groupIndex].push(scroller);
            $(this).removeClass('new');
        });
    }

    // sets up the args generated by backend, not front end arguments
    protected _setupBasicArgInputsAndDescs(numArgs, operObj, $rows, defaultValue)
    {
        let description;
        let typeId;
        let types;
        for (let i = 0; i < numArgs; i++) {
            if (operObj.argDescs[i]) {
                description = operObj.argDescs[i].argDesc;
                typeId = operObj.argDescs[i].typesAccepted;
            } else {
                description = "";
                const keyLen = Object.keys(DfFieldTypeT).length;
                typeId = Math.pow(2, keyLen + 1) - 1;
            }
            types = this._parseType(typeId);
            const $input = $rows.eq(i).find('.arg');

            if (i === 0) {
                $input.val(defaultValue);
            } else {
                $input.val("");
            }
            $input.data("typeid", typeId);

            // special case to ignore removing autoquotes from
            // function-like arguments if it is 2nd regex input
            if (operObj.displayName === "regex" && i === 1) {
                $input.data("nofunc", true);
            }

            const $row = $rows.eq(i);

            $row.find('.description').text(description + ':');

            // automatically show empty checkbox if optional detected
            if (operObj.argDescs[i].argType === XcalarEvalArgTypeT.OptionalArg)
            {
                if (types.length === 1 && types[0] === ColumnType.boolean ||
                    (types.length === 2 &&
                        types.indexOf(ColumnType.boolean) > -1 &&
                        types.indexOf(ColumnType.undefined) > -1)) {
                    // one case is the "contains" function
                    this._addBoolCheckbox($input);
                } else {
                    this._showEmptyOptions($input);
                }
            } else {
                $row.addClass("required").find(".noArgWrap").remove();
            }

            if (types.indexOf(ColumnType.string) === -1) {
                $row.find('.emptyStrWrap').remove();
            }

            // add "addArg" button if *arg is found in the description
            if (operObj.argDescs[i].argType === XcalarEvalArgTypeT.VariableArg ||
                (description.indexOf("*") === 0 &&
                description.indexOf("**") === -1)) {
                $input.addClass("variableArgs");
                $row.after(
                    '<div class="addArgWrap addArgWrapLarge">' +
                        '<button class="btn btn-rounded addArg addMapArg" data-typeid="' +
                            typeId + '">' +
                            '<i class="icon xi-plus"></i>' +
                            '<span class="text">ADD ANOTHER ARGUMENT</span>' +
                        '</button>' +
                        '</div>');
                if (description.indexOf("*") === 0 &&
                    description.indexOf("**") === -1) {
                    // default:coalesce or default:multijoin
                    const $checkboxWrap = $row.find(".noArgWrap");
                    $checkboxWrap.addClass("skipField")
                                 .find(".checkboxText").text(OpModalTStr.NoArg);
                    xcTooltip.changeText($checkboxWrap, OpModalTStr.EmptyHint);
                }
            }
        }
    }

    protected _filterArgumentsSetup(operObj) {
        const $rows = this._$panel.find('.row');
        const strPreview = this._operatorName + '(<span class="descArgs">' +
                            operObj.displayName + '(' +
                            $rows.eq(0).find(".arg").val() +
                        ')</span>)';
        return (strPreview);
    }

    protected _updateStrPreview(noHighlight?: boolean, andOrSwitch?: boolean) {
        const self = this;
        const $description = this._$panel.find(".strPreview");
        let $inputs = this._$panel.find('.arg:visible');
        let tempText;
        let newText = "";
        const andOrIndices = [];


        const oldText = $description.find('.descArgs').text();
        const $groups = this._$panel.find(".group").filter(function() {
            return ($(this).find('.argsSection.inactive').length === 0);
        });
        const numGroups = $groups.length;
        let inputCount = 0;
        $groups.each(function(groupNum) {
            const funcName = $(this).find('.functionsInput').val().trim();
            if ($(this).find('.argsSection.inactive').length) {
                return;
            }

            if (groupNum > 0) {
                newText += ", ";
            }
            if (groupNum < numGroups - 1) {
                if (andOrSwitch) {
                    andOrIndices.push(newText.length);
                }
                if (self._$panel.find(".switch").hasClass("on")) {
                    newText += "and(";
                } else {
                    newText += "or(";
                }
            }
            newText += funcName + "(";
            $inputs = $(this).find('.arg:visible');

            let numNonBlankArgs = 0;
            $inputs.each(function() {
                const $input = $(this);
                const $row = $input.closest('.row');
                const noArgsChecked = ($row.find('.noArg.checked').length &&
                                    $row.find(".skipField").length) ||
                                    ($row.hasClass("boolOption") &&
                                !$row.find(".boolArg").hasClass("checked"));
                let val = $input.val();

                val = self._parseColPrefixes(self._parseAggPrefixes(val));

                if (noArgsChecked && val.trim() === "") {
                    // no quotes if noArgs and nothing in the input
                } else if (self._quotesNeeded[inputCount]) {
                    val = "\"" + val + "\"";
                } else if (self._isNoneInInput($input)) {
                    val = "None";
                }

                if ($input.data('casted')) {
                    const cols = val.split(",");
                    val = "";
                    for (let i = 0; i < cols.length; i++) {
                        if (i > 0) {
                            val += ", ";
                        }
                        val += xcHelper.castStrHelper(cols[i],
                                                    $input.data('casttype'));
                    }
                }

                if (numNonBlankArgs > 0) {
                    // check: if arg is blank and is not a string then do
                    // not add comma
                    // ex. add(6) instead of add(6, )
                    if (val === "") {
                        if (!noArgsChecked) {
                            val = ", " + val;
                        }
                    } else {
                        val = ", " + val;
                    }
                }
                if (!noArgsChecked || val.trim() !== "") {
                    numNonBlankArgs++;
                }

                newText += val;
                inputCount++;
            });
            newText += ")";
        });

        for (let i = 0; i < numGroups - 1; i++) {
            newText += ")";
        }

        tempText = newText;
        if (tempText.trim() === "") {
            $description.empty();
        } else if (noHighlight) {
            newText = this._wrapText(tempText);
            $description.find(".descArgs").html(newText);
        } else {
            const $spanWrap = $description.find(".descArgs");
            const $spans = $spanWrap.find('span.char');
            if (andOrSwitch) {
                this._modifyAndOrDescText(newText, andOrIndices, $spanWrap);
            } else {
                this._modifyDescText(oldText, newText, $spanWrap, $spans);
            }
        }

        return (tempText);
    }

    // protected _updateStrPreview2(noHighlight?: boolean, andOrSwitch?: boolean) {
    //     const self = this;
    //     const model = this.filterData.getModel();
    //     const $description = this._$panel.find(".strPreview");

    //     let tempText;
    //     let newText = "";
    //     const andOrIndices = [];


    //     const oldText = $description.find('.descArgs').text();
    //     const groups = model.groups;
    //     let inputCount = 0;

    //     // TODO: do not include empty groups, better check for quotes

    //     groups.forEach((group, i) => {
    //         const funcName: string = group.operator;
    //         if (i > 0) {
    //             newText += ", ";
    //         }
    //         if (i < groups.length - 1) {
    //             if (andOrSwitch) {
    //                 andOrIndices.push(newText.length);
    //             }
    //             newText += model.andOrOperator + "(";
    //         }
    //         newText += funcName + "(";

    //         group.args.forEach(arg => {
    //             let val: string = self._parseColPrefixes(self._parseAggPrefixes(arg.value));
    //             if (self._quotesNeeded[inputCount]) {
    //                 val = "\"" + val + "\"";
    //             }

    //             if (arg.cast) {
    //                 const cols = val.split(",");
    //                 val = "";
    //                 for (let i = 0; i < cols.length; i++) {
    //                     if (i > 0) {
    //                         val += ", ";
    //                     }
    //                     val += xcHelper.castStrHelper(cols[i], arg.cast);
    //                 }
    //             }
    //             if (arg.value !== "") {

    //             }
    //         });

    //         inputCount++;
    //     });




    //     // for (let i = 0; i < numGroups - 1; i++) {
    //     //     newText += ")";
    //     // }

    //     // tempText = newText;
    //     // if (tempText.trim() === "") {
    //     //     $description.empty();
    //     // } else if (noHighlight) {
    //     //     newText = this._wrapText(tempText);
    //     //     $description.find(".descArgs").html(newText);
    //     // } else {
    //     //     const $spanWrap = $description.find(".descArgs");
    //     //     const $spans = $spanWrap.find('span.char');
    //     //     if (andOrSwitch) {
    //     //         this._modifyAndOrDescText(newText, andOrIndices, $spanWrap);
    //     //     } else {
    //     //         this._modifyDescText(oldText, newText, $spanWrap, $spans);
    //     //     }
    //     // }

    //     // return (tempText);
    // }

    protected _getExistingTypes(groupNum) {
        const self = this;
        const existingTypes = {};
        let arg;
        let $input;
        let type;
        const $group = this._$panel.find('.group').eq(groupNum);
        const funcName = $group.find('.functionsInput').val().trim();

        if (funcName !== "eq" && funcName !== "neq") {
            return existingTypes;
        }

        $group.find('.arg:visible').each(function() {
            $input = $(this);
            arg = $input.val().trim();
            type = null;

            // col name field, do not add quote
            if ($input.closest(".dropDownList").hasClass("colNameSection")) {
                return;
            } else if (!$input.data("nofunc") && self._hasFuncFormat(arg)) {
                // skip
            } else if (xcHelper.hasValidColPrefix(arg)) {
                arg = self._parseColPrefixes(arg);
                type = self._getColumnTypeFromArg(arg);
            } else if (arg[0] === gAggVarPrefix) {
                // skip
            } else {
                const isString = self._formatArgumentInput(arg,
                                                $input.data('typeid'),
                                                existingTypes).isString;
                if (isString) {
                    type = "string";
                }
            }

            if (type != null) {
                existingTypes[type] = true;
            }
        });
        return (existingTypes);
    }

    protected _submitForm() {
        const deferred = PromiseHelper.deferred();
        let isPassing = true;
        const self = this;

        const $groups = this._$panel.find('.group');

        // check if function name is valid (not checking arguments)
        $groups.each(function(groupNum) {
            if (!self._isOperationValid(groupNum)) {
                self._showFunctionsInputErrorMsg(groupNum);
                isPassing = false;
                return false;
            }
        });
        const model = this.filterData.getModel();
        for (let i = 0; i < model.groups.length; i++) {
            const group = model.groups[i];
            for (let j = 0; j < group.args.length; j++) {
                const arg = group.args[j];
                if (!arg.isValid && arg.error === "No value") {
                    const $input =  $groups.eq(i).find(".arg:visible").eq(j);
                    self._handleInvalidBlanks([$input]);
                    isPassing = false;
                    break;
                }
            }
            if (!isPassing) {
                break;
            }
        }


        if (!isPassing) {
            return PromiseHelper.reject();
        }


        for (let i = 0; i < model.groups.length; i++) {
            const group = model.groups[i];
            for (let j = 0; j < group.args.length; j++) {
                const arg = group.args[j];
                if (!arg.isValid && !arg.error.includes(ErrWRepTStr.InvalidOpsType.substring(0, 20))) {
                    const $input =  $groups.eq(i).find(".arg:visible").eq(j);
                    self._statusBoxShowHelper(arg.error, $input);
                    isPassing = false;
                    break;
                }
            }
            if (!isPassing) {
                break;
            }
        }

        if (!isPassing) {
            return PromiseHelper.reject();
        }


        for (let i = 0; i < model.groups.length; i++) {
            const group = model.groups[i];
            for (let j = 0; j < group.args.length; j++) {
                const arg = group.args[j];
                if (!arg.isValid && arg.type === "column" && arg.error.includes(ErrWRepTStr.InvalidOpsType.substring(0, 20))) {
                    const $input =  $groups.eq(i).find(".arg:visible").eq(j);
                    let allColTypes = [];
                    let inputNums = [];
                    for (var k = 0; k < group.args.length; k++) {
                        let arg = group.args[k];
                        if (arg.type === "column") {
                            let colType = self.filterData.getColumnTypeFromArg(arg.formattedValue);
                            let requiredTypes = self._parseType(arg.typeid);
                            allColTypes.push({
                                inputTypes: [colType],
                                requiredTypes: requiredTypes,
                                inputNum: k
                            });
                            if (!arg.isValid && arg.error.includes(ErrWRepTStr.InvalidOpsType.substring(0, 20))) {
                                inputNums.push(k);
                            }
                        }
                    }
                    self._handleInvalidArgs(true, $input, arg.error, i, allColTypes, inputNums);
                    // all col types, inputs to cast
                    isPassing = false;
                    break;
                }
            }
            if (!isPassing) {
                break;
            }
        }

        if (!isPassing) {
            return PromiseHelper.reject();
        }


        for (let i = 0; i < model.groups.length; i++) {
            const group = model.groups[i];
            for (let j = 0; j < group.args.length; j++) {
                const arg = group.args[j];
                if (!arg.isValid && arg.error.includes(ErrWRepTStr.InvalidOpsType.substring(0, 20))) {
                    const $input =  $groups.eq(i).find(".arg:visible").eq(j);
                    self._handleInvalidArgs(false, $input, arg.error);
                    isPassing = false;
                    break;
                }
            }
            if (!isPassing) {
                break;
            }
        }


        if (!isPassing) {
            return PromiseHelper.reject();
        }

        this.dataModel.submit();
        this._closeOpSection();
        deferred.resolve();

        return deferred.promise();
    }


    // returns an object that contains an array of formated arguments,
    // an object of each argument's column type
    // and a flag of whether all arguments are valid or not
    protected _argumentFormatHelper(existingTypes, groupNum) {
        const self = this;
        const args = [];
        let isPassing = true;
        let colTypes;
        const allColTypes = [];
        let errorText;
        let $errorInput;
        const inputsToCast = [];
        let castText;
        let invalidNonColumnType = false; // when an input does not have a
        // a column name but still has an invalid type
        const $group = this._$panel.find('.group').eq(groupNum);
        $group.find('.arg:visible').each(function(inputNum) {
            const $input = $(this);
            // Edge case. GUI-1929

            const $row = $input.closest('.row');
            const noArgsChecked = $row.find('.noArg.checked').length > 0 ||
                                ($row.hasClass("boolOption") &&
                                !$row.find(".boolArg").hasClass("checked"));
            const emptyStrChecked = $row.find('.emptyStr.checked').length > 0;

            let arg = $input.val();
            let trimmedArg = arg.trim();
            // empty field and empty field is allowed
            if (trimmedArg === "") {
                if (noArgsChecked) {
                    if (self._isNoneInInput($input)) {
                        trimmedArg = "None";
                    }
                    args.push(trimmedArg);
                    return;
                } else if (emptyStrChecked) {
                    args.push('"' + arg + '"');
                    return;
                }
            }

            const typeid = $input.data('typeid');

            // col name field, do not add quote
            if ($input.closest(".dropDownList").hasClass("colNameSection") ||
                (!$input.data("nofunc") && self._hasFuncFormat(trimmedArg))) {
                arg = self._parseColPrefixes(trimmedArg);
            } else if (trimmedArg[0] === gAggVarPrefix) {
                arg = trimmedArg;
                // leave it
            } else if (xcHelper.hasValidColPrefix(trimmedArg)) {
                arg = self._parseColPrefixes(trimmedArg);
                if (!self._isEditMode) {
                    // if it contains a column name
                    // note that field like pythonExc can have more than one $col
                    // containsColumn = true;
                    const frontColName = arg;
                    const tempColNames = arg.split(",");
                    let backColNames = "";

                    for (let i = 0; i < tempColNames.length; i++) {
                        if (i > 0) {
                            backColNames += ",";
                        }
                        const backColName = self._getBackColName(tempColNames[i].trim());
                        if (!backColName) {
                            errorText = ErrTStr.InvalidOpNewColumn;
                            isPassing = false;
                            $errorInput = $input;
                            args.push(arg);
                            return;
                        }
                        backColNames += backColName;
                    }

                    arg = backColNames;

                    // Since there is currently no way for users to specify what
                    // col types they are expecting in the python functions, we will
                    // skip this type check if the function category is user defined
                    // function.

                    let types;
                    if (tempColNames.length > 1 &&
                        !$input.hasClass("variableArgs") &&
                        !$input.closest(".extraArg").length &&
                        !$input.closest(".row")
                                .siblings(".addArgWrap").length) {
                        // non group by fields cannot have multiple column
                        //  names;
                        allColTypes.push({});
                        errorText = ErrTStr.InvalidColName;
                        $errorInput = $input;
                        isPassing = false;
                    } else {
                        colTypes = self._getAllColumnTypesFromArg(frontColName);
                        types = self._parseType(typeid);
                        if (colTypes.length) {
                            allColTypes.push({
                                "inputTypes": colTypes,
                                "requiredTypes": types,
                                "inputNum": inputNum
                            });
                        } else {
                            allColTypes.push({});
                            errorText = xcHelper.replaceMsg(ErrWRepTStr.InvalidCol, {
                                "name": frontColName
                            });
                            $errorInput = $input;
                            isPassing = false;
                        }
                    }

                    if (isPassing || inputsToCast.length) {
                        const isCasted = $input.data('casted');
                        if (!isCasted) {
                            const numTypes = colTypes.length;

                            for (let i = 0; i < numTypes; i++) {
                                if (colTypes[i] == null) {
                                    console.error("colType is null/col not " +
                                        "pulled!");
                                    continue;
                                }

                                errorText = self._validateColInputType(types,
                                                        colTypes[i], $input);
                                if (errorText != null) {
                                    isPassing = false;
                                    $errorInput = $input;
                                    inputsToCast.push(inputNum);
                                    if (!castText) {
                                        castText = errorText;
                                    }
                                    break;
                                }
                            }
                        }
                    }

                }
            } else if (!isPassing) {
                arg = trimmedArg;
                // leave it
            } else {
                // checking non column name args such as "hey" or 3, not $col1
                const checkRes = self._checkArgTypes(trimmedArg, typeid);

                if (checkRes != null && !invalidNonColumnType) {
                    isPassing = false;
                    invalidNonColumnType = true;
                    if (checkRes.currentType === "string" &&
                        self._hasUnescapedParens($input.val())) {
                        // function-like string found but invalid format
                        errorText = ErrTStr.InvalidFunction;
                    } else {
                        errorText = ErrWRepTStr.InvalidOpsType;
                        errorText = xcHelper.replaceMsg(errorText, {
                            "type1": checkRes.validType.join("/"),
                            "type2": checkRes.currentType
                        });
                    }

                    $errorInput = $input;
                } else {
                    arg = self._formatArgumentInput(arg,typeid, existingTypes).value;
                }
            }

            args.push(arg);
        });

        if (!isPassing) {
            let isInvalidColType;
            if (inputsToCast.length) {
                errorText = castText;
                isInvalidColType = true;
                $errorInput = $group.find(".arg:visible").eq(inputsToCast[0]);
            } else {
                isInvalidColType = false;
            }
            self._handleInvalidArgs(isInvalidColType, $errorInput, errorText, groupNum,
                                allColTypes, inputsToCast);
        }

        return ({args: args, isPassing: isPassing, allColTypes: allColTypes});
    }

    // protected _save(args, colTypeInfos, hasMultipleSets) {
    //     let andOr;
    //     if (hasMultipleSets) {
    //         if (this._$panel.find(".switch").hasClass("on")) {
    //             andOr = "and";
    //         } else {
    //             andOr = "or";
    //         }
    //     }
    //     const filterString = this._formulateFilterString(args,
    //                                                 colTypeInfos,
    //                                                 hasMultipleSets, andOr);

    //     // const startTime = Date.now();

    //     this._dagNode.setParam({
    //         evalString: filterString
    //     });
    // }

    // hasMultipleSets: boolean, true if there are multiple groups of arguments
    // such as gt(a, 2) && lt(a, 5)
    protected _formulateFilterString(args, colTypeInfos,
                                        hasMultipleSets, andOr) {
        let str = "";
        let argNum;
        let argGroups = [];
        let colTypeGroups = [];
        if (!hasMultipleSets) {
            argGroups.push(args);
            colTypeGroups.push(colTypeInfos);
        } else {
            argGroups = args;
            colTypeGroups = colTypeInfos;
        }
        for (let i = 0; i < colTypeGroups.length; i++) {
            for (let j = 0; j < colTypeGroups[i].length; j++) {
                argNum = colTypeGroups[i][j].argNum;
                const colNames = argGroups[i][argNum].split(",");
                let colStr = "";
                for (let k = 0; k < colNames.length; k++) {
                    if (k > 0) {
                        colStr += ", ";
                    }
                    colStr += xcHelper.castStrHelper(colNames[k],
                                                    colTypeGroups[i][j].type);
                }
                argGroups[i][argNum] = colStr;
            }
        }

        // loop through groups
        for (let i = 0; i < argGroups.length; i++) {
            const fName = this._$panel.find('.group').eq(i)
                                            .find('.functionsInput').val()
                                            .trim();

            if (i > 0) {
                str += ", ";
            }
            if (i < argGroups.length - 1) {
                if (!andOr) {
                    andOr = "and";
                }
                str += andOr + "(";
            }
            str += fName + "(";

            let numNonBlankArgs = 0;
            // loop through arguments within a group
            for (let j = 0; j < argGroups[i].length; j++) {
                if (argGroups[i][j] !== "") {
                    str += argGroups[i][j] + ", ";
                    numNonBlankArgs++;
                }
            }
            if (numNonBlankArgs > 0) {
                str = str.slice(0, -2);
            }
            str += ")";
        }

        for (let i = 0; i < argGroups.length - 1; i++) {
            str += ")";
        }
        return (str);
    }

    protected _resetForm() {
        const self = this;
        super._resetForm();
        this._$panel.find(".andOrToggle").hide();
        this._$panel.find('.group').each(function(i) {
            if (i !== 0) {
                self._removeGroup($(this), true);
            }
        });
    }

    private _addFilterGroup() {
        const self = this;
        self._$panel.find(".andOrToggle").show();
        this._minimizeGroups();
        const newGroupIndex = this._$panel.find('.group').length;
        this._$panel.find('.group').last()
                        .after(this._getFilterGroupHtml(newGroupIndex));
        this._populateFunctionsListUl(newGroupIndex);
        this._fillInputPlaceholder();
        const functionsListScroller = new MenuHelper(
            this._$panel.find('.functionsList[data-fnlistnum="' + newGroupIndex + '"]'),
            {
                bounds: self._panelSelector,
                bottomPadding: 5
            }
        );
        this._functionsListScrollers.push(functionsListScroller);
        this._suggestLists.push([]);// array of groups, groups has array of inputs
        this._scrollToBottom();
        this._$panel.find('.group').last().find('.functionsInput').focus();
        this._formHelper.refreshTabbing();
    }

    protected _removeGroup($group: JQuery, all?: boolean) {
        super._removeGroup($group, all);
        if (this._$panel.find(".group").length < 2) {
            this._$panel.find(".andOrToggle").hide();
        }
    }

    private _getFilterGroupHtml(index) {
        const html = '<div class="group filterGroup">' +
                        '<div class="catFuncHeadings clearfix subHeading">' +
                            '<div class="filterFnTitle">Filter Function</div>' +
                            '<div class="altFnTitle">No Function Chosen</div>' +
                            '<i class="icon xi-close closeGroup"></i>' +
                            '<i class="icon xi-minus minGroup"></i>' +
                        '</div>' +
                        '<div data-fnlistnum="' + index + '" ' +
                            'class="dropDownList firstList functionsList">' +
                            '<input data-fninputnum="' + index + '" ' +
                            'class="text inputable autocomplete functionsInput" ' +
                            'tabindex="10" spellcheck="false">' +
                            '<div class="iconWrapper dropdown">' +
                                '<i class="icon xi-arrow-down"></i>' +
                            '</div>' +
                            '<div class="list genFunctionsMenu">' +
                                '<ul data-fnmenunum="' + index + '"></ul>' +
                                '<div class="scrollArea top">' +
                                    '<i class="arrow icon xi-arrow-up"></i>' +
                                '</div>' +
                                '<div class="scrollArea bottom">' +
                                    '<i class="arrow icon xi-arrow-down"></i>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="descriptionText">' +
                        '</div>' +
                        '<div class="argsSection inactive">' +
                        '</div>' +
                    '</div>';
        return (html);
    }
}