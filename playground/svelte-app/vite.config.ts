import { requestLogger, browserLogger } from "vite-plugin-hyperlog/svelte";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), requestLogger(), browserLogger()],
});
