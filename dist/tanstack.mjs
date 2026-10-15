import { d as formatPayload, f as parseServerFnArgs, m as require_vite_plugin_logger, n as browserLogger, p as parseServerFnResult, t as attachRouteEndpoint, u as detectServerFunction } from "./plugin-shared.mjs";
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
const DEFAULT_EXCLUDE_URLS = [
	"?import",
	"vite_ping",
	"@fs",
	"/@vite",
	"/@react-refresh",
	"node_modules",
	"/.well-known",
	"/__hyperlog"
];
const TANSTACK_EXCLUDE_PATTERNS = [
	"?tsr-split",
	"virtual:tanstack-start",
	"/@id/virtual:",
	"/@id/",
	"/@fs/"
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
	const allExclusions = [...[
		...DEFAULT_EXCLUDE_URLS,
		...config?.excludeUrls || [],
		...config?.excludeApis ? ["/api"] : []
	], ...TANSTACK_EXCLUDE_PATTERNS];
	const excludedMethods = config?.excludeReqType ? new Set(config.excludeReqType.map((type) => type.toUpperCase())) : null;
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
			});
			const handleTanStackRoute = (data) => {
				const { routeId, path, params, durationMs, isPreload } = data;
				const logString = (0, import_vite_plugin_logger.formatRouteLog)(routeId || path, path, params ?? null, durationMs ? Number(durationMs) : null, Boolean(isPreload));
				if (logString) console.log(logString);
			};
			server.ws.on("vite-plugin-hyperlog:tanstack-route", handleTanStackRoute);
			attachRouteEndpoint(server, handleTanStackRoute);
			server.middlewares.use((req, res, next) => {
				const url = req.originalUrl || "";
				const method = req.method || "GET";
				if (excludedMethods && excludedMethods.has(method.toUpperCase())) return next();
				if ((0, import_vite_plugin_logger.shouldExcludeRequest)(url, allExclusions, excludeModules)) return next();
				const sf = config?.serverFunctions;
				const serverFnConfig = Boolean(sf) && sf !== true ? sf : null;
				const isServerFnLoggingEnabled = serverFnConfig !== null && serverFnConfig.enabled !== false;
				const serverFnFormat = serverFnConfig?.format ?? "tree";
				const serverFnDetails = isServerFnLoggingEnabled ? detectServerFunction(url, req.headers, serverFnConfig?.resolveServerFn, req) : null;
				const bodyBytes = [];
				let totalBodyLen = 0;
				const MAX_CAPTURE_BYTES = 65536;
				if (serverFnDetails && serverFnConfig?.logArgs !== false && method !== "GET") {
					const origEmit = req.emit;
					req.emit = function(event, ...args) {
						if (event === "data" && totalBodyLen < MAX_CAPTURE_BYTES) {
							const chunk = args[0];
							const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
							bodyBytes.push(b);
							totalBodyLen += b.length;
						}
						return origEmit.apply(this, [event, ...args]);
					};
				}
				const resBytes = [];
				let totalResLen = 0;
				if (serverFnDetails && serverFnConfig?.logReturns !== false) {
					const origWrite = res.write;
					const origEnd = res.end;
					res.write = function(chunk, ...args) {
						if (chunk && totalResLen < MAX_CAPTURE_BYTES) {
							const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
							resBytes.push(b);
							totalResLen += b.length;
						}
						return origWrite.apply(this, [chunk, ...args]);
					};
					res.end = function(chunk, ...args) {
						if (chunk && totalResLen < MAX_CAPTURE_BYTES) {
							const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
							resBytes.push(b);
							totalResLen += b.length;
						}
						return origEnd.apply(this, [chunk, ...args]);
					};
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
					if (serverFnDetails) {
						const parsedArgs = serverFnConfig?.logArgs !== false ? parseServerFnArgs(url, method, req.headers, bodyBytes) : void 0;
						const parsedResult = serverFnConfig?.logReturns !== false ? parseServerFnResult(status, resBytes) : void 0;
						const formattedArgs = parsedArgs !== void 0 ? formatPayload(parsedArgs, {
							maxDepth: serverFnConfig?.maxDepth,
							maxBreadth: serverFnConfig?.maxBreadth,
							maxStringLength: serverFnConfig?.maxStringLength
						}) : null;
						const formattedResult = parsedResult !== void 0 ? formatPayload(parsedResult, {
							maxDepth: serverFnConfig?.maxDepth,
							maxBreadth: serverFnConfig?.maxBreadth,
							maxStringLength: serverFnConfig?.maxStringLength
						}) : null;
						if (serverFnFormat === "tree") {
							const requestLine = (0, import_vite_plugin_logger.formatLogEntry)(url, method, status, durationMs, contentLength, redirectLocation, routeName, null);
							if (requestLine) console.log(requestLine);
							const fnLine = (0, import_vite_plugin_logger.formatServerFnLog)(serverFnDetails.functionName, serverFnDetails.filePath, serverFnDetails.lineNumber ?? null, status, durationMs, formattedArgs, formattedResult, true, null);
							if (fnLine) console.log(fnLine);
						} else {
							const fnLine = (0, import_vite_plugin_logger.formatServerFnLog)(serverFnDetails.functionName, serverFnDetails.filePath, serverFnDetails.lineNumber ?? null, status, durationMs, formattedArgs, formattedResult, false, null);
							if (fnLine) console.log(fnLine);
						}
						try {
							server.ws.send({
								type: "custom",
								event: "vite-plugin-hyperlog:server-fn",
								data: {
									name: serverFnDetails.functionName,
									file: serverFnDetails.filePath,
									status,
									durationMs,
									args: parsedArgs,
									result: parsedResult,
									browserConsole: Boolean(serverFnConfig?.browserConsole)
								}
							});
						} catch {}
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
* Convenient unified TanStack logger plugin that registers both requestLogger and browserLogger.
*/
function tanstackLogger(config) {
	const sf = config?.serverFunctions;
	const sfConfig = Boolean(sf) && sf !== true ? sf : void 0;
	const uiEnabled = config?.serverFunctions !== false && sfConfig?.ui !== false;
	return [requestLogger(config), browserLogger({ serverFunctionUi: uiEnabled })];
}
//#endregion
export { browserLogger, tanstackLogger as default, tanstackLogger, parseRouteTreeContent, requestLogger };
