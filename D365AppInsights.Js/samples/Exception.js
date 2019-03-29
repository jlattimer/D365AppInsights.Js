var TestException;
(function (TestException) {
    function executeTest() {
        try {
            doSomethingNotDefined();
        }
        catch (e) {


            // Write to Application Insights exceptions
            D365AppInsights.writeException(e, "ExceptionTest", AI.SeverityLevel.Error, null, null);


        }
    }
    TestException.executeTest = executeTest;
    function unhandledExceptionTest() {
        doSomethingElseNotDefined();
    }
})(TestException || (TestException = {}));