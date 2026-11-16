# vite-plugin-hyperlog

[![npm version](https://img.shields.io/npm/v/vite-plugin-hyperlog)](https://www.npmjs.com/package/vite-plugin-hyperlog)
[![license](https://img.shields.io/npm/l/vite-plugin-hyperlog)](LICENSE)

A fast, dev-only Vite logger powered by a small Rust (NAPI-RS) addon. It shows the requests that matter — routes, APIs, server functions, and browser output — while keeping Vite's module and asset noise out of your terminal.

> **Requirements**: Node.js `>=22.14` and Vite `>=5`. Dev-server only (`apply: "serve"`) — nothing ships to production. Migration notes for older defaults live in [CHANGELOG.md](CHANGELOG.md).

## Contents

- [Highlights](#highlights)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Reading the output](#reading-the-output)
- [Configuration](#configuration)
- [How it works](#how-it-works)
- [Repeated Requests & Duplicate Graph Loads](#repeated-requests--duplicate-graph-loads)
- [Rolling Latency Summary](#rolling-latency-summary)
- [Hardened Dev Server](#hardened-dev-server)
- [SPA Route Logging](#spa-route-logging)
- [TanStack Start & TanStack Router](#tanstack-start--tanstack-router)
- [React Router v7 Future Flags](#react-router-v7-future-flags)
- [Enhanced Browser Logging](#enhanced-browser-logging)
- [Performance & Benchmarks](#performance--benchmarks)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [License](#license)

## Highlights

- **Curated output** — Vite module requests and static assets are filtered by default; tune with `excludeModules` / `excludeAssets`.
- **SPA routes everywhere** — client navigations appear as `[route] ➜ /path [client]` with no app changes; TanStack additionally reports matched route patterns and params.
- **Three output modes** — pretty ANSI lines, NDJSON (`json: true`) for `jq`, and a rolling `p50/p95/p99` footer (`summaryStats`).
- **Browser console in your terminal** — logs, errors, timers, and sourcemapped stack traces forwarded over HMR, rate-budgeted.
- **Native speed, tiny footprint** — one native crossing per request and a ~460 KB darwin-arm64 addon; see [Performance & Benchmarks](#performance--benchmarks).

For the full version history, see [CHANGELOG.md](CHANGELOG.md).

## Features

- **`requestLogger`**: High-performance HTTP request logging through Vite's dev-server middleware. It sits alongside Vite's own logger (it does not replace it) and prints routes, APIs, server functions, and client-reported navigations with durations, `499` for aborted requests, and `(xN)` repeat collapsing. Output is formatted natively in Rust and available as pretty lines, NDJSON (`json`), or with a rolling latency footer (`summaryStats`).
- **`browserLogger`**: Client-side console logging in your terminal. Automatically intercepts `console.log`, `console.error`, and uncaught exceptions from your browser, securely routes them to the Vite dev server via WebSockets, and prints them to your backend terminal. It also reports SPA navigations out of the box by observing History API changes (`pushState` / `replaceState` / `popstate`), so React Router and other client routers show route lines without extra setup. Framework-agnostic, rate-budgeted, and dev-server only, so nothing is injected into production builds.
- **Quiet asset logs**: Static assets (`.png`, `.webp`, `.jpg`, `.woff2`, `.css`, `.svg`, `.json`, …) are filtered out by default in every adapter; set `excludeAssets: false` to bring them back. Vite re-requests dozens of them on each page load — almost always `304`s — which buried the routes and server functions worth looking at.

## Installation

Install using your preferred package manager:

```bash
pnpm add -D vite-plugin-hyperlog
# or
npm install -D vite-plugin-hyperlog
# or
yarn add -D vite-plugin-hyperlog
```

## Usage

The quickest setup is the unified `logger()` export, which registers the request logger and browser logger in one call (default export of the package):

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import logger from "vite-plugin-hyperlog";

export default defineConfig({
  plugins: [logger()],
});
```

Prefer per-plugin control or framework-tuned exclusions? Import from a framework entry point — each adds its own optimized defaults on top of the shared implementation:

| Entry point                            | Use for                                                                  |
| :------------------------------------- | :----------------------------------------------------------------------- |
| `vite-plugin-hyperlog`                 | Unified `logger()` (request + browser) with generic defaults             |
| `vite-plugin-hyperlog/react`           | React / React Router; filters `/@react-refresh`                          |
| `vite-plugin-hyperlog/vue`             | Vue; filters Vue HMR client requests                                     |
| `vite-plugin-hyperlog/svelte`          | Svelte / SvelteKit                                                       |
| `vite-plugin-hyperlog/solid`           | Solid / SolidStart                                                       |
| `vite-plugin-hyperlog/tanstack`        | TanStack Start / Router; route-tree matching, server-function formatting |
| `vite-plugin-hyperlog/tanstack/client` | Browser-side `registerTanStackRouterLogger` for SPA routes and preloads  |

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { requestLogger, browserLogger } from "vite-plugin-hyperlog/react";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), requestLogger(), browserLogger()],
});
```

A typical dev session then looks like this — assets stay out of the way, routes and browser activity stand out:

```bash
16:22:48 [route]          200 GET    / 21.29ms
16:22:49 [route]          ➜ /models  [client]
16:22:49 [browser]        User signed in  (src/components/Login.tsx:42)
16:22:50 └─ 10s p50 0.29ms · p95 21.3ms · p99 21.3ms · 17 reqs
```

### Reading the output

Each line starts with a badge that tells you where it came from:

| Badge                                               | Meaning                                     | Typical source                                  |
| :-------------------------------------------------- | :------------------------------------------ | :---------------------------------------------- |
| `[route]`                                           | Document request or client navigation       | `GET /`, `pushState("/models")`                 |
| `[server-fn]`                                       | Server function / action invocation         | `/_serverFn/…`, React Server Action headers     |
| `[api]`                                             | REST / JSON endpoint                        | `GET /api/users`                                |
| `[asset]`                                           | Static file (hidden by default)             | `.webp`, `.woff2`, `.svg`                       |
| `[module]`                                          | Vite-transformed source (hidden by default) | `/src/**`, `/@vite/client`                      |
| `[preload]`                                         | TanStack route preload                      | `onPreloaded` event                             |
| `[browser]`, `[browser warn]`, `[browser error]`, … | Console output forwarded from the page      | `console.log`, `console.error`, uncaught errors |
| `[hyperlog]`                                        | Plugin notice (e.g. rate limiting)          | dev server                                      |

What gets logged by default:

| Traffic                                                | Default | Change with                                 |
| :----------------------------------------------------- | :------ | :------------------------------------------ |
| Routes / document requests                             | shown   | —                                           |
| Server functions & actions (basic decoded line)        | shown   | `serverFunctions: false` to hide            |
| Server function args / results / HUD                   | off     | `serverFunctions: { … }` to enable and tune |
| `/api` endpoints                                       | shown   | `excludeApis: true`                         |
| Browser console output and errors                      | shown   | `browserLogger` options                     |
| SPA navigations                                        | shown   | `browserLogger({ spaRoutes: false })`       |
| Vite modules (`/src/**`, `/node_modules/**`, `/@vite`) | hidden  | `excludeModules: false`                     |
| Static assets (images, fonts, CSS, JSON)               | hidden  | `excludeAssets: false`                      |
| Specific methods or URLs                               | —       | `excludeReqType`, `excludeUrls`             |

> `.css` is classified as both a Vite module and an asset, so showing it requires `excludeAssets: false` **and** `excludeModules: false`.

### Configuration

You can pass an optional configuration object to `requestLogger`:

```typescript
requestLogger({
  // Exclude specific HTTP methods from being logged
  // Available options: "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"
  // Also accepts lowercase ("get", "post", ...) and title case ("Get", "Post", ...)
  excludeReqType: ["OPTIONS", "HEAD"],

  // Patterns to exclude. A pattern starting with "/" must match a whole path
  // segment, so "/api" matches "/api/users" but not "/api-key" or
  // "/dashboard/apiSettings". Anything else is a plain substring match, which is
  // what query patterns like "?import" need.
  excludeUrls: ["/my-custom-endpoint"],

  // Static assets (images, fonts, .css, .json, …) are filtered out by default —
  // Vite re-requests dozens per page load, nearly all 304s. Set to false to see
  // them again. Default: true
  excludeAssets: true,

  // Filter Vite module noise: both dependency modules ("/node_modules/",
  // "/@vite", "/@id/") and your own source modules ("/src/**", *.ts|tsx|js|css).
  // Set to false to log every module request. Default: true
  excludeModules: true,

  // Hide "/api" requests. Matches the /api path segment only, so "/api-key" is
  // still logged. Default: false
  excludeApis: false,

  // Collapse repeats of the same URL into one trailing "(xN)" line instead of
  // printing a line each. Default: true
  groupRepeats: true,

  // Window in ms used to group repeats. Default: 1000
  repeatWindowMs: 1000,

  // Warn when many distinct modules are requested a second time with no document
  // request in between, which means the entry graph ran twice in one page load.
  // Default: true
  detectGraphReevaluation: true,

  // Map a request URL to a route pattern for display, e.g. "/$teamId/issues".
  // Only used when you want to supply your own patterns.
  resolveRoute: (url) => (url.startsWith("/dashboard") ? "/dashboard/*" : undefined),

  // Colour policy is automatic: colours are stripped when output is piped,
  // captured, or when NO_COLOR is set, and forced on with FORCE_COLOR=1.
  // Set to false to force plain (ANSI-free) output even on a real terminal.
  // Default: true (auto)
  stripColors: true,

  // Emit one compact NDJSON row per log event instead of pretty lines —
  // machine-readable terminal output for piping into jq / log tools:
  //   pnpm dev 2>&1 | jq 'select(.status >= 500)'
  // Default: false
  json: false,

  // Rolling latency footer printed once per window while traffic is flowing
  // (silent while the dev server is idle): `└─ 10s p50 1.2ms · p95 9.4ms · p99
  // 31ms · 87 reqs`. Pass an object to tune the window:
  // summaryStats: { windowMs: 5000, minSamples: 10 }. Default: true
  summaryStats: true,
});
```

#### Options reference

`requestLogger` options (shared by every adapter, plus the adapter-specific ones below):

| Option                    | Default   | Purpose                                                                        |
| :------------------------ | :-------- | :----------------------------------------------------------------------------- |
| `excludeReqType`          | `[]`      | HTTP methods to skip (`"GET"`, `"POST"`, …; any casing)                        |
| `excludeUrls`             | `[]`      | Path-segment or substring patterns to skip                                     |
| `excludeAssets`           | `true`    | Hide images, fonts, stylesheets, JSON, wasm                                    |
| `excludeModules`          | `true`    | Hide Vite module requests (`/src/**`, `/node_modules/**`, `/@vite`)            |
| `excludeApis`             | `false`   | Hide `/api` endpoints                                                          |
| `groupRepeats`            | `true`    | Collapse identical URLs into one `(xN)` line                                   |
| `repeatWindowMs`          | `1000`    | Grouping window in milliseconds                                                |
| `detectGraphReevaluation` | `true`    | Warn when the module graph is walked twice in one page load                    |
| `resolveRoute`            | —         | Custom `url → route pattern` mapper for display                                |
| `serverFunctions`         | see below | Detailed server-function capture and HUD settings                              |
| `stripColors`             | `true`    | `true` = auto (TTY / `NO_COLOR` / `FORCE_COLOR`), `false` = force plain text   |
| `json`                    | `false`   | Emit NDJSON rows instead of formatted lines                                    |
| `summaryStats`            | `true`    | Rolling latency footer; `{ windowMs, minSamples }` to tune, `false` to disable |

TanStack's `requestLogger` additionally accepts `matchRouteTree` (default `true`), `groupServerFn` (default `true`), `groupServerFnWindowMs` (default `80`), and `routeTreePath` (default `src/routeTree.gen.ts`).

`browserLogger` options:

| Option             | Default | Purpose                                                                        |
| :----------------- | :------ | :----------------------------------------------------------------------------- |
| `spaRoutes`        | `true`  | Report History API navigations (the TanStack adapter defaults this to `false`) |
| `serverFunctionUi` | `true`  | Inject the server-function HUD overlay                                         |
| `json`             | `false` | Emit NDJSON rows                                                               |
| `stripColors`      | `true`  | Same colour policy as `requestLogger`                                          |

`serverFunctions` — pass an object (for example `serverFunctions: {}`) to enable detailed capture; pass `false` to disable it entirely. The basic decoded `[server-fn]` line is produced from the URL even when detailed capture is off.

| Option            | Default  | Purpose                                                 |
| :---------------- | :------- | :------------------------------------------------------ |
| `enabled`         | `true`   | Enable detailed logging (when the object is supplied)   |
| `format`          | `"tree"` | `"tree"` (nested under the request) or `"inline"` badge |
| `logArgs`         | `true`   | Log parsed arguments                                    |
| `logReturns`      | `true`   | Log the returned value or error                         |
| `maxDepth`        | `2`      | Maximum object nesting depth                            |
| `maxBreadth`      | `3`      | Maximum array elements / object keys                    |
| `maxStringLength` | `40`     | Truncate long strings                                   |
| `ui`              | `true`   | Show the in-browser HUD                                 |
| `browserConsole`  | `false`  | Mirror server-function logs to the browser console      |
| `resolveServerFn` | —        | Custom `request → { functionName, filePath }` resolver  |

With `json: true` the same events look like this:

```bash
{"kind":"request","ts":1714300000000,"url":"/dashboard","method":"GET","status":200,"durationMs":12.4}
{"kind":"server-fn","ts":1714300000100,"name":"getAuthSession","file":"routes/__root.tsx","status":200,"durationMs":3.1,"args":{},"result":{"user":"Gaurav"}}
```

### How it works

- Both plugins are registered with Vite's `configureServer` and are gated to `apply: "serve"`, so they never touch a production build.
- `requestLogger` adds one middleware. A single native call per request classifies it (route / API / module / asset / server function) against a config registered once at startup — exclusions are not marshalled across the Node ↔ Rust boundary per request.
- `browserLogger` injects a virtual module into `index.html` that forwards `console` calls and uncaught errors over Vite's HMR WebSocket, and watches the History API for SPA navigations. A hardened `POST /__hyperlog/route` endpoint is the fallback transport.
- All output goes through one shared sink: TTY-aware colour handling, microtask-batched writes, optional NDJSON, and the rolling latency summary.
- The native addon is dependency-minimal Rust (~460 KB on darwin-arm64) and handles formatting, route matching, sourcemap frame decoding, and stack sanitization.

### Repeated Requests & Duplicate Graph Loads

By default, repeats of the same URL are collapsed into a single trailing line:

```bash
22:57:03 [route] 200 GET /dashboard 12.40ms
22:57:04 [route] 200 GET /dashboard 96.10ms (x2)
```

If many _distinct_ modules are requested a second time with no document request in
between, the entry graph has run twice inside one page load. The plugin reports
this rather than leaving you to work it out from the request list:

```bash
22:57:10  module graph re-evaluated 24 modules requested again (48 requests total) within 1934ms
     ↳ no document request between them, so the entry graph ran twice in one page load
     ↳ look for a duplicate <script type="module"> in index.html, or a cache-busted dynamic import() of your entry
```

The two usual causes are a duplicated entry `<script>` in `index.html` and a
cache-busted dynamic `import()` of your entry module. Set
`detectGraphReevaluation: false` to silence it.

### Rolling Latency Summary

While traffic is flowing, a footer line appears once per window (default every
10 s, at least 5 requests) so slow paths stand out without a profiler:

```bash
└─ 10s p50 1.2ms · p95 9.4ms · p99 31ms · 87 reqs
```

Values are nearest-rank p50/p95/p99 over the window's request durations, and the
window resets automatically: an idle dev server never prints anything. Tune it
with `summaryStats: { windowMs: 5000, minSamples: 10 }`, or turn it off with
`summaryStats: false`. In `json: true` mode the same snapshot is emitted as a
`{"kind":"summary",...}` row.

### Hardened Dev Server

- **Route endpoint origin guard**: the browser reports SPA navigations to
  `POST /__hyperlog/route`. Browsers whose `Origin` does not match the dev
  server's `Host` (cross-site pages, DNS-rebinding probes) are rejected with
  `403` before any body is read. Header-less non-browser clients (curl, IDE
  extensions) are unaffected.
- **Browser-log rate budget**: browser-delivered `console` output is capped at
  400 printed rows per rolling second. Flooded windows are dropped until the
  next second and reported as a single notice line, so a runaway render loop
  cannot starve the dev server or flood your terminal:

  ```bash
  [hyperlog] 132 browser log rows suppressed (rate limit)
  ```

- **Terminal-safe plumbing**: output is written through microtask-batched,
  single-write flushes, stripped of ANSI when stdout is not a terminal or
  `NO_COLOR` is set, and flushed once more on server close so shutdown lines
  are never lost.

### SPA Route Logging

A client-side navigation never triggers a document request, so `requestLogger` alone only sees the initial page load. The injected browser script covers the rest: it patches `history.pushState`, `history.replaceState`, and `popstate`, then reports each path change to the dev server:

```bash
22:58:01 [route]     ➜ /models  [client]
```

This works with React Router, Wouter, or any router built on the History API — no app-side imports needed. Turn it off with `browserLogger({ spaRoutes: false })`.

For richer events — matched route patterns, params, and preloads — TanStack apps can register a router subscriber (below). The TanStack adapter disables the generic reporter automatically so navigations are never logged twice.

### TanStack Start & TanStack Router

For TanStack applications, import from `vite-plugin-hyperlog/tanstack`. It includes tailored optimizations:

- **Server Function Decoding & Formatting**: Automatically decodes `/_serverFn` base64 endpoints to display human-readable function names, caller files, and execution durations with hierarchical tree formatting (`└─ ƒ action(args) ➜ result in Xms`), color-coded by latency thresholds and flagging errors with `❌`.
- **Client DevTools HUD Overlay**: Universal zero-dependency Shadow DOM overlay injected into dev clients via `getServerFnOverlayScript` for real-time latency and error inspection without style collisions.
- **Duplicate Batching**: Groups and debounces consecutive duplicate server function calls (e.g. `(x5)`) during component mounts and revalidations.
- **Route Pattern Matching**: Powered by an ultra-fast native Rust scanner (zero regex fragility, hand-rolled token scan) to extract route patterns and types from `src/routeTree.gen.ts`, displaying parameterized route patterns (e.g. `/$teamId/channels/$channelId`) alongside the requested URL.
- **Module Noise Filtering**: Automatically filters out internal Vite module compilation noise (`/node_modules/`, `/@vite`, `.tsx`/`.ts` compilation requests, and `?tsr-split=component`).

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { requestLogger, browserLogger } from "vite-plugin-hyperlog/tanstack";

export default defineConfig({
  plugins: [
    requestLogger({
      // Exclude internal module and node_modules compilation noise (default: true)
      excludeModules: true,
      // Exclude /api requests if you only want to focus on routes and server functions (default: false)
      excludeApis: false,
      // Automatically match URLs to route patterns in routeTree.gen.ts (default: true)
      matchRouteTree: true,
      // Group and debounce repeated server functions (default: true)
      groupServerFn: true,
      // NDJSON rows instead of pretty lines, and/or a rolling p50/p95/p99
      // footer — same semantics as the base plugin (inherited defaults).
      json: false,
      summaryStats: true,
    }),
    browserLogger(),
  ],
});
```

> **Note**: `summaryStats` is on by default for every adapter; the browser
> logger inherits `json` / `stripColors` from the config you pass to
> `logger()` / `tanstackLogger()` so the whole stream stays consistent.

#### Rich route events with `registerTanStackRouterLogger`

Register the client-side subscriber to stream transitions and preloads with the matched route pattern and params:

> **Important**: Always import `registerTanStackRouterLogger` from `"vite-plugin-hyperlog/tanstack/client"` (not `"vite-plugin-hyperlog/tanstack"`). The `tanstack` entry point is the Vite server plugin which runs in Node.js, while `tanstack/client` is the zero-dependency browser client bundle.

```typescript
// src/router.tsx (or your client router entry)
import { createRouter } from "@tanstack/react-router";
import { registerTanStackRouterLogger } from "vite-plugin-hyperlog/tanstack/client";
import { routeTree } from "./routeTree.gen";

export const router = createRouter({ routeTree });

// Log client-side SPA transitions and preloads to your dev terminal
registerTanStackRouterLogger(router);
```

#### Example output

```bash
22:56:26 [route]     307 GET / ➜ /login?redirect=%2F 120.50ms
22:56:26 [route]     200 GET /login [/login] 45.20ms
22:57:03 [server-fn] 200 GET getAuthSession (routes/__root.tsx) 18.82ms (x2)
22:57:03 [server-fn] 200 GET getWorkspaces (lib/workspace-loader.ts) 14.28ms
22:58:01 [route]     ➜ /team-alpha/issues  [/$teamId/issues]  (24.5ms)
22:58:05 [preload]   ⤓ /$teamId/settings  (preloaded in 12.0ms)
```

### React Router v7 Future Flags

If you use React Router v6, the browser logs two future-flag warnings on startup.
They are opt-in and nothing is broken, but adopting them makes the v7 upgrade
mechanical. See [docs/react-router-future-flags.md](docs/react-router-future-flags.md)
for the correct flag placement — note that `v7_startTransition` is read from the
_render_ `future` prop and must be set on `<RouterProvider>` or `<BrowserRouter>`,
not only on `createBrowserRouter`.

### Enhanced Browser Logging

`browserLogger` captures client-side events via WebSockets and formats them natively with Rust:

- **Clickable Source Callers**: Automatically resolves caller locations (e.g. `(src/components/Login.tsx:42)`) so you can cmd-click directly to your code in modern terminals (VS Code, iTerm, Warp, Ghostty).
- **ANSI Syntax Highlighting**: Powered by a zero-dependency, pure-native Rust JSON scanner to colorize objects logged from the browser with syntax coloring for keys, strings, numbers, booleans, and nulls.
- **Timer Support**: Supports `console.time('label')` and `console.timeEnd('label')` to track client-side performance.
- **Intelligent Stack Trace Cleaning & Sourcemap Remapping**: Powered by a custom zero-dependency VLQ sourcemap decoder to parse browser error frames, highlight user application frames (`➜ src/lib/api.ts:25:11 in fetchUser`), dim dependency noise, and remap positions to original TypeScript source files.
- **Flood Protection**: Rapid repetitive logs (e.g. from render loops or scroll listeners) are debounced and collapsed with a repeat counter (`(x5)`), and a rolling rate budget caps terminal prints so whole-log floods degrade to a single notice instead of pinning the dev server.
- **SPA Route Reporting**: client-side navigations are forwarded as `[route]` lines; see [SPA Route Logging](#spa-route-logging) for details and how to disable them.

```typescript
browserLogger({
  // Report SPA navigations by observing History API changes. Default: true.
  // TanStack's browserLogger defaults this to false to avoid duplicate lines.
  spaRoutes: true,
  serverFunctionUi: true,
  json: false,
  stripColors: true,
});
```

```bash
22:56:51 [browser]       User signed in  (src/components/Login.tsx:42)
22:57:05 [browser timer] loadData: 48.20ms  (src/routes/dashboard.tsx:88)
22:57:10 [browser warn]  Slow render detected (x3)  (src/view.tsx:15)
22:57:15 [browser error] Error: Failed to fetch  (src/lib/api.ts:25)
  ➜ src/lib/api.ts:25:11 in fetchUser
    node_modules/.vite/deps/react.js:124:19
```

---

## Performance & Benchmarks

Dev-only by design (`apply: "serve"`), so there is no production runtime cost. The hot path is a native addon, and per-request exclusion/classification is a single Rust crossing. Measured on an idle Apple M4 (Node 24, darwin-arm64), 0.3.0 → 0.4.0:

| Benchmark                              | 0.3.0     | 0.4.0         | Change      |
| :------------------------------------- | :-------- | :------------ | :---------- |
| 500k-request simulated traffic (req/s) | 1,402,531 | **2,069,081** | **+47.5%**  |
| High-concurrency burst (100×1000)      | 1,338,189 | **1,828,499** | **+36.6%**  |
| Enterprise 120-route AST parse         | 32,755    | **41,650**    | +27.2%      |
| 14-frame minified stack remap          | 184,254   | **286,576**   | +55.5%      |
| Heavy JSON syntax colorizer (5.7 KB)   | 32,583    | **56,311**    | +72.8%      |
| Adversarial 100 KB message payload     | 4,789     | **10,455**    | **+118.3%** |
| Ultra-deep 100-frame stack trace       | 48,274    | **79,446**    | +64.6%      |
| `formatLogEntry` (6-path mixed)        | 1,226,963 | **1,806,492** | +47.2%      |
| `matchRoutePath` (dynamic params)      | 1,014,204 | **1,589,916** | +56.8%      |

The compile-time trade-off was ~100 KB of extra binary size; the shipped darwin-arm64 addon is ~460 KB (~97% smaller than the old dependency-heavy build).

Full microbenchmark tables, binary footprint by platform, the 500k-request traffic simulation, enterprise scenarios, hardware telemetry, and the commands to reproduce everything live in [docs/BENCHMARKS.md](docs/BENCHMARKS.md):

```bash
pnpm bench          # full suite with GC and telemetry analysis
pnpm bench:quick    # ~1.5s smoke pass
pnpm bench:ci       # throughput regression guard
```

---

## Troubleshooting

**I see no logs at all.** The plugins only run with `apply: "serve"`, so they are inactive during `vite build` and `vite preview`. Check that `requestLogger()` is in the `plugins` array and that you are running `vite dev`. If you built with a framework adapter, import from that adapter's entry point (see [Usage](#usage)).

**Where did my image/font lines go?** Static assets are filtered out by default as of 0.4.1. Set `excludeAssets: false` in `requestLogger()` to bring them back. Note that `.css` is also classified as a Vite module, so you may need `excludeModules: false` to see it.

**Why do I get `[route] ... [client]` lines?** Client-side navigations are reported by the injected browser script via the History API — no router change is required in your app. Pass `browserLogger({ spaRoutes: false })` to disable them. In TanStack apps these lines are suppressed in favour of the richer `registerTanStackRouterLogger` events.

**The terminal says the module graph ran twice.** This is the duplicate-entry warning described in [Repeated Requests & Duplicate Graph Loads](#repeated-requests--duplicate-graph-loads): look for a second `<script type="module">` in `index.html` or a cache-busted dynamic `import()` of your entry. Disable it with `detectGraphReevaluation: false` if it is intentional.

**Output is all one colour / has ANSI codes when piped.** Colours follow TTY detection, `NO_COLOR`, and `FORCE_COLOR`. Use `stripColors: true` for automatic handling or `stripColors: false` to force plain text. `json: true` gives machine-readable NDJSON for `jq`.

---

## Development

```bash
pnpm install           # install workspace + playground dependencies
pnpm test:unit         # fast unit suite
pnpm test:e2e          # Playwright dev-server suite (needs browsers: pnpm exec playwright install)
pnpm lint              # Rust clippy + oxlint
pnpm fmt               # cargo fmt + oxfmt
pnpm build:ts          # rebuild dist/ bundles and .d.mts types
pnpm build             # rebuild native addon (napi) + dist/
```

Benchmarks and their baseline workflow are documented in [docs/BENCHMARKS.md](docs/BENCHMARKS.md).

---

## License

[MIT](LICENSE) © [kiyors](https://github.com/kiyors)
