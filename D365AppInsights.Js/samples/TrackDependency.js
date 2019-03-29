var TestTrackDependency;
(function (TestTrackDependency) {
    function executeTest() {
        var req = new XMLHttpRequest();
        req.open("GET", "https://httpbin.org/delay/2?test=1", true);
        req.setRequestHeader("Accept", "application/json");
        req.onreadystatechange = function () {
            if (this.readyState === 4) {
                req.onreadystatechange = null;
                if (this.status === 200) {
                    var result = JSON.parse(this.response);
                }
                else {
                    console.log(this.statusText);
                }
            }
        };


        // Write to Application Insights dependencies
        D365AppInsights.trackDependencyTime(req, "DependencyTest");
        req.send();


    }
    TestTrackDependency.executeTest = executeTest;
})(TestTrackDependency || (TestTrackDependency = {}));