window.xcSuggest = (function($, xcSuggest) {
/* General workflow:
 * 1.) Some ML setting gets most raw form of data possible
 * 2.) ML setting processes those inputs into features for the ML platform
 * 2a.) The features must also contain a reserved field "uniqueIdentifier"
 *      which uniquely identifies the result we select
 * 3.) ML engine evaluates the model for that setting on the features
 * 4.) ML setting returns the unique identifier and score
 *
*/
    var MLEngine;
    // Turn off ML Engine
    var useEngine = true;

    xcSuggest.setup = function() {
        MLEngine = window.skRFPredictor;
        MLEngine.setup();
        return true;
    };

    xcSuggest.suggestJoinKey = function(inputs) {
        // Inputs has fields srcColInfo and destColsInfo
        // srcColInfo is valid colInfo and destColsInfo is array of valid colInfo
        // valid colInfo has type, name, and data fields, where data is an array
        // of the text contents of the HTML column as strings
        // Requires: inputs.srcCol is filled with info from valid col
        // Requires: inputs.destCol is an array, but can be empty

        // For now, the ML and heuristic both use the same features.
        var featuresPerColumn = processJoinKeyInputs(inputs);
        var suggestResults;
        if (useEngine) {
            try {
                suggestResults = suggestJoinKeyML(featuresPerColumn);
                if (suggestResults.maxScore <= -50) {
                    console.log("ML Engine scores poorly: " +
                        JSON.stringify(suggestResults) +
                        "\nSwitching to heuristic.");
                    suggestResults = undefined;
                }
            } catch (err) {
                console.error("ML Engine failed with error: " + err +
                    "\nSwitching to heuristic.");
                suggestResults = undefined;
            }
        }

        if (suggestResults === undefined) {
            suggestResults = suggestJoinKeyHeuristic(featuresPerColumn);
        }
        // console.log("Suggest results: " + JSON.stringify(suggestResults));
        return suggestResults;
    };

    xcSuggest.processJoinKeyData = function(joinKeyInputs, curDestBackName) {
        var mlInputData = {};
        var inputFeatures = processJoinKeyInputs(joinKeyInputs);

        addSuggestFeatures(mlInputData, inputFeatures);
        addSuggestLabels(mlInputData, curDestBackName);
        addMetaData(mlInputData, joinKeyInputs);
        addIsValid(mlInputData);
        return mlInputData;
    };

    xcSuggest.submitJoinKeyData = function(dataPerClause) {
        var realSubmit = "locStor"; // Hardcoded flag, will change or remove
        if (realSubmit === "xcTracker") {
            xcTracker.track(XCTrackerCategory.SuggestJoinKey, dataPerClause);
        } else if (realSubmit === "locStor") {
            var d = new Date();
            var curTime = String(d.getTime());
            xcLocalStorage.setItem("MLDataTrain" + curTime,
                JSON.stringify(dataPerClause));
        } else {
            console.log("DataSubSuccess: " + JSON.stringify(dataPerClause));
        }
    };

    function processJoinKeyInputs(inputs) {
        // For now this is a shallow cover, this will change once heuristic
        // and ML use different features
        return processJoinKeyInputsHeuristic(inputs);
    }

    function processJoinKeyInputsHeuristic(inputs) {
        // Inputs has fields srcColInfo and destColsInfo
        // srcColInfo is valid colInfo and destColsInfo is array of valid colInfo
        // valid colInfo has type, name, and data fields, where data is an array
        // of the text contents of the HTML column
        // Requires: inputs.srcCol is filled with info from valid col
        // Requires: inputs.destCol is an array, but can be empty
        var srcColInfo = inputs.srcColInfo;
        var type = srcColInfo.type;

        var srcContext = contextCheck(srcColInfo);
        var featuresPerColumn = [];
        for (var i = 0; i < inputs.destColsInfo.length; i++) {
            var curColInfo = inputs.destColsInfo[i];
            // 0 is rowMarker
            if (curColInfo.type === type) {
                if (srcColInfo.uniqueIdentifier === curColInfo.uniqueIdentifier &&
                    srcColInfo.tableId === curColInfo.tableId) {
                    featuresPerColumn.push(null);
                    continue;
                }

                var destContext = contextCheck(curColInfo);
                var match = 0;
                var maxDiff;
                var minDiff;
                var avgDiff;
                var sig2Diff;
                var titleDist;
                if (type === "string") {
                    var bucket  = {};
                    var bucket2 = {};
                    var words   = {};

                    // Note: current way is hash each char and count frequency
                    // change it if you have better way!
                    srcContext.vals.forEach(function(value) {
                        for (var i = 0; i < value.length; i++) {
                            bucket[value.charAt(i)] = true;
                        }

                        words[value] = words[value] || 0;
                        words[value]++;
                    });

                    destContext.vals.forEach(function(value) {
                        for (var i = 0; i < value.length; i++) {
                            bucket2[value.charAt(i)] = true;
                        }
                        // when has whole word match
                        if (words.hasOwnProperty(value)) {
                            match += 10 * words[value];
                        }
                    });

                    for (var c in bucket2) {
                        if (bucket.hasOwnProperty(c)) {
                            if (/\W/.test(c)) {
                                // special char, high weight
                                match += 10;
                            } else {
                                match += 1;
                            }
                        }
                    }
                    maxDiff = Math.abs(srcContext.max - destContext.max);
                    minDiff = Math.abs(srcContext.min - destContext.min);
                    avgDiff = Math.abs(srcContext.avg - destContext.avg);
                    sig2Diff = Math.abs(srcContext.sig2 - destContext.sig2);
                } else {
                    // Type is number
                    maxDiff = calcSim(srcContext.max, destContext.max);
                    minDiff = calcSim(srcContext.min, destContext.min);
                    avgDiff = calcSim(srcContext.avg, destContext.avg);
                    sig2Diff = calcSim(srcContext.sig2, destContext.sig2);
                }

                titleDist = getTitleDistance(srcColInfo.name, curColInfo.name);

                featuresPerColumn.push({
                    "maxDiff": maxDiff,
                    "minDiff": minDiff,
                    "avgDiff": avgDiff,
                    "sig2Diff": sig2Diff,
                    "match": match,
                    "titleDist": titleDist,
                    "type": type,
                    "uniqueIdentifier": curColInfo.uniqueIdentifier
                });
            } else {
                featuresPerColumn.push(null);
            }
        }
        return featuresPerColumn;
    }

    function suggestJoinKeyML(featuresPerColumn) {
        var colToSugg = null;
        // only score that more than 0 will be suggested, can be modified
        var maxScore = 0;

        for (var i = 0; i < featuresPerColumn.length; i++) {
            var curFeatures = featuresPerColumn[i];
            if (curFeatures !== null) {
                // No type mismatch
                var prediction = MLEngine.predict(MLSetting.SuggestJoinKey,
                                                  curFeatures);
                var score;
                // console.log(JSON.stringify(prediction));
                if (prediction.classIdx === 1) {
                    score = prediction.score;
                } else {
                    // Prediction.classIdx must be 0
                    score = 1 - prediction.score;
                }
                if (score > maxScore) {
                    maxScore = score;
                    colToSugg = curFeatures.uniqueIdentifier;
                }
            }
        }

        // console.log(maxScore);
        // Because suggestJoinKey expects score on range of integers
        // And the threshold is -50, change the score of this algorithm to
        // be on range of -100 to 0

        return {
            'colToSugg': colToSugg,
            'maxScore': (maxScore * 100) - 100
        };
    }

    function suggestJoinKeyHeuristic(featuresPerColumn) {
        // Inputs has fields srcColInfo and destColsInfo
        // srcColInfo is valid colInfo and destColsInfo is array of valid colInfo
        // valid colInfo has type, name, and data fields, where data is an array
        // of the text contents of the HTML column
        // Requires: inputs.srcCol is filled with info from valid col
        // Requires: inputs.destCol is an array, but can be empty
        var colToSugg = null;

        // only score that more than -50 will be suggested, can be modified
        var maxScore = (-Number.MAX_VALUE);

        for (var i = 0; i < featuresPerColumn.length; i++) {
            var curFeatures = featuresPerColumn[i];
            if (curFeatures !== null) {
                var score = getScore(curFeatures);
                if (score > maxScore) {
                    maxScore = score;
                    colToSugg = curFeatures.uniqueIdentifier;
                }
            }
        }

        var returnObj = {
            "colToSugg": colToSugg,
            "maxScore": maxScore
        };
        return returnObj;
    }

    function contextCheck(requiredInfo) {
        // only check number and string
        var type = requiredInfo.type;
        var data = requiredInfo.data;
        if (type !== ColumnType.integer && type !== ColumnType.float &&
            type !== ColumnType.string) {
            return {"max": 0, "min": 0, "avg": 0, "sig2": 0, "vals": []};
        }

        // Number min value provides smallest absolute value number, e.g.
        // 5e-352 or something similar.  Take negative of max value for true min.
        // Otherwise this script breaks on negative numbers.
        var max = (-Number.MAX_VALUE);
        var min = Number.MAX_VALUE;
        var total = 0;
        var datas = [];
        var values = [];
        var val;

        for (var i = 0; i < data.length; i++) {
            val = data[i];

            var d;

            if (val === null || val === "") {
                // skip empty value
                continue;
            }

            if (type === "string") {

                d = val.length; // for string, use its length as metrics
            } else {
                d = Number(val);
            }

            values.push(val);
            datas.push(d);
            max = Math.max(d, max);
            min = Math.min(d, min);
            total += d;
        }

        if (values.length === 0) {
            return {"max": 0, "min": 0, "avg": 0, "sig2": 0, "vals": []};
        }

        var count = datas.length;
        var avg = total / count;
        var sig2 = 0;

        for (var i = 0; i < count; i++) {
            sig2 += Math.pow((datas[i] - avg), 2);
        }

        return {
            "max": max,
            "min": min,
            "avg": avg,
            "sig2": sig2,
            "vals": values
        };
    }

    function getScore(curFeatures) {
        // the two value of max, min, sig2, avg..closer, score is better,
        // also, shorter distance, higher score. So those socres are negative
        var score = 0;

        if (curFeatures.type === "string") {
            // for string compare absolute value
            score += curFeatures.match * 3;
            score += curFeatures.maxDiff * -1;
            score += curFeatures.minDiff * -1;
            score += curFeatures.avgDiff * -2;
            score += curFeatures.sig2Diff * -5;
            score += curFeatures.titleDist * -7;
        } else {
            // a base score for number,
            // since limit score to pass is -50
            var match = 20;
            // for number compare relative value
            score += match * 3;
            score += curFeatures.maxDiff * -8;
            score += curFeatures.minDiff * -8;
            score += curFeatures.avgDiff * -16;
            score += curFeatures.sig2Diff * -40;
            score += curFeatures.titleDist * -7;
        }
        return score;
    }

    function calcSim(a, b) {
        var diff = a - b;
        var sum = a + b;

        if (sum === 0) {
            if (diff === 0) {
                // when a === 0 and b === 0
                return 0;
            } else {
                // a = -b, one is positive and one num is negative
                // no similarity
                return 1;
            }
        }
        // range is [0, 1), more close to 0, similar
        return Math.abs(diff / sum);
    }

    function getTitleDistance(name1, name2) {
        if (name1.startsWith("column") || name2.startsWith("column")) {
            // If any column has auto-generated column name, then do not check
            // TODO: Change this, otherwise prefers autogenerated labels over other
            return 0;
        }

        name1 = xcHelper.parsePrefixColName(name1.toLowerCase()).name;
        name2 = xcHelper.parsePrefixColName(name2.toLowerCase()).name;
        if (name1 === name2) {
            // same name
            return 0;
        } else if ((name1.startsWith(name2) || name2.startsWith(name1)) &&
                   (name1 !== "" && name2 !== "")) {
            // which means the name is quite related
            return 2;
        }

        var distArray = levenshteinenator(name1, name2);
        var len = distArray.length;
        var dist = distArray[len - 1][distArray[len - 1].length - 1];
        return (dist);

        // http://andrew.hedges.name/experiments/levenshtein/levenshtein.js
        /**
         * @param String a
         * @param String b
         * @return Array
         */
        function levenshteinenator(a, b) {
            var cost;
            var m = a.length;
            var n = b.length;

            // make sure a.length >= b.length to use O(min(n,m)) space, whatever
            // that is
            if (m < n) {
                var c = a; a = b; b = c;
                var o = m; m = n; n = o;
            }

            var r = []; r[0] = [];
            for (var c = 0; c < n + 1; ++c) {
                r[0][c] = c;
            }

            for (var i = 1; i < m + 1; ++i) {
                r[i] = []; r[i][0] = i;
                for ( var j = 1; j < n + 1; ++j ) {
                    cost = a.charAt( i - 1 ) === b.charAt( j - 1 ) ? 0 : 1;
                    r[i][j] = minimator(r[i - 1][j] + 1, r[i][j - 1] + 1,
                                        r[i - 1][j - 1] + cost);
                }
            }

            return r;
        }

        /**
         * Return the smallest of the three numbers passed in
         * @param Number x
         * @param Number y
         * @param Number z
         * @return Number
         */
        function minimator(x, y, z) {
            if (x < y && x < z) {
                return x;
            }
            if (y < x && y < z) {
                return y;
            }
            return z;
        }
    }

    ///////////////// Data Submission Handling //////////
    function checkSuggestDataPortionsMatch(inputData) {
        // TODO: Add more checks
        if (!(inputData && inputData.features && inputData.labels)) {
            return false;
        }
        if (inputData.features.length !== inputData.labels.length) {
            console.warn("InputData features lenght does not match label length.");
            return false;
        }
        // corrLabels tracks how many columns per dataset are labeled 1 (match).
        // Should be exactly 1.
        // TODO: change the corrLabel concept when we support softclass inputs
        // E.g. when we no longer require exactly one column to be correct
        var corrLabels = 0;
        var len = inputData.labels.length;
        for (var i = 0; i < len; i++) {
            if (inputData.labels[i] === 1) {
                if (corrLabels >= 1) {
                    console.warn("More than one column labeled as match.");
                    return false;
                }
                corrLabels++;
            }
        }
        if (corrLabels === 0) {
            console.warn("No columns labeled as match.");
            return false;
        }
        return true;
    }

    function addSuggestFeatures(inputData, features) {
        inputData.features = features;
        return features;
    }

    function addSuggestLabels(inputData, destColBackName) {
        var labels = [];
        if (inputData.labels) {
            console.log("Already labeled input data.");
        }
        // TODO: change the onecorr concept when we support softclass inputs
        // E.g. when we no longer require exactly one column to be correct
        if (inputData.features) {
            for (i = 0; i < inputData.features.length; i++) {
                var curFeatures = inputData.features[i];
                if (curFeatures === null) {
                    // Type mismatch between columns, we do not consider case
                    labels.push(0);
                } else if (curFeatures.uniqueIdentifier === destColBackName) {
                    labels.push(1);
                } else {
                    labels.push(0);
                }
            }
        } else {
            // Called label without adding features first.
            console.log("No input data to label.");
        }
        inputData.labels = labels;
        return labels;
    }

    function addMetaData(inputData, joinKeyInputs) {
        var srcColName = joinKeyInputs.srcColInfo.uniqueIdentifier;
        var timeOfJoin = String(new Date());
        var metaData = {
            "srcColName": srcColName,
            "timeOfJoin": timeOfJoin
        };
        inputData.metaData = metaData;
        return metaData;
    }

    function addIsValid(inputData) {
        var isValid = checkSuggestDataPortionsMatch(inputData);
        inputData.isValid = isValid;
        return isValid;
    }


    ///////////////// End Submission Handling //////////



///////////////////////////////////////////////////////////////
// End Join Key Suggestion
// Begin Delim Suggestion
//////////////////////////////////////////////////////////////


// Doesn't seem like there is an easy way to decouple smartDetect from module
// Solution: use raw data instead

// dsPreview.js

// rawRows is an array of string
// that represents unparsed data for each row
    xcSuggest.detectFormat = function(rawRows) {
        if (isJSONArray(rawRows)) {
            return DSFormat.JSON;
        } else if (isSpecialJSON(rawRows)) {
            return DSFormat.SpecialJSON;
        } else if (isXML(rawRows)) {
            return DSFormat.XML;
        } else {
            return DSFormat.CSV;
        }
    };

    function isJSONArray(rawRows) {
        var str = rawRows[0].trim();
        if (rawRows[1] != null) {
            str += rawRows[1].trim();
        }
        // start with [ and next char is {(skip space, tab, new line)
        var isValidPattern = /^\[[\s\t\r\n]+{?/.test(str) ||
                            str.startsWith("[{");
        return isValidPattern;
    }

    function isSpecialJSON(rawRows) {
        var isValid = false;
        for (var i = 0, len = rawRows.length; i < len; i++) {
            var text = rawRows[i];
            if (text.startsWith("{") && /{.+:.+},?/.test(text)) {
                // continue the loop
                // only when it has at least one valid case
                // we make it true
                isValid = true;
            } else if (text === "") {
                continue;
            } else if (i === len - 1 && text.startsWith("{")) {
                // last line may only have partial data, skip it
                continue;
            } else {
                isValid = false;
                break;
            }
        }

        return isValid;
    }

    function isXML(rawRows) {
        // Simple detection, just take up to ten lines
        var len = 10;
        if (rawRows.length < 10) {
            len = rawRows.length;
        }
        for (var i = 0; i < len; i++) {
            if (rawRows[i].replace(/\s/g, "").startsWith("<?xml")) {
                return true;
            }
        }
        return false;
    }

    xcSuggest.detectLineDelimiter = function(rawStr) {
        var crlfCount = coutCharOccurrence(rawStr, "\r\n");
        var lfCount = coutCharOccurrence(rawStr, "\n");
        var crCount = coutCharOccurrence(rawStr, "\r");

        if (crlfCount > 0 && crlfCount >= lfCount && crlfCount >= crCount) {
            // when \r\n
            return "\r\n";
        } else if (crCount > 0 && crCount > lfCount) {
            // when \r
            return "\r";
        } else if (lfCount > 0){
            // when \n
            return "\n";
        } else {
            // when all is 0
            return "";
        }
    };

    xcSuggest.detectFieldDelimiter = function(rawStr) {
        // Number of samples can be changed
        var numOfSamples = 10;
        // remove stuff inside quote
        // reference: https://stackoverflow.com/questions/171480/regex-grabbing-values-between-quotation-marks
        var strippedStr = rawStr.replace(/(?=["'])(?:"[^"\\]*(?:\\[\s\S][^"\\]*)*"|'[^'\\]*(?:\\[\s\S][^'\\]*)*')/g, "");
        var samples = strippedStr.split(/\r\n|\r|\n/).slice(0, numOfSamples);
        // delimiters: [",", "\t", "|"]
        var delimiters = [];
        // occurences: {",": [1,1,1...], "\t": [2,2,2...], "|": [3,3,3...]}
        var occurences = {};
        var validLineCounter = 0;
        for (var i = 0; i < samples.length; i++) {
            // Only keep non-alphanumeric characters
            var line = samples[i].replace(/[a-zA-Z\d ]/g, "");
            // Remove contents within quotes
            // line = line.replace(/(".*?")|('.*?')/g, "");
            // Also increase validLineCounter
            validLineCounter += 1;
            Object.keys(occurences).map(function(key) {
                // Append 0 to each array in the obj bc occurence is per row
                occurences[key].push(0);
            });
            for (var j = 0; j < line.length; j++) {
                var char = line[j];
                if (!occurences.hasOwnProperty(char)) {
                    delimiters.push(char);
                    // Fill all missing 0s based on validLineCounter
                    occurences[char] = new Array(validLineCounter).fill(0);
                }
                occurences[char][validLineCounter - 1] += 1;
            }
        }
        if (delimiters.length === 0) {
            return "";
        }
        // Priority:
        // 1. Ideally, a delimiter will have a score of 0, which means it occurs
        // same times across header and rows.
        //
        // 2. If not, check edge cases:
        //      1) It's in potential header but not in any other rows.
        //         e.g.[2,0,0,0,0...]
        //      2) It occurs same times across rows but it's not in header.
        //         e.g.[0,2,2,2,2...]
        // Both indicate it's very likely to have only one field, i.e. no delim
        //
        // 3. If not perfect case nor fell within edges, we choose the one with
        // lowest score (likely to be the delimiter)

        var edgeCase = false;
        var bestDelim = delimiters[0];
        var minScore = computeVariance(occurences[bestDelim]);
        if (minScore === -1) {
            // Fell in edge cases
            edgeCase = true;
            // Give it a big value so that we can continue with score comparison
            minScore = Number.MAX_VALUE;
        }
        for (var i = 1; i < delimiters.length; i++) {
            var currDelim = delimiters[i];
            var currScore = computeVariance(occurences[currDelim]);

            if (currScore === -1) {
                // Fell in edge cases
                edgeCase = true;
                continue;
            }

            if (currScore < minScore) {
                bestDelim = currDelim;
                minScore = currScore;
            } else if (currScore === minScore) {
                // When there is a tie, we have preference as comma > tab > pipe
                // All others follow a "first detected, first selected" rule
                if (currDelim === "," ||
                    (currDelim === "\t" && bestDelim !== ",") ||
                    (currDelim === "|" && bestDelim !== "," &&
                     bestDelim !== "\t")) {
                    bestDelim = currDelim;
                    minScore = currScore;
                }
            }
        }
        if (minScore !== 0 && edgeCase) {
            return "";
        }
        return bestDelim;
    };

    function coutCharOccurrence(str, ch) {
        var regEx = new RegExp(ch, "g");
        return (str.match(regEx) || []).length;
    }

    function computeVariance(nums) {
        var score;
        var len = nums.length;
        // Weights can be changed
        // e.g. header weighs a half, all other lines split the rest equally
        var headerWeight = 0.5;
        var otherWeight = 0.5 / (len - 1);
        var edgeCase1 = false;
        var edgeCase2 = false;
        if (nums[0] === 0) {
            edgeCase1 = true;
        } else {
            edgeCase2 = true;
        }
        var sum = nums[0];
        for (var i = 1; i < nums.length - 1; i++) {
            if (edgeCase1 && nums[i] !== nums[i+1]) {
                // Breaks edgeCase1
                edgeCase1 = false;
            }
            if (edgeCase2 && (nums[i] !== 0 || nums[i+1] !==0)) {
                // Breaks edgeCase2
                edgeCase2 = false;
            }
            sum += nums[i];
        }
        sum += nums[nums.length - 1];

        if (edgeCase1 || edgeCase2) {
            return -1;
        }

        var avg = sum / len;
        var res = 0;
        for (var i = 0; i < len; i++) {
            if (i === 0) {
                res += headerWeight * Math.pow((nums[i] - avg), 2);
            } else {
                res += otherWeight * Math.pow((nums[i] - avg), 2);
            }
        }
        if (len === 1) {
            score = res / len;
        } else {
            // Otherwise compute the unbiased estimate of variance
            score = res / (len - 1);
        }
        // To put some weight on the number of occurrences, divide by avg
        return score / avg;
    }

    // parsedRows is a two dimension that represents a table's data
    xcSuggest.detectHeader = function(parsedRows) {
        var rowLen = parsedRows.length;
        if (rowLen === 0) {
            return false;
        }

        var headers = parsedRows[0];
        var colLen = headers.length;
        var text;
        var score = 0;

        for (var i = 0; i < colLen; i++) {
            text = headers[i];
            if ($.isNumeric(text)) {
                // if row has number
                // should not be header
                return false;
            } else if (text === "" || text == null) {
                // // ds may have case to have empty header
                // score -= 100;
                // Newly change to not promote when has empty row
                // because excel with empty header will {"": "val"},
                // which is invalid
                return false;
            }
        }

        var rowStart = 1;
        for (var col = 0; col < colLen; col++) {
            text = headers[col];
            var headerLength = text.length;
            var allTextSameLength = null;
            var firstTextLength = null;

            for (var row = rowStart; row < rowLen; row++) {
                var tdText = parsedRows[row][col];
                var quotePattern = /^['"].+["']$/;
                if (quotePattern.test(tdText)) {
                    // strip "9" to 9
                    tdText = tdText.substring(1, tdText.length - 1);
                }

                if ($.isNumeric(tdText)) {
                    // header is string and td is number
                    // valid this td
                    score += 30;
                } else if (tdText === "" || tdText == null) {
                    // td is null but header is not
                    score += 10;
                } else {
                    // the diff btw header and td is bigger, better
                    var textLength = tdText.length;
                    var diff = Math.abs(headerLength - textLength);
                    if (diff === 0 && text === tdText) {
                        score -= 20;
                    } else {
                        score += diff;
                    }

                    if (firstTextLength == null) {
                        firstTextLength = textLength;
                    } else if (allTextSameLength !== false) {
                        allTextSameLength = (firstTextLength === textLength);
                    }
                }
            }

            if (allTextSameLength &&
                firstTextLength != null &&
                headerLength !== firstTextLength)
            {
                // when all text has same length and header is different
                // length, it's a high chance of header
                score += 20 * rowLen;
            }
        }

        if (rowLen === 0 || score / rowLen < 20) {
            return false;
        } else {
            return true;
        }
    };
////////////
// End JSON Delim Suggestion
// Begin Col Type
//////////////////////////////////////////////////////////////
// Relevant structure:
// smartCastView.js
// .show
//  initialSugget
//   progcol.gettype
//   suggestType
//    -Skips bool and float type
//     -Skips integer type
//  smartsuggest -I think it's just UI updates

    xcSuggest.suggestType = function(datas, currentType, confidentRate) {
        // Inputs has fields colInfo, confidentRate
        if (currentType === ColumnType.integer ||
            currentType === ColumnType.float) {
            return currentType;
        }

        if (confidentRate == null) {
            confidentRate = 1;
        }

        if (!(datas instanceof Array)) {
            datas = [datas];
        }

        var isFloat;
        var validData = 0;
        var numHit = 0;
        var booleanHit = 0;

        for (var i = 0, len = datas.length; i < len; i++) {
            var data = datas[i];
            if (data == null) {
                // skip this one
                continue;
            }

            data = data.trim().toLowerCase();
            if (data === "") {
                // skip this one
                continue;
            }

            validData++;
            var num = Number(data);
            if (!isNaN(num)) {
                numHit++;

                if (!isFloat && !Number.isInteger(num)) {
                    // when it's float
                    isFloat = true;
                }
            } else if (data === "true" || data === "false" ||
                data === "t" || data === "f") {
                booleanHit++;
            }
        }
        if (validData === 0) {
            return ColumnType.string;
        } else if (numHit / validData >= confidentRate) {
            if (isFloat) {
                return ColumnType.float;
            } else {
                return ColumnType.integer;
            }
        } else if (booleanHit / validData >= confidentRate) {
            return ColumnType.boolean;
        } else {
            return ColumnType.string;
        }
    };

        /* Unit Test Only */
    if (window.unitTestMode) {
        xcSuggest.__testOnly__ = {};
        xcSuggest.__testOnly__.contextCheck = contextCheck;
        xcSuggest.__testOnly__.getScore = getScore;
        xcSuggest.__testOnly__.calcSim = calcSim;
        xcSuggest.__testOnly__.getTitleDistance = getTitleDistance;
        xcSuggest.__testOnly__.checkSuggestDataPortionsMatch = checkSuggestDataPortionsMatch;
    }
    /* End Of Unit Test Only */

    return (xcSuggest);
}(jQuery, {}));
