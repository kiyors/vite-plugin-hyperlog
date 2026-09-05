import { n as RequestLoggerConfig, r as browserLogger } from "./plugin-AMSmCQRy.mjs";
//#region src/svelte.d.ts
declare const requestLogger: (config?: RequestLoggerConfig) => Plugin, logger: (config?: RequestLoggerConfig) => Plugin[];
//#endregion
export { type RequestLoggerConfig, browserLogger, logger as default, logger, requestLogger };