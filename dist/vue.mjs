import { browserLogger, createFrameworkLogger } from "./plugin.mjs";
//#region src/vue.ts
const { requestLogger, logger } = createFrameworkLogger("/@vite-plugin-vue/");
//#endregion
export { browserLogger, logger as default, logger, requestLogger };
