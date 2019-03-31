/// <reference path="node_modules/@types/xrm/index.d.ts" />
/// <reference path="scripts/ai.1.0.20-build00666.d.ts" />

namespace D365AppInsights {
    let props: object = {};
    let enableDebug: boolean = false;
    let disablePageviewTracking: boolean = false;
    let percentLoggedPageview: number = 100;
    let disablePageLoadTimeTracking: boolean = false;
    let percentLoggedPageLoadTime: number = 100;
    let disablePageSaveTimeTracking: boolean = false;
    let percentLoggedPageSaveTime: number = 100;
    let disableTraceTracking: boolean = false;
    let percentLoggedTrace: number = 100;
    let disableExceptionTracking: boolean = false;
    let percentLoggedException: number = 100;
    let disableDependencyTracking: boolean = false;
    let percentLoggedDependency: number = 100;
    let disableMetricTracking: boolean = false;
    let percentLoggedMetric: number = 100;
    let disableEventTracking: boolean = false;
    let percentLoggedEvent: number = 100;
    let targetPage: any = window;
    let pageSaveEventAdded = false;

    /**
     * Configures and enables logging to Application Insights. Must send both executionContext and config or just config.
     * @param   {any} [executionContext] Form execution context
     * @param   {any} [config] The configuration JSON 
     */
    export function startLogging(executionContext: any, config?: any) {
        if ((window as any).appInsights.config.instrumentationKey === "Your AI Instrumentation Key" ||
            !isGuid((window as any).appInsights.config.instrumentationKey)) {
            console.error(`ERROR: Application Insights Instrumentation Key was not updated or has an invalid value - in the code search for 'Your AI Instrumentation Key' and replace it with your key`);
            return;
        }

        if (arguments.length === 1) {
            config = executionContext;
            executionContext = null;
        }

        let contextValues: any = getContextValues(executionContext)

        if (config)
            setConfigOptions(config, contextValues.formContext);

        // Capture PageView start
        let pageViewStart: number;
        if (!disablePageviewTracking)
            pageViewStart = performance.now();

        if (/ClientApiWrapper\.aspx/i.test(window.location.pathname)) {
            targetPage = window.parent;
            if (enableDebug)
                console.log("DEBUG: Application Insights page target: window.parent");
        }

        let formName: string = contextValues.formName;
        props["entityId"] = contextValues.entityId;
        props["entityName"] = contextValues.entityName;
        props["formType"] = contextValues.formType;
        props["orgName"] = contextValues.orgName;
        props["orgVersion"] = contextValues.orgVersion;
        props["formName"] = formName;
        props["source"] = "JavaScript";

        setTelemetryInitializer();

        (window as any).appInsights.setAuthenticatedUserContext(contextValues.userId, null, false);

        writePageLoadMetric();

        // Custom implementation of Pageview to avoid duplicate events being 
        // recorded likely due to CRM/D365 already implementing AI which currently
        // has poor support for multiple AI accounts
        if (log("PageviewTracking", disablePageviewTracking, percentLoggedPageview)) {
            (window as any).addEventListener("beforeunload",
                () => {
                    const envelope: any = createPageViewEnvelope(formName, pageViewStart, props);

                    if (navigator.sendBeacon) {
                        navigator.sendBeacon((window as any).appInsights.config.endpointUrl, JSON.stringify(envelope));
                        if (enableDebug)
                            console.log("DEBUG: Application Insights logged Pageview via Beacon");
                    } else {
                        // IE doesn't support Beacon - use sync XHR w/ delay instead
                        // Need slight delay to ensure PageView gets sent
                        let waitMs: number = 100; // Milliseconds wait
                        let futureTime: number = (new Date()).getTime() + waitMs;

                        sendPageViewRequest(envelope);

                        // Delay
                        while ((new Date()).getTime() < futureTime) { }
                    }
                },
                false);
        }
    }

    /**
     * Starts the process of tracking the time it takes to save a record.
     */
    export function trackSaveTime() {
        if (disablePageSaveTimeTracking)
            return;

        clearPerformanceEntries()
        targetPage.performance.mark("PageSave-Start");
        if (enableDebug)
            console.log(`DEBUG: Application Insights started timing PageSave`);
    }

