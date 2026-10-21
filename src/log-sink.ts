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

const ANSI_PATTERN = new RegExp(
  // eslint-disable-next-line no-control-regex -- matches ANSI escape sequences by design
  "[\\u001B\\u009B][\\[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))",
  "g",
);

/** Removes ANSI escape sequences (SGR, cursor movement, OSC...) from a string. */
export function stripAnsi(value: string): string {
  if (!ANSI_PATTERN.test(value)) return value;
  ANSI_PATTERN.lastIndex = 0;
  return value.replace(ANSI_PATTERN, "");
}

/**
 * `NO_COLOR` disables colors whenever it is set to any non-empty value
 * (https://no-color.org/). `FORCE_COLOR` wins over `NO_COLOR`, so CI setups can
 * force colors into a captured log with `FORCE_COLOR=1`. Unset `FORCE_COLOR`
 * returns `null`, meaning "honor TTY detection".
 */
export function readNoColor(): boolean {
  const value = process.env.NO_COLOR;
  return value !== undefined && value !== "";
}

export function readForceColor(): boolean | null {
  const value = process.env.FORCE_COLOR;
  if (value === undefined || value === "") return null;
  return !(value === "0" || value === "false");
}

/** Structured log rows for `json: true` mode — one row per adapter event. */
export interface RequestLogEvent {
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

export interface ServerFnLogEvent {
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

export interface RouteLogEvent {
  kind: "route";
  ts: number;
  routeId?: string | null;
  path?: string | null;
  params?: string | null;
  durationMs?: number | null;
  isPreload?: boolean;
}

export interface BrowserLogEvent {
  kind: "browser";
  ts: number;
  type?: string;
  message?: string;
  caller?: string | null;
  count?: number | null;
  suppressed?: number;
}

export interface GraphLogEvent {
  kind: "graph";
  ts: number;
  distinctModules: number;
  repeatedRequests: number;
  windowMs: number;
}

export interface SummaryLogEvent {
  kind: "summary";
  ts: number;
  windowMs: number;
  count: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface RawLineEvent {
  kind: "line";
  ts: number;
  line: string;
}

export interface RequestEventExtras {
  contentLength?: number | null;
  location?: string | null;
  route?: string | null;
  repeat?: number | null;
}

/** Builds the canonical NDJSON row for one HTTP result, shared by every adapter. */
export function buildRequestEvent(
  url: string,
  method: string,
  status: number,
  durationMs: number,
  extras: RequestEventExtras = {},
): RequestLogEvent {
  return { kind: "request", ts: Date.now(), url, method, status, durationMs, ...extras };
}

export type JsonEvent =
  | RequestLogEvent
  | ServerFnLogEvent
  | RouteLogEvent
  | BrowserLogEvent
  | GraphLogEvent
  | SummaryLogEvent
  | RawLineEvent;

export interface LogSinkWriter {
  write(chunk: string): void;
}

export interface LogSinkOptions {
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

export interface LogSink {
  /** Pretty-mode `line` falls back, json-mode requires `event`. */
  print(line: string | null, event?: JsonEvent): void;
  /** Flush any coalesced lines immediately (server close, shutdown). */
  flush(): void;
  readonly json: boolean;
}

export function createLogSink(options: LogSinkOptions = {}): LogSink {
  const writer = options.writer ?? process.stdout;
  // A real terminal does not flip mid-run often enough to justify a per-line
  // `isTTY` property read on the hot path.
  const isRealTerminal = writer === process.stdout && process.stdout.isTTY === true;
  const forceColor = readForceColor();
  const noColor = readNoColor();
  const autoStrip = forceColor === false || (!forceColor && (noColor || !isRealTerminal));
  const stripColors = options.stripColors === false ? true : autoStrip;
  const jsonMode = options.json === true;

  let batch: string[] = [];
  let flushQueued = false;

  const flush = () => {
    flushQueued = false;
    if (batch.length === 0) return;
    const out = `${batch.join("\n")}\n`;
    batch = [];
    try {
      writer.write(out);
    } catch {
      // A closed stdout (killed terminal, detached pipe) must never take down
      // the dev server; dropping the batch is the best recovery available.
    }
  };

  return {
    json: jsonMode,
    flush,
    print(line, event) {
      if (!line || line.length === 0) return;
      const text = stripColors ? stripAnsi(line) : line;

      let out: string;
      if (jsonMode) {
        out = JSON.stringify(event ?? { kind: "line", ts: Date.now(), line: text });
      } else {
        out = text;
      }

      batch.push(out);
      if (!flushQueued) {
        flushQueued = true;
        queueMicrotask(flush);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Rolling latency summary (feature B)
// ---------------------------------------------------------------------------

export interface SummarySample {
  count: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface SummaryOptions {
  /** Window length in milliseconds. @default 10_000 */
  windowMs?: number;
  /** Minimum requests before a window is summarized. @default 5 */
  minSamples?: number;
}

export interface SummaryTracker {
  record(durationMs: number): void;
  /**
   * Returns the sample for the just-closed window, or null while the window is
   * still open (or too sparse). Call it once per logged request; it is O(1)
   * except on the window close itself.
   */
  poll(): SummarySample | null;
}

export function createSummaryTracker(options: SummaryOptions = {}): SummaryTracker {
  const windowMs = Math.max(200, options.windowMs ?? 10_000);
  const minSamples = Math.max(2, options.minSamples ?? 5);

  let durations: number[] = [];
  let windowStartAt = 0;

  return {
    record(durationMs) {
      if (!Number.isFinite(durationMs) || durationMs < 0) return;
      if (durations.length === 0) windowStartAt = performance.now();
      durations.push(durationMs);
      // Hard cap so a no-memory-growth invariant survives a runaway page just
      // like every other buffer in the plugin.
      if (durations.length > 2048) durations = durations.slice(durations.length - 2048);
    },
    poll() {
      if (durations.length === 0) return null;
      if (performance.now() - windowStartAt < windowMs) return null;

      const count = durations.length;
      const sorted = durations.slice();
      durations = [];
      windowStartAt = performance.now();
      if (count < minSamples) return null;

      sorted.sort((a, b) => a - b);
      // Nearest-rank percentile.
      const quantile = (p: number): number => {
        const rank = Math.max(0, Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1));
        return sorted[rank] ?? 0;
      };
      return { count, p50: quantile(0.5), p95: quantile(0.95), p99: quantile(0.99) };
    },
  };
}

const DIM = "\u001B[2m";
const RESET = "\u001B[0m";
const COLOR_OK = "\u001B[32m";
const COLOR_MID = "\u001B[33m";
const COLOR_SLOW = "\u001B[31m";

function latencyColor(ms: number): string {
  if (ms < 50) return COLOR_OK;
  if (ms < 200) return COLOR_MID;
  return COLOR_SLOW;
}

const formatMs = (value: number): string => {
  const text = value < 10 ? value.toFixed(2) : value < 100 ? value.toFixed(1) : Math.round(value).toFixed(0);
  return text.endsWith(".0") ? text.slice(0, -2) : text;
};

/** Single dim footer line, e.g. `└─ last 10s · p50 1.2ms · p95 9.4ms · p99 31ms · 87 reqs`. */
export function formatSummaryLine(sample: SummarySample, windowMs: number): string {
  const fmt = (value: number) => `${latencyColor(value)}${formatMs(value)}ms${RESET}`;
  return `└─ ${DIM}${Math.round(windowMs / 1000)}s${RESET} p50 ${fmt(sample.p50)} · p95 ${fmt(
    sample.p95,
  )} · p99 ${fmt(sample.p99)} · ${DIM}${sample.count} reqs${RESET}`;
}
