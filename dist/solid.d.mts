import { a as browserLogger, n as RequestLoggerConfig } from "./plugin-shared.mjs";
//#region src/solid.d.ts
export declare const requestLogger: (config?: RequestLoggerConfig) => import("vite", { with: { "resolution-mode": "import" } }).Plugin, logger: (config?: RequestLoggerConfig) => import("vite", { with: { "resolution-mode": "import" } }).Plugin[];
//#endregion
export { type RequestLoggerConfig, browserLogger, logger as default };