import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, type Browser } from "playwright";
import treeKill from "tree-kill";
import { test, expect, beforeAll, afterAll } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// pnpm/npm name the local bin `vite` on POSIX but `vite.cmd` on Windows.
const isWindows = process.platform === "win32";
const viteBinName = isWindows ? "vite.cmd" : "vite";

function localViteBin(root: string): string {
  return path.resolve(root, "node_modules/.bin", viteBinName);
}

// `__dirname` can resolve through a symlink into a read-only store (nix, etc.),
// which puts the spawned dev server outside the workspace so it cannot find the
// local Vite install. Pick whichever candidate root actually has the local Vite.
const repoRootCandidates = [process.cwd(), path.resolve(__dirname, "..")];
const repoRoot = repoRootCandidates.find((dir) => existsSync(localViteBin(dir))) ?? repoRootCandidates[0];

/**
 * Spawns the workspace's own Vite rather than going through `npx`.
 *
 * `npx vite` silently downloads a different Vite when the local bin link is
 * missing, which then fails to resolve the workspace plugin at all.
 */
function spawnVite(cwd: string, args: string[], env?: NodeJS.ProcessEnv): ChildProcess {
  const spawnEnv = env ? { ...process.env, ...env } : process.env;
  const localBin = localViteBin(repoRoot);
  if (existsSync(localBin)) {
    return spawn(localBin, args, { cwd, shell: isWindows, env: spawnEnv });
  }
  return spawn("npx", ["vite", ...args], { cwd, shell: true, env: spawnEnv });
}

const frameworks = ["react", "vue", "svelte", "solid"];

let browser: Browser;

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");
}

beforeAll(async () => {
  browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
});

afterAll(async () => {
  await browser?.close();
});

for (const fw of frameworks) {
  test(`E2E: ${fw} logger works`, async () => {
    let devServer: ChildProcess;
    let output = "";
    const port = Math.floor(Math.random() * 10000) + 10000;

    await new Promise<void>((resolve, reject) => {
      const cwd = path.resolve(repoRoot, `playground/${fw}-app`);

      devServer = spawnVite(cwd, ["--port", port.toString(), "--strictPort", "--clearScreen", "false"]);

      devServer.stdout?.on("data", (data) => {
        output += data.toString();
        const clean = stripAnsi(output);
        if (
          clean.includes("Local:") ||
          clean.includes(`http://localhost:${port}`) ||
          clean.includes(`http://127.0.0.1:${port}`)
        ) {
          resolve();
        }
      });

      devServer.stderr?.on("data", (data) => {
        output += data.toString();
      });

      devServer.on("error", (err) => reject(err));
      devServer.on("exit", (code) => {
        if (code !== null && code !== 0) {
          reject(new Error(`Dev server exited with code ${code}. Output: ${stripAnsi(output)}`));
        }
      });
    });

    try {
      const clean = stripAnsi(output);
      const urlMatch = clean.match(/http:\/\/(?:localhost|127\.0\.0\.1):\d+/);
      const url = urlMatch ? urlMatch[0] : `http://localhost:${port}`;

      const page = await browser.newPage();

      output = "";

      await page.goto(url);

      await page.waitForTimeout(500);

      await page.evaluate(() => {
        console.log("hello from playwright browser");
      });

      await page.evaluate(async () => {
        try {
          await fetch("/api/test-e2e-request");
        } catch {}
      });

      await page.waitForTimeout(1000);

      expect(stripAnsi(output)).toContain("hello from playwright browser");
      expect(stripAnsi(output)).toContain("test-e2e-request");

      await page.close();
    } finally {
      if (devServer! && devServer.pid) {
        await new Promise<void>((resolve) => {
          treeKill(devServer.pid!, "SIGKILL", () => resolve());
        });
      }
    }
  }, 20000);
}

