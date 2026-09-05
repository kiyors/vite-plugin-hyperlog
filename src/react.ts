import { browserLogger, createFrameworkLogger, type RequestLoggerConfig } from "./plugin";

export const { requestLogger, logger } = createFrameworkLogger("/@react-refresh");
export { browserLogger, type RequestLoggerConfig };
export default logger;
