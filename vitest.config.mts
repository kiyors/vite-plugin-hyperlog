import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    // `direnv` can place a full copy of the repo under `.direnv/flake-inputs/`.
    // Without this, vitest collects the stale copy as a second test file and runs
    // the suite twice against different code.
    exclude: [...configDefaults.exclude, "**/.direnv/**"],
  },
});
