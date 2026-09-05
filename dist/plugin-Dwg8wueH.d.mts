import { Plugin } from "vite";
//#region index.d.ts
interface RemappedPosition {
  source?: string;
  line: number;
  column: number;
  name?: string;
}
declare function remapSourcePosition(sourcemapJson: string, line: number, column: number): RemappedPosition | null;
declare function remapStackTrace(sourcemapJson: string, stack: string): string;
//#endregion
//#region src/plugin.d.ts
type ReqType = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD" | "get" | "post" | "put" | "patch" | "delete" | "options" | "head" | "Get" | "Post" | "Put" | "Patch" | "Delete" | "Options" | "Head";
interface RequestLoggerConfig {
  excludeReqType?: ReqType[];
  excludeUrls?: string[];
  resolveRoute?: (url: string) => string | undefined | null;
}
declare function requestLogger(config?: RequestLoggerConfig): Plugin;
declare function browserLogger(): Plugin;
/**
 * Convenient unified plugin that registers both requestLogger and browserLogger in one call.
 *
 * @example
 * ```ts
 * import logger from "vite-plugin-hyperlog";
 * export default defineConfig({
 *   plugins: [logger()],
 * });
 * ```
 */
declare function logger(config?: RequestLoggerConfig): Plugin[];
/**
 * Factory helper for framework-specific adapters (React, Solid, Svelte, Vue)
 * that injects default framework-specific exclusions while keeping behavior unified.
 */
declare function createFrameworkLogger(defaultExclude: string): {
  requestLogger: (config?: RequestLoggerConfig) => Plugin;
  logger: (config?: RequestLoggerConfig) => Plugin[];
};
//#endregion
export { logger as a, remapSourcePosition as c, createFrameworkLogger as i, remapStackTrace as l, RequestLoggerConfig as n, requestLogger as o, browserLogger as r, RemappedPosition as s, ReqType as t };