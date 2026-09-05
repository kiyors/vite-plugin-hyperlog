import { browserLogger, createFrameworkLogger } from "./plugin.mjs";
//#region src/solid.ts
const { requestLogger, logger } = createFrameworkLogger("/@solid-refresh");
//#endregion
export { browserLogger, logger as default, logger, requestLogger };
