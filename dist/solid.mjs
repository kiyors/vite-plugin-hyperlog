import { browserLogger, requestLogger as requestLogger$1 } from "./plugin.mjs";
//#region src/solid.ts
function requestLogger(config) {
	return requestLogger$1({
		...config,
		excludeUrls: ["/@solid-refresh", ...config?.excludeUrls || []]
	});
}
//#endregion
export { browserLogger, requestLogger };
