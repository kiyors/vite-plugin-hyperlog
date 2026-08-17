import { RequestLoggerConfig, browserLogger } from "./plugin.mjs";
import { Plugin } from "vite";
//#region src/lib/vue.d.ts
declare function requestLogger(config?: RequestLoggerConfig): Plugin;
//#endregion
export { browserLogger, requestLogger };