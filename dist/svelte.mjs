import { i as createFrameworkLogger, n as browserLogger } from "./plugin-shared.mjs";
//#region src/svelte.ts
const { requestLogger, logger } = createFrameworkLogger("/@svelte-refresh");
//#endregion
export { browserLogger, logger as default, logger, requestLogger };
