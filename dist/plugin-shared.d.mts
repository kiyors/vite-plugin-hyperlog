import { IncomingHttpHeaders, IncomingMessage } from "node:http";
import { Plugin } from "vite";
//#region src/log-sink.d.ts
/**
 * Central terminal output pipeline for the dev plugins.
 *
 * Three responsibilities, applied in order:
 *
 * 1. Color policy — the native formatters always emit ANSI. When the output
 *    target cannot render it (piped output, CI, captured test streams) or
 *    `NO_COLOR` is set, sequences are stripped here. `FORCE_COLOR` overrides
 *    both and keeps the colors, matching the de-facto CLI convention.
 * 2. Batching — a Vite request tick can emit several lines back to back and
 *    `console.log` pays synchronous write overhead per call. Lines are
 *    coalesced into one `process.stdout.write` per microtask, which keeps
 *    ordering inside a tick and cuts syscalls dramatically on busy pages.
 * 3. Machine mode — with `json: true` events are emitted as compact NDJSON
 *    rows instead of pretty lines, so the stream can be piped into `jq`,
 *    a file, or a log collector unchanged.
 */
/** Removes ANSI escape sequences (SGR, cursor movement, OSC...) from a string. */
declare function stripAnsi(value: string): string;
/**
 * `NO_COLOR` disables colors whenever it is set to any non-empty value
 * (https://no-color.org/). `FORCE_COLOR` wins over `NO_COLOR`, so CI setups can
 * force colors into a captured log with `FORCE_COLOR=1`. Unset `FORCE_COLOR`
 * returns `null`, meaning "honor TTY detection".
 */
declare function readNoColor(): boolean;
declare function readForceColor(): boolean | null;
/** Structured log rows for `json: true` mode — one row per adapter event. */
interface RequestLogEvent {
  kind: "request";
  ts: number;
  url: string;
  method: string;
  status: number;
  durationMs: number;
  contentLength?: number | null;
  location?: string | null;
  route?: string | null;
  repeat?: number | null;
}
interface ServerFnLogEvent {
  kind: "server-fn";
  ts: number;
  name: string;
  file: string;
  line?: number | null;
  status: number;
  durationMs: number;
  args?: unknown;
  result?: unknown;
}
interface RouteLogEvent {
  kind: "route";
  ts: number;
  routeId?: string | null;
  path?: string | null;
  params?: string | null;
  durationMs?: number | null;
  isPreload?: boolean;
}
interface BrowserLogEvent {
  kind: "browser";
  ts: number;
  type?: string;
  message?: string;
  caller?: string | null;
  count?: number | null;
  suppressed?: number;
}
interface GraphLogEvent {
  kind: "graph";
  ts: number;
  distinctModules: number;
  repeatedRequests: number;
  windowMs: number;
}
interface SummaryLogEvent {
  kind: "summary";
  ts: number;
  windowMs: number;
  count: number;
  p50: number;
  p95: number;
  p99: number;
}
interface RawLineEvent {
  kind: "line";
  ts: number;
  line: string;
}
type JsonEvent = RequestLogEvent | ServerFnLogEvent | RouteLogEvent | BrowserLogEvent | GraphLogEvent | SummaryLogEvent | RawLineEvent;
interface LogSinkWriter {
  write(chunk: string): void;
}
interface LogSinkOptions {
  /** Emit NDJSON rows instead of pretty log lines. */
  json?: boolean;
  /**
   * Colour override. `undefined`/`true` keeps the automatic policy (strip for
   * non-TTY writers, `NO_COLOR`, or `FORCE_COLOR=0`); `false` always strips,
   * producing plain text even on a real terminal.
   */
  stripColors?: boolean;
  /** Output target override (tests). Defaults to `process.stdout`. */
  writer?: LogSinkWriter;
}
interface LogSink {
  /** Pretty-mode `line` falls back, json-mode requires `event`. */
  print(line: string | null, event?: JsonEvent): void;
  /** Flush any coalesced lines immediately (server close, shutdown). */
  flush(): void;
  readonly json: boolean;
}
declare function createLogSink(options?: LogSinkOptions): LogSink;
interface SummarySample {
  count: number;
  p50: number;
  p95: number;
  p99: number;
}
interface SummaryOptions {
  /** Window length in milliseconds. @default 10_000 */
  windowMs?: number;
  /** Minimum requests before a window is summarized. @default 5 */
  minSamples?: number;
}
interface SummaryTracker {
  record(durationMs: number): void;
  /**
   * Returns the sample for the just-closed window, or null while the window is
   * still open (or too sparse). Call it once per logged request; it is O(1)
   * except on the window close itself.
   */
  poll(): SummarySample | null;
}
declare function createSummaryTracker(options?: SummaryOptions): SummaryTracker;
/** Single dim footer line, e.g. `└─ last 10s · p50 1.2ms · p95 9.4ms · p99 31ms · 87 reqs`. */
declare function formatSummaryLine(sample: SummarySample, windowMs: number): string;
//#endregion
//#region src/server-fn-utils.d.ts
/**
 * A captured body chunk in its original representation.
 *
 * Chunks captured from a request or response stream may be Buffers or, when a
 * consumer has called `setEncoding`, pre-decoded strings. Joining them must not
 * decode/encode each chunk in isolation: a multi-byte character split across a
 * chunk boundary would otherwise be silently corrupted.
 */
type CapturedChunk = Buffer | string;
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
declare function parseServerFnArgs(url: string, method: string, headers: IncomingHttpHeaders, bodyBytes: Array<Buffer | string>): any;
/**
 * Safely parses server function return value or error from response body bytes.
 */
