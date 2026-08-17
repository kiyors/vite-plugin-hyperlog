import { browserLogger, requestLogger as requestLogger$1 } from "./plugin.mjs";
//#region src/lib/tanstack.ts
function requestLogger(config) {
	return requestLogger$1({
		...config,
		excludeUrls: [...config?.excludeUrls || []]
	});
}
//#endregion
export { browserLogger, requestLogger };
