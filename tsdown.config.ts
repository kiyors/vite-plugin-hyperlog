import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/lib/plugin.ts",
    "src/lib/tanstack.ts",
    "src/lib/react.ts",
    "src/lib/vue.ts",
    "src/lib/svelte.ts",
    "src/lib/solid.ts",
  ],
  format: "esm",
  dts: {
    tsgo: true,
  },
  exports: true,
  clean: true,
  outDir: "dist",
  platform: "node",
  deps: {
    // Don't bundle the native .node addon — it's resolved at runtime from the package root
    neverBundle: [/\.node$/],
  },
});
