import { Plugin } from "vite";
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
export { ReqType, RequestLoggerConfig, browserLogger, requestLogger };