window.SQLCompiler = (function() {
    function SQLCompiler() {
        this.sqlObj = new SQLApi();
        return this;
    }
    var opLookup = {
        // arithmetic.scala
        "expressions.UnaryMinus": null,
        "expressions.UnaryPositive": null,
        "expressions.Abs": "abs",
        "expressions.Add": "add",
        "expressions.Subtract": "sub",
        "expressions.Multiply": "mult",
        "expressions.Divide": "div",
        "expressions.Remainder": "mod",
        "expressions.Pmod": null,
        "expressions.Least": null,
        "expressions.Greatest": null,
        // bitwiseExpressions.scala
        "expressions.BitwiseAnd": "bitand",
        "expressions.BitwiseOr": "bitor",
        "expressions.BitwiseXor": "bitxor",
        "expressions.BitwiseNot": null,
        // Cast.scala
        "expressions.Cast": null, // NOTE: This will be replaced
        // conditionalExpressions.scala
        "expressions.If": ["if", "ifStr"], // XXX please verify
        "expressions.CaseWhen": null,
        // mathExpressions.scala
        "expressions.EulerNumber": null,
        "expressions.Pi": "pi",
        "expressions.Acos": "acos",
        "expressions.Asin": "asin",
        "expressions.Atan": "atan",
        "expressions.Cbrt": null,
        "expressions.Ceil": "ceil",
        "expressions.Cos": "cos",
        "expressions.Cosh": "cosh",
        "expressions.Conv": null,
        "expressions.Exp": "exp",
        "expressions.Expm1": null,
        "expressions.Floor": "floor",
        "expressions.Factorial": null,
        "expressions.Log": "log",
        "expressions.Log2": "log2",
        "expressions.Log10": "log10",
        "expressions.Log1p": null,
        "expressions:Rint": null,
        "expressions.Signum": null,
        "expressions.Sin": "sin",
        "expressions.Sinh": "sinh",
        "expressions.Sqrt": "sqrt",
        "expressions.Tan": "tan",
        "expressions.Cot": null,
        "expressions.Tanh": "tanh",
        "expressions.ToDegrees": "degrees",
        "expressions.ToRadians": "radians",
        "expressions.Bin": null,
        "expressions.Hex": null,
        "expressions.Unhex": null,
        "expressions.Atan2": "atan2",
        "expressions.Pow": "pow",
        "expressions.ShiftLeft": "bitlshift",
        "expressions.ShiftRight": "bitrshift",
        "expressions.ShiftRightUnsigned": null,
        "expressions.Hypot": null,
        "expressions.Logarithm": null,
        "expressions.Round": "round",
        "expressions.BRound": null,
        // predicates.scala
        "expressions.Not": "not",
        "expressions.In": "contains", // XXX reverse order
        "expressions.And": "and",
        "expressions.Or": "or",
        "expressions.EqualTo": "eq",
        "expressions.EqualNullSafe": "eq",
        "expressions.LessThan": "lt",
        "expressions.LessThanOrEqual": "le",
        "expressions.GreaterThan":  "gt",
        "expressions.GreaterThanOrEqual": "ge",
        // randomExpressions.scala,
        "expressions.Rand": "genRandom", // XXX a little different
        "expressions.Randn": null,
        // regexoExpressions.scala
        "expressions.like": "like",
        "expressions.RLike": "regex",
        "expressions.StringSplit": null,
        "expressions.RegExpReplace": null,
        "expressions.RegExpExtract": null,
        // stringExpressions.scala
        "expressions.Concat": "concat",
        "expressions.ConcatWs": null,
        "expressions.Elt": null,
        "expressions.Upper": "upper",
        "expressions.Lower": "lower",
        "expressions.StringReplace": "replace",
        "expressions.StringTranslate": null,
        "expressions.FindInSet": null,
        "expressions.StringTrim": "strip",
        "expressions.StringTrimLeft": null,
        "expressions.StringTrimRight": null,
        "expressions.StringInstr": "find", // XXX 1-based index
        "expressions.SubstringIndex": null,
        "expressions.StringLocate": "find", // XXX 1-based index
        "expressions.StringLPad": null,
        "expressions.StringRPad": null,
        "expressions.ParseUrl": null,
        "expressions.FormatString": null,
        "expressions.InitCap": null,
        "expressions.StringRepeat": null,
        "expressions.StringReverse": null,
        "expressions.StringSpace": null,
        "expressions.Substring": "substring", // XXX 1-based index
        "expressions.Right": null,
        "expressions.Left": null,
        "expressions.Length": "len",
        "expressions.BitLength": null,
        "expressions.OctetLength": null,
        "expressions.Levenshtein": null,
        "expressions.SoundEx": null,
        "expressions.Ascii": null,
        "expressions.Chr": null,
        "expressions.Base64": null,
        "expressions.UnBase64": null,
        "expressions.Decode": null,
        "expressions.Encode": null,
        "expressions.FormatNumber": null,
        "expressions.Sentences": null,
        "expressions.IsNotNull": "exists",
    };

    var tableLookup = {"customer": "customer#EP342",
                       "lineitem": "lineitem#wV53",
                       "orders": "orders#wV64",
                       "partsupp": "partsupp#wV71",
                       "supplier": "supplier#EP333",
                       "part": "part#wV91",
                       "region": "region#wV96",
                       "nation": "nation#EP325"};

    function assert(st) {
        if (!st) {
            debugger;
            console.error("ASSERTION FAILURE!");
        }
    }

    function TreeNode(value) {
        if (value.class === "org.apache.spark.sql.execution.LogicalRDD") {
            // These are leaf nodes
            // Find the RDD that has a name XC_TABLENAME_ prefix
            var rdds = value.output;
            var prefix = "XC_TABLENAME_";
            for (var i = 0; i < rdds.length; i++) {
                var evalStr = genEvalStringRecur(SQLCompiler.genTree(undefined,
                    rdds[i].slice(0)));
                if (evalStr.indexOf("(") > 0) {
                    debugger;
                    console.info(rdds[i]);
                }
                if (evalStr.indexOf(prefix) === 0) {
                    this.newTableName = evalStr.substring(prefix.length);
                    break;
                }
            }
        }
        this.value = value;
        this.parent;
        this.children = [];
        return (this);
    }

    function sendPost(action, struct) {
        var deferred = jQuery.Deferred();
        jQuery.ajax({
            type: 'POST',
            data: JSON.stringify(struct),
            contentType: 'application/json',
            url: "http://seaborg.int.xcalar.com:12127/" + action,
            success: function(data) {
                if (data.status === 200) {
                    try {
                        deferred.resolve(JSON.parse(data.stdout));
                    } catch (e) {
                        deferred.reject(e);
                        console.error(e);
                    }
                } else {
                    deferred.reject(data);
                    console.error(data);
                }
            },
            error: function(error) {
                deferred.reject(error);
                console.error(error);
            }
        });
        return deferred.promise();
    }

    SQLCompiler.publishTable = function(xcalarTableName, sqlTableName) {
        tableLookup[sqlTableName] = xcalarTableName;
    };

    SQLCompiler.getAllPublishedTables = function() {
        return tableLookup;
    };

    SQLCompiler.genTree = function(parent, array) {
        var newNode = new TreeNode(array.shift());
        if (parent) {
            newNode.parent = parent;
        }
        for (var i = 0; i < newNode.value["num-children"]; i++) {
            newNode.children.push(SQLCompiler.genTree(newNode, array));
        }
        return newNode;
    };

    SQLCompiler.prototype = {
        compile: function(sqlQueryString) {
            var self = this;
            var promiseArray = [];
            function traverseAndPushDown(node) {
                for (var i = 0; i < node.children.length; i++) {
                    traverseAndPushDown(node.children[i]);
                }
                if (node.value.class.indexOf(
                    "org.apache.spark.sql.catalyst.plans.logical.") === 0) {
                    promiseArray.push(pushDown.bind(self, node));
                }
            }
            function pushDown(treeNode) {
                var deferred = jQuery.Deferred();
                var retStruct;

                var treeNodeClass = treeNode.value.class.substring(
                    "org.apache.spark.sql.catalyst.plans.logical.".length);
                switch(treeNodeClass) {
                    case("Project"):
                        retStruct = self._pushDownProject(treeNode);
                        break;
                    case("Filter"):
                        retStruct = self._pushDownFilter(treeNode);
                        break;
                    case("Join"):
                        retStruct = self._pushDownJoin(treeNode);
                        break;
                    case("Sort"):
                        retStruct = self._pushDownSort(treeNode);
                        break;
                    case("Aggregate"):
                        retStruct = self._pushDownAggregate(treeNode);
                        break;
                    case("LocalLimit"):
                        retStruct = self._pushDownLocalLimit(treeNode);
                        break;
                    case("GlobalLimit"):
                        retStruct = self._pushDownGlobalLimit(treeNode);
                        break;
                    default:
                        break;
                }
                retStruct
                .then(function(ret) {
                    if (ret.newTableName) {
                        treeNode.newTableName = ret.newTableName;
                    }
                    treeNode.xccli = ret.cli;
                    deferred.resolve();
                })
                .fail(deferred.reject);
                return deferred.promise();
            }

            function getCli(node, cliArray) {
                for (var i = 0; i < node.children.length; i++) {
                    getCli(node.children[i], cliArray);
                }
                if (node.value.class.indexOf(
                    "org.apache.spark.sql.catalyst.plans.logical.") === 0) {
                    cliArray.push(node.xccli);
                }
            }

            sendPost("getQueryJson", {"queryString": sqlQueryString})
            .then(function(jsonArray) {
                var tree = SQLCompiler.genTree(undefined, jsonArray);
                traverseAndPushDown(tree);
                PromiseHelper.chain(promiseArray)
                .then(function() {
                    // Tree has been augmented with xccli
                    var cliArray = [];
                    getCli(tree, cliArray);
                    var queryString = cliArray.join("");
                    //queryString = queryString.replace(/\\/g, "\\");
                    console.log(queryString);
                    self.sqlObj.run(queryString, tree.newTableName);
                });
            });


        },
        _pushDownProject: function(node) {
            // Pre: Project must only have 1 child and its child should've been
            // resolved already
            var self = this;
            var deferred = jQuery.Deferred();
            assert(node.children.length === 1);
            var tableName = node.children[0].newTableName;
            // Find columns to project
            var columns = [];
            var evalStrArray = [];
            for (var i = 0; i<node.value.projectList.length; i++) {
                var colNameStruct;
                var colName;

                if (node.value.projectList[i].length > 1 ) {
                    assert(node.value.projectList[i][0].class ===
                    "org.apache.spark.sql.catalyst.expressions.Alias");
                    var evalStr = genEvalStringRecur(
                        SQLCompiler.genTree(undefined,
                        node.value.projectList[i].slice(1)));
                    var newColName = node.value.projectList[i][0].name;
                    evalStrArray.push({newColName: newColName,
                                       evalStr: evalStr});
                    colName = newColName;
                } else {
                    colNameStruct = node.value.projectList[i][0];
                    assert(colNameStruct.class ===
                "org.apache.spark.sql.catalyst.expressions.AttributeReference");
                    colName = colNameStruct.name;

                }

                columns.push(colName);
            }

            if (evalStrArray.length > 0) {
                var mapStrs = evalStrArray.map(function(o) {return o.evalStr;});
                var newColNames = evalStrArray.map(function(o) {
                    return o.newColName;
                });
                var newTableName = xcHelper.getTableName(tableName) +
                               Authentication.getHashId();

                var cli;
                self.sqlObj.map(mapStrs, tableName, newColNames,
                    newTableName)
                .then(function(ret) {
                    cli = ret.cli;
                    return self.sqlObj.project(columns, newTableName);
                })
                .then(function(ret) {
                    deferred.resolve({newTableName: newTableName,
                                      cli: cli + ret.cli});
                });
            } else {
                self.sqlObj.project(columns, tableName)
                .then(deferred.resolve);
            }
            return deferred.promise();
        },

        _pushDownFilter: function(node) {
            var self = this;
            assert(node.children.length === 1);
            var deferred = jQuery.Deferred();
            var filterString = genEvalStringRecur(SQLCompiler.genTree(undefined,
                node.value.condition.slice(0)));
            var tableName = node.children[0].newTableName;

            return self.sqlObj.filter(filterString, tableName);
        },

        _pushDownJoin: function(node) {
            var self = this;
            assert(node.children.length === 2); // It's a join. So 2 kids only

            var condTree = SQLCompiler.genTree(undefined,
                node.value.condition.slice(0));

            // NOTE: The full supportability of Xcalar's Join is represented by
            // a tree where if we traverse from the root, it needs to be AND all the
            // way and when it's not AND, it must be an EQ (stop traversing subtree)
            // For EQ subtrees, the left tree must resolve to one of the tables
            // and the right tree must resolve to the other. Otherwise it's not an
            // expression that we can support.
            // The statements above rely on the behavior that the SparkSQL
            // optimizer will hoist join conditions that are essentially filters
            // out of the join clause. If this presumption is violated, then the
            // statements above no longer hold

            // Check AND conditions and take note of all the EQ subtrees
            var eqSubtrees = [];
            var andSubtrees = [];
            if (condTree.value.class ===
                "org.apache.spark.sql.catalyst.expressions.And") {
                andSubtrees.push(condTree);
            } else if (condTree.value.class ===
                "org.apache.spark.sql.catalyst.expressions.EqualTo") {
                eqSubtrees.push(condTree);
            } else {
                // Can't do it :(
                assert(0);
                return deferred.resolve("Cannot do it;");
            }

            while (andSubtrees.length > 0) {
                var andTree = andSubtrees.shift();
                assert(andTree.children.length === 2);
                for (var i = 0; i < andTree.children.length; i++) {
                    if (andTree.children[i].value.class ===
                        "org.apache.spark.sql.catalyst.expressions.And") {
                        andSubtrees.push(andTree.children[i]);
                    } else if (andTree.children[i].value.class ===
                        "org.apache.spark.sql.catalyst.expressions.EqualTo") {
                        eqSubtrees.push(andTree.children[i]);
                    } else {
                        // Can't do it :(
                        assert(0);
                        return deferred.resolve("Cannot do it;");
                    }
                }
            }

            // children[0] === leftTable
            // children[1] === rightTable
            // Get all columns in leftTable and rightTable because in the eval
            // string, it can be in either order. For example:
            // WHERE t1.col1 = t2.col2 and t2.col3 = t1.col4
            var leftRDDCols = [];
            var rightRDDCols = [];
            getAllCols(node.children[0], leftRDDCols);
            getAllCols(node.children[1], rightRDDCols);

            // Check all EQ subtrees and resolve the maps
            var leftTableName = node.children[0].newTableName;
            var rightTableName = node.children[1].newTableName;

            var newLeftTableName = leftTableName;
            var newRightTableName = rightTableName;

            var leftCols = [];
            var rightCols = [];

            var mapArray = [];
            var xcSQLObj = new SQLApi();
            var cliArray = [];

            while (eqSubtrees.length > 0) {
                var eqTree = eqSubtrees.shift();
                assert(eqTree.children.length === 2);

                var attributeReferencesOne = [];
                var attributeReferencesTwo = [];
                getAttributeReferences(eqTree.children[0],
                                       attributeReferencesOne);
                getAttributeReferences(eqTree.children[1],
                                       attributeReferencesTwo);

                if (xcHelper.arraySubset(attributeReferencesOne, leftRDDCols) &&
                    xcHelper.arraySubset(attributeReferencesTwo, rightRDDCols))
                {
                    leftEvalStr = genEvalStringRecur(eqTree.children[0]);
                    rightEvalStr = genEvalStringRecur(eqTree.children[1]);
                } else if (xcHelper.arraySubset(attributeReferencesOne,
                                                rightRDDCols) &&
                           xcHelper.arraySubset(attributeReferencesTwo,
                                                leftRDDCols)) {
                    leftEvalStr = genEvalStringRecur(eqTree.children[1]);
                    rightEvalStr = genEvalStringRecur(eqTree.children[0]);
                } else {
                    assert(0);
                    console.error("can't do it :(");
                }

                if (leftEvalStr.indexOf("(") > 0) {
                    var tableId = Authentication.getHashId();
                    var sourceLeftTableName = newLeftTableName;

                    newLeftTableName = xcHelper.getTableName(leftTableName) +
                                       tableId;
                    var newColName = "XC_JOIN_COL_" + tableId.substring(3);
                    leftCols.push(newColName);
                    mapArray.push((function(evalS, sourceTbl, nColName,
                                            nTableName) {
                        var xcObj = this;
                        return (xcObj.map(evalS, sourceTbl, nColName,
                                          nTableName)
                        .then(function(retStruct) {
                            cliArray.push(retStruct.cli);
                        }));
                    }).bind(self.sqlObj, leftEvalStr, sourceLeftTableName,
                            newColName, newLeftTableName));
                } else {
                    leftCols.push(leftEvalStr);
                }
                if (rightEvalStr.indexOf("(") > 0) {
                    var tableId = Authentication.getHashId();
                    var sourceRightTableName = newRightTableName;

                    newRightTableName = xcHelper.getTableName(rightTableName) +
                                        tableId;
                    var newColName = "XC_JOIN_COL_" + tableId.substring(3);
                    rightCols.push(newColName);
                    mapArray.push((function(evalS, sourceTbl, nColName,
                                            nTableName) {
                        var xcObj = this;
                        return (xcObj.map(evalS, sourceTbl, nColName,
                                          nTableName)
                        .then(function(retStruct) {
                            cliArray.push(retStruct.cli);
                        }));
                    }).bind(self.sqlObj, rightEvalStr, sourceRightTableName,
                            newColName, newRightTableName));
                } else {
                    rightCols.push(rightEvalStr);
                }
            }

            var lTableInfo = {};
            lTableInfo.tableName = newLeftTableName;
            lTableInfo.columns = leftCols;
            lTableInfo.pulledColumns = [];
            lTableInfo.rename = [];

            var rTableInfo = {};
            rTableInfo.tableName = newRightTableName;
            rTableInfo.columns = rightCols;
            rTableInfo.pulledColumns = [];
            rTableInfo.rename = [];

            var joinType;
            switch (node.value.joinType.object) {
                case ("org.apache.spark.sql.catalyst.plans.Inner$"):
                    joinType = JoinOperatorT.InnerJoin;
                    break;
                case ("org.apache.spark.sql.catalyst.plans.LeftOuter$"):
                    joinType = JoinOperatorT.LeftOuterJoin;
                    break;
                case ("org.apache.spark.sql.catalyst.plans.RightOuter$"):
                    joinType = JoinOperatorT.RightOuterJoin;
                    break;
                case ("org.apache.spark.sql.catalyst.plans.FullOuter$"):
                    joinType = JoinOperatorT.FullOuterJoin;
                    break;
                default:
                    assert(0);
                    console.error("Join Type not supported");
                    break;
            }

            var deferred = jQuery.Deferred();

            PromiseHelper.chain(mapArray)
            .then(function(retStruct) {
                return self.sqlObj.join(joinType, lTableInfo, rTableInfo);
            })
            .then(function(ret) {
                ret.cli = cliArray.join("") + ret.cli;
                deferred.resolve(ret);
            });
            return deferred.promise();
        }
    };

    function genEvalStringRecur(condTree) {
        // Traverse and construct tree
        var outStr = "";
        var opName = condTree.value.class.substring(
            condTree.value.class.indexOf("expressions."));
        if (opName in opLookup) {
            if (opName !== "expressions.Cast") {
                outStr += opLookup[opName] + "(";
            } // For Cast, we only add the operator on the child
            for (var i = 0; i < condTree.value["num-children"]; i++) {
                outStr += genEvalStringRecur(condTree.children[i]);
                if (i < condTree.value["num-children"] -1) {
                    outStr += ",";
                }
            }
            outStr += ")";
            if (opName === "expressions.Substring") {
                // They use substr instead of substring. We must convert
                var regex = /(.*substring\(.*,)(\d*),(\d*)(\))/;
                var matches = regex.exec(outStr);
                var endIdx = 1 * matches[2] - 1 + 1 * matches[3];
                outStr = matches[1] + (1 * matches[2] - 1) + "," +
                         endIdx + matches[4];
            }
        } else {
            if (condTree.parent) {
                var parentOpName = condTree.parent.value.class.substring(
                    condTree.value.class.indexOf("expressions."));
                if (parentOpName === "expressions.Cast") {
                    switch (condTree.value.dataType) {
                        case ("double"):
                            outStr += "float(";
                            break;
                        case ("integer"):
                            outStr += "int(";
                            break;
                        case ("boolean"):
                            outStr += "bool(";
                            break;
                        case ("string"):
                        case ("date"):
                            outStr += "string(";
                            break;
                        default:
                            assert(0);
                            outStr += "string(";
                            break;
                    }
                }
            }
            if (condTree.value.class ===
               "org.apache.spark.sql.catalyst.expressions.AttributeReference") {
                // Column Name
                outStr += condTree.value.name;
            } else if (condTree.value.class ===
                "org.apache.spark.sql.catalyst.expressions.Literal") {
                if (condTree.value.dataType === "string") {
                    outStr += '"' + condTree.value.value + '"';
                } else {
                    // XXX Check how they rep booleans
                    outStr += condTree.value.value;
                }
            }
            assert(condTree.value["num-children"] === 0);
        }
        return outStr;
    }

    function getTablesInSubtree(tree) {
        function getTablesRecur(subtree, tablesSeen) {
            if (subtree.value.class ===
                "org.apache.spark.sql.execution.LogicalRDD") {
                if (!(subtree.newTableName in tablesSeen)) {
                    tablesSeen.push(subtree.newTableName);
                }
            }
            for (var i = 0; i < subtree.children.length; i++) {
                getTablesRecur(subtree.children[i], tablesSeen);
            }
        }
        var allTables = [];
        getTablesRecur(tree, allTables);
        return allTables;
    }

    function getQualifiersInSubtree(tree) {
        function getQualifiersRecur(subtree) {
            if (subtree.value.class ===
               "org.apache.spark.sql.catalyst.expressions.AttributeReference") {
                if (!(subtree.value.qualifier in tablesSeen)) {
                    tablesSeen.push(subtree.value.qualifier);
                }
            }
            for (var i = 0; i < subtree.children.length; i++) {
                getQualifiersRecur(subtree.children[i]);
            }
        }
        var tablesSeen = [];
        getQualifiersRecur(tree);
        return tablesSeen;
    }

    function getAllCols(treeNode, arr) {
        if (treeNode.value.class ===
            "org.apache.spark.sql.execution.LogicalRDD") {
            for (var i = 0; i < treeNode.value.output.length; i++) {
                arr.push(treeNode.value.output[i][0].name);
            }
        }
        for (var i = 0; i < treeNode.children.length; i++) {
            getAllCols(treeNode.children[i], arr);
        }
    }

    function getAttributeReferences(treeNode, arr) {
        if (treeNode.value.class ===
            "org.apache.spark.sql.catalyst.expressions.AttributeReference") {
            if (arr.indexOf(treeNode.value.name) === -1) {
                arr.push(treeNode.value.name);
            }
        }
        for (var i = 0; i < treeNode.children.length; i++) {
            getAttributeReferences(treeNode.children[i], arr);
        }
    }

    return SQLCompiler;
}());