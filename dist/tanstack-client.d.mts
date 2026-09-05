//#region src/tanstack-client.d.ts
interface TanStackRouteMatch {
  routeId?: string;
  id?: string;
  route?: {
    id?: string;
  };
}
interface TanStackLocation {
  pathname?: string;
  href?: string;
  params?: Record<string, string | number | boolean>;
}
interface TanStackResolvedState {
  toLocation?: TanStackLocation;
  matches?: TanStackRouteMatch[];
}
interface TanStackRouterLike {
  subscribe(event: "onBeforeNavigate" | "onResolved" | "onPreloaded" | string, callback: (state: TanStackResolvedState) => void): void;
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
 * import { registerTanStackRouterLogger } from "vite-plugin-hyperlog/tanstack/client";
 * export const router = createRouter({ routeTree });
 * registerTanStackRouterLogger(router);
 * ```
 */
declare function registerTanStackRouterLogger(router: TanStackRouterLike): void;
//#endregion
export { TanStackLocation, TanStackResolvedState, TanStackRouteMatch, TanStackRouterLike, registerTanStackRouterLogger };