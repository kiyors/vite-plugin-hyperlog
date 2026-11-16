import { i as RequestLoggerConfig, l as browserLogger$1 } from "./plugin-shared.mjs";
import { Plugin } from "vite";
//#region src/tanstack.d.ts
export interface TanStackLoggerConfig extends RequestLoggerConfig {
  /**
   * Filter out internal Vite module compilation noise (/src/***.tsx, /node_modules/, ?tsr-split, etc.)
   * @default true
   */
  excludeModules?: boolean;
  /**
   * Filter out /api endpoint requests from terminal logs
   * @default false
   */
  excludeApis?: boolean;
  /**
   * Filter out static asset requests (images, fonts, stylesheets, etc.) from terminal logs.
   * @default true
   */
  excludeAssets?: boolean;
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
export interface RouteMatcher {
  pattern: string;
  regex: RegExp;
}
export declare function parseRouteTreeContent(content: string): RouteMatcher[];
export declare function requestLogger(config?: TanStackLoggerConfig): Plugin;
/**
 * TanStack apps report navigations from `registerTanStackRouterLogger`, so the
 * generic History API reporter is disabled here to avoid duplicate route lines.
 */
declare const browserLogger: typeof browserLogger$1;
/**
 * Convenient unified TanStack logger plugin that registers both requestLogger and browserLogger.
 */
export declare function tanstackLogger(config?: TanStackLoggerConfig): Plugin[];
//#endregion
export { browserLogger, tanstackLogger as default };