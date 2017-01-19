describe("Schedule related Test", function() {
    describe("Time related function Test", timeRelatedFunctionTest);
    describe("View related function Test", viewRelatedFunctionTest);
});


function timeRelatedFunctionTest() {
    var $newScheduleForm;

    before(function() {
        $newScheduleForm = $("#newScheduleForm");
    });

    it("Should get next Run time", function() {
        var futureTime = new Date();
        var previousTime = new Date();

        previousTime.setDate(previousTime.getDate() - 1);
        futureTime.setDate(futureTime.getDate() + 1);

        var futureDateText = (futureTime.getMonth() + 1) + "/"
                            + futureTime.getDate() + "/"
                            + futureTime.getFullYear();

        var options = {
            "startTime": futureTime, // The time to start the next run
            "dateText" : futureDateText,
            "timeText" : "11 : 13 PM",
            "repeat"   : "hourly",
            "freq"     : 5,
            "recur"    : 10
        };

        // StartTime at the future, nothing has been changed
        var schedule = new SchedObj(options);
        Scheduler.__testOnly__.getNextRunTime(schedule);
        expect(schedule.startTime).to.equal(futureTime);

        // StartTime at previous, need to figure out the start time for
        // next running
        options.startTime = previousTime.getTime();
        options.repeat = "minute";
        schedule = new SchedObj(options);
        var currentTime = new Date();
        Scheduler.__testOnly__.getNextRunTime(schedule);
        var d = new Date(schedule.startTime);
        expect((d.getTime() - currentTime)/(60*1000)).to.within(0, 1);
        expect(d.getSeconds() - previousTime.getSeconds()).to.equal(0);

        options.startTime = previousTime.getTime();
        options.repeat = "hourly";
        schedule = new SchedObj(options);
        currentTime = new Date();
        Scheduler.__testOnly__.getNextRunTime(schedule);
        d = new Date(schedule.startTime);
        expect((d.getTime() - currentTime)/(3600*1000)).to.within(0, 1);
        expect(d.getMinutes() - previousTime.getMinutes()).to.equal(0);
        expect(d.getSeconds() - previousTime.getSeconds()).to.equal(0);

        options.startTime = previousTime.getTime();
        options.repeat = "daily";
        schedule = new SchedObj(options);
        currentTime = new Date();
        Scheduler.__testOnly__.getNextRunTime(schedule);
        d = new Date(schedule.startTime);
        expect((d.getTime() - currentTime)/(3600*24*1000)).to.within(0, 1);
        expect(d.getHours() - previousTime.getHours()).to.equal(0);
        expect(d.getMinutes() - previousTime.getMinutes()).to.equal(0);
        expect(d.getSeconds() - previousTime.getSeconds()).to.equal(0);

        options.startTime = previousTime.getTime();
        options.repeat = "weekly";
        schedule = new SchedObj(options);
        currentTime = new Date();
        Scheduler.__testOnly__.getNextRunTime(schedule);
        d = new Date(schedule.startTime);
        expect((d.getTime() - currentTime)/(3600*24*1000)).to.within(0, 7);
        expect(((d.getTime() - previousTime)/(3600*24*1000)) % 7).to.equal(0);
        expect(d.getHours() - previousTime.getHours()).to.equal(0);
        expect(d.getMinutes() - previousTime.getMinutes()).to.equal(0);
        expect(d.getSeconds() - previousTime.getSeconds()).to.equal(0);

        options.startTime = previousTime.getTime();
        options.repeat = "biweekly";
        schedule = new SchedObj(options);
        currentTime = new Date();
        Scheduler.__testOnly__.getNextRunTime(schedule);
        d = new Date(schedule.startTime);
        expect((d.getTime() - currentTime)/(3600*24*1000)).to.within(0, 14);
        expect(((d.getTime() - previousTime)/(3600*24*1000)) % 14).to.equal(0);
        expect(d.getHours() - previousTime.getHours()).to.equal(0);
        expect(d.getMinutes() - previousTime.getMinutes()).to.equal(0);
        expect(d.getSeconds() - previousTime.getSeconds()).to.equal(0);

        options.startTime = previousTime.getTime();
        options.repeat = "***";
        schedule = new SchedObj(options);
        currentTime = new Date();
        try {
            Scheduler.__testOnly__.getNextRunTime(schedule);
        } catch (error) {
            expect(error.message).to.equal("Invalid option!");
        }
    });

    it("Should get repeat period", function() {
        var date = new Date();
        // StartTime at the future, nothing has been changed
        var options = {
            "startTime": date.getTime(),
            "dateText" : "11/08/2016",
            "timeText" : "11 : 13 PM",
            "repeat"   : "minute",
            "freq"     : 5,
            "recur"    : 10
        };
        var schedule = new SchedObj(options);
        var period = Scheduler.__testOnly__.getRepeatPeriod(schedule);
        expect(period).to.equal(60);

        options.repeat = "hourly";
        schedule = new SchedObj(options);
        period = Scheduler.__testOnly__.getRepeatPeriod(schedule);
        expect(period).to.equal(3600);

        options.repeat = "daily";
        schedule = new SchedObj(options);
        period = Scheduler.__testOnly__.getRepeatPeriod(schedule);
        expect(period).to.equal(24 * 3600);

        options.repeat = "weekly";
        schedule = new SchedObj(options);
        period = Scheduler.__testOnly__.getRepeatPeriod(schedule);
        expect(period).to.equal(7 * 24 * 3600);

        options.repeat = "biweekly";
        schedule = new SchedObj(options);
        period = Scheduler.__testOnly__.getRepeatPeriod(schedule);
        expect(period).to.equal(14 * 24 * 3600);

        options.repeat = "monthly";
        schedule = new SchedObj(options);
        try {
            period = Scheduler.__testOnly__.getRepeatPeriod(schedule);
        } catch (errorStr) {
            expect(errorStr).to.equal("Not support yet!");
        }

        options.repeat = "***";
        schedule = new SchedObj(options);
        try {
            period = Scheduler.__testOnly__.getRepeatPeriod(schedule);
        } catch (errorStr) {
            expect(errorStr).to.equal("Invalid option!");
        }
    });

    it("Should show Time Helper", function() {
        var showTimeHelper = Scheduler.__testOnly__.showTimeHelper;

        $newScheduleTime = $newScheduleForm.find(".timeSection .time");
        $inputSection = $newScheduleForm.find(".timePicker .inputSection");
        var date = new Date();
        date.setHours(0);
        date.setMinutes(0);
        $newScheduleTime.data("date", date);
        $newScheduleTime.val("00 : 00 AM");

        date.setHours(0);
        showTimeHelper(date, false, false, $newScheduleForm);
        expect($inputSection.find(".hour").val()).to.equal("12");
        expect($inputSection.find(".minute").val()).to.equal("00");
        expect($inputSection.find(".ampm").text()).to.equal("AM");
        expect($newScheduleTime.val()).to.equal("12 : 00 AM");

        date.setHours(11);
        showTimeHelper(date, false, false, $newScheduleForm);
        expect($inputSection.find(".hour").val()).to.equal("11");
        expect($inputSection.find(".minute").val()).to.equal("00");
        expect($inputSection.find(".ampm").text()).to.equal("AM");
        expect($newScheduleTime.val()).to.equal("11 : 00 AM");

        date.setHours(12);
        showTimeHelper(date, false, false, $newScheduleForm);
        expect($inputSection.find(".hour").val()).to.equal("12");
        expect($inputSection.find(".minute").val()).to.equal("00");
        expect($inputSection.find(".ampm").text()).to.equal("PM");
        expect($newScheduleTime.val()).to.equal("12 : 00 PM");

        date.setHours(13);
        showTimeHelper(date, false, false, $newScheduleForm);
        expect($inputSection.find(".hour").val()).to.equal("01");
        expect($inputSection.find(".minute").val()).to.equal("00");
        expect($inputSection.find(".ampm").text()).to.equal("PM");
        expect($newScheduleTime.val()).to.equal("01 : 00 PM");

        date.setMinutes(0);
        showTimeHelper(date, false, false, $newScheduleForm);
        expect($inputSection.find(".hour").val()).to.equal("01");
        expect($inputSection.find(".minute").val()).to.equal("00");
        expect($inputSection.find(".ampm").text()).to.equal("PM");
        expect($newScheduleTime.val()).to.equal("01 : 00 PM");

        date.setMinutes(9);
        showTimeHelper(date, false, false, $newScheduleForm);
        expect($inputSection.find(".hour").val()).to.equal("01");
        expect($inputSection.find(".minute").val()).to.equal("09");
        expect($inputSection.find(".ampm").text()).to.equal("PM");
        expect($newScheduleTime.val()).to.equal("01 : 09 PM");

        date.setMinutes(10);
        showTimeHelper(date, false, false, $newScheduleForm);
        expect($inputSection.find(".hour").val()).to.equal("01");
        expect($inputSection.find(".minute").val()).to.equal("10");
        expect($inputSection.find(".ampm").text()).to.equal("PM");
        expect($newScheduleTime.val()).to.equal("01 : 10 PM");

        date.setMinutes(11);
        showTimeHelper(date, false, false, $newScheduleForm);
        expect($inputSection.find(".hour").val()).to.equal("01");
        expect($inputSection.find(".minute").val()).to.equal("11");
        expect($inputSection.find(".ampm").text()).to.equal("PM");
        expect($newScheduleTime.val()).to.equal("01 : 11 PM");

        date.setMinutes(12);
        showTimeHelper(date, true, true, $newScheduleForm);
        expect($inputSection.find(".hour").val()).to.equal("01");
        expect($inputSection.find(".minute").val()).to.equal("11");
        expect($inputSection.find(".ampm").text()).to.equal("PM");
        expect($newScheduleTime.val()).to.equal("01 : 12 PM");

        date.setMinutes(12);
        showTimeHelper(date, true, false, $newScheduleForm);
        expect($inputSection.find(".hour").val()).to.equal("01");
        expect($inputSection.find(".minute").val()).to.equal("12");
        expect($inputSection.find(".ampm").text()).to.equal("PM");
        expect($newScheduleTime.val()).to.equal("01 : 12 PM");

        date.setHours(14);
        date.setMinutes(13);
        showTimeHelper(date, false, true, $newScheduleForm);
        expect($inputSection.find(".hour").val()).to.equal("02");
        expect($inputSection.find(".minute").val()).to.equal("12");
        expect($inputSection.find(".ampm").text()).to.equal("PM");
        expect($newScheduleTime.val()).to.equal("02 : 13 PM");
    });

    it("Should be able to input time", function() {
        $newScheduleTime = $newScheduleForm.find(".timeSection .time");
        var date = $newScheduleTime.data("date");
        date.setHours(23);
        date.setMinutes(11);
        $newScheduleTime.val("11 : 11 PM");

        var type = "minute";
        var val = -1;
        Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("11 : 11 PM");

        type = "minute";
        val = "fdsajfldsa;jfdl;sa";
        Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("11 : 11 PM");

        type = "minute";
        val = 0;
        Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("11 : 00 PM");

        type = "minute";
        val = 1;
        Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("11 : 01 PM");

        type = "minute";
        val = 59;
        Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("11 : 59 PM");

        type = "hour";
        val = 60;
        Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("11 : 59 PM");

        type = "hour";
        val = -1;
        Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("11 : 59 PM");

        type = "hour";
        val = "fdsajfldsa;jfdl;sa";
        Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("11 : 59 PM");

        type = "hour";
        val = 0;
        Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("11 : 59 PM");

        type = "hour";
        val = 1;
        Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("01 : 59 PM");

        type = "hour";
        val = 12;
        Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("12 : 59 PM");

        type = "hour";
        val = 13;
        Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("12 : 59 PM");

        type = "hour";
        val = 6.5;
        Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("12 : 59 PM");

        type = "hour";
        val = null;
        Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("12 : 59 PM");

        type = "hour";
        val = "";
        Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("12 : 59 PM");

        type = "hour";
        val = 12;
        $newScheduleForm.find(".inputSection .ampm").text("AM");
        Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("12 : 59 AM");

        type = "day";
        try {
            Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
        } catch (error) {
            throw "error case";
        }
        expect($newScheduleTime.val()).to.equal("12 : 59 AM");
    });

    it("Should be able to change time", function() {
        $newScheduleTime = $newScheduleForm.find(".timeSection .time");
        var date = $newScheduleTime.data("date");
        date.setHours(23);
        date.setMinutes(11);
        $newScheduleTime.val("11 : 11 PM");

        var type = "ampm";
        Scheduler.__testOnly__.changeTime(type, true, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("11 : 11 AM");

        type = "ampm";
        Scheduler.__testOnly__.changeTime(type, true, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("11 : 11 PM");

        type = "ampm";
        Scheduler.__testOnly__.changeTime(type, true, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("11 : 11 AM");

        type = "ampm";
        Scheduler.__testOnly__.changeTime(type, true, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("11 : 11 PM");

        type = "minute";
        Scheduler.__testOnly__.changeTime(type, true, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("11 : 12 PM");

        type = "minute";
        Scheduler.__testOnly__.changeTime(type, false, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("11 : 11 PM");

        type = "hour";
        Scheduler.__testOnly__.changeTime(type, true, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("12 : 11 PM");

        type = "hour";
        Scheduler.__testOnly__.changeTime(type, false, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("11 : 11 PM");

        type = "***";
        Scheduler.__testOnly__.changeTime(type, false, $newScheduleForm);
        expect($newScheduleTime.val()).to.equal("11 : 11 PM");
    });

    it("Should be able to use time picker click", function() {
        var $newTimePicker = $("#newScheduler-timePicker");

        $newScheduleTime = $newScheduleForm.find(".timeSection .time");
        var date = $newScheduleTime.data("date");
        date.setHours(23);
        date.setMinutes(11);
        $newScheduleTime.val("11 : 11 PM");

        $newTimePicker.removeClass("hour");
        $newTimePicker.removeClass("minute");

        $newTimePicker.find(".btn.increase.ampm").click();
        expect($newScheduleTime.val()).to.equal("11 : 11 AM");

        $newTimePicker.find(".btn.increase.ampm").click();
        expect($newScheduleTime.val()).to.equal("11 : 11 PM");

        $newTimePicker.find(".btn.increase.ampm").click();
        expect($newScheduleTime.val()).to.equal("11 : 11 AM");

        $newTimePicker.find(".btn.increase.ampm").click();
        expect($newScheduleTime.val()).to.equal("11 : 11 PM");

        $newTimePicker.find(".btn.increase.minute").click();
        expect($newScheduleTime.val()).to.equal("11 : 12 PM");

        $newTimePicker.find(".btn.decrease.minute").click();
        expect($newScheduleTime.val()).to.equal("11 : 11 PM");

        $newTimePicker.find(".btn.increase.hour").click();
        expect($newScheduleTime.val()).to.equal("12 : 11 PM");

        $newTimePicker.find(".btn.decrease.hour").click();
        expect($newScheduleTime.val()).to.equal("11 : 11 PM");
    });

    it("Should be able to use time picker input", function() {
        var $newTimePicker = $("#newScheduler-timePicker");

        $newScheduleTime = $newScheduleForm.find(".timeSection .time");
        var date = $newScheduleTime.data("date");
        date.setHours(23);
        date.setMinutes(11);
        $newScheduleTime.val("11 : 11 PM");

        $newTimePicker.find("input.minute").val(-1);
        $newTimePicker.find("input.minute").trigger("input");
        expect($newScheduleTime.val()).to.equal("11 : 11 PM");

        $newTimePicker.find("input.minute").val("fdsajfldsa;jfdl;sa");
        $newTimePicker.find("input.minute").trigger("input");
        expect($newScheduleTime.val()).to.equal("11 : 11 PM");

        $newTimePicker.find("input.minute").val(0);
        $newTimePicker.find("input.minute").trigger("input");
        expect($newScheduleTime.val()).to.equal("11 : 00 PM");

        $newTimePicker.find("input.minute").val(1);
        $newTimePicker.find("input.minute").trigger("input");
        expect($newScheduleTime.val()).to.equal("11 : 01 PM");

        $newTimePicker.find("input.minute").val(59);
        $newTimePicker.find("input.minute").trigger("input");
        expect($newScheduleTime.val()).to.equal("11 : 59 PM");

        $newTimePicker.find("input.hour").val(60);
        $newTimePicker.find("input.hour").trigger("input");
        expect($newScheduleTime.val()).to.equal("11 : 59 PM");

        $newTimePicker.find("input.hour").val(-1);
        $newTimePicker.find("input.hour").trigger("input");
        expect($newScheduleTime.val()).to.equal("11 : 59 PM");

        $newTimePicker.find("input.hour").val("fdsajfldsa;jfdl;sa");
        $newTimePicker.find("input.hour").trigger("input");
        expect($newScheduleTime.val()).to.equal("11 : 59 PM");

        $newTimePicker.find("input.hour").val(0);
        $newTimePicker.find("input.hour").trigger("input");
        expect($newScheduleTime.val()).to.equal("11 : 59 PM");

        $newTimePicker.find("input.hour").val(1);
        $newTimePicker.find("input.hour").trigger("input");
        expect($newScheduleTime.val()).to.equal("01 : 59 PM");

        $newTimePicker.find("input.hour").val(12);
        $newTimePicker.find("input.hour").trigger("input");
        expect($newScheduleTime.val()).to.equal("12 : 59 PM");

        $newTimePicker.find("input.hour").val(13);
        $newTimePicker.find("input.hour").trigger("input");
        expect($newScheduleTime.val()).to.equal("12 : 59 PM");

        $newTimePicker.find("input.hour").val(6.5);
        $newTimePicker.find("input.hour").trigger("input");
        expect($newScheduleTime.val()).to.equal("12 : 59 PM");

        $newTimePicker.find("input.hour").val(null);
        $newTimePicker.find("input.hour").trigger("input");
        expect($newScheduleTime.val()).to.equal("12 : 59 PM");

        $newTimePicker.find("input.hour").val("");
        $newTimePicker.find("input.hour").trigger("input");
        expect($newScheduleTime.val()).to.equal("12 : 59 PM");

        $newScheduleForm.find(".inputSection .ampm").text("AM");
        $newTimePicker.find("input.hour").val(12);
        $newTimePicker.find("input.hour").trigger("input");
        expect($newScheduleTime.val()).to.equal("12 : 59 AM");
    });
}

function viewRelatedFunctionTest() {
    var $scheduleDetail;
    var $newScheduleForm;
    var $modScheduleForm;
    var $scheduleInfos;
    var $tab;
    var date;
    var dateText;
    var timeText;
    var oldGetRetinaFunc;
    var oldDeleteRetinaFunc;

    before(function() {
        Scheduler.hideScheduleDetailView();
        Scheduler.hideNewScheduleFormView();
        oldGetRetinaFunc = XcalarGetRetina;
        oldDeleteRetinaFunc = XcalarDeleteRetina;

        XcalarGetRetina = function() {
            var fakeRetInfo = {
                "retina": {
                    "retinaDag": {
                        "numNodes": 1,
                        "node"    : [{
                            "name"     : "test",
                            "dagNodeId": "104399",
                        }],
                    },
                    "retinaDesc": {
                        "retinaName": "df1"
                    }
                }
            };
            return PromiseHelper.resolve(fakeRetInfo);
        };

        XcalarDeleteRetina = function() {
            return PromiseHelper.resolve();
        };
    });

    beforeEach(function() {
        $scheduleDetail = $("#scheduleDetail");
        $newScheduleForm = $("#newScheduleForm");
        $modScheduleForm = $("#modifyScheduleForm");
        $scheduleInfos = $("#scheduleInfos");
        $tab = $("#dataflowTab");

        DF.addDataflow("df1", new Dataflow("df1"), null, {
            "isUpload": true,
            "noClick" : true
        });
        Scheduler.setDataFlowName("df1");

        date = new Date();
        date.setDate(date.getDate() + 1);
        date.setHours(23);
        date.setMinutes(13);
        dateText = (date.getMonth() + 1) + "/" +
                    date.getDate() + "/" + date.getFullYear();
        timeText = "11 : 13 PM";
        DF.addScheduleToDataflow("df1", {
            "startTime": date.getTime(), // The time to start the next run
            "dateText" : dateText,
            "timeText" : timeText,
            "repeat"   : "hourly",
            "recur"    : 10,
            "modified" : date.getTime(),
            "created"  : date.getTime()
        });
    });

    it("Should show new schedule form correctly", function() {
        $tab.click();
        $newScheduleForm.show();
        Scheduler.showNewScheduleFormView();
        assert.isTrue($newScheduleForm.is(":visible"));
    });

    it("Should hide New Schedule Form", function() {
        Scheduler.showNewScheduleFormView();
        assert.isTrue($newScheduleForm.is(":visible"));
        Scheduler.hideNewScheduleFormView();
        assert.isFalse($newScheduleForm.is(":visible"));
    });

    it("Should show schedule detail view correctly", function() {
        $newScheduleTime = $newScheduleForm.find(".timeSection .time");
        $inputSection = $newScheduleForm.find(".timePicker .inputSection");
        $scheduleDetail.show();
        assert.isFalse($scheduleDetail.is(":visible"));
        assert.isFalse($scheduleInfos.is(":visible"));
        assert.isFalse($modScheduleForm.is(":visible"));
        Scheduler.showScheduleDetailView();
        assert.isTrue($scheduleDetail.is(":visible"));
        assert.isTrue($scheduleInfos.is(":visible"));
        assert.isTrue($modScheduleForm.is(":visible"));

        assert.equal($scheduleInfos.find(".created .text").text(),
                    dateText + " 11:13 PM");
        assert.equal($scheduleInfos.find(".modified .text").text(),
                    dateText + " 11:13 PM");
        assert.equal($scheduleInfos.find(".frequency .text").text(), "hourly");
        assert.equal($scheduleInfos.find(".recur .text").text(), "10");
        assert.equal($scheduleInfos.find(".lastRunInfo .text").text(), "N/A");
    });

    it("Should hide Schedule Detail View correctly", function() {
        Scheduler.showScheduleDetailView();
        assert.isTrue($scheduleDetail.is(":visible"));
        assert.isTrue($scheduleInfos.is(":visible"));
        assert.isTrue($modScheduleForm.is(":visible"));
        Scheduler.hideScheduleDetailView();
        assert.isFalse($scheduleDetail.is(":visible"));
        assert.isFalse($scheduleInfos.is(":visible"));
        assert.isFalse($modScheduleForm.is(":visible"));
    });

    it("Should reset create New Schedule Form", function() {
        Scheduler.__testOnly__.resetCreateNewScheduleForm();
        assert.isFalse($newScheduleForm.is(":visible"));
        var $timeSection = $newScheduleForm.find(".timeSection");
        var $recurInput = $newScheduleForm.find(".recurSection input");

        assert.equal($timeSection.find(".date").val(), "");
        assert.equal($timeSection.find(".time").val(), "");
        assert.equal($recurInput.val(), "");
    });

    it("Should reset Modified Schedule Form", function() {
        $modScheduleTime = $modScheduleForm.find(".timeSection .time");
        $inputSection = $modScheduleForm.find(".timePicker .inputSection");

        var date2 = new Date();
        date2.setDate(date2.getDate() + 2);
        date2.setHours(14);
        date2.setMinutes(22);
        var dateText2 = (date2.getMonth() + 1) + "/" +
                        date2.getDate() + "/" + date2.getFullYear();
        var timeText2 = "02 : 22 PM";
        var $timeSection = $modScheduleForm.find(".timeSection");
        var $recurInput = $modScheduleForm.find(".recurSection input");

        assert.equal($timeSection.find(".date").val(), dateText);
        assert.equal($timeSection.find(".time").val(), timeText);
        assert.equal($recurInput.val(), 10);

        var schedule = new SchedObj({
            "startTime": date2.getTime(), // The time to start the next run
            "dateText" : dateText2,
            "timeText" : timeText2,
            "repeat"   : "hourly",
            "recur"    : 4,
            "modified" : date2.getTime(),
            "created"  : date2.getTime()
        });
        Scheduler.__testOnly__.resetModifiedScheduleForm(schedule);

        assert.equal($timeSection.find(".date").val(), dateText2);
        assert.equal($timeSection.find(".time").val(), timeText2);
        assert.equal($recurInput.val(), 4);
    });

    it("Should save schedule form", function() {
        var $scheduleDate  = $newScheduleForm.find(".timeSection .date");
        var $scheduleTime  = $newScheduleForm.find(".timeSection .time");
        var $freqSection = $newScheduleForm.find(".frequencySection");
        var $scheduleRecur = $newScheduleForm.find(".recurSection input");

        var date2 = new Date();
        date2.setDate(date2.getDate() + 2);
        date2.setHours(14);
        date2.setMinutes(22);
        var dateText2 = (date2.getMonth() + 1) + "/" +
                        date2.getDate() + "/" + date2.getFullYear();
        var timeText2 = "02 : 22 PM";

        $scheduleRecur.val(4);
        $scheduleDate.val(dateText2);
        $scheduleTime.val("02 : 22 PM");
        $scheduleTime.data("date", date2);
        $freqSection.find(".radioButton[data-option=biweekly]").click();

        var dataflow = DF.getDataflow("df1");
        expect(dataflow.schedule.dateText).to.equal(dateText);
        expect(dataflow.schedule.timeText).to.equal(timeText);
        expect(dataflow.schedule.repeat).to.equal("hourly");
        expect(dataflow.schedule.recur).to.equal(10);

        DF.removeScheduleFromDataflow("df1");
        Scheduler.__testOnly__.saveScheduleForm($newScheduleForm, "df1");

        expect(dataflow.schedule.dateText).to.equal(dateText2);
        expect(dataflow.schedule.timeText).to.equal(timeText2);
        expect(dataflow.schedule.repeat).to.equal("biweekly");
        expect(dataflow.schedule.recur).to.equal(4);
    });

    it("Should fill in schedule detail", function() {
        var date2 = new Date("1/23/2017");
        date2.setHours(20);
        date2.setMinutes(30);
        var schedule = new SchedObj({
            "startTime": date2.getTime(), // The time to start the next run
            "dateText" : "1/23/2017",
            "timeText" : "08 : 30 PM",
            "repeat"   : "monthly",
            "recur"    : 7,
            "modified" : date2.getTime(),
            "created"  : date2.getTime()
        });
        Scheduler.__testOnly__.fillInScheduleDetail(schedule);
        var $scheduleInfos = $("#scheduleInfos");
        assert.equal($scheduleInfos.find(".created .text").text(),
                    "1/23/2017 8:30 PM");
        assert.equal($scheduleInfos.find(".modified .text").text(),
                    "1/23/2017 8:30 PM");
        assert.equal($scheduleInfos.find(".frequency .text").text(), "monthly");
        assert.equal($scheduleInfos.find(".recur .text").text(), "7");
        assert.equal($scheduleInfos.find(".lastRunInfo .text").text(), "N/A");
    });

    it("Should toggle schedule detail Tabs", function() {
        var $scheduleInfos = $("#scheduleInfos");
        var $defaultTab = $scheduleInfos.find(".default");
        var $dfgTab = $scheduleInfos.find(".dfg");

        Scheduler.showScheduleDetailView();
        Scheduler.__testOnly__.schedDetailTabs();
        $defaultTab.click();
        assert.isTrue($scheduleDetail.is(":visible"));
        assert.isTrue($modScheduleForm.is(":visible"));
        $dfgTab.click();
        assert.isTrue($scheduleDetail.is(":visible"));
        assert.isFalse($modScheduleForm.is(":visible"));
    });

    it("Should close new schedule form correctly", function() {
        $newScheduleForm.removeClass("xc-hidden");
        $newScheduleForm.show();
        assert.isTrue($newScheduleForm.is(":visible"));
        $newScheduleForm.find(".close").click();
        assert.isFalse($newScheduleForm.is(":visible"));
    });

    it("Should close schedule detail form correctly", function() {
        $scheduleDetail.removeClass("xc-hidden");
        $scheduleDetail.show();
        assert.isTrue($scheduleDetail.is(":visible"));
        $scheduleDetail.find(".close").click();
        assert.isFalse($scheduleDetail.is(":visible"));
    });

    it("Should save new schedule form by button", function() {
        var $scheduleDate  = $newScheduleForm.find(".timeSection .date");
        var $scheduleTime  = $newScheduleForm.find(".timeSection .time");
        var $freqSection = $newScheduleForm.find(".frequencySection");
        var $scheduleRecur = $newScheduleForm.find(".recurSection input");

        var date2 = new Date();
        date2.setDate(date2.getDate() + 2);
        date2.setHours(14);
        date2.setMinutes(22);
        var dateText2 = (date2.getMonth() + 1) + "/" +
                        date2.getDate() + "/" + date2.getFullYear();
        var timeText2 = "02 : 22 PM";

        $scheduleRecur.val(4);
        $scheduleDate.val(dateText2);
        $scheduleTime.val("02 : 22 PM");
        $scheduleTime.data("date", date2);
        $freqSection.find(".radioButton[data-option=biweekly]").click();

        var dataflow = DF.getDataflow("df1");
        expect(dataflow.schedule.dateText).to.equal(dateText);
        expect(dataflow.schedule.timeText).to.equal(timeText);
        expect(dataflow.schedule.repeat).to.equal("hourly");
        expect(dataflow.schedule.recur).to.equal(10);

        DF.removeScheduleFromDataflow("df1");

        $("#newScheduleForm-save").click();
        assert.isFalse($newScheduleForm.is(":visible"));
        assert.isTrue($scheduleInfos.is(":visible"));
        assert.isTrue($modScheduleForm.is(":visible"));
        assert.isTrue($scheduleDetail.is(":visible"));

        expect(dataflow.schedule.dateText).to.equal(dateText2);
        expect(dataflow.schedule.timeText).to.equal(timeText2);
        expect(dataflow.schedule.repeat).to.equal("biweekly");
        expect(dataflow.schedule.recur).to.equal(4);
    });

    it("Should save mod schedule form by button", function() {
        Scheduler.showScheduleDetailView();
        $modScheduleForm.find(".frequencySection")
        .find(".radioButton[data-option=daily]").click();
        $("#modScheduleForm-save").click();
        var dataflow = DF.getDataflow("df1");
        expect(dataflow.schedule.repeat).to.equal("daily");
    });

    it("Should cancel mod schedule form by button", function() {
        $modScheduleForm.find(".frequencySection")
        .find(".radioButton[data-option=daily]").click();
        $("#modScheduleForm-cancel").click();
        var dataflow = DF.getDataflow("df1");
        expect(dataflow.schedule.repeat).to.equal("hourly");
    });

    it("Should cancel new schedule form by button", function() {
        $("#newScheduleForm-cancel").click();
        assert.isFalse($newScheduleForm.is(":visible"));
        assert.isFalse($modScheduleForm.is(":visible"));
        assert.isFalse($scheduleDetail.is(":visible"));
    });

    afterEach(function() {
        DF.removeDataflow("df1");
    });

    after(function() {
        XcalarGetRetina = oldGetRetinaFunc;
        XcalarDeleteRetina = oldDeleteRetinaFunc;
    });
}
