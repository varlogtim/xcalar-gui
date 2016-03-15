// sets up monitor panel and donuts, not monitor graph
window.MonitorPanel = (function($, MonitorPanel) {
    MonitorPanel.setup = function() {
        var $monitorPanel = $("#monitorPanel");

        initializeDonuts();
        populateNodeInformation();
        $monitorPanel = $('#monitorPanel');

        $("#monitorTopBar").on("click", ".buttonArea", function() {
            var $btn = $(this);

            if ($btn.hasClass("active")) {
                return;
            }

            $btn.siblings(".active").removeClass("active");
            $monitorPanel.find(".monitorSection.active").removeClass("active");

            $btn.addClass("active");

            switch ($btn.attr("id")) {
                case ("systemButton"):
                    $("#monitor-system").addClass("active");
                    break;
                case ("queriesButton"):
                    $("#monitor-queries").addClass("active");
                    break;
                case ("setupButton"):
                    $("#monitor-setup").addClass("active");
                    break;
                default:
                    break;
            }

        });

        // text next to refreshBtn
        $('#refreshGraph').click(function() {
            toggleRefresh($('#refreshBtn'));
        });

        $('#refreshBtn').click(function() {
            toggleRefresh($(this));
        });

        $('#asupBtn').click(function() {
            var $target = $(this);

            if ($target.hasClass('off')) {
                $target.removeClass('off');
            } else {
                $target.addClass('off');
            }
        });

        $("#subBtn").click(function() {
            var $btn = $(this).blur();
            xcHelper.toggleBtnInProgress($btn);

            xcHelper.genSub()
            .always(function() {
                xcHelper.toggleBtnInProgress($btn);
            });
        });

        $('.statsHeadingBar').click(function() {
            if ($(this).hasClass('open')) {
                $(this).removeClass('open')
                       .next().children()
                       .slideUp(200)
                       .removeClass('open');
            } else {
                $(this).addClass('open')
                       .next().children()
                       .slideDown(200)
                       .addClass('open');
            }
        });

        var graphInterval;
        var refreshTime = 4000;

        function toggleRefresh($target) {
            if ($target.hasClass('off')) {
                $target.removeClass('off');
                turnOnAutoRefresh();
            } else {
                $target.addClass('off');
                clearInterval(graphInterval);
            }
        }

        function turnOnAutoRefresh() {
            MonitorPanel.updateDonuts();
            graphInterval = setInterval(function() {
                MonitorPanel.updateDonuts();
            }, refreshTime);
        }

        MonitorGraph.setup();
    };

    MonitorPanel.updateDonuts = function() {
        if (!$('#monitorTab').hasClass('active')) {
            return;
        }
        var d = new Date();
        var date = xcHelper.getDate("-", d);
        var time = xcHelper.getTime(d);
        $("#graphTime").text(date + " " + time);
        var numNodes = 0;
        var apiTopResult;

        XcalarApiTop()
        .then(function(result) {
            apiTopResult = result;
            numNodes = result.numNodes;
            return (XcalarGetStats(numNodes));
        })
        .then(function(nodes) {
            var allStats = MonitorPanel.processNodeStats(nodes, apiTopResult,
                                                         numNodes);
            updateDonutSection(allStats, numNodes);
        })
        .fail(function(error) {
            console.error('XcalarGetStats failed', error);
        });
    };

    MonitorPanel.processNodeStats = function(nodes, apiTopResult, numNodes) {
        var StatsObj = function() {
            this.used = [];
            this.tot = [];
            this.sumUsed = 0;
            this.sumTot = 0;
        };

        var cpu = new StatsObj();
        var ram = new StatsObj();
        var flash = new StatsObj();
        var disk = new StatsObj();
        for (var i = 0; i < numNodes; i++) {
            var cpuPct = apiTopResult.topOutputPerNode[i].cpuUsageInPercent;
            cpuPct = Math.round(cpuPct * 100) / 100;
            cpu.used.push(cpuPct);
            cpu.sumUsed += cpuPct;
            cpu.sumTot += 100;

            var ramUsed = apiTopResult.topOutputPerNode[i].memUsedInBytes;
            var ramTot =
                apiTopResult.topOutputPerNode[i].totalAvailableMemInBytes;
            ramUsed = ramUsed;
            ramTot = ramTot;
            ram.used.push(ramUsed);
            ram.tot.push(ramTot);
            ram.sumUsed += ramUsed;
            ram.sumTot += ramTot;

            var flashUsed = nodes[i].usedFlash;
            var flashTot = nodes[i].totFlash;
            flash.used.push(flashUsed);
            flash.tot.push(flashTot);
            flash.sumUsed += flashUsed;
            flash.sumTot += flashTot;

            var diskUsed = nodes[i].usedDisk * 5;
            var diskTot = nodes[i].totDisk * 5;
            disk.used.push(diskUsed);
            disk.tot.push(diskTot);
            disk.sumUsed += diskUsed;
            disk.sumTot += diskTot;
        }
        var allStats = [cpu, ram, flash, disk];

        return (allStats);
    };

    function initializeDonuts() {
        var numDonuts = 4;
        var blueOuter = '#20a7eb';
        var greenOuter = '#90c591';
        var brownOuter = '#bbae84';
        var tealOuter = '#1193b8';
        var grayOuter = '#cecece';
        var colors = [blueOuter, greenOuter, brownOuter, tealOuter];
        var diameter = 180;
        var radius = diameter / 2;
        var arc = d3.svg.arc()
                    .innerRadius(radius)
                    .outerRadius(radius - 40);
        var pie = d3.layout.pie()
                .sort(null);

        var color;
        var svg;
        for (var i = 0; i < numDonuts; i++) {
            color = d3.scale.ordinal().range([colors[i], grayOuter]);
            svg = makeSvg('#donut' + i + ' .donut');
            drawPath(svg, color, pie, arc);
        }

        function makeSvg (selector) {
            var svg = d3.select(selector).append("svg")
                        .attr("width", diameter)
                        .attr("height", diameter)
                        .append("g")
                        .attr("transform", "translate(" + radius + "," +
                               radius + ") rotate(180, 0,0)");
            return (svg);
        }

        function drawPath(svg, color) {
            var data = [0, 100];
            svg.selectAll("path")
                .data(pie(data))
                .enter()
                .append("path")
                .attr("fill", function(d, i) {
                    return (color(i));
                })
                .attr("d", arc)
                .each(function(d) {
                    this._current = d; // store the initial angles
                });
        }
    }

    function updateDonutSection(allStats, numNodes) {
        $('.donut').each(function(index) {
            var el = this;
            var used;
            var total;

            if (index === 0) {
                used = allStats[index].sumUsed / numNodes;
                total = allStats[index].sumTot / numNodes;
            } else {
                used = allStats[index].sumUsed;
                total = allStats[index].sumTot;
            }

            updateOneDonut(el, used, total);
            updateDonutStatsSection(el, index, allStats[index]);
        });
    }

    function updateOneDonut(el, val, total) {
        var duration = 750;
        var index = parseInt($(el).closest('.donutSection')
                                  .attr('id').substring(5));
        var pie = d3.layout.pie().sort(null);
        var userSize = val;
        if (index === 0) {
            val = Math.min(100, val); // cpu percentage may be over 100%
        } else {
            val = Math.min(val, total);
        }

        var data = [val, total - val];
        var donut = d3.select(el);
        var paths = donut.selectAll("path").data(pie(data));
        var diameter = 180;
        var radius = diameter / 2;
        var arc = d3.svg.arc()
                    .innerRadius(radius)
                    .outerRadius(radius - 40);

        paths.transition()
             .duration(duration)
             .attrTween("d", arcTween);

        updateDonutNums('#donut' + index + ' .userSize .num', userSize, duration,
                        index);
        updateDonutNums('#donut' + index + ' .totalSize .num', total, duration,
                        index);

        function arcTween(a) {
            var i = d3.interpolate(this._current, a);
            this._current = i(0);
            return (function(t) {
                return (arc(i(t)));
            });
        }
    }

    function updateDonutNums(selector, num, duration, index) {
            var $sizeType = $(selector).next();
            var type = $sizeType.text();
            d3.select(selector)
                .transition()
                .duration(duration)
                .tween("text", function() {
                    var startNum = this.textContent;
                    var size = xcHelper.sizeTranslater(num, true);
                    var i;

                    if (index === 1 || index === 2) {
                        startNum = xcHelper.textToBytesTranslator(startNum +
                                                                  type);
                        i = d3.interpolate(startNum, num);
                    } else {
                        i = d3.interpolate(startNum, size[0]);
                    }

                    return (function(t) {
                        var size = xcHelper.sizeTranslater(i(t), true);
                        num = parseFloat(size[0]).toFixed(1);
                        if (num >= 10 || index === 0) {
                            num = Math.round(num);
                        }
                        if (index === 0) {
                            this.textContent = num;
                            return;
                        }
                        if (index !== 3) {
                            $sizeType.html(size[1]);
                        }

                        this.textContent = num;
                    });
                });
        }

    function updateDonutStatsSection(el, index, stats) {
        //this is for the list of stats located below the donut
        var numNodes = stats.used.length;
        var $statsSection = $(el).next();
        var listHTML = "";

        if (index === 0) {
            var avgUsed = Math.round((stats.sumUsed / numNodes) * 100) / 100;
            $statsSection.find('.statsHeadingBar .avgNum').text(avgUsed);

            for (var i = 0; i < numNodes; i++) {
                listHTML += '<li>' +
                                '<span class="name">' +
                                    'Node ' + (i + 1) +
                                '</span>' +
                                '<span class="statsNum">' +
                                    stats.used[i] + '%' +
                                '</span>' +
                            '</li>';
            }
        } else {
            var sumTotal = xcHelper.sizeTranslater(stats.sumTot, true);
            var sumUsed = xcHelper.sizeTranslater(stats.sumUsed, true);
            if (index !== 3) {
                $statsSection.find('.statsHeadingBar .totNum')
                             .text(sumTotal[0] + " " + sumTotal[1]);
                $statsSection.find('.statsHeadingBar .avgNum')
                             .text(sumUsed[0] + " " + sumUsed[1]);
            }

            for (var i = 0; i < numNodes; i++) {
                var total = xcHelper.sizeTranslater(stats.tot[i], true);
                var used = xcHelper.sizeTranslater(stats.used[i], true);
                var usedUnits;
                var totalUnits;

                if (index === 3) {
                    usedUnits = totalUnits = "Mbps";
                } else {
                    usedUnits = used[1];
                    totalUnits = total[1];
                }

                listHTML += '<li>' +
                                '<span class="name">' +
                                    'Node ' + (i + 1) +
                                '</span>' +
                                '<span class="userSize">' +
                                    used[0] + " " + usedUnits +
                                '</span>' +
                                '<span class="totalSize">' +
                                    total[0] + " " + totalUnits +
                                '</span>' +
                            '</li>';
            }
        }
        $statsSection.find('ul').html(listHTML);
    }

    function populateNodeInformation() {
        $("#phyNode").text(hostname);
        // Insert information here regarding virtual nodes next time
    }


    return (MonitorPanel);
}(jQuery, {}));


