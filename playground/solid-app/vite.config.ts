import { requestLogger, browserLogger } from "@kiyors/vite-plugin-logger/solid";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid(), requestLogger(), browserLogger()],
});
