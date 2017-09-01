window.MonitorGraph = (function($, MonitorGraph) {
    var intervalTime = 60000; // update interval in milliseconds
    var xGridWidth = 60; // space between each x-axis grid line
    var height = 210;
    var yAxis;
    var yScale;
    var datasets = [];
    var xGridVals;
    var svg;
    var graphCycle;
    var memIndex = 0; // the index of the ram or memUsed donut
    var swapIndex = 1;
    var cpuIndex = 2;

    var pointsPerGrid = 10;
    var shiftWidth = xGridWidth / pointsPerGrid;
    var count = 0;
    var gridRight;
    var newWidth;
    var svgWrap;
    var firstTime;
    var numXGridMarks;
    var $graphWrap;
    var timeStamp;
    var failCount = 0;
    var curIteration = 0;
    var tableUsage = 0;

    MonitorGraph.setup = function() {
        $('#graph').on('click', '.area', function() {
            var $area = $(this);
            var $line = $(this).prev();

            if ($area.css('opacity') > 0.6) {
                $area.css('opacity', 0.4);
            } else {
                $area.css('opacity', 0.8);
            }

            // move graphs in front of others
            $('#graph .mainSvg').children().append($line, $area);
        });
    };

    MonitorGraph.start = function() {
        datasets = [[0], [0], [0]];
        setupLabelsPathsAndScales();

        setTimeout(function() {
            // XXX Hack - the graph refuses to move unless I change more
            // of its attributes
            var rand = Math.random() * 0.1;
            svgWrap.attr("height", height + rand);
        }, 300);

        createTempGrid(); // initial grid that gets pushed off
        startCycle();
    };

    MonitorGraph.clear = function() {
        var $graph = $('#graph');
        $graph.find('svg').remove();
        $graph.find('.xLabels').empty();
        $('#memYAxis').empty();
        curIteration++;
        clearTimeout(graphCycle);
        datasets = [];
    };

    MonitorGraph.stop = function() {
        curIteration++;
        clearTimeout(graphCycle);
    };

    MonitorGraph.updateInterval = function(time) {
        intervalTime = time;
        curIteration++;
        clearTimeout(graphCycle);
        cycle();
    };

    function startCycle() {
        count = 0;
        newWidth = xGridWidth + shiftWidth;
        numXGridMarks = 5;
        gridRight = shiftWidth;
        $graphWrap = $('#graphWrap');
        svgWrap = svg.select(function() {
            return (this.parentNode);
        });
        firstTime = true;

        intervalTime = (UserSettings.getPref('monitorGraphInterval') * 1000) ||
                        intervalTime;

        curIteration++;
        clearTimeout(graphCycle);
        var prevIteration = curIteration;
        var startTime = Date.now();

        getStatsAndUpdateGraph()
        .always(function() {
            if (prevIteration === curIteration) {
                var elapsedTime = Date.now() - startTime;
                cycle(elapsedTime);
            }
        });
    }

    // ajustTime is the time to subtract from the interval time due to the
    // length of time it takes for the backend call to return
    function cycle(adjustTime) {
        var prevIteration = curIteration;
        var intTime = intervalTime;
        if (adjustTime) {
            intTime = Math.max(200, intervalTime - adjustTime);
        }
        graphCycle = setTimeout(function() {
            var startTime = Date.now();
            getStatsAndUpdateGraph()
            .always(function() {
                if (prevIteration === curIteration) {
                    var elapsedTime = Date.now() - startTime;
                    cycle(elapsedTime);
                }
            });
        }, intTime);
    }

    function getStatsAndUpdateGraph() {
        var deferred = jQuery.Deferred();

        if (count % 10 === 0) {
            xGridVals.push(numXGridMarks * xGridWidth);
            numXGridMarks++;

            if (count % 40 === 0) {
                var time = xcHelper.getTime();
                time = time.substr(0, (time.length - 3));
                timeStamp = '<span>' + time + '</span>';
            }
        }
        var d = new Date();
        var date = xcHelper.getDate("-", d);
        var donutTime = xcHelper.getTime(d);
        $("#graphTime").text(date + " " + donutTime);

        var numNodes;
        var prevIteration = curIteration;
        var promise;
        var oldData;
        // only update memusage if first time, scren is visible, or interval is
        // infrequent
        if ($("#monitor-system").is(":visible") || firstTime ||
            intervalTime > 19999) {
            promise = XcalarGetMemoryUsage(userIdName, userIdUnique);
        } else {
            promise = PromiseHelper.resolve(tableUsage);
            oldData = true;
        }

        promise
        .then(function(userMemory) {
            if (!oldData) {
                tableUsage = getTableUsage(userMemory.userMemory.sessionMemory);
            }

            return XcalarApiTop();
        })
        .then(function(apiTopResult) {
            $("#upTime").text(xcHelper.timeStampConvertSeconds(
                apiTopResult.topOutputPerNode[0].uptimeInSeconds));
            if (prevIteration !== curIteration) {
                return deferred.resolve();
            }
            numNodes = apiTopResult.numNodes;
            if (!numNodes) {
                return deferred.reject();
            }
            var allStats = processNodeStats(apiTopResult, tableUsage, numNodes);
            updateGraph(allStats, numNodes);
            MonitorDonuts.update(allStats);
            failCount = 0;
            toggleErrorScreen();
            XcSupport.detectMemoryUsage(apiTopResult);
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("get status fails", error);
            failCount++;
            // if it fails 2 times in a row, we show error screen
            if (failCount === 2) {
                console.error("failed to get stats twice in a row");
                toggleErrorScreen(true, error);
            }
            deferred.reject();
        });

        count++;

        setTimeout(function() {
            // XXX Hack - the graph refuses to move unless I change more
            // of its attributes
            var rand = Math.random() * 0.1;
            svgWrap.attr("height", height + rand);
        }, 150);

        return deferred.promise();
    }

    function getTableUsage(sessions) {
        var bytes = 0;
        for (var i = 0; i < sessions.length; i++) {
            var tables = sessions[i].tableMemory;
            for (var j = 0; j < tables.length; j++) {
                bytes += tables[j].totalBytes;
            }
        }
        return bytes;
    }

    function processNodeStats(apiTopResult, tableUsage, numNodes) {
        var StatsObj = function() {
            this.used = 0;
            this.total = 0;
            this.nodes = [];
            return this;
        };


        var mem = new StatsObj();
        var swap = new StatsObj();
        var usrCpu = new StatsObj();
        mem.datasetUsage = 0;
        mem.xdbUsed = 0;
        mem.xdbTotal = 0;

        for (var i = 0; i < numNodes; i++) {
            var node = apiTopResult.topOutputPerNode[i];

            // usrNodeCpu
            var usrCpuPct = node.parentCpuUsageInPercent;
            usrCpu.used += usrCpuPct;
            usrCpu.total += 100;
            usrCpuPct = Math.round(usrCpuPct * 100) / 100;
            usrCpu.nodes.push({
                node: i,
                used: usrCpuPct,
                total: 100
            });

            // xdb memory - outer, primary donut
            var ramUsed = Math.round(node.totalAvailableMemInBytes *
                                    (node.memUsageInPercent / 100));

            mem.datasetUsage += node.datasetUsedBytes;
            mem.xdbUsed += node.xdbUsedBytes;
            mem.xdbTotal += node.xdbTotalBytes;
            mem.used += ramUsed;
            mem.total += node.totalAvailableMemInBytes;

            mem.nodes.push({
                node: i,
                xdbUsed: node.xdbUsedBytes,
                xdbTotal: node.xdbTotalBytes,
                used: ramUsed,
                total: node.totalAvailableMemInBytes
            });

            // swap
            swap.used += node.sysSwapUsedInBytes;
            swap.total += node.sysSwapTotalInBytes;
            swap.nodes.push({
                node: i,
                used: node.sysSwapUsedInBytes,
                total: node.sysSwapTotalInBytes
            });
        }

        usrCpu.used /= numNodes;
        usrCpu.total /= numNodes;
        mem.userTableUsage = tableUsage;
        mem.otherTableUsage = mem.xdbUsed - mem.userTableUsage - mem.datasetUsage;
        mem.xdbFree = mem.xdbTotal - mem.xdbUsed;
        mem.free = mem.total - mem.used;

        var allStats = [mem, swap, usrCpu];

        // make sure no values exceed total
        for (var i = 0; i < allStats.length; i++) {
            if (i === cpuIndex) {
                // cpu percentage may be over 100%
                allStats[i].used = Math.min(allStats[i].used, 100);
            } else {
                for (var attr in allStats[i]) {
                    if (attr !== "nodes" && attr !== "total") {
                        allStats[i][attr] = Math.min(allStats[i][attr],
                                                     allStats[i].total);
                    }
                }
            }
        }
        return (allStats);
    }

    function updateGraph(allStats, numNodes) {
        var unit;
        var yMaxes = [];
        var yMax;
        var units = [];
        var sizeOption = {base2: true};
        var memYMax = Math.max(allStats[memIndex].total, allStats[swapIndex].total);
        var memYVal = xcHelper.sizeTranslator(memYMax, true, false, sizeOption);

        for (var i = 0; i < datasets.length; i++) {
            var xVal = allStats[i].used;

            if (i === cpuIndex) { // cpu %
                xVal /= numNodes;
                xVal = Math.min(100, xVal);
                yMax = 100;
            } else { // memory
                yMax = memYVal[0];
                unit = memYVal[1];
                xVal = xcHelper.sizeTranslator(xVal, true, unit, sizeOption)[0];
                units.push(unit);
            }
            datasets[i].push(xVal);
            yMaxes.push(yMax);
        }

        redraw(newWidth, gridRight, yMaxes, units);

        $('#graph .xLabelsWrap').width(newWidth);
        svgWrap.attr("width", newWidth);
        newWidth += shiftWidth;
        gridRight += shiftWidth;

        if (timeStamp) {
            $('.xLabels').append(timeStamp);
            timeStamp = null;
        }

        if ($graphWrap.scrollLeft() >=
            (newWidth - $graphWrap.width() - xGridWidth))
        {
            $graphWrap.scrollLeft(newWidth);
        }
    }

    // monitor graph is made up of 2 grids, with "tempGrid" being one of them.
    // tempGrid is the initial grid you see, it is later pushed out by a new
    // grid that contains the colored graphs
    function createTempGrid() {
        var maxScreenSize = 4020; // grid has static size so we pick 4020
        // because it's wide enough to accomodate most screens
        var tempGridWrap = d3.select('#grids').append("svg");
        var gridSvg = tempGridWrap.attr("width", maxScreenSize)
                                .attr("height", height)
                                .attr("class", "gridSvg")
                                .append("g");
        var tempXGridVals = [];
        for (var i = 0; i < maxScreenSize; i += 60) {
            tempXGridVals.push(i);
        }

        var xScale = d3.scale.linear()
                          .domain([0, maxScreenSize])
                          .range([0, maxScreenSize]);

        var tempXAxis = d3.svg.axis()
                        .scale(xScale)
                        .orient("bottom")
                        .innerTickSize(-height)
                        .tickValues(tempXGridVals);

        gridSvg.append("g")
               .attr("class", "x axis")
               .attr("transform", "translate(0," + height + ")")
               .call(tempXAxis);

        yAxis.innerTickSize(-maxScreenSize);

        gridSvg.append("g")
               .attr("class", "y axis")
               .call(yAxis);
    }

    function setupLabelsPathsAndScales() {
        var xAxis;
        var $graph = $('#graph');
        $graph.find('svg').remove();

        xGridVals = [];
        for (var i = 0; i < 300; i += 60) {
            xGridVals.push(i);
        }

        xScale = d3.scale.linear()
                   .domain([0, 10])
                   .range([0, xGridWidth]);

        yScale = d3.scale.linear()
                    .range([height, 0]);

        xAxis = d3.svg.axis()
                    .scale(xScale)
                    .orient("bottom")
                    .innerTickSize(-height)
                    .ticks(1);

        yAxis = d3.svg.axis()
                    .scale(yScale)
                    .orient("left")
                    .innerTickSize(-xGridWidth);

        svg = d3.select("#graph .svgWrap").append("svg")
                    .attr("width", xGridWidth)
                    .attr("height", height)
                    .attr("class", "mainSvg")
                    .append("g");

        svg.append("g")
           .attr("class", "x axis")
           .attr("transform", "translate(0," + height + ")")
           .call(xAxis);

        svg.append("g")
           .attr("class", "y axis")
           .call(yAxis);

        for (var i = 0; i < datasets.length; i++) {
            var line = d3.svg.line()
                        .x(function(d, j) {
                            return (xScale(j));
                        })
                        .y(function(d) {
                            return (yScale(d));
                        });

            var area = d3.svg.area()
                        .x(function(d, j) {
                            return (xScale(j));
                        })
                        .y0(height)
                        .y1(function(d) {
                            return (yScale(d));
                        });

            svg.append("path")
               .data([datasets[i]])
               .attr("class", "line line" + i)
               .attr("transform", "translate(60, 0)")
               .attr("d", line);

            svg.append("path")
               .data([datasets[i]])
               .attr("class", "area area" + i)
               .attr("transform", "translate(60, 0)")
               .attr("d", area);
        }
    }

    function drawMemYAxes(yMax, unit) {
        $("#memYAxis").empty();
        var yScale = d3.scale.linear()
                        .domain([0, yMax])
                        .range([height, 0]);

        var yAxisStart = yMax / 5;
        var yAxisMax = yMax + 1;
        var yAxisSteps = yMax / 5;

        var yAxis = d3.svg.axis()
                        .scale(yScale)
                        .orient("left")
                        .innerTickSize(0)
                        .tickValues(d3.range(yAxisStart, yAxisMax,
                                             yAxisSteps));
        d3.select("#memYAxis").append("div")
                                .attr("class", "memYAxisWrap")
                                .append("svg")
                                .attr("width", 40)
                                .attr("height", height + 30)
                                .attr("class", "")
                                .append("g")
                                .attr("transform", "translate(28,8)")
                                .call(yAxis);
        $('#memYAxis').find(".memYAxisWrap")
                        .append('<span class="unit">0 (' + unit +
                                ')</span>')
                        .append('<span class="type"><span>Memory' +
                                '</span> / <span>Swap</span></span>');
    }

    function redraw(newWidth, gridRight, yMaxes, units) {
        if (firstTime) {
            // var memYMax = Math.max(yMaxes[memIndex], yMaxes[swapIndex]);
            // drawMemYAxes(memYMax, units[0]);
            drawMemYAxes(yMaxes[memIndex], units[memIndex]);
            firstTime = false;
        }

        for (var i = 0; i < datasets.length; i++) {
            var tempYScale = d3.scale
                            .linear()
                            .domain([0, yMaxes[i]])
                            .range([height, 0]);

            var line = d3.svg.line()
                            .x(function(d, j) {
                                return (xScale(j));
                            })
                            .y(function(d) {
                                return (tempYScale(d));
                            });

            var area = d3.svg.area()
                            .x(function(d, j) {
                                return (xScale(j));
                            })
                            .y0(height)
                            .y1(function(d) {
                                return (tempYScale(d));
                            });

            svg.selectAll(".line" + i)
               .data([datasets[i]])
               .attr("d", line);

            svg.selectAll(".area" + i)
               .data([datasets[i]])
               .attr("d", area);
        }

        var timeScale = d3.scale.linear()
                          .domain([0, newWidth])
                          .range([0, newWidth]);

        var xAxis = d3.svg.axis()
                          .scale(timeScale)
                          .orient("bottom")
                          .innerTickSize(-height)
                          .tickValues(xGridVals);

        svg.selectAll(".x")
            .call(xAxis);

        var yAxis = d3.svg.axis()
                          .scale(yScale)
                          .orient("left")
                          .innerTickSize(-newWidth);

        svg.selectAll(".y")
           .call(yAxis);

        $('.gridSvg').css('right', gridRight + 'px');
    }

    function toggleErrorScreen(show, error) {
        var $errorScreen = $("#monitor-graphCard").find(".statsErrorContainer");
        if (show) {
            $errorScreen.removeClass("xc-hidden");
            var msg;
            // if no error, or error.error doesn't exist, or error.error is
            // udf execute failed, change msg to custom message
            if (!error || (!error.error ||
                error.status === StatusT.StatusUdfExecuteFailed)) {
                msg = MonitorTStr.StatsFailed;
            } else {
                msg = error.error;
            }
            $errorScreen.text(msg);
        } else { // hide the error screen
            $errorScreen.empty().addClass("xc-hidden");
        }
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        MonitorGraph.__testOnly__ = {};
        MonitorGraph.__testOnly__.updateGraph = getStatsAndUpdateGraph;
        MonitorGraph.__testOnly__.reset = function(dSets) {
            firstTime = true;
            datasets = dSets;
        };
    }
    /* End Of Unit Test Only */

    return (MonitorGraph);

}(jQuery, {}));
