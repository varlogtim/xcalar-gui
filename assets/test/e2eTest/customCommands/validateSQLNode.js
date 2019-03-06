const EventEmitter = require('events');

class ValidateSQLNode extends EventEmitter {
    command(nodeId, _cb) {
        let sqlNodeSelector;
        if (nodeId == null) {
            sqlNodeSelector = ".operator.sql"
        } else {
            sqlNodeSelector = '.operator[data-nodeid="' + nodeId + '"]'
        }
        const self = this;
        this.api
            .moveToElement(`.dataflowArea.active ${sqlNodeSelector} .main`, 10, 20)
            .mouseButtonClick('right')
            .waitForElementVisible("#dagNodeMenu", 1000)
            .moveToElement("#dagNodeMenu li.viewResult", 10, 1)
            .mouseButtonClick('left')
            .waitForElementVisible('#dagViewTableArea .totalRows', 20000)
            .getText('#dagViewTableArea .totalRows', ({value}) => {
                self.api.assert.equal(value, "0");
            });
        this.emit('complete');
        return this;
    }
}

module.exports = ValidateSQLNode;