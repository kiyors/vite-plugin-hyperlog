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
  /**
   * Filter out Vite module compilation noise: both dependency modules
   * (`/node_modules/`, `/@vite`, `/@id/`) and your own source modules
   * (`/src/**`, `*.ts|tsx|js|jsx|css`). Set to `false` to log every module
   * request. Defaults to `true`.
   */
  excludeModules?: boolean;
  /**
   * Filter out `/api` endpoint requests from terminal logs.
   * Matches the `/api` path segment only, so `/api-key` is still logged.
   * @default false
   */
  excludeApis?: boolean;
  /**
   * Collapse repeated requests to the same URL within `repeatWindowMs` into a
   * single trailing `(xN)` line instead of printing one line each.
   * @default true
   */
  groupRepeats?: boolean;
  /**
   * Window used to group repeated requests.
   * @default 1000
   */
  repeatWindowMs?: number;
  /**
   * Print a diagnostic when many modules are requested a second time without an
   * intervening document request, which means the entry graph ran twice in one
   * page load.
   * @default true
   */
  detectGraphReevaluation?: boolean;
  resolveRoute?: (url: string) => string | undefined | null;
}
/**
 * Matches an exclusion pattern against a URL.
 *
 * Patterns starting with `/` are treated as path patterns and must align to
 * segment boundaries, so `/api` matches `/api/users` but not `/api-key` or
 * `/dashboard/apiSettings`. Everything else stays a substring match, which is
 * what query-shaped patterns like `?import` need.
 *
 * @internal exported for tests
 */
declare function matchesExclusion(url: string, pattern: string): boolean;
/**
 * True when the URL is a source or dependency module rather than an app request.
 *
 * @internal exported for tests
 */
declare function isModuleRequest(url: string): boolean;
interface RoutePayload {
  routeId?: string;
  path?: string;
  params?: string | null;
  durationMs?: number | null;
  isPreload?: boolean | null;
}
/** Logs one client-reported SPA route transition. */
declare function logRouteEvent(data: RoutePayload): void;
declare function attachRouteEndpoint(server: any, onRoute?: (data: RoutePayload) => void): void;
declare function requestLogger(config?: RequestLoggerConfig): Plugin;
/**
 * Builds the dev URL for the browser logger virtual module.
 *
 * Vite serves virtual modules under `/@id/` with the leading NUL encoded as
 * `__x00__`, and prefixes that with the resolved `base`. Hardcoding the URL breaks
 * any app served from a sub-path.
 *
 * @internal exported for tests
 */
declare function browserLoggerScriptSrc(base: string): string;
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
export { browserLogger as a, isModuleRequest as c, matchesExclusion as d, requestLogger as f, remapStackTrace as h, attachRouteEndpoint as i, logRouteEvent as l, remapSourcePosition as m, RequestLoggerConfig as n, browserLoggerScriptSrc as o, RemappedPosition as p, RoutePayload as r, createFrameworkLogger as s, ReqType as t, logger as u };