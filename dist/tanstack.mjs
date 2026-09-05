import { browserLogger, t as require_vite_plugin_logger } from "./plugin.mjs";
import fs from "node:fs";
import path from "node:path";
//#region src/tanstack.ts
var import_vite_plugin_logger = require_vite_plugin_logger();
function parseRouteTreeContent(content) {
	const routes = /* @__PURE__ */ new Set();
	try {
		const astRoutes = (0, import_vite_plugin_logger.parseRouteTreeAst)(content);
		for (const r of astRoutes) routes.add(r);
	} catch {
		const matches = content.matchAll(/(?:fullPath|path|id):\s*['"](\/[^'"]*)['"]/g);
		for (const match of matches) {
			const p = match[1].trim();
			if (p && !p.startsWith("/api") && !p.includes("node_modules")) routes.add(p);
		}
	}
	if (routes.size === 0) {
		const matches = content.matchAll(/(?:fullPath|path|id):\s*['"](\/[^'"]*)['"]/g);
		for (const match of matches) {
			const p = match[1].trim();
			if (p && !p.startsWith("/api") && !p.includes("node_modules")) routes.add(p);
		}
	}
	const matchers = [];
	for (const route of routes) {
		if (route === "/") {
			matchers.push({
				pattern: "/",
				regex: /^\/?$/
			});
			continue;
		}
		const patternRegex = "^" + route.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\\\$/g, "$").replace(/\$([a-zA-Z0-9_]+)/g, "[^/]+").replace(/\/$/, "") + "\\/?$";
		try {
			matchers.push({
				pattern: route,
				regex: new RegExp(patternRegex)
			});
		} catch {}
	}
	matchers.sort((a, b) => {
		const aParts = a.pattern.split("/").filter(Boolean);
		const bParts = b.pattern.split("/").filter(Boolean);
		if (aParts.length !== bParts.length) return bParts.length - aParts.length;
		return (a.pattern.match(/\$/g) || []).length - (b.pattern.match(/\$/g) || []).length;
	});
	return matchers;
}
const DEFAULT_EXCLUDE_URLS = [
	"?import",
	"vite_ping",
	"@fs",
	"/@vite/client"
];
const TANSTACK_EXCLUDE_PATTERNS = [
	"?tsr-split",
	"virtual:tanstack-start",
	"/@id/virtual:"
];
function isSourceModule(url) {
	if (url.startsWith("/api") || url.startsWith("/_serverFn")) return false;
	const cleanPath = url.split("?")[0];
	return cleanPath.startsWith("/src/") && (cleanPath.endsWith(".tsx") || cleanPath.endsWith(".ts") || cleanPath.endsWith(".jsx") || cleanPath.endsWith(".js") || cleanPath.endsWith(".css"));
}
function requestLogger(config) {
	const excludeModules = config?.excludeModules ?? true;
	const matchRouteTree = config?.matchRouteTree ?? true;
	const groupServerFn = config?.groupServerFn ?? true;
	const groupWindowMs = config?.groupServerFnWindowMs ?? 80;
	let routeMatchers = [];
	const pendingServerFns = /* @__PURE__ */ new Map();
	const flushServerFn = (key) => {
		const entry = pendingServerFns.get(key);
		if (!entry) return;
		pendingServerFns.delete(key);
		const avgDuration = entry.totalDuration / entry.count;
		const logString = (0, import_vite_plugin_logger.formatLogEntry)(entry.url, entry.method, entry.status, avgDuration, entry.contentLength, entry.redirectLocation, entry.routeName, entry.count > 1 ? entry.count : null);
		if (logString) console.log(logString);
	};
	const resolveRouteName = (url) => {
		if (config?.resolveRoute) {
			const custom = config.resolveRoute(url);
			if (custom) return custom;
		}
		if (!matchRouteTree || routeMatchers.length === 0) return null;
		const cleanPath = url.split("?")[0];
		for (const matcher of routeMatchers) if (matcher.regex.test(cleanPath)) return matcher.pattern;
		return null;
	};
	return {
		name: "vite-plugin-request-logging-tanstack",
		apply: "serve",
		configureServer(server) {
			const treeRelativePath = config?.routeTreePath || "src/routeTree.gen.ts";
			const treeAbsolutePath = path.resolve(server.config.root, treeRelativePath);
			const loadRoutes = () => {
				try {
					if (fs.existsSync(treeAbsolutePath)) routeMatchers = parseRouteTreeContent(fs.readFileSync(treeAbsolutePath, "utf-8"));
				} catch {}
			};
			loadRoutes();
			server.watcher.on("change", (changedFile) => {
				if (path.resolve(changedFile) === treeAbsolutePath) loadRoutes();
			});
			server.httpServer?.on("close", () => {
				for (const [key, entry] of pendingServerFns.entries()) {
					clearTimeout(entry.timer);
					flushServerFn(key);
				}
			});
			server.middlewares.use((req, res, next) => {
				const url = req.originalUrl || "";
				const method = req.method || "GET";
				if (config?.excludeReqType && config.excludeReqType.some((type) => type.toLowerCase() === method.toLowerCase())) return next();
				if ([...DEFAULT_EXCLUDE_URLS, ...config?.excludeUrls || []].some((match) => url.includes(match))) return next();
				if (excludeModules) {
					if (TANSTACK_EXCLUDE_PATTERNS.some((pattern) => url.includes(pattern))) return next();
					if (isSourceModule(url)) return next();
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
					if (url.startsWith("/_serverFn") && groupServerFn) {
						const key = `${method}:${url}:${status}`;
						const existing = pendingServerFns.get(key);
						if (existing) {
							existing.count += 1;
							existing.totalDuration += durationMs;
							clearTimeout(existing.timer);
							existing.timer = setTimeout(() => flushServerFn(key), groupWindowMs);
							return;
						}
						const entry = {
							count: 1,
							totalDuration: durationMs,
							url,
							method,
							status,
							contentLength,
							redirectLocation,
							routeName,
							timer: setTimeout(() => flushServerFn(key), groupWindowMs)
						};
						pendingServerFns.set(key, entry);
						return;
					}
					const logString = (0, import_vite_plugin_logger.formatLogEntry)(url, method, status, durationMs, contentLength, redirectLocation, routeName, null);
					if (logString) console.log(logString);
				};
				res.on("finish", logIt);
				res.on("close", logIt);
				next();
			});
		}
	};
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
function registerTanStackRouterLogger(router) {
	if (!("window" in globalThis) || !router || !("subscribe" in router)) return;
	let navStartTime = 0;
	try {
		router.subscribe("onBeforeNavigate", () => {
			navStartTime = performance.now();
		});
	} catch {}
	try {
		router.subscribe("onResolved", (state) => {
			try {
				const durationMs = navStartTime ? performance.now() - navStartTime : null;
				navStartTime = 0;
				const toLocation = state.toLocation;
				if (!toLocation) return;
				const pathname = toLocation.pathname || "/";
				const params = toLocation.params && Object.keys(toLocation.params).length > 0 ? JSON.stringify(toLocation.params) : null;
				const matches = state.matches || [];
				const lastMatch = matches[matches.length - 1];
				const routeId = lastMatch?.routeId || lastMatch?.id || lastMatch?.route?.id || toLocation.href || pathname;
				const hotMeta = import.meta;
				if (hotMeta.hot) hotMeta.hot.send("vite-plugin-logger:tanstack-route", {
					routeId,
					path: pathname,
					params,
					durationMs,
					isPreload: false
				});
			} catch {}
		});
	} catch {}
	try {
		router.subscribe("onPreloaded", (state) => {
			try {
				const toLocation = state.toLocation;
				if (!toLocation) return;
				const pathname = toLocation.pathname || "/";
				const hotMeta = import.meta;
				if (hotMeta.hot) hotMeta.hot.send("vite-plugin-logger:tanstack-route", {
					routeId: pathname,
					path: pathname,
					params: null,
					durationMs: null,
					isPreload: true
				});
			} catch {}
		});
	} catch {}
}
//#endregion
export { browserLogger, parseRouteTreeContent, registerTanStackRouterLogger, requestLogger };
