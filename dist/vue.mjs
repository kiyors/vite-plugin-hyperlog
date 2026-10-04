import { i as createFrameworkLogger, n as browserLogger } from "./plugin-shared.mjs";
//#region src/vue.ts
const { requestLogger, logger } = createFrameworkLogger("/@vite-plugin-vue/");
//#endregion
export { browserLogger, logger as default, logger, requestLogger };
