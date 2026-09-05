import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, type Browser } from "playwright";
import treeKill from "tree-kill";
import { test, expect, beforeAll, afterAll } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const frameworks = ["react", "vue", "svelte", "solid"];

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
});

for (const fw of frameworks) {
  test(`E2E: ${fw} logger works`, async () => {
    let devServer: ChildProcess;
    let output = "";

    await new Promise<void>((resolve, reject) => {
      const cwd = path.resolve(__dirname, `../playground/${fw}-app`);

      const port = Math.floor(Math.random() * 10000) + 10000;

      devServer = spawn("npx", ["vite", "--port", port.toString(), "--strictPort", "--clearScreen", "false"], {
        cwd,
        shell: true,
      });

      devServer.stdout?.on("data", (data) => {
        const str = data.toString();
        output += str;
        if (str.includes("Local:") || str.includes("localhost:")) {
          resolve();
        }
      });

      devServer.stderr?.on("data", (data) => {
        output += data.toString();
      });

      devServer.on("error", (err) => reject(err));
    });

    try {
      const urlMatch = output.match(/http:\/\/localhost:\d+/);
      if (!urlMatch) throw new Error("Could not find dev server URL. Output: " + output);
      const url = urlMatch[0];

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

      expect(output).toContain("hello from playwright browser");
      expect(output).toContain("test-e2e-request");

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

  await new Promise<void>((resolve, reject) => {
    const cwd = path.resolve(__dirname, "../playground/tanstack-start");
    const port = Math.floor(Math.random() * 10000) + 10000;

    devServer = spawn(
      "npx",
      ["vite", "dev", "--force", "--port", port.toString(), "--strictPort", "--clearScreen", "false"],
      {
        cwd,
        shell: true,
        env: { ...process.env, NODE_ENV: "development" },
      },
    );

    devServer.stdout?.on("data", (data) => {
      const str = data.toString();
      output += str;
      if (str.includes("Local:") || str.includes("localhost:")) {
        resolve();
      }
    });

    devServer.stderr?.on("data", (data) => {
      output += data.toString();
    });

    devServer.on("error", (err) => reject(err));
  });

  try {
    const urlMatch = output.match(/http:\/\/localhost:\d+/);
    if (!urlMatch) throw new Error("Could not find dev server URL. Output: " + output);
    const url = urlMatch[0];

    const page = await browser.newPage();
    output = "";

    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#btn-server-fn", { timeout: 10000 });
    await page.waitForTimeout(1200);
    output = "";

    // 1. Test Server Function decoding
    await page.click("#btn-server-fn");
    await page.waitForFunction(
      () => document.getElementById("logger-status")?.textContent?.includes("Server function called"),
      { timeout: 5000 },
    );
    await page.waitForTimeout(500);
    expect(output).toContain("[server-fn]");
    expect(output).toContain("getAuthSession");
    expect(output).toContain("routes/__root.tsx");

    // 2. Test Parameterized Route matching via routeTree.gen.ts
    await page.click("#btn-route-request");
    await page.waitForFunction(
      () => document.getElementById("logger-status")?.textContent?.includes("Matched route requested"),
      { timeout: 5000 },
    );
    await page.waitForTimeout(500);
    expect(output).toContain("[route]");
    expect(output).toContain("/speakers/cedric-grolet");
    expect(output).toContain("[/speakers/$slug]");

    // 3. Test Batched Server Functions (debounced with repeat count)
    await page.click("#btn-batch-server-fn");
    await page.waitForTimeout(800);
    expect(output).toContain("(x3)");

    // 4. Test Rich Browser Logging & Timers
    await page.click("#btn-rich-log");
    await page.waitForTimeout(600);
    expect(output).toContain("alex");
    expect(output).toContain("Haute Pâtisserie");

    await page.click("#btn-timer-log");
    await page.waitForTimeout(600);
    expect(output).toContain("tanstack-operation");

    // 5. Test Client-side SPA navigation
    await page.click("#link-spa-speaker");
    await page.waitForTimeout(800);
    expect(output).toContain("/speakers/cedric-grolet");

    await page.close();
  } finally {
    if (devServer! && devServer.pid) {
      await new Promise<void>((resolve) => {
        treeKill(devServer.pid!, "SIGKILL", () => resolve());
      });
    }
  }
}, 45000);
