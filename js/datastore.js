/*
 * Controller Module for DataStore Section
 */
window.DataStore = (function($, DataStore) {
    DataStore.setup = function() {
        GridView.setup();
        setupViews();
        DatastoreForm.setup();
        DataPreview.setup();
        DataSampleTable.setup();
        DataCart.setup();
        ExportTarget.setup();
        ExportTarget.restore();
    };

    DataStore.updateInfo = function(numDatasets) {
        if (numDatasets != null) {
            $(".numDataStores").text(numDatasets);
        } else {
            // XXX Cheng: Here sync with backend beause other user
            // can also add/rm dataset, but now we have no way to
            // show others' ds except refreshing the browser
            XcalarGetDatasets()
            .then(function(datasets) {
                $(".numDataStores").text(datasets.numDatasets);
            })
            .fail(function(error) {
                console.error("Fail to update ds nums", error);
            });
        }
    };

    DataStore.clear = function() {
        var deferred = jQuery.Deferred();

        DS.clear();
        DataSampleTable.clear();
        DataCart.clear();
        DatastoreForm.clear();
        DataStore.updateInfo(0);

        DataPreview.clear()
        .then(function() {
            return (GridView.clear());
        })
        .then(deferred.resolve)
        .then(deferred.reject);

        return (deferred.promise());
    };

    function setupViews() {
        $exploreView = $('#exploreView');
        $exportView = $('#exportView');
        $contentHeaderRight = $('#contentHeaderRight');
        $contentHeaderMidText = $('#contentHeaderMid').find('.text');
        $('#contentHeaderLeft').find('.buttonArea').click(function() {
            var $button = $(this);
            if ($button.hasClass('active')) {
                return;
            }

            if ($button.attr('id') === "outButton") {
                $exploreView.hide();
                $contentHeaderRight.hide();
                $exportView.show();
                $contentHeaderMidText.text('EXPORT FORM');
            } else {
                $exploreView.show();
                $contentHeaderRight.show();
                $exportView.hide();
                $contentHeaderMidText.text('DATA SET');
                DataSampleTable.sizeTableWrapper();
            }
            $button.siblings().removeClass('active');
            $button.addClass('active');
        });
    }

    return (DataStore);

}(jQuery, {}));

/*
 * Module for the datastore form part
 */
