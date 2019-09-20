describe("CloudManager Test", function() {
    let oldFetch;
    let response;

    before(function() {
        oldFetch = fetch;
        fetch = () => {
            return new Promise((resolve) => {
                resolve({
                    status: httpStatus.OK,
                    json: () => new Promise((resolve) => resolve(response))
                });
            });
        }
    });

    it("getS3BucketInfo should work", function(done) {
        response = {
            status: 0,
            bucketName: "test"
        };

        CloudManager.Instance.getS3BucketInfo()
        .then(function(res) {
            expect(res).to.deep.equal({
                "bucket": "test"
            });
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            CloudManager.Instance._s3Info = null;
        });
    });

    it("CloudManager.Instance.uploadToS3 should work", function(done) {
        let oldFunc = xcHelper.readFile;
        let called = false;
        xcHelper.readFile = () => {
            called = true;
            return PromiseHelper.resolve();
        };
        response = {
            status: 0
        };

        CloudManager.Instance.uploadToS3()
        .then(function() {
            expect(called).to.equal(true);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            xcHelper.readFile = oldFunc;
        });
    });

    it("CloudManager.Instance.deleteS3File should work", function(done) {
        response = {
            status: 0,
            test: true
        };

        CloudManager.Instance.deleteS3File()
        .then(function(res) {
            expect(res.test).to.equal(true);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("fail case1", function(done) {
        response = {
            status: 1
        };

        CloudManager.Instance.deleteS3File()
        .then(function() {
            done("fail");
        })
        .fail(function() {
            done();
        });
    });

    it("fail case2", function(done) {
        fetch = () => {
            return new Promise((resolve) => {
                resolve({
                    status: httpStatus.BadRequest
                });
            });
        };

        response = {
            status: 0
        };

        CloudManager.Instance.deleteS3File()
        .then(function() {
            done("fail");
        })
        .fail(function() {
            done();
        });
    });

    it("fail case3", function(done) {
        fetch = () => {
            return new Promise((_resolve, reject) => {
                reject();
            });
        };

        response = {
            status: 0
        };

        CloudManager.Instance.deleteS3File()
        .then(function() {
            done("fail");
        })
        .fail(function() {
            done();
        });
    });

    after(function() {
        fetch = oldFetch;
    });
});