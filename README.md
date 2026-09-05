# vite-plugin-hyperlog

A blazing fast Vite logger plugin powered by Rust (NAPI-RS) and TypeScript.

> **Note**: This plugin supports multiple frameworks via tailored entry points (React, Vue, Svelte, Solid, and TanStack).

## Features

- **`requestLogger`**: High-performance HTTP request logging. Replaces Vite's default logger with a highly optimized Rust-powered logger. Tracks duration times, tracks aborted connections, and formats output with ANSI colors instantly.
- **`browserLogger`**: Client-side console logging in your terminal. Automatically intercepts `console.log`, `console.error`, and uncaught exceptions from your browser, securely routes them to the Vite dev server via WebSockets, and prints them to your backend terminal. Framework-agnostic and universally injected.

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

  // Custom URL substrings to exclude from the logs
  excludeUrls: ["/my-custom-endpoint"],
});
```

### TanStack Start & TanStack Router

For TanStack applications, import from `vite-plugin-hyperlog/tanstack`. It includes tailored optimizations:

- **Server Function Decoding**: Automatically decodes `/_serverFn` base64 endpoints to display human-readable function names and source files (e.g. `[server-fn] 200 GET getAuthSession (routes/__root.tsx) 18.82ms`), flagging errors with `❌`.
- **Duplicate Batching**: Groups and debounces consecutive duplicate server function calls (e.g. `(x5)`) during component mounts and revalidations.
- **Route Pattern Matching**: Powered by an ultra-fast, native Rust AST parser to extract route patterns and types from `src/routeTree.gen.ts` with 0 regex fragility, displaying parameterized route patterns (e.g. `/$teamId/channels/$channelId`) alongside the requested URL.
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
    }),
    browserLogger(),
  ],
});
```

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

### Enhanced Browser Logging

`browserLogger` captures client-side events via WebSockets and formats them natively with Rust:

- **Clickable Source Callers**: Automatically resolves caller locations (e.g. `(src/components/Login.tsx:42)`) so you can cmd-click directly to your code in modern terminals (VS Code, iTerm, Warp, Ghostty).
- **ANSI Syntax Highlighting**: Powered by a zero-copy, pure native Rust JSON tokenizer to colorize objects logged from the browser with syntax coloring for keys, strings, numbers, booleans, and nulls.
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

By eliminating heavy transitive dependencies (`serde`, `regex`, `chrono`, `yansi`, `oxc_parser`, `oxc_sourcemap`) and replacing them with hand-optimized pure Rust zero-allocation algorithms, the compiled binary footprint was reduced by **97.6%**:

| Architecture                       | Previous Size | Current Size | Reduction  |
| :--------------------------------- | :------------ | :----------- | :--------- |
| **macOS ARM64** (`darwin-arm64`)   | `15.0 MB`     | **`363 KB`** | **-97.6%** |
| **macOS x64** (`darwin-x64`)       | `15.2 MB`     | **`378 KB`** | **-97.5%** |
| **Linux x64** (`linux-x64-gnu`)    | `15.8 MB`     | **`392 KB`** | **-97.5%** |
| **Windows x64** (`win32-x64-msvc`) | `14.9 MB`     | **`354 KB`** | **-97.6%** |

---

### Microbenchmarks (Throughput & Latency)

> Tested on **Apple M4 (8 cores, 16 GB Unified Memory)** on macOS with Node.js v23.
> 5 statistical rounds per benchmark, measuring average, p50, and p99 latencies.

