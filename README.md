# vite-plugin-logger

A blazing fast Vite logger plugin powered by Rust (NAPI-RS) and TypeScript.

## Features

- **`requestLogger`**: High-performance HTTP request logging. Replaces Vite's default logger with a highly optimized Rust-powered logger. Tracks duration times, tracks aborted connections, and formats output with ANSI colors instantly.
- **`browserLogger`**: Client-side console logging in your terminal. Automatically intercepts `console.log`, `console.error`, and uncaught exceptions from your browser, securely routes them to the Vite dev server via WebSockets, and prints them to your backend terminal. Framework-agnostic and universally injected.

## Installation

Install using your preferred package manager (PNPM is recommended):

```bash
pnpm add -D vite-plugin-logger
```

## Usage

Import the loggers and add them to the `plugins` array in your `vite.config.ts` (or `vite.config.js`).

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { requestLogger, browserLogger } from "vite-plugin-logger";

// Your framework plugin (e.g. React, Vue, Svelte)
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), requestLogger(), browserLogger()],
});
```

That's it!

- Every HTTP request to the Vite Dev Server will now be tracked, formatted, and styled by Rust.
- Every client-side `console.log` and unhandled exception will now magically appear right inside your terminal!
