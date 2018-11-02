class MapOpPanel extends GeneralOpPanel {
    // handles map, filter, group by, and aggregate forms

    private _filteredOperatorsMap = [];
    protected _functionsMap = [];
    protected _dagNode: DagNodeMap;
    protected _opCategories: number[] = [];
    private _pendingFnUpdate: any = null;

    public constructor() {
        super();
        this._operatorName = "map";
    }

    public setup(): void {
        const self = this;
        super.setupPanel("#mapOpPanel");

        this._updateOpCaetories();
        this._functionsInputEvents();

        // dynamic button - ex. default:multiJoin
        this._$panel.on('click', '.addMapArg', function() {
            self._addMapArg($(this));
        });

        // adds field to group on input
        this._$panel.on("click", ".addGroup", function() {
            self.model.addGroup();
            self._$panel.find(".mapFilter").last().focus();
            self._scrollToGroup(self._$panel.find(".group").length - 1);
        });

        this._$panel.on('click', '.closeGroup', function() {
            const $group = $(this).closest('.group');
            const index = self._$panel.find(".group").index($group);
            self.model.removeGroup(index);
        });

        this._$panel.on('click', '.extraArg .xi-cancel', function() {
            self._removeExtraArg($(this).closest('.extraArg'));
        });

        this._$panel.on('click', '.checkboxSection', function() {
            const $checkbox = $(this).find('.checkbox');
            $checkbox.toggleClass("checked");
            if ($(this).hasClass("icvMode")) {
                self.model.toggleICV($checkbox.hasClass("checked"));
            }
            self._checkIfStringReplaceNeeded();
        });
    };

    // options
    // restore: boolean, if true, will not clear the form from it's last state
    // restoreTime: time when previous operation took place
    // triggerColNum: colNum that triggered the opmodal
    // prefill: object, used to prefill the form
    // public show = function(currTableId, currColNums, operator,
    //                                options) {
    public show(node: DagNodeMap, options?): boolean {
        const self = this;
        if (super.show(node, options)) {
            this.model = new MapOpPanelModel(this._dagNode, () => {
                this._render();
            }, options);
            super._panelShowHelper(this.model);
            this._render();

            $(document).on('mousedown.mapCategoryListener', function(e) {
                const $target = $(e.target);
                if (!$target.closest('.catFuncMenus').length &&
                    !$target.is(".mapFilter") &&
                    !$target.hasClass('ui-resizable-handle'))
                {
                    self._$panel.find(".group").each(function() {
                        const $group = $(this);
                        const index = self._$panel.find(".group").index($group);
                        if ($group.find(".categoryMenu").find('li.active').length &&
                            $group.find(".functionsMenu").find('li.active').length === 0)
                        {
                            const val =  $group.find(".mapFilter").val();
                            const valTrimmed = val.trim();
                            if (valTrimmed.length || val.length === 0) {
                                self._filterTheMapFunctions(valTrimmed, index);
                            }
                        }
                    });
                }
            });
            return true;
        }
        return false;
    }

    public close(isSubmit?) {
        super.close(isSubmit);
        $(document).off('mousedown.mapCategoryListener');
        if (this._pendingFnUpdate) {
            this._udfUpdateOperatorsMap();
        }
    }

    // functions that get called after list udfs is called during op view show
    protected _render() {
        const self = this;
        const model = this.model.getModel();

        this._resetForm();

        for (let i = 0; i < model.groups.length; i++) {
            if (i > 0) {
                this._addGroup();
            } else {
                this._populateInitialCategoryField(i);
            }
            const $group: JQuery = this._$panel.find('.group').eq(i);
            const operator: string = model.groups[i].operator;
            if (!operator) {
                continue;
            }

            const operObj = self._getOperatorObj(operator);
            if (!operObj) {
                return;
            }

            $group.find(".categoryMenu").find("li").filter(function() {
                return $(this).data("category") === operObj.category;
            }).removeClass("active").click();

            let $li = $group.find(".functionsMenu").find("li").filter(function() {
                return $(this).text() === operator;
            });
            $li.siblings().removeClass("active");
            $li.addClass("active");
            self._updateArgumentSection(i, operObj);

            let $args = $group.find(".arg").filter(function() {
                return $(this).closest(".colNameSection").length === 0;
            });

            for (let j = 0; j < model.groups[i].args.length; j++) {
                let arg = model.groups[i].args[j].getValue();
                if (!$args.eq(j).length) {
                    if ($group.find(".addArgWrap").length) {
                        $group.find(".addArg").last().click(); // change this
                        $args = $group.find(".arg").filter(function() {
                            return $(this).closest(".colNameSection").length === 0;
                        });
                    } else {
                        break;
                    }
                }

                $args.eq(j).val(arg);
                if ($args.eq(j).closest(".row").hasClass("boolOption")) {
                    if (arg === "true") {
                        $args.eq(j).closest(".row")
                                .find(".boolArgWrap .checkbox")
                                .addClass("checked");
                    }
                } else if (model.groups[i].args[j].checkIsEmptyString()) {
                    this._showEmptyOptions($args.eq(j));
                    $args.eq(j).closest(".row").find(".emptyStrWrap").click();
                } else if (model.groups[i].args[j].hasNoneChecked()) {
                    this._showEmptyOptions($args.eq(j));
                    $args.eq(j).closest(".row").find(".noArgWrap").click();
                }
            }
            $group.find(".resultantColNameRow .arg")
                  .val(model.groups[i].newFieldName);
        }

        if (model.icv) {
            this._$panel.find(".icvMode .checkbox").addClass("checked");
        }

        this._formHelper.refreshTabbing();
        self._checkIfStringReplaceNeeded(true);
    }

    private _functionsInputEvents(): void {
        const self = this;

        this._$panel.on("input", ".mapFilter", function() {
            const val = $(this).val();
            const valTrimmed = val.trim();
            if (valTrimmed.length || val.length === 0) {
                const $group = $(this).closest(".group");
                const index = self._$panel.find(".group").index($group);
                self._filterTheMapFunctions(valTrimmed, index);
            } else {
                // blank but with spaces, do nothing
            }
        });

        this._$panel.on("keydown", ".mapFilter", function(event) {
            const $group = $(this).closest(".group");
            if (event.which === keyCode.Down ||
                event.which === keyCode.Up) {
                event.preventDefault();
                if ($group.find(".categoryMenu").find('li.active').length === 0) {
                    $group.find(".categoryMenu").find('li:visible').eq(0).click();
                    return;
                }
            }
            if (event.which === keyCode.Down) {
                $group.find(".categoryMenu").find('li.active').nextAll('li:visible')
                                            .eq(0).click();
            } else if (event.which === keyCode.Up) {
                $group.find(".categoryMenu").find('li.active').prevAll('li:visible')
                                            .eq(0).click();
            }

            if (event.which === keyCode.Enter) {
                if ($group.find("'.functionsMenu").find('li').length === 1) {
                    $group.find(".functionsMenu").find('li:visible').eq(0).click();
                    event.preventDefault();
                }
            }

            // position the scrollbar
            const $activeLi = $group.find(".categoryMenu").find('li.active');
            if (!$activeLi.length) {
                return;
            }
            const liTop = $activeLi.position().top;
            const liBottom = liTop + $activeLi.height();
            const categoryHeight = $group.find(".categoryMenu").height();
            if (liBottom > (categoryHeight + 5) || liTop < -5) {
                const position = liTop + $group.find(".categoryMenu").scrollTop();
                $group.find(".categoryMenu").scrollTop(position - (categoryHeight / 2));
            }
        });

        this._$panel.find('.filterMapFuncArea .clear').mousedown(function(event) {
            const $group = $(this).closest(".group");
            const $input = $group.find(".mapFilter");
            if ($input.val() !== "") {
                $input.trigger("input").focus();
                event.preventDefault(); // prevent input from blurring
                self.model.clearFunction(0);
            }
        });

        this._$panel.on('click', '.categoryMenu li', function() {
            const $group = $(this).closest(".group");
            const groupIndex = self._$panel.find(".group").index($group);
            const $li = $(this);
            if ($li.hasClass('active')) {
                return; // do not update functions list if clicking on same li
            }
            $li.siblings().removeClass('active');
            $li.addClass('active');
            self._updateMapFunctionsList(groupIndex);
        });

        this._$panel.on('click', '.functionsMenu li', function() {
            if ($(this).hasClass('active')) {
                return; // do not update functions list if clicking on same li
            }
            const $group = $(this).closest(".group");
            const groupIndex = self._$panel.find(".group").index($group);
            const $li = $(this);
            $li.siblings().removeClass('active');
            $li.addClass('active');
            const func = $li.text().trim();

            const operObj = self._getOperatorObj(func);
            self.model.enterFunction(func, operObj, groupIndex);
            self._focusNextInput(groupIndex);
            self._scrollToGroup(groupIndex, true);
        });
        // XXX need to add listeners to each new functions list
        this._$panel.find(".functionsMenu").scroll(function() {
            xcTooltip.hideAll();
        });
    }

    protected _onArgChange($input) {
        const val = $input.val();
        const $group = $input.closest(".group")
        const groupIndex = this._$panel.find(".group").index($group);
        const argIndex = $group.find(".arg").index($input);
        if ($input.closest(".colNameSection").length) {
            this.model.updateNewFieldName(val, groupIndex);
        } else {
            this.model.updateArg(val, groupIndex, argIndex);
        }
    }

    public updateOperationsMap(listXdfsObj) {
        var fns = xcHelper.filterUDFs(listXdfsObj.fnDescs);
        this._pendingFnUpdate = fns;
        if (this._formHelper && this._formHelper.isOpen()) {
            // only update once form is closed
            return;
        }
        this._udfUpdateOperatorsMap();
    }

    // empty array means the first argument will always be the column name
    // any function names in the array will not have column name as 1st argument
    protected _populateInitialCategoryField(groupIndex?: number) {
        groupIndex = groupIndex || 0;
        this._functionsMap[groupIndex] = [];
        this._categoryNames = [];
        let html = "";
        let categoryName;

        for (let i = 0; i < Object.keys(this._operatorsMap).length; i++) {
            if (FunctionCategoryTStr[i] === 'Aggregate functions') {
                continue;
            }

            categoryName = FunctionCategoryTStr[i].toLowerCase();
            const searchStr = " functions";
            const categoryNameLen = categoryName.length;
            if (categoryName.lastIndexOf(searchStr) ===
                (categoryNameLen - searchStr.length))
            {
                categoryName = categoryName.substring(0,
                                        categoryNameLen - searchStr.length);
            }
            this._categoryNames.push(categoryName);
            const opsArray = [];
            for (let j in this._operatorsMap[i]) {
                opsArray.push(this._operatorsMap[i][j]);
            }
            opsArray.sort(sortFn);
            this._functionsMap[groupIndex][i] = opsArray;

            html += '<li data-category="' + i + '">' +
                        categoryName +
                    '</li>';
        }
        const $list = $(html);
        $list.sort(this._sortHTML.bind(this));
        this._$panel.find(".group").eq(groupIndex).find(".categoryMenu").html($list);

        function sortFn(a, b){
            return (a.displayName) > (b.displayName) ? 1 : -1;
        }
    }

    private _udfUpdateOperatorsMap() {
        const opArray = this._pendingFnUpdate;
        const udfCategoryNum = FunctionCategoryT.FunctionCategoryUdf;
        if (opArray.length === 0) {
            delete this._operatorsMap[udfCategoryNum];
            return;
        }

        opArray.sort(sortFn);

        function sortFn(a, b){
            return (a.displayName) > (b.displayName) ? 1 : -1;
        }

        this._operatorsMap[udfCategoryNum] = {};
        for (var i = 0; i < opArray.length; i++) {
            this._operatorsMap[udfCategoryNum][opArray[i].displayName] = opArray[i];
        }
        this._updateOpCaetories();
        this._pendingFnUpdate = null;
    }

    private _updateOpCaetories(): void {
        this._opCategories = [];
        for (let i in this._operatorsMap) {
            if (parseInt(i) !== FunctionCategoryT.FunctionCategoryAggregate) {
                this._opCategories.push(parseInt(i));
            }
        }
    }

    protected _isOperationValid(groupIndex) {
        return this._$panel.find(".group").eq(groupIndex)
                           .find(".functionsMenu")
                           .find('li.active').length > 0;
    }

    protected _showFunctionsInputErrorMsg(groupNum) {
        let $target = this._$panel.find(".group").eq(groupNum).find(".functionsMenu").parent();
        let text = ErrTStr.NoEmpty;

        StatusBox.show(text, $target, false, {"offsetX": -5,
                                            preventImmediateHide: true});
    }

    // // for map
    private _updateMapFunctionsList(groupIndex, filtered?: boolean) {
        const $group = this._$panel.find(".group").eq(groupIndex);
        const $categoryList = $group.find(".categoryMenu");
        const $functionsList = $group.find(".functionsMenu");
        const $mapFilter = $group.find(".mapFilter");
        let opsMap;
        if (!filtered) {
            const $li = $categoryList.find('.active');
            const categoryNum = $li.data('category');
            opsMap = {};
            if ($mapFilter.val().trim() !== "") {
                opsMap[categoryNum] = this._filteredOperatorsMap[groupIndex][categoryNum];
            } else {
                opsMap[categoryNum] = this._functionsMap[groupIndex][categoryNum];
            }
        } else {
            opsMap = this._filteredOperatorsMap[groupIndex];
        }
        const filterVal = $mapFilter.val().trim();
        let startsWith = "";
        let includes = "";
        let i;
        let li = "";

        for (const cat in opsMap) {
            const ops = opsMap[cat];
            if (!ops) {
                continue;
            }
            if (parseInt(cat) === FunctionCategoryT.FunctionCategoryUdf) {
                for (i = 0; i < ops.length; i++) {
                    li = '<li class="textNoCap" data-category="' + cat +
                    '" data-container="body" ' +
                    'data-placement="right" data-toggle="tooltip" title="' +
                    ops[i].displayName + '">' + ops[i].displayName + '</li>';
                    if (filterVal &&
                        ops[i].displayName.toLowerCase().startsWith(filterVal))
                    {
                        startsWith += li;
                    } else {
                        includes += li;
                    }
                }
            } else {
                for (i = 0; i < ops.length; i++) {
                    li = '<li class="textNoCap" data-category="' + cat +
                    '">' + ops[i].displayName + '</li>';
                    if (filterVal &&
                        ops[i].displayName.toLowerCase().startsWith(filterVal))
                    {
                        startsWith += li;
                    } else {
                        includes += li;
                    }
                }
            }
        }

        const $startsWith = $(startsWith);
        const $includes = $(includes);
        $startsWith.sort(this._sortHTML.bind(this));
        $includes.sort(this._sortHTML.bind(this));

        $functionsList.empty();
        $functionsList.append($startsWith);
        $functionsList.append($includes);

        $group.find('.argsSection').addClass('inactive');
        this._$panel.find('.icvMode').addClass('inactive');
        this._$panel.find('.descriptionText').empty();
        this._$panel.find('.strPreview').empty();
    }

    // $li = map's function menu li
    // groupIndex, the index of a group of arguments (multi filter)
    protected _updateArgumentSection(groupIndex, operObj) {
        const $argsGroup = this._$panel.find('.group').eq(groupIndex);
        let categoryNum = operObj.category;
        let category = this._categoryNames[categoryNum];
        let func = operObj.fnName;

        const $argsSection = $argsGroup.find('.argsSection').last();
        $argsSection.empty();
        $argsSection.addClass("touched");
        $argsSection.removeClass('inactive');
        $argsSection.data("fnname", operObj.displayName);
        this._$panel.find(".icvMode").removeClass('inactive');

        let defaultValue = ""; // to autofill first arg

        if ((GeneralOpPanel.firstArgExceptions[category] &&
            GeneralOpPanel.firstArgExceptions[category].indexOf(func) !== -1) ||
            groupIndex > 0)
        {
            // do not give default value if not the first group of args
            defaultValue = "";
        }

        let numArgs = Math.max(Math.abs(operObj.numArgs),
                                operObj.argDescs.length);

        const numInputsNeeded = numArgs + 1;// for new column name

        this._addArgRows(numInputsNeeded, $argsGroup, groupIndex);
        // get rows now that more were added
        const $rows = $argsSection.find('.row');

        this._hideCastColumn(groupIndex);

        // sets up the args generated by backend, not front end arguments such
        // as new column name input
        this._setupBasicArgInputsAndDescs(numArgs, operObj, $rows, defaultValue);

        const strPreview = this._mapArgumentsSetup(groupIndex, numArgs, operObj);
        numArgs++;

        // hide any args that aren't being used
        $rows.show().filter(":gt(" + (numArgs - 1) + ")").hide();

        const despText = operObj.fnDesc || "N/A";
        const descriptionHtml = '<b>' + OpFormTStr.Descript + ':</b> ' +
                    '<span class="instrText">' + despText + '</span>';

        $argsGroup.find('.descriptionText').html(descriptionHtml);

        this._$panel.find('.strPreview')
                    .html('<b>' + OpFormTStr.CMD + ':</b> <br>' +
                                strPreview);
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
        this._suggestLists[groupIndex] = [];

        this._$panel.find('.list.hint.new').each(function() {
            const scroller = new MenuHelper($(this), {
                bounds: self._panelContentSelector,
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
        const groupIndex = this._$panel.find(".group").index($rows.closest(".group"));
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
            } else if (!this._isUDF(groupIndex)) {
                $row.addClass("required").find(".noArgWrap").remove();
            }

            if (types.indexOf(ColumnType.string) === -1) {
                $row.find('.emptyStrWrap').remove();
            }

            // add "addArg" button if *arg is found in the description
            // udf default:multiJoin has *
            if (operObj.argDescs[i].argType === XcalarEvalArgTypeT.VariableArg ||
                (description.indexOf("*") === 0 &&
                description.indexOf("**") === -1)) {
                $input.addClass("variableArgs");
                $row.after(BaseOpPanel.createAddClauseButton(typeId));
                if (description.indexOf("*") === 0 &&
                    description.indexOf("**") === -1) {
                    const $checkboxWrap = $row.find(".noArgWrap");
                    $checkboxWrap.addClass("skipField")
                                .find(".checkboxText").text(OpModalTStr.NoArg);
                    xcTooltip.changeText($checkboxWrap, OpModalTStr.EmptyHint);
                }
            }
        }
    }

//  // sets up the last argument for map
    private _mapArgumentsSetup(groupIndex, numArgs, operObj) {
        const description = OpModalTStr.ColNameDesc + ":";
        const $rows = this._$panel.find(".group").eq(groupIndex).find('.row');
        const $row = $rows.eq(numArgs).addClass('resultantColNameRow');
        const icon = xcHelper.getColTypeIcon(operObj.outputType);

        $row.find('.dropDownList')
            .addClass('colNameSection')
            .prepend('<div class="iconWrapper"><i class="icon ' + icon +
                    '"></i></div>')
            .end()
            .find('.description').text(description)
            .end()
            .find(".inputWrap");
        const strPreview =  this._operatorName + '(<span class="descArgs">' +
                        operObj.displayName +
                            '(' + $rows.eq(0).find(".arg").val() +
                            ')</span>)';
        return (strPreview);
    }

    protected _updateStrPreview(noHighlight?: boolean) {
        const self = this;
        const $description = this._$panel.find(".strPreview");
        let $inputs = this._$panel.find('.arg');
        let tempText;
        let newText = "";
        let $groups;
        const oldText = $description.find('.descArgs').text();
        $groups = this._$panel.find(".group").filter(function() {
            return ($(this).find('.argsSection.inactive').length === 0);
        });
        const numGroups = $groups.length;
        let inputCount = 0;
        $groups.each(function(groupNum) {
            let funcName = $(this).find(".functionsMenu").find('.active').text().trim();
            if ($(this).find('.argsSection.inactive').length) {
                return;
            }

            if (groupNum > 0) {
                newText += ", ";
            }

            newText += funcName + "(";
            $inputs = $(this).find('.arg').not(":last");

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
            newText = self._wrapText(tempText);
            $description.find(".descArgs").html(newText);
        } else {
            const $spanWrap = $description.find(".descArgs");
            const $spans = $spanWrap.find('span.char');
            self._modifyDescText(oldText, newText, $spanWrap, $spans);
        }


        return (tempText);
    }

    private _isUDF(groupIndex) {
        return this._$panel.find(".group").eq(groupIndex).find(".functionsMenu")
                            .find(".active").data("category") ===
                                    FunctionCategoryT.FunctionCategoryUdf;
    }


    protected _getExistingTypes(groupNum) {
        const self = this;
        const existingTypes = {};
        let arg;
        let $input;
        let type;
        const $group = this._$panel.find('.group').eq(groupNum);
        const funcName = this._$panel.find(".group").eq(groupNum)
                        .find(".functionsMenu").find('.active').text().trim();

        if (funcName !== "eq" && funcName !== "neq") {
            return existingTypes;
        }

        $group.find('.arg').each(function() {
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

    protected _validate(): boolean {
        const self = this;
        if (this._isAdvancedMode()) {
            const error: {error: string} = this.model.validateAdvancedMode(this._editor.getValue());
            if (error != null) {
                StatusBox.show(error.error, this._$panel.find(".advancedEditor"));
                return false;
            }
        } else {
            let error = this.model.validateGroups();
            if (!error) {
                error = this.model.validateNewFieldNames();
            }
            if (error) {
                const model = this.model.getModel();
                const groups = model.groups;
                const $input = this._$panel.find(".group").eq(error.group).find(".arg").eq(error.arg);
                switch (error.type) {
                    case ("function"):
                        self._showFunctionsInputErrorMsg(error.group);
                        break;
                    case ("blank"):
                        self._handleInvalidBlanks([$input]);
                        break;
                    case ("other"):
                        self._statusBoxShowHelper(error.error, $input);
                        break;
                    case ("columnType"):
                        let allColTypes = [];
                        let inputNums = [];
                        const group = groups[error.group];
                        for (var i = 0; i < group.args.length; i++) {
                            let arg = group.args[i];
                            if (arg.getType() === "column") {
                                let colType = self.model.getColumnTypeFromArg(arg.getFormattedValue());
                                let requiredTypes = self._parseType(arg.getTypeid());
                                allColTypes.push({
                                    inputTypes: [colType],
                                    requiredTypes: requiredTypes,
                                    inputNum: i
                                });
                                if (!arg.checkIsValid() && arg.getError().includes(ErrWRepTStr.InvalidOpsType.substring(0, 20))) {
                                    inputNums.push(i);
                                }
                            }
                        }
                        self._handleInvalidArgs(true, $input, error.error, error.group, allColTypes, inputNums);
                        break;
                    case ("valueType"):
                        self._handleInvalidArgs(false, $input, error.error);
                        break;
                    case ("newField"):
                        StatusBox.show(error.error, this._$panel.find(".group").find(".colNameSection .arg"));
                        break;
                    default:
                        console.warn("unhandled error found", error);
                        break;
                }
                return false;
            }
        }

        return true;
    }

    protected _resetForm(keepFilter?: boolean) {
        const self = this;
        super._resetForm();
        if (!keepFilter) {
            this._$panel.find(".mapFilter").val("");
        }
        this._$panel.find(".functionsMenu").empty();
        this._$panel.find('.icvMode').addClass('inactive');
        this._filteredOperatorsMap = [];
        this._functionsMap = [];
        this._$panel.find('.group').each(function(i) {
            if (i !== 0) {
                self._removeGroup($(this), true);
            }
        });
    }

    private _filterTheMapFunctions(val, groupIndex) {
        let categorySet;
        this._filteredOperatorsMap[groupIndex] = {}; // XXX need per group
        const categoryNums = {};
        let fn;
        let firstCategoryNumFound;
        val = val.toLowerCase();

        for (let i in this._operatorsMap) {
            if (parseInt(i) === FunctionCategoryT.FunctionCategoryAggregate) {
                continue;
            }
            categorySet = this._operatorsMap[i];
            for (let j in categorySet) {
                fn = categorySet[j];
                if (fn.displayName.toLowerCase().indexOf(val) > -1) {
                    if (!this._filteredOperatorsMap[groupIndex][fn.category]) {
                        this._filteredOperatorsMap[groupIndex][fn.category] = [];
                    }
                    categoryNums[fn.category] = true;
                    this._filteredOperatorsMap[groupIndex][fn.category].push(fn);
                    if (firstCategoryNumFound == null) {
                        firstCategoryNumFound = fn.category;
                    }
                }
            }
        }
        const $group = this._$panel.find(".group").eq(groupIndex);
        const $categoryList = $group.find(".categoryMenu");
        const $functionsList = $group.find(".functionsMenu");

        if (firstCategoryNumFound != null) {
            $categoryList.find('li').addClass('filteredOut');
            for (const catId in categoryNums) {
                $categoryList.find('li[data-category="' + catId + '"]')
                            .removeClass('filteredOut');
            }

            this._updateMapFunctionsList(groupIndex, true);
        } else {
            $categoryList.find('li').addClass('filteredOut');
            $functionsList.find('li').addClass('filteredOut');
            this._$panel.find('.argsSection')
                    .addClass('inactive');
            this._$panel.find('.argsSection').empty();
            this._$panel.find('.icvMode').addClass('inactive');
            this._$panel.find('.descriptionText').empty();
            this._$panel.find('.strPreview').empty();
        }
        $categoryList.find('li').removeClass('active');
        if (Object.keys(categoryNums).length === 1) {
            $categoryList.find('li:visible').eq(0).addClass('active');
        }
    }

    private _addMapArg($btn) {
        const typeId = $btn.data("typeid");
        const html = this._getArgInputHtml(typeId);
        $btn.parent().before(html);
        $btn.parent().prev().find('.inputWrap').find('input').focus();
        this._formHelper.refreshTabbing();

        const $ul = $btn.parent().prev().find('.inputWrap').find(".list");
        this._addSuggestListForExtraArg($ul);
        this._addCastDropDownListener();
    }

    private _addSuggestListForExtraArg($ul) {
        const self = this;
        const $allGroups = this._$panel.find('.group');
        const groupIndex = $allGroups.index($ul.closest('.group'));
        const argIndex = $ul.closest('.group').find('.list.hint').index($ul);

        const scroller = new MenuHelper($ul, {
            bounds: self._panelContentSelector,
            bottomPadding: 5
        });

        this._suggestLists[groupIndex].splice(argIndex, 0, scroller);
        $ul.removeClass('new');
    }

    private _getArgInputHtml(typeId) {
        if (typeId == null) {
            typeId = -1;
        }

        const html =
            '<div class="row extraArg clearfix">' +
                '<div class="inputWrap">' +
                    '<div class="dropDownList">' +
                      '<input class="arg mapExtraArg' +
                      '" type="text" tabindex="10" ' +
                        'spellcheck="false" data-typeid="' + typeId + '">' +
                      '<div class="list hint new">' +
                       '<ul></ul>' +
                        '<div class="scrollArea top">' +
                          '<i class="arrow icon xi-arrow-up"></i>' +
                        '</div>' +
                        '<div class="scrollArea bottom">' +
                          '<i class="arrow icon xi-arrow-down"></i>' +
                        '</div>' +
                     '</div>' +
                    '</div>' +
                    '<i class="icon xi-cancel"></i>' +
                '</div>' +
                '<div class="cast new">' +
                    '<span class="label">Cast: </span>' +
                    '<div class="dropDownList hidden">' +
                        '<input class="text nonEditable" value="default"' +
                            ' disabled>' +
                        '<div class="iconWrapper dropdown">' +
                            '<i class="icon xi-arrow-down"></i>' +
                        '</div>' +
                        '<ul class="list"></ul>' +
                    '</div>' +
                '</div>' +
            '</div>';
        return html;
    }

    private _removeExtraArg($inputWrap) {
        const $allGroups = this._$panel.find('.group');
        const groupIndex = $allGroups.index($inputWrap.closest('.group'));
        const $ul = $inputWrap.find(".list");
        const argIndex = $ul.closest('.group').find('.list.hint').index($ul);

        this._suggestLists[groupIndex].splice(argIndex, 1);
        const $input = $inputWrap.find(".arg");
        $input.val("");
        $inputWrap.remove();
        this._checkIfStringReplaceNeeded();
        this.model.removeArg(groupIndex, argIndex);
    }

    private _addGroup() {
        this._minimizeGroups();
        const newGroupIndex = this._$panel.find('.group').length;
        this._$panel.find('.group').last()
                        .after(this._getGroupHtml());
        this._populateInitialCategoryField(newGroupIndex);
        this._$panel.find(".functionsMenu").last().scroll(function() {
            xcTooltip.hideAll();
        });
    }

    protected _minimizeGroups($group?: JQuery) {
        if (!$group) {
            this._$panel.find('.group').each(function () {
                const $group = $(this);
                if ($group.hasClass('minimized')) {
                    return;
                }
                const numArgs = $group.find('.arg').length - 1;
                $group.attr('data-numargs', numArgs);
                $group.addClass('minimized');
                if (!$group.find('.functionsMenu .active').length) {
                    $group.addClass('fnInputEmpty');
                }
            });
        }
        else {
            const numArgs = $group.find('.arg').length - 1;
            $group.attr('data-numargs', numArgs);
            $group.addClass('minimized');
            if (!$group.find('.functionsMenu .active').length) {
                $group.addClass('fnInputEmpty');
            }
        }
    }

    private _getGroupHtml(): HTML {
        const html: HTML = '<div class="group mapGroup extraGroup">' +
                '<i class="icon xi-close closeGroup"></i>' +
                '<i class="icon xi-minus minGroup"></i>' +
                '<div class="altFnTitle">No Function Chosen</div>' +
                '<div class="filterMapFuncArea">' +
                    '<input type="text" class="mapFilter" placeholder="Search map functions...">' +
                    '<div class="clear">' +
                        '<i class="icon fa-11 xi-close xc-action"></i>' +
                    '</div>' +
                '</div>' +
                '<div class="catFuncHeadings clearfix subHeading">' +
                    '<div>Category</div>' +
                    '<div>Function</div>' +
                '</div>' +
                '<div class="catFuncMenus clearfix">' +
                    '<ul class="categoryMenu"></ul>' +
                    '<ul class="functionsMenu"></ul>' +
                '</div>' +
                '<div class="descriptionText"></div>' +
                '<div class="argsSection inactive"></div>' +
            '</div>';
        return html;
    }
}