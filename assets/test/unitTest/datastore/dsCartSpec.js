describe("DSCart Test", function() {
    var $mainTabCache;

    before(function() {
        $mainTabCache = $(".topMenuBarTab.active");
        $("#dataStoresTab").click();
        UnitTest.onMinMode();
    });

    function getCartsLen(carts) {
        if (carts == null) {
            return 0;
        }

        return Object.keys(carts).length;
    }

    function getFirstCart(carts) {
        for (var dsId in carts) {
            return carts[dsId];
        }
        return null;
    }

    describe("Basic API Test", function() {
        var previousCart;
        var testCartId;
        var fakeDSObj;

        before(function(){
            previousCart = DSCart.getCarts();

            fakeDSObj = DS.__testOnly__.createDS({
                "id": "testDS" + Math.floor(Math.random() * 1000 + 1),
                "name": "testDS",
                "isFolder": false
            });
        });

        it('Should get cart', function() {
            var carts = DSCart.getCarts();
            expect(carts).to.be.an("object");
            expect(carts).to.equal(previousCart);
        });

        it('Should empty all cart', function() {
            DSCart.clear();

            var carts = DSCart.getCarts();
            expect(jQuery.isEmptyObject(carts)).to.be.true;

            expect($("#dataCart").find(".selectedTable").length)
            .to.equal(0);
        });

        it('Should add new cart', function() {
            // error case
            DSCart.addItem(null);
            var carts = DSCart.getCarts();
            expect(getCartsLen(carts)).to.equal(0);

            testCartId = fakeDSObj.getId();
            DSCart.addItem(testCartId);

            carts = DSCart.getCarts();
            expect(getCartsLen(carts)).to.equal(1);
            var cart = getFirstCart(carts);
            expect(cart).to.have.property('dsId').to.equal(testCartId);
            expect(cart).to.have.property('items').with.length(0);
            expect(cart).to.have.property('tableName');
        });

        it("Should get cart element", function() {
            // error case
            var $cart = DSCart.getCartElement();
            expect($cart).to.be.null;
            // normal case
            $cart = DSCart.getCartElement(testCartId);
            expect($cart).not.to.be.null;
            expect($cart.length).to.be.equal(1);
        });

        it('Should add item', function() {
            var items = [{"colNum": 1, "value": "testItem"}];
            DSCart.addItem(testCartId, items);

            var carts = DSCart.getCarts();
            expect(getCartsLen(carts)).to.equal(1);

            var cart = getFirstCart(carts);
            expect(cart).to.have.property('items').with.length(1);

            var item = cart.items[0];
            expect(item).to.have.property('colNum').to.equal(1);
            expect(item).to.have.property('value').to.equal("testItem");

            // UI check
            var $cart = DSCart.getCartElement(testCartId);
            assert.equal($cart.length, 1, 'still have only 1 cart');
            assert.equal($cart.find("li").length, 1, 'should have only 1 item');
            assert.isFalse($cart.find(".cartEmptyHint").is(":visible"),
                        'Should not see hint');
        });

        it('Should filter cart', function() {
            var res = DSCart.__testOnly__.filterCarts(null);
            expect(res).to.be.null;
            // case 2
            res = DSCart.__testOnly__.filterCarts(testCartId);
            expect(res).not.to.be.null;
        });

        it('Should switch cart', function() {
            var $selectTable = $("#dataCart").find(".selectedTable");
            $selectTable.addClass("xc-hidden");
            // null case
            DSCart.switchToCart(null);
            expect($selectTable.hasClass("xc-hidden")).to.be.true;
            // normal case
            DSCart.switchToCart(testCartId);
            expect($selectTable.hasClass("xc-hidden")).to.be.false;
        });

        it('Should restore cart', function() {
            var currentCart = DSCart.getCarts();
            DSCart.clear();
            var carts = DSCart.getCarts();
            expect(getCartsLen(carts)).to.equal(0);
            DSCart.restore(currentCart);

            carts = DSCart.getCarts();
            expect(getCartsLen(carts)).to.equal(1);
            var cart = getFirstCart(carts);
            expect(cart).to.have.property('items').with.length(1);
        });

        it("Should check args", function() {
            checkCartArgs = DSCart.__testOnly__.checkCartArgs;
            var $cart = DSCart.getCartElement(testCartId);
            var cart = getFirstCart(DSCart.getCarts());
            var $statusBox = $("#statusBox");
            // invalid case
            var $tableName = $cart.find(".tableNameEdit");
            var $prefix = $cart.find(".prefixName");

            var testCases = [{
                "input": $tableName,
                "val": "",
                "valid": false,
                "error": ErrTStr.NoEmpty
            },{
                "input": $tableName,
                "val": "1abc",
                "valid": false,
                "error": ErrTStr.InvalidTableName
            },{
                "input": $tableName,
                "val": "ab*c",
                "valid": false,
                "error": ErrTStr.InvalidTableName
            },{
                "input": $tableName,
                "val": new Array(256).join("a"),
                "valid": false,
                "error": ErrTStr.TooLong
            },{
                "input": $tableName,
                "val": "abc",
                "valid": true
            },{
                "input": $prefix,
                "val": "9abc",
                "valid": false,
                "prefix": true,
                "error": ErrTStr.PrefixStartsWithLetter
            },{
                "input": $prefix,
                "val": new Array(33).join("a"),
                "valid": false,
                "prefix": true,
                "error": ErrTStr.PrefixTooLong
            },{
                "input": $prefix,
                "val": "a:b",
                "valid": false,
                "prefix": true,
                "error": ColTStr.RenameSpecialChar
            },{
                "input": $prefix,
                "val": "ab",
                "valid": true,
                "prefix": true
            }];

            testCases.forEach(function(testCase) {
                var $input = testCase.input;
                $input.val(testCase.val);
                if (testCase.prefix) {
                    cart.setPrefix(testCase.val);
                }

                var isValid = checkCartArgs(cart);
                expect(isValid).to.equal(testCase.valid);

                if (!isValid) {
                    assert.isTrue($statusBox.is(":visible"));
                    expect($statusBox.find(".message").text())
                    .to.equal(testCase.error);
                    StatusBox.forceHide();
                }
            });
        });

        it('Should remove item', function() {
            DSCart.addItem(testCartId, {"colNum": 2, "value": "testItem2"});

            var carts = DSCart.getCarts();
            expect(getCartsLen(carts)).to.equal(1);

            // now should have 2 items
            var cart = getFirstCart(carts);
            expect(cart).to.have.property('items').with.length(2);

            // error case
            DSCart.removeItem(null);
            expect(cart).to.have.property('items').with.length(2);

            // should have 1 item after remove
            DSCart.removeItem(testCartId, 1);
            expect(cart).to.have.property('items').with.length(1);


            // UI check
            var $cart = DSCart.getCartElement(testCartId);
            var $li = $cart.find("li");
            assert.equal($li.length, 1, 'have only 1 item');
            assert.equal($li.text(), 'testItem2', 'have the right item');
        });

        it('Should remove cart', function() {
            // error case
            DSCart.removeCart(null);
            var carts = DSCart.getCarts();
            expect(getCartsLen(carts)).to.equal(1);

            DSCart.removeCart(testCartId);

            carts = DSCart.getCarts();
            expect(getCartsLen(carts)).to.equal(0);

            // UI check
            var $cart = DSCart.getCartElement(testCartId);
            assert.equal($cart.length, 0, 'should have no carts');
        });

        after(function() {
            DSCart.clear();
            DSCart.restore(previousCart);
            DS.__testOnly__.removeDS(fakeDSObj.getId());
        });
    });

    describe("Too Many Col Alert Test", function() {
        var tooManyColAlertHelper;
        var oldFunc;

        before(function() {
            tooManyColAlertHelper = DSCart.__testOnly__.tooManyColAlertHelper;
            oldFunc = xcHelper.tableNameInputChecker;
            xcHelper.tableNameInputChecker = function() { return true; };
        });

        it("Should fail in error case", function(done) {
            tooManyColAlertHelper(null)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("Wrong args");
                done();
            });
        });

        it("Should resolve with valid cart", function(done) {
            var cart = new Cart({
                "dsId": "test",
                "tableName": "testTable"
            });
            cart.setPrefix("testPrefix");
            tooManyColAlertHelper(cart, WSManager.getActiveWS())
            .then(function() {
                expect(true).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should alert with too many columns and cancel", function(done) {
            var cart = new Cart({
                "dsId": "test",
                "tableName": "testTable"
            });
            cart.setPrefix("testPrefix");
            cart.items = new Array(300);

            var prmoise = tooManyColAlertHelper(cart);
            UnitTest.hasAlertWithTitle(DSFormTStr.CreateWarn);

            prmoise
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.undefined;
                assert.isFalse($("#alertModal").is(":visible"));
                done();
            });
        });

        it("Should alert with too many columns and confirm", function(done) {
            var cart = new Cart({
                "dsId": "test",
                "tableName": "testTable"
            });
            cart.setPrefix("testPrefix");
            cart.items = new Array(300);

            var prmoise = tooManyColAlertHelper(cart);
            UnitTest.hasAlertWithTitle(DSFormTStr.CreateWarn, {
                "confirm": true
            });

            prmoise
            .then(function() {
                assert.isFalse($("#alertModal").is(":visible"));
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            xcHelper.tableNameInputChecker = oldFunc;
        });
    });

    describe("UI Behavior Test", function() {
        var dsName;
        var dsId;
        var $cart;
        var tableName;

        before(function(done) {
            UnitTest.addDS(testDatasets.schedule, "schedule_dscart_test")
            .then(function(resDS) {
                dsName = resDS;
                var $grid = DS.getGridByName(dsName);
                dsId = $grid.data("dsid");
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });

        it("Should have cart with ds by selectDSCols btn", function(done) {
            var checkFunc = function() {
                return DSTable.getId() === dsId;
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                $("#selectDSCols").click();
                $cart = DSCart.getCartElement(dsId);
                expect($cart.length).to.equal(1);
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });

        it("Should toggle cart by dataCartBtn btn", function() {
            var $btn = $("#dataCartBtn");
            var $dsTableView = $("#dsTableView");
            var isActive = $btn.hasClass("active");
            var isFullSize = $dsTableView.hasClass("fullSize");

            $btn.click();
            expect($btn.hasClass("active")).to.equal(!isActive);
            expect($dsTableView.hasClass("fullSize")).to.equal(!isFullSize);

            $btn.click();
            expect($btn.hasClass("active")).to.equal(isActive);
            expect($dsTableView.hasClass("fullSize")).to.equal(isFullSize);
        });

        it("Should focus on column when click", function() {
            var $cart = DSCart.getCartElement(dsId);
            var $li = $cart.find("li").eq(0);
            expect($li.hasClass("colSelected")).to.be.false;

            $li.find(".colName").click();
            expect($li.hasClass("colSelected")).to.be.true;
        });

        it("Should class trash icon to remove column", function() {
            var $cart = DSCart.getCartElement(dsId);
            var $lis = $cart.find("li");
            var numCols = $lis.length;

            $lis.eq(0).find(".removeCol").click();
            expect($cart.find("li").length - numCols).to.equal(-1);
        });

        it("Should edit table name input", function(done) {
            var $cart = DSCart.getCartElement(dsId);
            var checkFunc = function() {
                return !$cart.hasClass("updateName");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                var cart = DSCart.__testOnly__.filterCarts(dsId);
                var $tableName = $cart.find(".tableNameEdit");
                $tableName.siblings(".edit").click();

                var newName = xcHelper.randName("dsCart-TestTable");
                $tableName.val(newName).trigger("change").trigger(fakeEvent.enter);

                expect(cart.getTableName()).to.equal(newName);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("Should edit prefix", function() {
            var $cart = DSCart.getCartElement(dsId);
            var cart = DSCart.__testOnly__.filterCarts(dsId);
            var $action = $cart.find(".cartTitleArea .action");
            var $prefix = $cart.find(".prefixName");
            var isActive = $action.hasClass("active");

            $action.find(".icon").eq(0).click();
            expect($action.hasClass("active")).to.equal(!isActive);

            $prefix.siblings(".edit").click();
            $prefix.val("prefix").trigger("change").trigger(fakeEvent.enter);
            expect(cart.getPrefix()).to.equal("prefix");

            $action.find(".icon").eq(0).click();
            expect($action.hasClass("active")).to.equal(isActive);
        });

        it("Should not create table in error case", function(done) {
            DSCart.createTable()
            .then(function() {
                throw "error case";
            })
            .fail(function(error) {
                expect(error).not.to.be.null;
                done();
            });
        });

        it("Should create table from ds", function(done) {
            var cart = DSCart.__testOnly__.filterCarts(dsId);
            var worksheet = WSManager.getActiveWS();
            DSCart.createTable(cart, worksheet)
            .then(function(resName) {
                tableName = resName;
                expect(tableName).to.exist;
                var tableId = xcHelper.getTableId(tableName);
                expect(tableId).to.exist;
                expect(gTables.hasOwnProperty(tableId)).to.be.true;
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });

        after(function(done) {
            deleteHelper()
            .then(function() {
                UnitTest.deleteDS(dsName)
                .always(function() {
                    // back to datastore tab
                    $("#dataStoresTab").click();
                    done();
                });
            })
            .fail(function(error) {
                throw error;
            });

            function deleteHelper() {
                // maybe some test fails and the table has
                // not created yet
                if (tableName != null) {
                    return UnitTest.deleteTable(tableName);
                } else {
                    return PromiseHepler.resolve();
                }
            }
        });
    });

    after(function() {
        // go back to previous tab
        $mainTabCache.click();
        UnitTest.offMinMode();
    });
});
