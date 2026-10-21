import fs from "node:fs";
import path from "node:path";

import type { Plugin } from "vite";

import {
  formatLogEntry,
  observeRequest,
  matchRoutePath,
  parseRouteTreeAst,
  registerExclusionConfig,
} from "../index.js";
import {
  buildRequestEvent,
  createLogSink,
  createSummaryTracker,
  formatSummaryLine,
  type SummaryOptions,
} from "./log-sink";
import {
  allocateExclusionConfigId,
  attachRouteEndpoint,
  browserLogger,
  DEFAULT_EXCLUDE_URLS,
  routeEventSinkHandler,
  type RequestLoggerConfig,
  type ServerFunctionConfig,
} from "./plugin";
import {
  captureServerFnBodies,
  detectServerFunction,
  logServerFnCall,
  parseServerFnArgs,
  parseServerFnResult,
} from "./server-fn-utils";

export interface TanStackLoggerConfig extends RequestLoggerConfig {
  /**
   * Filter out internal Vite module compilation noise (/src/***.tsx, /node_modules/, ?tsr-split, etc.)
   * @default true
   */
  excludeModules?: boolean;

  /**
   * Filter out /api endpoint requests from terminal logs
   * @default false
   */
  excludeApis?: boolean;

  /**
   * Automatically match URLs to route patterns defined in routeTree.gen.ts
   * @default true
   */
  matchRouteTree?: boolean;

  /**
   * Group and debounce consecutive duplicate server functions (e.g. x5 calls within 80ms)
   * @default true
   */
  groupServerFn?: boolean;

  /**
   * Debounce time window in milliseconds for grouping server functions
   * @default 80
   */
  groupServerFnWindowMs?: number;

  /**
   * Custom path to routeTree.gen.ts relative to project root
   * @default "src/routeTree.gen.ts"
   */
  routeTreePath?: string;
}

export interface RouteMatcher {
  pattern: string;
  regex: RegExp;
}

export function parseRouteTreeContent(content: string): RouteMatcher[] {
  const routes = new Set<string>();

  try {
    const astRoutes = parseRouteTreeAst(content);
    for (const r of astRoutes) {
      routes.add(r);
    }
  } catch {
    // Ignore AST failure, fallback will catch below
  }

  // Fallback to regex if AST was empty or unsupported
  if (routes.size === 0) {
    const fullPathMatches = Array.from(content.matchAll(/fullPath:\s*['"](\/[^'"]*)['"]/g));
    if (fullPathMatches.length > 0) {
      for (const match of fullPathMatches) {
        const p = match[1].trim();
        if (p && !p.startsWith("/@") && !p.startsWith("/api") && !p.includes("node_modules")) {
          routes.add(p);
        }
      }
    } else {
      const matches = content.matchAll(/(?:fullPath|path|id):\s*['"](\/[^'"]*)['"]/g);
      for (const match of matches) {
        const p = match[1].trim();
        if (p && !p.startsWith("/@") && !p.startsWith("/api") && !p.includes("node_modules")) {
          routes.add(p);
        }
      }
    }
  }

  // Remove partial child wildcard fragments (e.g. "/$channelId") if a full path (e.g. "/$teamId/channels/$channelId") exists
  for (const route of Array.from(routes)) {
    if (route.startsWith("/$") && route.split("/").filter(Boolean).length === 1) {
      const isChildFragment = Array.from(routes).some((other) => other !== route && other.endsWith(route));
      if (isChildFragment) {
        routes.delete(route);
      }
    }
  }

  const matchers: RouteMatcher[] = [];
  for (const route of routes) {
    if (route === "/") {
      matchers.push({
        pattern: "/",
        regex: /^\/?$/,
      });
      continue;
    }

    const escaped = route.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\\\$/g, "$");

    const patternRegex =
      "^" + escaped.replace(/\$([a-zA-Z0-9_]+)?/g, (_m, p1) => (p1 ? "[^/]+" : ".*")).replace(/\/$/, "") + "\\/?$";

    try {
      matchers.push({
        pattern: route,
        regex: new RegExp(patternRegex),
      });
    } catch {
      // Ignore invalid regex patterns
    }
  }

  matchers.sort((a, b) => {
    const aParts = a.pattern.split("/").filter(Boolean);
    const bParts = b.pattern.split("/").filter(Boolean);
    if (aParts.length !== bParts.length) {
      return bParts.length - aParts.length;
    }
    const aDynamic = (a.pattern.match(/\$/g) || []).length;
    const bDynamic = (b.pattern.match(/\$/g) || []).length;
    return aDynamic - bDynamic;
  });

  return matchers;
}

