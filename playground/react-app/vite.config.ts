import { requestLogger, browserLogger } from "vite-plugin-hyperlog/react";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), requestLogger(), browserLogger()],
});
