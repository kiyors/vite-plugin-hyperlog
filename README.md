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

That's it!

- Every HTTP request to the Vite Dev Server will now be tracked, formatted, and styled by Rust.
- Every client-side `console.log` and unhandled exception will now magically appear right inside your terminal!
