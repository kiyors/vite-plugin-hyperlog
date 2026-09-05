import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/plugin.ts",
    "src/tanstack.ts",
    "src/tanstack-client.ts",
    "src/react.ts",
    "src/vue.ts",
    "src/svelte.ts",
    "src/solid.ts",
  ],
  format: "esm",
  dts: true,
  exports: false,
  clean: true,
  outDir: "dist",
  platform: "node",
  deps: {
    // Don't bundle the native .node addon — it's resolved at runtime from the package root
    neverBundle: [/\.node$/, "vite"],
  },
});
