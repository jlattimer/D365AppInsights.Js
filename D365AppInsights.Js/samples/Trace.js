var TestTrace;
(function (TestTrace) {
    function executeTest() {

        // Write to Application Insights traces
        // This is also an example of sending custom dimensions
        D365AppInsights.writeTrace("Test", AI.SeverityLevel.Warning, { myProp: "a value" });


    }
    TestTrace.executeTest = executeTest;
})(TestTrace || (TestTrace = {}));