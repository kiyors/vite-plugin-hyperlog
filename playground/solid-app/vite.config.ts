import { requestLogger, browserLogger } from "vite-plugin-hyperlog/solid";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid(), requestLogger(), browserLogger()],
});
