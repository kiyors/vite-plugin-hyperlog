# vite-plugin-hyperlog

A blazing fast Vite logger plugin powered by Rust (NAPI-RS) and TypeScript.

> **Note**: This plugin supports multiple frameworks via tailored entry points (React, Vue, Svelte, Solid, and TanStack).

> **Upgrading to 0.2.1?** Two defaults changed. See [CHANGELOG.md](CHANGELOG.md)
> for the migration notes — in short, set `excludeModules: false` if you relied on
> seeing your own `/src/**` modules logged.

## Features

- **`requestLogger`**: High-performance HTTP request logging. Replaces Vite's default logger with a highly optimized Rust-powered logger. Tracks duration times, reports aborted requests as `499`, collapses repeated requests with a repeat counter, and formats output with ANSI colors instantly.
- **`browserLogger`**: Client-side console logging in your terminal. Automatically intercepts `console.log`, `console.error`, and uncaught exceptions from your browser, securely routes them to the Vite dev server via WebSockets, and prints them to your backend terminal. Framework-agnostic and universally injected. Dev-server only, so nothing is injected into production builds.

## Installation

Install using your preferred package manager (PNPM is recommended):

```bash
pnpm add -D vite-plugin-hyperlog
```

## Usage

Import `requestLogger` and `browserLogger` from your specific framework's entry point, and add them to the `plugins` array in your `vite.config.ts`. The framework-specific import automatically sets up optimized exclusions.

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { requestLogger, browserLogger } from "vite-plugin-hyperlog/react";
// OR from "vite-plugin-hyperlog/tanstack";
// OR from "vite-plugin-hyperlog/vue";

import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), requestLogger(), browserLogger()],
});
```

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

With `json: true` the same events look like this:

```bash
{"kind":"request","ts":1714300000000,"url":"/dashboard","method":"GET","status":200,"durationMs":12.4}
{"kind":"server-fn","ts":1714300000100,"name":"getAuthSession","file":"routes/__root.tsx","status":200,"durationMs":3.1,"args":{},"result":{"user":"Gaurav"}}
```

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

#### Client-Side SPA Route Logger

Because client-side SPA navigations occur inside the browser without triggering full-page HTTP requests, you can register the client-side route subscriber to stream route transitions and preloads straight to your dev terminal:

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

##### Terminal Output Example

```bash
22:56:26 [route]     307 GET / ➜ /login?redirect=%2F 120.50ms
22:56:26 [route]     200 GET /login (route: /login) 45.20ms
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
- **Flood Protection**: Rapid repetitive logs (e.g. from render loops or scroll listeners) are debounced and collapsed with a repeat counter (`(x5)`).

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

`vite-plugin-hyperlog` is engineered for zero runtime overhead in Vite development servers. The native extension is written in pure, dependency-minimal Rust compiled to bare metal via Node-API.

### Binary Footprint

By eliminating heavy transitive dependencies (`serde`, `regex`, `chrono`, `yansi`, `oxc_parser`, `oxc_sourcemap`) and replacing them with hand-optimized pure Rust zero-allocation algorithms, the compiled binary footprint was reduced by **~97%**:

| Architecture                       | Previous Size | Current Size   | Reduction  |
| :--------------------------------- | :------------ | :------------- | :--------- |
| **macOS ARM64** (`darwin-arm64`)   | `15.0 MB`     | **`460 KB`**¹  | **-97.0%** |
| **macOS x64** (`darwin-x64`)       | `15.2 MB`     | **`≈ 480 KB`** | **-96.9%** |
| **Linux x64** (`linux-x64-gnu`)    | `15.8 MB`     | **`≈ 500 KB`** | **-96.9%** |
| **Windows x64** (`win32-x64-msvc`) | `14.9 MB`     | **`≈ 455 KB`** | **-97.0%** |

> ¹ Measured with the shipped `opt-level = 3` speed profile on darwin-arm64 (470,896 bytes).
> The other columns are estimates from the same build profile across platforms; exact sizes are
> recorded by the release CI when platform artifacts are built. The remaining rows use the same
> release profile and land within a few percent of the measured macOS ARM64 figure.

---