    /**
     * Writes the page save metric to Application Insights.
     * @param   {any} executionContext Form execution context
     */
    export function writePageSaveMetric(executionContext) {
        if (!log("PageSaveTime", disablePageSaveTimeTracking, percentLoggedPageSaveTime))
            return;

        if (!executionContext)
            throw (`ERROR: Did you forget to check 'Pass execution context as first parameter in the OnSave event?'`);

        targetPage.performance.mark("PageSave-End");
        if (enableDebug)
            console.log(`DEBUG: Application Insights ended timing PageSave`);

        targetPage.performance.measure(
            "PageSaveMetric",
            "PageSave-Start",
            "PageSave-End"
        );

        let measures: any = targetPage.performance.getEntriesByName("PageSaveMetric", "measure");
        let measure: any = measures[0];
        let saveMode: number = executionContext.getEventArgs().getSaveMode();
        let duration: number = Math.round(measure.duration);

        writeMetric("PageSave", duration, 1, null, null, { saveMode: getSaveModeName(saveMode) });
        if (enableDebug)
            console.log(`DEBUG: Application Insights logged metric: PageSave time: ${duration}ms`);

        clearPerformanceEntries()
    }

    /**
     * Writes an event message to Application Insights.
     * @param   {string} name The event name
     * @param   {any} [newProps] Additional properties as object - { key: value }
     * @param   {any} [measurements] The associated measurements as object - { key: value }
     */
    export function writeEvent(name: string, newProps: any, measurements: any) {
        if (!log("Event", disableEventTracking, percentLoggedEvent))
            return;

        (window as any).appInsights.trackEvent(name, newProps, measurements);
        if (enableDebug)
            console.log(`DEBUG: Application Insights logged event: ${name}`);
    }

    /**
     * Writes a metric message to Application Insights.
     * @param   {string} name The metric name
     * @param   {number} value The metric value
     * @param   {number} [sampleCount] The count of metrics being logged (default = 1)
     * @param   {number} [min] The minimum value of metrics being logged (default = value)
     * @param   {number} [max] The maximum value of metrics being logged (default = value)
     * @param   {any} [newProps] Additional properties as object - { key: value }
     */
    export function writeMetric(name: string, value: number, sampleCount?: number, min?: number, max?: number, newProps?: any) {
        if (!log("Metric", disableMetricTracking, percentLoggedMetric))
            return;

        if (!sampleCount)
            sampleCount = 1;

        if (!min)
            min = value;

        if (!max)
            max = value;

        (window as any).appInsights.trackMetric(name, value, sampleCount, min, max, newProps);
        if (enableDebug)
            console.log(`DEBUG: Application Insights logged metric: ${name}`);
    }

    /**
     * Writes exception data to Application Insights.
     * @param   {Error} exception The exception being logged
     * @param   {string} [handledAt] The location the exception
     * @param   {AI.SeverityLevel} [severityLevel] The severity level (default = Error)
     * @param   {any} [newProps] Additional properties as object - { key: value }
     * @param   {any} [measurements] The associated measurements as object - { key: value }
     */
    export function writeException(exception: Error, handledAt?: string, severityLevel?: AI.SeverityLevel, newProps?: any, measurements?: any) {
        if (!log("Exception", disableExceptionTracking, percentLoggedException))
            return;

        if (!severityLevel)
            severityLevel = AI.SeverityLevel.Error;

        (window as any).appInsights.trackException(exception, handledAt, newProps, measurements, severityLevel);
        if (enableDebug)
            console.log(`DEBUG: Application Insights logged exception: ${exception.name}`);
    }

    /**
     * Writes a trace message to Application Insights.
     * @param   {string} message The trace message
     * @param   {AI.SeverityLevel} [severityLevel] The severity level (default = Information)
     * @param   {any} [newProps] Additional properties as object - { key: value }
     */
    export function writeTrace(message: string, severityLevel?: AI.SeverityLevel, newProps?: any) {
        if (!log("Trace", disableTraceTracking, percentLoggedTrace))
            return;

        if (!severityLevel)
            severityLevel = AI.SeverityLevel.Information;

        (window as any).appInsights.trackTrace(message, newProps, severityLevel);
        if (enableDebug)
            console.log(`DEBUG: Application Insights logged trace: ${message}`);
    }

