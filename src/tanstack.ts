import fs from "node:fs";
import path from "node:path";

import type { Plugin } from "vite";

import { formatLogEntry } from "../index.js";
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

  const matches = content.matchAll(/(?:fullPath|path|id):\s*['"](\/[^'"]*)['"]/g);
  for (const match of matches) {
    const p = match[1].trim();
    if (p && !p.startsWith("/api") && !p.includes("node_modules")) {
      routes.add(p);
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

    const patternRegex = "^" + escaped.replace(/\$([a-zA-Z0-9_]+)/g, "[^/]+").replace(/\/$/, "") + "\\/?$";

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

function isSourceModule(url: string): boolean {
  if (url.startsWith("/api") || url.startsWith("/_serverFn")) {
    return false;
  }
  const cleanPath = url.split("?")[0];
  return (
    cleanPath.startsWith("/src/") &&
    (cleanPath.endsWith(".tsx") ||
      cleanPath.endsWith(".ts") ||
      cleanPath.endsWith(".jsx") ||
      cleanPath.endsWith(".js") ||
      cleanPath.endsWith(".css"))
  );
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
  const pendingServerFns = new Map<string, PendingServerFn>();

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
    for (const matcher of routeMatchers) {
      if (matcher.regex.test(cleanPath)) {
        return matcher.pattern;
      }
    }
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

        if (
          config?.excludeReqType &&
          config.excludeReqType.some((type) => type.toLowerCase() === method.toLowerCase())
        ) {
          return next();
        }

        const exclusions = [...DEFAULT_EXCLUDE_URLS, ...(config?.excludeUrls || [])];
        if (exclusions.some((match) => url.includes(match))) {
          return next();
        }

        // Filter out internal module compilation noise when excludeModules is enabled
        if (excludeModules) {
          if (TANSTACK_EXCLUDE_PATTERNS.some((pattern) => url.includes(pattern))) {
            return next();
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
              clearTimeout(existing.timer);
              existing.timer = setTimeout(() => flushServerFn(key), groupWindowMs);
              return;
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

export interface TanStackRouteMatch {
  routeId?: string;
  id?: string;
  route?: { id?: string };
}

export interface TanStackLocation {
  pathname?: string;
  href?: string;
  params?: Record<string, string | number | boolean>;
}

export interface TanStackResolvedState {
  toLocation?: TanStackLocation;
  matches?: TanStackRouteMatch[];
}

export interface TanStackRouterLike {
  subscribe(
    event: "onBeforeNavigate" | "onResolved" | "onPreloaded" | string,
    callback: (state: TanStackResolvedState) => void,
  ): void;
}

interface HotClient {
  send(event: string, payload: Record<string, string | number | boolean | null | undefined>): void;
}

interface HotMeta {
  hot?: HotClient;
}

/**
 * Client-side subscriber for TanStack Router.
 * Import this in your client entry or router.tsx to log SPA navigations and preloads to the terminal.
 *
 * @example
 * ```ts
 * import { registerTanStackRouterLogger } from "@kiyors/vite-plugin-logger/tanstack";
 * export const router = createRouter({ routeTree });
 * registerTanStackRouterLogger(router);
 * ```
 */
export function registerTanStackRouterLogger(router: TanStackRouterLike): void {
  if (!("window" in globalThis) || !router || !("subscribe" in router)) {
    return;
  }

  let navStartTime = 0;

  try {
    router.subscribe("onBeforeNavigate", () => {
      navStartTime = performance.now();
    });
  } catch {
    // Ignore if not supported
  }

  try {
    router.subscribe("onResolved", (state: TanStackResolvedState) => {
      try {
        const durationMs = navStartTime ? performance.now() - navStartTime : null;
        navStartTime = 0;

        const toLocation = state.toLocation;
        if (!toLocation) return;

        const pathname = toLocation.pathname || "/";
        const params =
          toLocation.params && Object.keys(toLocation.params).length > 0 ? JSON.stringify(toLocation.params) : null;

        const matches = state.matches || [];
        const lastMatch = matches[matches.length - 1];
        const routeId = lastMatch?.routeId || lastMatch?.id || lastMatch?.route?.id || toLocation.href || pathname;

        // SAFETY: Casting import.meta to structural interface containing optional hot client
        const hotMeta = import.meta as HotMeta;
        if (hotMeta.hot) {
          hotMeta.hot.send("vite-plugin-logger:tanstack-route", {
            routeId,
            path: pathname,
            params,
            durationMs,
            isPreload: false,
          });
        }
      } catch {
        // Ignore logging errors in production or during unmount
      }
    });
  } catch {
    // Ignore if onResolved is not supported
  }

  try {
    router.subscribe("onPreloaded", (state: TanStackResolvedState) => {
      try {
        const toLocation = state.toLocation;
        if (!toLocation) return;

        const pathname = toLocation.pathname || "/";
        // SAFETY: Casting import.meta to structural interface containing optional hot client
        const hotMeta = import.meta as HotMeta;
        if (hotMeta.hot) {
          hotMeta.hot.send("vite-plugin-logger:tanstack-route", {
            routeId: pathname,
            path: pathname,
            params: null,
            durationMs: null,
            isPreload: true,
          });
        }
      } catch {
        // Ignore
      }
    });
  } catch {
    // onPreloaded might not be supported on all versions
  }
}

export { browserLogger };
