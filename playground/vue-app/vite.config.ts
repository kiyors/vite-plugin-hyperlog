import { requestLogger, browserLogger } from "@kiyors/vite-plugin-logger/vue";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), requestLogger(), browserLogger()],
});
