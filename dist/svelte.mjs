import { browserLogger, createFrameworkLogger } from "./plugin.mjs";
//#region src/svelte.ts
const { requestLogger, logger } = createFrameworkLogger("/@svelte-refresh");
//#endregion
export { browserLogger, logger as default, logger, requestLogger };
