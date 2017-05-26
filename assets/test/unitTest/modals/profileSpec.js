describe("Profile Test", function() {
    var dsName, tableName, tableId, prefix, colNum;
    var $modal;

    before(function(done) {
        $modal = $("#profileModal");
        UnitTest.onMinMode();

        UnitTest.addAll(testDatasets.fakeYelp, "yelp_profile_test")
        .then(function(resDS, resTable, resPrefix) {
            dsName = resDS;
            tableName = resTable;
            tableId = xcHelper.getTableId(tableName);
            prefix = resPrefix;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    describe("Show Profile Test", function() {
        it("Should show profile", function(done) {
            var table = gTables[tableId];
            var backCol = xcHelper.getPrefixColName(prefix, "average_stars");
            colNum = table.getColNumByBackName(backCol);

            Profile.show(tableId, colNum)
            .then(function() {
                assert.isTrue($modal.is(":visible"));
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should toggle the pop bar", function(done) {
            $modal.find(".popBar").click();
            // wait for animataion
            setTimeout(function() {
                expect($modal.hasClass("collapse")).to.be.true;
                $modal.find(".popBar").click();
                setTimeout(function() {
                    expect($modal.hasClass("collapse")).to.be.false;
                    done();
                }, 300);
            }, 300);
        });
    });

    describe("Profile Cache Test", function() {
        it("Profile.getCache should work", function() {
            var cache = Profile.getCache();
            expect(cache).to.be.an("object");
        });

        it("Profile.deleteCache should work", function() {
            var cache = Profile.getCache();
            var key = xcHelper.randName("testKey");
            cache[key] = "test";

            Profile.deleteCache(key);
            expect(cache.hasOwnProperty(key)).to.be.false;
        });

        it("Profile.copy should work", function() {
            var cache = Profile.getCache();
            var key = xcHelper.randName("testKey");
            var key2 = xcHelper.randName("testKey2");
            cache[key] = "test";

            Profile.copy(key, key2);
            expect(cache.hasOwnProperty(key2)).to.be.true;

            Profile.deleteCache(key);
            Profile.deleteCache(key2);
        });

        it("Profile.copy should handle error case", function() {
            var cache = Profile.getCache();
            var key = xcHelper.randName("testKey");
            var key2 = xcHelper.randName("testKey2");

            Profile.copy(key, key2);
            expect(cache.hasOwnProperty(key2)).to.be.false;
        });
    });

    describe("Profile SVG Test", function() {
        it("getNumInScale should work", function() {
            var getNumInScale = Profile.__testOnly__.getNumInScale;
            var res = getNumInScale(1);
            expect(res).to.equal(1);
            // case 2
            res = getNumInScale(0, true);
            expect(res).to.equal(0);
            // case 3
            res = getNumInScale(2, true);
            expect(res).to.equal(10);
            // case 4
            res = getNumInScale(-2, true);
            expect(res).to.equal(-10);
        });

        it("addNullValue should work", function() {
            var addNullValue = Profile.__testOnly__.addNullValue;
            var data = [];
            addNullValue({"groupByInfo": {}}, data);
            expect(data.length).to.equal(0);

            // csae 2
            addNullValue({
                "groupByInfo": {
                    "nullCount": 10,
                    "buckets": {
                        0: "test"
                    }
                }
            }, data);
            expect(data.length).to.equal(1);
        });

        it("formatNumber should work", function() {
            var formatNumber = Profile.__testOnly__.formatNumber;
            var res = formatNumber(null);
            expect(res).to.equal("");
            // case 2
            res = formatNumber("1");
            expect(res).to.equal("\"1\"");
            // case 3
            res = formatNumber(true);
            expect(res).to.equal(true);
            // case 4
            var obj = {};
            res = formatNumber(obj);
            expect(res).to.equal(obj);
            // case 5
            res = formatNumber(1);
            expect(res).to.equal("1");
            // case 6
            res = formatNumber(1, true);
            expect(res).to.equal(1);
            // case 7
            res = formatNumber(2, true);
            expect(res).to.equal("2e+0");
            // case 8
            res = formatNumber(1, false, 2);
            expect(res).to.equal("1.00");
        });

        it("Should hover on bar area", function() {
            var $barArea = $modal.find(".barArea").eq(0);
            $barArea.trigger("mouseenter");
            // .hasClass not work on svg
            var classList = $barArea.get(0).classList;
            expect(classList.contains("hover")).to.be.true;
            var tooltipLen = $(".bartip:visible").length;
            expect(tooltipLen).to.be.at.least(1);
            // not hover
            $modal.trigger("mouseenter");
            classList = $barArea.get(0).classList;
            expect(classList.contains("hover")).to.be.false;
            newTooltipLen = $(".bartip:visible").length;
            expect(newTooltipLen).to.equal(tooltipLen - 1);
        });

        it("Should toggle between percentage display", function() {
            var $label = $modal.find(".xlabel").eq(0);
            expect($label.text().includes("%")).to.be.false;
            // click without event.which = 1 not do anyting
            $label.click();
            expect($label.text().includes("%")).to.be.false;
            // to percentage display
            $label.trigger(fakeEvent.click);
            expect($label.text().includes("%")).to.be.true;
            // turn back
            $label.trigger(fakeEvent.click);
            expect($label.text().includes("%")).to.be.false;
        });
    });

    describe("Decimal Places Test", function() {
        var $decimalInput;

        before(function() {
            $decimalInput = $modal.find(".decimalInput");
        });

        it("should click to change decimal", function() {
            $decimalInput.find(".more").click();
            expect($decimalInput.find("input").val()).to.equal("0");

            $decimalInput.find(".less").click();
            expect($decimalInput.find("input").val()).to.equal("");
        });

        it("should intput to changne decimal", function() {
            var $input = $decimalInput.find("input");
            var $less = $decimalInput.find(".less");

            $input.val(2).trigger(fakeEvent.enterKeydown);
            expect($less.hasClass("xc-disabled")).to.be.false;

            $input.val(6).trigger(fakeEvent.enterKeydown);
            var err = xcHelper.replaceMsg(ErrWRepTStr.IntInRange, {
                "lowerBound": 0,
                "upperBound": 5
            });
            UnitTest.hasStatusBoxWithError(err);

            $input.val("").trigger(fakeEvent.enterKeydown);
            expect($less.hasClass("xc-disabled")).to.be.true;
        });
    });

    describe("Skip Rows Test", function() {
        var $skipInput;
        var $scrollSection;

        before(function() {
            $skipInput = $("#profile-rowInput");
            $scrollSection = $modal.find(".scrollSection");
        });

        it("Should skip to rows", function(done) {
            $skipInput.val(50).trigger(fakeEvent.enter);

            waitForFetch()
            .then(function() {
                assert.isTrue($modal.find(".left-arrow").is(":visible"));
                assert.isTrue($modal.find(".right-arrow").is(":visible"));
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should click right arrow to change row num", function(done) {
            var rowNum = $skipInput.val();
            $modal.find(".right-arrow").trigger(fakeEvent.mousedown);

            waitForFetch()
            .then(function() {
                expect($skipInput.val()).to.above(rowNum);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should click left arrow to change row num", function(done) {
            var rowNum = $skipInput.val();
            $modal.find(".left-arrow").trigger(fakeEvent.mousedown);

            waitForFetch()
            .then(function() {
                expect($skipInput.val()).to.below(rowNum);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should use scroll bar to move", function(done) {
            var $scrollerBar = $scrollSection.find(".scrollBar");
            var $scroller = $scrollSection.find(".scroller");
            var offset = $scrollerBar.offset().left;
            var rowNum = $skipInput.val();

            $scrollerBar.trigger(fakeEvent.mousedown);
            var event1 = jQuery.Event("mousedown", {"pageX": offset + 5});
            $scroller.trigger(event1);
            expect($scroller.hasClass("scrolling")).to.be.true;
            // move scroll bar
            var oldLeft = $scroller.css("left");
            var event2 = jQuery.Event("mousemove", {"pageX": offset + 50});
            $(document).trigger(event2);
            expect($scroller.css("left")).to.above(oldLeft);
            var event3 = jQuery.Event("mouseup", {"pageX": offset + 50});
            $(document).trigger(event3);

            expect($scroller.hasClass("scrolling")).to.be.false;

            waitForFetch()
            .then(function() {
                expect($skipInput.val()).to.above(rowNum);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should display more rows", function(done) {
            var $displayInput = $modal.find(".displayInput");
            var numRows = Number($displayInput.find(".numRows").val());
            expect(numRows).to.equal(20);

            $modal.find(".displayInput .more").click();
            waitForFetch()
            .then(function() {
                var numRows = Number($displayInput.find(".numRows").val());
                expect(numRows).to.equal(30);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should display less rows", function(done) {
            var $displayInput = $modal.find(".displayInput");
            $modal.find(".displayInput .less").click();

            waitForFetch()
            .then(function() {
                var numRows = Number($displayInput.find(".numRows").val());
                expect(numRows).to.equal(20);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        function waitForFetch() {
            // XXX it's a hack here to manually add the class
            // and wait till fetchGroupbyData finish to remove the class
            $scrollSection.addClass("disabled");

            var checkFunc = function() {
                return !$scrollSection.hasClass("disabled");
            };

            return UnitTest.testFinish(checkFunc);
        }
    });

    describe("Sort Behavior Test", function() {
        var $sortSection;

        before(function() {
            $sortSection = $modal.find(".sortSection");
        });

        it("Default should in origin sort", function() {
            expect($sortSection.find(".origin").hasClass("active"))
            .to.be.true;
        });

        it("Should do asc sort", function(done) {
            var $asc = $sortSection.find(".asc");
            $asc.click();
            expect($modal.attr("data-state")).to.equal("pending");

            var checkFunc = function() {
                return $modal.attr("data-state") === "finished";
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($asc.hasClass("active")).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should do desc sort", function(done) {
            var $desc = $sortSection.find(".desc");
            $desc.click();
            expect($modal.attr("data-state")).to.equal("pending");

            var checkFunc = function() {
                return $modal.attr("data-state") === "finished";
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($desc.hasClass("active")).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should back to origin sort", function(done) {
            var $origin = $sortSection.find(".origin");
            $origin.click();
            expect($modal.attr("data-state")).to.equal("pending");

            var checkFunc = function() {
                return $modal.attr("data-state") === "finished";
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($origin.hasClass("active")).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    describe("Range bucket test", function() {
        var $rangeSection;
        var $dropdown;

        before(function() {
            $rangeSection = $modal.find(".rangeSection");
            $dropdown = $rangeSection.find(".dropDownList");
        });

        it("Should in single bucket by default", function() {
            expect($dropdown.find("input").val()).to.equal("Single");
        });

        it("Should range bucket", function(done) {
            var $range = $dropdown.find('li[name="range"]');
            $range.trigger(fakeEvent.mouseup);
            expect($dropdown.find("input").val()).to.equal("Range");


            $("#profile-range").val(10).trigger(fakeEvent.enter);
            expect($modal.attr("data-state")).to.equal("pending");

            var checkFunc = function() {
                return $modal.attr("data-state") === "finished";
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($modal.find(".bar").length).to.equal(1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should range log bucket", function(done) {
            var $range = $dropdown.find('li[name="rangeLog"]');
            $range.trigger(fakeEvent.mouseup);
            expect($dropdown.find("input").val()).to.equal("Range (log scale)");

            var checkFunc = function() {
                return $modal.attr("data-state") === "finished";
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($modal.find(".bar").length).to.equal(1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should fit all", function(done) {
            var $fitAll = $dropdown.find('li[name="fitAll"]');
            $fitAll.trigger(fakeEvent.mouseup);
            expect($modal.attr("data-state")).to.equal("pending");

            var checkFunc = function() {
                return $modal.attr("data-state") === "finished";
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($dropdown.find("input").val()).to.equal("Fit all");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should back to single bucket", function(done) {
            var $single = $dropdown.find('li[name="single"]');
            $single.trigger(fakeEvent.mouseup);
            expect($modal.attr("data-state")).to.equal("pending");

            var checkFunc = function() {
                return $modal.attr("data-state") === "finished";
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($dropdown.find("input").val()).to.equal("Single");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    describe("Stats Test", function() {
        var $statsSection;

        before(function() {
            $statsSection = $("#profile-stats");
        });

        it("should gen agg", function(done) {
            var $btn = $statsSection.find(".genAgg");
            $btn.click();
            expect($btn.hasClass("xc-disabled"));

            var checkFunc = function() {
                return !$btn.hasClass("xc-disabled");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                var $avg = $statsSection.find(".aggInfo .info").eq(1);
                expect($avg.find(".text").text()).to.equal("3.778");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should gen stats", function(done) {
            var $statsInfo = $statsSection.find(".statsInfo");
            expect($statsInfo.hasClass("hasStats")).to.be.false;

            $statsInfo.find(".genStats").click();
            var checkFunc = function() {
                var $zeroQuantile = $statsInfo.find(".info").eq(0);
                return $zeroQuantile.find(".text").text() === "1";
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($statsInfo.hasClass("hasStats")).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should click to go to corr modal", function() {
            var oldCorr = AggModal.corrAgg;
            var test = false;
            AggModal.corrAgg = function() {
                test = true;
            };

            $("#profile-corr").click();
            expect(test).to.be.true;
            assert.isFalse($modal.is(":visible"));
            AggModal.corrAgg = oldCorr;
        });
    });

    describe("Filter selection test", function() {
        var $filterOption;

        before(function() {
            $filterOption = $("#profile-filterOption");
        });

        it("should show the profile", function(done) {
            Profile.show(tableId, colNum)
            .then(function() {
                var checkFunc = function() {
                    return $modal.find(".bar").length > 0;
                };

                return UnitTest.testFinish(checkFunc);
            })
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("fltExist should work", function() {
            var fltExist = Profile.__testOnly__.fltExist;
            var res = fltExist(FltOp.Filter, "test");
            expect(res).to.equal("not(exists(test))");
            // case 2
            res = fltExist(FltOp.Filter, "test", "fltStr");
            expect(res).to.equal("or(fltStr, not(exists(test)))");
            // case 3
            res = fltExist(FltOp.Exclude, "test");
            expect(res).to.equal("exists(test)");
            // case 4
            res = fltExist(FltOp.Exclude, "test", "fltStr");
            expect(res).to.equal("and(fltStr, exists(test))");
        });

        it("getBucketFltOpt should work", function() {
            var getBucketFltOpt = Profile.__testOnly__.getBucketFltOpt;
            // case 1
            var res = getBucketFltOpt(null, "test", {});
            expect(res).to.be.null;

            // case 2
            res = getBucketFltOpt(FltOp.Filter, "test", {
                1: true,
                2: true
            }, true, 1);
            expect(res).to.be.an("object");
            expect(res.operator).to.equal(FltOp.Filter);
            expect(res.filterString)
            .to.equal("or(or(and(ge(test, 1), lt(test, 2)), and(ge(test, 2), lt(test, 3))), not(exists(test)))");

            // caser 3
            res = getBucketFltOpt(FltOp.Exclude, "test", {
                2: true,
                3: true
            }, false, 1);
            expect(res).to.be.an("object");
            expect(res.operator).to.equal(FltOp.Exclude);
            expect(res.filterString)
            .to.equal("and(or(lt(test, 2), ge(test, 3)), or(lt(test, 3), ge(test, 4)))");
        });

        it("getNumFltOpt should work", function() {
            var getNumFltOpt = Profile.__testOnly__.getNumFltOpt;
            // case 1
            var res = getNumFltOpt(FltOp.Filter, "test", {}, true);
            expect(res).to.be.an("object");
            expect(res.operator).to.equal(FltOp.Filter);
            expect(res.filterString).to.equal("not(exists(test))");
            // case 2
            res = getNumFltOpt(FltOp.Filter, "test", {1: true}, true);
            expect(res).to.be.an("object");
            expect(res.operator).to.equal(FltOp.Filter);
            expect(res.filterString)
            .to.equal("or(eq(test, 1), not(exists(test)))");
            // case 3
            res = getNumFltOpt(FltOp.Filter, "test", {
                1: true,
                2: true
            });
            expect(res).to.be.an("object");
            expect(res.operator).to.equal(FltOp.Filter);
            expect(res.filterString)
            .to.equal("and(ge(test, 1), le(test, 2))");
            // case 4
            res = getNumFltOpt(FltOp.Exclude, "test", {1: true});
            expect(res).to.be.an("object");
            expect(res.operator).to.equal(FltOp.Exclude);
            expect(res.filterString)
            .to.equal("neq(test, 1)");
            // case 5
            res = getNumFltOpt(FltOp.Exclude, "test", {
                1: true,
                2: true
            });
            expect(res).to.be.an("object");
            expect(res.operator).to.equal(FltOp.Exclude);
            expect(res.filterString)
            .to.equal("or(lt(test, 1), gt(test, 2))");
            // case 6
            res = getNumFltOpt("wrongOperator", "test", {});
            expect(res).to.be.null;
            // case 7
            res = getNumFltOpt(FltOp.Filter, "test", {1: true}, false, 1);
            expect(res).to.be.an("object");
            expect(res.operator).to.equal(FltOp.Filter);
            expect(res.filterString)
            .to.equal("and(ge(test, 1), lt(test, 2))");
            // case 8
            res = getNumFltOpt(FltOp.Exclude, "test", {1: true}, false, 1);
            expect(res).to.be.an("object");
            expect(res.operator).to.equal(FltOp.Exclude);
            expect(res.filterString)
            .to.equal("or(lt(test, 1), ge(test, 2))");
            // case 9
            res = getNumFltOpt("wrongOperator", "test", {}, false, 1);
            expect(res).to.be.null;
        });

        it("Should create selection", function() {
            var $chart = $("#profile-chart");
            var offsest = $chart.offset();
            var e = jQuery.Event("mousedown", {
                "which": 1,
                "pageX": offsest.left + 50,
                "pageY": offsest.top + 50
            });

            $chart.trigger(e);
            expect($("#profile-filterSelection").length).to.equal(1);
            var e2 = jQuery.Event("mousemove", {
                "pageX": offsest.left + 100,
                "pageY": offsest.top + 100
            });
            // need to trigger twice mousemove
            $(document).trigger(e2);
            $(document).trigger(e2);
            $(document).trigger("mouseup");
            assert.isTrue($filterOption.is(":visible"));
        });

        it("Should cancel the option", function(done) {
            $filterOption.find(".cancel").trigger(fakeEvent.mousedown);
            // has animation
            setTimeout(function() {
                assert.isFalse($filterOption.is(":visible"));
                done();
            }, 300);
        });

        it("should click to filter", function() {
            var oldFilter = xcFunction.filter;
            var test = false;
            xcFunction.filter = function() {
                test = true;
            };

            // create selection
            var $chart = $("#profile-chart");
            var offsest = $chart.offset();
            var e = jQuery.Event("mousedown", {
                "which": 1,
                "pageX": offsest.left + 50,
                "pageY": offsest.top + 50
            });

            $chart.trigger(e);
            var e2 = jQuery.Event("mousemove", {
                "pageX": offsest.left + 100,
                "pageY": offsest.top + 100
            });
            // need to trigger twice mousemove
            $(document).trigger(e2);
            $(document).trigger(e2);
            $(document).trigger("mouseup");
            $filterOption.find(".filter").trigger(fakeEvent.mousedown);
            expect(test).to.be.true;
            assert.isFalse($modal.is(":visible"));
            xcFunction.filter = oldFilter;
        });
    });

    describe("Close Profile and Clean up Test", function() {
        it("should show the profile", function(done) {
            Profile.show(tableId, colNum)
            .then(function() {
                var checkFunc = function() {
                    return $modal.find(".bar").length > 0;
                };

                return UnitTest.testFinish(checkFunc);
            })
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should close profile", function(done) {
            $modal.find(".close").click();
            var checkFunc = function() {
                // wait unitl the resultset is freed
                return Profile.__testOnly__.getResultSetId() == null;
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                assert.isFalse($modal.is(":visible"));
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        // clean up
        it("Should delete orphan tables", function(done) {
            UnitTest.removeOrphanTable()
            .always(function() {
                done();
            });
        });
    });

    after(function(done) {
        cleanUp()
        .then(function() {
            return UnitTest.deleteAll(tableName, dsName);
        })
        .always(function() {
            UnitTest.offMinMode();
            done();
        });

        function cleanUp() {
            var deferred = jQuery.Deferred();

            UnitTest.removeOrphanTable()
            .always(function() {
                // in case some orphan table deletion faild
                if ($("#alertModal").is(":visible")) {
                    $("#alertModal").find(".cancel").click();
                }
                deferred.resolve();
            });

            return deferred.promise();
        }
    });
});