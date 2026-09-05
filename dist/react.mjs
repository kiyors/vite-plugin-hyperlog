import { browserLogger, createFrameworkLogger } from "./plugin.mjs";
//#region src/react.ts
const { requestLogger, logger } = createFrameworkLogger("/@react-refresh");
//#endregion
export { browserLogger, logger as default, logger, requestLogger };