| Function / API               | Workload Description           | Throughput              | Avg Latency | P99 Latency | CPU per Call |
| :--------------------------- | :----------------------------- | :---------------------- | :---------- | :---------- | :----------- |
| **`formatRouteLog`**         | Navigations & preloads         | **`1,816,014 ops/sec`** | `0.551 µs`  | `0.568 µs`  | `0.55 µs`    |
| **`getBrowserLoggerScript`** | Vite client injector script    | **`1,711,222 ops/sec`** | `0.585 µs`  | `0.615 µs`  | `0.58 µs`    |
| **`formatBrowserLog`**       | 6-type mixed browser telemetry | **`1,405,299 ops/sec`** | `0.712 µs`  | `0.729 µs`  | `0.71 µs`    |
| **`formatLogEntry`**         | 6-path mixed HTTP requests     | **`1,336,623 ops/sec`** | `0.749 µs`  | `0.803 µs`  | `0.75 µs`    |
| **`remapSourcePosition`**    | VLQ sourcemap token lookup     | **`971,643 ops/sec`**   | `1.030 µs`  | `1.061 µs`  | `1.03 µs`    |
| **`remapStackTrace`**        | 5-frame stack trace remapping  | **`601,853 ops/sec`**   | `1.663 µs`  | `1.733 µs`  | `1.65 µs`    |
| **`parseRouteTreeAst`**      | TanStack 15-route tree parsing | **`335,410 trees/sec`** | `2.982 µs`  | `3.050 µs`  | `2.98 µs`    |

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

- **Effective Throughput**: **`1,486,750 requests / sec`**
- **Average Latency**: **`0.673 µs`** per logged event
- **Total Time**: `336.3 ms` for all 500,000 requests
- **Memory RSS Growth**: `< 1.8 MB` during burst

---

### Enterprise Real-World Scenarios

| Real-World Scenario                     | Workload Scale                             | Throughput                | Latency    |
| :-------------------------------------- | :----------------------------------------- | :------------------------ | :--------- |
| **Enterprise 60+ Route Tree AST**       | 60+ routes, nested layouts, search schemas | **`37,639 trees/sec`**    | `26.56 µs` |
| **Production 14-Frame Stack Remapping** | Vite + React + TanStack minified bundle    | **`176,970 stacks/sec`**  | `5.65 µs`  |
| **High-Concurrency Interleaved Burst**  | 100 concurrent clients × 200 requests      | **`1,387,223 ops/sec`**   | `0.72 µs`  |
| **Heavy JSON Syntax Colorizer**         | 5.7 KB nested object/array payloads        | **`47,692 payloads/sec`** | `20.96 µs` |

---

### Hardware Telemetry & Efficiency Matrix

```text
┌─ Hardware Resource Consumption Matrix ───────────────────────────────────┐
  CPU Metrics:
    User execution time:     11,011.9 ms
    System kernel time:      120.5 ms
    Total CPU consumed:      11,132.3 ms
    Execution model:         Single-core thread-safe NAPI fast-path

  RAM / Memory Metrics:
    Resident Set Size (RSS): 67.92 MB
    V8 Heap Used / Total:    4.77 MB / 9.89 MB
    Native External Memory:  2.18 MB
    ArrayBuffers Allocated:  134.3 KB
    Net Heap Growth:         -4.3 KB across 2,000,000 sustained operations

  GPU Metrics:
    Device Model:            Apple M4 (8 cores) · Metal 4
    GPU Compute Load:        0.0% (Pure CPU instruction set / zero GPU offload)
    VRAM Memory Allocated:   0 B (Zero graphics memory residency)

  Suite Throughput Metrics:
    Total Benchmark Calls:   8,600,000 requests executed
    Suite Execution Time:    11.29s
    Correctness Status:      ✓ 61/61 Passed (100% verified)
└──────────────────────────────────────────────────────────────────────────┘
```

- **Zero Memory Leaks**: Across 2,000,000 sustained calls with forced V8 garbage collection before and after, net heap growth is **`-4.3 KB`** (100% leak-free).
- **Zero GPU Overhead**: Does not invoke GPU shaders, Metal/DirectX/Vulkan contexts, or allocate graphics memory buffers (**0.0% GPU cycles, 0 B VRAM**).
- **Adversarial Resilience**: 100% immune to 18 fuzz vectors (directory traversal, 100KB payloads, corrupt VLQ mappings, unclosed JSON) with zero panics or unhandled exceptions.

---

### Running the Benchmark Suite

To run the full suite with exact V8 garbage collection telemetry:

```bash
pnpm bench
```

To run a quick microbenchmark without GC profiling:

```bash
pnpm bench:quick
```

---

## License

[MIT](LICENSE) © [kiyors](https://github.com/kiyors)