    /**
     * Writes a dependency message to Application Insights.
     * @param   {string} name The dependency name or absolute URL
     * @param   {string} method The HTTP method (only logged with URL)
     * @param   {number} duration The duration in ms of the dependent event
     * @param   {boolean} success Set to true if the dependent event was successful, false otherwise
     * @param   {number} resultCode The result code, HTTP or otherwise
     * @param   {string} pathName The path part of the absolute URL (default = determined from name)
     * @param   {any} [newProps] Additional properties as object - { key: value }
     */
    export function writeDependency(name: string, method: string, duration: number, success: boolean, resultCode: number, pathName?: string, newProps?: any) {
        if (!log("Dependency", disableDependencyTracking, percentLoggedDependency))
            return;

        const id: string = Microsoft.ApplicationInsights.Util.newId();
        if (!pathName) {
            if (isUrl(name))
                pathName = getUrlPath(name);
        }

        (window as any).appInsights.trackDependency(id, method, name, pathName, duration, success, resultCode, newProps, null);
        if (enableDebug)
            console.log(`DEBUG: Application Insights logged dependency: ${id}: ${duration}`);
    }

    /**
     * Writes a metric message logging method execution duration to Application Insights.
     * @param   {string} methodName The method name
     * @param   {number} start The start time using performance.now()
     * @param   {number} end The end time using performance.now()
     */
    export function writeMethodTime(methodName: string, start: number, end: number) {
        const time: number = end - start;
        writeMetric(`Method Time: ${methodName}`, time, null, null, null);
        if (enableDebug)
            console.log(`DEBUG: Application Insights logged method time: ${methodName}: ${time}ms`);
    }

    /**
     * Attaches to a XHR request and writes a dependency message to Application Insights.
     * @param   {string} methodName The method name
     * @param   {number} start The start time using performance.now()
     * @param   {number} end The end time using performance.now()
     */
    export function trackDependencyTime(req: any, methodName: string) {
        // ReSharper disable once Html.EventNotResolved
        req.addEventListener("loadstart", () => {
            getStartTime(req, methodName);
        });

        req.addEventListener("load", () => {
            getEndTime(req, true);
        });

        req.addEventListener("error", () => {
            getEndTime(req, false);
        });
    }

    function setTelemetryInitializer() {
        (window as any).appInsights.context.addTelemetryInitializer(envelope => {
            const telemetryItem = envelope.data.baseData;
            // Add CRM specific properties to every request
            telemetryItem.properties = combineProps(telemetryItem.properties, props);
            if (enableDebug)
                console.log("DEBUG: Added telemetry initializer");
        });
    }

    function getContextValues(executionContext: any): any {
        let contextValues = {};

        if (executionContext && isDefined(executionContext.getFormContext)) {
            let formContext: any = executionContext.getFormContext();
            contextValues["formName"] = formContext.ui.formSelector.getCurrentItem().getLabel();
            contextValues["entityId"] = formContext.data.entity.getId().replace(/[{}]/g, "");
            contextValues["entityName"] = formContext.data.entity.getEntityName();
            contextValues["formType"] = getFormTypeName(formContext.ui.getFormType());
            contextValues["orgName"] = Xrm.Utility.getGlobalContext().organizationSettings.uniqueName;
            contextValues["orgVersion"] = Xrm.Utility.getGlobalContext().getVersion();
            contextValues["userId"] = Xrm.Utility.getGlobalContext().userSettings.userId.replace(/[{}]/g, "");
            contextValues["formContext"] = formContext;
            return contextValues;
        }
        else if (isDefined(Xrm.Page)) {
            contextValues["formName"] = Xrm.Page.ui.formSelector.getCurrentItem().getLabel();
            contextValues["entityId"] = Xrm.Page.data.entity.getId().replace(/[{}]/g, "");
            contextValues["entityName"] = Xrm.Page.data.entity.getEntityName();
            contextValues["formType"] = getFormTypeName(Xrm.Page.ui.getFormType());
            contextValues["orgName"] = Xrm.Page.context.getOrgUniqueName();
            contextValues["orgVersion"] = Xrm.Page.context.getVersion();
            contextValues["userId"] = Xrm.Page.context.getUserId().replace(/[{}]/g, "");
            contextValues["formContext"] = null;
            return contextValues;
        }
        else {
            throw (`ERROR: Did you forget to check 'Pass execution context as first parameter in the OnLoad event?'`);
        }
    }

