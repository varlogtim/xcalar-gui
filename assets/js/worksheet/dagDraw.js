window.DagDraw = (function($, DagDraw) {
    // DagDraw handles the initial drawing of tables and lines during
    // construction and drawing of lines during a collapse/expand, and drawing
    // during a save image action

    // constants
    var dagTableHeight = 40;
    var smallTableWidth = 26;
    var dagTableOuterHeight = dagTableHeight + 30;
    var condenseLimit = 15; // number of tables wide before we allow condensing
    // colors needed for drawing and saving canvas
    var lineColor = '#848484';
    var tableTitleColor = "#555555";
    var titleBorderColor = '#A5A5A5';
    var tableFontColor = '#6E6E6E';
    var operationFontColor = '#4D4D4D';
    var strokeWidth = 2; // 2px. make sure this is an even number. Or you have
                         // to start your path on a 0.5px thingy

    /* options:
        wsId: string, worksheet for dag image to belong to (used for placement)
        position: integer, used to place dag image
        atStartup: boolean, if true, will append instead of positioning image
    */
    // options: {savable: boolean}
    DagDraw.createDagImage = function(nodes, $container, options) {
        options = options || {};
        var lineageStruct;
        var hasError = false;
        var tree;
        var dagDepth;
        var dagImageHtml = "";
        var nodeIdMap = {};
        var yCoors = [0]; // stores list of depths of branch nodes
        // [0, 3, 5] corresponds to these coordinates: {0, 0}, {1, 3}, {2, 5}
        try {
            var lineageStruct = DagFunction.construct(nodes, options.tableId);
            tree = lineageStruct.tree;
            nodeIdMap = lineageStruct.nodeIdMap;
        } catch (err) {
            console.error(err);
            hasError = true;
        }
        var initialY = 0.2;
        var storedInfo = {
            x: 0,
            y: 0,
            height: initialY,
            width: 0,
            heightsDrawn: {0.2: true},
            condensedWidth: 0,
            groups: {},
            datasets: {},
            drawn: {}
        };

        if (!hasError) {
            var depth = 0;
            var condensedDepth = 0;
            dagDepth = getDagDepth(tree);
            var dagOptions = {condensed: dagDepth > condenseLimit};
            var isChildHidden = false; // is parent node in a collapsed state
            var group = [];

            try {
                setNodePositions(tree, storedInfo, depth, condensedDepth,
                                isChildHidden, group, initialY, null,
                                dagOptions);
                if (!storedInfo.heightsDrawn[storedInfo.height]) {
                    storedInfo.height--;
                }
                // adjust positions of nodes so that descendents will never be to
                // the left or parallel of their ancestors
                adjustNodePositions(tree, storedInfo);

                condenseHeight(tree, {}, yCoors, 0);
                // get new dagDepth after repositioning
                dagDepth = getDagDepth(tree);
                dagImageHtml += drawDagNode(tree, storedInfo, dagOptions, {});
            } catch (err) {
                console.error(err);
                hasError = true;
            }
        }

        var height = yCoors.length * dagTableOuterHeight + 30;
        var width = storedInfo.condensedWidth * Dag.tableWidth - 150;

        if (hasError) {
            dagImageHtml = '<div class="errorMsg">' + DFTStr.DFDrawError +
                            '</div>';
            $container.addClass('invalid error');
        } else if (height > Dag.canvasLimit || width > Dag.canvasLimit ||
            (height * width > Dag.canvasAreaLimit)) {
            dagImageHtml = '<div class="errorMsg">' + DFTStr.TooLarge +
                            '</div>';
            $container.addClass('tooLarge error');
        } else {
            dagImageHtml = '<div class="dagImageWrap"><div class="dagImage" ' +
                        'style="height: ' + height + 'px;width: ' + width +
                        'px;">' + dagImageHtml + '</div></div>';
        }

        $container.append(dagImageHtml);
        if ($container.find(".unexpectedNode").length) {
            $container.addClass("hasUnexpectedNode");
        }

        if (!$container.hasClass('error')) {
            var numNodes = Object.keys(nodeIdMap).length;
            drawAllLines($container, tree, numNodes, width, options);
        }

        var allDagInfo = {
            tree: tree,
            nodeIdMap: nodeIdMap,
            depth: dagDepth,
            groups: storedInfo.groups,
            condensedWidth: width,
            datasets: storedInfo.datasets
        };
        $container.data('allDagInfo', allDagInfo);
    };

    DagDraw.createSavableCanvas = function($dagWrap) {
        var deferred = jQuery.Deferred();
        var promises = [];
        var fullCanvas = true;
        var canvasClone = $dagWrap.find('canvas')[0];
        var canvas = createCanvas($dagWrap, fullCanvas);
        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = lineColor;
        drawSavableCanvasBackground(canvas, ctx, $dagWrap, canvasClone)
        .then(function() {

            var tableImage = new Image();
            var tableGrayImage = new Image();
            var tableICVImage = new Image();
            var dbImage = new Image();
            var expandImage = new Image();
            var eTableImage = new Image();
            tableImage.src = paths.dTable;
            eTableImage.src = paths.eTable;
            tableGrayImage.src = paths.dTableGray;
            tableICVImage.src = paths.dTableICV;
            dbImage.src = paths.dbDiamond;
            expandImage.src = paths.expandIcon;

            PromiseHelper.when.apply(window, [loadImage(tableImage),
                                    loadImage(tableGrayImage),
                                    loadImage(tableICVImage),
                                    loadImage(dbImage), loadImage(expandImage),
                                    loadImage(eTableImage)])
            .then(function() {
                $dagWrap.find('.dagTable').each(function() {
                    var $dagTable = $(this);
                    if (!$dagTable.parent().hasClass('hidden') &&
                        !$dagTable.parent().hasClass("tagHidden")) {
                        var top = Math.floor($dagTable.parent().position().top);
                        var left = Math.floor($dagTable.parent().position().left +
                                          $dagTable.position().left);
                        drawDagTableToCanvas($dagTable, ctx, top, left,
                                             tableImage, tableGrayImage,
                                             tableICVImage,
                                             dbImage, eTableImage);
                    }
                });

                $dagWrap.find('.actionType').each(function() {
                    var $actionType = $(this);
                    if (!$actionType.parent().hasClass('hidden') &&
                        !$actionType.parent().hasClass("tagHidden")) {
                        var top = Math.floor($actionType.parent().position().top) + 4;
                        var left = Math.floor($actionType.parent().position().left);
                        promises.push(drawDagActionTypeToCanvas(
                                            $actionType, ctx, top, left));
                    }
                });

                $dagWrap.find('.expandWrap:not(.expanded)').each(function() {
                    var $expandIcon = $(this);
                    var top = Math.floor($expandIcon.position().top);
                    var left = Math.floor($expandIcon.position().left);
                    drawExpandIconToCanvas($expandIcon, ctx, top, left, expandImage);
                });

                PromiseHelper.when.apply(window, promises)
                .then(function() {
                    $(canvas).hide();
                    deferred.resolve();
                })
                .fail(function() {
                    deferred.reject("Image loading error");
                });
            });
        });

        return (deferred.promise());
    };

    DagDraw.updateCanvasAfterWidthChange = function($dagWrap, tree, newWidth,
                                                    collapse, all) {
        var $dagImage = $dagWrap.find('.dagImage');
        $dagWrap.find('canvas').eq(0).remove();
        xcTooltip.hideAll();
        DagPanel.adjustScrollBarPositionAndSize();

        var canvas = createCanvas($dagWrap);
        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = strokeWidth;
        ctx.beginPath();

        if (collapse) {
            traverseAndDrawLines($dagImage, ctx, tree, newWidth, {});
        } else { // expanding
            traverseAndDrawLines($dagImage, ctx, tree, newWidth, {}, all);
        }

        ctx.stroke();
    };

    function parseAggFromEvalStr(evalStr) {
        var tables = [];
        if (!evalStr) {
            return tables;
        }
        var func = {args: []};
        try {
            ColManager.parseFuncString(evalStr, func);
            tables = getAggNamesFromFunc(func);
        } catch (err) {
            console.error("could not parse eval str", evalStr);
        }
        return tables;
    }

    function getAggNamesFromFunc(func) {
        var names = [];

        getNames(func.args);

        function getNames(args) {
            for (var i = 0; i < args.length; i++) {
                if (typeof args[i] === "string") {
                    if (args[i][0] !== "\"" &&
                        args[i][args.length - 1] !== "\"" &&
                        names.indexOf(args[i]) === -1 &&
                        args[i][0] === gAggVarPrefix &&
                        args[i].length > 1) {
                        names.push(args[i].slice(1));
                    }
                } else if (typeof args[i] === "object") {
                    getNames(args[i].args);
                }
            }
        }

        return (names);
    }

    function loadImage(img) {
        var deferred = jQuery.Deferred();
        img.onload = function() {
            deferred.resolve();
        };
        img.onerror = img.onload;
        return (deferred.promise());
    }

    function getDagDepth(node) {
        var maxDepth = 0;
        getDepthHelper(node, 0);

        function getDepthHelper(node, depth) {
            if (!node.value.display.isHiddenTag) {
                depth++;
            }

            maxDepth = Math.max(maxDepth, depth);
            for (var i = 0; i < node.parents.length; i++) {
                getDepthHelper(node.parents[i], depth);
            }
        }

        return (maxDepth);
    }

    // gets the depth of a branch after the initial positioning
    function getDagDepthPostPositioning(node, seen) {
        var origNode = node;
        var maxDepth = 0;
        var depth;
        getDepthHelper(node, 0);

        function getDepthHelper(node) {
            // this parent has already been seen but may be a lot further left
            // than its children so we take it's depth - 1 and subtract the
            // diff between the orig node's depth
            if (seen[node.value.dagNodeId]) {
                depth = node.value.display.depth - 1 -
                        (origNode.value.display.depth - 1);
                maxDepth = Math.max(maxDepth, depth);
                return;
            }

            for (var i = 0; i < node.parents.length; i++) {
                getDepthHelper(node.parents[i]);
            }

            // leaf node so we us the full expanded depth as the depth
            if (!node.parents.length) {
                depth = node.value.display.expandedDepth -
                        (origNode.value.display.expandedDepth - 1);
                maxDepth = Math.max(maxDepth, depth);
            }
        }

        return (maxDepth);
    }

    function drawSavableCanvasBackground(canvas, ctx, $dagWrap, canvasClone) {
        var deferred = jQuery.Deferred();
        var img = new Image();
        img.src = paths.dagBackground;
        img.onload = function() {
            var ptrn = ctx.createPattern(img, 'repeat');
            ctx.fillStyle = ptrn;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(canvasClone, -10, 50);
            ctx.save();
            var tableTitleText = $dagWrap.find('.tableTitleArea')
                                         .text();
            ctx.font = '600 15px Open Sans';
            ctx.fillStyle = tableTitleColor;
            ctx.fillText(tableTitleText, 30, 22);
            ctx.restore();

            ctx.beginPath();
            ctx.moveTo(20, 33);
            ctx.lineTo(canvas.width - 40, 33);
            ctx.strokeStyle = titleBorderColor;
            ctx.stroke();
            deferred.resolve();
        };

        img.onerror = img.onload;

        return (deferred.promise());
    }

    function drawDagTableToCanvas($dagTable, ctx, top, left, tImage, tGrayImage,
                                  tICVImage, dImage, eImage) {
        left += 35;
        top += 50;
        var iconLeft = left;
        var iconTop = top + 6;
        var maxWidth = 200;
        var tableImage;
        var x;

        if ($dagTable.hasClass('dataStore')) {
            tableImage = dImage;
            iconLeft -= 2;
            iconTop -= 4;
            maxWidth = 120;
            x = left - 42;
        } else {
            if ($dagTable.find(".icv").length) {
                tableImage = tICVImage;
            } else if (gShowDroppedTablesImage && $dagTable.hasClass('Dropped')) {
                tableImage = tGrayImage;
            } else if ($dagTable.hasClass("export") &&
                $dagTable.attr("data-advancedopts") === "default") {
                tableImage = eImage;
            } else {
                tableImage = tImage;
            }
            x = left - 89;
        }

        ctx.drawImage(tableImage, iconLeft, iconTop);

        var lineHeight = 12;

        var y = top + 38;
        var text = $dagTable.find('.tableTitle:visible').text();

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, maxWidth, 26);
        ctx.clip();
        ctx.font = 'bold 10px Open Sans';
        ctx.fillStyle = tableFontColor;
        ctx.textAlign = 'center';

        wrapText(ctx, text, x + (maxWidth / 2), y + 10, maxWidth, lineHeight);
    }

    function drawDagActionTypeToCanvas($actionType, ctx, top, left) {
        var deferred = jQuery.Deferred();
        left += 35;
        top += 50;
        var $dagIcon = $actionType.find('.dagIcon');
        var iconSource = $dagIcon.find('.icon').attr('class');
        var iconSourceSplit = iconSource.split(" ");
        var iconFound = false;

        for (var i = 0; i < iconSourceSplit.length; i++) {
            if (iconSourceSplit[i].indexOf('xi-') === 0) {
                iconSource = iconSourceSplit[i] + ".png";
                iconFound = true;
                break;
            }
        }

        if (!iconFound) {
            iconSource = "xi-unknown.png";
        }

        iconSource = paths.dfIcons + iconSource;

        var rectImage = new Image();
        rectImage.src = paths.roundedRect;

        rectImage.onload = function() {
            ctx.drawImage(rectImage, left + 20, top);

            if (iconSource !== "none") {
                var dagIcon = new Image();
                var iconLeft = left + 23;
                var iconTop = top + 7;
                dagIcon.src = iconSource;

                dagIcon.onload = function() {
                    ctx.drawImage(dagIcon, iconLeft, iconTop);
                    deferred.resolve();
                };
                dagIcon.onerror = function() {
                    var otherIcon = new Image();
                    otherIcon.src = paths.dfIcons + "xi-unknown.png";

                    otherIcon.onload = function() {
                        console.log('backup image used');
                        ctx.drawImage(otherIcon, iconLeft, iconTop);
                        deferred.resolve();
                    };
                    otherIcon.onerror = function() {
                        deferred.resolve();
                    };
                };
            }

            // first line text
            var maxWidth = 78;
            var lineHeight = 10;
            var x = left + 43;
            var y = top + 9;
            var text = $actionType.find('.typeTitle').text();
            text = text[0].toUpperCase() + text.slice(1);
            ctx.save();
            ctx.beginPath();
            ctx.rect(x - 3, y - 6, 76, 10);
            ctx.clip();
            ctx.font = 'bold 8px Open Sans';
            ctx.fillStyle = operationFontColor;

            wrapText(ctx, text, x, y, maxWidth, lineHeight);

            // text regarding table origin / parents
            y = top + 19;
            text = $actionType.find('.opInfoText').text();
            ctx.save();
            ctx.beginPath();
            ctx.rect(x - 3, y - 6, 76, 20);
            ctx.clip();
            ctx.font = 'bold 8px Open Sans';
            ctx.fillStyle = operationFontColor;

            wrapText(ctx, text, x, y, maxWidth, lineHeight);
            if (iconSource === "none") {
                deferred.resolve();
            }
        };

        rectImage.onerror = rectImage.onload;
        return (deferred.promise());
    }

    function drawExpandIconToCanvas($expandIcon, ctx, top, left, img) {
        ctx.drawImage(img, left + 35, top + 53);
        ctx.beginPath();
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = lineColor;
        ctx.stroke();
    }

    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        var words = text.split(/-| |\./);
        var line = '';
        var minLen = 20; // minimum text length needed for overflow;

        if (words.length === 1) {
            if (ctx.measureText(words[0]).width > maxWidth) {
                var textLen = xcHelper.getMaxTextLen(ctx, text, maxWidth - 7,
                                                     minLen, text.length);
                line = text.slice(0, textLen) + "...";
            } else {
                line = text;
            }
        } else {
            for (var n = 0; n < words.length; n++) {
                var testLine = line + words[n] + ' ';
                if (ctx.measureText(testLine).width > maxWidth && n > 0) {
                    ctx.fillText(line, x, y);
                    line = words[n] + ' ';
                    y += lineHeight;
                } else {
                    line = testLine;
                }
            }
        }

        ctx.fillText(line, x, y);
        ctx.restore();
    }

    function getSourceColNames(func) {
        var names = [];

        getNames(func.args);

        function getNames(args) {
            for (var i = 0; i < args.length; i++) {
                if (typeof args[i] === "string") {
                    if (args[i][0] !== "\"" &&
                        args[i][args.length - 1] !== "\"" &&
                        names.indexOf(args[i]) === -1) {
                        names.push(args[i]);
                    }
                } else if (typeof args[i] === "object") {
                    getNames(args[i].args);
                }
            }
        }

        return (names);
    }

    function getRenamedColName(colName, node) {
        if (node.value.struct.renameMap && node.value.struct.renameMap.length) {
            var renameMap = node.value.struct.renameMap;
            var parsedName = xcHelper.parsePrefixColName(colName);

            for (var i = 0; i < renameMap.length; i++) {
                if (renameMap[i].type === DfFieldTypeT.DfFatptr) {
                    if (parsedName.prefix &&
                        renameMap[i].newName === parsedName.prefix) {
                        return xcHelper.getPrefixColName(renameMap[i].oldName,
                                                         parsedName.name);
                    }
                } else if (renameMap[i].newName === colName) {
                    return renameMap[i].oldName;
                }
            }
        }
        return colName;
    }

    function getTags(node) {
        if (!node.value.tag) {
            return [];
        }
        return node.value.tag.split(",");
    }

    // returns tagName if one of tags id matches tableName's id
    function checkIsTagHeader(tags, tableName) {
        var tableId = xcHelper.getTableId(tableName);
        for (var i = 0; i < tags.length; i++) {
            var tagId = xcHelper.getTableId(tags[i]);
            if (tagId && tagId === tableId) {
                return tags[i];
            }
        }
        return null;
    }

    // if  node has multiple children and one of the children doesn't have a tag
    // that matches that node, that node will not be hidden tag
    function checkIsNodeHiddenTag(tags, node) {
        var isHiddenTag;
        var numChildren = node.children.length;
        if (numChildren === 1) {
            isHiddenTag = true;
        } else {
            isHiddenTag = true;
            for (var i = 0; i < numChildren; i++) {
                var child = node.children[i];
                var childTags = getTags(child);
                var matchFound = false;
                for (var j = 0; j < childTags.length; j++) {
                    if (tags.indexOf(childTags[j]) > -1) {
                        matchFound = true;
                        break;
                    }
                }
                if (!matchFound) {
                    isHiddenTag = false;
                    break;
                }
            }
        }
        return isHiddenTag;
    }

    function getOpFromTag(tag) {
        return tag.split("#")[0];
    }

    function nodeShouldBeCondensed(node) {
        return (!node.value.display.isHiddenTag &&
            node.parents.length === 1 && node.children.length === 1 &&
            node.parents[0].children.length === 1 &&
            !node.children[0].value.display.isHiddenTag &&
            node.children[0].parents.length === 1);
    }

    // calculates position of nodes and if they're hidden
    function setNodePositions(node, storedInfo, depth, condensedDepth,
                             isChildHidden, group, yCoor, currTag, options) {
        var numParents = node.parents.length;
        var numChildren = node.children.length;
        var accumulatedDrawings = "";
        var newCondensedDepth = condensedDepth;
        var isTagHeader = false;
        var tags = getTags(node);
        var tagHeader = checkIsTagHeader(tags, node.value.name);
        node.value.tags = tags;
        node.value.display.isChildHidden = isChildHidden;

        if (tagHeader) {
            isTagHeader = true;
            currTag = tagHeader;
            node.value.display.tagHeader = true;
        } else if (tags.indexOf(currTag) === -1) {
            currTag = null;
        }

        if ((tags.indexOf(currTag) > -1) && !isTagHeader) {
            node.value.display.isHiddenTag = checkIsNodeHiddenTag(tags, node);
        } else {
            node.value.display.isHiddenTag = false;
        }

        // do not hide if child is hidden
        if (options.condensed && nodeShouldBeCondensed(node)) {
            node.value.display.isHidden = true;

            // first node in a group of hidden nodes
            if (!isChildHidden) {
                newCondensedDepth += Dag.condenseOffset;
                for (var i = 0; i < node.children.length; i++) {
                    node.children[i].value.display.isParentHidden = true;
                }
            }
        } else if (!node.value.display.isHiddenTag) {
            newCondensedDepth++;
            node.value.display.isHidden = false;
        } //  if hiddenTag, do not increase depth

        var newDepth = depth;
        if (!node.value.display.isHiddenTag) {
            newDepth++;
            storedInfo.heightsDrawn[yCoor] = true;
        }

        storedInfo.condensedWidth = Math.max(storedInfo.condensedWidth,
                                             newCondensedDepth);

        // recursive call of setNodePosition on node's parents
        for (var i = 0; i < numParents; i++) {
            var parentNode = node.parents[i];
            if (!storedInfo.drawn[parentNode.value.dagNodeId]) {
                if (i > 0 && storedInfo.heightsDrawn[storedInfo.height]) {
                    storedInfo.height++;
                }
                setNodePositions(parentNode, storedInfo, newDepth,
                               newCondensedDepth, node.value.display.isHidden,
                               group, storedInfo.height, currTag, options);
            }
        }

        storedInfo.drawn[node.value.dagNodeId] = true;


        node.value.display.x = Math.round(condensedDepth * Dag.tableWidth);
        node.value.display.y = Math.round(yCoor * dagTableOuterHeight);
        node.value.display.depth = condensedDepth;
        node.value.display.expandedDepth = depth;
        node.value.display.condensedDepth = condensedDepth;

        if (node.value.display.isHidden) {
            group.push(node); // push hidden node into group
            if (!isChildHidden) {
                // furthest to the right of all the hidden tables in its group
                node.value.display.hiddenLeader = true;
                node.value.display.x += (Dag.condenseOffset * Dag.tableWidth);
                var groupId = node.children[0].value.dagNodeId;
                var groupCopy = [];
                var numHiddenTags = 0;
                for (var i = 0; i < group.length; i++) {
                    groupCopy.push(group[i]);
                    if (group[i].value.display.isHiddenTag) {
                        numHiddenTags++;
                    }
                }
                storedInfo.groups[groupId] = {
                    "collapsed": true,
                    "group": groupCopy,
                    numHiddenTags: numHiddenTags
                };
                group.length = 0; // empty out group array
            }
        }
    }

    // XXX can optimize this function
    // adjust positions of nodes so that descendents will never be to the left
    // of their ancestors
    function adjustNodePositions(node, storedInfo) {
        for (var i = 0; i < node.parents.length; i++) {
            var parent = node.parents[i];
            if (!node.value.display.isHidden &&
                !node.value.display.isHiddenTag &&
                node.value.display.depth > parent.value.display.depth - 1) {
                var diff = node.value.display.depth -
                           parent.value.display.depth;
                var expandDiff = node.value.display.expandedDepth -
                                 parent.value.display.expandedDepth;
                var seen = {};
                adjustNodePositionsHelper(parent, diff + 1,
                                          expandDiff + 1, storedInfo, seen);
            }
            adjustNodePositions(parent, storedInfo);
        }
    }


    function adjustNodePositionsHelper(node, amount, expandAmount, storedInfo,
                                       seen) {
        if (seen[node.value.dagNodeId]) {
            return;
        }
        seen[node.value.dagNodeId] = true;
        node.value.display.condensedDepth += amount;
        node.value.display.depth += amount;
        node.value.display.expandedDepth += expandAmount;
        node.value.display.x += (amount * Dag.tableWidth);

        storedInfo.condensedWidth = Math.max(storedInfo.condensedWidth,
                                             node.value.display.depth + 1);

        for (var i = 0; i < node.parents.length; i++) {
            var parentNode = node.parents[i];
            var amountDiff = parentNode.value.display.depth -
                             node.value.display.depth;
            var expandAmountDiff = parentNode.value.display.expandedDepth -
                                    node.value.display.expandedDepth;
            var newAmount = amount;
            var newExpandAmount = expandAmount;
            // decrease the amount we're shifting each table if there's extra
            // space between 2 tables
            if (amountDiff + amount > 1) {
                newAmount = amount - (amountDiff + amount - 1);
            }
            if (expandAmountDiff + expandAmount > 1) {
                newExpandAmount = expandAmount - (expandAmountDiff + expandAmount - 1);
            }
            if (newAmount && newExpandAmount) {
                adjustNodePositionsHelper(node.parents[i], newAmount, newExpandAmount,
                                      storedInfo, seen);
            }
        }
    }

    // this function allows separate branches to share the same y coor as long
    // as none of the nodes overlap. We check to see if the left side of a
    // branch overlaps with the right side of an existing branch
    // "coors" stores list of depths of branch nodes
    // [0, 3, 5] corresponds to these coordinates: {0, 0}, {1, 3}, {2, 5}
    function condenseHeight(node, seen, coors, YCoor) {
        seen[node.value.dagNodeId] = true;
        node.value.display.y = Math.round((YCoor + 0.2) * dagTableOuterHeight);
        for (var i = 0; i < node.parents.length; i++) {
            var parentNode = node.parents[i];
            var nextYCoor = YCoor + i;
            if (!seen[parentNode.value.dagNodeId]) {
                if (i > 0) {
                    var branchDepth = getDagDepthPostPositioning(parentNode,
                                                                 seen);
                    var leafDepth = branchDepth + node.value.display.depth;
                    for (var j = coors.length - 1; j >= 0; j--) {
                        if (leafDepth > coors[j]) {
                            nextYCoor = j + 1;
                            break;
                        }
                    }
                    var depth = node.value.display.depth;
                    for (var j = 0; j < parentNode.children.length; j++) {
                        if (parentNode.children[j].value.display.depth < depth){
                            depth = parentNode.children[j].value.display.depth;
                        }
                    }
                    coors[nextYCoor] = depth;
                }
                condenseHeight(parentNode, seen, coors, nextYCoor);
            }
        }
    }

    function drawDagNode(node, storedInfo, options, drawn) {
        var html = "";
        html += drawDagTable(node, node.value.display.isChildHidden, storedInfo,
                                node.value.display.y, node.value.display.x,
                                options);
        drawn[node.value.dagNodeId] = true;
        if (node.value.display.isHidden && !node.value.display.isChildHidden) {
            var groupId = node.children[0].value.dagNodeId;
            var group = storedInfo.groups[groupId];
            var numHidden = group.numHiddenTags;
            group = group.group;
            var right = node.value.display.x - (Dag.condenseOffset * Dag.tableWidth);
            html += getCollapsedHtml(group, node.value.display.y, right,
                                        node.value.display.condensedDepth,
                                         groupId, numHidden);
        }

        for (var i = 0; i < node.parents.length; i++) {
            var parent = node.parents[i];
            if (!drawn[parent.value.dagNodeId]) {
                html += drawDagNode(parent, storedInfo, options, drawn);
            }
        }

        return html;
    }

    function drawDagTable(node, isChildHidden, storedInfo, top, right, options)
    {
        var key = DagFunction.getInputType(XcalarApisTStr[node.value.api]);
        var dagInfo = getDagNodeInfo(node, key);
        var tableName = node.value.name;
        var html = "";
        var outerClasses = "";
        var tableClasses = "";
        var iconClasses = "";
        var icon = "xi-table-2";
        var dataAttrs = "";
        var titleClasses = "";
        var tableTitle = "";
        var tableTitleTip = "";
        var extraIcon = "";
        var extraTitle = "";
        var tooltipTxt = "";

        if (options.condensed && node.value.display.isHidden) {
            outerClasses += "hidden ";
        }
        if (node.value.display.isHiddenTag) {
            outerClasses += "tagHidden ";
        }

        var dagOpHtml = getDagOperationHtml(node, dagInfo);
        html += '<div class="dagTableWrap clearfix ' + outerClasses + '" ' +
                        'style="top:' + top + 'px;' +
                        'right: ' + right + 'px;">'+
                        dagOpHtml;

        if (dagInfo.state === DgDagStateTStr[DgDagStateT.DgDagStateDropped]) {
            tooltipTxt = xcHelper.replaceMsg(TooltipTStr.DroppedTable,
                        {"tablename": tableName});
        } else {
            tooltipTxt = CommonTxtTstr.ClickToOpts;
        }
        tableClasses += dagInfo.state + " ";

        // check for datastes
        if (dagOpHtml === "") {
            var pattern = "";
            var tId = dagInfo.id;
            var originalTableName = tableName;
            var dsText = "";
            if (tableName.indexOf(gDSPrefix) === 0) {
                tableName = tableName.substr(gDSPrefix.length);
            }
            if (node.value.api === XcalarApisT.XcalarApiExecuteRetina) {
                tableClasses += "retina ";
                tId = xcHelper.getTableId(tableName);
            } else if (node.value.api === XcalarApisT.XcalarApiBulkLoad) {
                dsText = "Dataset ";
                icon = 'xi_data';
                storedInfo.datasets[tableName] = dagInfo;
                pattern = dagInfo.loadInfo.loadArgs.fileNamePattern;
            } else {
                console.error("unexpected node", "api: " + node.value.api);
                tableClasses += "unexpectedNode ";
                tId = xcHelper.getTableId(tableName);
            }
            tableClasses += "dataStore ";
            iconClasses += "dataStoreIcon ";
            dataAttrs += 'data-table="' + originalTableName + '" ' +
                        'data-type="dataStore" ' +
                        'data-id="' + tId + '" ' +
                        'data-url="' + encodeURI(dagInfo.url) + '" ' +
                        'data-pattern="' + encodeURI(pattern) + '"';
            tableTitle = dsText + tableName;
            tableTitleTip = tableName;
        } else {
            if (node.value.struct.icvMode) {
                iconClasses += "icv ";
                icon = "xi-table-error2";
            }
            tableClasses += "typeTable ";
            iconClasses += "dagTableIcon ";
            var tableId = xcHelper.getTableId(tableName);
            dataAttrs += 'data-id="' + tableId + '"';
            titleClasses += "exportFileName ";

            if (node.value.api === XcalarApisT.XcalarApiExport) {
                tableClasses += "export ";
                extraIcon = '<i class="icon xi-data-out"></i>';
                tableTitle = xcHelper.stripCSVExt(tableName);
                tableTitleTip = tableTitle;
                extraTitle = '<span class="tableTitle exportTableName" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="bottom" ' +
                                'data-container="body" ' +
                                'title="' + tableTitleTip + '">' +
                                tableTitle +
                                '</span>';
            } else {
                tableTitle = tableName;
                tableTitleTip = tableTitle;
            }
        }
        tableTitleTip += " " + dagInfo.tag;

        html += '<div class="dagTable ' + tableClasses + '" ' +
                    'data-tablename="' + tableName + '" ' +
                    'data-index="' + node.value.dagNodeId + '" ' +
                    'data-nodeid="' + dagInfo.id + '" ' +
                    dataAttrs + '>' +
                        '<div class="' + iconClasses + '" ' +
                        'data-toggle="tooltip" ' +
                        'data-placement="top" ' +
                        'data-container="body" ' +
                        'title="' + tooltipTxt + '"' +
                        '></div>' +
                        extraIcon +
                        '<i class="icon ' + icon + '"></i>'+
                        '<span class="tableTitle ' + titleClasses + '" ' +
                            'data-toggle="tooltip" ' +
                            'data-placement="bottom" ' +
                            'data-container="body" ' +
                            'data-original-title="' + tableTitleTip + '">' +
                            tableTitle+
                        '</span>' +
                        extraTitle +
                    '</div>';
        html += '</div>';

        return (html);
    }

    function getDagOperationHtml(node, info) {
        var originHTML = "";
        var numParents = node.value.numParents;
        if (!numParents) {
            return originHTML;
        }

        var key = info.tag;
        var opText = info.opText;
        var operation = info.operation;

        var resultTableName = node.value.name;
        if (info.type === "sort") {
            operation = "sort";
        } else if (info.type === "createTable") {
            operation = "Create Table";
        }

        originHTML += '<div class="actionType dropdownBox ' + operation + '" ' +
                    'data-type="' + operation + '" ' +
                    'data-info="' + info.text + '" ' +
                    'data-column="' + info.column + '" ' +
                    'data-table="' + resultTableName + '"' +
                    'data-id="' + info.id + '" ' +
                    'data-toggle="tooltip" data-placement="top" ' +
                    'data-container="body" title="' + info.tooltip + '">' +
                        '<div class="actionTypeWrap" >' +
                            '<div class="dagIcon ' + operation + ' ' +
                                info.type + '">' +
                                getIconHtml(operation, info) +
                            '</div>' +
                            '<span class="typeTitle">' + operation + '</span>' +
                            '<span class="opInfoText">' + opText + '</span>' +
                        '</div>' +
                    '</div>';

        return (originHTML);
    }

    function getCollapsedHtml(group, top, right, depth, groupId, numHidden) {
        var html = "";
        var tooltip;
        var groupLength = group.length - numHidden;
        if (groupLength === 0) {
            return "";
        }

        if (groupLength === 1) {
            tooltip = TooltipTStr.CollapsedTable;
        } else {
            tooltip = xcHelper.replaceMsg(TooltipTStr.CollapsedTables,
                        {number: groupLength + ""});
        }

        var groupWidth = groupLength * Dag.tableWidth + 11;
        // condensedId comes from the index of the child of rightmost
        // hidden table
        html += '<div class="expandWrap horz" ' +
                        'style="top:' + (top + 5) + 'px;right:' + right +
                        'px;" ' +
                        'data-depth="' + depth + '" ' +
                        'data-index="' + groupId + '" ' +
                        'data-toggle="tooltip" ' +
                        'data-placement="top" ' +
                        'data-container="body" ' +
                        'data-size=' + groupLength + ' ' +
                        'title="' + tooltip + '">...</div>';
        html += '<div class="groupOutline" ' +
                        'style="top:' + top + 'px;right:' +
                            (right - Dag.groupOutlineOffset) +
                            'px;width:' + groupWidth + 'px;" ' +
                        'data-index="' + groupId + '"></div>';

        return html;
    }

    function getIconHtml(operation, info) {
        var type = info.type;
        var iconClass = "";
        switch (operation) {
            case ("map"):
            case (SQLOps.SplitCol):
            case (SQLOps.ChangeType):
                iconClass = "data-update";
                break;
            case ("filter"):
                iconClass = getFilterIconClass(type);
                break;
            case ("groupBy"):
                iconClass = "groupby";
                break;
            case ("aggregate"):
                iconClass = "aggregate";
                break;
            case ("Create Table"):
                iconClass = "index";
                break;
            case ("index"):
                iconClass = "index";
                break;
            case ("join"):
                iconClass = getJoinIconClass(type);
                break;
            case ("project"):
                iconClass = "delete-column";
                break;
            case ("sort"):
                if (info.order === "ascending") {
                    iconClass = "arrowtail-up";
                } else {
                    iconClass = "arrowtail-down";
                }
                break;
            case ("export"):
                iconClass="pull-all-field";
                break;
            default:
                iconClass = "unknown";
                break;
        }

        return '<i class="icon xi-' + iconClass + '"></i>';
    }

    /*
    icons we need

    gt, ge, lt, le
    regex
    not equal
    index should be like old icon
     */

    function getFilterIconClass(type) {
        var iconClass = "filter";
        switch (type) {
            case ("filtergt"):
                iconClass += "-greaterthan";
                break;
            case ("filterge"):
                iconClass += "-greaterthan-equalto";
                break;
            case ("filtereq"):
                iconClass += "-equal";
                break;
            case ("filterlt"):
                iconClass += "-lessthan";
                break;
            case ("filterle"):
                iconClass += "-lessthan-equalto";
                break;
            case ("filternot"):
                iconClass += "-not-equal";
                break;
            case ("filterregex"):
            case ("filterlike"):
            case ("filterothers"):
                break;
            default:
                break;
        }
        return iconClass;
    }

    function getJoinIconClass(type) {
        var iconClass = "";
        switch (type) {
            case ("inner"):
                iconClass = "join-inner";
                break;
            case ("fullOuter"):
                iconClass = "join-outer";
                break;
            case ("left"):
                iconClass = "oin-leftouter"; // icon name has mispelling
                break;
            case ("right"):
                iconClass = "join-rightouter";
                break;
            default:
                iconClass = "join-inner";
                break;
        }
        return iconClass;
    }

    function getDagNodeInfo(node, key) {
        var parenIndex;
        var commaIndex;
        var filterType;
        var evalStr;
        var value = node.value.struct;
        var info = {
            type: "unknown",
            text: "",
            opText: "",
            operation: "",
            tooltip: "",
            column: "",
            id: node.value.dagNodeId,
            state: DgDagStateTStr[node.value.state],
            tag: node.value.tag
        };
        var parentNames = node.getSourceNames(true);
        var taggedInfo;
        if (node.value.display.tagHeader && node.value.tags.length === 1) {
            taggedInfo = setTaggedOpInfo(info, value, node);
        } else {
            info.operation = DagFunction.getInputType(XcalarApisTStr[node.value.api]);
            info.operation = info.operation.slice(0, info.operation.length - 5);
        }

        if (!taggedInfo) {
            switch (key) {
                case ('aggregateInput'):
                    evalStr = value.evalStr;
                    info.type = "aggregate" + evalStr.slice(0, evalStr.indexOf('('));
                    info.text = evalStr;
                    info.tooltip = "Aggregate: " + evalStr;
                    info.column = evalStr.slice(evalStr.indexOf('(') + 1,
                                                evalStr.lastIndexOf(')'));
                    info.opText = info.column;
                    break;
                case ('loadInput'):
                    info.url = value.dataset.url;
                    var loadInfo = xcHelper.deepCopy(value);
                    info.loadInfo = loadInfo;
                    loadInfo.url = loadInfo.dataset.url;
                    loadInfo.format = DfFormatTypeTStr[loadInfo.dataset.formatType];
                    loadInfo.name = loadInfo.dataset.name;
                    if (loadInfo.loadArgs) {
                        loadInfo.loadArgs.udf = loadInfo.loadArgs.udfLoadArgs
                                                        .fullyQualifiedFnName;
                        delete loadInfo.loadArgs.udfLoadArgs;
                    }

                    delete loadInfo.dataset;
                    delete loadInfo.dagNodeId;
                    break;
                case ('filterInput'):
                    var filterStr = value.filterStr;
                    parenIndex = filterStr.indexOf("(");
                    var abbrFilterType = filterStr.slice(0, parenIndex);

                    info.type = "filter" + abbrFilterType;
                    info.text = filterStr;
                    filterType = "";
                    var filterTypeMap = {
                        "gt": "greater than",
                        "ge": "reater than or equal to",
                        "eq": "equal to",
                        "lt": "less than",
                        "le": "less than or equal to",
                        "regex": "regex",
                        "like": "like",
                        "not": "not"
                    };

                    if (filterTypeMap[abbrFilterType]) {
                        var filteredOn = filterStr.slice(parenIndex + 1,
                                                         filterStr.indexOf(','));
                        filterType = filterTypeMap[abbrFilterType];
                        var filterValue = filterStr.slice(filterStr.indexOf(',') + 2,
                                                          filterStr.lastIndexOf(')'));

                        info.column = filteredOn;
                        if (filterType === "regex") {
                            info.tooltip = "Filtered table &quot;" + parentNames[0] +
                                           "&quot; using regex: &quot;" +
                                           filterValue + "&quot; " + "on " +
                                           filteredOn + ".";
                        } else if (filterType === "not") {
                            filteredOn = filteredOn.slice(filteredOn.indexOf("(") + 1);
                            filterValue = filterValue
                                            .slice(0, filterValue.lastIndexOf(')'));
                            info.column = filteredOn;
                            if (filteredOn.indexOf(")") > -1) {
                                info.tooltip = "Filtered table &quot;" + parentNames[0] +
                                           "&quot; where " + filteredOn +
                                           " is " + filterType + " " +
                                           filterValue + ".";
                            } else {
                                commaIndex = filterStr.indexOf(',');
                                if (commaIndex !== -1) {
                                    info.column = filterStr
                                                  .slice(parenIndex + 1, commaIndex)
                                                  .trim();
                                } else {
                                    info.column = filterStr
                                                  .slice(parenIndex + 1,
                                                         filterStr.lastIndexOf(')'))
                                                  .trim();
                                }
                                info.tooltip = "Filtered table &quot;" + parentNames[0] +
                                                "&quot;: " + filterStr;
                            }

                        } else {
                            info.tooltip = "Filtered table &quot;" + parentNames[0] +
                                           "&quot; where " + filteredOn +
                                           " is " + filterType + " " +
                                           filterValue + ".";
                        }
                    } else {
                        commaIndex = filterStr.indexOf(',');
                        if (commaIndex !== -1) {
                            info.column = filterStr
                                          .slice(parenIndex + 1, commaIndex)
                                          .trim();
                        } else {
                            info.column = filterStr
                                          .slice(parenIndex + 1,
                                                 filterStr.lastIndexOf(')'))
                                          .trim();
                        }
                        info.tooltip = "Filtered table &quot;" + parentNames[0] +
                                        "&quot;: " + filterStr;
                    }
                    info.opText = info.column;
                    break;
                case ('groupByInput'):
                    var sampleStr = "";
                    var groupedOn = getGroupedOnText(node);
                    if (value.includeSrcTableSample) {
                        sampleStr = " (Sample included)";
                    } else {
                        sampleStr = " (Sample not included)";
                    }
                    evalStr = value.evalStr;
                    parenIndex = evalStr.indexOf("(");
                    var type = evalStr.substr(0, parenIndex);
                    info.type = "groupBy" + type;
                    info.text = evalStr;
                    info.tooltip = evalStr + " Grouped by " + groupedOn + sampleStr;
                    info.column = evalStr.slice(evalStr.indexOf('(') + 1,
                                                evalStr.lastIndexOf(')'));
                    info.opText = info.column;
                    break;
                case ('indexInput'):
                    info.type = "sort";
                    info.column = value.keyName;
                    if (value.ordering !== XcalarOrderingT.XcalarOrderingUnordered) {
                        var order = "";
                        if (value.ordering ===
                            XcalarOrderingT.XcalarOrderingAscending) {
                            order = "(ascending) ";
                            info.order = "ascending";
                        } else if (value.ordering ===
                                   XcalarOrderingT.XcalarOrderingDescending) {
                            order = "(descending) ";
                            info.order = "descending";
                        }
                        if (value.source.isTable) {
                            info.tooltip = "Sorted " + order + "by " +
                                           value.keyName;
                        } else {
                            info.tooltip = "Sorted " + order + "on " +
                                           value.keyName;
                        }
                        info.text = "sorted " + order + "on " + value.keyName;
                    } else {
                        if (value.source.isTable) {
                            info.tooltip = "Indexed by " + value.keyName;
                            info.type = "index";
                        } else {
                            info.tooltip = "Created Table";
                            info.type = "createTable";
                            info.column = "";
                        }
                        info.text = "indexed on " + value.keyName;
                    }
                    info.opText = info.column;
                    break;
                case ('joinInput'):

                    info.text = JoinOperatorTStr[value.joinType];

                    var joinType = info.text.slice(0, info.text.indexOf("Join"));
                    info.type = joinType;
                    var joinText = "";
                    if (joinType.indexOf("Outer") > -1) {
                        var firstPart = joinType.slice(0, joinType.indexOf("Outer"));
                        firstPart = firstPart[0].toUpperCase() + firstPart.slice(1);
                        joinText = firstPart + " Outer";
                    } else {
                        joinText = joinType[0].toUpperCase() + joinType.slice(1);
                    }

                    info.tooltip = joinText + " Join between table &quot;" +
                                   parentNames[0] + "&quot; and table &quot;" +
                                   parentNames[1] + "&quot;";
                    info.column = parentNames[0] + ", " + parentNames[1];
                    info.opText = info.column;
                    break;
                case ('mapInput'):
                    //XX there is a "newFieldName" property that stores the name of
                    // the new column. Currently, we are not using or displaying
                    // the name of this new column anywhere.
                    evalStr = value.evalStr;
                    info.type = "map" + evalStr.slice(0, evalStr.indexOf('('));
                    info.text = evalStr;
                    info.tooltip = "Map: " + evalStr;
                    info.column = evalStr.slice(evalStr.indexOf('(') + 1,
                                                evalStr.lastIndexOf(')'));
                    info.opText = info.column;
                    break;
                case ('projectInput'):
                    for (var i = 0; i < value.numColumns; i++) {
                        info.column += value.columnNames[i] + ", ";
                    }
                    info.column = info.column.slice(0, info.column.length - 2);
                    if (info.column.length > 80) {
                        info.column = info.column.slice(0, 80) + "...";
                    }
                    info.tooltip = "Projected columns: " + info.column;
                    info.text = info.tooltip;
                    info.type = "project";
                    info.opText = info.column;
                    break;
                case ('exportInput'):
                    info.type = "export";
                    try {
                        info.url = value.meta.specificInput.sfInput.fileName;
                    } catch (err) {
                        console.error('Could not find export filename');
                    }
                    info.opText = "";
                    break;
                default:
                    var name;
                    if (key.slice(key.length - 5) === "Input") {
                        name = key.slice(0, key.length - 5);
                    } else {
                        name = key;
                    }
                    info.type = name;
                    info.text = name;
                    info.tooltip = name[0].toUpperCase() + name.slice(1);
                    info.opText = "";
                    break;
            }

            if (parentNames.length > 1) {
                info.opText = parentNames[0];
                for (var i = 1; i < parentNames.length; i++) {
                    info.opText += ", " + parentNames[i];
                }
            }
        }

        info.tooltip = info.tooltip.replace(/"/g, "&quot;");
        info.text = info.text.replace(/"/g, "&quot;");
        info.column = info.column.replace(/"/g, "&quot;");
        info.opText = info.opText.replace(/"/g, "&quot;");

        return (info);
    }

    function setTaggedOpInfo(info, value, node) {
        var taggedOp = getOpFromTag(node.value.tags[0]);
        var opFound = true;
        var evalStr;
        var parenIndex;
        info.operation = taggedOp;

        switch (taggedOp) {
            case (SQLOps.SplitCol):
                evalStr = value.evalStr;
                info.text = evalStr;
                info.column = evalStr.slice(evalStr.indexOf('(') + 1,
                                            evalStr.indexOf(','));
                var delimiter = $.trim(evalStr.slice(
                                              evalStr.lastIndexOf(",") + 1,
                                              evalStr.lastIndexOf(")")));

                info.tooltip = "Split column " + info.column + " by " +
                               delimiter;
                info.opText = info.column;
                break;
            case (SQLOps.ChangeType):
                var ancestors = getTaggedAncestors(node);
                evalStr = value.evalStr;
                info.text = evalStr;
                if (ancestors.length) {
                    // multiple casts, show general info
                    info.tooltip = "Changed column type of multiple columns";
                } else {
                    // only 1 cast so show specific info
                    info.column = evalStr.slice(evalStr.indexOf("(") + 1,
                                            evalStr.indexOf(","));
                    // XXX need to translate "bool" to "boolean" and "int"
                    // to "integer"
                    info.tooltip = "Changed column " + info.column +
                                    " type to " +
                                    evalStr.slice(0, evalStr.indexOf("("));
                    info.opText = info.column;
                }
                break;
            case (SQLOps.GroupBy):
                var ancestors = getTaggedAncestors(node, true);
                var key = DagFunction.getInputType(XcalarApisTStr[
                                                XcalarApisT.XcalarApiGroupBy]);
                var gbOnCols = {};
                var aggs = [];
                var tooltip = "";
                var sampleStr = " (Sample not included)";
                for (var i = 0; i < ancestors.length; i++) {
                    var gbNode = ancestors[i];

                    if (gbNode.value.api === XcalarApisT.XcalarApiGroupBy) {
                        var cols = getGroupedOnCols(node);
                        for (var j = 0; j < cols.length; j++) {
                            gbOnCols[cols[j]] = true;
                        }
                        if (gbNode.value.struct.includeSrcTableSample) {
                            sampleStr = " (Sample included)";
                        }
                        evalStr = gbNode.value.struct.evalStr;
                        aggs.push(evalStr);
                    }
                }

                for (var i = 0; i < aggs.length; i++) {
                    tooltip += aggs[i] + ", ";
                }
                tooltip = tooltip.slice(0, -2);
                tooltip += "<br>Grouped by: ";
                for (var col in gbOnCols) {
                    tooltip += col + ", ";
                    info.column += col + ", ";
                }
                info.column = info.column.slice(0, -2);
                info.opText = info.column;
                tooltip = tooltip.slice(0, -2) + "<br>" + sampleStr;
                info.tooltip = tooltip;
                break;
            default:
                opFound = false;
                break;
        }

        if (opFound) {
            info.type = taggedOp;
            return info;
        } else {
            return null;
        }
    }

    function getGroupedOnText(node) {
        var text = "";
        var numParents = node.value.numParents;
        if (numParents === 1 &&
            node.parents[0].value.api === XcalarApisT.XcalarApiIndex) {
            var parent = node.parents[0];
            var keyName = parent.value.struct.keyName;

            // if indexed on a column named "multiGroupBy" then this may
            // have been xcalar-generated sort, so check this table's
            // parent to find the source columns

            if (keyName.indexOf("multiGroupBy") === 0) {
                var grandParent = parent.parents[0];
                var cols = parseConcatCols(grandParent);
                if (cols.length) {
                    text = "(";
                    for (var i = 0; i < cols.length; i++) {
                        text += cols[i] + ", ";
                    }
                    text = text.slice(0, -2);
                    text += ")";
                }
            }
            if (!text) {
                text = "(" + keyName + ")";
            }
        } else {
            text = "(See previous table index)";
        }
        return text;
    }

    function getGroupedOnCols(node) {
        var numParents = node.value.numParents;
        var cols = [];
        if (numParents === 1 &&
            node.parents[0].value.api === XcalarApisT.XcalarApiIndex) {
            var parent = node.parents[0];
            var keyName = parent.value.struct.keyName;

            // if indexed on a column named "multiGroupBy" then this may
            // have been xcalar-generated sort, so check this table's
            // parent to find the source columns

            if (keyName.indexOf("multiGroupBy") === 0) {
                var grandParent = parent.parents[0];
                cols = parseConcatCols(grandParent);
            }
            if (!cols.length) {
                cols = [keyName];
            }
        } else {
            cols = ["(See previous table index)"];
        }
        return cols;
    }

    // returns nodes, not indices
    function getTaggedAncestors(node, withSelf) {
        var tag = node.value.tags[0];
        var ancestors = [];
        if (withSelf) {
            ancestors.push(node);
        }

        search(node);

        function search(node) {
            for (var i = 0; i < node.parents.length; i++) {
                var parent = node.parents[i];
                if (parent.value.display.isHiddenTag &&
                    parent.value.tags.indexOf(tag) > -1) {
                    ancestors.push(parent);
                    search(parent);
                }
            }
        }
        return ancestors;
    }

    // used only for parsing concated col names used for multi group by
    function parseConcatCols(node) {
        var cols = [];
        if (node.value.api === XcalarApisT.XcalarApiMap) {
            var evalStr = node.value.struct.evalStr;
            if (evalStr.indexOf("\".Xc.\"") > -1 &&
                evalStr.indexOf('concat') === 0) {
                var func = {args: []};
                ColManager.parseFuncString(evalStr, func);
                func = func.args[0];
                cols = getSourceColNames(func);
            }
        }
        return cols;
    }

    /* Generation of dag elements and canvas lines */
    function createCanvas($dagWrap, full) {
        var dagWidth = $dagWrap.find('.dagImage').width() + 130;
        var dagHeight = $dagWrap.find('.dagImage').height();
        var className = "";
        if (full) {
            dagHeight += 50;
            className = " full";
        }
        var canvasHTML = $('<canvas class="canvas' + className +
                            '" width="' + dagWidth +
                            '" height="' + (dagHeight) + '"></canvas>');
        $dagWrap.find('.dagImage').append(canvasHTML);
        return (canvasHTML[0]);
    }

    // options: {savable: boolean}
    function drawAllLines($container, node, numNodes, width, options) {
        var $dagImage = $container.find('.dagImage');
        var canvas = createCanvas($container);
        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = strokeWidth;
        ctx.beginPath();
        traverseAndDrawLines($dagImage, ctx, node, width, {});
        ctx.stroke();

        if (options.savable) {
            // if more than 1000 nodes, do not make savable, too much lag
            // also canvas limit is 32,767 pixels height  or width
            var canvasWidth = $(canvas).width();
            var canvasHeight = $(canvas).height();

            if (numNodes > 1000 || canvasWidth > Dag.canvasLimit ||
                canvasHeight > Dag.canvasLimit || (canvasWidth * canvasHeight) >
                Dag.canvasAreaLimit) {
                $dagImage.closest(".dagWrap").addClass('unsavable');
            }
        }
    }

    function traverseAndDrawLines($dagImage, ctx, node, width, drawn, all) {
        if (all ||
            !node.value.display.isHidden && !node.value.display.isHiddenTag) {
            drawDagLines($dagImage, ctx, node, width);
        }
        drawn[node.value.dagNodeId] = true;
        for (var i = 0; i < node.parents.length; i++) {
            var parentNode = node.parents[i];
            if (!drawn[parentNode.value.dagNodeId]) {
                traverseAndDrawLines($dagImage, ctx, parentNode, width, drawn);
            }
        }
    }

    // this function draws all the lines going into a blue table icon and its
    // corresponding gray operation rectangle
    function drawDagLines($dagImage, ctx, node, canvasWidth) {
        if (!node.parents.length) {
            // Should not draw for starting nodes with no parents
            // i.e. load nodes
            return;
        }

        var parents = node.getVisibleParents();
        var numParents = parents.length;

        if (!numParents) {
            return;
        }

        var tableX = canvasWidth - node.value.display.x + 6;
        var tableY = node.value.display.y + dagTableHeight / 2;
        var upperParent = parents[0];
        var upperParentX = canvasWidth - upperParent.value.display.x;
        var upperParentY = upperParent.value.display.y + dagTableHeight / 2;

        // line from table to operation
        drawLine(ctx, tableX, tableY, tableX - 50, tableY);

        // line from child operation to upper parent table
        if (tableY === upperParentY) {
            drawLine(ctx, tableX - 108, tableY, upperParentX + smallTableWidth,
                     upperParentY);
        } else {
            var curvedLineCoor = {
                x1: tableX - 140,
                y1: tableY,
                x2: upperParentX + (smallTableWidth / 2), // middle of blue table
                y2: upperParentY
            };
            drawCurve(ctx, curvedLineCoor, true);
        }

        if (isJoinLineNeeded(node, parents)) {
            var lowerParent = parents[1];
            var lowerParentX = canvasWidth - lowerParent.value.display.x;
            var lowerParentY = lowerParent.value.display.y + dagTableHeight / 2;

            var curvedLineCoor = {
                x1: tableX - 102,
                y1: tableY,
                x2: lowerParentX + smallTableWidth, // right of blue table
                y2: lowerParentY
            };
            drawCurve(ctx, curvedLineCoor);

            // draw any additional curves if more than 2 parents
            if (numParents > 2) {
                drawExtraCurves(parents, tableX - 102, tableY, ctx,
                                 canvasWidth);
            }
        }
    }

    // do not draw join lines for groupbys
    function isJoinLineNeeded(node, parents) {
        if (parents.length < 2) {
            return false;
        }
        if (node.value.display.tagHeader &&
            getOpFromTag(node.value.tags[0]) === SQLOps.GroupBy) {

            var sameParents = true;
            for (var i = 1; i < parents.length; i++) {
                if (parents[i].value.dagNodeId !== parents[0].value.dagNodeId) {
                    return true;
                }
            }
            return false;
        } else {
            return true;
        }
    }

    function drawCurve(ctx, coor, inverted) {
        var x1 = coor.x1; // upper table x
        var y1 = coor.y1; // upper table y
        var x2 = coor.x2; // child table x
        var y2 = coor.y2; // child table y
        var bendX1, bendY2, bendX2, bendY2;

        if (inverted) {
            // curve style option
            // bendX1 = x1 - ((x1 - x2) / 2);
            // bendY1 = y1;
            // bendY2 = y2 - ((y2 - y1) / 2);
            // bendY2 = y1;

            bendX1 = x2;
            bendY1 = y1;
            bendX2 = x2;
            bendY2 = y1;
        } else if (y1 === y2) {
            x1 -= 20;
            bendX1 = x1;
            bendY1 = y1 - 40;
            bendX2 = x2;
            bendY2 = y2 - 40;

        } else {
            // curve style option
            // bendX1 = x1;
            // bendY1 = y1 + ((y2 - y1) / 2);
            // bendX2 = x2 + ((x1 - x2) / 2);
            // bendY2 = y2;

            bendX1 = x1;
            bendY1 = y2;
            bendX2 = x1;
            bendY2 = y2;
        }
        bendX1 = Math.round(bendX1);
        bendY1 = Math.round(bendY1);
        bendX2 = Math.round(bendX2);
        bendY2 = Math.round(bendY2);

        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(bendX1, bendY1,
                          bendX2, bendY2,
                          x2, y2);
    }

    // for tables that have more than 2 parents
    function drawExtraCurves(parents, x1, y1, ctx, canvasWidth) {
        for (var i = 2; i < parents.length; i++) {
            var parent = parents[i];
            var x2 = canvasWidth - parent.value.display.x + smallTableWidth;
            var y2 = parent.value.display.y + dagTableHeight / 2;
            var bendX1 = x1;
            var bendY1 = y2;
            var bendX2 = x1;
            var bendY2 = y2;

            ctx.moveTo(x1, y1);
            ctx.bezierCurveTo(bendX1, bendY1,
                              bendX2, bendY2,
                              x2, y2);
        }
    }

    function drawLine(ctx, x1, y1, x2, y2) {
        // draw a straight line
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
    }

    if (window.unitTestMode) {
        DagDraw.__testOnly__ = {};
        DagDraw.__testOnly__.getTaggedAncestors = getTaggedAncestors;
        DagDraw.__testOnly__.checkIsNodeHiddenTag = checkIsNodeHiddenTag;
        DagDraw.__testOnly__.getDagNodeInfo = getDagNodeInfo;
        DagDraw.__testOnly__.getIconHtml = getIconHtml;
        DagDraw.__testOnly__.getJoinIconClass = getJoinIconClass;
    }

    return (DagDraw);

}(jQuery, {}));
