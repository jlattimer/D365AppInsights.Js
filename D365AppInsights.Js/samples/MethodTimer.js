var TestMethodTimer;
(function (TestMethodTimer) {
    var iterations = 50;
    var multiplier = 1000000000;
    function executeTest() {
        var t = performance.now();
        try {
            var primes = calculatePrimes(iterations, multiplier);
            console.log(primes);
        }
        finally {


            // Write to Application Insights custom metrics
            D365AppInsights.writeMethodTime("TestMethod", t, performance.now());


        }
    }
    TestMethodTimer.executeTest = executeTest;
    function calculatePrimes(iterations, multiplier) {
        var primes = [];
        for (var i = 0; i < iterations; i++) {
            var candidate = i * (multiplier * Math.random());
            var isPrime = true;
            for (var c = 2; c <= Math.sqrt(candidate); ++c) {
                if (candidate % c === 0) {
                    // not prime
                    isPrime = false;
                    break;
                }
            }
            if (isPrime) {
                primes.push(candidate);
            }
        }
        return primes;
    }
})(TestMethodTimer || (TestMethodTimer = {}));