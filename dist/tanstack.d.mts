import { RequestLoggerConfig, browserLogger } from "./plugin.mjs";
import { Plugin } from "vite";
//#region src/tanstack.d.ts
declare function requestLogger(config?: RequestLoggerConfig): Plugin;
//#endregion
export { browserLogger, requestLogger };