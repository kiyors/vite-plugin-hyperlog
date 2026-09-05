import { browserLogger, createFrameworkLogger, type RequestLoggerConfig } from "./plugin";

export const { requestLogger, logger } = createFrameworkLogger("/@solid-refresh");
export { browserLogger, type RequestLoggerConfig };
export default logger;
