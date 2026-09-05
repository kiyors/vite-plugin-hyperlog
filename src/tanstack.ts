import fs from "node:fs";
import path from "node:path";

import type { Plugin } from "vite";

import { formatLogEntry, parseRouteTreeAst } from "../index.js";
import { browserLogger, type RequestLoggerConfig } from "./plugin";

export interface TanStackLoggerConfig extends RequestLoggerConfig {
  /**
   * Filter out internal Vite module compilation noise (/src/***.tsx, ?tsr-split, etc.)
   * @default true
   */
  excludeModules?: boolean;

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
    const matches = content.matchAll(/(?:fullPath|path|id):\s*['"](\/[^'"]*)['"]/g);
    for (const match of matches) {
      const p = match[1].trim();
      if (p && !p.startsWith("/api") && !p.includes("node_modules")) {
        routes.add(p);
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

const DEFAULT_EXCLUDE_URLS = ["?import", "vite_ping", "@fs", "/@vite/client"];
const TANSTACK_EXCLUDE_PATTERNS = ["?tsr-split", "virtual:tanstack-start", "/@id/virtual:"];
const SOURCE_MODULE_RE = /\.(?:tsx|ts|jsx|js|css)$/;

function isSourceModule(url: string): boolean {
  if (url.startsWith("/api") || url.startsWith("/_serverFn")) {
    return false;
  }
  const cleanPath = url.split("?")[0];
  return cleanPath.startsWith("/src/") && SOURCE_MODULE_RE.test(cleanPath);
}

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
  const routeCache = new Map<string, string | null>();
  const pendingServerFns = new Map<string, PendingServerFn>();
  const MAX_PENDING_SERVER_FNS = 250;

  const exclusions = [...DEFAULT_EXCLUDE_URLS, ...(config?.excludeUrls || [])];
  const excludedMethods = config?.excludeReqType
    ? new Set(config.excludeReqType.map((type) => type.toUpperCase()))
    : null;

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
    if (logString) {
      console.log(logString);
    }
  };

  const resolveRouteName = (url: string): string | null => {
    if (config?.resolveRoute) {
      const custom = config.resolveRoute(url);
      if (custom) return custom;
    }

    if (!matchRouteTree || routeMatchers.length === 0) {
      return null;
    }

    const cleanPath = url.split("?")[0];
    const cached = routeCache.get(cleanPath);
    if (cached !== undefined) {
      return cached;
    }

    for (let i = 0; i < routeMatchers.length; i++) {
      if (routeMatchers[i].regex.test(cleanPath)) {
        const pattern = routeMatchers[i].pattern;
        if (routeCache.size > 256) routeCache.clear();
        routeCache.set(cleanPath, pattern);
        return pattern;
      }
    }

    if (routeCache.size > 256) routeCache.clear();
    routeCache.set(cleanPath, null);
    return null;
  };

  return {
    name: "vite-plugin-request-logging-tanstack",
    apply: "serve",
    configureServer(server) {
      // Load routeTree.gen.ts if available
      const treeRelativePath = config?.routeTreePath || "src/routeTree.gen.ts";
      const treeAbsolutePath = path.resolve(server.config.root, treeRelativePath);

      const loadRoutes = () => {
        try {
          if (fs.existsSync(treeAbsolutePath)) {
            const content = fs.readFileSync(treeAbsolutePath, "utf-8");
            routeMatchers = parseRouteTreeContent(content);
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
      });

      server.middlewares.use((req, res, next) => {
        const url = req.originalUrl || "";
        const method = req.method || "GET";

        if (excludedMethods && excludedMethods.has(method.toUpperCase())) {
          return next();
        }

        for (let i = 0; i < exclusions.length; i++) {
          if (url.includes(exclusions[i])) {
            return next();
          }
        }

        // Filter out internal module compilation noise when excludeModules is enabled
        if (excludeModules) {
          for (let i = 0; i < TANSTACK_EXCLUDE_PATTERNS.length; i++) {
            if (url.includes(TANSTACK_EXCLUDE_PATTERNS[i])) {
              return next();
            }
          }
          if (isSourceModule(url)) {
            return next();
          }
        }

        const start = performance.now();
        let logged = false;

        const logIt = () => {
          if (logged) return;
          logged = true;

          res.removeListener("finish", logIt);
          res.removeListener("close", logIt);

          const durationMs = performance.now() - start;
          const status = res.statusCode;
          const cl = res.getHeader("content-length");
          const contentLength = cl ? Number(cl) : null;
          const location = res.getHeader("location");
          const redirectLocation = location ? String(location) : null;
          const routeName = resolveRouteName(url);

          const isServerFn = url.startsWith("/_serverFn");

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

          if (logString) {
            console.log(logString);
          }
        };

        res.on("finish", logIt);
        res.on("close", logIt);

        next();
      });
    },
  };
}

/**
 * Convenient unified TanStack logger plugin that registers both requestLogger and browserLogger.
 */
export function tanstackLogger(config?: TanStackLoggerConfig): Plugin[] {
  return [requestLogger(config), browserLogger()];
}

export * from "./tanstack-client";
export { browserLogger };
export default tanstackLogger;
