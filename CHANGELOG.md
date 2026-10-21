# Changelog

All notable changes to this project are documented here.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0]

### Added

- **Config-time exclusion engine**: platforms now register their exclusion configuration once per plugin instance with the new native `registerExclusionConfig(id, exclusions, excludeModules)`, instead of marshalling the JS array across the NAPI boundary on every request.
- **Combined request observation**: new native `observeRequest(id, url)` returns `RequestObservation { excluded, isModule }`, classifying module requests (for graph re-evaluation detection) and evaluating the cached exclusions in a single native crossing per request. Both the base and TanStack plugins use it on the request hot path.
- **NDJSON output mode (`json: true`)**: every adapter can emit one compact structured JSON row per event (`{"kind":"request",...}`, `server-fn`, `route`, `browser`, `graph`) instead of pretty lines, so the dev stream can be piped straight into `jq` or a log collector. The unified `logger()` / `tanstackLogger()` wrappers propagate the flag to the browser logger as well.
- **Rolling latency footer (`summaryStats`, default on)**: while traffic flows, a once-per-window footer prints `└─ 10s p50 1.2ms · p95 9.4ms · p99 31ms · 87 reqs` (nearest-rank quantiles over the window, configurable via `summaryStats: { windowMs, minSamples }`, silent while idle).
- **Automatic colour policy (+ `stripColors`)**: colours are stripped automatically when stdout is not a TTY, when `NO_COLOR` is set, or with `FORCE_COLOR=0`; `FORCE_COLOR` forces colours back on for captured logs. `stripColors: false` forces plain output even on a terminal.
- **Browser-log rate budget**: WS-delivered browser logs are capped at 400 printed rows per rolling second; anything beyond is dropped until the next window and reported as a single `[hyperlog] N browser log rows suppressed (rate limit)` notice, so a runaway `console.log` loop can no longer pin the dev-server CPU or flood the terminal.

### Performance

- **Release profile speed-up**: compiled the native extension with `opt-level = 3` instead of `opt-level = "z"`. Formatting benchmarks improved by roughly 30–50% (e.g. `formatLogEntry` 1.21M → 1.81M ops/sec, 500k-request simulated traffic 1.40M → 2.07M req/sec), at the cost of ~100 KB of binary size (still ~97% smaller than pre-optimization builds).
- **Hoisted per-request config parsing** in the TanStack adapter: server-function configuration is now resolved once at plugin creation instead of on every middleware hit.
- **Microtask-batched terminal writes**: consecutive log lines within one event-loop tick are coalesced into a single `process.stdout.write` instead of one synchronous write per `console.log`, cutting syscalls sharply on busy pages while preserving in-tick ordering.
- **Raw chunk capture**: server-function request/response bodies are captured without re-encoding each chunk, avoiding extra `Buffer` allocations in the capture path.
- **Passive body capture**: request bodies are observed with a plain `"data"` listener (the middleware-standard pattern) instead of monkey-patching `req.emit` with an array-spreading wrapper on every request.
- **Best-observed baseline**: the checked-in `scripts/benchmark-baseline.json` is refreshed from the best observation per benchmark across multiple full-suite runs, so transient background load no longer skews the CI regression guard's reference point. Runtime benchmarks should still be executed on an idle machine.

### Fixed

- **Route-endpoint origin guard**: `POST /__hyperlog/route` now rejects browsers whose `Origin` does not match the receiving `Host` (403, before any body read), closing cross-origin route forgery / DNS-rebinding log pollution; header-less non-browser clients (curl, IDE tools) are unaffected.
- **UTF-8 chunk boundaries in server-function capture**: request/response chunks are stored in their original form (`Buffer` or pre-decoded string) and decoded once at capture end. Re-encoding each chunk in isolation (`Buffer.from(String(chunk))`) silently corrupted multi-byte characters split across chunk boundaries.
- **DevTools HUD input hardening**: the overlay's URL filter value is assigned through the DOM API (`filterInput.value`) instead of being interpolated into an HTML `value="..."` attribute, closing an attribute-breakout injection when re-rendering with untrusted filter text.
- **Shared adapter plumbing**: body capture, server-function rendering/telemetry, the route reporter, and the output pipeline now live in one shared implementation used by both adapters; this removes drifting duplicates and restores 499-aborted-status parity with the base plugin in the TanStack adapter.
- **README accuracy**: corrected the route-pattern matcher and JSON colorizer descriptions (hand-rolled native token scanning, not an AST parser / SIMD base64 / zero-copy claims) and refreshed all benchmark tables from the re-baselined suite.

## [0.3.0]

### Added

- **Native Server Function Logging & DevTools HUD**:
  - Added native Rust `format_server_fn_log` supporting standalone `[server-fn]` logs and hierarchical tree formatting (`└─ ƒ action(args) ➜ result in Xms`) with latency-based color coding.
  - Implemented cross-framework server action detection for TanStack Start, React 19 RSC `Next-Action`, and Astro `/_actions/`.
  - Injected zero-bundle client DevTools HUD overlay via native Shadow DOM script `getServerFnOverlayScript()`.
- **Native Exclusion Engine & Module Fast-Path**:
  - Migrated URL exclusion matching and Vite module detection to native Rust (`should_exclude_request`, `matches_exclusion`, `is_module_request`).
  - Added short-circuit fast-path for Vite module requests (>80% of dev traffic) and root-anchored prefix stripping to skip regex scanning.
- **Native Route Matching & Fast AST Parsing**:
  - Added native `match_route_path` in `oxc_routes.rs` for dynamic parameter matching without dynamic RegExp compilation.
  - Added native `decode_server_fn` for URL-safe Base64 decoding with stack-buffer JSON key extraction.
- **Enterprise Benchmark Suite & Profiler Tooling**:
  - Added 3-table Master Performance Dashboard with uniform visual width alignment.
  - Added CLI options: `--quick` / `-q` (~1.5s sub-second check), `--summary-only` / `-s`, and `--filter` / `-f <pattern>`.
  - Added multi-format telemetry: GitHub Flavored Markdown table generation (`--markdown` / `--md`) and structured JSON telemetry export (`--json`).
  - Added automated CI performance regression guard (`--ci` / `--fail-on-regression <pct>`).
  - Added convenience scripts: `bench:quick`, `bench:summary`, `bench:ci`, `bench:markdown`, `bench:json`, and `bench:update`.

### Security

- Sanitized ANSI escape sequences (CSI, OSC, C1) across untrusted request URLs, caller locations, and payload previews to prevent terminal injection.
- Stripped carriage return (`\r`) characters to prevent log forgery and status code spoofing.
- Bounded Base64 URL token parsing to 4,096 bytes to protect against DoS memory exhaustion.
- Enforced UTF-8 char boundary safe slicing for payload truncation.

## [0.2.1]

First published release of the module-filtering and log-hardening work. The
breaking changes below ship in this version, since 0.2.0 was never published.

### Fixed

- CI `test-binding` job no longer installs a hardcoded `pnpm@11.18.0` that
  disagreed with the declared `packageManager`.

## [0.2.0] - unpublished

Never published to npm; superseded by 0.2.1, which carries the same changes.

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
