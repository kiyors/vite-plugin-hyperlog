import { i as browserLogger, o as createFrameworkLogger } from "./plugin-shared.mjs";
//#region src/react.ts
const { requestLogger, logger } = createFrameworkLogger("/@react-refresh");
//#endregion
export { browserLogger, logger as default, logger, requestLogger };