window.DatastoreForm = (function($, DatastoreForm) {
    var $filePath = $("#filePath");
    var $fileName = $("#fileName");

    var $formatLists = $("#fileFormatList");
    var $formatText  = $formatLists.find(".text");

    var $csvDelim = $("#csvDelim"); // csv delimiter args
    var $udfArgs  = $("#udfArgs");
    var $udfModuleList = $("#udfArgs-moduleList");
    var $udfFuncList = $("#udfArgs-funcList");

    var lastFieldDelim = "\\t";
    var lastLineDelim = "\\n";

    DatastoreForm.setup = function() {
        var $csvCheckBox = $("#csvPromoteCheckbox"); // promote header checkbox
        var $udfCheckbox = $("#udfCheckbox"); // udf checkbox
        resetUdfSection();

        $("#importDataView").click(function(event){
            event.stopPropagation();
            hideDropdownMenu();
        });

        // udf checkbox
        $udfCheckbox.click(function() {
            var $checkbox = $(this).find(".checkbox");

            if ($udfArgs.hasClass("hidden")) {
                $checkbox.addClass("checked");
                $udfArgs.removeClass("hidden");
                DatastoreForm.update();
            } else {
                $checkbox.removeClass("checked");
                $udfArgs.addClass("hidden");
            }
        });
        var udfModuleListScroller = new ListScroller($udfModuleList.find('.list'),
                                                {container: '#importDataView'});
        // dropdown list for udf modules and function names
        xcHelper.dropdownList($udfModuleList, {
            "onSelect": function($li) {
                var module = $li.text();
                var $input = $udfModuleList.find("input");

                if (module === $input.val()) {
                    return;
                }

                $input.val(module);

                $udfFuncList.parent().tooltip("destroy");
                $udfFuncList.removeClass("disabled")
                    .find("input").val("")
                    .end()
                    .find(".list li").addClass("hidden")
                    .filter(function() {
                        return $(this).data("module") === module;
                    }).removeClass("hidden");
            },
            "onOpen": function() {
                return (udfModuleListScroller.showOrHideScrollers());
            },
            "container": "#importDataView"
        });

        var udfFuncListScroller = new ListScroller($udfFuncList.find('.list'),
                                                {container: '#importDataView'});
        xcHelper.dropdownList($udfFuncList, {
            "onSelect": function($li) {
                var func = $li.text();
                var $input = $udfFuncList.find("input");

                if (func === $input.val()) {
                    return;
                }

                $input.val(func);
            },
            "onOpen": function() {
                return (udfFuncListScroller.showOrHideScrollers());
            },
            "container": "#importDataView"
        });

        // csv promote checkbox
        $csvCheckBox.click(function() {
            $(this).find(".checkbox").toggleClass("checked");
        });

        var formatListScroller = new ListScroller($('#fileFormatMenu'),
                                                {container: '#importDataView'});

        // set up dropdown list for formats
        xcHelper.dropdownList($formatLists, {
            "onSelect": function($li) {
                var text = $li.text();
                if ($li.hasClass("hint") || $formatText.val() === text) {
                    return;
                }
                
                $formatText.val(text).removeClass("hint");
                $('#fileNameSelector').addClass("optionsOpen");

                var $fieldDelim = $("#fieldDelim");
                switch (text.toLowerCase()) {
                    case "csv":
                        $csvCheckBox.removeClass("hidden");
                        resetDelimiter();
                        $fieldDelim.show();
                        $csvDelim.removeClass("hidden");
                        $udfCheckbox.removeClass("hidden");
                        $('#fileNameSelector').addClass("optionsOpen");
                        break;
                    case "raw":
                        $csvCheckBox.removeClass("hidden");
                        resetDelimiter();
                        $fieldDelim.hide();
                        $csvDelim.removeClass("hidden");
                        $udfCheckbox.removeClass("hidden");
                        $('#fileNameSelector').addClass("optionsOpen");
                        break;
                    case "excel":
                        $csvCheckBox.removeClass("hidden");
                        resetDelimiter();
                        $csvDelim.addClass("hidden");
                        $udfCheckbox.addClass("hidden")
                                    .find(".checkbox").removeClass("checked");
                        $udfArgs.addClass("hidden");
                        $('#fileNameSelector').addClass("optionsOpen");
                        break;
                    default:
                        $csvCheckBox.addClass("hidden");
                        $csvDelim.addClass("hidden");
                        $udfCheckbox.removeClass("hidden");
                        break;
                }
            },
            "onOpen": function() {
                return (formatListScroller.showOrHideScrollers());
            },
            "container": "#importDataView"
        });

        var csvDelimListScroller = new ListScroller($('#fieldDelim').find('.list'),
                                        {container: '#importDataView'});

        // var csvDelimListScroller = new ListScroller($csvDelim.find('.list'),
        //                                 {container: '#importDataView'});
        var lineDelimListScroller = new ListScroller($('#lineDelim').find('.list'),
                                        {container: '#importDataView'});
        // set up dropdown list for csv args
        xcHelper.dropdownList($csvDelim.find(".dropDownList"), {
            "onSelect": function($li) {
                var $input = $li.closest(".dropDownList").find(".text");
                switch ($li.attr("name")) {
                    case "default":
                        if ($input.attr("id") === "fieldText") {
                            $input.val("\\t");
                        } else {
                            $input.val("\\n");
                        }
                        $input.removeClass("nullVal");
                        return false;
                    case "comma":
                        $input.val(",");
                        $input.removeClass("nullVal");
                        return false;
                    case "null":
                        $input.val("Null");
                        $input.addClass("nullVal");
                        return false;
                    default:
                        // keep list open
                        return true;
                }
            },
            "onOpen": function($li) {
                if ($li.parent().attr('id') === 'fieldDelim') {
                    return (csvDelimListScroller.showOrHideScrollers());
                } else {
                    return (lineDelimListScroller.showOrHideScrollers());
                }
                
            },
            "container": "#importDataView"
        });

        // Input event on csv args input box
        $csvDelim.on({
            "keypress": function(event) {
                // prevent form to be submitted
                if (event.which === keyCode.Enter) {
                    return false;
                }
            },
            "keyup": function(event) {
                // input other delimiters
                if (event.which === keyCode.Enter) {
                    var $input = $(this);
                    var val    = $input.val();

                    event.stopPropagation();

                    if (val !== "") {
                        $input.closest(".dropDownList")
                            .find(".text").val(val).removeClass("nullVal");
                        $input.val("").blur();
                        hideDropdownMenu();
                    }
                }
            }
        }, ".delimVal");

        // open file browser
        $("#fileBrowserBtn").click(function() {
            $(this).blur();
            FileBrowser.show();
        });

        // preview dataset
        $("#previewBtn").click(function() {
            $(this).blur();

            // Invalid json preview
            var path = $filePath.val();
            var text;
            if (path.endsWith("json")) {
                text = "Canot Preview JSON files";
                StatusBox.show(text, $filePath, true);
                return;
            } else if (path.endsWith("xlsx")) {
                text = "Canot Preview Excel files";
                StatusBox.show(text, $filePath, true);
                return;
            }

            DataPreview.show();
        });

        var $form = $("#importDataForm");
        // reset form
        $("#importDataReset").click(function() {
            $(this).blur();

            $formatText.val("Format").addClass("hint");
            $form.removeClass("browseMode").removeClass("previewMode")
                .find(".default-hidden").addClass("hidden");
            $("#fileNameSelector").removeClass("optionsOpen");

            // keep header to be checked
            $udfCheckbox.find(".checkbox").removeClass("checked");
            resetUdfSection();
        });

        // submit the form
        var formatTranslater = {
            "JSON"  : "JSON",
            "CSV"   : "CSV",
            "Random": "rand",
            "Raw"   : "raw",
            "UDF"   : "UDF",
            "Excel" : "Excel"
        };
        $form.submit(function(event) {
            event.preventDefault();
            if ($form.hasClass("previewMode")) {
                return;
            }

            var $submitBtn = $(this).blur();
            xcHelper.disableSubmit($submitBtn);

            var dsName   = $fileName.val().trim();
            var dsFormat = formatTranslater[$formatText.val()];

            var loadURL    = $filePath.val().trim();
            var fieldDelim = delimiterTranslate($("#fieldText"));
            var lineDelim  = delimiterTranslate($("#lineText"));

            var moduleName = "";
            var funcName   = "";

            var isValid;
            if (dsFormat === "CSV") {
                lastFieldDelim = $("#fieldText").val();
                lastLineDelim = $("#lineText").val();
            } else if (dsFormat === "raw") {
                lastLineDelim = $("#lineText").val();
            }
            if ($udfCheckbox.find(".checkbox").hasClass("checked")) {
                var $moduleInput = $udfModuleList.find("input");
                var $funcInput = $udfFuncList.find("input");

                moduleName = $moduleInput.val();
                funcName = $funcInput.val();

                isValid = xcHelper.validate([
                    {
                        "$selector": $moduleInput,
                        "text"     : ErrorTextTStr.NoEmptyList
                    },
                    {
                        "$selector": $funcInput,
                        "text"     : ErrorTextTStr.NoEmptyList
                    }
                ]);

                if (!isValid) {
                    xcHelper.enableSubmit($submitBtn);
                    return;
                }
            }

            var header = false;
            if ($csvCheckBox.find(".checkbox").hasClass("checked")) {
                header = true;
            }

            isValid = xcHelper.validate([
                {
                    "$selector": $formatText,
                    "check"    : function() {
                        return (dsFormat == null);
                    },
                    "text": ErrorTextTStr.NoEmptyList
                },
                {
                    "$selector": $fileName,
                    "check"    : DS.has,
                    "formMode" : true,
                    "text"     : ErrorTextTStr.DSNameConfilct
                }
            ]);

            if (!isValid) {
                xcHelper.enableSubmit($submitBtn);
                return;
            }

            DatastoreForm.load(dsName, dsFormat, loadURL,
                                fieldDelim, lineDelim, header,
                                moduleName, funcName)
            .always(function() {
                xcHelper.enableSubmit($submitBtn);
            });
        });

        // XXX This should be removed in production
        $filePath.keyup(function() {
            var val = $(this).val();
            if (val.length === 2) {
                var file = null;
                switch (val) {
                    case ("za"):
                        file = "yelpUsers";
                        break;
                    case ("zb"):
                        file = "yelpReviews";
                        break;
                    case ("zc"):
                        file = "gdelt";
                        break;
                    case ("zd"):
                        file = "sp500";
                        break;
                    case ("ze"):
                        file = "classes";
                        break;
                    case ("zf"):
                        file = "schedule";
                        break;
                    case ("zg"):
                        file = "students";
                        break;
                    case ("zh"):
                        file = "teachers";
                        break;
                    case ("zi"):
                        file = "jsonGen";
                        break;
                    default:
                        break;
                }
                if (file) {
                    secretForm(file);
                }
            }
        });

        function secretForm(file) {
            var filePath = "";
            var $formatDropdown = $("#fileFormatMenu");
            switch (file) {
                case ("yelpUsers"):
                    filePath = "yelp/user";
                    break;
                case ("yelpReviews"):
                    filePath = "yelp/reviews";
                    break;
                case ("gdelt"):
                    filePath = "gdelt";
                    break;
                case ("sp500"):
                    filePath = "sp500";
                    break;
                case ("classes"):
                    filePath = "qa/indexJoin/classes";
                    break;
                case ("schedule"):
                    filePath = "qa/indexJoin/schedule";
                    break;
                case ("students"):
                    filePath = "qa/indexJoin/students";
                    break;
                case ("teachers"):
                    filePath = "qa/indexJoin/teachers";
                    break;
                case ("jsonGen"):
                    filePath = "jsonGen";
                    break;
                default:
                    break;
            }

            $filePath.val('file:///var/tmp/' + filePath);

            $fileName.val(file);

            if (file === "sp500" || file === "gdelt") {
                $formatDropdown.find('li[name="CSV"]').click();
            } else {
                $formatDropdown.find('li[name="JSON"]').click();
            }

            $fileName.focus();
        }
    };

    DatastoreForm.load = function(dsName, dsFormat, loadURL, fieldDelim, lineDelim, header, moduleName, funcName) {
        var deferred = jQuery.Deferred();

        // validation check of loadURL
        XcalarListFiles(loadURL)
        .then(function() {
            var msg = StatusMessageTStr.LoadingDataset + ": " + dsName;
            var msgObj = {
                "msg"      : msg,
                "operation": "data set load"
            };
            var msgId = StatusMessage.addMsg(msgObj);

            DS.load(dsName, dsFormat, loadURL, fieldDelim, lineDelim,
                header, moduleName, funcName)
            .then(function($grid) {
                var options = {
                    "newDataSet": true,
                    "dataSetId" : $grid.attr("id")
                };
                StatusMessage.success(msgId, false, null, options);
                deferred.resolve();
            })
            .fail(function(error) {
                Alert.error("Load Dataset Failed", error.error);
                StatusMessage.fail(StatusMessageTStr.LoadFailed, msgId);
                deferred.reject(error);
            });
        })
        .fail(function(error) {
            StatusBox.show(error.error, $filePath, true);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    DatastoreForm.update = function() {
        // update python module list
        XcalarListXdfs("*", "User*")
        .then(function(listXdfsObj) {
            var i;
            var len = listXdfsObj.numXdfs;
            var udfs = listXdfsObj.fnDescs;
            var moduleMap = {};
            var modules = [];

            for (i = 0; i < len; i++) {
                modules.push(udfs[i].fnName);
            }

            modules.sort();

            var moduleLi = "";
            var fnLi = "";
            for (i = 0; i < len; i++) {
                var udf = modules[i].split(":");
                var moduleName = udf[0];
                var fnName = udf[1];

                if (!moduleMap.hasOwnProperty(moduleName)) {
                    moduleMap[moduleName] = true;
                    moduleLi += "<li>" + moduleName + "</li>";
                }

                fnLi += '<li data-module="' + moduleName + '">' +
                            fnName +
                        '</li>';
            }

            $udfModuleList.find("ul").html(moduleLi);
            $udfFuncList.find("ul").html(fnLi);
        })
        .fail(function(error) {
            console.error("List UDF Fails!", error);
        });
    };

    DatastoreForm.clear = function() {
        $("#importDataButton").click();
        $("#importDataReset").click();
    };

    function delimiterTranslate($input) {
        if ($input.hasClass("nullVal")) {
            return "";
        }

        var delimiter = $input.val();
        switch (delimiter) {
            case "\\t":
                return "\t";
            case "\\n":
                return "\n";
            default:
                return (delimiter);
        }
    }

    function hideDropdownMenu() {
        $("#importDataView .dropDownList").removeClass("open")
                            .find(".list").hide();
        $csvDelim.find(".delimVal").val("");
    }

    function resetDelimiter() {
        // to show \t, \ should be escaped
        $("#fieldText").val(lastFieldDelim).removeClass("nullVal");
        $("#lineText").val(lastLineDelim).removeClass("nullVal");
    }

    function resetUdfSection() {
        $udfFuncList.addClass("disabled");
        $udfFuncList.parent().tooltip({
            "title"    : "Please choose a module first",
            "placement": "top",
            "container": "#importDataView"
        });
    }

    return (DatastoreForm);
}(jQuery, {}));

/*
 * Module for grid view part on the left of datastore panel
 */
window.GridView = (function($, GridView) {
    var $explorePanel = $('#exploreView');
    var $deleteFolderBtn = $("#deleteFolderBtn");
    var $gridView = $explorePanel.find(".gridItems");

    GridView.setup = function() {
        setupGridViewButton();
        setupGrids();
    };

    GridView.clear = function() {
        return (releaseDatasetPointer());
    };

    // toggle between list view and grid view
    GridView.toggle = function(isListView) {
        var $btn = $("#dataViewBtn, #exportViewBtn");
        var $allGrids = $gridView.add($('#exportView').find('.gridItems'));
        // includes import and export grids
        if (isListView) {
            // show list view
            $btn.removeClass("gridView").addClass("listView");
            $allGrids.removeClass("gridView").addClass("listView");
            $btn.attr('data-original-title', 'Switch to Grid view');
            $allGrids.find('.label').removeAttr('data-toggle');
        } else {
            $btn.removeClass("listView").addClass("gridView");
            $allGrids.removeClass("listView").addClass("gridView");
            $btn.attr('data-original-title', 'Switch to List view');
            $allGrids.find('.label').attr('data-toggle', 'tooltip');
        }

        // refresh tooltip
        $btn.mouseenter();
        $btn.mouseover();
    };

    function setupGridViewButton() {
        // click to go to form section
        $("#importDataButton").click(function() {
            var $importForm = $("#importDataView");

            if (!$importForm.is(":visible")) {
                $("#importDataReset").click();
                $importForm.show();
                $("#dataSetTableWrap").empty();
                $explorePanel.find(".contentViewMid").addClass("hidden");
                $("#filePath").focus();
                $gridView.find(".grid-unit.active").removeClass("active");
                $("#preview-close").click();
            }
        });

        // click to toggle list view and grid view
        $("#dataViewBtn, #exportViewBtn").click(function() {
            var $btn = $(this);
            var isListView;

            if ($btn.hasClass("gridView")) {
                isListView = true;
            } else {
                isListView = false;
            }

            GridView.toggle(isListView);
        });

         // click "Add New Folder" button to add new folder
        $("#addFolderBtn").click(function() {
            DS.newFolder();
        });

        // click "Back Up" button to go back to parent folder
        $("#backFolderBtn").click(function() {
            if (!$(this).hasClass("disabled")) {
                DS.upDir();
            }
        });

        // click "Delete Folder" button to delete folder
        $deleteFolderBtn.click(function() {
            if ($(this).hasClass("disabled")) {
                return;
            }

            DS.remove($(".grid-unit.active"));
        });
    }

    function setupGrids() {
        // refresh dataset
        $("#refreshDS").click(function() {
            XcalarGetDatasets()
            .then(function(datasets) {
                DS.restore(DS.getHomeDir(), datasets);
            })
            .fail(function(error) {
                console.error("Refresh DS failes", error);
            });
        });

        // click empty area on gridView
        $explorePanel.find(".gridViewWrapper").on("click", function() {
            // this hanlder is called before the following one
            $gridView.find(".active").removeClass("active");
            $deleteFolderBtn.addClass("disabled");
        });

        // click a folder/ds
        $gridView.on("click", ".grid-unit", function(event) {
            event.stopPropagation(); // stop event bubbling
            var $grid = $(this);

            $gridView.find(".active").removeClass("active");
            $grid.addClass("active");
            $deleteFolderBtn.removeClass("disabled");

            // folder do not show anything
            if ($grid.hasClass("folder")) {
                return;
            }

            // when switch to a ds, should clear others' ref count first!!
            if ($grid.find('.waitingIcon').length !== 0) {
                var loading = true;

                DataPreview.clear()
                .then(function() {
                    return (releaseDatasetPointer());
                })
                .then(function() {
                    $("#importDataView").hide();
                    $('#datasetWrap').removeClass("inactive");
                    $explorePanel.find(".contentViewMid").removeClass('hidden');
                    return ( DataSampleTable.show($grid.data("dsid"), loading));
                });

                return;
            }

            DataPreview.clear()
            .then(function() {
                return (releaseDatasetPointer());
            })
            .then(function() {   
                $("#importDataView").hide();
                $('#datasetWrap').removeClass("inactive");
                $explorePanel.find(".contentViewMid").removeClass('hidden');
                return (DataSampleTable.show($grid.data("dsid")));
            })
            .then(function() {
                if (event.scrollToColumn) {
                    DataCart.scrollToDatasetColumn(event.showToolTip);
                }
                $('#datasetWrap').removeClass('error');
                Tips.refresh();
            })
            .fail(function(error) {
                var errorHTML = "<div class='loadError'>" +
                                    "Loading dataset failed. " + error.error +
                                "</div>";
                console.error(error.error);
                $('#dataSetTableWrap').html(errorHTML);
                $('#datasetWrap').addClass('error');
            });
        });

        // Input event on folder
        $gridView.on({
            // press enter to remove focus from folder label
            "keypress": function(event) {
                if (event.which === keyCode.Enter) {
                    event.preventDefault();
                    $(this).blur();
                }
            },
            // select all on focus
            "focus": function() {
                var div = $(this).get(0);
                // without setTimeout cannot select all for some unknow reasons
                setTimeout(function() {
                    xcHelper.createSelection(div);
                }, 1);
            },
            "blur": function() {
                var $label  = $(this);
                var dsId    = $label.closest(".grid-unit").data("dsid");
                var newName = $label.text().trim();
                DS.rename(dsId, newName);
                this.scrollLeft = 0;    //scroll to the start of text;
                xcHelper.removeSelectionRange();
            }
        }, ".folder .label");

        // dbclick grid view folder
        $gridView.on("dblclick", ".folder > .gridIcon, .folder > .dsCount",
            function() {
                var $grid = $(this).closest(".folder");
                $gridView.find(".active").removeClass("active");
                $deleteFolderBtn.addClass("disabled");

                if ($gridView.hasClass("gridView")) {
                    DS.goToDir($grid.data("dsid"));
                }
            }
        );

        // click list view folder
        $gridView.on("click", ".folder > .listIcon, .folder > .dsCount",
            function() {
                var $grid = $(this).closest(".folder");
                if ($gridView.hasClass("listView")) {
                    $grid.toggleClass("collapse");
                }
            }
        );
    }

    function releaseDatasetPointer() {
        var deferred = jQuery.Deferred();

        if (gDatasetBrowserResultSetId === 0) {
            deferred.resolve();
        } else {
            XcalarSetFree(gDatasetBrowserResultSetId)
            .then(function() {
                gDatasetBrowserResultSetId = 0;
                deferred.resolve();
            })
            .fail(deferred.reject);
        }

        return (deferred.promise());
    }

    return (GridView);
}(jQuery, {}));

/*
 * Module for data cart part on the right of datastore panel
 */
window.DataCart = (function($, DataCart) {
    var innerCarts = [];
    var $cartArea  = $("#dataCart");
    var $explorePanel = $('#exploreView');

    DataCart.setup = function() {
        // send to worksheet button
        $("#submitDSTablesBtn").click(function() {
            var $submitBtn = $(this);
            $submitBtn.blur();

            if ($cartArea.find(".selectedTable").length === 0) {
                return (false);
            }

            var nameIsValid = true;
            var errorMsg = "";
            var $input;

            var tableNames = {};
            for (var tbl in gTables) {
                tableNames[tbl.tableName] = true;
            }

            // check table name conflict in gTables
            innerCarts.forEach(function(cart) {
                var tableName = cart.tableName;
                $input = $('#selectedTable-' + cart.dsName + ' .tableNameEdit');

                if (tableName === "") {
                    errorMsg = 'Please give your new table a name.';
                    nameIsValid = false;
                    return (false);
                }

                if (tableNames.hasOwnProperty(tableName)) {
                    errorMsg = 'A table with the name "' + tableName +
                                '" already exists. Please use a unique name.';
                    nameIsValid = false;
                    return (false);
                }
            });

            if (!nameIsValid) {
                scrollToTableName($input);
                StatusBox.show(errorMsg, $input, true, 0, {side: 'left'});
                return (false);
            }

            tableNames = {};
            xcHelper.disableSubmit($submitBtn);

            // check backend table name to see if has conflict
            XcalarGetTables()
            .then(function(results) {
                var innerDeferred = jQuery.Deferred();
                // var tables = results.tables;
                var tables = results.nodeInfo;
                for (var i = 0, len = results.numNodes; i < len; i++) {
                    var name = xcHelper.getTableName(tables[i].name);
                    tableNames[name] = true;
                }

                innerCarts.forEach(function(cart) {
                    var tableName = cart.tableName;
                    $input = $('#selectedTable-' + cart.dsName +
                               ' .tableNameEdit');

                    if (tableNames.hasOwnProperty(tableName)) {
                        errorMsg = 'A table with the name "' + tableName +
                                '" already exists. Please use a unique name.';
                        nameIsValid = false;
                        return (false);
                    }
                });

                if (nameIsValid) {
                    createWorksheet()
                    .then(function() {
                        commitToStorage();
                        innerDeferred.resolve();
                    })
                    .fail(function(error) {
                        Alert.error("Create work sheet fails", error);
                        innerDeferred.reject(error);
                    });
                } else {
                    scrollToTableName($input);
                    StatusBox.show(errorMsg, $input, true, 0, {side: 'left'});
                    innerDeferred.resolve();
                }
                return (innerDeferred.promise());
            })
            .fail(function(error) {
                console.error(error);
            })
            .always(function() {
                xcHelper.enableSubmit($submitBtn);
            });
        });

        // clear cart
        $("#clearDataCart").click(function() {
            $(this).blur();
            emptyAllCarts();
        });

        // click on data cart item to focus on the related column
        $cartArea.on("click", ".colName", function() {
            var $li = $(this).parent();
            $cartArea.find(".colSelected").removeClass("colSelected");
            $li.addClass("colSelected");
            triggerScrollToDatasetColumn($li);
        });

        // remove selected key
        $cartArea.on("click", ".removeCol", function() {
            var $li = $(this).closest(".colWrap");
            var dsname = $li.closest(".selectedTable").attr("id")
                            .split("selectedTable-")[1];

            removeCartItem(dsname, $li);
        });

        // edit table name event
        $cartArea.on({
            "keypress": function(event) {
                if (event.which === keyCode.Enter) {
                    $(this).blur();
                }
            },
            "change": function() {
                var $input = $(this);
                var dsName = $input.closest(".selectedTable").attr("id")
                                .split("selectedTable-")[1];
                var tableName = $input.val().trim();
                // update
                var cart = filterCarts(dsName);
                cart.tableName = tableName;
            },
            "focus": function() {
                $(this).closest(".cartTitleArea").addClass("focus");
            },
            "blur": function() {
                $(this).closest(".cartTitleArea").removeClass("focus");
            }
        }, ".tableNameEdit");

        // click edit icon to edit table
        $cartArea.on("click", ".cartTitleArea .iconWrapper", function() {
            $(this).siblings(".tableNameEdit").focus();
        });
    };

    // get information about carts
    DataCart.getCarts = function() {
        return (innerCarts);
    };

    // add column to cart
    DataCart.addItem = function(dsName, colInputs) {
        if (!(colInputs instanceof Array)) {
            colInputs = [colInputs];
        }

        var cart = filterCarts(dsName);

        if (cart == null) {
            cart = addCart(dsName);
        }

        var $colInput;
        var colNum;
        var val;

        for (var i = 0, len = colInputs.length; i < len; i++) {
            $colInput = colInputs[i];
            colNum = xcHelper.parseColNum($colInput);
            val = $colInput.val();
            appendCartItem(cart, colNum, val);
        }
        var delay = true;
        refreshCart(delay);
    };

    // remove one column from cart
    DataCart.removeItem = function(dsName, $colInput) {
        var colNum = xcHelper.parseColNum($colInput);
        var $li    = $("#selectedTable-" + dsName)
                        .find("li[data-colnum=" + colNum + "]");
        removeCartItem(dsName, $li);
    };

    // remove one cart
    DataCart.removeCart = function(dsName) {
        var $cart = $("#selectedTable-" + dsName);

        if (gMinModeOn) {
            $cart.remove();
            refreshCart();
        } else {
            $cart.find("ul").slideUp(80, function() {
                $cart.remove();
                refreshCart();
            });
        }

        removeCart(dsName);    // remove the cart
    };

    // restore the cart
    DataCart.restore = function(carts) {
        var noNameCheck = true;
        for (var i = carts.length - 1; i >= 0; i--) {
            // add cart use Array.unshift, so here should restore from end to 0
            var cart = carts[i];
            var resotredCart = addCart(cart.dsName, cart.tableName, noNameCheck);

            cart.items.forEach(function(item) {
                appendCartItem(resotredCart, item.colNum, item.value);
            });
        }

        refreshCart();
    };

    DataCart.clear = function() {
        emptyAllCarts();
    };

    DataCart.scrollToDatasetColumn = function(showToolTip) {
        var $table = $("#worksheetTable");
        var $datasetWrap = $('#datasetWrap');
        var colNum = $cartArea.find(".colSelected").data("colnum");
        var $column = $table.find("th.col" + colNum);
        var position = $column.position().left;
        var columnWidth = $column.width();
        var dataWrapWidth = $datasetWrap.width();

        $datasetWrap.scrollLeft(position - (dataWrapWidth / 2) +
                                (columnWidth / 2));

        if (showToolTip) {
            var $header = $column.children(".header");
            $header.tooltip({
                "title"    : "Focused Column",
                "placement": "top",
                "trigger"  : "manual",
                "container": "#exploreView"
            });

            $header.tooltip("show");
            setTimeout(function() {
                $header.tooltip("destroy");
            }, 1000);
        }
    };

    DataCart.overflowShadow = function() {
        if ($cartArea.height() > $('#dataCartWrap').height()) {
            $explorePanel.find('.contentViewRight').find('.buttonArea')
                                .addClass('cartOverflow');
        } else {
            $explorePanel.find('.contentViewRight').find('.buttonArea')
                                .removeClass('cartOverflow');
        }
    };

    function filterCarts(dsName) {
        for (var i = 0, len = innerCarts.length; i < len; i++) {
            if (innerCarts[i].dsName === dsName) {
                return (innerCarts[i]);
            }
        }

        return (null);
    }

    function addCart(dsName, tableName, noNameCheck) {
        tableName = tableName || dsName;
        var cart = {
            "dsName"   : dsName,
            "tableName": tableName,
            "items"    : []
        };

        // new cart should be prepended, sync with UI
        innerCarts.unshift(cart);

        var cartHtml =
            '<div id="selectedTable-' + dsName + '"' +
                'class="selectedTable">' +
                '<div class="cartTitleArea">' +
                    '<input class="tableNameEdit textOverflow" type="text" ' +
                        'spellcheck="false" value="' + tableName + '">' +
                    '<div class="iconWrapper">' +
                        '<span class="icon"></span>' +
                    '</div>' +
                '</div>' +
                '<ul></ul>' +
            '</div>';

        var $cart = $(cartHtml);
        $cartArea.prepend($cart);

        if (!noNameCheck) {
            getUnusedTableName(tableName)
            .then(function(newTableName) {
                $cart.find('.tableNameEdit').val(newTableName);
                cart.tableName = newTableName;
            })
            .fail(function() {
                // keep the current name
            });

            var $tableNameEdit = $cart.find('.tableNameEdit').focus();
            xcHelper.createSelection($tableNameEdit[0], true);
        }

        return (cart);
    }

    function appendCartItem(cart, colNum, val) {
        var $cart = $("#selectedTable-" + cart.dsName);
        var escapedVal = val.replace(/\</g, "&lt;").replace(/\>/g, "&gt;");
        var $li = $('<li class="colWrap" ' +
                        'data-colnum="' + colNum + '">' +
                        '<span class="colName textOverflow">' +
                            escapedVal +
                        '</span>' +
                        '<div class="removeCol">' +
                            '<span class="closeIcon"></span>' +
                        '</div>' +
                    '</li>');

        $cart.find("ul").append($li);

        if (!gMinModeOn) {
            $li.hide().slideDown(100);
        }

        cart.items.push({"colNum": colNum, "value": val});

        return ($li);
    }

    function getUnusedTableName(datasetName) {
        // checks dataset names and tablenames and tries to create a table
        // called dataset1 if it doesnt already exist or dataset2 etc...
        var deferred = jQuery.Deferred();
        var tableNames = {};

        // datasets has it's unique format, no need to check
        XcalarGetTables()
        .then(function(result) {
            var tables = result.nodeInfo;
            for (var i = 0; i < result.numNodes; i++) {
                var name = xcHelper.getTableName(tables[i].name);
                tableNames[name] = 1;
            }

            var validNameFound = false;
            var limit = 20; // we won't try more than 20 times
            var newName = datasetName;
            if (tableNames.hasOwnProperty(newName)) {
                for (var i = 1; i <= limit; i++) {
                    newName = datasetName + i;
                    if (!tableNames.hasOwnProperty(newName)) {
                        validNameFound = true;
                        break;
                    }
                }
                if (!validNameFound) {
                    var tries = 0;
                    while (tableNames.hasOwnProperty(newName) && tries < 100) {
                        newName = xcHelper.randName(datasetName, 4);
                        tries++;
                    }
                }
            }
            
            deferred.resolve(newName);
        })
        .fail(function(error) {
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    function removeCart(dsName) {
        for (var i = 0, len = innerCarts.length; i < len; i++) {
            if (innerCarts[i].dsName === dsName) {
                innerCarts.splice(i, 1);
                break;
            }
        }
    }

    function removeCartItem(dsName, $li) {
        var colNum = $li.data("colnum");
        var $table = $("#worksheetTable");
        // if the table is displayed
        if ($table.data("dsname") === dsName) {
            $table.find("th.col" + colNum + " .header")
                        .removeClass('colAdded');
            $table.find(".col" + colNum).removeClass('selectedCol');
        }

        if ($li.siblings().length === 0) {
            // empty this cart
            $li.closest(".selectedTable").remove();
            removeCart(dsName);
        } else {
            if (gMinModeOn) {
                $li.remove();
            } else {
                $li.slideUp(100, function() {
                    $li.remove();
                });
            }

            var items = filterCarts(dsName).items;
            for (var i = 0, len = items.length; i < len; i++) {
                if (items[i].colNum === colNum) {
                    items.splice(i, 1);
                    break;
                }
            }
        }

        refreshCart();
    }

    function emptyAllCarts() {
        var $table = $("#worksheetTable");

        $table.find('.colAdded').removeClass("colAdded");
        $table.find('.selectedCol').removeClass("selectedCol");

        innerCarts = [];

        if (gMinModeOn) {
            $cartArea.empty();
            refreshCart();
        } else {
            $cartArea.slideUp(100, function() {
                $cartArea.empty().show();
                refreshCart();
            });
        }
    }

    function refreshCart(delay) {
        DataCart.overflowShadow();
        var $submitBtn = $("#submitDSTablesBtn");
        var $clearBtn  = $("#clearDataCart");
        var $cartTitle = $("#dataCartTitle");
        var $dataCart  = $('#dataCart');

        if ($cartArea.children('.selectedTable').length === 0) {
            $submitBtn.addClass("btnInactive");
            $clearBtn.addClass("btnInactive");
            $cartTitle.html("<b>No Columns Selected</b>");
            var helpText = '<span class="helpText">To add a column to the' +
                                ' data cart, select a data set on the left' +
                                ' and click' +
                                ' on the column names that you are interested' +
                                ' in inside the center panel.</span>';
            $dataCart.html(helpText);
        } else {
            $submitBtn.removeClass("btnInactive");
            $clearBtn.removeClass("btnInactive");
            $cartTitle.html("<b>Selected Columns</b>");
            $dataCart.find('.helpText').remove();
        }
        if (delay) {
            setTimeout(DataCart.overflowShadow, 10);
        } else {
            DataCart.overflowShadow();
        }
    }

    function scrollToTableName($input) {
        var cartRect = $('#dataCartWrap')[0].getBoundingClientRect();
        var cartBottom = cartRect.bottom;
        var cartTop = cartRect.top;
        var inputTop = $input.offset().top;
        var inputHeight = $input.height();
        var hiddenDistance = (inputTop + inputHeight) - cartBottom;
        var distFromTop = inputTop - cartTop;
        var scrollTop;

        if (hiddenDistance > -10) {
            scrollTop = $("#dataCartWrap").scrollTop();
            $('#dataCartWrap').scrollTop(scrollTop +
                                         hiddenDistance + 10);
        } else if (distFromTop < 0) {
            scrollTop = $("#dataCartWrap").scrollTop();
            $('#dataCartWrap').scrollTop(scrollTop + distFromTop - 10);
        }
    }

    function triggerScrollToDatasetColumn($li) {
        var tableName = $li.closest('.selectedTable').attr('id').split("-")[1];
        var $datasetIcon = $('#dataset-' + tableName);

        if ($datasetIcon.hasClass('active')) {
            DataCart.scrollToDatasetColumn(true);
        } else {
            var clickEvent = $.Event('click');
            clickEvent.scrollToColumn = true;
            clickEvent.showToolTip = true;
            $datasetIcon.trigger(clickEvent);
        }
    }

    function createWorksheet() {
        var deferred = jQuery.Deferred();
        var promises = [];

        // reference innerCarts here since innerCarts needs
        // to be clear at end
        var carts = innerCarts;

        carts.forEach(function(cart) {
            promises.push((function() {
                var innerDeferred = jQuery.Deferred();
                // store columns in localstorage using setgTable()
                var newTableCols = [];
                var startIndex = 0;
                var datasetName = cart.dsName;
                var tableName = cart.tableName + Authentication.getHashId();

                // add sql
                var sqlOptions = {
                    "operation": SQLOps.IndexDS,
                    "dsName"   : datasetName,
                    "tableName": tableName,
                    "columns"  : []
                };
                // add status message
                var msg = StatusMessageTStr.CreatingTable + ': ' + tableName;
                var msgObj = {
                    "msg"      : msg,
                    "operation": 'table creation'
                };
                var msgId = StatusMessage.addMsg(msgObj);

                var items = cart.items;
                for (var i = 0, len = items.length; i < len; i++) {
                    var colname     = items[i].value;
                    var escapedName = colname;

                    if (colname.indexOf('.') > -1) {
                        escapedName = colname.replace(/\./g, "\\\.");
                    }

                    var progCol = ColManager.newCol({
                        "index"   : ++startIndex,
                        "name"    : colname,
                        "width"   : gNewCellWidth,
                        "isNewCol": false,
                        "userStr" : '"' + colname + '" = pull(' +
                                    escapedName + ')',
                        "func": {
                            "func": "pull",
                            "args": [escapedName]
                        }
                    });

                    var currentIndex = startIndex - 1;

                    newTableCols[currentIndex] = progCol;
                    sqlOptions.columns.push(colname);
                }
                // new "DATA" column
                newTableCols[startIndex] = ColManager.newDATACol(startIndex + 1);

                sqlOptions.columns.push("DATA");

                var tableProperties = {
                    "bookmarks" : [],
                    "rowHeights": {}
                };

                var tableId = xcHelper.getTableId(tableName);
                WSManager.addTable(tableId);

                XcalarIndexFromDataset(datasetName, "recordNum", tableName,
                                       sqlOptions)
                .then(function() {
                    return (setgTable(tableName, newTableCols, datasetName, tableProperties));
                })
                .then(function() {
                    var options = {
                        "keepOriginal"  : true,
                        "focusWorkspace": true
                    };
                    return (refreshTable(tableName, null, options));
                })
                .then(function() {
                    StatusMessage.success(msgId, false,
                                          xcHelper.getTableId(tableName));
                    innerDeferred.resolve();
                })
                .fail(function(error) {
                    WSManager.removeTable(tableId);
                    StatusMessage.fail(StatusMessageTStr.TableCreationFailed,
                                       msgId);
                    innerDeferred.reject(error);
                });
                return (innerDeferred.promise());
            }).bind(this));
        });

        showWaitCursor();
        emptyAllCarts();

        chain(promises)
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(removeWaitCursor);

        return (deferred.promise());
    }

    return (DataCart);
}(jQuery, {}));

/*
 * Module for preview table
 */
window.DataPreview = (function($, DataPreview) {
    var $previewTable = $("#previewTable");

    var tableName = null;
    var rawData   = null;

    var hasHeader   = false;
    var delimiter   = "";
    var highlighter = "";
    var dsFormat    = "CSV";

    var promoteHeader =
            '<div class="header"' +
                'title="Undo Promote Header" ' +
                'data-toggle="tooltip" ' +
                'data-placement="top" data-container="body">' +
                '<span class="icon"></span>' +
            '</div>';
    var promoteTd =
            '<td class="lineMarker promote" ' +
                'title="Promote Header" data-toggle="tooltip" ' +
                'data-placement="top" data-container="body">' +
                '<div class="promoteWrap">' +
                    '<div class="iconWrapper">' +
                        '<span class="icon"></span>' +
                    '</div>' +
                    '<div class="divider"></div>' +
                '</div>' +
            '</td>';


    DataPreview.setup = function() {
        // promot header
        $previewTable.on("click", ".promote, .undo-promote", function() {
            togglePromote();
        });

        // select a char as candidate delimiter
        $previewTable.mouseup(function() {
            if ($previewTable.hasClass("has-delimiter")) {
                return;
            }

            var selection;
            if (window.getSelection) {
                selection = window.getSelection();
            } else if (document.selection) {
                selection = document.selection.createRange();
            }

            highlightDelimiter(selection.toString());
        });

        $("#preview-apply").click(function() {
            var $fileName = $("#fileName");
            var isValid = xcHelper.validate([
                // check for "" should be kept for preview mode
                // since it does't submit the form
                {
                   "$selector": $fileName,
                    "formMode": true
                },
                {
                    "$selector": $fileName,
                    "check"    : DS.has,
                    "formMode" : true,
                    "text"     : ErrorTextTStr.DSNameConfilct
                }
            ]);

            if (!isValid) {
                return;
            }

            // add alert
            if (dsFormat === "CSV" &&
                (delimiter === "" || !hasHeader))
            {
                var msg;
                if (delimiter === "" && !hasHeader) {
                    msg = "You have not chosen a delimiter and " +
                            "header row,\n";
                } else if (delimiter === ""){
                    msg = "You have not chosen a delimiter,\n";
                } else if (!hasHeader) {
                    msg = "You have not chosen a header row,\n";
                }
                msg += "are you sure you want to continue?";

                Alert.show({
                    "title"  : "LOAD DATASET CONFIRMATION",
                    "msg"    : msg,
                    "confirm": function () {
                        DataPreview.load();
                    }
                });
            } else {
                DataPreview.load();
            }
        });

        // close preview
        $("#preview-close").click(function() {
            clearAll();
        });

        // hightlight and remove highlight button
        var $highLightBtn    = $("#preview-highlight");
        var $rmHightLightBtn = $("#preview-rmHightlight");

        $highLightBtn.click(function() {
            if (!$highLightBtn.hasClass("active") || highlighter === "") {
                return;
            }
            delimiter = highlighter;
            highlighter = "";

            applyDelim();
        });

        $rmHightLightBtn.click(function() {
            if (!$rmHightLightBtn.hasClass("active") || delimiter !== "") {
                // case of remove delimiter
                delimiter = "";

                $highLightBtn.removeClass("active");
                $rmHightLightBtn.removeClass("active")
                        .attr("data-original-title", "Remove highlights");
                getPreviewTable();
            } else {
                // case of remove highlighter
                highlighter = "";
                toggleHighLight();
            }
        });

        // resize column
        $previewTable.on("mousedown", ".colGrab", function(event) {
            if (event.which !== 1) {
                return;
            }
            gRescolMouseDown($(this), event, {target: "datastore"});
            dblClickResize($(this), {minWidth: 25, target: "datastore"});
        });

        var $suggSection = $("#previewSugg");

        $("#previewSuggBtn").click(function() {
            if ($suggSection.hasClass("hidden")) {
                toggleSuggest(true);
            } else {
                toggleSuggest(false);
            }
        });

        $suggSection.on("click", ".apply-highlight", function() {
            $highLightBtn.click();
        });

        $suggSection.on("click", ".rm-highlight", function() {
            $rmHightLightBtn.click();
        });

        $suggSection.on("click", ".promote", function() {
            togglePromote();
        });

        $suggSection.on("click", ".commaDelim", function() {
            delimiter = ",";
            highlighter = "";
            applyDelim();
        });

        $suggSection.on("click", ".tabDelim", function() {
            delimiter = "\t";
            highlighter = "";
            applyDelim();
        });

        $suggSection.on("click", ".pipeDelim", function() {
            delimiter = "|";
            highlighter = "";
            applyDelim();
        });

        $suggSection.on("click", ".jsonLoad", function() {
            dsFormat = "JSON";
            $("#preview-apply").click();
        });

        $suggSection.on("click", ".apply-all", function() {
            $("#preview-apply").click();
        });

        function applyDelim() {
            $highLightBtn.removeClass("active");
            $rmHightLightBtn.addClass("active")
                            .attr("data-original-title", "Remove Delimiter");
            getPreviewTable();
        }
    };

    DataPreview.show = function() {
        var deferred = jQuery.Deferred();
        var loadURL  = $("#filePath").val().trim();
        var refId;

        $("#importDataForm").on("keypress.preview", function(event) {
            if (event.which === keyCode.Enter) {
                $("#preview-apply").click();
                return false;
            }
        });

        var $applyBtnSection = $("#preview-apply").parent().hide();
        XcalarListFiles(loadURL)
        .then(function() {
            $("#importDataForm").addClass("previewMode");

            var $previeWrap   = $("#dsPreviewWrap").removeClass("hidden");
            var $waitSection  = $previeWrap.find(".waitSection")
                                                    .removeClass("hidden");
            var $errorSection = $previeWrap.find(".errorSection")
                                                    .addClass("hidden");
            var $suggBtn = $("#previewSuggBtn").hide();
            
            tableName = $("#fileName").val().trim();
            tableName = xcHelper.randName(tableName) ||   // when table name is empty
                        xcHelper.randName("previewTable");
            tableName += ".preview"; // specific format for preview table
           
            var sqlOptions = {
                "operation" : SQLOps.PreviewDS,
                "dsPath"    : loadURL,
                "dsName"    : tableName,
                "dsFormat"  : "raw",
                "hasHeader" : hasHeader,
                "fieldDelim": "Null",
                "lineDelim" : "\n",
                "moduleName": "Null",
                "funcName"  : "Null"
            };

            XcalarLoad(loadURL, "raw", tableName, "", "\n", hasHeader, "", "",
                       sqlOptions)
            .then(function() {
                // clear ref count for datasets
                if (gDatasetBrowserResultSetId === 0) {
                    return (promiseWrapper(null));
                } else {
                    return (XcalarSetFree(gDatasetBrowserResultSetId));
                }
            })
            .then(function() {
                gDatasetBrowserResultSetId = 0;
                return (XcalarSample(tableName, 20));
            })
            .then(function(result) {
                if (!result) {
                    $errorSection.html("Cannot parse the dataset.")
                                .removeClass("hidden");
                    deferred.reject({"error": "Cannot parse the dataset."});
                    return (promiseWrapper(null));
                }

                refId = gDatasetBrowserResultSetId;
                // set it to 0 because releaseDatasetPointer() use it to check
                // if ds's ref count is cleard
                // preiview table should use it's own clear method
                gDatasetBrowserResultSetId = 0;

                var kvPairs    = result.kvPair;
                var numKvPairs = result.numKvPairs;

                rawData = [];

                var value;
                var json;

                try {
                    for (var i = 0; i < numKvPairs; i++) {
                        value = kvPairs[i].value;
                        json = $.parseJSON(value);

                        // get unique keys
                        for (var key in json) {
                            if (key === "recordNum") {
                                continue;
                            }
                            rawData.push(json[key].split(""));
                        }
                    }

                    getPreviewTable();
                    deferred.resolve();
                } catch(err) {
                    console.error(err, value);
                    $errorSection.html("Cannot parse the dataset.")
                                .removeClass("hidden");
                    // getPreviewTable();
                    deferred.reject({"error": "Cannot parse the dataset."});
                }

                $suggBtn.show();
                $applyBtnSection.show();

                $(window).on("resize", resizePreivewTable);
            })
            .then(function() {
                return (XcalarSetFree(refId));
            })
            .fail(function(error) {
                clearAll();
                deferred.reject(error);
            })
            .always(function() {
                $waitSection.addClass("hidden");
            });
        })
        .fail(function(error) {
            StatusBox.show(error.error, $("#filePath"), true);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    // load a dataset
    DataPreview.load = function() {
        var loadURL = $("#filePath").val().trim();
        var dsName  = $("#fileName").val().trim();

        loadHelper()
        .then(function() {
            clearAll();
        })
        .fail(function(error) {
            if (error.status != null) {
                clearAll();
            }
        });

        function loadHelper() {
            if (dsFormat === "JSON") {
                return DatastoreForm.load(dsName, "JSON", loadURL,
                                            "", "", false, "", "");
            } else {
                return DatastoreForm.load(dsName, "CSV", loadURL,
                                            delimiter, "\n", hasHeader, "", "");
            }
        }
    };

    DataPreview.clear = function() {
        if ($("#dsPreviewWrap").hasClass("hidden")) {
            // when preview table not shows up
            return (promiseWrapper(null));
        } else {
            var previewMode = true;
            return (clearAll(previewMode));
        }
    };

    function clearAll(previewMode) {
        var deferred = jQuery.Deferred();

        if (!previewMode) {
            $("#dsPreviewWrap").addClass("hidden");
            $("#importDataForm").removeClass("previewMode");
            $previewTable.removeClass("has-delimiter").empty();
            toggleSuggest(false, true);
        }

        $(window).off("resize", resizePreivewTable);
        $("#importDataForm").off("keypress.preview");

        rawData = null;
        hasHeader = false;
        delimiter = "";
        dsFormat = "CSV";
        highlighter = "";
        toggleHighLight();

        if (tableName != null) {
            var sqlOptions = {
                "operation": SQLOps.DestroyPreviewDS,
                "dsName"   : tableName
            };

            XcalarDestroyDataset(tableName, sqlOptions)
            .then(function() {
                tableName = null;
                deferred.resolve();
            })
            .fail(deferred.reject);
        } else {
            deferred.resolve();
        }

        return (deferred.promise());
    }

    function getPreviewTable() {
        var $tbody = $(getTbodyHTML());
        var $trs = $tbody.find("tr");
        var maxTdLen = 0;
        // find the length of td and fill up empty space
        $trs.each(function() {
            maxTdLen = Math.max(maxTdLen, $(this).find("td").length);
        });

        $trs.each(function() {
            var $tr  = $(this);
            var $tds = $tr.find("td");
            var trs = "";

            for (var j = 0, l = maxTdLen - $tds.length; j < l; j++) {
                trs += "<td></td>";
            }

            $tr.append(trs);
        });

        var $tHead = $(getTheadHTML(maxTdLen));
        var $tHrow = $tHead.find("tr");
        var thLen  = $tHead.find("th").length;
        var ths = "";

        for (var i = 0, len = maxTdLen - thLen; i < len; i++) {
            ths += '<th><div class="header"><div class="text">' +
                        '</div></div></th>';
        }
        $tHrow.append(ths);

        // add class
        $tHrow.find("th").each(function(index) {
            $(this).addClass("col" + index);
        });

        $previewTable.empty().append($tHead, $tbody);

        if (delimiter !== "") {
            $previewTable.addClass("has-delimiter");
        } else {
            $previewTable.removeClass("has-delimiter");
        }

        suggestHelper();
        resizePreivewTable();
    }

    function resizePreivewTable() {
        // size line divider to fit table
        var tableWidth = $previewTable.width();
        $previewTable.find('.divider').width(tableWidth - 10);

        // // size linmarker div to fit td
        // var lineMarkerHeight = $previewTable.find('.lineMarker').eq(0).height();
        // $previewTable.find('.lineMarker').eq(0).find('.promoteWrap')
        //                                        .height(lineMarkerHeight);
    }

    function togglePromote() {
        $(".tooltip").hide();
        hasHeader = !hasHeader;

        var $trs = $previewTable.find("tbody tr");
        var $tds = $trs.eq(0).find("td"); // first row tds
        var $headers = $previewTable.find("thead tr .header");
        var html;

        if (hasHeader) {
            // promote header
            for (var i = 1, len = $tds.length; i < len; i++) {
                $headers.eq(i).find(".text").html($tds.eq(i).html());
            }

            // change line marker
            for (var i = 1, len = $trs.length; i < len; i++) {
                $trs.eq(i).find(".lineMarker").text(i);
            }

            $trs.eq(0).remove();
            $previewTable.find("th.col0").html(promoteHeader)
                        .addClass("undo-promote");
        } else {
            // change line marker
            for (var i = 0, j = 2, len = $trs.length; i < len; i++, j++) {
                $trs.eq(i).find(".lineMarker").text(j);
            }

            // undo promote
            html = '<tr>' + promoteTd;

            for (var i = 1, len = $headers.length; i < len; i++) {
                var $text = $headers.eq(i).find(".text");
                html += '<td class="cell">' + $text.html() + '</td>';
                $text.html("Column" + (i - 1));
            }

            html += '</tr>';
            
            $trs.eq(0).before(html);
            $headers.eq(0).empty()
                    .closest("th").removeClass("undo-promote");
        }

        suggestHelper();
        resizePreivewTable();
    }

    function highlightDelimiter(str) {
        highlighter = str;
        xcHelper.removeSelectionRange();
        toggleHighLight();
    }

    function toggleHighLight() {
        $previewTable.find(".highlight").removeClass("highlight");

        var $highLightBtn    = $("#preview-highlight");
        var $rmHightLightBtn = $("#preview-rmHightlight");

        if (highlighter === "") {
            // when remove highlight
            $highLightBtn.removeClass("active");
            $rmHightLightBtn.removeClass("active");
        } else {
            // valid highLighted char
            $highLightBtn.addClass("active");
            $rmHightLightBtn.addClass("active");

            var dels   = highlighter.split("");
            var delLen = dels.length;

            var $cells = $previewTable.find("thead .text, tbody .cell");
            $cells.each(function() {
                var $tds = $(this).find(".td");
                var len = $tds.length;

                for (var i = 0; i < len; i++) {
                    var j = 0;
                    while (j < delLen && i + j < len) {
                        if ($tds.eq(i + j).text() === dels[j]) {
                            ++j;
                        } else {
                            break;
                        }
                    }

                    if (j === delLen && i + j <= len) {
                        for (j = 0; j < delLen; j++) {
                            $tds.eq(i + j).addClass("highlight");
                        }
                    }
                }
            });
        }

        suggestHelper();
    }

    function getTheadHTML(tdLen) {
        var thead = "<thead><tr>";
        var colGrab = (delimiter === "") ? "" : '<div class="colGrab" ' +
                                            'data-sizetoheader="true"></div>';

        if (hasHeader) {
            thead +=
                '<th class="undo-promote">' +
                    promoteHeader +
                '</th>' +
                tdHelper(rawData[0], true);
        } else {
            thead +=
               '<th>' +
                    '<div class="header"></div>' +
                '</th>';

            for (var i = 0; i < tdLen - 1; i++) {
                thead +=
                    '<th>' +
                        '<div class="header">' +
                            colGrab +
                            '<div class="text">Column' + i + '</div>' +
                        '</div>' +
                    '</th>';
            }
        }

        thead += "</thead></tr>";

        return (thead);
    }

    function getTbodyHTML() {
        var tbody = "<tbody>";
        var i  = hasHeader ? 1 : 0;

        for (j = 0, len = rawData.length; i < len; i++, j++) {
            tbody += '<tr>';

            if (i === 0) {
                // when the header has not promoted
                tbody += promoteTd;
            } else {
                tbody +=
                    '<td class="lineMarker">' +
                        (j + 1) +
                    '</td>';
            }

            tbody += tdHelper(rawData[i]) + '</tr>';
        }

        tbody += "</tbody>";

        return (tbody);
    }

    function tdHelper(data, isTh) {
        var hasQuote = false;
        var hasBackSlash = false;
        var dels = delimiter.split("");
        var delLen = dels.length;

        var hasDelimiter = (delLen !== 0);
        var colGrab = hasDelimiter ? '<div class="colGrab" ' +
                                     'data-sizetoheader="true"></div>' : "";
        var html = isTh ? '<th><div class="header">' + colGrab +
                            '<div class="text cell">'
                            : '<td class="cell">';

        var dataLen = data.length;
        var i = 0;

        if (hasDelimiter) {
            // when has deliliter
            while (i < dataLen) {
                var d = data[i];
                var isDelimiter = false;

                if (!hasBackSlash && !hasQuote && d === dels[0]) {
                    isDelimiter = true;

                    for (var j = 1; j < delLen; j++) {
                        if (i + j >= dataLen || data[i + j] !== dels[j]) {
                            isDelimiter = false;
                            break;
                        }
                    }
                }

                if (isDelimiter) {
                    // skip delimiter
                    if (isTh) {
                        html += '</div></div></th>' +
                                '<th>' +
                                    '<div class="header">' +
                                        colGrab +
                                        '<div class="text">';
                    } else {
                        html += '</td><td>';
                    }

                    i = i + delLen;
                } else {
                    if (hasBackSlash) {
                        // when previous char is \. espace this one
                        hasBackSlash = false;
                    } else if (d === '\\') {
                        hasBackSlash = true;
                    } else if (d === '"') {
                        // toggle escape of quote
                        hasQuote = !hasQuote;
                    }

                    html += d;
                    ++i;
                }
            }
        } else {
            // when not apply delimiter
            for (i = 0; i < dataLen; i++) {
                d = data[i];

                var cellClass = "td";
                if (d === "\t") {
                    cellClass += " has-margin has-tab";
                } else if (d === ",") {
                    cellClass += " has-margin has-comma";
                } else if (d === "|") {
                    cellClass += " has-pipe";
                }
                html += '<span class="' + cellClass + '">' + d + '</span>';
            }
        }

        if (isTh) {
            html += '</div></div></th>';
        } else {
            html += '</td>';
        }

        return (html);
    }

    function toggleSuggest(showSuggest, clear) {
        var $suggSection = $("#previewSugg");
        var $btn = $("#previewSuggBtn");
        var $previewWrap = $("#dsPreviewWrap");

        if (clear) {
            $suggSection.addClass("hidden");
            $btn.text("Show Suggestion");
            $previewWrap.removeClass("has-suggest");
            return;
        }

        if (showSuggest) {
            $suggSection.removeClass("hidden");
            $btn.text("Hide Suggestions");
            $previewWrap.addClass("has-suggest");
        } else {
            $suggSection.addClass("hidden");
            $btn.text("Show Suggestions");
            $previewWrap.removeClass("has-suggest");
        }
    }

    function suggestHelper() {
        var $suggSection = $("#previewSugg");
        var $content = $suggSection.find(".content");
        var html = "";

        if (delimiter === "") {
            if (highlighter === "") {
                var $cells = $previewTable.find("tbody tr:first-child .td");
                if ($cells.length === 1 && $cells.text() === "[") {
                    html = '<span class="action active jsonLoad">' +
                                'Load as json dataset' +
                            '</span>';
                    $content.html(html);
                    return;
                }
                // case to choose a highlighter
                var commaLen = $previewTable.find(".has-comma").length;
                var tabLen   = $previewTable.find(".has-tab").length;
                var commaHtml =
                    '<span class="action active commaDelim">' +
                        'Apply comma as delimiter' +
                    '</span>';
                var tabHtml =
                    '<span class="action active tabDelim">' +
                        'Apply tab as delimiter' +
                    '</span>';

                if (commaLen > 0 && tabLen > 0) {
                    if (commaLen >= tabLen) {
                        html = commaHtml + tabHtml;
                    } else {
                        html = tabHtml + commaHtml;
                    }
                } else {
                    // one of comma and tab or both are 0
                    if (commaLen > 0) {
                        html = commaHtml;
                    } else if (tabLen > 0) {
                        html = tabHtml;
                    } else {
                        // both comma and tab are zero
                        if ($previewTable.find(".has-pipe").length >= 20) {
                            // at least each row has pipe
                            html =
                                '<span class="action active pipeDelim">' +
                                    'Apply pipe as delimiter' +
                                '</span>';
                        }
                    }
                }

                if (html === "") {
                    // select char
                    html =
                        '<span class="action">' +
                            'Highlight a character as delimiter' +
                        '</span>';
                } else {
                    // select another char
                    html +=
                        '<span class="action">' +
                            'Highlight another character as delimiter' +
                        '</span>';
                }
            } else {
                // case to remove or apply highlighter
                html =
                    '<span class="action active apply-highlight">' +
                        'Apply hightlighted character as delimiter' +
                    '</span>' +
                    '<span class="action active rm-highlight">' +
                        'Remove Highlights' +
                    '</span>';
            }
        } else {
            var shouldPromote = headerPromoteDetect();
            // case to apply/replay delimiter promote/unpromote header
            if (hasHeader) {
                if (!shouldPromote) {
                    html +=
                        '<span class="action active promote">' +
                            'Undo promote header' +
                        '</span>';
                }
            } else {
                if (shouldPromote) {
                    html +=
                        '<span class="action active promote">' +
                            'Promote first row as header' +
                        '</span>';
                }
            }

            html +=
                '<span class="action active apply-all">' +
                    'Apply changes & Exit preview' +
                '</span>';

            html +=
                '<span class="action active rm-highlight">' +
                    'Remove Delimiter' +
                '</span>';
        }

        $content.html(html);
    }

    function headerPromoteDetect() {
        if (delimiter === "") {
            // has not specified delimiter
            // not recommend to promote
            return false;
        }

        var col;
        var row;
        var $trs = $previewTable.find("tbody tr");
        var rowLen = $trs.length;
        var headers = [];
        var text;
        var $headers = hasHeader ? $previewTable.find("thead tr .header") :
                                    $trs.eq(0).children();
        var colLen = $headers.length;
        var score = 0;

        for (col = 1; col < colLen; col++) {
            text = hasHeader ? $headers.eq(col).find(".text").text() :
                                $headers.eq(col).text();
            if ($.isNumeric(text)) {
                // if row has number
                // should not be header
                return false;
            } else if (text === "" || text == null) {
                // ds may have case to have empty header
                score -= 100;

            }

            headers[col] = text;
        }

        var tds = [];
        var rowStart = hasHeader ? 0 : 1;

        for (row = rowStart; row < rowLen; row++) {
            tds[row] = [];
            $tds = $trs.eq(row).children();
            for (col = 1; col < colLen; col++) {
                tds[row][col] = $tds.eq(col).text();
            }
        }

        for (col = 1; col < colLen; col++) {
            text = headers[col];
            var textLen = text.length;

            for (row = rowStart; row < rowLen; row++) {
                var tdText = tds[row][col];
                if ($.isNumeric(tdText)) {
                    // header is string and td is number
                    // valid this td
                    score += 30;
                } else if (tdText === "" || tdText == null) {
                    // td is null but header is not
                    score += 10;
                } else {
                    // the diff btw header and td is bigger, better
                    var diff = Math.abs(textLen - tdText.length);
                    if (diff === 0 && text === tdText) {
                        score -= 20;
                    } else {
                        score += diff;
                    }
                }
            }
        }

        if (rowLen === 0 || score / rowLen < 20) {
            return false;
        } else {
            return true;
        }
    }

    return (DataPreview);
}(jQuery, {}));

/*
 * Module for data sample table
 */
window.DataSampleTable = (function($, DataSampleTable) {
    var $tableWrap = $("#dataSetTableWrap");
    var currentRow = 0;
    var totalRows = 0;
    var previousColSelected; // used for shift clicking columns

    DataSampleTable.setup = function() {
        setupSampleTable();
    };

    DataSampleTable.show = function(dsId, isLoading) {
        var deferred = jQuery.Deferred();

        var dsObj = DS.getDSObj(dsId);
        var datasetName = dsObj.name;

        // only show select all and clear all option when table can be disablyed
        var $dsColsBtn = $("#dsColsBtn");

        // // update date part of the table info first to make UI smooth
        var partialUpdate = true;
        updateTableInfo(dsObj, partialUpdate, isLoading);

        if (isLoading) {
            var animatedDots =
                '<div class="animatedEllipsis">' +
                  '<div>.</div>' +
                  '<div>.</div>' +
                  '<div>.</div>' +
                '</div>';
            var loadingMsg =
                '<div class="loadingMsg">' +
                        'Data set is loading' + animatedDots +
                '</div>';
            $tableWrap.html(loadingMsg);
            $tableWrap.parent().addClass('loading');
            $dsColsBtn.hide();
            deferred.resolve();

            return (deferred.promise());
        }

        // XcalarSample sets gDatasetBrowserResultSetId
        XcalarSample(datasetName, 40)
        .then(function(result, totalEntries) {
            if (!result) {
                $dsColsBtn.hide();
                deferred.reject({"error": "Cannot parse the dataset."});
                return (deferred.promise());
            }
            var kvPairs    = result.kvPair;
            var numKvPairs = result.numKvPairs;
            // update info here
            dsObj.attrs.numEntries = totalEntries;
            updateTableInfo(dsObj);

            var value;
            var json;
            var uniqueJsonKey = {}; // store unique Json key
            var jsonKeys = [];
            var jsons = [];  // store all jsons

            try {
                for (var i = 0; i < numKvPairs; i++) {
                    value = kvPairs[i].value;
                    json = $.parseJSON(value);
                    // XXX Cheng this is based on the assumption no other
                    // fields called recordNum, if more than one recordNum in
                    // json, only one recordNum will be in the parsed obj,
                    // which is incorrect behavior
                    delete json.recordNum;
                    jsons.push(json);
                    // get unique keys
                    for (var key in json) {
                        uniqueJsonKey[key] = "";
                    }
                }

                for (var uniquekey in uniqueJsonKey) {
                    jsonKeys.push(uniquekey);
                }

                getSampleTable(datasetName, jsonKeys, jsons);
                $dsColsBtn.show();
                deferred.resolve();
            } catch(err) {
                console.error(err, value);
                // XXX still show the table?
                getSampleTable(datasetName);
                $dsColsBtn.show();
                deferred.reject({"error": "Cannot parse the dataset."});
            }
        })
        .fail(function(error) {
            $dsColsBtn.hide();
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    DataSampleTable.clear = function() {
        $tableWrap.html("");
    };

    function getSampleTable(dsName, jsonKeys, jsons) {
        var html = getSampleTableHTML(dsName, jsonKeys, jsons);
        $tableWrap.parent().removeClass('loading');
        $tableWrap.html(html);
        restoreSelectedColumns();
        DataSampleTable.sizeTableWrapper();
        var $worksheetTable = $('#worksheetTable');
        moveFirstColumn($worksheetTable);

        // scroll cannot use event bubble
        $("#dataSetTableWrap .datasetTbodyWrap").scroll(function() {
            dataStoreTableScroll($(this));
        });
    }

    DataSampleTable.sizeTableWrapper = function() {
        var $worksheetTable = $('#worksheetTable');

        // size tableWrapper so borders fit table size
        var tableHeight = $worksheetTable.height();
        var scrollBarPadding = 0;
        $tableWrap.width($worksheetTable.width());
        if ($worksheetTable.width() > $('#datasetWrap').width()) {
            scrollBarPadding = 10;
        }
        $('#datasetWrap').height(tableHeight + scrollBarPadding);
    };

    function updateTableInfo(dsObj, partial, isLoading) {
        var dsName = dsObj.name;
        var format = dsObj.attrs.format;
        var path = dsObj.attrs.path || 'N/A';
        var numEntries = dsObj.attrs.numEntries || 'N/A';

        $("#dsInfo-title").text(dsName);
        // XXX these info should be changed after better backend support
        $("#dsInfo-author").text(WKBKManager.getUser());
        $("#dsInfo-createDate").text(xcHelper.getDate());
        $("#dsInfo-updateDate").text(xcHelper.getDate());

        // file size is special size it needs to be calculated
        DS.getFileSize(dsObj)
        .then(function(fileSize) {
            $("#dsInfo-size").text(fileSize);
        });

        if (typeof numEntries === "number") {
            numEntries = Number(numEntries).toLocaleString('en');
        }

        // If we are preloading the data, we want to show N/A until it is done
        if (partial && numEntries === "N/A") {
            if (isLoading) {
                $("#dsInfo-records").text(numEntries);
            }
        } else {
            $("#dsInfo-records").text(numEntries);
        }

        if (path !== "N/A" || !partial) {
            $("#dsInfo-path").text(path);
        }
        
        if (format) {
            $("#schema-format").text(format);
        }
        totalRows = parseInt($('#dsInfo-records').text().replace(/\,/g, ""));
    }

    function dataStoreTableScroll($tableWrapper) {
        var numRowsToFetch = 20;
        if (currentRow + 20 >= totalRows) {
            return;
        }
        if ($tableWrapper[0].scrollHeight - $tableWrapper.scrollTop() -
                   $tableWrapper.outerHeight() <= 1) {
            if (currentRow === 0) {
                currentRow += 40;
            } else {
                currentRow += numRowsToFetch;
            }
            XcalarSetAbsolute(gDatasetBrowserResultSetId, currentRow)
            .then(function() {
                return (XcalarGetNextPage(gDatasetBrowserResultSetId,
                        numRowsToFetch));
            })
            .then(function(result) {
                var kvPairs    = result.kvPair;
                var numKvPairs = result.numKvPairs;

                var value;
                var json;
                var uniqueJsonKey = {}; // store unique Json key
                var jsonKeys = [];
                var jsons = [];  // store all jsons

                try {
                    for (var i = 0; i < numKvPairs; i++) {
                        value = kvPairs[i].value;
                        json = jQuery.parseJSON(value);
                        jsons.push(json);
                        // get unique keys
                        for (var key in json) {
                            uniqueJsonKey[key] = true;
                        }
                    }

                    for (var uniquekey in uniqueJsonKey) {
                        jsonKeys.push(uniquekey);
                    }

                    var selectedCols = {};

                    $('#worksheetTable').find('th.selectedCol').each(
                        function() {
                            selectedCols[$(this).index()] = true;
                        }
                    );

                    var tr = getTableRowsHTML(jsonKeys, jsons, false,
                                              selectedCols);
                    $('#worksheetTable').append(tr);
                    moveFirstColumn($('#worksheetTable'));

                } catch(err) {
                    console.error(err, value);
                }
            });
        }   
    }

    // event set up for the module
    function setupSampleTable() {
        // select all columns
        $("#selectDSCols").click(function() {
            var inputs = [];
            var dsName = $("#worksheetTable").data("dsname");

            $("#worksheetTable .editableHead").each(function() {
                var $input = $(this);
                if (!$input.closest(".header").hasClass("colAdded")) {
                    inputs.push($input);
                    highlightColumn($input);
                }
            });
            DataCart.addItem(dsName, inputs);
        });

        // clear all columns
        $("#clearDsCols").click(function() {
            var $table = $("#worksheetTable");
            var dsName = $table.data("dsname");
            $table.find(".colAdded").removeClass("colAdded");
            $table.find(".selectedCol").removeClass("selectedCol");
            DataCart.removeCart(dsName);
        });

        // click to select a column
        $tableWrap.on("click", ".header > .flexContainer", function(event) {
            var $input = $(this).find('.editableHead');
            var $table = $("#worksheetTable");

            if (event.shiftKey && previousColSelected) {

                var startIndex = previousColSelected.closest("th").index();
                // var highlight = gLastClickTarget.closest("th")
                //                 .hasClass('selectedCol');
                var isHighlighted = $input.closest('th')
                                          .hasClass('selectedCol');

                var endIndex = $input.closest('th').index();
                if (startIndex > endIndex) {
                    var temp = endIndex;
                    endIndex = startIndex;
                    startIndex = temp;
                }

                var $ths = $table.find('th');
                for (var i = startIndex; i <= endIndex; i++) {
                    var $th = $ths.eq(i);
                    if (isHighlighted === $th.hasClass('selectedCol')) {
                        selectColumn($th.find(".editableHead"),
                                            SelectUnit.Single);
                    }
                }
            } else {
                selectColumn($input, SelectUnit.Single);
            }
            previousColSelected = $input.closest('th');
            setTimeout(function() { // delay check for shadow due to animation
                DataCart.overflowShadow();
            }, 105);
        });

        // resize column
        $tableWrap.on("mousedown", ".colGrab", function(event) {
            if (event.which !== 1) {
                return;
            }
            gRescolMouseDown($(this), event, {target: "datastore"});
            dblClickResize($(this), {minWidth: 25, target: "datastore"});
        });
        $('#datasetWrap').scroll(function(){
            var $worksheetTable = $('#worksheetTable');
            $(this).scrollTop(0);
            moveFirstColumn($worksheetTable);
            
            if ($(this).scrollLeft() === 0) {
                $worksheetTable.find('.rowNumHead .header')
                               .css('margin-left', 0);
                $worksheetTable.find('.idSpan')
                               .css('margin-left', -5);
            } else {
                $worksheetTable.find('.rowNumHead .header')
                               .css('margin-left', 1);
                $worksheetTable.find('.idSpan')
                               .css('margin-left', -4);
            }
        });
    }

    // select a column
    function selectColumn($input, selectAll) {
        var dsName  = $("#worksheetTable").data("dsname");
        // var $cart   = $("#selectedTable-" + dsName);
        var $header = $input.closest(".header");
        // unselect the column
        if ($header.hasClass("colAdded") && !selectAll) {
            highlightColumn($input, IsActive.Active);
            DataCart.removeItem(dsName, $input);
        } else {
            highlightColumn($input);
            DataCart.addItem(dsName, $input);
        }
    }

    // re-selecte columns that are in data carts
    function restoreSelectedColumns() {
        var $table = $("#worksheetTable");
        var dsName = $table.data("dsname");

        $("#selectedTable-" + dsName).find("li").each(function() {
            var colNum = $(this).data("colnum");
            var $input = $table.find(".editableHead.col" + colNum);
            highlightColumn($input);
        });
        previousColSelected = null;
    }
    // hightligt column
    function highlightColumn($input, active) {
        var colNum  = xcHelper.parseColNum($input);
        var $table  = $input.closest(".datasetTable");
        var $header = $input.closest(".header");

        if (active) {
            $header.removeClass("colAdded");
            $table.find(".col" + colNum).removeClass("selectedCol");
        } else {
            $header.addClass("colAdded");
            $table.find(".col" + colNum).addClass("selectedCol");
        }
    }

    // sample table html
    function getSampleTableHTML(dsName, jsonKeys, jsons) {
        // validation check
        if (!dsName || !jsonKeys || !jsons) {
            return "";
        }

        var tr = "";
        var th = "";

        var columnsType = [];  // track column type
        var numKeys = jsonKeys.length;
        numKeys = Math.min(1000, numKeys); // limit to 1000 ths

        currentRow = 0;

        jsonKeys.forEach(function() {
            columnsType.push(undefined);
        });

        // table rows
        tr = getTableRowsHTML(jsonKeys, jsons, columnsType);
        if (numKeys > 0) {
            th += '<th class="rowNumHead"><div class="header">' +
                  '</div></th>';
        }
        // table header
        for (var i = 0; i < numKeys; i++) {
            var key     = jsonKeys[i];
            var thClass = "th col" + (i + 1);
            var type    = columnsType[i];
            th +=
                '<th title=\'' + key + '\' class="' + thClass + '">' +
                    '<div class="header type-' + type + '" ' +
                         'data-type=' + type + '>' +
                        '<div class="colGrab" ' +
                            'title="Double click to <br />auto resize" ' +
                            'data-toggle="tooltip" ' +
                            'data-container="body" ' +
                            'data-placement="left" ' +
                            'data-sizetoheader="true">' +
                        '</div>' +
                        '<div class="flexContainer flexRow">' +
                            '<div class="flexWrap flex-left" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="top" ' +
                                'data-container="body" ' +
                                'title="' + type + '">' +
                                '<span class="iconHidden"></span>' +
                                '<span class="type icon"></span>' +
                            '</div>' +
                            '<div class="flexWrap flex-mid">' +
                                '<input spellcheck="false"' +
                                    'class="editableHead shoppingCartCol ' +
                                    thClass + '" value=\'' + key + '\' ' +
                                    'readonly="true">' +
                            '</div>' +
                            '<div class="flexWrap flex-right">' +
                                '<span class="tick icon"></span>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</th>';
        }

        var html =
            '<div class="datasetTbodyWrap">' +
                '<table id="worksheetTable" class="datasetTable dataTable" ' +
                        'data-dsname="' + dsName + '">' +
                    '<thead>' +
                        '<tr>' + th + '</tr>' +
                    '</thead>' +
                    '<tbody>' + tr + '</tbody>' +
                '</table>' +
            '</div>';

        return (html);
    }

    function getTableRowsHTML(jsonKeys, jsons, columnsType, selectedCols) {
        var tr = "";
        var i  = 0;

        jsons.forEach(function(json) {
            tr += '<tr>';
            tr += '<td class="lineMarker"><div class="idSpan">' +
                    (currentRow + i + 1) + '</div></td>';
            // loop through each td, parse object, and add to table cell
            var numKeys = jsonKeys.length;
            numKeys = Math.min(1000, numKeys); // limit to 1000 ths
            for (var j = 0; j < numKeys; j++) {
                var key = jsonKeys[j];
                var val = json[key];
                // Check type
                columnsType[j] = xcHelper.parseColType(val, columnsType[j]);

                var selected  = "";
                var parsedVal = (val == null) ?
                                    "" : xcHelper.parseJsonValue(val);

                if (selectedCols && selectedCols[j + 1]) {
                    selected = " selectedCol";
                }

                tr += '<td class="col' + (j + 1) + selected + '">' +
                        '<div class="addedBarTextWrap">' +
                            '<div class="addedBarText">' +
                                parsedVal +
                            '</div>' +
                        '</div>' +
                      '</td>';
            }

            tr += '</tr>';
            i++;
        });

        return (tr);
    }

    return (DataSampleTable);
}(jQuery, {}));

/*
 * Module for mamgement of dsObj
 */
window.DS = (function ($, DS) {
    var homeDirId = 0;  // home folder id, constant

    var curDirId;       // current folder id
    var dsObjId;        // counter
    var dsLookUpTable;  // find DSObj by dsId
    var homeFolder;
    // for DS drag n drop
    var $dragDS;
    var $dropTarget;
    var $explorePanel = $('#exploreView');

    // Get dsObj by dsId
    DS.getDSObj = function(dsId) {
        return (dsLookUpTable[dsId]);
    };

    // Get grid element(folder/datasets) by dsId
    DS.getGrid = function(dsId) {
        if (dsId === homeDirId) {
            return ($explorePanel.find(".gridItems"));
        } else {
            return ($explorePanel.find('.grid-unit[data-dsId="' + dsId + '"]'));
        }
    };

    // Get datasets element by dsName
    DS.getGridByName = function(dsName) {
        if (!dsName) {
            return (null);
        }

        var $ds = $("#dataset-" + dsName);
        if ($ds.length > 0) {
            return ($("#dataset-" + dsName));
        } else {
            return (null);
        }
    };

    // create a new folder
    DS.newFolder = function() {
        var ds = DS.create({
            "name"    : "New Folder",
            "isFolder": true
        });

        SQL.add("Create folder", {
            "operation": SQLOps.CreateFolder,
            "dsName"   : ds.name,
            "dsId"     : ds.id
        });

        // forcus on folder's label for renaming
        DS.getGrid(ds.id).click()
                    .find('.label').focus();
    };

    // Create dsObj for new dataset/folder
    DS.create = function(options) {
        options = options || {};
        // validation check
        xcHelper.assert((options.name != null), "Invalid Parameters");

        var id       = options.id || (dsObjId++);
        var name     = options.name.trim();
        var parentId = options.parentId || curDirId;
        var isFolder = options.isFolder ? true : false;
        var attrs    = options.attrs || {};

        var parent  = DS.getDSObj(parentId);
        var $parent = DS.getGrid(parentId);

        // XXX the way to rename could be imporved
        var i = 1;
        var validName = name;
        // only check folder name as ds name cannot confilct
        while (isFolder && parent.checkNameConflict(id, validName, isFolder)) {
            validName = name + ' (' + i + ')';
            ++i;
        }

        var ds = new DSObj(id, validName, parentId, isFolder, attrs);

        $parent.append(getDSHTML(ds));
        
        dsLookUpTable[ds.id] = ds;  // cached in lookup table

        return (ds);
    };

    // refresh a new dataset and add it to grid view
    DS.addDS = function(name, format, path) {
        DS.create({
            "name"    : name,
            "isFolder": false,
            "attrs"   : {
                "format": format,
                "path"  : path
            }
        });

        DS.refresh();

        SQL.add("Add dataset", {
            "operation": SQLOps.AddDS,
            "name"     : name,
            "format"   : format,
            "path"     : path
        });
    };

    // Load dataset
    // promise returns $grid element
    DS.load = function (dsName, dsFormat, loadURL, fieldDelim, lineDelim,
                        hasHeader, moduleName, funcName) {
        var deferred = jQuery.Deferred();

        // console.log(dsName, dsFormat, loadURL,
        //             fieldDelim, lineDelim,
        //             moduleName, funcName);

        // Here null means the attr is a placeholder, will
        // be update when the sample table is loaded
        DS.create({
            "name"    : dsName,
            "isFolder": false,
            "attrs"   : {
                "format"    : dsFormat,
                "path"      : loadURL,
                "fileSize"  : null,
                "numEntries": null
            }
        });

        var $grid = DS.getGridByName(dsName);
        $grid.addClass('display inactive');
        $grid.append('<div class="waitingIcon"></div>');
        $grid.find('.waitingIcon').fadeIn(200);
        $grid.click();
        $('#datasetWrap').addClass("inactive");
        
        var sqlOptions = {
            "operation" : SQLOps.DSLoad,
            "loadURL"   : loadURL,
            "dsName"    : dsName,
            "dsFormat"  : dsFormat,
            "hasHeader" : hasHeader,
            "fieldDelim": fieldDelim,
            "lineDelim" : lineDelim,
            "moduleName": moduleName,
            "funcName"  : funcName
        };

        XcalarLoad(loadURL, dsFormat, dsName,
                   fieldDelim, lineDelim, hasHeader,
                   moduleName, funcName, sqlOptions)
        .then(function() {
            // sample the dataset to see if it can be parsed
            return (XcalarSample(dsName, 1));
        })
        .then(function(result) {
            if (!result) {
                // if dataset cannot be parsed produce a load fail
                var msg = {
                    "error"    : 'Cannot parse data set "' + dsName + '".',
                    "dsCreated": true
                };
                return (jQuery.Deferred().reject(msg));
            } else {
                $grid.removeClass('inactive')
                     .find('.waitingIcon').remove();
            }

            // display new dataset
            $('#datasetWrap').removeClass('inactive');
            DS.refresh();
            if ($grid.hasClass('active')) {
                if (gMinModeOn) {
                    $grid.click();
                } else {
                    $('#dataSetTableWrap').fadeOut(200, function() {
                        $grid.click();
                        $(this).fadeIn();
                    });
                }
            }

            commitToStorage();
            deferred.resolve($grid);
        })
        .fail(function(error) {
            rmDSHelper($grid);
            $('#datasetWrap').removeClass('inactive');
            if ($('#dsInfo-title').text() === dsName) {
                // if loading page is showing, remove and go to import form
                $("#importDataView").show();
                $explorePanel.find(".contentViewMid").addClass('hidden');
                $explorePanel.find(".gridItems").find(".active")
                                               .removeClass("active");
                $("#dataSetTableWrap").empty();
            }
            if (error.dsCreated) {
                // if a data set was loaded but cannot be parsed, destroy it
                XcalarSetFree(gDatasetBrowserResultSetId)
                .then(function() {
                    gDatasetBrowserResultSetId = 0;
                    return (XcalarDestroyDataset(dsName, {
                        "operation": "destroyDataSet",
                        "dsName"   : dsName,
                        "sqlType"  : SQLType.Fail
                    }));
                })
                .fail(function(deferredError) {
                    Alert.error("Delete Dataset Fails", deferredError);
                });
            }
            
            deferred.reject(error);
        })
        .always(function() {
            DataStore.updateInfo();
        });

        return (deferred.promise());
    };

    // Get home folder
    DS.getHomeDir = function () {
        return (homeFolder);
    };

    // Restore dsObj
    DS.restore = function(oldHomeFolder, datasets, atStartUp) {
        var numDatasets = datasets.numDatasets;
        var totolDS = 0;
        var searchHash = {};

        DS.clear();

        // put all datasets' name into searchHash for lookup
        for (var i = 0; i < numDatasets; i++) {
            var dsName = datasets.datasets[i].name;

            if (dsName.endsWith(".preview")) {
                // deal with preview datasets
                if (atStartUp) {
                    // preview ds is deleted on start up time!!
                    var sqlOptions = {
                        "operation": SQLOps.DestroyPreviewDS,
                        "dsName"   : dsName
                    };
                    XcalarDestroyDataset(dsName, sqlOptions);
                }
                continue;
            }

            ++totolDS;
            searchHash[dsName] = datasets.datasets[i];
        }

        var cache;

        if ($.isEmptyObject(oldHomeFolder)) {
            cache = [];
        } else {
            cache = oldHomeFolder.eles;
        }

        // restore the ds and folder
        var ds;
        var format;
        var orphanedDS = [];

        while (cache.length > 0) {
            var obj = cache.shift();
            if (obj.isFolder) {
                // restore a folder
                DS.create(obj);
            } else {
                if (searchHash.hasOwnProperty(obj.name)) {
                    // restore a ds
                    ds = searchHash[obj.name];
                    format = DfFormatTypeTStr[ds.formatType].toUpperCase();

                    obj.attrs = $.extend(obj.attrs, {
                        "format": format,
                        "path"  : ds.url
                    });

                    DS.create(obj);
                    // mark the ds to be used
                    delete searchHash[obj.name];
                } else {
                    // some ds is deleted by other users
                    // restore it first and then delete(for Replay, need the sql)
                    ds = DS.create(obj);
                    orphanedDS.push(ds);
                    delete searchHash[obj.name];
                }
            }

            if (obj.eles != null) {
                $.merge(cache, obj.eles);
            }
            // update id count
            dsObjId = Math.max(dsObjId, obj.id + 1);
        }

        // add ds that is not in oldHomeFolder
        for (dsName in searchHash) {
            ds = searchHash[dsName];
            if (ds != null) {
                format = DfFormatTypeTStr[ds.formatType].toUpperCase();
                DS.addDS(ds.name, format, ds.url);
            }
        }

        // delete ds that is orphaned
        var isOrphaned = true;
        var $grid;
        for (var i = 0, len = orphanedDS.length; i < len; i++) {
            dsName = orphanedDS[i].name;
            $grid = DS.getGridByName(dsName);
            DS.remove($grid, isOrphaned);
        }

        // UI update
        DS.refresh();
        DataStore.updateInfo(totolDS);

        if (atStartUp) {
            // restore list view if saved
            var settings = UserSettings.getSettings();
            GridView.toggle(settings.datasetListView);
        } else {
            // if user trigger the restore, save!
            commitToStorage();
        }
    };

    // Rename dsObj
    DS.rename = function(dsId, newName) {
        // now only for folders (later also rename datasets?)
        var ds      = DS.getDSObj(dsId);
        var $label  = DS.getGrid(dsId).find("> .label");
        var oldName = ds.name;

        if (newName === oldName) {
            return;
        } else {
            ds = ds.rename(newName);

            if (ds.name === newName) {
                // valid rename
                SQL.add("Rename Folder", {
                    "operation": SQLOps.DSRename,
                    "dsId"     : dsId,
                    "oldName"  : oldName,
                    "newName"  : ds.name
                });

                $label.text(ds.name);
                commitToStorage();
            } else {
                $label.text(oldName);
            }
        }
    };

    // Check if the ds's name already exists
    DS.has = function(dsName) {
        // now only check dataset name conflict
        if (DS.getGridByName(dsName) != null) {
            return true;
        } else {
            return false;
        }
    };

    // Remove dataset/folder
    DS.remove = function($grid, isOrphaned) {
        if ($grid == null || $grid.length === 0) {
            return;
        }

        var ds = DS.getDSObj($grid.data("dsid"));

        if ($grid.hasClass("ds")) {
            if (isOrphaned) {
                rmDSHelper($grid);

                SQL.add("Delete Dataset", {
                    "operation" : SQLOps.DestroyDS,
                    "dsName"    : ds.name,
                    "isOrphaned": true
                });
                return;
            }
            // delete a ds
            var dsName = $grid.attr("id").split("dataset-")[1];
            var msg    = "Are you sure you want to delete dataset " +
                          dsName + "?";
            // add alert
            Alert.show({
                "title"     : "DELETE DATASET",
                "msg"       : msg,
                "isCheckBox": true,
                "confirm"   : function () {
                    delDSHelper($grid, dsName);
                }
            });
        } else if (rmDSHelper($grid) === true) {
            SQL.add("Delete Folder", {
                "operation": SQLOps.DelFolder,
                "dsName"   : ds.name,
                "dsId"     : ds.id
            });
        }
    };

    // Change dir to parent folder
    DS.upDir = function() {
        var parentId = DS.getDSObj(curDirId).parentId;
        DS.goToDir(parentId);
    };

    // Change dir to another folder
    DS.goToDir = function(folderId) {
        curDirId = folderId;

        if (curDirId === homeDirId) {
            $('#backFolderBtn').addClass("disabled");
        } else {
            $('#backFolderBtn').removeClass('disabled');
        }

        DS.refresh();

        SQL.add("Go to folder", {
            "operation" : SQLOps.DSToDir,
            "folderId"  : folderId,
            "folderName": DS.getDSObj(folderId).name
        });
    };

    // Refresh dataset/folder display in gridView area
    DS.refresh = function() {
        $explorePanel.find(".gridItems .grid-unit").removeClass("display")
                                                  .addClass("hidden");
        $explorePanel.find('.gridItems .grid-unit[data-dsParentId="' +
                            curDirId + '"]')
            .removeClass("hidden").addClass("display");
    };

    // Clear dataset/folder in gridView area
    DS.clear = function() {
        $explorePanel.find(".gridItems .grid-unit").remove();
        dsSetupHelper();
    };


    /* Drag and Drop API */

    // Get current dataset/folder in drag
    DS.getDragDS = function() {
        return ($dragDS);
    };

    // Set current dataset/folder in drag
    DS.setDragDS = function($ds) {
        $dragDS = $ds;
    };

    // Reset drag dataset/folder
    DS.resetDragDS = function() {
        $dragDS = undefined;
    };

    // Get drop target
    DS.getDropTarget = function() {
        return ($dropTarget);
    };

    // Set drap target
    DS.setDropTraget = function($target) {
        $dropTarget = $target;
    };

    // Reset drop target
    DS.resetDropTarget = function() {
        $dropTarget = undefined;
    };

    /* End of Drag and Drop API */

    // Get file size, if not exist, fetch from backend and update it
    DS.getFileSize = function(ds) {
        var deferred = jQuery.Deferred();

        if (ds.attrs.fileSize != null) {
            deferred.resolve(ds.attrs.fileSize);
            return (deferred.promise());
        }

        var loadURL = ds.attrs.path;

        var slashIndex = loadURL.lastIndexOf('/');
        var dotIndex   = loadURL.lastIndexOf('.');
        var fileName   = null;

        if (dotIndex > slashIndex) {
            fileName = loadURL.substr(slashIndex + 1);
            loadURL = loadURL.substr(0, slashIndex + 1);
        }

        XcalarListFiles(loadURL)
        .then(function(files) {
            ds.attrs.fileSize = getFileSizeHelper(files, fileName);
            deferred.resolve(ds.attrs.fileSize);
        })
        .fail(function(error) {
            console.error("List file fails", error);
            ds.attrs.fileSize = null;
            deferred.resolve(null);
        });

        return (deferred.promise());
    };

    function getFileSizeHelper(files, fileName) {
        var size = 'N/A';
        var numFiles = 0;
        var isSingleFile = (fileName != null);
        var fileLists = files.files;

        for (var i = 0, len = files.numFiles; i < len; i++) {
            var file = fileLists[i];
            if (!file.attr.isDirectory) {
                numFiles++;
                if (numFiles > 1 && !isSingleFile) {
                    size = 'N/A';
                    break;
                } else {
                    size = xcHelper.sizeTranslater(file.attr.size);
                    if (isSingleFile && fileName === file.name) {
                        break;
                    }
                }
            }
        }

        return (size);
    }


    // Helper function for setup
    function dsSetupHelper() {
        curDirId = homeDirId;
        dsObjId = 0;
        dsLookUpTable = {};

        homeFolder = new DSObj(dsObjId++, ".", -1, true);
        dsLookUpTable[homeFolder.id] = homeFolder;
    }

    // Helper function for DS.remove()
    function delDSHelper($grid, dsName) {
        $grid.removeClass("active");
        $grid.addClass("inactive");
        $grid.append('<div class="waitingIcon"></div>');

        $grid.find(".waitingIcon").fadeIn(200);

        var sqlOptions = {
            "operation": SQLOps.DestroyDS,
            "dsName"   : dsName
        };

        XcalarSetFree(gDatasetBrowserResultSetId)
        .then(function() {
            gDatasetBrowserResultSetId = 0;
            return (XcalarDestroyDataset(dsName, sqlOptions));
        })
        .then(function() {
            //clear data cart
            $("#selectedTable-" + dsName).remove();
            // clear data table
            $("#dataSetTableWrap").empty();
            // remove ds obj
            rmDSHelper($grid);

            DataStore.updateInfo();
            focusOnFirstDS();
            commitToStorage();
        })
        .fail(function(error) {
            $grid.find('.waitingIcon').remove();
            $grid.removeClass("inactive");
            Alert.error("Delete Dataset Fails", error);
        });
    }

    // Helper function to remove ds
    function rmDSHelper($grid) {
        var dsId = $grid.data("dsid");
        var ds   = DS.getDSObj(dsId);

        if (ds.isFolder && ds.eles.length > 0) {
            var instr = "Please remove all the datasets in the folder first.";
            var msg  =
                "Unable to delete non-empty folders. Please ensure\r\n" +
                " that all datasets have been removed from folders prior" +
                " to deletion.";
            // add alert
            Alert.show({
                "title"     : "DELETE FOLDER",
                "instr"     : instr,
                "msg"       : msg,
                "isCheckBox": true,
                "isAlert"   : true
            });

            return false;
        } else {
            ds.removeFromParent();
            // delete ds
            delete dsLookUpTable[ds.id];
            $grid.remove();

            return true;
        }
    }

    // Focus on the first dataset in the folder
    function focusOnFirstDS() {
        var $curFolder = DS.getGrid(curDirId);
        var $datasets = $curFolder.find("> .grid-unit.ds");

        if ($datasets.length > 0) {
            $datasets.eq(0).click();
        } else {
            $("#importDataButton").click();
        }
    }

    // Helper function to update totalChildren of all ancestors
    function updateDSCount(dsObj, isMinus) {
        var parentObj = DS.getDSObj(dsObj.parentId);

        while (parentObj != null) {
            if (isMinus) {
                parentObj.totalChildren -= dsObj.totalChildren;
            } else {
                parentObj.totalChildren += dsObj.totalChildren;
            }
            DS.getGrid(parentObj.id).find("> div.dsCount")
                                    .text(parentObj.totalChildren);
            parentObj = DS.getDSObj(parentObj.parentId);
        }
    }

    // Helper function for DS.create()
    function getDSHTML(dsObj) {
        var id = dsObj.id;
        var parentId = dsObj.parentId;
        var name = dsObj.name;
        var isFolder = dsObj.isFolder;
        var html;

        if (isFolder) {
            html =
            '<div class="folder display collapse grid-unit" draggable="true"' +
                ' ondragstart="dsDragStart(event)"' +
                ' ondragend="dsDragEnd(event)"' +
                ' data-dsId=' + id +
                ' data-dsParentId=' + parentId + '>' +
                '<div id=' + (id + "leftWarp") +
                    ' class="dragWrap leftTopDragWrap"' +
                    ' ondragenter="dsDragEnter(event)"' +
                    ' ondragover="allowDSDrop(event)"' +
                    ' ondrop="dsDrop(event)">' +
                '</div>' +
                '<div  id=' + (id + "midWarp") +
                    ' class="dragWrap midDragWrap"' +
                    ' ondragenter="dsDragEnter(event)"' +
                    ' ondragover="allowDSDrop(event)"' +
                    ' ondrop="dsDrop(event)">' +
                '</div>' +
                '<div  id=' + (id + "rightWarp") +
                    ' class="dragWrap rightBottomDragWrap"' +
                    ' ondragenter="dsDragEnter(event)"' +
                    ' ondragover="allowDSDrop(event)"' +
                    ' ondrop="dsDrop(event)">' +
                '</div>' +
                '<div class="gridIcon"></div>' +
                '<div class="listIcon">' +
                    '<span class="icon"></span>' +
                '</div>' +
                '<div class="dsCount">0</div>' +
                '<div title="Click to rename"' +
                    ' class="label" contentEditable="true">' +
                    name +
                '</div>' +
            '</div>';
        } else {
            html =
            '<div id="dataset-' + name + '" class="ds grid-unit" draggable="true"' +
                ' ondragstart="dsDragStart(event)"' +
                ' ondragend="dsDragEnd(event)"' +
                ' data-dsId=' + id +
                ' data-dsParentId=' + parentId + '>' +
                '<div  id=' + (id + "leftWarp") +
                    ' class="dragWrap leftTopDragWrap"' +
                    ' ondragenter="dsDragEnter(event)"' +
                    ' ondragover="allowDSDrop(event)"' +
                    ' ondrop="dsDrop(event)">' +
                '</div>' +
                '<div id=' + (id + "rightWarp") +
                    ' class="dragWrap rightBottomDragWrap"' +
                    ' ondragenter="dsDragEnter(event)"' +
                    ' ondragover="allowDSDrop(event)"' +
                    ' ondrop="dsDrop(event)">' +
                '</div>' +
                '<div class="gridIcon"></div>' +
                '<div class="listIcon">' +
                    '<span class="icon"></span>' +
                '</div>' +
                '<div class="label" data-dsname=' + name + '>' +
                    name +
                '</div>' +
            '</div>';
        }

        return (html);
    }

    /*** Start of DSObj ***/

    /**
     * DSObj is a structure for our datasets and folders
     *
     * @class: DSObj
     * @constructor
     * @property {number} id A unique dsObj id, for reference use
     * @property {string} name The dataset/folder's name
     * @property {number} parentId The parent folder's id
     * @property {boolean} isFolder Whether it's folder or dataset
     * @property {DSObj[]} [eles], An Array of child DSObjs
     * @property {number} [totalChildren] The total nummber of child
     * @property {Object} [attrs] extra attribute to be stored
     */
    function DSObj(id, name, parentId, isFolder, attrs) {
        this.id = id;
        this.name = name;
        this.parentId = parentId;
        this.isFolder = isFolder;
        this.attrs = attrs || {};

        // initially, dataset count itself as one child,
        // folder has no child;
        if (isFolder) {
            this.eles = [];
            this.totalChildren = 0;
        } else {
            this.totalChildren = 1;
        }

        if (parentId >= 0) {
            var parent = DS.getDSObj(parentId);
            parent.eles.push(this);
            // update totalChildren of all ancestors
            updateDSCount(this);
        }

        return (this);
    }

    DSObj.prototype = {
        // rename of dsObj
        rename: function(newName) {
            newName = newName.trim();

            if (newName === "") {
                // not allow empty name
                return (this);
            }

            var self   = this;
            var parent = DS.getDSObj(self.parentId);
            //check name confliction
            var isValid = xcHelper.validate([
                {
                    "$selector": DS.getGrid(self.id),
                    "text"     : ErrorTextTStr.NoSpecialChar,
                    "check"    : function() {
                        return (/[^a-zA-Z\d\s:]/.test(newName));
                    }
                },
                {
                    "$selector": DS.getGrid(self.id),
                    "text"     : ErrorTextWReplaceTStr.FolderConflict
                                    .replace('<name>', newName),
                    "check": function() {
                        return (parent.checkNameConflict(self.id, newName,
                                                         self.isFolder));
                    }
                }
            ]);

            if (isValid) {
                this.name = newName;
            }

            return (this);
        },

        // Remove dsObj from parent
        removeFromParent: function() {
            var parent = DS.getDSObj(this.parentId);
            var index  = parent.eles.indexOf(this);

            parent.eles.splice(index, 1);    // remove from parent
            // update totalChildren count of all ancestors
            updateDSCount(this, true);
            this.parentId = -1;

            return (this);
        },

        // Move dsObj to new parent (insert or append when index < 0)
        // return true/false: Whether move succeed
        moveTo: function(newParent, index) {
            // not append to itself
            if (this.id === newParent.id) {
                return false;
            }

            // not append to same parent again, but can insert
            if (index < 0 && this.parentId === newParent.id) {
                return false;
            }

            // not append or insert to its own child
            var ele = newParent;
            while (ele != null && ele !== this) {
                ele = DS.getDSObj(ele.parentId);
            }
            if (ele === this) {
                return false;
            }

            var $grid = DS.getGrid(this.id);
            // check name conflict
            if (newParent.checkNameConflict(this.id, this.name, this.isFolder)) {
                var msg;
                if (this.isFolder) {
                    msg = 'Folder "' + this.name +
                          '" already exists, cannot move!';
                } else {
                    msg = 'Data Set "' + this.name +
                          '" already exists, cannot move!';
                }
                StatusBox.show(msg, $grid);
                return false;
            }

            this.removeFromParent();
            this.parentId = newParent.id;

            if ((index != null) && (index >= 0)) {
                newParent.eles.splice(index, 0, this);  // insert to parent
            } else {
                newParent.eles.push(this);  // append to parent
            }

            $grid.attr('data-dsParentId', newParent.id);

            // update totalChildren of all ancestors
            updateDSCount(this);
            return true;
        },

        // Check if a dsObj's name has conflict in current folder
        checkNameConflict: function(id, name, isFolder) {
            // now only support check of folder

            // when this is not a folder
            if (!this.isFolder) {
                console.error("Error call, only folder can call this function");
                return false;
            }

            var eles = this.eles;

            for (var i = 0; i < eles.length; i++) {
                var dsObj = eles[i];

                if (dsObj.isFolder &&
                    dsObj.name === name &&
                    dsObj.id !== id &&
                    dsObj.isFolder === isFolder) {
                    return true;
                }
            }

            return false;
        }
    };
    /*** End of DSObj ***/

    return (DS);
}(jQuery, {}));

/*** Start of Drag and Drop Function for DSCart ***/

// Helper function for drag start event
function dsDragStart(event) {
    var $grid = $(event.target).closest(".grid-unit");
    var $gridView = $('#exploreView').find(".gridItems");

    event.stopPropagation();
    event.dataTransfer.effectAllowed = "copyMove";
    event.dataTransfer.dropEffect = "copy";
    // must add datatransfer to support firefox drag drop
    event.dataTransfer.setData("text", "");

    $("#deleteFolderBtn").addClass("disabled");

    DS.setDragDS($grid);
    DS.resetDropTarget();

    $grid.find("> .dragWrap").hide();
    $gridView.find(".active").removeClass("active");
    $gridView.addClass("drag");
    //when anter extra space in grid view
    $gridView.on("dragenter", function(){
        DS.resetDropTarget();
        $gridView.find(".active").removeClass("active");
        $("#backFolderBtn").removeClass("active");
    });

}

// Helper function for drag end event
function dsDragEnd(event) {
    var $gridView = $('#exploreView').find(".gridItems");
    var $grid = $(event.target).closest(".grid-unit");

    event.stopPropagation();

    // clearence
    $grid.find("> .dragWrap").show();
    DS.resetDropTarget();
    DS.resetDragDS();

    $gridView.removeClass("drag");
    $gridView.off("dragenter");
    $gridView.find(".active").removeClass("active");
    $("#backFolderBtn").removeClass("active");
}

// Helper function for drag enter event
function dsDragEnter(event) {
    var $dragWrap = $(event.target);
    var targetId = $dragWrap.attr("id");
    var $dropTarget = DS.getDropTarget();

    event.preventDefault();
    event.stopPropagation();

    // back up button
    if (targetId === "backFolderBtn") {
        var $bacnFolderBtn = $("#backFolderBtn");

        if ($('#exploreView').find(".gridItems").hasClass('listView') ||
            $bacnFolderBtn.hasClass("disabled")) {
            return;
        }
        $bacnFolderBtn.addClass("active");

    } else if (!$dropTarget || targetId !== $dropTarget.attr("id")) {
        // change drop target
        $(".grid-unit").removeClass("active");
        $(".dragWrap").removeClass("active");

        if ($dragWrap.hasClass("midDragWrap")) {
            // drop in folder case
            $dragWrap.closest(".grid-unit").addClass("active");
        } else {
            // insert case
            $dragWrap.addClass("active");
        }

        DS.setDropTraget($dragWrap);
    }
}

// Helper function for drop event
function dsDrop(event) {
    var $div = DS.getDropTarget();
    var $target = $div.closest('.grid-unit');
    var $grid = DS.getDragDS();

    event.stopPropagation();

    if ($div != null) {
        if ($div.hasClass('midDragWrap')) {
            dsDropIn($grid, $target);
        } else if ($div.hasClass('leftTopDragWrap')) {
            dsInsert($grid, $target, true);
        } else {
            dsInsert($grid, $target, false);
        }
    }
}

// Helper function for drag over event
function allowDSDrop(event) {
    // call the event.preventDefault() method for the ondragover allows a drop
    event.preventDefault();
}

// Helper function to drop ds into a folder
function dsDropIn($grid, $target) {
    var dragDsId = $grid.data("dsid");
    var ds = DS.getDSObj(dragDsId);

    var targetId = $target.data("dsid");
    if (dragDsId === targetId) {
        return;
    }
    var targetDS = DS.getDSObj(targetId);

    if (ds.moveTo(targetDS, -1)) {
        $grid.attr("data-dsParentId", targetId);
        $target.append($grid);
        DS.refresh();

        SQL.add("Drop dataset/folder", {
            "operation"   : SQLOps.DSDropIn,
            "dsId"        : dragDsId,
            "dsName"      : ds.name,
            "targetDSId"  : targetId,
            "targetDSName": targetDS.name
        });
    }
}

// Helper function to insert ds before or after another ds
function dsInsert($grid, $sibling, isBefore) {
    var dragDsId = $grid.data("dsid");
    var ds = DS.getDSObj(dragDsId);

    var siblingId = $sibling.attr("data-dsId");
    if (dragDsId === siblingId) {
        return;
    }
    var siblingDs = DS.getDSObj(siblingId);

    // parent
    var parentId = siblingDs.parentId;
    var parentDs = DS.getDSObj(parentId);

    var insertIndex = parentDs.eles.indexOf(siblingDs);
    var isMoveTo;

    if (isBefore) {
        isMoveTo = ds.moveTo(parentDs, insertIndex);
    } else {
        isMoveTo = ds.moveTo(parentDs, insertIndex + 1);
    }

    if (isMoveTo) {
        $grid.attr("data-dsParentId", parentId);
        if (isBefore) {
            $sibling.before($grid);
        } else {
            $sibling.after($grid);
        }
        DS.refresh();

        SQL.add("Insert dataset/folder", {
            "operation"    : SQLOps.DSInsert,
            "dsId"         : dragDsId,
            "dsName"       : ds.name,
            "siblingDSId"  : siblingId,
            "siblingDSName": siblingDs.name,
            "isBefore"     : isBefore
        });
    }
}

// Helper function to move ds back to its parent
function dsBack($grid) {
    var ds = DS.getDSObj($grid.data("dsid"));
    // target
    var grandPaId = DS.getDSObj(ds.parentId).parentId;
    var grandPaDs = DS.getDSObj(grandPaId);
    var $grandPa = DS.getGrid(grandPaId);

    if (ds.moveTo(grandPaDs, -1)) {
        $grid.attr("data-dsParentId", grandPaId);
        $grandPa.append($grid);
        DS.refresh();

        SQL.add("Drop dataset/folder back", {
            "operation"    : SQLOps.DSDropBack,
            "dsId"         : ds.id,
            "dsName"       : ds.name,
            "newFolderId"  : grandPaId,
            "newFolderName": grandPaDs.name
        });
    }
}

// Helper function to drop ds back to parent folder
function dsDropBack(event) {
    event.preventDefault(); // default is open as link on drop
    event.stopPropagation();

    if ($('#exploreView').find('.gridItems').hasClass('listView') || 
        $('#backFolderBtn').hasClass('disabled')) {
        return;
    }

    var $grid = DS.getDragDS();
    dsBack($grid);
}
/*** End of Drag and Drop Function for DSCart ***/


window.ExportTarget = (function($, ExportTarget) {
    var exportTargets = [];
    var $exportView = $('#exportView');
    var $form = $('#exportDataForm');
    var $gridView = $exportView.find('.gridItems');
    var $targetTypeList = $('#targetTypeList');
    var $targetTypeInput = $targetTypeList.find('.text');
    var $nameInput = $('#targetName');

    ExportTarget.setup = function() {

        $form.click(function(event){
            event.stopPropagation();
            hideDropdownMenu();
        });

        xcHelper.dropdownList($targetTypeList, {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }
                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }

                $targetTypeInput.val($li.text()).removeClass('hint');
            },
            "container": "#exportDataForm"
        });

        $gridView.on("click", ".grid-unit", function(event) {
            event.stopPropagation(); // stop event bubbling
            var $grid = $(this);

            $gridView.find(".active").removeClass("active");
            $grid.addClass("active");
        });

        $form.submit(function(event) {
            event.preventDefault();
            $form.find('input').blur();

            var $submitBtn = $("#exportFormSubmit").blur();
            xcHelper.disableSubmit($submitBtn);

            var targetType = $targetTypeInput.val();
            var name = $nameInput.val().trim();

            ExportTarget.submitForm(targetType, name)
            .then(function() {
                commitToStorage();
            })  
            .fail(function(error) {
                console.error(error);
                // XX fail case being handled in ExportTarget.submitForm
            })
            .always(function() {
                xcHelper.enableSubmit($submitBtn);
            });
        });

        $('#exportFormReset').click(function() {
            $targetTypeInput.addClass('hidden');
        });

        // xxx TEMPORARILY DISABLE THE ENTIRE FORM
        $form.find('input, button').prop('readonly', true)
                                   .attr('disabled', true)
                                   .css({'cursor': 'not-allowed'});
        $form.find('button').css('pointer-events', 'none')
                            .addClass('btn-cancel');  
        $form.find('.iconWrapper').css('background', '#AEAEAE');
        $('#targetTypeList').css('pointer-events', 'none');                     
    };

    ExportTarget.getTargets = function() {
        return exportTargets;
    };

    ExportTarget.restore = function() {
        XcalarListExportTargets("*", "*")
        .then(function(targs) {
            var targets = targs.targets;
            var numTargs = targs.numTargets;
            var types = [];
            for (var i = 0; i < numTargs; i++) {
                var type = DsTargetTypeTStr[targets[i].type];
                if (type === "file") {
                    type = "Local Filesystem";
                } else if (type === "odbc") {
                    type = "ODBC";
                }
                var typeIndex = types.indexOf(type);
                if (typeIndex === -1) {
                    types.push(type);
                    typeIndex = types.length - 1;
                    exportTargets.push({name: type, targets: []});
                }
                exportTargets[typeIndex].targets.push(targets[i].name);
            }
            restoreGrids();
        })
        .fail(function(error) {
            Alert.error("Export Target Restoration Failed", error.error);
        });   
    };

    ExportTarget.submitForm = function(targetType, name) {
        var deferred = jQuery.Deferred();
        var isValid  = xcHelper.validate([
            {
                "$selector": $targetTypeInput,
                "text"     : ErrorTextTStr.NoEmptyList,
                "check"    : function() {
                    return (targetType === "");
                }
            },
            {
                "$selector": $nameInput,
                "text"     : ErrorTextTStr.NoEmpty,
                "check"    : function() {
                    return (name === "");
                }
            }
        ]);

        if (!isValid) {
            deferred.reject("Invalid Parameters");
            return deferred.promise();
        }
        
        if (targetType === "Local Filesystem") {
            var path = hostname + ":/var/tmp/xcalar/export/blah.csv";
            XcalarAddLocalFSExportTarget(name, path)
            .then(function() {
                addGridIcon(targetType, name);
                deferred.resolve();
            })
            .fail(function(err) {
                Alert.error("Failed to add export target", err.error);
                deferred.reject(err);
            });
        } else {
            var error = {error: 'Please select a valid target type'};
            Alert.error("Invalid Target Type", error.error);
            deferred.reject(error);
        }
        
        return (deferred.promise());
    };

    function hideDropdownMenu() {
        $form.find(".dropDownList").removeClass("open")
                                  .find(".list").hide();
    }

    function restoreGrids() {
        // return;
        var numTypes = exportTargets.length;
        var gridHtml = "";
        var numGrids;
        for (var i = 0; i < numTypes; i++) {
            var name = exportTargets[i].name;
            var targetTypeId = name.replace(/\s/g, '');
            gridHtml += '<div class="gridIconSection clearfix"' +
                            'id="gridTarget-' + targetTypeId + '">';
            if (i > 0) {
                gridHtml += '<div class="divider clearfix"></div>';
            }
            gridHtml += '<div class="title">' + name +
                            '</div>' +
                            '<div class="gridArea">';
            numGrids = exportTargets[i].targets.length;
            for (var j = 0; j < numGrids; j++) {
                gridHtml += getGridHtml(exportTargets[i].targets[j]);
            }    
            gridHtml += '</div>' +
                        '</div>';
        }
        $exportView.find('.gridItems').html(gridHtml);
        numGrids = $exportView.find('.grid-unit').length;
        $exportView.find('.numExportTargets').html(numGrids);

    }

    function getGridHtml(name) {
        var gridHtml = '<div class="ds grid-unit display">' +
                            '<div class="gridIcon"></div>' +
                            '<div class="listIcon">' +
                                '<span class="icon"></span>' +
                            '</div>' +
                            '<div class="label" data-dsname="' + name +
                            '" data-toggle="tooltip" data-container="body"' +
                            ' data-placement="right" title="' + name + '">' +
                                name +
                            '</div>' +
                        '</div>';
        return (gridHtml);
    }

    function addGridIcon(targetType, name) {
        var $gridItems = $exportView.find('.gridItems');
        var $grid = $(getGridHtml(name));
        var targetTypeId = targetType.replace(/\s/g, '');
        // $grid.append('<div class="waitingIcon"></div>');
        if ($('#gridTarget-' + targetTypeId).length === 0) {
            
            var gridSectionHtml = '<div class="gridIconSection clearfix"' +
                                      'id="gridTarget-' + targetTypeId + '">';

            if ($gridItems.children().length > 0) {
                gridSectionHtml += '<div class="divider clearfix"></div>';
            }            

            gridSectionHtml += '<div class="title">' + targetType +
                                      '</div>' +
                                      '<div class="gridArea"></div>' +
                                  '</div>';
            $gridItems.append(gridSectionHtml);

            var targetGroup = {name: targetType, targets: []};
            exportTargets.push(targetGroup);
        }

        var $gridTarget = $('#gridTarget-' + targetTypeId).find('.gridArea');
        $gridTarget.append($grid);
        var groupIndex = $gridTarget.parent().index();
        exportTargets[groupIndex].targets.push(name);

        var numGrids = $exportView.find('.grid-unit').length;
        $exportView.find('.numExportTargets').html(numGrids);
    }

    return (ExportTarget);

}(jQuery, {}));


