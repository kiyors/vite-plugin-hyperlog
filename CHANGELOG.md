# Changelog

All notable changes to this project are documented here.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0]

### Breaking

- **`excludeModules` now filters your own source modules.** The option was
  documented as excluding module noise, but it only ever matched `/node_modules/`
  and `/@` paths, so a default-configured app still logged every `/src/**` file.
  It now filters dependency modules _and_ your own source modules
  (`/src/**`, `*.ts|tsx|js|jsx|mjs|cjs|css|vue|svelte`).

  **Action:** if you relied on the previous default, set
  `requestLogger({ excludeModules: false })`.

- **`excludeUrls` and the built-in `/api` exclusion now match path segments.**
  Matching was a plain substring test, so `/api` also swallowed `/api-key`,
  `/dashboard/apiSettings`, and `/apiary`. A pattern starting with `/` must now
  match a whole path segment. Patterns not starting with `/` (such as `?import`)
  remain substring matches.

  **Action:** if you used a trailing-slash pattern such as `"/api/"`, drop the
  slash to `"/api"`; patterns that relied on partial-segment matching now need to
  be spelled out more fully. This now applies consistently to the TanStack adapter
  as well, which previously kept substring matching.

### Added

- Repeated requests to the same URL collapse into a single trailing `(xN)` line
  instead of printing one line each. Configure with `groupRepeats` and
  `repeatWindowMs`.
- New diagnostic for a module graph that runs twice within one page load: many
  distinct modules requested again with no document request in between. This is
  the signature of a duplicated entry `<script>` or a cache-busted dynamic
  `import()`. Disable with `detectGraphRevaluation: false` (spelled
  `detectGraphReevaluation`).
- `resolveRoute` is now documented alongside the rest of the configuration.

### Fixed

- `browserLogger` had no `apply: "serve"`, so its `transformIndexHtml` hook also
  ran during `vite build` and injected a dev-only `/@id/…virtual:browser-logger`
  script tag into production HTML, guaranteeing a 404 on every production page
  load.
- The injected browser-logger script URL now honours Vite's `base`, so apps
  served from a sub-path work instead of requesting a root-relative URL that 404s.
- Terminal escape sequences are now stripped at the Rust boundary across every log
  path: browser messages and callers, client-reported route names and paths, and
  request URLs, route names, and redirect `Location` headers. Previously any page
  the dev server served could clear the screen, move the cursor, or forge log lines
  — via `console.log`, or simply with `fetch("/\x1b[2J")`.
- Aborted requests are reported as `499` instead of the default `200`, so a
  dropped connection is no longer indistinguishable from a successful one. The
  README previously claimed aborted connections were tracked; they were not.
- Request bodies are buffered as bytes and decoded once, fixing silent UTF-8
  corruption when a multi-byte character straddled a chunk boundary. Applied to
  every `/__hyperlog/route` handler.
- Request bodies are capped at 64 kB and the socket is destroyed past that,
  bounding memory use on an unauthenticated dev endpoint.
- `/__hyperlog/route` was registered by two plugins with diverging implementations;
  it is now a single shared handler registered once per dev server.
- `registerTanStackRouterLogger` now guards on `import.meta.env.DEV`. It is
  imported from application code and was not covered by the server plugins'
  `apply: "serve"`, so it could ship to production.
- Swallowed errors in the TanStack client are no longer silent. Set
  `localStorage.setItem("vite-plugin-hyperlog:debug", "1")` to surface them.
- Declared `vite` as an optional peer dependency.

### Internal

- Added `GraphReevaluationDetector` and a control-character sanitizer as isolated,
  unit-tested modules.
- The e2e harness spawns the workspace's own Vite instead of `npx vite`, which
  silently downloaded a different Vite when a local bin link was missing.

## [0.1.2]

- Initial tagged release of the Rust-backed request and browser logger.
