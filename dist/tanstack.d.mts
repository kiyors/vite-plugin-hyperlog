import { n as RequestLoggerConfig, r as browserLogger } from "./plugin-AMSmCQRy.mjs";
import { TanStackLocation, TanStackResolvedState, TanStackRouteMatch, TanStackRouterLike, registerTanStackRouterLogger } from "./tanstack-client.mjs";
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
/**
 * Convenient unified TanStack logger plugin that registers both requestLogger and browserLogger.
 */
declare function tanstackLogger(config?: TanStackLoggerConfig): Plugin[];
//#endregion
export { RouteMatcher, TanStackLocation, TanStackLoggerConfig, TanStackResolvedState, TanStackRouteMatch, TanStackRouterLike, browserLogger, tanstackLogger as default, tanstackLogger, parseRouteTreeContent, registerTanStackRouterLogger, requestLogger };