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
  await browser.close();
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
