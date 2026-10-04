import { i as createFrameworkLogger, n as browserLogger } from "./plugin-shared.mjs";
//#region src/solid.ts
const { requestLogger, logger } = createFrameworkLogger("/@solid-refresh");
//#endregion
export { browserLogger, logger as default, logger, requestLogger };