### Microbenchmarks (Throughput & Latency)

> Tested on **Apple M4 (10 vCPUs, 16 GB Unified Memory)** on macOS with Node.js v24.
> 5 statistical rounds per benchmark, measuring average, p50, and p99 latencies.

| Function / API                 | Workload Description                   | Throughput              | Avg Latency | P99 Latency | CPU per Call |
| :----------------------------- | :------------------------------------- | :---------------------- | :---------- | :---------- | :----------- |
| **`shouldExcludeRequest`**     | Vite module & static asset filtering   | **`3,161,111 ops/sec`** | `0.316 µs`  | `0.319 µs`  | `0.32 µs`    |
| **`getBrowserLoggerScript`**   | Vite client injector script            | **`2,456,569 ops/sec`** | `0.407 µs`  | `0.413 µs`  | `0.41 µs`    |
| **`formatRouteLog`**           | Navigations & preloads (4-variant)     | **`2,366,792 ops/sec`** | `0.423 µs`  | `0.428 µs`  | `0.42 µs`    |
| **`decodeServerFn`**           | URL-safe Base64 + stack JSON extractor | **`1,844,242 ops/sec`** | `0.542 µs`  | `0.566 µs`  | `0.54 µs`    |
| **`formatLogEntry`**           | 6-path mixed HTTP requests             | **`1,806,492 ops/sec`** | `0.554 µs`  | `0.558 µs`  | `0.55 µs`    |
| **`formatBrowserLog`**         | 6-type mixed browser telemetry         | **`1,733,763 ops/sec`** | `0.577 µs`  | `0.584 µs`  | `0.58 µs`    |
| **`remapSourcePosition`**      | Zero-copy VLQ sourcemap token lookup   | **`1,313,267 ops/sec`** | `0.762 µs`  | `0.770 µs`  | `0.76 µs`    |
| **`matchRoutePath`**           | Native dynamic parameter matcher       | **`1,589,916 ops/sec`** | `0.629 µs`  | `0.635 µs`  | `0.63 µs`    |
| **`formatServerFnLog`**        | Hierarchical tree & standalone logs    | **`1,246,820 ops/sec`** | `0.802 µs`  | `0.810 µs`  | `0.80 µs`    |
| **`remapStackTrace`**          | 5-frame minified stack remapping       | **`985,248 ops/sec`**   | `1.015 µs`  | `1.031 µs`  | `1.02 µs`    |
| **`parseRouteTreeAst`**        | TanStack 15-route tree route scanning  | **`403,818 trees/sec`** | `2.476 µs`  | `2.482 µs`  | `2.48 µs`    |
| **`getServerFnOverlayScript`** | Client Shadow DOM DevTools HUD script  | **`192,240 ops/sec`**   | `5.202 µs`  | `5.248 µs`  | `5.20 µs`    |

---

### Real-World Production Traffic Simulation

Simulating **500,000 consecutive requests** reproducing realistic Vite dev-server production traffic ratios:

```text
Request Distribution:
  ├── ESM Module requests (45%)        [■■■■■■■■■■■■■■■■■■]  225,000 requests
  ├── Browser console logs (20%)       [■■■■■■■■··········]  100,000 logs
  ├── TanStack Route requests (15%)    [■■■■■■············]   75,000 routes
  ├── Client Navigations (8%)          [■■■···············]   40,000 navigations
  ├── REST / JSON API calls (6%)       [■■················]   30,000 requests
  ├── TanStack Server Functions (3%)   [■·················]   15,000 server functions
  └── Static Assets / Fonts (3%)       [■·················]   15,000 assets
```

- **Effective Throughput**: **`2,069,081 requests / sec`**
- **Average Latency**: **`0.483 µs`** per logged event
- **Total Time**: `241.7 ms` for all 500,000 requests
- **Memory RSS Growth**: `< 1.8 MB` during burst

---

### Enterprise Real-World Scenarios

