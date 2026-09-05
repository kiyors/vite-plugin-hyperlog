//#region src/tanstack-client.ts
/**
* Client-side subscriber for TanStack Router.
* Import this in your client entry or router.tsx to log SPA navigations and preloads to the terminal.
*
* @example
* Import this in your client entry or router.tsx to log SPA navigations, preloads, and browser logs to the terminal.
*
* @example
* ```ts
* import { registerTanStackRouterLogger } from "vite-plugin-hyperlog/tanstack/client";
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
				if (hotMeta.hot) hotMeta.hot.send("vite-plugin-hyperlog:tanstack-route", {
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
				const matches = state.matches || [];
				const lastMatch = matches[matches.length - 1];
				const routeId = lastMatch?.routeId || lastMatch?.id || lastMatch?.route?.id || pathname;
				const hotMeta = import.meta;
				if (hotMeta.hot) hotMeta.hot.send("vite-plugin-hyperlog:tanstack-route", {
					routeId,
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
export { registerTanStackRouterLogger };
