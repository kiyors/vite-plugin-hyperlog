import type { IncomingHttpHeaders, IncomingMessage } from "node:http";

import { decodeServerFn, formatLogEntry, formatServerFnLog } from "../index.js";
import type { LogSink } from "./log-sink";

/**
 * A captured body chunk in its original representation.
 *
 * Chunks captured from a request or response stream may be Buffers or, when a
 * consumer has called `setEncoding`, pre-decoded strings. Joining them must not
 * decode/encode each chunk in isolation: a multi-byte character split across a
 * chunk boundary would otherwise be silently corrupted.
 */
export type CapturedChunk = Buffer | string;

/**
 * Concatenates captured chunks into one Buffer.
 *
 * Buffer chunks are used as-is; string chunks are encoded at the end so that a
 * multi-byte character split across separate string chunks still joins into a
 * single complete character (string concatenation preserves the decoder's
 * boundary handling).
 */
export function concatChunks(chunks: Array<Buffer | string>): Buffer {
  if (chunks.length === 0) return Buffer.alloc(0);
  if (chunks.length === 1) {
    const [only] = chunks;
    return Buffer.isBuffer(only) ? only : Buffer.from(only, "utf8");
  }
  const parts: Buffer[] = [];
  let pendingStrings: string[] = [];
  for (const chunk of chunks) {
    if (Buffer.isBuffer(chunk)) {
      if (pendingStrings.length > 0) {
        parts.push(Buffer.from(pendingStrings.join(""), "utf8"));
        pendingStrings = [];
      }
      parts.push(chunk);
    } else {
      pendingStrings.push(chunk);
    }
  }
  if (pendingStrings.length > 0) {
    parts.push(Buffer.from(pendingStrings.join(""), "utf8"));
  }
  return Buffer.concat(parts);
}

export interface FormatPayloadOptions {
  maxDepth?: number;
  maxBreadth?: number;
  maxStringLength?: number;
}

/**
 * Safely format any JavaScript value (including circular objects, errors, FormData)
 * into a compact, human-readable string representation without external dependencies.
 */
export function formatPayload(
  val: any,
  options?: FormatPayloadOptions,
  depth = 0,
  seen: WeakSet<WeakKey> = new WeakSet(),
): string {
  const maxDepth = options?.maxDepth ?? 2;
  const maxBreadth = options?.maxBreadth ?? 3;
  const maxStrLen = options?.maxStringLength ?? 40;

  if (val === undefined) return "undefined";
  if (val === null) return "null";
  if (val === true) return "true";
  if (val === false) return "false";

  if (Buffer.isBuffer(val)) {
    return val.toString("utf-8");
  }

  const tag = Object.prototype.toString.call(val);

  if (tag === "[object String]") {
    // SAFETY: tag check validates string value
    const s = val as string;
    if (s.length > maxStrLen) {
      return JSON.stringify(s.slice(0, maxStrLen) + "…");
    }
    return JSON.stringify(s);
  }

  if (tag === "[object Number]") {
    return String(val);
  }

  if (tag === "[object BigInt]") {
    return `${val}n`;
  }

  if (tag === "[object Symbol]") {
    return val.toString();
  }

  if (tag === "[object Function]") {
    // SAFETY: tag check validates function value
    const fn = val as Function;
    return fn.name ? `ƒ ${fn.name}()` : "ƒ()";
  }

  const isObjectLike =
    Boolean(val) &&
    (tag === "[object Object]" ||
      Array.isArray(val) ||
      val instanceof Error ||
      tag === "[object FormData]" ||
      tag === "[object URLSearchParams]");

  if (isObjectLike) {
    if (seen.has(val)) {
      return "[Circular]";
    }
    seen.add(val);
  }

  if (val instanceof Error) {
    return val.name ? `${val.name}: ${val.message}` : val.message || "Error";
  }

  if (depth >= maxDepth) {
    if (Array.isArray(val)) return `[Array(${val.length})]`;
    return "[Object]";
  }

  if (Array.isArray(val)) {
    if (val.length === 0) return "[]";
    const items: string[] = [];
    const len = Math.min(val.length, maxBreadth);
    for (let i = 0; i < len; i++) {
      items.push(formatPayload(val[i], options, depth + 1, seen));
    }
    if (val.length > maxBreadth) {
      items.push(`…+${val.length - maxBreadth} more`);
    }
    return `[${items.join(", ")}]`;
  }

  if (tag === "[object FormData]" || tag === "[object URLSearchParams]" || (Boolean(val) && Boolean(val.entries))) {
    const entries: [string, any][] = [];
    try {
      // SAFETY: val has entries method
      for (const [k, v] of (val as { entries(): Iterable<[string, any]> }).entries()) {
        entries.push([k, v]);
        if (entries.length >= maxBreadth) break;
      }
      const fields = entries.map(([k, v]) => {
        const vTag = Object.prototype.toString.call(v);
        const vStr =
          vTag === "[object Object]" && Boolean(v) && "name" in v
            ? String(v.name)
            : formatPayload(v, options, depth + 1, seen);
        return `${k}: ${vStr}`;
      });
      const ctorName = val.constructor?.name || "FormData";
      return `${ctorName} { ${fields.join(", ")} }`;
    } catch {
      const ctorName = val.constructor?.name || "FormData";
      return `[${ctorName}]`;
    }
  }

  const keys = Object.keys(val);
  if (keys.length === 0) return "{}";

  const fields: string[] = [];
  const len = Math.min(keys.length, maxBreadth);
  for (let i = 0; i < len; i++) {
    const k = keys[i]!;
    let propVal: any;
    try {
      propVal = val[k];
    } catch {
      propVal = "[Unreadable]";
    }
    const formattedVal = formatPayload(propVal, options, depth + 1, seen);
    fields.push(`${k}: ${formattedVal}`);
  }
  if (keys.length > maxBreadth) {
    fields.push(`…+${keys.length - maxBreadth} more`);
  }
  return `{ ${fields.join(", ")} }`;
}

