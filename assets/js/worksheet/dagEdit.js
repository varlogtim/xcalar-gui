window.DagEdit = (function($, DagEdit) {
    var isEditMode = false;
  	var params = {};
  	var editingNode;
    var treeNode;
    var linkedNodes = {}; // nodes that depend on each other, example: groupby
    // and index are linked, so when  we undo a group by edit, we need to undo the
    // index edit as well
    var mapIndex; // stores eval string number during a map edit
    var newNodes = {};


    // XXX temporary
    DagEdit.on = function() {
        $("#dagPanel").addClass("on");
    };
    // XXX temporary
    DagEdit.off = function() {
        $("#dagPanel").removeClass("on");
    };

    // DagEdit.on();

  	DagEdit.getInfo = function() {
  		return {params: params,
                newNodes: newNodes};
  	};

    DagEdit.isEditMode = function() {
        return isEditMode;
    };

  	DagEdit.toggle = function(node, force) {
        var edits = DagEdit.getInfo();
        if ((Object.keys(edits.params).length ||
            Object.keys(edits.newNodes).length) && !force) {
            Alert.show({
                "title": "Edit in progress",
                "msg": "Are you sure you want to exit edit mode and abandon all changes?",
                "onConfirm": function() {
                   toggleMode();
                }
            });
        } else {
            toggleMode();
        }

        function toggleMode() {
            $("#container").toggleClass("dfEditState");
            if (!$("#container").hasClass("dfEditState")) {
                isEditMode = true;
                $(".dagWrap").removeClass("editMode");
                $(".dagWrap").find(".hasEdit").removeClass("hasEdit");
                $(".xcTableWrap").removeClass("editingDf notEditing editing");
                $("#dagPanel").find(".dagTableTip").remove();
                xcTooltip.changeText($("#undoRedoArea").find(".noUndoTip"),
                                     TooltipTStr.NoUndoActiveForm);
                StatusMessage.updateLocation(true);
                TblManager.alignTableEls();
                MainMenu.closeForms();
            } else {
                isEditMode = false;
                var tableId = xcHelper.getTableId(node.value.name);
                $("#xcTableWrap-" + tableId).addClass("editingDf");
                $(".xcTableWrap:not(#xcTableWrap-" + tableId + ")").addClass("notEditing");
                StatusMessage.updateLocation(true, "Editing Dataflow");
                xcTooltip.changeText($("#undoRedoArea").find(".noUndoTip"),
                                     TooltipTStr.NoUndoEditMode);
                TblManager.alignTableEls();
            }
            treeNode = node;
            params = {};
            newNodes = {};
            linkedNodes = {};
        }
  	};

  	DagEdit.editOp = function(node) {
  		editingNode = node;
        var sourceTableNames = node.getNonIndexSourceNames(true);

        TblManager.findAndFocusTable(sourceTableNames[0])
        .then(function() {
            if (sourceTableNames[1]) {
                return TblManager.findAndFocusTable(sourceTableNames[1]);
            } else {
                return PromiseHelper.resolve();
            }
        })
        .then(function() {
            for (var i = 0; i < sourceTableNames.length; i++) {
                var tableId = xcHelper.getTableId(sourceTableNames[i]);
                var $dagWrap = $("#dagWrap-" + tableId);
                $dagWrap.addClass("editing").removeClass("notEditing");
                $("#xcTableWrap-" + tableId).addClass("editing").removeClass("notEditing");

                // highlight node
                Dag.getTableIconByName($(".dagWrap.editMode"), sourceTableNames[i]).addClass("editing");
            }

            showEditForm(node, sourceTableNames);
        })
        .fail(function() {
            var firstTableId = xcHelper.getTableId(sourceTableNames[0]);
            var secondTableId = xcHelper.getTableId(sourceTableNames[1]);
            var isDroppedTable = !gTables.hasOwnProperty(firstTableId);

            if (isDroppedTable && !gDroppedTables[firstTableId]) {
                var table = new TableMeta({
                    "tableId": firstTableId,
                    "tableName": sourceTableNames[0],
                    "tableCols": [ColManager.newDATACol()],
                    "status": TableType.Dropped
                });
                gDroppedTables[firstTableId] = table;
            }

            var isOtherDroppedTable;
            if (sourceTableNames[1] && !gTables.hasOwnProperty(secondTableId)) {
                isOtherDroppedTable = true;
                if (!gDroppedTables[secondTableId]) {
                    var table = new TableMeta({
                        "tableId": secondTableId,
                        "tableName": sourceTableNames[1],
                        "tableCols": [ColManager.newDATACol()],
                        "status": TableType.Dropped
                    });
                    gDroppedTables[secondTableId] = table;
                }
            }
            for (var i = 0; i < sourceTableNames.length; i++) {
                var tableId = xcHelper.getTableId(sourceTableNames[i]);
                $("#dagWrap-" + tableId).addClass("editing")
                                        .removeClass("notEditing");
                $("#xcTableWrap-" + tableId).addClass("editing")
                                            .removeClass("notEditing");
            }

            showEditForm(node, sourceTableNames, isDroppedTable,
                         isOtherDroppedTable);
        });
  	};

    DagEdit.store = function(info) {
        var indexNodes = [];

        if (editingNode.value.api === XcalarApisT.XcalarApiGroupBy) {
            checkIndexNodes(editingNode, info, indexNodes, 0);
        }

        if (editingNode.value.api === XcalarApisT.XcalarApiJoin) {
            var joinType = info.args.joinType;
            // XXX move this somewhere else
            var joinLookUp = {
                "Inner Join": JoinOperatorT.InnerJoin,
                "Left Outer Join": JoinOperatorT.LeftOuterJoin,
                "Right Outer Join": JoinOperatorT.RightOuterJoin,
                "Full Outer Join": JoinOperatorT.FullOuterJoin,
                "Cross Join": JoinOperatorT.CrossJoin
            };
            joinType = joinLookUp[joinType];
            joinType = JoinOperatorTStr[joinType];
            info.args.joinType = joinType;

            if (joinType !== "crossJoin") {
                checkIndexNodes(editingNode, info, indexNodes, 0);
                checkIndexNodes(editingNode, info, indexNodes, 1);
            }
        }

        if (indexNodes.length) {
            linkedNodes[editingNode.value.name] = indexNodes;
        }

        // for map we update 1 eval str at a time
        if (editingNode.value.api === XcalarApisT.XcalarApiMap) {
            if (!params[editingNode.value.name]) {
                params[editingNode.value.name] = {
                    eval: xcHelper.deepCopy(editingNode.value.struct.eval)
                };
            }
            params[editingNode.value.name].eval[mapIndex] = info.args.eval[0];
            params[editingNode.value.name].icv = info.args.icv;
        } else if (editingNode.value.api === XcalarApisT.XcalarApiJoin) {
            params[editingNode.value.name] = {joinType: info.args.joinType};
        } else {
            params[editingNode.value.name] = info.args;
        }

        Dag.updateEditedOperation(treeNode, editingNode, indexNodes,
                              params[editingNode.value.name]);

        $(".dagWrap").removeClass("editing");
        $(".xcTableWrap").removeClass("editing");
    };

    DagEdit.undoEdit = function(node) {
        var lNodes = linkedNodes[node.value.name];
        var toDelete = [];
        if (lNodes) {
            for (var i = 0; i < lNodes.length; i++) {
                toDelete.push(lNodes[i]);
                delete params[lNodes[i].value.name];
            }
            delete linkedNodes[node.value.name];
        }
        delete params[node.value.name];
        delete newNodes[node.value.name];

        Dag.removeEditedOperation(treeNode, node, toDelete);
    };

    function showEditForm(node, sourceTableNames, isDroppedTable,
                          isOtherDroppedTable) {
        var api = node.value.api;
        var struct = node.value.struct;
        var tableIds = sourceTableNames.map(function(name) {
            return xcHelper.getTableId(name);
        });
        var tableId = tableIds[0];
        var prefillInfo;
        $("#container").addClass("editingForm");
        switch(api) {
             case (XcalarApisT.XcalarApiAggregate):
                var aggStruct;
                if (params[editingNode.value.name]) {
                    aggStruct = params[editingNode.value.name];
                } else {
                    aggStruct = struct;
                }
                var evalStr = aggStruct.eval[0].evalString.trim();
                var opInfo = xcHelper.extractOpAndArgs(evalStr);
                OperationsView.show(tableId, [], "aggregate", {
                    prefill: {
                        ops: [opInfo.op],
                        args: [opInfo.args],
                        isDroppedTable: isDroppedTable
                    }
                });
                break;
            case (XcalarApisT.XcalarApiMap):
                var mapStruct;
                if (params[editingNode.value.name]) {
                    mapStruct = params[editingNode.value.name];
                } else {
                    mapStruct = struct;
                }
                if (mapStruct.eval.length === 1) {
                    mapIndex = 0;

                    var evalStr = mapStruct.eval[0].evalString.trim();

                    var opInfo = xcHelper.extractOpAndArgs(evalStr);
                    var newFields = mapStruct.eval.map(function(item) {
                        return item.newField;
                    });
                    prefillInfo = {
                        ops: [opInfo.op],
                        args: [opInfo.args],
                        newFields: [newFields[0]],
                        icv: mapStruct.icv,
                        isDroppedTable: isDroppedTable
                    };

                    OperationsView.show(tableId, [], "map", {
                        prefill: prefillInfo
                    });

                    return;
                }

                var $mapPreForm = $("#mapPreForm");
                $mapPreForm.addClass("active");
                $mapPreForm.data("tableid", tableId);
                $mapPreForm.data("tablename", sourceTableNames[0]);
                $mapPreForm.data("isDroppedTable", isDroppedTable);


                var $dagWrap = $(".dagWrap.editMode");
                var $dagTable = Dag.getTableIcon($dagWrap, node.value.dagNodeId);

                $(document).on('mousedown.hideMapPreForm', function(event) {
                    if ($(event.target).closest('#mapPreForm').length === 0 &&
                        $(event.target).closest('#dagScrollBarWrap').length === 0) {
                        $mapPreForm.removeClass("active");
                        $(document).off("hideMapPreForm");
                    }
                });

                var evalHtml = "<div>";
                mapStruct.eval.forEach(function(evalObj) {
                    evalHtml += '<div class="row">' +
                                    '<div class="evalStr">' + evalObj.evalString + '</div>' +
                                    '<div class="optionSection">' +
                                        '<div class="edit option">' +
                                            '<span class="text">Edit</span>' +
                                            '<i class="icon xi-edit"></i>' +
                                        '</div>' +
                                        // '<div class="delete option">' +
                                        //     '<i class="icon xi-trash"></i>' +
                                        // '</div>' +
                                    '</div>' +
                                '</div>';
                });

                evalHtml += "</div>";
                $mapPreForm.find(".content").html(evalHtml);

                positionMapPreForm($dagTable);
                break;
            case (XcalarApisT.XcalarApiFilter):
                var fltStruct;
                if (params[editingNode.value.name]) {
                    fltStruct = params[editingNode.value.name];
                } else {
                    fltStruct = struct;
                }
                var evalStr = fltStruct.eval[0].evalString.trim();
                var opInfo = xcHelper.extractOpAndArgs(evalStr);
                OperationsView.show(tableId, [], "filter", {
                    prefill: {
                        ops: [opInfo.op],
                        args: [opInfo.args],
                        isDroppedTable: isDroppedTable
                    }
                });
                break;
            case (XcalarApisT.XcalarApiGroupBy):
                var gbStruct;
                if (params[editingNode.value.name]) {
                    gbStruct = params[editingNode.value.name];
                } else {
                    gbStruct = struct;
                }
                var ops =[];
                var args = [];
                gbStruct.eval.forEach(function(evalObj) {
                    var evalStr = evalObj.evalString.trim();
                    var opInfo = xcHelper.extractOpAndArgs(evalStr);
                    ops.push(opInfo.op);
                    args.push(opInfo.args);
                });

                var newFields = gbStruct.eval.map(function(item) {
                    return item.newField;
                });
                var indexedFields;
                if (linkedNodes[editingNode.value.name]) {
                    var indexNode = linkedNodes[editingNode.value.name][0];
                    var indexName = indexNode.value.name;
                    indexedFields = params[indexName].key.map(function(key) {
                        return key.name;
                    });
                } else {
                    indexedFields = node.value.indexedFields;
                }

                prefillInfo = {
                    "ops": ops,
                    "args": args,
                    "newFields": newFields,
                    "dest": xcHelper.getTableName(struct.dest),
                    "indexedFields": indexedFields,
                    "icv": gbStruct.icv,
                    "includeSample": gbStruct.includeSample,
                    "isDroppedTable": isDroppedTable
                };

                OperationsView.show(tableId, [], "group by", {
                    prefill: prefillInfo
                });
                break;
            case (XcalarApisT.XcalarApiJoin):
                var joinStruct;
                if (params[editingNode.value.name]) {
                    joinStruct = params[editingNode.value.name];
                } else {
                    joinStruct = struct;
                }

                // var indexedFields;
                // if (linkedNodes[editingNode.value.name]) {
                //     var indexNode = linkedNodes[editingNode.value.name][0];
                //     var indexName = indexNode.value.name;
                //     indexedFields = params[indexName].key.map(function(key) {
                //         return key.name;
                //     });
                // } else {
                //     indexedFields = node.value.indexedFields;
                // }

                var prefillInfo = {
                    "joinType": joinStruct.joinType,
                    "rightTable": sourceTableNames[1],
                    "dest": xcHelper.getTableName(struct.dest),
                    "srcCols": node.value.indexedFields,
                    "evalStr": struct.evalStr,
                    "isLeftDroppedTable": isDroppedTable,
                    "isRightDroppedTable": isOtherDroppedTable
                };
                JoinView.show(tableId, [], {prefill: prefillInfo});
                break;
            case (XcalarApisT.XcalarApiProject):
                var colNums = [];
                var table;
                if (gTables[tableId]) {
                    table = gTables[tableId];
                } else {
                    table = gDroppedTables[tableId];
                }
                if (table && table.getAllCols().length > 1) {
                    for (var i = 0; i < struct.columns.length; i++) {
                        var colNum = table.getColNumByBackName(struct.columns[i]);
                        if (colNum != null) {
                            colNums.push(colNum);
                        }
                    }
                }

                ProjectView.show(tableId, colNums, {
                    prefill: {
                        "isDroppedTable": isDroppedTable
                    }
                });
                break;
            default:
                console.log("invalid op");
                break;
        }
    }

    DagEdit.setupMapPreForm = function() {
        var $mapPreForm = $("#mapPreForm");

        $mapPreForm.find(".close").click(function() {
            $mapPreForm.removeClass("active");
            $(document).off("hideMapPreForm");
        });

        $mapPreForm.draggable({
            handle: '#mapPreFormTitle',
            cursor: '-webkit-grabbing',
            containment: "window"
        });

        $mapPreForm.resizable({
            handles: "n, e, s, w, se",
            minHeight: 200,
            minWidth: 200,
            containment: "document"
        });

        $mapPreForm.on("click", ".row", function() {
            $mapPreForm.removeClass("active");
            $(document).off("hideMapPreForm");

            var index = $(this).index();
            mapIndex = index;
            var tableId = $mapPreForm.data("tableid");
            var isDroppedTable = $mapPreForm.data("isDroppedTable");
            var mapStruct;
            if (params[editingNode.value.name]) {
                mapStruct = params[editingNode.value.name];
            } else {
                mapStruct = editingNode.value.struct;
            }
            var evalStr = mapStruct.eval[index].evalString.trim();
            var opInfo = xcHelper.extractOpAndArgs(evalStr);
            var newFields = mapStruct.eval.map(function(item) {
                return item.newField;
            });

            prefillInfo = {
                ops: [opInfo.op],
                args: [opInfo.args],
                newFields: [newFields[index]],
                icv: mapStruct.icv,
                isDroppedTable: isDroppedTable
            };

            OperationsView.show(tableId, [], "map", {
                prefill: prefillInfo
            });
        });
    };

    function checkIndexNodes(editingNode, info, indexNodes, parentNum) {
        var indexNode;
        var indexFields;
        if (editingNode.value.api === XcalarApisT.XcalarApiJoin) {
            indexFields = info.indexFields[parentNum];
        } else {
            indexFields = info.indexFields;
        }

        var keys = indexFields.map(function(name) {
            // XXX use correct key type
            return {"name": name,
                "keyFieldName": name,
                "type": DfFieldTypeTStr[DfFieldTypeT.DfUnknown]
            };
        });
        if (editingNode.parents[parentNum].value.api ===
            XcalarApisT.XcalarApiIndex) {
            indexNode = editingNode.parents[parentNum];

            var needsNewIndex = false;
            if (indexNode.value.struct.key.length !== keys.length) {
                needsNewIndex = true;
            } else {
                for (var i = 0; i < indexNode.value.struct.key.length; i++) {
                    if (indexNode.value.struct.key[i].keyFieldName !==
                        keys[i].keyFieldName) {
                        needsNewIndex = true;
                        break;
                    } else if (indexNode.value.struct.key[i].name !==
                                keys[i].name) {
                        needsNewIndex = true;
                        break;
                    }
                }
            }

            if (needsNewIndex) {
                params[indexNode.value.name] = {"key": keys};
                indexNodes.push(indexNode);
            }
        } else {
             // need to insert an index operation here if table is not
            // indexed correctly
            if (!newNodes[editingNode.value.name]) {
                newNodes[editingNode.value.name] = [];
            }
            // consider tags
            newNodes[editingNode.value.name].push({
                keys: keys,
                src: editingNode.parents[parentNum].value.name
            });
        }
    }

    function positionMapPreForm($dagTable) {
        var $mapPreForm = $("#mapPreForm");
        var topMargin = -3;
        var top = $dagTable[0].getBoundingClientRect().top + topMargin;
        var left = $dagTable[0].getBoundingClientRect().left - 140;
        var defaultWidth = 300;
        var defaultHeight = 200;

        $mapPreForm.css("width", "auto");
        var width = Math.min(defaultWidth, $mapPreForm.outerWidth());
        width = Math.max(230, width);
        $mapPreForm.width(width);

        $mapPreForm.css("height", "auto");
        var height = Math.min(defaultHeight, $mapPreForm.outerHeight());
        height = Math.max(200, height);
        $mapPreForm.height(height);

        left = Math.max(2, left);
        top = Math.max(2, top - height); // at least 2px from the top

        $mapPreForm.css({'top': top, 'left': left});

        var rightBoundary = $(window).width() - 5;

        if ($mapPreForm[0].getBoundingClientRect().right > rightBoundary) {
            left = rightBoundary - $mapPreForm.width();
            $mapPreForm.css('left', left);
        }

        // ensure dropdown menu is above the bottom of the dag panel
        var dagPanelBottom = $('#workspacePanel')[0].getBoundingClientRect()
                                                    .bottom;
        var menuBottom = $mapPreForm[0].getBoundingClientRect().bottom;
        if (menuBottom > dagPanelBottom) {
            $mapPreForm.css('top', '-=' + ($mapPreForm.height() + 35));
        }
    }

    if (window.unitTestMode) {
        DagEdit.__testOnly__ = {};
        // DagEdit.__testOnly__.parseEvalStr = parseEvalStr;
    }

    function structs() {
        var load = {
          "url": "file:///netstore/datasets/indexJoin/students/students.json",
          "fileNamePattern": "",
          "udf": "",
          "dest": ".XcalarDS.rudy.95711.students",
          "size": 0,
          "format": "json",
          "recordDelim": "\n",
          "fieldDelim": "",
          "quoteDelim": "\"",
          "linesToSkip": 0,
          "crlf": true,
          "header": false,
          "recursive": false
        };

        var index =  {
          "source": ".XcalarDS.rudy.95711.students",
          "dest": "students#p7302",
          "key": [
            {
              "name": "xcalarRecordNum",
              "type": "\u0000"
            }
          ],
          "prefix": "students",
          "ordering": "Unordered",
          "dhtName": "",
          "delaySort": false
        };

        var filter = {
          "source": "students#p7302",
          "dest": "students#p7303",
          "eval": [
            {
              "evalString": "eq(students::student_id, 1)",
              "newField": ""
            }
          ]
        };

        var aggregate = {
          "source": "students#p7304",
          "dest": "b",
          "eval": [
            {
              "evalString": "avg(students::student_id)",
              "newField": ""
            }
          ]
        };

        var map =  {
          "source": "students#p7304",
          "dest": "students#p7307",
          "eval": [
            {
              "evalString": "add(students::student_id, ^b)",
              "newField": "student_id_add1"
            }
          ],
          "icv": false
        };

        var groupby = {
          "source": "students.index#p7310",
          "dest": "g#p7308",
          "eval": [
            {
              "evalString": "count(students::student_name)",
              "newField": "student_name_count"
            }
          ],
          "newKeyField": "",
          "includeSample": true,
          "icv": false
        };

        var join = {
          "source": [
            "students.index#p7312",
            "students.index#p7313"
          ],
          "dest": "hre#p7311",
          "joinType": "innerJoin",
          "renameMap": [
            [],
            []
          ]
        };
    }


	return (DagEdit);
})(jQuery, {});