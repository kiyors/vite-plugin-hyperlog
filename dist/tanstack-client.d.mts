//#region src/tanstack-client.d.ts
interface TanStackRouteMatch {
  routeId?: string;
  id?: string;
  params?: Record<string, string | number | boolean>;
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
  fromLocation?: TanStackLocation;
  matches?: TanStackRouteMatch[];
}
interface TanStackRouterLike {
  state?: {
    matches?: TanStackRouteMatch[];
    location?: TanStackLocation;
    resolvedLocation?: TanStackLocation;
  };
  subscribe(event: "onBeforeNavigate" | "onResolved" | "onPreloaded" | string, callback: (event: any) => void): (() => void) | void;
}
interface HotClient {
  send(event: string, payload: Record<string, string | number | boolean | null | undefined>): void;
}
declare global {
  var __HYPERLOG_HOT__: HotClient | undefined;
  var __vite_plugin_react_preamble_installed__: HotClient | undefined;
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
declare function registerTanStackRouterLogger(router: TanStackRouterLike): void;
//#endregion
export { TanStackLocation, TanStackResolvedState, TanStackRouteMatch, TanStackRouterLike, registerTanStackRouterLogger };