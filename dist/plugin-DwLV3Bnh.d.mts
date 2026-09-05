import { Plugin } from "vite";
//#region index.d.ts
interface RemappedPosition {
  source?: string;
  line: number;
  column: number;
  name?: string;
}
declare function remapSourcePosition(sourcemapJson: string, line: number, column: number): RemappedPosition | null;
declare function remapStackTrace(sourcemapJson: string, stack: string): string;
//#endregion
//#region src/plugin.d.ts
type ReqType = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD" | "get" | "post" | "put" | "patch" | "delete" | "options" | "head" | "Get" | "Post" | "Put" | "Patch" | "Delete" | "Options" | "Head";
interface RequestLoggerConfig {
  excludeReqType?: ReqType[];
  excludeUrls?: string[];
  resolveRoute?: (url: string) => string | undefined | null;
}
declare function requestLogger(config?: RequestLoggerConfig): Plugin;
declare function browserLogger(): Plugin;
//#endregion
export { RemappedPosition as a, requestLogger as i, RequestLoggerConfig as n, remapSourcePosition as o, browserLogger as r, remapStackTrace as s, ReqType as t };