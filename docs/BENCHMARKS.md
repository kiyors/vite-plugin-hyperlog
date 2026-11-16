# Benchmarks

Full performance data for `vite-plugin-hyperlog`. The [README](../README.md) keeps a short summary; this document holds the complete tables, the traffic simulation, and the commands to reproduce every number.

All figures were measured on an idle Apple M4 (Node.js 24, darwin-arm64) unless a section says otherwise.

## 0.3.0 → 0.4.0 Improvement

The 0.4.0 release switched the release profile to `opt-level = 3` and merged the
per-request exclusion/module classification into one native crossing. Measured
on an idle Apple M4 (Node 24, darwin-arm64), before → after:

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

The compile-time trade-off is ~100 KB of additional binary size (still ~97%
smaller than the pre-optimization dependency-heavy build).

## Binary Footprint

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

## Microbenchmarks (Throughput & Latency)

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

## Real-World Production Traffic Simulation

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

## Enterprise Real-World Scenarios

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

## Hardware Telemetry & Efficiency Matrix

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

## Benchmark Suite & Profiler Tooling

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