export interface ServerFnDetails {
  functionName: string;
  filePath: string;
  lineNumber?: number;
}

/**
 * Decodes TanStack Start base64 payload into function and file path.
 */
export function decodeTanStackServerFn(url: string): ServerFnDetails | null {
  const decoded = decodeServerFn(url);
  if (!decoded) return null;
  return {
    functionName: decoded.functionName,
    filePath: decoded.filePath,
  };
}

/**
 * Detects server function / action details across frameworks (TanStack Start, React 19 / RSC, Astro).
 */
export function detectServerFunction(
  url: string,
  headers: IncomingHttpHeaders,
  customResolver?: (req: IncomingMessage) => ServerFnDetails | undefined,
  req?: IncomingMessage,
): ServerFnDetails | null {
  if (customResolver && req) {
    const custom = customResolver(req);
    if (custom) return custom;
  }

  // TanStack Start
  if (url.startsWith("/_serverFn")) {
    const tanstack = decodeTanStackServerFn(url);
    if (tanstack) return tanstack;
    return {
      functionName: "serverFn",
      filePath: "src",
    };
  }

  // React Server Actions (Next-Action or rsc-action-id header)
  const rawAction = headers["next-action"] || headers["rsc-action-id"] || headers["x-action-name"];
  const nextAction = Array.isArray(rawAction) ? rawAction[0] : rawAction;
  if (nextAction) {
    const actStr = String(nextAction);
    return {
      functionName: actStr.length > 24 ? actStr.slice(0, 16) + "…" : actStr,
      filePath: "server action",
    };
  }

  // Astro Server Actions
  if (url.startsWith("/_actions/")) {
    const actionPath = url.slice("/_actions/".length).split("?")[0];
    if (actionPath) {
      return {
        functionName: actionPath,
        filePath: "src/actions",
      };
    }
  }

  return null;
}

/**
 * Safely parses server function arguments from request body bytes or query string.
 */
export function parseServerFnArgs(
  url: string,
  method: string,
  headers: IncomingHttpHeaders,
  bodyBytes: Array<Buffer | string>,
): any {
  try {
    if (method === "GET") {
      const qIndex = url.indexOf("?");
      if (qIndex !== -1) {
        const query = url.slice(qIndex + 1);
        const params = new URLSearchParams(query);
        const dataParam = params.get("data") || params.get("args") || params.get("payload");
        if (dataParam) {
          try {
            return JSON.parse(dataParam);
          } catch {
            return dataParam;
          }
        }
      }
      return undefined;
    }

    if (bodyBytes.length === 0) return undefined;

    const rawBody = concatChunks(bodyBytes).toString("utf-8");
    if (!rawBody.trim()) return undefined;

    const contentType = String(headers["content-type"] || "");
    if (contentType.includes("application/json") || rawBody.startsWith("{") || rawBody.startsWith("[")) {
      try {
        const parsed = JSON.parse(rawBody);
        const isObj = Boolean(parsed) && Object.prototype.toString.call(parsed) === "[object Object]";
        if (isObj && "data" in parsed) {
          return parsed.data;
        }
        return parsed;
      } catch {
        return rawBody.slice(0, 100);
      }
    }

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(rawBody);
      const obj: Record<string, string> = {};
      for (const [k, v] of params.entries()) {
        obj[k] = v;
      }
      return obj;
    }

    return rawBody.slice(0, 80);
  } catch {
    return undefined;
  }
}

/**
 * Safely parses server function return value or error from response body bytes.
 */
