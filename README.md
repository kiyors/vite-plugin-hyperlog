# @kiyors/vite-plugin-logger

A blazing fast Vite logger plugin powered by Rust (NAPI-RS) and TypeScript.

> **Note**: This plugin supports multiple frameworks via tailored entry points (React, Vue, Svelte, Solid, and TanStack).

## Features

- **`requestLogger`**: High-performance HTTP request logging. Replaces Vite's default logger with a highly optimized Rust-powered logger. Tracks duration times, tracks aborted connections, and formats output with ANSI colors instantly.
- **`browserLogger`**: Client-side console logging in your terminal. Automatically intercepts `console.log`, `console.error`, and uncaught exceptions from your browser, securely routes them to the Vite dev server via WebSockets, and prints them to your backend terminal. Framework-agnostic and universally injected.

## Installation

Install using your preferred package manager (PNPM is recommended):

```bash
pnpm add -D @kiyors/vite-plugin-logger
```

## Usage

Import `requestLogger` and `browserLogger` from your specific framework's entry point, and add them to the `plugins` array in your `vite.config.ts`. The framework-specific import automatically sets up optimized exclusions.

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { requestLogger, browserLogger } from "@kiyors/vite-plugin-logger/react";
// OR from "@kiyors/vite-plugin-logger/tanstack";
// OR from "@kiyors/vite-plugin-logger/vue";

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

For TanStack applications, import from `@kiyors/vite-plugin-logger/tanstack`. It includes tailored optimizations:

- **Server Function Decoding**: Automatically decodes `/_serverFn` base64 endpoints to display human-readable function names and source files (e.g. `[server-fn] 200 GET getAuthSession (routes/__root.tsx) 18.82ms`), flagging errors with `❌`.
- **Duplicate Batching**: Groups and debounces consecutive duplicate server function calls (e.g. `(x5)`) during component mounts and revalidations.
- **Route Pattern Matching**: Powered by native [OXC](https://oxc.rs) AST parsing to extract route patterns and types from `src/routeTree.gen.ts` with 0 regex fragility, displaying parameterized route patterns (e.g. `/$teamId/channels/$channelId`) alongside the requested URL.
- **Module Noise Filtering**: Automatically filters out internal Vite `.tsx`/`.ts` module compilation noise and code-split queries (`?tsr-split=component`).

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { requestLogger, browserLogger } from "@kiyors/vite-plugin-logger/tanstack";

export default defineConfig({
  plugins: [
    requestLogger({
      // Exclude internal module compilation noise (default: true)
      excludeModules: true,
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

```typescript
// src/router.tsx (or your client router entry)
import { createRouter } from "@tanstack/react-router";
import { registerTanStackRouterLogger } from "@kiyors/vite-plugin-logger/tanstack";
import { routeTree } from "./routeTree.gen";

export const router = createRouter({ routeTree });

// Log client-side SPA transitions and preloads to your dev terminal
registerTanStackRouterLogger(router);
```

##### Terminal Output Example

```text
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
- **ANSI Syntax Highlighting**: Powered by `colored_json` to colorize JSON and objects logged from the browser with zero-copy ANSI styling for keys, strings, numbers, booleans, and nulls.
- **Timer Support**: Supports `console.time('label')` and `console.timeEnd('label')` to track client-side performance.
- **Intelligent Stack Trace Cleaning & Sourcemap Remapping**: Powered by `regex` and `oxc_sourcemap` to parse browser error frames, highlight user application frames (`➜ src/lib/api.ts:25:11 in fetchUser`), dim dependency noise, and remap positions to original TypeScript source files.
- **Flood Protection**: Rapid repetitive logs (e.g. from render loops or scroll listeners) are debounced and collapsed with a repeat counter (`(x5)`).

```text
22:56:51 [browser]       User signed in  (src/components/Login.tsx:42)
22:57:05 [browser timer] loadData: 48.20ms  (src/routes/dashboard.tsx:88)
22:57:10 [browser warn]  Slow render detected (x3)  (src/view.tsx:15)
22:57:15 [browser error] Error: Failed to fetch  (src/lib/api.ts:25)
  ➜ src/lib/api.ts:25:11 in fetchUser
    node_modules/.vite/deps/react.js:124:19
```

That's it!

- Every HTTP request to the Vite Dev Server will now be tracked, formatted, and styled by Rust.
- Every client-side `console.log` and unhandled exception will now magically appear right inside your terminal!