| Real-World Scenario                     | Workload Scale                             | Throughput                | Latency    |
| :-------------------------------------- | :----------------------------------------- | :------------------------ | :--------- |
| **Enterprise 60+ Route Tree Scanner**   | 60+ routes, nested layouts, search schemas | **`41,650 trees/sec`**    | `24.01 µs` |
| **Production 14-Frame Stack Remapping** | Vite + React + TanStack minified bundle    | **`286,576 stacks/sec`**  | `3.49 µs`  |
| **High-Concurrency Interleaved Burst**  | 100 concurrent clients × 1,000 requests    | **`1,828,499 ops/sec`**   | `0.55 µs`  |
| **Heavy JSON Syntax Colorizer**         | 5.7 KB nested object/array payloads        | **`56,311 payloads/sec`** | `17.76 µs` |
| **Adversarial 100KB Message Payload**   | 100 KB giant JSON strings                  | **`10,455 payloads/sec`** | `95.6 µs`  |
| **Ultra-Deep 100-Frame Stack Trace**    | 100-frame recursion stack traces           | **`79,446 stacks/sec`**   | `12.59 µs` |
| **Rapid-Fire Cached Time Formatting**   | 2,000,000 cached millisecond timestamps    | **`2,598,656 ops/sec`**   | `0.39 µs`  |

---

### Hardware Telemetry & Efficiency Matrix

```text
┌─ Hardware Resource Consumption Matrix ───────────────────────────────────┐
  CPU Metrics:
    User execution time:     26,616.5 ms
    System kernel time:      102.0 ms
    Total CPU consumed:      26,718.5 ms
    Execution model:         Single-core thread-safe NAPI fast-path

  RAM / Memory Metrics:
    Resident Set Size (RSS): 68.53 MB
    V8 Heap Used / Total:    5.00 MB / 9.91 MB
    Native External Memory:  2.18 MB
    ArrayBuffers Allocated:  137.5 KB
    Net Heap Growth:         -117.7 KB across 2,000,000 sustained operations

  GPU Metrics:
    Device Model:            Apple M4 (8 cores) · Metal 4
    GPU Compute Load:        0.0% (Pure CPU instruction set / zero GPU offload)
    VRAM Memory Allocated:   0 B (Zero graphics memory residency)

  Suite Throughput Metrics:
    Total Benchmark Calls:   22,305,000 requests executed
    Suite Execution Time:    26.79s
    Correctness Status:      ✓ 80/80 Passed (100% verified)
└──────────────────────────────────────────────────────────────────────────┘
```

- **Zero Memory Leaks**: Across 2,000,000 sustained calls with forced V8 garbage collection before and after, net heap growth is **`-117.7 KB`** (100% leak-free).
- **Zero GPU Overhead**: Does not invoke GPU shaders, Metal/DirectX/Vulkan contexts, or allocate graphics memory buffers (**0.0% GPU cycles, 0 B VRAM**).
- **Adversarial Resilience**: 100% immune to 18 fuzz vectors (directory traversal, 100KB payloads, corrupt VLQ mappings, unclosed JSON) with zero panics or unhandled exceptions.

---

### Benchmark Suite & Profiler Tooling

The native benchmark suite includes an interactive CLI, multi-format exports, and automated regression guards:

```bash
# Run full suite with GC memory leak analysis & hardware telemetry
pnpm bench

# Quick sub-second pass (~1.5s, 2 rounds, scaled iterations)
pnpm bench:quick

# Print only the 3-table Master Performance Dashboard
pnpm bench:summary

# Run automated CI regression guard (fails code 1 if throughput drops > 15%)
pnpm bench:ci

# Export GitHub Flavored Markdown report (or save with -o report.md)
pnpm bench:markdown

# Export structured JSON telemetry (or save with -o report.json)
pnpm bench:json

# Filter specific benchmarks by regex pattern
pnpm bench -f "serverFn"

# Re-benchmark and save current metrics as the reference baseline
pnpm bench:update
```

> **Note on baselines**: the checked-in `scripts/benchmark-baseline.json` stores the best
> observed throughput per benchmark (merged across multiple runs), so it represents the
> binary's capability rather than a worst-case snapshot. Run `pnpm bench` / `pnpm bench:ci`
> on an **idle** machine — heavy background work (compilers, builds) is measured as
> throughput drop by the regression guard even when nothing changed.

---

## License

[MIT](LICENSE) © [kiyors](https://github.com/kiyors)