test("E2E: tanstack logger with server-fn, routeTree, SPA nav, and rich logs", async () => {
  let devServer: ChildProcess;
  let output = "";
  const port = Math.floor(Math.random() * 10000) + 10000;

  await new Promise<void>((resolve, reject) => {
    const cwd = path.resolve(repoRoot, "playground/tanstack-start");

    devServer = spawnVite(
      cwd,
      ["dev", "--force", "--port", port.toString(), "--strictPort", "--clearScreen", "false"],
      { NODE_ENV: "development" },
    );

    devServer.stdout?.on("data", (data) => {
      output += data.toString();
      const clean = stripAnsi(output);
      if (
        clean.includes("Local:") ||
        clean.includes(`http://localhost:${port}`) ||
        clean.includes(`http://127.0.0.1:${port}`)
      ) {
        resolve();
      }
    });

    devServer.stderr?.on("data", (data) => {
      output += data.toString();
    });

    devServer.on("error", (err) => reject(err));
    devServer.on("exit", (code) => {
      if (code !== null && code !== 0) {
        reject(new Error(`Dev server exited with code ${code}. Output: ${stripAnsi(output)}`));
      }
    });
  });

  try {
    const clean = stripAnsi(output);
    const urlMatch = clean.match(/http:\/\/(?:localhost|127\.0\.0\.1):\d+/);
    const url = urlMatch ? urlMatch[0] : `http://localhost:${port}`;

    const page = await browser.newPage();
    output = "";

    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('#logger-tester[data-hydrated="true"]', { timeout: 25000 });
    await page.waitForTimeout(500);
    output = "";

    // 1. Test Server Function decoding
    await page.click("#btn-server-fn");
    await page.waitForFunction(
      () => document.getElementById("logger-status")?.textContent?.includes("Server function called"),
      { timeout: 10000 },
    );
    await page.waitForTimeout(500);
    expect(stripAnsi(output)).toContain("[server-fn]");
    expect(stripAnsi(output)).toContain("getAuthSession");
    expect(stripAnsi(output)).toContain("routes/__root.tsx");

    // 2. Test Parameterized Route matching via routeTree.gen.ts
    await page.click("#btn-route-request");
    await page.waitForFunction(
      () => document.getElementById("logger-status")?.textContent?.includes("Matched route requested"),
      { timeout: 10000 },
    );
    await page.waitForTimeout(500);
    expect(stripAnsi(output)).toContain("[route]");
    expect(stripAnsi(output)).toContain("/speakers/cedric-grolet");
    expect(stripAnsi(output)).toContain("[/speakers/$slug]");

    // 3. Test Batched Server Functions (debounced with repeat count)
    await page.click("#btn-batch-server-fn");
    await page.waitForFunction(
      () => document.getElementById("logger-status")?.textContent?.includes("Batched server functions dispatched"),
      { timeout: 10000 },
    );
    await page.waitForTimeout(800);
    expect(stripAnsi(output)).toContain("(x3)");

    // 4. Test Rich Browser Logging & Timers
    await page.click("#btn-rich-log");
    await page.waitForFunction(
      () => document.getElementById("logger-status")?.textContent?.includes("Rich object logged to terminal"),
      { timeout: 10000 },
    );
    await page.waitForTimeout(600);
    expect(stripAnsi(output)).toContain("alex");
    expect(stripAnsi(output)).toContain("Haute Pâtisserie");

    await page.click("#btn-timer-log");
    await page.waitForFunction(
      () => document.getElementById("logger-status")?.textContent?.includes("Timer logged to terminal"),
      { timeout: 10000 },
    );
    await page.waitForTimeout(600);
    expect(stripAnsi(output)).toContain("tanstack-operation");

    // 5. Test Client-side SPA navigation
    await page.click("#link-spa-speaker");
    await page.waitForTimeout(800);
    expect(stripAnsi(output)).toContain("/speakers/cedric-grolet");

    await page.close();
  } finally {
    if (devServer! && devServer.pid) {
      await new Promise<void>((resolve) => {
        treeKill(devServer.pid!, "SIGKILL", () => resolve());
      });
    }
  }
}, 60000);
