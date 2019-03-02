# Setup

To enable core logging functionality add a form `OnLoad` handler which calls this function

``` javascript
    D365AppInsights.startLogging
```

Pageview & page load tracking are enabled by default with no additional setup

Copy & paste this JSON string to the function parameter and set values as needed

``` json
{
    "enableDebug": true,
    "disablePageviewTracking": false,
    "percentLoggedPageview": 100,
    "disablePageLoadTimeTracking": false,
    "percentLoggedPageLoadTime": 100,
    "disablePageSaveTimeTracking": false,
    "percentLoggedPageSaveTime": 100,
    "disableExceptionTracking": false,
    "percentLoggedException": 100,
    "disableAjaxTracking": true,
    "maxAjaxCallsPerView": 500,
    "disableTraceTracking": false,
    "percentLoggedTrace": 100,
    "disableDependencyTracking": false,
    "percentLoggedDependency": 100,
    "disableMetricTracking": false,
    "percentLoggedMetric": 100,
    "disableEventTracking": false,
    "percentLoggedEvent": 100
}
```

To enable page save tracking add a form `OnSave` handler which calls this function
This should be at the top of the list of OnSave events

``` javascript
    D365AppInsights.trackSaveTime
```

If page save tracking is enabled during the initialization, an additional OnSave event will be dynamically added to calculate the duration and log the time. By default this will be the last event. If you call the [addOnSave](https://docs.microsoft.com/en-us/dynamics365/customer-engagement/developer/clientapi/reference/formcontext-data-entity/addonsave) event after the initialization that event will now be the last event executed and the save duration logged will nto be accurate.

## Configuration Values

[https://github.com/Microsoft/ApplicationInsights-JS/blob/master/API-reference.md](https://github.com/Microsoft/ApplicationInsights-JS/blob/master/API-reference.md)

``` json
{
    "enableDebug": false,  //Turns on/off built in AI debug mode - default = false
    "disablePageviewTracking": false, //Turns on/off Pageview tracking - default = false
    "percentLoggedPageview": 100, //Percentage of Pageviews logged - default = 100
    "disablePageLoadTimeTracking": false, //Turns on/off metric recording page load duration - default = false
    "percentLoggedPageLoadTime": 100, //Percentage of page load durations logged - default = 100
    "disablePageSaveTimeTracking": false, //Turns on/off metric recording page save duration - default = false
    "percentLoggedPageSaveTime": 100, //Percentage of page save durations logged - default = 100
    "disableExceptionTracking": false, //Turns on/off built in AI exception tracking and custom implementation - default = false
    "percentLoggedException": 100, //Percentage of exceptions logged - default = 100
    "disableAjaxTracking": true, //Turns on/off built in AI request tracking which logs all Ajax requests - default = true
    "maxAjaxCallsPerView": 500, //The max number of requests logged using the built in tracking - default = 100
    "disableTraceTracking": false, //Turns on/off custom implementation of trace tracking - default = false
    "percentLoggedTrace": 100, //Percentage of traces logged - default = 100
    "disableDependencyTracking": false, //Turns on/off custom implementation of manual dependency tracking - default = false
    "percentLoggedDependency": 100, //Percentage of manual dependencies logged - default = 100
    "disableMetricTracking": false, //Turns on/off custom implementation of metric tracking - default = false
    "percentLoggedMetric": 100, //Percentage of metrics logged - default = 100
    "disableEventTracking": false, //Turns on/off custom implementation of event tracking - default = false
    "percentLoggedEvent": 100 //Percentage of events logged - default = 100
}
```