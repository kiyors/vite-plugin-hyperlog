import { RequestLoggerConfig, browserLogger } from "./plugin.mjs";
import { Plugin } from "vite";
//#region src/tanstack.d.ts
interface TanStackLoggerConfig extends RequestLoggerConfig {
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
interface RouteMatcher {
  pattern: string;
  regex: RegExp;
}
declare function parseRouteTreeContent(content: string): RouteMatcher[];
declare function requestLogger(config?: TanStackLoggerConfig): Plugin;
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
 * ```ts
 * import { registerTanStackRouterLogger } from "@kiyors/vite-plugin-logger/tanstack";
 * export const router = createRouter({ routeTree });
 * registerTanStackRouterLogger(router);
 * ```
 */
declare function registerTanStackRouterLogger(router: TanStackRouterLike): void;
//#endregion
export { RouteMatcher, TanStackLocation, TanStackLoggerConfig, TanStackResolvedState, TanStackRouteMatch, TanStackRouterLike, browserLogger, parseRouteTreeContent, registerTanStackRouterLogger, requestLogger };