export interface TanStackRouteMatch {
  routeId?: string;
  id?: string;
  params?: Record<string, string | number | boolean>;
  route?: { id?: string };
}

export interface TanStackLocation {
  pathname?: string;
  href?: string;
  params?: Record<string, string | number | boolean>;
}

export interface TanStackResolvedState {
  toLocation?: TanStackLocation;
  fromLocation?: TanStackLocation;
  matches?: TanStackRouteMatch[];
}

export interface TanStackRouterLike {
  state?: {
    matches?: TanStackRouteMatch[];
    location?: TanStackLocation;
    resolvedLocation?: TanStackLocation;
  };
  subscribe(
    event: "onBeforeNavigate" | "onResolved" | "onPreloaded" | string,
    callback: (event: any) => void,
  ): (() => void) | void;
}

interface HotClient {
  send(event: string, payload: Record<string, string | number | boolean | null | undefined>): void;
}

interface HotMeta {
  hot?: HotClient;
}

/**
 * Set `localStorage.setItem("vite-plugin-hyperlog:debug", "1")` to surface the
 * errors this module swallows.
 *
 * Swallowing is deliberate: this is telemetry, and a logging failure must never
 * break the host app or a router navigation. But silent catches make genuine
 * bugs invisible, so failures are reported when debugging is explicitly enabled.
 */
const DEBUG_KEY = "vite-plugin-hyperlog:debug";

function isDebugEnabled(): boolean {
  try {
    // localStorage throws in sandboxed frames and some privacy modes.
    return import.meta.env?.DEV === true && globalThis.localStorage?.getItem(DEBUG_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Reports a swallowed failure when debugging is enabled.
 *
 * Takes a rendered string rather than the thrown value: the value is untrusted
 * and never inspected, and a `catch` binding cannot be annotated with anything
 * narrower than `unknown`, so stringifying at the catch site keeps this honest.
 */
function reportSwallowed(where: string, detail: string): void {
  if (!isDebugEnabled()) return;
  console.warn(`[vite-plugin-hyperlog] ${where} failed: ${detail}`);
}

declare global {
  var __HYPERLOG_HOT__: HotClient | undefined;
  // Set by @vitejs/plugin-react's preamble. TanStack apps commonly use the React
  // plugin, so this stays as a fallback for when this module is evaluated before
  // `import.meta.hot` is populated. It is read defensively and never assumed.
  var __vite_plugin_react_preamble_installed__: HotClient | undefined;
}

function sendRouteEvent(payload: {
  routeId: string;
  path: string;
  params: string | null;
  durationMs: number | null;
  isPreload: boolean;
}): void {
  try {
    // SAFETY: Casting import.meta to structural interface containing optional hot client
    const hotMeta = import.meta as HotMeta;
    const hot =
      hotMeta?.hot ||
      ("window" in globalThis
        ? globalThis.__HYPERLOG_HOT__ || globalThis.__vite_plugin_react_preamble_installed__
        : null);
    if (hot && "send" in hot) {
      hot.send("vite-plugin-hyperlog:tanstack-route", payload);
      return;
    }
  } catch (err) {
    reportSwallowed("hot transport", String(err));
  }

  try {
    if ("fetch" in globalThis) {
      fetch("/__hyperlog/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((err: Error) => reportSwallowed("fetch transport", err.message));
    }
  } catch (err) {
    reportSwallowed("fetch transport", String(err));
  }
}

/**
 * Client-side subscriber for TanStack Router.
 * Import this in your client entry or router.tsx to log SPA navigations and preloads to the terminal.
 *
 * @example
 * ```ts
 * import { registerTanStackRouterLogger } from "vite-plugin-hyperlog/tanstack/client";
 * export const router = createRouter({ routeTree });
 * registerTanStackRouterLogger(router);
 * ```
 */
export function registerTanStackRouterLogger(router: TanStackRouterLike): void {
  // Imported from app code, this module is not covered by the server plugins'
  // `apply: "serve"` gate, so guard explicitly to keep it out of production bundles.
  if (!import.meta.env?.DEV) {
    return;
  }
  if (!("window" in globalThis) || !router || !("subscribe" in router)) {
    return;
  }

  let navStartTime = 0;

  try {
    router.subscribe("onBeforeNavigate", () => {
      navStartTime = performance.now();
    });
  } catch (err) {
    // Older routers may not support this event at all.
    reportSwallowed("subscribe onBeforeNavigate", String(err));
  }

  try {
    router.subscribe("onResolved", (event: any) => {
      try {
        const durationMs = navStartTime ? performance.now() - navStartTime : null;
        navStartTime = 0;

        const toLocation =
          event?.toLocation ||
          router.state?.resolvedLocation ||
          router.state?.location ||
          ("window" in globalThis && globalThis.window ? globalThis.window.location : null);
        if (!toLocation) return;

        const pathname = toLocation.pathname || "/";

        const matches =
          router.state?.matches && router.state.matches.length > 0 ? router.state.matches : event?.matches || [];

        const validMatches = matches.filter(
          (m: any) => m && (m.routeId || m.id) && m.routeId !== "__root__" && m.id !== "__root__",
        );
        const lastMatch = validMatches[validMatches.length - 1];

        let rawRouteId = lastMatch?.routeId || lastMatch?.id || lastMatch?.route?.id || toLocation.href || pathname;

        if (rawRouteId && rawRouteId.length > 1 && rawRouteId.endsWith("/")) {
          rawRouteId = rawRouteId.slice(0, -1);
        }

        const paramsObj =
          toLocation.params && Object.keys(toLocation.params).length > 0
            ? toLocation.params
            : lastMatch?.params && Object.keys(lastMatch.params).length > 0
              ? lastMatch.params
              : null;

        const params = paramsObj ? JSON.stringify(paramsObj) : null;

        sendRouteEvent({
          routeId: rawRouteId,
          path: pathname,
          params,
          durationMs,
          isPreload: false,
        });
      } catch (err) {
        // A router event handler must never throw back into the router.
        reportSwallowed("onResolved handler", String(err));
      }
    });
  } catch (err) {
    // Older routers may not support this event at all.
    reportSwallowed("subscribe onResolved", String(err));
  }

  try {
    router.subscribe("onPreloaded", (event: any) => {
      try {
        const toLocation = event?.toLocation;
        if (!toLocation) return;

        const pathname = toLocation.pathname || "/";
        const matches = event?.matches || [];
        const validMatches = matches.filter(
          (m: any) => m && (m.routeId || m.id) && m.routeId !== "__root__" && m.id !== "__root__",
        );
        const lastMatch = validMatches[validMatches.length - 1];
        let rawRouteId = lastMatch?.routeId || lastMatch?.id || lastMatch?.route?.id || event?.routeId || pathname;

        if (rawRouteId && rawRouteId.length > 1 && rawRouteId.endsWith("/")) {
          rawRouteId = rawRouteId.slice(0, -1);
        }

        sendRouteEvent({
          routeId: rawRouteId,
          path: pathname,
          params: null,
          durationMs: null,
          isPreload: true,
        });
      } catch (err) {
        // A router event handler must never throw back into the router.
        reportSwallowed("onPreloaded handler", String(err));
      }
    });
  } catch (err) {
    // onPreloaded might not be supported on all versions.
    reportSwallowed("subscribe onPreloaded", String(err));
  }
}