window.MonitorGraph = (function($, MonitorGraph) {
    var interval = 3000; // update interval in milliseconds
    var xGridWidth = 60; // space between each x-axis grid line
    var height = 210;
    var yAxis;
    var yScale;
    var datasets;
    var xGridVals;
    var svg;
    var graphCycle;

    MonitorGraph.setup = function() {
        var $monitorPanel = $('#monitorPanel');
        $monitorPanel.find('.sideTab').click(function() {
            var index = $(this).index();

            if (index > 1) {
                return;
            }

            if ($(this).hasClass('active')) {
                $(this).removeClass('active');
                $monitorPanel.find('.line' + index).hide();
                $monitorPanel.find('.area' + index).hide();
            } else {
                $(this).addClass('active');
                var $area = $monitorPanel.find('.area' + index);
                var $line = $monitorPanel.find('.line' + index);

                $area.show();
                $line.show();
                $('.mainSvg').children().append($line, $area);
            }
        });

        $('#graph').on('click', '.area', function() {
            var $area = $(this);
            var $line = $(this).prev();

            if ($area.css('opacity') > 0.5) {
                $area.css('opacity', 0.2);
            } else {
                $area.css('opacity', 0.6);
            }

            $('.mainSvg').children().append($line, $area);
        });
    };

    MonitorGraph.start = function() {
        datasets = [[0], [0]];

        $('#ramTab, #cpuTab').addClass('active');

        setupLabelsPathsAndScales();

        setTimeout(function() {
            //XX Hack - the graph refuses to move unless I change more
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
        clearInterval(graphCycle);
    };

    MonitorGraph.stop = function() {
        clearInterval(graphCycle);
    };

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

    function startCycle() {
        count = 0;
        newWidth = xGridWidth + shiftWidth;
        numXGridMarks = 5;
        gridRight = shiftWidth;
        $graphWrap = $('#graphWrap');
        svgWrap = svg.select(function() {
                            return (this.parentNode);
                        });
        var apiTopResult;
        firstTime = true;

        getStatsAndUpdateGraph(firstTime);
        graphCycle = setInterval(getStatsAndUpdateGraph, interval);
    }

    function getStatsAndUpdateGraph(firstTime) {
        var numNodes;
        if (count % 10 === 0) {
            xGridVals.push(numXGridMarks * xGridWidth);
            numXGridMarks++;

            if (count % 40 === 0) {
                var time = xcHelper.getTime();
                time = time.substr(0, (time.length - 3));
                timeStamp = '<span>' + time + '</span>';
            }
        }

        XcalarApiTop()
        .then(function(result) {
            apiTopResult = result;
            numNodes = result.numNodes;
            return (XcalarGetStats(numNodes));
        })
        .then(function(nodes) {
            var allStats = MonitorPanel.processNodeStats(nodes,
                                                    apiTopResult, numNodes);
            updateGraph(allStats, numNodes);

        })
        .fail(function(error) {
            console.error('XcalarGetStats failed', error);
        });

        count++;

        setTimeout(function() {
            //XX Hack - the graph refuses to move unless I change more
            // of its attributes
            var rand = Math.random() * 0.1;
            svgWrap.attr("height", height + rand);
        }, 150);
    }

    function updateGraph(allStats, numNodes) {
        var numGraphs = 2;
        for (var i = 0; i < numGraphs; i++) {
            var xVal = allStats[i].sumUsed;
            if (i === 0) { // cpu %
                xVal /= numNodes;
                xVal = Math.min(100, xVal);
            }

            if (i === 1) {
                xVal = xcHelper.sizeTranslater(xVal, true)[0];
            }
            datasets[i].push(xVal);
        }
        var yMax = xcHelper.sizeTranslater(allStats[1].sumTot, true)[0];
        yMax = [100, yMax];

        redraw(newWidth, gridRight, numGraphs, yMax);

        $('.xLabelsWrap').width(newWidth);
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
        var numGraphs = datasets.length;
        var xAxis;

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

        var svgWrap = d3.select("#graph .svgWrap").append("svg");

        svg = svgWrap.attr("width", xGridWidth)
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

        for (var i = 0; i < numGraphs; i++) {
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

    function drawRightYAxis(yMax) {
        var yScale = d3.scale.linear()
                            .domain([0, yMax[1]])
                            .range([height, 0]);

        var yAxisStart = yMax[1] / 5;
        var yAxisMax = yMax[1] + 1;
        var yAxisSteps = yMax[1] / 5;

        var yAxis = d3.svg.axis()
                        .scale(yScale)
                        .orient("right")
                        .innerTickSize(0)
                        .tickValues(d3.range(yAxisStart,
                                             yAxisMax, yAxisSteps));

        d3.select("#rightYAxis").append("svg")
                                .attr("width", 40)
                                .attr("height", height + 30)
                                .attr("class", "rightYAxisWrap")
                                .append("g")
                                .attr("transform",
                                      "translate(-2,8)")
                                .call(yAxis);
    }

    function redraw(newWidth, gridRight, numGraphs, yMax) {
        if (firstTime) {
            drawRightYAxis(yMax);
            firstTime = false;
        }

        for (var i = 0; i < numGraphs; i++) {

            var tempYScale = d3.scale
                            .linear()
                            .domain([0, yMax[i]])
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

    return (MonitorGraph);

}(jQuery, {}));
