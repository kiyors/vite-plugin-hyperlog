import { browserLogger, createFrameworkLogger, type RequestLoggerConfig } from "./plugin";

export const { requestLogger, logger } = createFrameworkLogger("/@vite-plugin-vue/");
export { browserLogger, type RequestLoggerConfig };
export default logger;