    function setConfigOptions(config: any, formContext: any) {
        try {
            if (config.hasOwnProperty("enableDebug")) { //default false
                enableDebug = config.enableDebug;
                (window as any).appInsights.config.enableDebug = config.enableDebug;
            }

            if (config.hasOwnProperty("disablePageviewTracking")) //default false
                disablePageviewTracking = config.disablePageviewTracking;

            if (config.hasOwnProperty("percentLoggedPageview")) //default 100
                percentLoggedPageview = getLogPercent(config.percentLoggedPageview);

            if (config.hasOwnProperty("disablePageLoadTimeTracking")) //default false
                disablePageLoadTimeTracking = config.disablePageLoadTimeTracking;

            if (config.hasOwnProperty("percentLoggedPageLoadTime")) //default 100
                percentLoggedPageLoadTime = getLogPercent(config.percentLoggedPageLoadTime);

            if (config.hasOwnProperty("disablePageSaveTimeTracking")) { //default false
                disablePageSaveTimeTracking = config.disablePageSaveTimeTracking;
                if (!disablePageSaveTimeTracking)
                    addPageSaveHandler(formContext);
            }

            if (config.hasOwnProperty("percentLoggedPageSaveTime")) //default 100
                percentLoggedPageSaveTime = getLogPercent(config.percentLoggedPageSaveTime);

            if (config.hasOwnProperty("disableExceptionTracking")) { //default false
                disableExceptionTracking = config.disableExceptionTracking;
                (window as any).appInsights.config.disableExceptionTracking = config.disableExceptionTracking;
            }

            if (config.hasOwnProperty("percentLoggedException")) //default 100
                percentLoggedException = getLogPercent(config.percentLoggedException);

            if (config.hasOwnProperty("disableAjaxTracking")) //default false
                (window as any).appInsights.config.disableAjaxTracking = config.disableAjaxTracking;

            if (config.hasOwnProperty("maxAjaxCallsPerView")) //default 500, -1 = all
                (window as any).appInsights.config.maxAjaxCallsPerView = config.maxAjaxCallsPerView;

            if (config.hasOwnProperty("disableTraceTracking")) { //default false
                disableTraceTracking = config.disableTraceTracking;
                (window as any).appInsights.config.disableTraceTracking = config.disableTraceTracking;
            }

            if (config.hasOwnProperty("percentLoggedTrace")) //default 100
                percentLoggedTrace = getLogPercent(config.percentLoggedTrace);

            if (config.hasOwnProperty("disableDependencyTracking")) { //default false
                disableDependencyTracking = config.disableDependencyTracking;
                (window as any).appInsights.config.disableDependencyTracking = config.disableDependencyTracking;
            }

            if (config.hasOwnProperty("percentLoggedDependency")) //default 100
                percentLoggedDependency = getLogPercent(config.percentLoggedDependency);

            if (config.hasOwnProperty("disableMetricTracking")) { //default false
                disableMetricTracking = config.disableMetricTracking;
                (window as any).appInsights.config.disableMetricTracking = config.disableMetricTracking;
            }

            if (config.hasOwnProperty("percentLoggedMetric")) //default 100
                percentLoggedMetric = getLogPercent(config.percentLoggedMetric);

            if (config.hasOwnProperty("disableEventTracking")) { //default false
                disableEventTracking = config.disableEventTracking;
                (window as any).appInsights.config.disableEventTracking = config.disableEventTracking;
            }

            if (config.hasOwnProperty("percentLoggedEvent")) //default 100
                percentLoggedEvent = getLogPercent(config.percentLoggedEvent);

            if (enableDebug) {
                console.log("D365 Application Insights configuration:");
                console.log(`enableDebug: ${enableDebug}`);
                console.log(`disablePageviewTracking: ${disablePageviewTracking}`);
                console.log(`percentLoggedPageview: ${percentLoggedPageview}`);
                console.log(`disablePageLoadTimeTracking: ${disablePageLoadTimeTracking}`);
                console.log(`percentLoggedPageLoadTime: ${percentLoggedPageLoadTime}`);
                console.log(`disablePageSaveTimeTracking: ${disablePageSaveTimeTracking}`);
                console.log(`percentLoggedPageSaveTime: ${percentLoggedPageSaveTime}`);
                console.log(`disableExceptionTracking: ${disableExceptionTracking}`);
                console.log(`percentLoggedException: ${percentLoggedException}`);
                console.log(`disableAjaxTracking: ${(window as any).appInsights.config.disableAjaxTracking}`);
                console.log(`maxAjaxCallsPerView: ${(window as any).appInsights.config.maxAjaxCallsPerView}`);
                console.log(`disableTraceTracking: ${disableTraceTracking}`);
                console.log(`percentLoggedTrace: ${percentLoggedTrace}`);
                console.log(`disableDependencyTracking: ${disableDependencyTracking}`);
                console.log(`percentLoggedDependency: ${percentLoggedDependency}`);
                console.log(`disableMetricTracking: ${disableMetricTracking}`);
                console.log(`percentLoggedMetric: ${percentLoggedMetric}`);
                console.log(`disableEventTracking: ${disableEventTracking}`);
                console.log(`percentLoggedEvent: ${percentLoggedEvent}`);
            }

        } catch (error) {
            console.log(`ERROR: Application Insights error parsing configuration parameters: ${error}`);
        }
    }

