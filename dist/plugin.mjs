import { a as import_vite_plugin_logger, c as requestLogger, d as formatPayload, f as parseServerFnArgs, i as createFrameworkLogger, l as getServerFunctionOverlayScript, n as browserLogger, o as logRouteEvent, p as parseServerFnResult, r as browserLoggerScriptSrc, s as logger, t as attachRouteEndpoint, u as detectServerFunction } from "./plugin-shared.mjs";
var isModuleRequest = import_vite_plugin_logger.isModuleRequest;
var matchesExclusion = import_vite_plugin_logger.matchesExclusion;
var remapSourcePosition = import_vite_plugin_logger.remapSourcePosition;
var remapStackTrace = import_vite_plugin_logger.remapStackTrace;
var shouldExcludeRequest = import_vite_plugin_logger.shouldExcludeRequest;
export { attachRouteEndpoint, browserLogger, browserLoggerScriptSrc, createFrameworkLogger, logger as default, logger, detectServerFunction, formatPayload, getServerFunctionOverlayScript, isModuleRequest, logRouteEvent, matchesExclusion, parseServerFnArgs, parseServerFnResult, remapSourcePosition, remapStackTrace, requestLogger, shouldExcludeRequest };
