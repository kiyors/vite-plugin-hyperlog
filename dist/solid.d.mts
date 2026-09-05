import { n as RequestLoggerConfig, r as browserLogger } from "./plugin-DwLV3Bnh.mjs";
import { Plugin } from "vite";
//#region src/solid.d.ts
declare function requestLogger(config?: RequestLoggerConfig): Plugin;
//#endregion
export { browserLogger, requestLogger };