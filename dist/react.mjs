import { i as createFrameworkLogger, n as browserLogger } from "./plugin-shared.mjs";
//#region src/react.ts
const { requestLogger, logger } = createFrameworkLogger("/@react-refresh");
//#endregion
export { browserLogger, logger as default, logger, requestLogger };
