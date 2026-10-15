import { getServerFnOverlayScript } from "../index.js";

/**
 * In-browser DevTools Overlay and Console Mirror script for Server Functions.
 * Compiled into and served from the native Rust binary via NAPI-RS.
 */
export function getServerFunctionOverlayScript(): string {
  return getServerFnOverlayScript();
}

export { getServerFnOverlayScript };
