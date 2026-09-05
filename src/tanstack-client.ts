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
 * Import this in your client entry or router.tsx to log SPA navigations, preloads, and browser logs to the terminal.
 *
 * @example
 * ```ts
 * import { registerTanStackRouterLogger } from "@kiyors/vite-plugin-logger/tanstack/client";
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
        const matches = state.matches || [];
        const lastMatch = matches[matches.length - 1];
        const routeId = lastMatch?.routeId || lastMatch?.id || lastMatch?.route?.id || pathname;

        // SAFETY: Casting import.meta to structural interface containing optional hot client
        const hotMeta = import.meta as HotMeta;
        if (hotMeta.hot) {
          hotMeta.hot.send("vite-plugin-logger:tanstack-route", {
            routeId,
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
