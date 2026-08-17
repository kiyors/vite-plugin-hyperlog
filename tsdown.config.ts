import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["lib/plugin.ts"],
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