declare function parseServerFnResult(statusCode: number, resBytes: Array<Buffer | string>): any;
/** Maximum captured request/response body size per server-function request. */
declare const MAX_CAPTURE_BYTES: number;
interface ServerFnBodyCapture {
  bodyBytes: CapturedChunk[];
  resBytes: CapturedChunk[];
}
/**
 * Attaches body capture to a server-function request/response pair.
 *
 * Requests are observed with a plain `"data"` listener instead of monkey-patching
 * `req.emit`: the listener is the standard middleware pattern (same one that
 * body-parsing middleware itself uses) and avoids replacing a function on every
 * request. Chunks are stored in their original representation and joined once at
 * logging time (`concatChunks`), so a multi-byte character split across chunks
 * survives.
 */
declare function captureServerFnBodies(req: {
  on(event: string, listener: (chunk: CapturedChunk) => void): void;
}, res: {
  write(chunk: CapturedChunk | null, ...args: any[]): boolean;
  end(chunk: CapturedChunk | null, ...args: any[]): void;
}, captureArgs: boolean, captureReturns: boolean): ServerFnBodyCapture;
/** Shape pushed to connected DevTools HUD clients over the Vite WS channel. */
interface WsHudPayload {
  type: "custom";
  event: string;
  data: unknown;
}
interface LogServerFnCallOptions {
  /** Vite dev server, or null in odd hostings; only used for the client HUD push. */
  server: {
    ws?: {
      send(payload: WsHudPayload): void;
    };
  } | null;
  sink: LogSink;
  details: ServerFnDetails;
  url: string;
  method: string;
  status: number;
  durationMs: number;
  parsedArgs: unknown;
  parsedResult: unknown;
  outputFormat: "tree" | "standalone";
  limits: {
    maxDepth?: number;
    maxBreadth?: number;
    maxStringLength?: number;
  };
  /** Mirrors `serverFunctions.browserConsole` in the HUD payload, as before. */
  browserConsole?: boolean;
}
/**
 * Formats and prints one finished server-function call (plus the enclosing
 * request line in `tree` mode) and pushes it to the DevTools HUD clients.
 *
 * Shared by both adapters so the tree/standalone rendering and the HUD payload
 * cannot drift apart again.
 */
declare function logServerFnCall(options: LogServerFnCallOptions): void;
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
  /**
   * Emit one compact NDJSON row per browser log event instead of pretty lines.
   * @default false
   */
  json?: boolean;
  /**
   * Colour override: set `false` to force plain (ANSI-free) terminal output
   * even on a real TTY. Defaults to automatic TTY / `NO_COLOR` / `FORCE_COLOR`
   * handling.
   */
  stripColors?: boolean;
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
  /**
   * Respect the terminal's color capabilities: colors are stripped automatically
   * when output is piped or `NO_COLOR` is set, and kept with `FORCE_COLOR`.
   * @default true
   */
  stripColors?: boolean;
  /**
   * Emit one compact NDJSON row per log event instead of pretty colored lines.
   * Pairs well with `pnpm dev 2>&1 | jq`.
   * @default false
   */
  json?: boolean;
  /**
   * Rolling latency footer: prints `p50/p95/p99` request latency and volume once
   * per window while traffic is flowing (no output while the server is idle).
   * @default true
   */
  summaryStats?: boolean | {
    windowMs?: number;
    minSamples?: number;
  };
}
/**
 * Default request URL exclusions shared by every adapter. Root-anchored, so
 * plugin code (e.g. `/src/foo.ts`) is never caught. TanStack layers its own
 * extra patterns on top via `TANSTACK_EXCLUDE_PATTERNS`.
 */
declare const DEFAULT_EXCLUDE_URLS: string[];
/**
 * Allocates a unique plugin-instance id for the native exclusion cache.
 *
 * Each `requestLogger` instance registers its own exclusion config under this
 * id, so several plugins can coexist in one process without clobbering each
 * other's configuration.
 */
declare function allocateExclusionConfigId(): number;
interface RoutePayload {
  routeId?: string;
  path?: string;
  params?: string | null;
  durationMs?: number | null;
  isPreload?: boolean | null;
}
/** Sink-backed route reporter shared by the HTTP endpoint and WS handlers. */
declare function routeEventSinkHandler(sink: LogSink): (data: RoutePayload) => void;
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
export { parseServerFnResult as A, readForceColor as B, MAX_CAPTURE_BYTES as C, formatPayload as D, detectServerFunction as E, SummarySample as F, stripAnsi as H, SummaryTracker as I, createLogSink as L, LogSink as M, LogSinkOptions as N, logServerFnCall as O, SummaryOptions as P, createSummaryTracker as R, shouldExcludeRequest as S, captureServerFnBodies as T, readNoColor as V, RemappedPosition as _, RoutePayload as a, remapSourcePosition as b, attachRouteEndpoint as c, createFrameworkLogger as d, logRouteEvent as f, getServerFunctionOverlayScript as g, routeEventSinkHandler as h, RequestLoggerConfig as i, JsonEvent as j, parseServerFnArgs as k, browserLogger as l, requestLogger as m, DEFAULT_EXCLUDE_URLS as n, ServerFunctionConfig as o, logger as p, ReqType as r, allocateExclusionConfigId as s, BrowserLoggerConfig as t, browserLoggerScriptSrc as u, isModuleRequest as v, ServerFnDetails as w, remapStackTrace as x, matchesExclusion as y, formatSummaryLine as z };