const TANSTACK_EXCLUDE_PATTERNS = ["?tsr-split", "virtual:tanstack-start", "/@id/virtual:", "/@id/"];

interface PendingServerFn {
  timer: ReturnType<typeof setTimeout>;
  count: number;
  totalDuration: number;
  url: string;
  method: string;
  status: number;
  contentLength: number | null;
  redirectLocation: string | null;
  routeName: string | null;
}

export function requestLogger(config?: TanStackLoggerConfig): Plugin {
  const excludeModules = config?.excludeModules ?? true;
  const matchRouteTree = config?.matchRouteTree ?? true;
  const groupServerFn = config?.groupServerFn ?? true;
  const groupWindowMs = config?.groupServerFnWindowMs ?? 80;

  let routeMatchers: RouteMatcher[] = [];
  let routePatterns: string[] = [];
  const routeCache = new Map<string, string | null>();
  const pendingServerFns = new Map<string, PendingServerFn>();
  const MAX_PENDING_SERVER_FNS = 250;

  const sf = config?.serverFunctions;
  // SAFETY: sf is validated to be a configuration object and not a boolean
  const serverFnConfig = Boolean(sf) && sf !== true ? (sf as ServerFunctionConfig) : null;
  const isServerFnLoggingEnabled = serverFnConfig !== null && serverFnConfig.enabled !== false;
  const serverFnFormat = serverFnConfig?.format ?? "tree";

  const jsonMode = config?.json === true;
  const summaryConfig = config?.summaryStats;
  const summaryEnabled = summaryConfig !== false;
  // SAFETY: with `true` and `false` excluded, a defined value is necessarily the object form.
  const summaryOptions: SummaryOptions =
    summaryEnabled && summaryConfig !== true ? ((summaryConfig ?? {}) as SummaryOptions) : {};
  const summaryWindowMs = Math.max(200, summaryOptions.windowMs ?? 10_000);

  const exclusions = [
    ...DEFAULT_EXCLUDE_URLS,
    ...(config?.excludeUrls || []),
    ...(config?.excludeApis ? ["/api"] : []),
  ];
  const allExclusions = [...exclusions, ...TANSTACK_EXCLUDE_PATTERNS];
  const excludedMethods = config?.excludeReqType
    ? new Set(config.excludeReqType.map((type) => type.toUpperCase()))
    : null;

  // Registered once so the per-request hot path evaluates exclusions natively
  // via the shared `observeRequest` crossing instead of marshalling this array
  // across the NAPI boundary on every request.
  const exclusionConfigId = allocateExclusionConfigId();
  registerExclusionConfig(exclusionConfigId, allExclusions, excludeModules);

  const resolveRouteName = (url: string): string | null => {
    if (config?.resolveRoute) {
      const custom = config.resolveRoute(url);
      if (custom) return custom;
    }

    if (!matchRouteTree || routeMatchers.length === 0) {
      return null;
    }

    const cleanPath = url.split("?")[0];
    if (
      cleanPath.startsWith("/@") ||
      cleanPath.startsWith("/node_modules") ||
      cleanPath.includes("node_modules") ||
      cleanPath.startsWith("/api") ||
      cleanPath.startsWith("/_serverFn")
    ) {
      return null;
    }

    const cached = routeCache.get(cleanPath);
    if (cached !== undefined) {
      return cached;
    }

    const pattern = matchRoutePath(cleanPath, routePatterns);
    if (routeCache.size > 256) routeCache.clear();
    routeCache.set(cleanPath, pattern);
    return pattern;
  };

  return {
    name: "vite-plugin-request-logging-tanstack",
    apply: "serve",
    configureServer(server) {
      // Shared output pipeline: color policy (TTY/NO_COLOR), microtask-batched
      // stdout, NDJSON mode, and the rolling latency summary all hang off this.
      const sink = createLogSink({ json: jsonMode, stripColors: config?.stripColors });
      const summary = summaryEnabled ? createSummaryTracker(summaryOptions) : null;
      let summaryFlushQueued = false;

      const flushServerFn = (key: string) => {
        const entry = pendingServerFns.get(key);
        if (!entry) return;
        pendingServerFns.delete(key);

        const avgDuration = entry.totalDuration / entry.count;
        const logString = formatLogEntry(
          entry.url,
          entry.method,
          entry.status,
          avgDuration,
          entry.contentLength,
          entry.redirectLocation,
          entry.routeName,
          entry.count > 1 ? entry.count : null,
        );
        sink.print(
          logString,
          buildRequestEvent(entry.url, entry.method, entry.status, avgDuration, {
            contentLength: entry.contentLength,
            location: entry.redirectLocation,
            route: entry.routeName,
            repeat: entry.count > 1 ? entry.count : null,
          }),
        );
      };

      // Load routeTree.gen.ts if available
      const treeRelativePath = config?.routeTreePath || "src/routeTree.gen.ts";
      const treeAbsolutePath = path.resolve(server.config.root, treeRelativePath);

      const loadRoutes = () => {
        try {
          if (fs.existsSync(treeAbsolutePath)) {
            const content = fs.readFileSync(treeAbsolutePath, "utf-8");
            routeMatchers = parseRouteTreeContent(content);
            routePatterns = routeMatchers.map((m) => m.pattern);
            routeCache.clear();
          }
        } catch {
          // Ignore read errors
        }
      };

      loadRoutes();

      // Watch for routeTree updates
      server.watcher.on("change", (changedFile) => {
        if (path.resolve(changedFile) === treeAbsolutePath) {
          loadRoutes();
        }
      });

      // Cleanup pending timers on server close
      server.httpServer?.on("close", () => {
        for (const [key, entry] of pendingServerFns.entries()) {
          clearTimeout(entry.timer);
          flushServerFn(key);
        }
        sink.flush();
      });

      const handleTanStackRoute = routeEventSinkHandler(sink);

      server.ws.on("vite-plugin-hyperlog:tanstack-route", handleTanStackRoute);

      attachRouteEndpoint(server, handleTanStackRoute);

      server.middlewares.use((req, res, next) => {
        const url = req.originalUrl || "";
        const method = req.method || "GET";

        // Single native crossing that evaluates the registered exclusion config.
        const observation = observeRequest(exclusionConfigId, url);

        if (excludedMethods && excludedMethods.has(method.toUpperCase())) {
          return next();
        }

        if (observation.excluded) {
          return next();
        }

        const serverFnDetails = isServerFnLoggingEnabled
          ? detectServerFunction(url, req.headers, serverFnConfig?.resolveServerFn, req)
          : null;

        // Shared capture plumbing (request listener + response write/end
        // patches, byte caps) — one copy for every adapter.
        const { bodyBytes, resBytes } = captureServerFnBodies(
          req,
          res,
          serverFnDetails !== null && serverFnConfig?.logArgs !== false && method !== "GET",
          serverFnDetails !== null && serverFnConfig?.logReturns !== false,
        );

        const start = performance.now();
        let logged = false;

        const logIt = (aborted: boolean) => {
          if (logged) return;
          logged = true;

          res.removeListener("finish", onFinish);
          res.removeListener("close", onClose);

          const durationMs = performance.now() - start;
          // An aborted request never reaches `finish`, so statusCode is still
          // the default 200. Report 499 like the base plugin so a dropped
          // request is not mistaken for a successful one.
          const abortedRequest = aborted && !res.writableEnded;
          const status = abortedRequest ? 499 : res.statusCode;

          // Rolling latency footer: every completed non-excluded request feeds
          // the sample; the footer is emitted from a later microtask so it
          // renders below this request's own lines.
          if (summary) {
            summary.record(durationMs);
            if (!summaryFlushQueued) {
              summaryFlushQueued = true;
              queueMicrotask(() => {
                summaryFlushQueued = false;
                const sample = summary.poll();
                if (sample) {
                  sink.print(formatSummaryLine(sample, summaryWindowMs), {
                    kind: "summary",
                    ts: Date.now(),
                    windowMs: summaryWindowMs,
                    ...sample,
                  });
                }
              });
            }
          }

          const cl = res.getHeader("content-length");
          const contentLength = cl ? Number(cl) : null;
          const location = res.getHeader("location");
          const redirectLocation = location ? String(location) : null;
          const routeName = resolveRouteName(url);

          const isServerFn = url.startsWith("/_serverFn");

          if (serverFnDetails) {
            const parsedArgs =
              serverFnConfig?.logArgs !== false ? parseServerFnArgs(url, method, req.headers, bodyBytes) : undefined;
            const parsedResult =
              serverFnConfig?.logReturns !== false ? parseServerFnResult(status, resBytes) : undefined;

            logServerFnCall({
              server,
              sink,
              details: serverFnDetails,
              url,
              method,
              status,
              durationMs,
              parsedArgs,
              parsedResult,
              outputFormat: serverFnFormat === "tree" ? "tree" : "standalone",
              limits: {
                maxDepth: serverFnConfig?.maxDepth,
                maxBreadth: serverFnConfig?.maxBreadth,
                maxStringLength: serverFnConfig?.maxStringLength,
              },
              browserConsole: serverFnConfig?.browserConsole === true,
            });
            return;
          }

          // Group and debounce repeated server functions
          if (isServerFn && groupServerFn) {
            const key = `${method}:${url}:${status}`;
            const existing = pendingServerFns.get(key);

            if (existing) {
              existing.count += 1;
              existing.totalDuration += durationMs;

              // Prevent starvation if identical calls loop rapidly
              if (existing.count >= 20) {
                clearTimeout(existing.timer);
                flushServerFn(key);
                return;
              }

              clearTimeout(existing.timer);
              existing.timer = setTimeout(() => flushServerFn(key), groupWindowMs);
              return;
            }

            if (pendingServerFns.size >= MAX_PENDING_SERVER_FNS) {
              const firstKey = pendingServerFns.keys().next().value;
              if (firstKey) flushServerFn(firstKey);
            }

            const entry: PendingServerFn = {
              count: 1,
              totalDuration: durationMs,
              url,
              method,
              status,
              contentLength,
              redirectLocation,
              routeName,
              timer: setTimeout(() => flushServerFn(key), groupWindowMs),
            };
            pendingServerFns.set(key, entry);
            return;
          }

          const logString = formatLogEntry(
            url,
            method,
            status,
            durationMs,
            contentLength,
            redirectLocation,
            routeName,
            null,
          );

          sink.print(
            logString,
            buildRequestEvent(url, method, status, durationMs, {
              contentLength,
              location: redirectLocation,
              route: routeName,
            }),
          );
        };

        const onFinish = () => logIt(false);
        const onClose = () => logIt(true);

        res.on("finish", onFinish);
        res.on("close", onClose);

        next();
      });
    },
  };
}

/**
 * Convenient unified TanStack logger plugin that registers both requestLogger and browserLogger.
 */
export function tanstackLogger(config?: TanStackLoggerConfig): Plugin[] {
  const sf = config?.serverFunctions;
  // SAFETY: sf is validated to be a configuration object and not a boolean
  const sfConfig = Boolean(sf) && sf !== true ? (sf as ServerFunctionConfig) : undefined;
  const uiEnabled = config?.serverFunctions !== false && sfConfig?.ui !== false;
  return [
    requestLogger(config),
    browserLogger({ serverFunctionUi: uiEnabled, json: config?.json === true, stripColors: config?.stripColors }),
  ];
}

export { browserLogger };
export default tanstackLogger;
