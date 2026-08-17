import { Plugin } from "vite";
//#region src/lib/plugin.d.ts
type ReqType = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD" | "get" | "post" | "put" | "patch" | "delete" | "options" | "head" | "Get" | "Post" | "Put" | "Patch" | "Delete" | "Options" | "Head";
interface RequestLoggerConfig {
  excludeReqType?: ReqType[];
  excludeUrls?: string[];
}
declare function requestLogger(config?: RequestLoggerConfig): Plugin;
declare function browserLogger(): Plugin;
//#endregion
export { ReqType, RequestLoggerConfig, browserLogger, requestLogger };