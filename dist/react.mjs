import { browserLogger, requestLogger as requestLogger$1 } from "./plugin.mjs";
//#region src/lib/react.ts
function requestLogger(config) {
	return requestLogger$1({
		...config,
		excludeUrls: ["/@react-refresh", ...config?.excludeUrls || []]
	});
}
//#endregion
export { browserLogger, requestLogger };
