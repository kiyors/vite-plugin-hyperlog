import type { IncomingHttpHeaders, IncomingMessage } from "node:http";

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

import { decodeServerFn } from "../index.js";

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
export function parseServerFnArgs(url: string, method: string, headers: IncomingHttpHeaders, bodyBytes: Buffer[]): any {
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

    const rawBody = Buffer.concat(bodyBytes).toString("utf-8");
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
export function parseServerFnResult(statusCode: number, resBytes: Buffer[]): any {
  try {
    if (resBytes.length === 0) return undefined;
    const rawRes = Buffer.concat(resBytes).toString("utf-8");
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
