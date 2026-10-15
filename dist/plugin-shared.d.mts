import { IncomingHttpHeaders, IncomingMessage } from "node:http";
import { Plugin } from "vite";
//#region src/server-fn-utils.d.ts
interface FormatPayloadOptions {
  maxDepth?: number;
  maxBreadth?: number;
  maxStringLength?: number;
}
/**
 * Safely format any JavaScript value (including circular objects, errors, FormData)
 * into a compact, human-readable string representation without external dependencies.
 */
declare function formatPayload(val: any, options?: FormatPayloadOptions, depth?: number, seen?: WeakSet<WeakKey>): string;
interface ServerFnDetails {
  functionName: string;
  filePath: string;
  lineNumber?: number;
}
/**
 * Detects server function / action details across frameworks (TanStack Start, React 19 / RSC, Astro).
 */
declare function detectServerFunction(url: string, headers: IncomingHttpHeaders, customResolver?: (req: IncomingMessage) => ServerFnDetails | undefined, req?: IncomingMessage): ServerFnDetails | null;
/**
 * Safely parses server function arguments from request body bytes or query string.
 */
declare function parseServerFnArgs(url: string, method: string, headers: IncomingHttpHeaders, bodyBytes: Buffer[]): any;
/**
 * Safely parses server function return value or error from response body bytes.
 */
declare function parseServerFnResult(statusCode: number, resBytes: Buffer[]): any;
//#endregion
//#region index.d.ts
declare function isModuleRequest(url: string): boolean;
declare function matchesExclusion(url: string, pattern: string): boolean;
interface RemappedPosition {
  source?: string;
  line: number;
  column: number;
  name?: string;
}
declare function remapSourcePosition(sourcemapJson: string, line: number, column: number): RemappedPosition | null;
declare function remapStackTrace(sourcemapJson: string, stack: string): string;
declare function shouldExcludeRequest(url: string, exclusions: Array<string>, excludeModules: boolean): boolean;
//#endregion
//#region src/ui.d.ts
/**
 * In-browser DevTools Overlay and Console Mirror script for Server Functions.
 * Compiled into and served from the native Rust binary via NAPI-RS.
 */
declare function getServerFunctionOverlayScript(): string;
//#endregion
//#region src/plugin.d.ts
type ReqType = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD" | "get" | "post" | "put" | "patch" | "delete" | "options" | "head" | "Get" | "Post" | "Put" | "Patch" | "Delete" | "Options" | "Head";
interface ServerFunctionConfig {
  /**
   * Enable or disable server function logging.
   * @default true
   */
  enabled?: boolean;
  /**
   * Terminal output format: "tree" (nested under request line like Next.js) or "inline" ([server-fn] badge).
   * @default "tree"
   */
  format?: "tree" | "inline";
  /**
   * Log arguments passed to the server function.
   * @default true
   */
  logArgs?: boolean;
  /**
   * Log returned value or error from the server function.
   * @default true
   */
  logReturns?: boolean;
  /**
   * Maximum argument/return value object nesting depth.
   * @default 2
   */
  maxDepth?: number;
  /**
   * Maximum array elements or object keys to log before truncating.
   * @default 3
   */
  maxBreadth?: number;
  /**
   * Maximum string length before truncating with ellipsis.
   * @default 40
   */
  maxStringLength?: number;
  /**
   * Inject interactive in-browser Server Function DevTools overlay/pill.
   * @default true
   */
  ui?: boolean;
  /**
   * Mirror server function logs to the browser developer console.
   * @default false
   */
  browserConsole?: boolean;
  /**
   * Custom resolver to identify server functions from request headers or URLs.
   */
  resolveServerFn?: (req: IncomingMessage) => ServerFnDetails | undefined;
}
interface BrowserLoggerConfig {
  /**
   * Enable the in-browser floating DevTools overlay and drawer for inspecting server functions.
   * @default true
   */
  serverFunctionUi?: boolean;
}
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
  /**
   * Configuration for Server Function / Server Action execution logging.
   * Set to `false` to disable server function execution logging.
   * @default true
   */
  serverFunctions?: boolean | ServerFunctionConfig;
}
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
declare function browserLogger(config?: BrowserLoggerConfig): Plugin;
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
export { parseServerFnArgs as C, formatPayload as S, remapSourcePosition as _, ServerFunctionConfig as a, ServerFnDetails as b, browserLoggerScriptSrc as c, logger as d, requestLogger as f, matchesExclusion as g, isModuleRequest as h, RoutePayload as i, createFrameworkLogger as l, RemappedPosition as m, ReqType as n, attachRouteEndpoint as o, getServerFunctionOverlayScript as p, RequestLoggerConfig as r, browserLogger as s, BrowserLoggerConfig as t, logRouteEvent as u, remapStackTrace as v, parseServerFnResult as w, detectServerFunction as x, shouldExcludeRequest as y };