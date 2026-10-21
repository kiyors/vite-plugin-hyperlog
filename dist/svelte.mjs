import { i as browserLogger, o as createFrameworkLogger } from "./plugin-shared.mjs";
//#region src/svelte.ts
const { requestLogger, logger } = createFrameworkLogger("/@svelte-refresh");
//#endregion
export { browserLogger, logger as default, logger, requestLogger };
