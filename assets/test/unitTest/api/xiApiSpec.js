describe('XIApi Test', () => {
    let oldGetId;

    before(() => {
        oldGetId = Authentication.getHashId;
        Authentication.getHashId = () => '#12';
    });

    describe('Basic API Test', () => {
        it('isCorrectTableNameFormat should work', () => {
            const isCorrectTableNameFormat = XIApi.__testOnly__.isCorrectTableNameFormat;
            expect(isCorrectTableNameFormat(null)).to.be.false;
            expect(isCorrectTableNameFormat("")).to.be.false;

            expect(isCorrectTableNameFormat("table")).to.be.false;
            expect(isCorrectTableNameFormat("table#ab12")).to.be.true;
            expect(isCorrectTableNameFormat("table#12")).to.be.true;
            expect(isCorrectTableNameFormat("table#abAZ12")).to.be.true;
            expect(isCorrectTableNameFormat("table#abAZ_12")).to.be.true;
            expect(isCorrectTableNameFormat("table#abAZ!12")).to.be.false;
            expect(isCorrectTableNameFormat("table#abAZ-12")).to.be.false;
        });

        it('isValidTableName should work', () => {
            const isValidTableName = XIApi.__testOnly__.isValidTableName;
            expect(isValidTableName("table")).to.be.false;
            expect(isValidTableName("ta&ble#123")).to.be.false;
            expect(isValidTableName("table#123")).to.be.true;
            expect(isValidTableName("tab&.le#123")).to.be.false;
            expect(isValidTableName("tab.le#123")).to.be.true;
        });

        it('isValidAggName should work', () => {
            const tests = [{
                name: 'ab#12',
                expect: true
            }, {
                name: 'ab#ab12',
                expect: true
            }, {
                name: 'a&b#12',
                expect: false
            }, {
                name: 'test',
                expect: true
            }, {
                name: 'te&st',
                expect: false
            }];

            tests.forEach((test) => {
                const res = XIApi.__testOnly__.isValidAggName(test.name);
                expect(res).to.equal(test.expect);
            });
        });

        it('isValidPrefix should work', function () {
            const tests = [{
                name: null,
                expect: false
            }, {
                name: '',
                expect: false
            }, {
                name: 'ab12',
                expect: true
            }, {
                name: 'te&st',
                expect: false
            }];

            tests.forEach((test) => {
                const res = XIApi.__testOnly__.isValidPrefix(test.name);
                expect(res).to.equal(test.expect);
            });
        });

        it('getNewTableName should work', () => {
            const getNewTableName = XIApi.__testOnly__.getNewTableName;
            const res = getNewTableName('test');
            expect(res).to.contains('test');
            expect(res).not.to.equal('test');

            // case 2
            const res2 = getNewTableName('test', 'affix');
            expect(res2).to.contains('testaffix');

            // case 3
            const res3 = getNewTableName('test', 'affix', true);
            expect(res3).to.contains('testaffix');
            expect(res3.length > res2.length).to.be.true;
        });

        it('getNewJoinTableName should work', () => {
            const getNewJoinTableName = XIApi.__testOnly__.getNewJoinTableName;
            const res = getNewJoinTableName('leftTable', 'rightTable', 'test#12');
            expect(res).to.equal('test#12');

            // case 2
            const res2 = getNewJoinTableName('leftTable', 'rightTable', 'test');
            expect(res2).to.contains('leftT-right');
        });

        it('convertOp shuold work', () => {
            const convertOp = XIApi.__testOnly__.convertOp;
            expect(convertOp('')).to.equal('');
            expect(convertOp('Count')).to.equal('count');
            expect(convertOp('MaxInteger')).to.equal('maxInteger');
        });

        it('parseAggOps should work', () => {
            const parseAggOps = XIApi.__testOnly__.parseAggOps;
            const res1 = parseAggOps(null);
            expect(res1).to.be.instanceOf(Set);
            expect(res1.size).to.equal(9);

            const res2 = parseAggOps({
                fnDescs: [{
                    fnName: 'Test'
                }]
            });
            expect(res2).to.be.instanceOf(Set);
            expect(res2.size).to.equal(1);
            expect(res2.has('Test')).to.be.true;
        });

        it('getUnusedImmNames should work', () => {
            const getUnusedImmNames = XIApi.__testOnly__.getUnusedImmNames;
            expect(getUnusedImmNames().length).to.equal(0);

            const res = getUnusedImmNames(['a', 'b', 'c'], ['a'], [{ new: 'b' }]);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal('c');
        });
    });

    describe('Index Helper Test', () => {
        it('isSameKey should work', () => {
            const isSameKey = XIApi.__testOnly__.isSameKey;
            expect(isSameKey(['a'], ['b'])).to.be.false;
            expect(isSameKey(['a'], ['a', 'b'])).to.be.false;
            expect(isSameKey(['a'], ['a'])).to.be.true;
        });
    });

    describe('Cast Helper Test', () => {
        describe('getCastInfo Test', () => {
            let getCastInfo;

            before(() => {
                getCastInfo = XIApi.__testOnly__.getCastInfo;
            });

            it('should cast when has cast type', () => {
                const res = getCastInfo(['prefix::col'], [ColumnType.integer], {
                    overWrite: true
                });
                expect(res).to.be.an('object');
                expect(res.mapStrs.length).to.equal(1);
                expect(res.mapStrs[0]).to.equal('int(prefix::col, 10)');
                expect(res.newFields.length).to.equal(1);
                expect(res.newFields[0]).to.equal('col');
                expect(res.newColNames.length).to.equal(1);
                expect(res.newColNames[0]).to.equal('col');
                expect(res.newTypes.length).to.equal(1);
                expect(res.newTypes[0]).to.equal(ColumnType.integer);
            });

            it('should throw error when cast on fatPtr', () => {
                try {
                    getCastInfo(['prefix::col'], [null], {
                        overWrite: true,
                        castPrefix: true
                    });
                } catch (e) {
                    expect(e).not.to.be.null
                }
            });
        });

        describe('castColumns Test', () => {
            let castColumns;
            const txId = 0;
            const tableName = 'testTable#abc';


            before(() => {
                castColumns = XIApi.__testOnly__.castColumns;
                Authentication.getHashId = () => '#12';
            });

            it('should return when there is no column to cast', (done) => {
                castColumns(txId, tableName, ['col'], [null])
                    .then((res) => {
                        expect(res).to.be.an('object');
                        expect(res.tableName).to.equal(tableName);
                        expect(res.colNames.length).to.equal(1);
                        expect(res.colNames[0]).to.equal('col');
                        expect(res.types.length).to.equal(1);
                        expect(res.types[0]).to.equal(null);
                        expect(res.newTable).to.be.false;
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should cast', (done) => {
                const oldMap = XIApi.map;
                XIApi.map = () => PromiseHelper.resolve();

                castColumns(txId, tableName, ['col'], [ColumnType.integer], { overWrite: true })
                    .then((res) => {
                        expect(res).to.be.an('object');
                        expect(res.tableName).not.to.equal(tableName);
                        expect(res.colNames.length).to.equal(1);
                        expect(res.colNames[0]).to.equal('col');
                        expect(res.types.length).to.equal(1);
                        expect(res.types[0]).to.equal(ColumnType.integer);
                        expect(res.newTable).to.be.true;
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.map = oldMap;
                    });
            });
        });

        describe('synthesizeColumns Test', () => {
            let synthesizeColumns;
            const txId = 0;
            const tableName = 'testTable#abc';

            before(() => {
                synthesizeColumns = XIApi.__testOnly__.synthesizeColumns;
                Authentication.getHashId = () => '#12';
            });

            it('should return when there is no column to synthesize', (done) => {
                synthesizeColumns(txId, tableName, ['col'], [null])
                    .then((res) => {
                        expect(res).to.be.an('object');
                        expect(res.tableName).to.equal(tableName);
                        expect(res.colNames.length).to.equal(1);
                        expect(res.colNames[0]).to.equal('col');
                        expect(res.types.length).to.equal(1);
                        expect(res.types[0]).to.equal(null);
                        expect(res.newTable).to.be.false;
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should synthesize', (done) => {
                const oldSynthesize = XIApi.synthesize;
                XIApi.synthesize = () => PromiseHelper.resolve();

                synthesizeColumns(txId, tableName, ['col'], [ColumnType.integer])
                    .then((res) => {
                        expect(res).to.be.an('object');
                        expect(res.tableName).not.to.equal(tableName);
                        expect(res.colNames.length).to.equal(1);
                        expect(res.colNames[0]).to.contains('col');
                        expect(res.types.length).to.equal(1);
                        expect(res.types[0]).to.equal(ColumnType.integer);
                        expect(res.newTable).to.be.true;
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.synthesize = oldSynthesize;
                    });
            });
        });
    });

    describe('Join Helper Test', () => {
        describe('joinCast Tesst', () => {
            let joinCast;
            const txId = 0;

            before(() => {
                joinCast = XIApi.__testOnly__.joinCast;
            });

            it('should resolve when no columns to join', (done) => {
                const lInfo = {
                    tableName: 'l#abc',
                    columns: []
                };
                const rInfo = {
                    tableName: 'r#efg',
                    columns: []
                }
                joinCast(txId, lInfo, rInfo)
                    .then((res) => {
                        expect(res).to.be.an('object');
                        expect(res.lTableName).to.equal('l#abc');
                        expect(res.lColNames.length).to.equal(0);
                        expect(res.rTableName).to.equal('r#efg');
                        expect(res.rColNames.length).to.equal(0);
                        expect(res.tempTables.length).to.equal(0);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should resolve with cast result', (done) => {
                const oldMap = XIApi.map;
                XIApi.map = () => PromiseHelper.resolve();

                const lInfo = {
                    tableName: 'l#abc',
                    columns: ['lCol'],
                    casts: [ColumnType.integer]
                };
                const rInfo = {
                    tableName: 'r#efg',
                    columns: ['rCol'],
                    casts: [ColumnType.integer]
                }
                joinCast(txId, lInfo, rInfo)
                    .then((res) => {
                        expect(res).to.be.an('object');
                        expect(res.lTableName).not.to.equal('l#abc');
                        expect(res.lColNames.length).to.equal(1);
                        expect(res.lColNames[0]).not.to.equal('lCol');
                        expect(res.rTableName).not.to.equal('r#efg');
                        expect(res.rColNames.length).to.equal(1);
                        expect(res.rColNames[0]).not.to.equal('rCol');
                        expect(res.tempTables.length).to.equal(2);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.map = oldMap;
                    });
            });

            it('should fail when thrift call fails', (done) => {
                const oldMap = XIApi.map;

                XIApi.map = () => PromiseHelper.reject({ error: 'test' });
                const lInfo = {
                    tableName: 'l#abc',
                    columns: ['lCol'],
                    casts: [ColumnType.integer]
                };
                const rInfo = {
                    tableName: 'r#efg',
                    columns: ['rCol'],
                    casts: [ColumnType.integer]
                }
                joinCast(txId, lInfo, rInfo)
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error.error).to.equal('test');
                        done();
                    })
                    .always(() => {
                        XIApi.map = oldMap;
                    });
            });
        });

        describe('joinIndex Test', () => {
            let joinIndex;
            const txId = 0;
            const tableName = 'testTable';
            let oldIsSimulate;
            let oldIsEdit;
            let oldGetIndexCache;

            before(() => {
                joinIndex = XIApi.__testOnly__.joinIndex;

                oldIsSimulate = Transaction.isSimulate;
                oldIsEdit = Transaction.isEdit;
                oldGetIndexCache = SQLApi.getIndexTable;

                Transaction.isSimulate = () => true;
                Transaction.isEdit = () => false;
                SQLApi.getIndexTable = () => {
                    return { tableName: tableName, keys: ['key'] };
                }
            });

            it('should handle invalid case', (done) => {
                joinIndex(txId, {
                    lColNames: ['lCol'],
                    rColNames: []
                })
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.be.a('string');
                        done();
                    });
            });

            it('should handle cross join case', (done) => {
                joinIndex(txId, {
                    lTableName: 'l#abc',
                    lColNames: [],
                    rTableName: 'r#efg',
                    rColNames: []
                })
                    .then((lRes, rRes) => {
                        expect(lRes.tableName).to.equal('l#abc');
                        expect(lRes.oldKeys.length).to.equal(0);
                        expect(lRes.newKeys.length).to.equal(0);
                        expect(rRes.tableName).to.equal('r#efg');
                        expect(rRes.oldKeys.length).to.equal(0);
                        expect(rRes.newKeys.length).to.equal(0);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should handle self join case', (done) => {
                const oldFilter = XIApi.filter;
                let test = false;
                XIApi.filter = () => {
                    test = true;
                    return PromiseHelper.resolve();
                };

                joinIndex(txId, {
                    lTableName: tableName,
                    lColNames: ['key'],
                    rTableName: tableName,
                    rColNames: ['key']
                }, true)
                    .then((lRes, rRes, tempTables) => {
                        expect(test).to.be.true;
                        expect(lRes.tableName).to.equal(tableName);
                        expect(lRes.oldKeys.length).to.equal(1);
                        expect(lRes.oldKeys[0]).to.equal('key');
                        expect(lRes.newKeys.length).to.equal(1);
                        expect(lRes.newKeys[0]).to.equal('key');
                        expect(rRes.tableName).to.equal(tableName);
                        expect(rRes.oldKeys.length).to.equal(1);
                        expect(rRes.oldKeys[0]).to.equal('key');
                        expect(rRes.newKeys.length).to.equal(1);
                        expect(rRes.newKeys[0]).to.equal('key');
                        expect(tempTables.length).to.equal(1);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.filter = oldFilter;
                    });
            });

            it('should handle self join fail case', (done) => {
                const oldIsSimulate = Transaction.isSimulate;
                const oldIndex = XIApi.index;
                XIApi.index= () => PromiseHelper.reject({ error: 'test' });
                Transaction.isSimulate = () => false;

                joinIndex(txId, {
                    lTableName: tableName,
                    lColNames: ['key'],
                    rTableName: tableName,
                    rColNames: ['key']
                })
                    .then(() => {
                        done('fail');
                    })
                    .fail((...arg) => {
                        expect(arg.length).to.equal(1);
                        expect(arg[0].error).to.equal('test');
                        done();
                    })
                    .always(() => {
                        XIApi.index = oldIndex;
                        Transaction.isSimulate = oldIsSimulate;
                    });
            });

            it('should work on normal case', (done) => {
                joinIndex(txId, {
                    lTableName: tableName,
                    lColNames: ['key'],
                    rTableName: tableName,
                    rColNames: ['key2']
                }, false)
                    .then((lRes, rRes, tempTables) => {
                        expect(lRes.tableName).to.equal(tableName);
                        expect(lRes.oldKeys.length).to.equal(1);
                        expect(lRes.oldKeys[0]).to.equal('key');
                        expect(lRes.newKeys.length).to.equal(1);
                        expect(lRes.newKeys[0]).to.equal('key');
                        expect(rRes.tableName).to.equal(tableName);
                        expect(rRes.oldKeys.length).to.equal(1);
                        expect(rRes.oldKeys[0]).to.equal('key2');
                        expect(rRes.newKeys.length).to.equal(1);
                        expect(rRes.newKeys[0]).to.equal('key');
                        expect(tempTables.length).to.equal(0);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('resolveJoinColRename should work', () => {
                const resolveJoinColRename = XIApi.__testOnly__.resolveJoinColRename;
                let lRename = [];
                let rRename = [];
                let lImm = [];
                let rImm = [];
                const lIndexRes = { newKeys: [], oldKeys: [] };
                const rIndexRes = { newKeys: [], oldKeys: [] };
                resolveJoinColRename(lRename, rRename, lIndexRes, rIndexRes, lImm, rImm);
                expect(lRename.length).to.equal(0);
                expect(rRename.length).to.equal(0);

                // case 2
                rImm = ['a', 'b', 'c', 'd'];
                rIndexRes.newKeys.push('a');
                rRename = [{ orig: 'old', new: 'b' }];
                lIndexRes.newKeys.push('d');
                lIndexRes.oldKeys.push('old');

                resolveJoinColRename(lRename, rRename, lIndexRes, rIndexRes, lImm, rImm);
                expect(lRename.length).to.equal(1);
                expect(lRename[0].orig).to.equal('d');
                expect(lRename[0].new).not.to.equal('d');
                expect(lRename[0].new).to.contains('d');
                expect(rRename.length).to.equal(1);
            });

            after(() => {
                Transaction.isSimulate = oldIsSimulate;
                Transaction.isEdit = oldIsEdit;
                SQLApi.getIndexTable = oldGetIndexCache;
            });
        });

        describe('semiJoinHelper Test', () => {
            const txId = 0;
            let oldQuery;
            let oldJoin;
            let semiJoinHelper;

            before(() => {
                oldQuery = XIApi.query;
                oldJoin = XcalarJoin;

                XIApi.query = () => PromiseHelper.resolve();

                XcalarJoin = (_lTable, _rTable, newTableName, joinType) => {
                    testJoinTableName = newTableName;
                    testJoinType = joinType;
                    return PromiseHelper.resolve();
                };

                semiJoinHelper = XIApi.__testOnly__.semiJoinHelper;
            });

            beforeEach(() => {
                testJoinTableName = null;
                testJoinType = null;
            });

            it("should work for anti semi join", (done) => {
                const oldFunc = XIApi.filter;
                const joinType = JoinCompoundOperatorTStr.LeftAntiSemiJoin;
                const tempTables = [];

                let test = false;
                XIApi.filter = () => {
                    test = true;
                    return PromiseHelper.resolve();
                };

                semiJoinHelper(txId, 'l#a', 'r#b', ['col'], 'new#c', joinType,
                    [], [], tempTables, null)
                    .then((tempCols) => {
                        expect(test).to.be.true;
                        expect(tempTables.length).to.equal(1);
                        expect(tempCols[0]).to.contains("XC_GB_COL");
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.filter = oldFunc;
                    });
            });

            it("should work for existence join", (done) => {
                const oldFunc = XIApi.map;
                const joinType = JoinCompoundOperatorTStr.ExistenceJoin;
                const tempTables = [];

                let test = false;
                XIApi.map = () => {
                    test = true;
                    return PromiseHelper.resolve();
                };

                semiJoinHelper(txId, 'l#a', 'r#b', ['col'], 'new#c', joinType,
                    [], [], tempTables, 'existenceCol')
                    .then((tempCols) => {
                        expect(test).to.be.true;
                        expect(tempTables.length).to.equal(1);
                        expect(tempCols[0]).to.contains("XC_GB_COL");
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.map = oldFunc;
                    });
            });

            it("should work for semi join", (done) => {
                const joinType = JoinCompoundOperatorTStr.LeftSemiJoin;
                const tempTables = [];

                semiJoinHelper(txId, 'l#a', 'r#b', ['col'], 'new#c', joinType,
                    [], [], tempTables, null)
                    .then((tempCols) => {
                        expect(tempTables.length).to.equal(0);
                        expect(tempCols[0]).to.contains("XC_GB_COL");
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            after(() => {
                XIApi.query = oldQuery;
                XcalarJoin = oldJoin;
            });
        });
    });

    describe('groupBy Helper Test', () => {
        it('getGroupByAggEvalStr should work', () => {
            const getGroupByAggEvalStr = XIApi.__testOnly__.getGroupByAggEvalStr;
            const colName = 'a';
            const tests = [{
                op: 'stdevp',
                expect: 'sqrt(div(sum(pow(sub(a, avg(a)), 2)), count(a)))'
            }, {
                op: 'stdev',
                expect: 'sqrt(div(sum(pow(sub(a, avg(a)), 2)), sub(count(a), 1)))'
            }, {
                op: 'varp',
                expect: 'div(sum(pow(sub(a, avg(a)), 2)), count(a))'
            }, {
                op: 'var',
                expect: 'div(sum(pow(sub(a, avg(a)), 2)), sub(count(a), 1))'
            }, {
                op: 'min',
                expect: 'min(a)'
            }];

            tests.forEach((test) => {
                const evalStr = getGroupByAggEvalStr({
                    aggColName: colName,
                    operator: test.op
                });
                expect(evalStr).to.equal(test.expect);
            });
        });

        describe('computeDistinctGroupby Test', () => {
            const txId = 0;
            const tableName = 'test#a';
            let computeDistinctGroupby;
            let oldIsSimulate;
            let oldIsEdit;
            let oldGetIndexCache;
            let oldCacheIndexCache;

            before(() => {
                computeDistinctGroupby = XIApi.__testOnly__.computeDistinctGroupby;

                oldIsSimulate = Transaction.isSimulate;
                oldIsEdit = Transaction.isEdit;
                oldGetIndexCache = SQLApi.getIndexTable;
                oldCacheIndexCache = SQLApi.cacheIndexTable;

                Transaction.isSimulate = () => true;
                Transaction.isEdit = () => false;
                SQLApi.getIndexTable = () => {
                    return { tableName: tableName, keys: ['key'] };
                };
                SQLApi.cacheIndexTable = () => { };
            });

            it("should handle resue index case", (done) => {
                const groupOnCols = ['groupCol'];
                const distinceCol = 'groupCol';
                const aggArgs = [{ operator: 'min', aggColName: 'aggCol' }]
                const distinctGbTables = [];
                const tempTables = [];
                const tempCols = [];
                computeDistinctGroupby(txId, tableName, groupOnCols, distinceCol,
                    aggArgs, distinctGbTables, tempTables, tempCols)
                    .then(() => {
                        expect(distinctGbTables.length).to.equal(1);
                        expect(tempTables.length).to.equal(2);
                        expect(tempCols.length).to.equal(1);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it("should handle non-resue index case", (done) => {
                const groupOnCols = ['groupCol'];
                const distinctCol = 'distinct';
                const aggArgs = [{ operator: 'min', aggColName: 'aggCol' }]
                const distinctGbTables = [];
                const tempTables = [];
                const tempCols = [];
                const oldFunc = XIApi.index;
                let test = false;
                XIApi.index = () => {
                    test = true;
                    return PromiseHelper.resolve(null, false, ["newKey"]);
                };

                computeDistinctGroupby(txId, tableName, groupOnCols, distinctCol,
                    aggArgs, distinctGbTables, tempTables, tempCols)
                    .then(() => {
                        expect(test).to.be.true;
                        expect(distinctGbTables.length).to.equal(1);
                        expect(tempTables.length).to.equal(3);
                        expect(tempCols.length).to.equal(1);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.index = oldFunc;
                    });
            });

            after(() => {
                Transaction.isSimulate = oldIsSimulate;
                Transaction.isEdit = oldIsEdit;
                SQLApi.getIndexTable = oldGetIndexCache;
                SQLApi.cacheIndexTable = oldCacheIndexCache;
            });
        });

        describe('cascadingJoins Test', () => {
            let cascadingJoins;
            const txId = 0;
            const tableName = 'test#a';
            let oldJoin;
            let testJoinType;

            before(() => {
                cascadingJoins = XIApi.__testOnly__.cascadingJoins;
                oldJoin = XcalarJoin;

                XcalarJoin = (_lTable, _rTable, _newTable, joinType, ..._rest) => {
                    testJoinType = joinType
                    return PromiseHelper.resolve();
                };
            });

            beforeEach(() => {
                testJoinType = null;
            });

            it('should handle no distinct groupBy table case', (done) => {
                const distinctGbTables = [];
                const joinCols = [];
                const tempTables = [];
                const tempCols = [];

                cascadingJoins(txId, distinctGbTables, tableName, joinCols,
                    tempTables, tempCols)
                    .then((resTable) => {
                        expect(resTable).to.equal(tableName);
                        expect(testJoinType).to.equal(null);
                        expect(tempTables.length).to.equal(0);
                        expect(tempCols.length).to.equal(0);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should handle cross join case', (done) => {
                const distinctGbTables = ['t#2'];
                const joinCols = [];
                const tempTables = [];
                const tempCols = [];

                cascadingJoins(txId, distinctGbTables, tableName, joinCols,
                    tempTables, tempCols)
                    .then((resTable) => {
                        expect(resTable).not.to.equal(tableName);
                        expect(testJoinType).to.equal(JoinOperatorT.CrossJoin);
                        expect(tempTables.length).to.equal(1);
                        expect(tempCols.length).to.equal(0);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should handle normal join case', (done) => {
                const distinctGbTables = ['t#2', 't#3'];
                const joinCols = ['col'];
                const tempTables = [];
                const tempCols = [];

                cascadingJoins(txId, distinctGbTables, tableName, joinCols,
                    tempTables, tempCols)
                    .then((resTable) => {
                        expect(resTable).not.to.equal(tableName);
                        expect(testJoinType).to.equal(JoinOperatorT.InnerJoin);
                        expect(tempTables.length).to.equal(2);
                        expect(tempCols.length).to.equal(2);
                        expect(tempCols[0]).to.equal('col_2');
                        expect(tempCols[1]).to.equal('col_3');
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            after(() => {
                XcalarJoin = oldJoin;
            });
        });

        it('distinctGroupby should work', (done) => {
            const oldIsSimulate = Transaction.isSimulate;
            const oldIsEdit = Transaction.isEdit;
            const oldGetIndexCache = SQLApi.getIndexTable;
            const oldCacheIndexCache = SQLApi.cacheIndexTable;
            const oldQuery = XIApi.query;

            Transaction.isSimulate = () => true;
            Transaction.isEdit = () => false;
            SQLApi.getIndexTable = () => {
                return { tableName: tableName, keys: ['key'] };
            };
            SQLApi.cacheIndexTable = () => { };
            XIApi.query = () => PromiseHelper.resolve();

            const distinctGroupby = XIApi.__testOnly__.distinctGroupby;
            const txId = 0;
            const tableName = 'test#a';
            const groupOnCols = ['groupOn'];
            const distinctAggArgs = {groupOn: [{
                aggColName: 'gropuOn',
                operator: 'min',
                newColName: 'new1'
            }, {
                aggColName: 'gropuOn',
                operator: 'max',
                newColName: 'new2'
            }]};
            const gbTableName = 'gb#b;'

            distinctGroupby(txId, tableName, groupOnCols,
                distinctAggArgs, gbTableName, true)
                .then((finalJoinedTable, tempTables, tempCols) => {
                    expect(finalJoinedTable).to.be.a('string');
                    expect(tempTables.length).to.equal(2);
                    expect(tempCols.length).to.equal(1);
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    Transaction.isSimulate = oldIsSimulate;
                    Transaction.isEdit = oldIsEdit;
                    SQLApi.getIndexTable = oldGetIndexCache;
                    SQLApi.cacheIndexTable = oldCacheIndexCache;
                    XIApi.query = oldQuery;
                });
        });
    });

    describe('Union Helper Test', () => {
        describe('checkUnionTableInfos Test', () => {
            let checkUnionTableInfos;

            before(() => {
                checkUnionTableInfos = XIApi.__testOnly__.checkUnionTableInfos;
            });

            it('should handle invalid arg', () => {
                expect(checkUnionTableInfos()).to.be.null;
                expect(checkUnionTableInfos('invalid')).to.be.null;
                expect(checkUnionTableInfos([])).to.be.null;
            });

            it('should check table info', () => {
                const lCol = { name: null, rename: null, type: null };
                const rCol = { name: 'r', rename: 'new', type: ColumnType.integer };
                const tableInfos = [{ columns: [lCol] }, { columns: [rCol] }];
                expect(checkUnionTableInfos(tableInfos)).to.be.null;
                // case 2
                lCol.rename = 'old';
                expect(checkUnionTableInfos(tableInfos)).to.be.null;
                // case 3
                lCol.rename = 'new';
                expect(checkUnionTableInfos(tableInfos)).to.be.null;
                // case 4
                lCol.type = ColumnType.string;
                expect(checkUnionTableInfos(tableInfos)).to.be.null;
                // case 5
                lCol.type = ColumnType.integer;
                const res = checkUnionTableInfos(tableInfos);
                expect(res).not.to.be.null;
                expect(lCol.name).not.to.be.null;
            });
        });

        it('unionCast should work', (done) => {
            const unionCast = XIApi.__testOnly__.unionCast;
            const oldSynthesize = XIApi.synthesize;
            XIApi.synthesize = () => PromiseHelper.resolve();

            const txId = 0;
            const tableName = 'test#a';
            const tableInfo = {
                tableName: tableName,
                columns: [{
                    name: 'old',
                    cast: true,
                    type: ColumnType.integer,
                    rename: 'new'
                }]
            };

            const tableInfos = [tableInfo];
            unionCast(txId, tableInfos)
                .then((unionRenameInfos, tempTables) => {
                    expect(unionRenameInfos.length).to.equal(1);
                    const renameInfo = unionRenameInfos[0];
                    expect(renameInfo.tableName).not.to.equal(tableName);
                    expect(renameInfo.renames[0].orig).not.to.equal('old');
                    expect(renameInfo.renames[0].new).to.equal('new');
                    expect(renameInfo.renames[0].type).to.equal(4);
                    expect(tempTables.length).to.equal(1);
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.synthesize = oldSynthesize;
                });
        });

        it('getUnionConcatMapStr should work', () => {
            const getUnionConcatMapStr = XIApi.__testOnly__.getUnionConcatMapStr;
            const res = 'concat(ifStr(exists(a), a, "XC_FNF"), concat(".Xc.", ifStr(exists(string(b)), string(b), "XC_FNF")))';
            expect(getUnionConcatMapStr(['a', 'b'], [DfFieldTypeT.DfString, DfFieldTypeT.DfInt64]))
            .to.equal(res);
        });

        it('unionAllIndex should work', (done) => {
            const unionAllIndex = XIApi.__testOnly__.unionAllIndex;
            const oldMap = XIApi.map;
            const oldIndex = XIApi.index;
            XIApi.map = () => PromiseHelper.resolve('testMapTable');
            XIApi.index = () => PromiseHelper.resolve('testIndexTable');

            const txId = 0;
            const renameInfo = {
                tableName: 'test#a',
                renames: [{
                    orig: 'old',
                    new: 'new',
                    type: 4
                }]
            };
            unionAllIndex(txId, [renameInfo])
                .then((unionRenameInfos, tempTables) => {
                    expect(unionRenameInfos.length).to.equal(1);
                    expect(unionRenameInfos[0].tableName).to.equal('testIndexTable');
                    expect(unionRenameInfos[0].renames.length).to.equal(2);
                    expect(tempTables.length).to.equal(2);
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.map = oldMap;
                    XIApi.index = oldIndex;
                });
        });
    });

    describe('Public Function Test', () => {
        before(() => {
            Authentication.getHashId = () => '#12';
        });

        it('XIApi.filter should work', (done) => {
            const oldFunc = XIApi.query;
            XIApi.query = () => PromiseHelper.resolve();

            XIApi.filter(1, 'eq(a, 1)', 'test#1')
                .then((newTableName) => {
                    expect(newTableName).to.equal('test#12');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.query = oldFunc;
                });
        });

        it('XIApi.filter should reject fail case', (done) => {
            XIApi.filter()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('Invalid args in filter');
                    done();
                });
        });

        it('XIApi.genAggStr should work', (done) => {
            const oldFunc = XcalarListXdfs;
            XcalarListXdfs = () => PromiseHelper.resolve(null);

            XIApi.genAggStr('test', 'op')
                .then((res) => {
                    expect(res).to.equal('');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XcalarListXdfs = oldFunc;
                });
        });

        it('XIApi.genAggStr should work case2', (done) => {
            const oldFunc = XcalarListXdfs;
            XcalarListXdfs = () => PromiseHelper.resolve(null);

            XIApi.genAggStr('test', 'Count')
                .then((res) => {
                    expect(res).to.equal('count(test)');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XcalarListXdfs = oldFunc;
                });
        });

        it('XIApi.aggregateWithEvalStr should work', (done) => {
            const oldQuery = XIApi.query;
            const oldDelete = XIApi.deleteTable;
            const oldFetch = XIApi.fetchData;

            XIApi.query = function() {
                return PromiseHelper.resolve();
            };

            XIApi.deleteTable = function() {
                return PromiseHelper.resolve();
            };

            XIApi.fetchData = function() {
                return PromiseHelper.resolve(["{\"constant\":1}"]);
            };

            XIApi.aggregateWithEvalStr(1, 'count(a)', 'a#1')
                .then((val, dstAggName) => {
                    expect(val).to.equal(1);
                    expect(dstAggName).to.contains('a');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.query = oldQuery;
                    XIApi.deleteTable = oldDelete;
                    XIApi.fetchData = oldFetch;
                });
        });

        it('XIApi.aggregateWithEvalStr should handle invalid case', (done) => {
            XIApi.aggregateWithEvalStr()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal("Invalid args in aggregate");
                    done();
                });
        });

        it('XIApi.aggregate should work', (done) => {
            const oldGenAgg = XIApi.genAggStr;
            const oldAgg = XIApi.aggregateWithEvalStr;

            XIApi.genAggStr = function () {
                return PromiseHelper.resolve("count(1)");
            };

            XIApi.aggregateWithEvalStr = () => {
                return PromiseHelper.resolve('test');
            };

            XIApi.aggregate(1, 'count', 'test', 'a#1', 'a#2')
                .then((res) => {
                    expect(res).to.equal('test');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.genAggStr = oldGenAgg;
                    XIApi.aggregateWithEvalStr = oldAgg;
                });
        });

        it('XIApi.aggregate should handle invalid case', (done) => {
            XIApi.aggregate()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal("Invalid args in aggregate");
                    done();
                });
        });

        it('XIApi.checkOrder should work', (done) => {
            const oldFunc = XcalarGetTableMeta;
            const ret = {
                "keyAttr": [{
                    "name": "user::test",
                    "valueArrayIndex": 0,
                    "ordering": 1
                }],
                "valueAttrs": [{
                    "name": "user",
                    "type": DfFieldTypeT.DfFatptr
                }],
                ordering: XcalarOrderingTStr[3]
            };
            XcalarGetTableMeta = () => PromiseHelper.resolve(ret);

            XIApi.checkOrder('test1')
                .then((ordering, keys) => {
                    expect(ordering).to.equal(XcalarOrderingTStr[3]);
                    expect(keys[0].name).to.equal("user::test");
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XcalarGetTableMeta = oldFunc;
                });
        });

        it('XIApi.checkOrder should reject invalid case', (done) => {
            XIApi.checkOrder()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('Invalid args in checkOrder');
                    done();
                });
        });

        it('XIApi.load should work', (done) => {
            const oldFunc = XIApi.query;
            let test = false
            XIApi.query = () => {
                test = true;
                return PromiseHelper.resolve();
            };

            XIApi.load({ url: 'test' }, { format: 'CSV' }, 'test', 1)
                .then(() => {
                    expect(test).to.be.true;
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.query = oldFunc;
                });
        });

        it('XIApi.load should reject invalid case', (done) => {
            XIApi.load()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('Invalid args in load');
                    done();
                });
        });

        it('XIApi.indexFromDataset should work', (done) => {
            const oldFunc = XIApi.query;
            XIApi.query = () => PromiseHelper.resolve();

            XIApi.indexFromDataset(0, 'dsName', 'test', 'prefix')
                .then((newTableName, prefix) => {
                    expect(newTableName).to.equal('test#12');
                    expect(prefix).to.equal('prefix');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.query = oldFunc;
                });
        });

        it('XIApi.indexFromDataset should reject invalid case', (done) => {
            XIApi.indexFromDataset()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('Invalid args in indexFromDataset');
                    done();
                });
        });

        it('XIApi.index should resolve empty column case', (done) => {
            const tableName = 'test#a';
            XIApi.index(1, [], tableName)
            .then((indexTable, isCached, newKeys) => {
                expect(indexTable).to.equal(tableName);
                expect(isCached).to.be.false;
                expect(newKeys.length).to.equal(0);
                done();
            })
            .fail(() => {
                done('fail');
            });
        });

        it('XIApi.index should work', (done) => {
            const isSimulate = Transaction.isSimulate;
            const isEdit = Transaction.isEdit;
            const getIndexTable = SQLApi.getIndexTable;

            Transaction.isSimulate = () => true;
            Transaction.isEdit = () => false;
            SQLApi.getIndexTable = () => {
                return { tableName: 'indexTable', keys: ['key'] }
            };

            XIApi.index(1, ['col'], 'test#a')
                .then((indexTable, isCached, newKeys) => {
                    expect(indexTable).to.equal('indexTable');
                    expect(isCached).to.be.true;
                    expect(newKeys.length).to.equal(1);
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    Transaction.isEdit = isEdit;
                    Transaction.isSimulate = isSimulate;
                    SQLApi.getIndexTable = getIndexTable;
                });
        });

        it('XIApi.index should reject invalid case', (done) => {
            XIApi.index()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('Invalid args in index');
                    done();
                });
        });

        it('XIApi.sort should work', (done) => {
            const tableId = 'a';
            const tableName = 'test#' + tableId;
            const progCol = ColManager.newPullCol('col', 'col', ColumnType.number);
            const table = new TableMeta({
                tableId: tableId,
                tableName: tableName,
                tableCols: [progCol, ColManager.newDATACol()]
            });
            gTables[tableId] = table;

            const oldIndex = XIApi.index;
            XcalarIndexFromTable = () => PromiseHelper.resolve({newKeys: ['newKey']});

            const colInfo = {
                colName: "col",
                ordering: XcalarOrderingT.XcalarOrderingAscending
            };
            XIApi.sort(1, [colInfo], tableName)
                .then((newTableName, newKeys) => {
                    expect(newTableName).to.be.a('string');
                    expect(newKeys[0]).to.equal('newKey');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    delete gTables[tableId];
                    XcalarIndexFromTable = oldIndex;
                });
        });

        it('XIApi.sort should reject invalid case', (done) => {
            XIApi.sort()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('Invalid args in sort');
                    done();
                });
        });

        it('XIApi.sortAscending should work', (done) => {
            const oldFunc = XIApi.sort;
            let testInfos;
            XIApi.sort = (txId, colInfos) => {
                testInfos = colInfos;
                return PromiseHelper.resolve();
            };

            XIApi.sortAscending(1, ['testCol'], 'table')
                .then(() => {
                    expect(testInfos).to.be.an('array');
                    expect(testInfos.length).to.equal(1);
                    expect(testInfos[0].name).to.equal('testCol');
                    expect(testInfos[0].ordering).to.equal(XcalarOrderingT.XcalarOrderingAscending);
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.sort = oldFunc;
                });
        });

        it('XIApi.sortDescending should work', (done) => {
            const oldFunc = XIApi.sort;
            let testInfos;
            XIApi.sort = (txId, colInfos) => {
                testInfos = colInfos;
                return PromiseHelper.resolve();
            };

            XIApi.sortDescending(1, ['testCol'], 'table')
                .then(() => {
                    expect(testInfos).to.be.an('array');
                    expect(testInfos.length).to.equal(1);
                    expect(testInfos[0].name).to.equal('testCol');
                    expect(testInfos[0].ordering).to.equal(XcalarOrderingT.XcalarOrderingDescending);
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.sort = oldFunc;
                });
        });

        it('XIApi.map should work', (done) => {
            const oldFunc = XIApi.query;
            XIApi.query = () => PromiseHelper.resolve();

            XIApi.map(1, ['concat(a)'], 'table', 'newCol')
                .then((newTableName) => {
                    expect(newTableName).to.equal('table#12');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.query = oldFunc;
                });
        });

        it('XIApi.map should reject invalid case', (done) => {
            XIApi.map()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('Invalid args in map');
                    done();
                });
        });

        it('XIApi.map should reject normal fail', (done) => {
            const oldMap = XIApi.query;
            XIApi.query = () => PromiseHelper.reject('test');

            XIApi.map(1, ['concat(a)'], 'table', 'newCol')
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('test');
                    done();
                })
                .always(() => {
                    XIApi.query = oldMap;
                });
        });

        describe('XIApi.join Test', () => {
            let oldMap;
            let oldQuery;
            let isSimulate;
            let isEdit;
            let getIndexTable;

            before(() => {
                oldMap = XIApi.map;
                oldQuery = XIApi.query;
                isSimulate = Transaction.isSimulate;
                isEdit = Transaction.isEdit;
                getIndexTable = SQLApi.getIndexTable;

                XIApi.map = () => PromiseHelper.resolve();
                XIApi.query = () => PromiseHelper.resolve();
                Transaction.isSimulate = () => true;
                Transaction.isEdit = () => false;
                SQLApi.getIndexTable = () => {
                    return { tableName: 'indexTable', keys: ['key'] }
                };

            });

            it('should reject invalid case', (done) => {
                XIApi.join()
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('Invalid args in join');
                        done();
                    });
            });

            it('should reject invalid columns', (done) => {
                const joinType = JoinOperatorT.InnerJoin;
                const lTableInfo = {
                    tableName: 'l#a',
                    columns: ['a']
                };
                const rTableInfo = {
                    tableName: 'r#a',
                    columns: ['b', 'c']
                };
                XIApi.join(1, joinType, lTableInfo, rTableInfo)
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('Invalid args in join');
                        done();
                    });
            });

            it('should handle normal join', (done) => {
                const joinType = JoinOperatorT.InnerJoin;
                const lTableInfo = {
                    tableName: 'l#a',
                    columns: ['a']
                };
                const rTableInfo = {
                    tableName: 'r#b',
                    columns: ['b'],
                    rename: [{ orig: 'old', new: 'new', type: 4 }]
                };
                XIApi.join(1, joinType, lTableInfo, rTableInfo)
                .then((newTableName, tempCols, lRename, rRename) => {
                    expect(newTableName).to.equal('l-r#12');
                    expect(tempCols.length).to.equal(0);
                    expect(lRename.length).to.equal(1);
                    expect(rRename.length).to.equal(2);
                    done();
                })
                .fail(() => {
                    done('fail');
                });
            });

            it('should handle delete tempTables if set clean', (done) => {
                const joinType = JoinOperatorT.InnerJoin;
                const lTableInfo = {
                    tableName: 'l#a',
                    columns: ['a']
                };
                const rTableInfo = {
                    tableName: 'r#b',
                    columns: ['b'],
                    rename: [{ orig: 'old', new: 'new', type: 4 }]
                };
                const oldDelete = XIApi.deleteTableInBulk;
                let test = false;
                XIApi.deleteTableInBulk = () => {
                    test = true;
                    return PromiseHelper.resolve();
                };

                const options = {
                    clean: true,
                    evalString: 'test'
                };
                XIApi.join(1, joinType, lTableInfo, rTableInfo, options)
                    .then(() => {
                        expect(test).to.equal(true);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.deleteTableInBulk = oldDelete;
                    });
            });

            it('should handle semi join case', (done) => {
                const joinType = 10;
                const lTableInfo = {
                    tableName: 'l#a',
                    columns: ['a'],
                    casts: ColumnType.integer
                };
                const rTableInfo = {
                    tableName: 'r#b',
                    columns: ['b'],
                    casts: ColumnType.integer
                };

                XIApi.join(1, joinType, lTableInfo, rTableInfo)
                    .then((newTableName, tempCols, lRename, rRename) => {
                        expect(newTableName).to.equal('l-r#12');
                        expect(tempCols.length).to.equal(1);
                        expect(lRename.length).to.equal(1);
                        expect(rRename.length).to.equal(1);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            after(() => {
                XIApi.map = oldMap;
                XIApi.query = oldQuery;
                Transaction.isSimulate = isSimulate;
                Transaction.isEdit = isEdit;
                SQLApi.getIndexTable = getIndexTable;
            });
        });


        describe('XIApi.groupBy Test', function () {
            let oldQuery;
            let isSimulate;
            let isEdit;
            let getIndexTable;

            before(() => {
                oldQuery = XIApi.query;
                isSimulate = Transaction.isSimulate;
                isEdit = Transaction.isEdit;
                getIndexTable = SQLApi.getIndexTable;

                XIApi.query = () => PromiseHelper.resolve();
                Transaction.isSimulate = () => true;
                Transaction.isEdit = () => false;
                SQLApi.getIndexTable = () => {
                    return { tableName: 'indexTable', keys: ['key'] }
                };
            });

            it('should reject invalid case', (done) => {
                XIApi.groupBy()
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('Invalid args in groupby');
                        done();
                    });
            });

            it('should handle normal case', (done) => {
                const aggArgs = [{
                    operator: 'min',
                    aggColName: 'aggCol',
                    newColName: 'newAggCol'
                }];
                const groupByCols = ['groupByCol'];
                const tableName = 'test#a';

                XIApi.groupBy(1, aggArgs, groupByCols, tableName)
                    .then((finalTable, tempCols, newKeyFieldName, newKeys) => {
                        expect(finalTable).to.equal('test-GB#12');
                        expect(tempCols.length).to.equal(0);
                        expect(newKeyFieldName).to.equal("key");
                        expect(newKeys.length).to.equal(1);
                        expect(newKeys[0]).to.equal("key");
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should handle delete tempTables if set clean', (done) => {
                const aggArgs = [{
                    operator: 'min',
                    aggColName: 'aggCol',
                    newColName: 'newAggCol'
                }];
                const groupByCols = ['groupByCol'];
                const tableName = 'test#a';
                const oldDelete = XIApi.deleteTableInBulk;
                let test = false;
                XIApi.deleteTableInBulk = () => {
                    test = true;
                    return PromiseHelper.resolve();
                };
                const options = {
                    clean: true
                };

                XIApi.groupBy(1, aggArgs, groupByCols, tableName, options)
                    .then(() => {
                        expect(test).to.equal(true);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.deleteTableInBulk = oldDelete;
                    });
            });

            it('should handle distinct groupBy case', (done) => {
                const aggArgs = [{
                    operator: 'min',
                    aggColName: 'aggCol',
                    newColName: 'newAggCol',
                    isDistinct: true
                }];
                const groupByCols = 'groupByCol';
                const tableName = 'test#a';
                const cacheIndexTable = SQLApi.cacheIndexTable;

                SQLApi.cacheIndexTable = () => { };

                XIApi.groupBy(1, aggArgs, groupByCols, tableName)
                    .then((finalTable, tempCols, newKeyFieldName, newKeys) => {
                        expect(finalTable).to.equal('test-GB#12');
                        expect(tempCols.length).to.equal(3);
                        expect(newKeyFieldName).to.equal("key");
                        expect(newKeys.length).to.equal(1);
                        expect(newKeys[0]).to.equal("key");
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        SQLApi.cacheIndexTable = cacheIndexTable;
                    })
            });

            after(() => {
                XIApi.query = oldQuery;
                Transaction.isSimulate = isSimulate;
                Transaction.isEdit = isEdit;
                SQLApi.getIndexTable = getIndexTable;
            });
        });

        describe('XIAPi.union Test', () => {
            let oldFunc;

            before(() => {
                oldFunc = XIApi.query;
                XIApi.query = () => PromiseHelper.resolve();
            });

            it('should reject invalid case', (done) => {
                XIApi.union()
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('Invalid args in union');
                        done();
                    });
            });

            it('should handle normal case', (done) => {
                const tableInfos = [{
                    tableName: 't1#a',
                    columns: [{ name: 'c1', rename: 'col', type: ColumnType.integer }]
                }, {
                    tableName: 't2#b',
                    columns: [{ name: 'c2', rename: 'col', type: ColumnType.integer }]
                }];

                XIApi.union(1, tableInfos)
                    .then((newTableName, newTableCols) => {
                        expect(newTableName).to.equal('t1#12');
                        expect(newTableCols.length).to.equal(2);
                        expect(newTableCols[0].backName).to.equal('col');
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should handle dedup case', (done) => {
                const tableInfos = [{
                    tableName: 't1#a',
                    columns: [{ name: 'c1', rename: 'col', type: ColumnType.integer }]
                }, {
                    tableName: 't2#b',
                    columns: [{ name: 'c2', rename: 'col', type: ColumnType.integer }]
                }];
                const oldMap = XIApi.map;
                const oldIndex = XIApi.index;
                XIApi.map = () => PromiseHelper.resolve('testMap');
                XIApi.index = () => PromiseHelper.resolve('testIndex');

                XIApi.union(1, tableInfos, true)
                    .then((newTableName, newTableCols) => {
                        expect(newTableName).to.equal('t1#12');
                        expect(newTableCols.length).to.equal(2);
                        expect(newTableCols[0].backName).to.equal('col');
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.map = oldMap;
                        XIApi.index = oldIndex;
                    });
            });

            after(() => {
                XIApi.query = oldFunc;
            });
        });

        it('XIApi.project should handle fail case', (done) => {
            XIApi.project()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('Invalid args in project');
                    done();
                });
        });

        it('XIApi.project should work', (done) => {
            const oldFunc = XIApi.query;
            XIApi.query = () => PromiseHelper.resolve();

            XIApi.project(1, ['col'], 'table')
                .then((newTableName) => {
                    expect(newTableName).to.equal('table#12');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.query = oldFunc;
                });
        });

        it('XIApi.synthesize should handle fail case', (done) => {
            XIApi.synthesize()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('Invalid args in synthesize');
                    done();
                });
        });

        it('XIApi.synthesize should work', (done) => {
            const oldFunc = XIApi.query;
            XIApi.query = () => PromiseHelper.resolve();

            XIApi.synthesize(1, [{}], 'table')
                .then((newTableName) => {
                    expect(newTableName).to.equal('table#12');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.query = oldFunc;
                });
        });

        it('XIApi.query should handle fail case', (done) => {
            XIApi.query()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('Invalid args in query');
                    done();
                });
        });

        it('XIApi.query should work', (done) => {
            const oldFunc = XcalarQueryWithCheck;
            let test = false;
            XcalarQueryWithCheck = () => {
                test = true;
                return PromiseHelper.resolve();
            };

            XIApi.query(1, 'query', 'queryStr')
                .then(() => {
                    expect(test).to.equal(true);
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XcalarQueryWithCheck = oldFunc;
                });
        });

        it('XIApi.exportTable should handle fail case', (done) => {
            XIApi.exportTable()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('Invalid args in export');
                    done();
                });
        });

        it('XIApi.exportTable should work', (done) => {
            const oldFunc = XcalarExport;
            let test = false;
            XcalarExport = () => {
                test = true;
                return PromiseHelper.resolve();
            };

            XIApi.exportTable(1, 'table', 'exportTable')
                .then(() => {
                    expect(test).to.equal(true);
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XcalarExport = oldFunc;
                });
        });

        it('XIApi.genRowNum should handle fail case', (done) => {
            XIApi.genRowNum()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('Invalid args in get row num');
                    done();
                });
        });

        it('XIApi.genRowNum should work', (done) => {
            const oldFunc = XcalarGenRowNum;
            let test = false;
            XcalarGenRowNum = () => PromiseHelper.resolve();

            XIApi.genRowNum(1, 'table', 'newCol')
                .then((newTableName) => {
                    expect(newTableName).to.equal('table#12');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XcalarGenRowNum = oldFunc;
                });
        });

        describe('XIApi.getNumRows Test', () => {
            it('XIApi.getNumRows should handle fail case', (done) => {
                XIApi.getNumRows()
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('Invalid args in getNumRows');
                        done();
                    });
            });

            it('XIApi.getNumRows should handle constant fail case', (done) => {
                XIApi.getNumRows('test#a', { useConstant: true })
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('Invalid args in getNumRows');
                        done();
                    });
            });

            it('XIApi.getNumRows should handle constant case', (done) => {
                const oldAgg = XIApi.aggregate;
                XIApi.aggregate = () => PromiseHelper.resolve(1);

                XIApi.getNumRows('test#a', { useConstant: true, constantName: 'agg' })
                    .then((res) => {
                        expect(res).to.equal(1);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.aggregate = oldAgg;
                    });
            });

            it('XIApi.getNumRows should work in normal case', (done) => {
                const oldFunc = XcalarGetTableCount;
                XcalarGetTableCount = () => PromiseHelper.resolve(2);

                XIApi.getNumRows('table#a')
                    .then((res) => {
                        expect(res).to.be.equal(2);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XcalarGetTableCount = oldFunc;
                    });
            });
        });

        describe('fetchData API Test', () => {
            it('XIApi.fetchData should handle fail case', (done) => {
                XIApi.fetchData()
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error.error).to.equal('Invalid args in fetch data');
                        done();
                    });
            });

            it('XIApi.fetchData should fail in invalid meta', (done) => {
                const oldMakeResultSet = XcalarMakeResultSetFromTable;

                XcalarMakeResultSetFromTable = () => PromiseHelper.resolve({
                    resultSetId: "1",
                    numEntries: null
                })

                XIApi.fetchData('table', 1, 1)
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('No Data!');
                        done();
                    })
                    .always(() => {
                        XcalarMakeResultSetFromTable = oldMakeResultSet;
                    });
            });

            it('XIApi.fetchData should work', (done) => {
                const oldMakeResultSet = XcalarMakeResultSetFromTable;
                const oldFetch = XcalarFetchData;
                const oldFree = XcalarSetFree;

                XcalarMakeResultSetFromTable = () => PromiseHelper.resolve({
                    resultSetId: "1",
                    numEntries: 1
                })
                XcalarFetchData = () => PromiseHelper.resolve(['test']);
                XcalarSetFree = () => PromiseHelper.resolve();

                XIApi.fetchData('table', 1, 1)
                    .then((finaData) => {
                        expect(finaData.length).to.equal(1);
                        expect(finaData[0]).to.equal('test');
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XcalarMakeResultSetFromTable = oldMakeResultSet;
                        XcalarFetchData = oldFetch;
                        XcalarSetFree = oldFree;
                    });
            });

            it('XIApi.fetchDataAndParse reject in invalid case', (done) => {
                const oldFunc = XIApi.fetchData;
                XIApi.fetchData = () => PromiseHelper.resolve(['a'])

                XIApi.fetchDataAndParse('t#a', 1, 1)
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).not.to.be.null;
                        done();
                    })
                    .always(() => {
                        XIApi.fetchData = oldFunc;
                    });
            });

            it('XIApi.fetchDataAndParse should work', (done) => {
                const oldFunc = XIApi.fetchData;
                XIApi.fetchData = () => PromiseHelper.resolve(['{"a": "b"}'])

                XIApi.fetchDataAndParse('t#a', 1, 1)
                    .then((parsedData) => {
                        expect(parsedData.length).to.equal(1);
                        expect(parsedData[0]).to.be.an('object');
                        expect(parsedData[0].a).to.equal('b');
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.fetchData = oldFunc;
                    });
            });

            it('XIApi.fetchColumnData should reject in invalid case', (done) => {
                XIApi.fetchColumnData(null, 't#a', 1, 1)
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('Invalid args in fetch data');
                        done();
                    });
            });

            it('XIApi.fetchColumnData reject in cannot parse case', (done) => {
                const oldFunc = XIApi.fetchData;
                XIApi.fetchData = () => PromiseHelper.resolve(['a'])

                XIApi.fetchColumnData('t#a', 1, 1)
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).not.to.be.null;
                        done();
                    })
                    .always(() => {
                        XIApi.fetchData = oldFunc;
                    });
            });

            it('XIApi.fetchColumnData should work', (done) => {
                const oldFunc = XIApi.fetchData;
                XIApi.fetchData = () => PromiseHelper.resolve(['{"a": "b"}'])

                XIApi.fetchColumnData('a', 't#a', 1, 1)
                    .then((result) => {
                        expect(result.length).to.equal(1);
                        expect(result[0]).to.equal('b');
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.fetchData = oldFunc;
                    });
            });
        });

        describe('deleta table API Test', () => {
            it('XIApi.deleteTable should handle invalid case', (done) => {
                XIApi.deleteTable()
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('Invalid args in delete table');
                        done();
                    });
            });

            it('XIApi.deleteTable should work', (done) => {
                const oldFunc = XcalarDeleteTable;
                let test = false;
                XcalarDeleteTable = () => {
                    test = true;
                    return PromiseHelper.resolve();
                }

                XIApi.deleteTable(1, 't#a')
                    .then(() => {
                        expect(test).to.be.true;
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XcalarDeleteTable = oldFunc;
                    });
            });

            it('XIApi.deleteTable fail when thrift errors', (done) => {
                const oldFunc = XcalarDeleteTable;
                XcalarDeleteTable = () => PromiseHelper.reject('test');

                XIApi.deleteTable(1, 't#a')
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('test');
                        done();
                    })
                    .always(() => {
                        XcalarDeleteTable = oldFunc;
                    });
            });

            it('XIApi.deleteTable still resolve when ignore error', (done) => {
                const oldFunc = XcalarDeleteTable;
                let test = false;
                XcalarDeleteTable = () => {
                    test = true;
                    return PromiseHelper.reject('test');
                }

                XIApi.deleteTable(1, 't#a', true)
                    .then(() => {
                        expect(test).to.be.true;
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XcalarDeleteTable = oldFunc;
                    });
            });

            it('XIApi.deleteTables should handle invalid case', (done) => {
                XIApi.deleteTables()
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('Invalid args in delete table');
                        done();
                    });
            });

            it('XIApi.deleteTables should work', (done) => {
                const oldFunc = XcalarQueryWithCheck;
                XcalarQueryWithCheck = () => {
                    return PromiseHelper.resolve({
                        queryGraph: {
                            node: [{
                                input: {
                                    deleteDagNodeInput: {
                                        namePattern: 'a'
                                    }
                                },
                                state: DgDagStateT.DgDagStateDropped
                            }]
                        }
                    });
                };

                const arrayOfQueries = [{
                    args: {
                        namePattern: 'a'
                    }
                }];

                XIApi.deleteTables(1, arrayOfQueries)
                    .then((result) => {
                        expect(result).to.equal(null);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XcalarQueryWithCheck = oldFunc;
                    });
            });

            it('XIApi.deleteTables with no transaction id should work', (done) => {
                const oldFunc = XcalarQueryWithCheck;
                XcalarQueryWithCheck = () => {
                    return PromiseHelper.resolve({
                        queryGraph: {
                            node: [{
                                input: {
                                    deleteDagNodeInput: {
                                        namePattern: 'a'
                                    }
                                },
                                state: DgDagStateT.DgDagStateDropped
                            }]
                        }
                    });
                };

                const arrayOfQueries = [{
                    args: {
                        namePattern: 'a'
                    }
                }];

                XIApi.deleteTables(null, arrayOfQueries)
                    .then((result) => {
                        expect(result).to.equal(null);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XcalarQueryWithCheck = oldFunc;
                    });
            });

            it('XIApi.deleteTables should fail when delete fail', (done) => {
                const oldFunc = XcalarQueryWithCheck;
                XcalarQueryWithCheck = () => {
                    return PromiseHelper.resolve({
                        queryGraph: {
                            node: [{
                                input: {
                                    deleteDagNodeInput: {
                                        namePattern: 'a'
                                    }
                                },
                                state: DgDagStateT.DgDagStateUnknown
                            }]
                        }
                    });
                };

                const arrayOfQueries = [{
                    args: {
                        namePattern: 'a'
                    }
                }];

                XIApi.deleteTables(1, arrayOfQueries)
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.be.an('object');
                        done();
                    })
                    .always(() => {
                        XcalarQueryWithCheck = oldFunc;
                    });
            });

            it('XIApi.deleteTables should fail when thrift call fail', (done) => {
                const oldFunc = XcalarQueryWithCheck;
                XcalarQueryWithCheck = () => PromiseHelper.reject('test');

                const arrayOfQueries = [{
                    args: {
                        namePattern: 'a'
                    }
                }];

                XIApi.deleteTables(1, arrayOfQueries)
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.be.an('object');
                        done();
                    })
                    .always(() => {
                        XcalarQueryWithCheck = oldFunc;
                    });
            });

            it('XIAPi.deleteTableInBulk should work', (done) => {
                const oldFunc = XIApi.deleteTable;
                let test = false
                XIApi.deleteTable = () => {
                    test = true;
                    return PromiseHelper.resolve();
                }

                XIApi.deleteTable(1, ['a'])
                .then(() => {
                    expect(test).to.be.true;
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.deleteTable = oldFunc;
                });
            });
        });

        it('XIAPi.renameTable should work', (done) => {
            const oldFunc = XcalarRenameTable;
            let test = false
            XcalarRenameTable = () => {
                test = true;
                return PromiseHelper.resolve();
            }

            XIApi.renameTable(1, "a#12", "b#12")
            .then(() => {
                expect(test).to.be.true;
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XcalarRenameTable = oldFunc;
            });
        });

        it('XIAPi.renameTable should reject invalid case', (done) => {
            XIApi.renameTable()
            .then(() => {
                done("fail");
            })
            .fail((error) => {
                expect(error).not.to.be.null;
                done();
            });
        });

        it('XIAPi.createDataTarget should work', (done) => {
            const oldFunc = XcalarTargetCreate;
            let test = false
            XcalarTargetCreate = () => {
                test = true;
                return PromiseHelper.resolve();
            }

            XIApi.createDataTarget()
                .then(() => {
                    expect(test).to.be.true;
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XcalarTargetCreate = oldFunc;
                });
        });

        it('XIAPi.deleteDataTarget should work', (done) => {
            const oldFunc = XcalarTargetDelete;
            let test = false
            XcalarTargetDelete = () => {
                test = true;
                return PromiseHelper.resolve();
            }

            XIApi.deleteDataTarget('target')
                .then(() => {
                    expect(test).to.be.true;
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XcalarTargetDelete = oldFunc;
                });
        });
    });

    after(() => {
        Authentication.getHashId = oldGetId;
    });
});