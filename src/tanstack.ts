import type { Plugin } from "vite";

import { requestLogger as coreRequestLogger, browserLogger, type RequestLoggerConfig } from "./plugin";

export function requestLogger(config?: RequestLoggerConfig): Plugin {
  return coreRequestLogger({
    ...config,
    excludeUrls: [...(config?.excludeUrls || [])],
  });
}

export { browserLogger };
