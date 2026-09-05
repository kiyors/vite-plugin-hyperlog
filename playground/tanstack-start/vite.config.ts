import contentCollections from "@content-collections/vite";
import { requestLogger, browserLogger } from "vite-plugin-hyperlog/tanstack";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    requestLogger({
      matchRouteTree: true,
      groupServerFn: true,
      excludeModules: true,
    }),
    browserLogger(),
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    contentCollections(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
});

export default config;