    function addPageSaveHandler(formContext?: any) {
        if (disablePageSaveTimeTracking || pageSaveEventAdded)
            return;

        if (formContext)
            formContext.data.entity.addOnSave(D365AppInsights.writePageSaveMetric);
        else
            Xrm.Page.data.entity.addOnSave(D365AppInsights.writePageSaveMetric);
        pageSaveEventAdded = true;
    }

    function clearPerformanceEntries() {
        targetPage.performance.clearMarks();
        targetPage.performance.clearMeasures();
    }

    function writePageLoadMetric() {
        if (!log("PageLoadTime", disablePageLoadTimeTracking, percentLoggedPageLoadTime))
            return;

        if (isNaN(targetPage.performance.timing.loadEventEnd) || isNaN(targetPage.performance.timing.responseEnd) ||
            targetPage.performance.timing.loadEventEnd === 0 || targetPage.performance.timing.responseEnd === 0) {
            setTimeout(() => {
                writePageLoadMetric();
            }, 50);
        } else {
            const pageLoad = targetPage.performance.timing.loadEventEnd - targetPage.performance.timing.responseEnd;

            writeMetric("PageLoad", pageLoad, 1, null, null, null);
            if (enableDebug)
                console.log(`DEBUG: Application Insights logged metric: PageLoad time: ${pageLoad}ms`);
        }
    }

    function getStartTime(req: any, methodName: string) {
        req.t0 = performance.now();
        req.methodName = methodName;
    }

    function getEndTime(req: any, success: boolean) {
        const duration = performance.now() - req.t0;
        writeDependency(req._method, req._url, duration, success, req.status, `${req._url}`,
            { methodName: req.methodName, mode: getMode(req._async) });
    }

    function combineProps(props: any, newProps: any) {
        if (!props && !newProps)
            return null;
        if (!newProps)
            return props;
        if (!props)
            return newProps;

        for (let attrname in newProps) {
            if (newProps.hasOwnProperty(attrname))
                props[attrname] = newProps[attrname];
        }

        return props;
    }

    function getIdFromCookie(cookieName: string) {
        const cookie = Microsoft.ApplicationInsights.Util.getCookie(cookieName);
        if (!cookie)
            return null;
        const params: string[] = cookie.split(Microsoft.ApplicationInsights.Context.User.cookieSeparator);
        if (params.length < 1)
            return null;

        return params[0];
    }

    function isUrl(name: string): boolean {
        return /^[a-z][a-z0-9+.-]*:/.test(name);
    }

    function getUrlPath(url: string): string {
        const urlElem: any = document.createElement("a");
        urlElem.href = url;

        return urlElem.pathname;
    }

    function sendPageViewRequest(envelope: Microsoft.Telemetry.Envelope): void {
        let req: any = new XMLHttpRequest();
        req.open("POST", (window as any).appInsights.config.endpointUrl, false); // Doesn't work if async
        req.setRequestHeader("Accept", "*/*");
        req.setRequestHeader("Content-Type", "application/json");
        req.onreadystatechange = () => {
            if (req.readyState === 4) {
                if (req.status === 200) {
                    if (enableDebug)
                        console.log("DEBUG: Application Insights logged Pageview via XHR22");
                }
            }
        }
        req.send(JSON.stringify(envelope));
    }