export function parseServerFnResult(statusCode: number, resBytes: Array<Buffer | string>): any {
  try {
    if (resBytes.length === 0) return undefined;
    const rawRes = concatChunks(resBytes).toString("utf-8");
    if (!rawRes.trim()) return undefined;

    try {
      const parsed = JSON.parse(rawRes);
      if (statusCode >= 400) {
        const isObj = Boolean(parsed) && Object.prototype.toString.call(parsed) === "[object Object]";
        if (isObj) {
          return parsed.message || parsed.error || parsed;
        }
      }
      return parsed;
    } catch {
      return rawRes.slice(0, 100);
    }
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Shared request/response capture + native server-fn logging (single copy for
// every adapter — previously duplicated and drifting between plugin.ts and
// tanstack.ts).
// ---------------------------------------------------------------------------

/** Maximum captured request/response body size per server-function request. */
export const MAX_CAPTURE_BYTES = 64 * 1024;

export interface ServerFnBodyCapture {
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
export function captureServerFnBodies(
  req: { on(event: string, listener: (chunk: CapturedChunk) => void): void },
  res: {
    write(chunk: CapturedChunk | null, ...args: any[]): boolean;
    end(chunk: CapturedChunk | null, ...args: any[]): void;
  },
  captureArgs: boolean,
  captureReturns: boolean,
): ServerFnBodyCapture {
  const bodyBytes: CapturedChunk[] = [];
  const resBytes: CapturedChunk[] = [];
  let totalBodyLen = 0;
  let totalResLen = 0;

  if (captureArgs) {
    req.on("data", (chunk) => {
      if (chunk == null || totalBodyLen >= MAX_CAPTURE_BYTES) return;
      bodyBytes.push(chunk);
      totalBodyLen += chunk.length;
    });
  }

  if (captureReturns) {
    const origWrite = res.write;
    const origEnd = res.end;

    res.write = function (chunk, ...args) {
      if (chunk && totalResLen < MAX_CAPTURE_BYTES) {
        resBytes.push(chunk);
        totalResLen += chunk.length;
      }
      return origWrite.apply(this, [chunk, ...args]);
    };

    res.end = function (chunk, ...args) {
      if (chunk && totalResLen < MAX_CAPTURE_BYTES) {
        resBytes.push(chunk);
        totalResLen += chunk.length;
      }
      return origEnd.apply(this, [chunk, ...args]);
    };
  }

  return { bodyBytes, resBytes };
}

/** Shape pushed to connected DevTools HUD clients over the Vite WS channel. */
export interface WsHudPayload {
  type: "custom";
  event: string;
  data: unknown;
}

export interface LogServerFnCallOptions {
  /** Vite dev server, or null in odd hostings; only used for the client HUD push. */
  server: { ws?: { send(payload: WsHudPayload): void } } | null;
  sink: LogSink;
  details: ServerFnDetails;
  url: string;
  method: string;
  status: number;
  durationMs: number;
  parsedArgs: unknown;
  parsedResult: unknown;
  outputFormat: "tree" | "standalone";
  limits: { maxDepth?: number; maxBreadth?: number; maxStringLength?: number };
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
export function logServerFnCall(options: LogServerFnCallOptions): void {
  const { sink, details, status, durationMs, parsedArgs, parsedResult, outputFormat, limits, server, url, method } =
    options;

  const formattedArgs = parsedArgs !== undefined ? formatPayload(parsedArgs, limits) : null;
  const formattedResult = parsedResult !== undefined ? formatPayload(parsedResult, limits) : null;

  const ts = Date.now();
  if (outputFormat === "tree") {
    const requestLine = formatLogEntry(url, method, status, durationMs, null, null, null, null);
    sink.print(requestLine, { kind: "request", ts, url, method, status, durationMs });

    const fnLine = formatServerFnLog(
      details.functionName,
      details.filePath,
      details.lineNumber ?? null,
      status,
      durationMs,
      formattedArgs,
      formattedResult,
      true, // isTreeChild
      null,
    );
    sink.print(fnLine, {
      kind: "server-fn",
      ts,
      name: details.functionName,
      file: details.filePath,
      line: details.lineNumber ?? null,
      status,
      durationMs,
      args: parsedArgs,
      result: parsedResult,
    });
  } else {
    const fnLine = formatServerFnLog(
      details.functionName,
      details.filePath,
      details.lineNumber ?? null,
      status,
      durationMs,
      formattedArgs,
      formattedResult,
      false, // standalone
      null,
    );
    sink.print(fnLine, {
      kind: "server-fn",
      ts,
      name: details.functionName,
      file: details.filePath,
      line: details.lineNumber ?? null,
      status,
      durationMs,
      args: parsedArgs,
      result: parsedResult,
    });
  }

  try {
    server?.ws?.send({
      type: "custom",
      event: "vite-plugin-hyperlog:server-fn",
      data: {
        name: details.functionName,
        file: details.filePath,
        status,
        durationMs,
        args: parsedArgs,
        result: parsedResult,
        browserConsole: options.browserConsole === true,
      },
    });
  } catch {
    // The HUD push is best-effort; printing already happened.
  }
}
