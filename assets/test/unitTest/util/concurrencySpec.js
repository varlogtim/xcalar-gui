describe("Concurrency Test", function() {
    var mutex;
    var lockString;

    describe("Mutex tests", function() {
        before(function() {
            console.clear();
            mutex = new Mutex(xcHelper.randName("unitTestMutex"));
        });

        it("Undefined calls should fail", function(done) {
            Concurrency.initLock()
            .then(function() {
                done("fail");
            }, function(errorMessage) {
                expect(errorMessage).to.equal(ConcurrencyEnum.NoLock);
                return Concurrency.lock();
            })
            .then(function() {
                done("fail");
            }, function(errorMessage) {
                expect(errorMessage).to.equal(ConcurrencyEnum.NoLock);
                return Concurrency.tryLock();
            })
            .then(function() {
                done("fail");
            }, function(errorMessage) {
                expect(errorMessage).to.equal(ConcurrencyEnum.NoLock);
                return Concurrency.forceUnlock();
            })
            .then(function() {
                done("fail");
            }, function(errorMessage) {
                expect(errorMessage).to.equal(ConcurrencyEnum.NoLock);
                return Concurrency.isLocked();
            })
            .then(function() {
                done("fail");
            }, function(errorMessage) {
                expect(errorMessage).to.equal(ConcurrencyEnum.NoLock);
                done();
            });
        });

        it("Lock call to uninited lock should fail", function(done) {
            var lock = new Mutex("notInited");
            Concurrency.lock(lock)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(ConcurrencyEnum.NoKVStore);
                done();
            });
        });

        it("Bogus call to test other keysetifequal return codes", function(done) {
            var lock = new Mutex("notInited");
            Concurrency.lock(lock) // This is deliberate
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(ConcurrencyEnum.NoKVStore);
                done();
            });
        });

        it("Unlock call to uninited lock should fail", function(done) {
            var lock = new Mutex("notInited");
            Concurrency.unlock(lock)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(ConcurrencyEnum.NoKey);
                done();
            });
        });

        it("isLocked call to uninited lock should fail", function(done) {
            var lock = new Mutex("notInited");
            Concurrency.isLocked(lock)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(ConcurrencyEnum.NoKey);
                done();
            });
        });

        it("Should be able to get new lock", function(done) {
            Concurrency.initLock(mutex)
            .then(function() {
                return Concurrency.lock(mutex);
            })
            .then(function(ls) {
                lockString = ls;
                done();
            });
        });

        it("Should not be able to reinit already inited mutex", function(done) {
            Concurrency.initLock(mutex)
            .then(function() {
                done("Should not be able to double init");
            })
            .fail(function(error) {
                expect(error).to.equal(ConcurrencyEnum.AlreadyInit);
                done();
            });
        });

        it("Should not get lock after it's been locked", function(done) {
            Concurrency.lock(mutex, 1000)
            .then(function() {
                done("Should not get lock!");
            })
            .fail(function(errorMessage) {
                expect(errorMessage).to.equal(ConcurrencyEnum.OverLimit);
                done();
            });
        });

        it("Should not be able to unlock undef lock", function(done) {
            Concurrency.unlock()
            .then(function() {
                done("Should not get lock!");
            })
            .fail(function(errorMessage) {
                expect(errorMessage).to.equal(ConcurrencyEnum.NoLock);
                done();
            });
        });

        it("Should not be able to unlock with a wrong string", function(done) {
            Concurrency.unlock(mutex, lockString.substring(1))
            .then(function() {
                return Concurrency.isLocked(mutex);
            })
            .then(function(sts) {
                expect(sts).to.be.true;
                done();
            })
            .fail(function() {
                done("Should not error out!");
            });
        });

        it("Should fail trylock since lock is held", function(done) {
            Concurrency.tryLock(mutex)
            .then(function() {
                done("Should fail trylock");
            })
            .fail(function(errorMessage) {
                expect(errorMessage).to.equal("Limit exceeded");
                done();
            });
        });

        it("Should be able to unlock with correct lockString", function(done) {
            Concurrency.unlock(mutex, lockString)
            .then(function() {
                lockString = undefined;
                done();
            })
            .fail(function() {
                done("Should be able to unlock");
            });
        });

        it("Should be able to get trylock", function(done) {
            Concurrency.tryLock(mutex)
            .then(function(ls) {
                lockString = ls;
                done();
            })
            .fail(function() {
                done("Should be able to get trylock");
            });
        });

        it("Should be able to forcefully get the lock away", function(done) {
            Concurrency.forceUnlock(mutex)
            .then(function() {
                return Concurrency.isLocked(mutex);
            })
            .then(function(sts) {
                expect(sts).to.equal.false;
                done();
            })
            .fail(function() {
                done("Should be able to forceUnlock anytime");
            });
        });

        it("Should still unlock even though it's unlocked", function(done) {
            Concurrency.unlock(mutex, lockString)
            .then(function() {
                lockString = undefined;
                done();
            })
            .fail(function() {
                done("Should still be able to unlock");
            });
        });

        it("Concurrency test case", function(done) {
            // T1: Lock
            // T2: Try to lock
            // T1: After 200 ms, unlock
            // T2's lock call should be successful.

            // Start test by ensuring lock is unlocked
            var t1ls;
            var t2ls;
            Concurrency.isLocked(mutex)
            .then(function(sts) {
                expect(sts).to.be.false;
                return Concurrency.lock(mutex);
            })
            .then(function(ls) {
                var deferred = PromiseHelper.deferred();
                t1ls = ls;
                setTimeout(function() {
                    Concurrency.unlock(mutex, t1ls)
                    .fail(function() {
                        done("should be able to unlock!");
                    });
                }, 200);

                setTimeout(function() {
                    Concurrency.lock(mutex)
                    .then(function(ls) {
                        t2ls = ls;
                        deferred.resolve();
                    })
                    .fail(function() {
                        done("Should be able to get the lock!");
                    });
                }, 1);

                return deferred.promise();
            })
            .then(function() {
                expect(t2ls).to.not.equal(t1ls);
                expect(t2ls).to.not.be.undefined;
                return Concurrency.isLocked(mutex);
            })
            .then(function(sts) {
                expect(sts).to.be.true;
                done();
            })
            .fail(function() {
                done("should not fail anywhere");
            });
        });

        it("Delete lock", function(done) {
            Concurrency.delLock(mutex)
            .then(function() {
                return XcalarKeyLookup(mutex.key, mutex.scope);
            })
            .then(function(val) {
                expect(val).to.be.null;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function(done) {
            XcalarKeyDelete(mutex.key, mutex.scope)
            .always(done);
        });
    });
});