    function createPageViewEnvelope(formName: string, pageViewStart: number, props: object): Microsoft.Telemetry.Envelope {
        let iKey: string = (window as any).appInsights.config.instrumentationKey;
        let envelope: Microsoft.Telemetry.Envelope = new Microsoft.Telemetry.Envelope;
        envelope.time = new Date().toISOString();
        envelope.iKey = iKey;
        envelope.name = `Microsoft.ApplicationInsights.${iKey.replace("-", "")}.Pageview`;

        envelope.data = { baseType: "PageviewData" };
        envelope.tags["ai.session.id"] = getIdFromCookie("ai_session");
        envelope.tags["ai.device.id"] = (window as any).appInsights.context.device.id;
        envelope.tags["ai.device.type"] = (window as any).appInsights.context.device.type;
        envelope.tags["ai.internal.sdkVersion"] = (window as any).appInsights.context.internal.sdkVersion;
        envelope.tags["ai.user.id"] = getIdFromCookie(Microsoft.ApplicationInsights.Context.User.userCookieName);
        envelope.tags["ai.user.authUserId"] = (window as any).appInsights.context.user.authenticatedId.toUpperCase();
        envelope.tags["ai.operation.id"] = (window as any).appInsights.context.operation.id;
        envelope.tags["ai.operation.name"] = (window as any).appInsights.context.operation.name;
        envelope.data.baseType = "PageviewData";
        let pageViewData: AI.PageViewData = new AI.PageViewData;
        pageViewData.ver = 2;
        pageViewData.name = formName;
        pageViewData.url = Microsoft.ApplicationInsights.Telemetry.Common.DataSanitizer.sanitizeUrl((window as any).location.href);
        let d: number = performance.now() - pageViewStart;
        pageViewData.duration = Microsoft.ApplicationInsights.Util.msToTimeSpan(d);
        envelope.data["baseData"] = pageViewData;
        envelope.data["baseData"]["properties"] = Microsoft.ApplicationInsights.Telemetry.Common.DataSanitizer.sanitizeProperties(props);
        envelope.data["baseData"]["measurements"] = null;
        envelope.data["baseData"]["id"] = Microsoft.ApplicationInsights.Util.newId();

        return envelope;
    }

    function getFormTypeName(formType: number): string {
        switch (formType) {
            case 1:
                return "Create";
            case 2:
                return "Update";
            case 3:
                return "Read Only";
            case 4:
                return "Disabled";
            case 6:
                return "Bulk Edit";
            default:
                return "Undefined";
        }
    }

    function getSaveModeName(saveMode: number): string {
        switch (saveMode) {
            case 1:
                return "Save";
            case 2:
                return "Save and Close";
            case 5:
                return "Deactivate";
            case 6:
                return "Reactivate";
            case 7:
                return "Send";
            case 15:
                return "Disqualify";
            case 16:
                return "Qualify";
            case 47:
                return "Assign";
            case 58:
                return "Save as Completed";
            case 59:
                return "Save and New";
            case 70:
                return "Auto Save";
            default:
                return "Undefined";
        }
    }

    function getMode(mode: boolean): string {
        return (mode) ? "Asynchronous" : "Synchronous";
    }

    function getLogPercent(value: any): number {
        if (isNaN(value)) {
            if (enableDebug)
                console.log(`DEBUG: Log percent: ${value} is not a number`);
            return 100;
        }

        let x: number = parseFloat(value);
        x = Math.round(x);

        if (x < 1)
            return 0;
        if (x > 100)
            return 100;
        return x;
    }

    function log(type: string, disable: boolean, threshold: number): boolean {
        if (disable) {
            if (enableDebug)
                console.log(`DEBUG: Application Insights ${type} not written: Disabled`);
            return false;
        }

        const shouldLog = inLogThreshold(threshold);
        if (!shouldLog) {
            if (enableDebug)
                console.log(`DEBUG: Application Insights ${type} not written: Threshold%: ${threshold}`);
            return false;
        }

        return true;
    }

    function inLogThreshold(threshold: number): boolean {
        if (threshold === 100)
            return true;
        if (threshold === 0)
            return false;

        const number: number = Math.floor(Math.random() * (101));
        return number <= threshold;
    }

    function isDefined<T>(a: T | null | undefined): a is T {
        return a !== null && a !== undefined;
    }

    function isGuid(stringToTest) {
        if (stringToTest[0] === "{") {
            stringToTest = stringToTest.substring(1, stringToTest.length - 1);
        }
        const regexGuid: any = /^(\{){0,1}[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}(\}){0,1}$/gi;
        return regexGuid.test(stringToTest);
    }

    let xhrProto: any = XMLHttpRequest.prototype,
        origOpen = xhrProto.open;

    xhrProto.open = <{
        (method: string, url: string): void;
        (method: string, url: string, async: boolean, username?: string, password?: string): void
    }>(function (method, url, async) {
        this._url = url;
        this._method = method;
        this._async = async;
        return origOpen.apply(this, arguments);
    });
}