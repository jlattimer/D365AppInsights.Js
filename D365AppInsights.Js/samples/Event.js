var TestEvent;
(function (TestEvent) {
    function executeTest() {


        // Write to Application Insights custom events
        // This is also an example of sending custom measurements
        D365AppInsights.writeEvent("Button Click", null, { click: 1 });


    }
    TestEvent.executeTest = executeTest;
})(TestEvent || (TestEvent = {}));