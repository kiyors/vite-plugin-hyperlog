import { C as formatSummaryLine, D as require_vite_plugin_logger, S as createSummaryTracker, _ as logServerFnCall, b as buildRequestEvent, d as routeEventSinkHandler, h as detectServerFunction, i as browserLogger, m as captureServerFnBodies, n as allocateExclusionConfigId, r as attachRouteEndpoint, t as DEFAULT_EXCLUDE_URLS, v as parseServerFnArgs, x as createLogSink, y as parseServerFnResult } from "./plugin-shared.mjs";
import fs from "node:fs";
import path from "node:path";
//#region src/tanstack.ts
var import_vite_plugin_logger = require_vite_plugin_logger();
function parseRouteTreeContent(content) {
	const routes = /* @__PURE__ */ new Set();
	try {
		const astRoutes = (0, import_vite_plugin_logger.parseRouteTreeAst)(content);
		for (const r of astRoutes) routes.add(r);
	} catch {}
	if (routes.size === 0) {
		const fullPathMatches = Array.from(content.matchAll(/fullPath:\s*['"](\/[^'"]*)['"]/g));
		if (fullPathMatches.length > 0) for (const match of fullPathMatches) {
			const p = match[1].trim();
			if (p && !p.startsWith("/@") && !p.startsWith("/api") && !p.includes("node_modules")) routes.add(p);
		}
		else {
			const matches = content.matchAll(/(?:fullPath|path|id):\s*['"](\/[^'"]*)['"]/g);
			for (const match of matches) {
				const p = match[1].trim();
				if (p && !p.startsWith("/@") && !p.startsWith("/api") && !p.includes("node_modules")) routes.add(p);
			}
		}
	}
	for (const route of Array.from(routes)) if (route.startsWith("/$") && route.split("/").filter(Boolean).length === 1) {
		if (Array.from(routes).some((other) => other !== route && other.endsWith(route))) routes.delete(route);
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
		const patternRegex = "^" + route.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\\\$/g, "$").replace(/\$([a-zA-Z0-9_]+)?/g, (_m, p1) => p1 ? "[^/]+" : ".*").replace(/\/$/, "") + "\\/?$";
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
const TANSTACK_EXCLUDE_PATTERNS = [
	"?tsr-split",
	"virtual:tanstack-start",
	"/@id/virtual:",
	"/@id/"
];
function requestLogger(config) {
	const excludeModules = config?.excludeModules ?? true;
	const matchRouteTree = config?.matchRouteTree ?? true;
	const groupServerFn = config?.groupServerFn ?? true;
	const groupWindowMs = config?.groupServerFnWindowMs ?? 80;
	let routeMatchers = [];
	let routePatterns = [];
	const routeCache = /* @__PURE__ */ new Map();
	const pendingServerFns = /* @__PURE__ */ new Map();
	const MAX_PENDING_SERVER_FNS = 250;
	const sf = config?.serverFunctions;
	const serverFnConfig = Boolean(sf) && sf !== true ? sf : null;
	const isServerFnLoggingEnabled = serverFnConfig !== null && serverFnConfig.enabled !== false;
	const serverFnFormat = serverFnConfig?.format ?? "tree";
	const jsonMode = config?.json === true;
	const summaryConfig = config?.summaryStats;
	const summaryEnabled = summaryConfig !== false;
	const summaryOptions = summaryEnabled && summaryConfig !== true ? summaryConfig ?? {} : {};
	const summaryWindowMs = Math.max(200, summaryOptions.windowMs ?? 1e4);
	const allExclusions = [...[
		...DEFAULT_EXCLUDE_URLS,
		...config?.excludeUrls || [],
		...config?.excludeApis ? ["/api"] : []
	], ...TANSTACK_EXCLUDE_PATTERNS];
	const excludedMethods = config?.excludeReqType ? new Set(config.excludeReqType.map((type) => type.toUpperCase())) : null;
	const exclusionConfigId = allocateExclusionConfigId();
	(0, import_vite_plugin_logger.registerExclusionConfig)(exclusionConfigId, allExclusions, excludeModules);
	const resolveRouteName = (url) => {
		if (config?.resolveRoute) {
			const custom = config.resolveRoute(url);
			if (custom) return custom;
		}
		if (!matchRouteTree || routeMatchers.length === 0) return null;
		const cleanPath = url.split("?")[0];
		if (cleanPath.startsWith("/@") || cleanPath.startsWith("/node_modules") || cleanPath.includes("node_modules") || cleanPath.startsWith("/api") || cleanPath.startsWith("/_serverFn")) return null;
		const cached = routeCache.get(cleanPath);
		if (cached !== void 0) return cached;
		const pattern = (0, import_vite_plugin_logger.matchRoutePath)(cleanPath, routePatterns);
		if (routeCache.size > 256) routeCache.clear();
		routeCache.set(cleanPath, pattern);
		return pattern;
	};
	return {
		name: "vite-plugin-request-logging-tanstack",
		apply: "serve",
		configureServer(server) {
			const sink = createLogSink({
				json: jsonMode,
				stripColors: config?.stripColors
			});
			const summary = summaryEnabled ? createSummaryTracker(summaryOptions) : null;
			let summaryFlushQueued = false;
			const flushServerFn = (key) => {
				const entry = pendingServerFns.get(key);
				if (!entry) return;
				pendingServerFns.delete(key);
				const avgDuration = entry.totalDuration / entry.count;
				const logString = (0, import_vite_plugin_logger.formatLogEntry)(entry.url, entry.method, entry.status, avgDuration, entry.contentLength, entry.redirectLocation, entry.routeName, entry.count > 1 ? entry.count : null);
				sink.print(logString, buildRequestEvent(entry.url, entry.method, entry.status, avgDuration, {
					contentLength: entry.contentLength,
					location: entry.redirectLocation,
					route: entry.routeName,
					repeat: entry.count > 1 ? entry.count : null
				}));
			};
			const treeRelativePath = config?.routeTreePath || "src/routeTree.gen.ts";
			const treeAbsolutePath = path.resolve(server.config.root, treeRelativePath);
			const loadRoutes = () => {
				try {
					if (fs.existsSync(treeAbsolutePath)) {
						routeMatchers = parseRouteTreeContent(fs.readFileSync(treeAbsolutePath, "utf-8"));
						routePatterns = routeMatchers.map((m) => m.pattern);
						routeCache.clear();
					}
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
				sink.flush();
			});
			const handleTanStackRoute = routeEventSinkHandler(sink);
			server.ws.on("vite-plugin-hyperlog:tanstack-route", handleTanStackRoute);
			attachRouteEndpoint(server, handleTanStackRoute);
			server.middlewares.use((req, res, next) => {
				const url = req.originalUrl || "";
				const method = req.method || "GET";
				const observation = (0, import_vite_plugin_logger.observeRequest)(exclusionConfigId, url);
				if (excludedMethods && excludedMethods.has(method.toUpperCase())) return next();
				if (observation.excluded) return next();
				const serverFnDetails = isServerFnLoggingEnabled ? detectServerFunction(url, req.headers, serverFnConfig?.resolveServerFn, req) : null;
				const { bodyBytes, resBytes } = captureServerFnBodies(req, res, serverFnDetails !== null && serverFnConfig?.logArgs !== false && method !== "GET", serverFnDetails !== null && serverFnConfig?.logReturns !== false);
				const start = performance.now();
				let logged = false;
				const logIt = (aborted) => {
					if (logged) return;
					logged = true;
					res.removeListener("finish", onFinish);
					res.removeListener("close", onClose);
					const durationMs = performance.now() - start;
					const status = aborted && !res.writableEnded ? 499 : res.statusCode;
					if (summary) {
						summary.record(durationMs);
						if (!summaryFlushQueued) {
							summaryFlushQueued = true;
							queueMicrotask(() => {
								summaryFlushQueued = false;
								const sample = summary.poll();
								if (sample) sink.print(formatSummaryLine(sample, summaryWindowMs), {
									kind: "summary",
									ts: Date.now(),
									windowMs: summaryWindowMs,
									...sample
								});
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
						const parsedArgs = serverFnConfig?.logArgs !== false ? parseServerFnArgs(url, method, req.headers, bodyBytes) : void 0;
						const parsedResult = serverFnConfig?.logReturns !== false ? parseServerFnResult(status, resBytes) : void 0;
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
								maxStringLength: serverFnConfig?.maxStringLength
							},
							browserConsole: serverFnConfig?.browserConsole === true
						});
						return;
					}
					if (isServerFn && groupServerFn) {
						const key = `${method}:${url}:${status}`;
						const existing = pendingServerFns.get(key);
						if (existing) {
							existing.count += 1;
							existing.totalDuration += durationMs;
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
					sink.print(logString, buildRequestEvent(url, method, status, durationMs, {
						contentLength,
						location: redirectLocation,
						route: routeName
					}));
				};
				const onFinish = () => logIt(false);
				const onClose = () => logIt(true);
				res.on("finish", onFinish);
				res.on("close", onClose);
				next();
			});
		}
	};
}
/**
* Convenient unified TanStack logger plugin that registers both requestLogger and browserLogger.
*/
function tanstackLogger(config) {
	const sf = config?.serverFunctions;
	const sfConfig = Boolean(sf) && sf !== true ? sf : void 0;
	const uiEnabled = config?.serverFunctions !== false && sfConfig?.ui !== false;
	return [requestLogger(config), browserLogger({
		serverFunctionUi: uiEnabled,
		json: config?.json === true,
		stripColors: config?.stripColors
	})];
}
//#endregion
export { browserLogger, tanstackLogger as default, tanstackLogger, parseRouteTreeContent, requestLogger };
