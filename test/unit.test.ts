import { describe, expect, it } from "vitest";

import {
  formatBrowserLog,
  formatLogEntry,
  formatRouteLog,
  parseRouteTreeAst,
  remapSourcePosition,
  remapStackTrace,
} from "../index.js";
import { parseRouteTreeContent } from "../src/tanstack";
import { registerTanStackRouterLogger } from "../src/tanstack-client";

describe("Route Tree Parser", () => {
  const sampleRouteTree = `
    import { Route as rootRoute } from './routes/__root'
    import { Route as LoginImport } from './routes/login/index'
    import { Route as JoinImport } from './routes/join/index'
    import { Route as IndexImport } from './routes/index'
    import { Route as TeamIdChannelsChannelIdImport } from './routes/$teamId/channels/$channelId'
    import { Route as TeamIdIssuesImport } from './routes/$teamId/issues/index'

    const LoginRoute = LoginImport.update({
      id: '/login',
      path: '/login',
      getParentRoute: () => rootRoute,
    })

    const IndexRoute = IndexImport.update({
      id: '/',
      path: '/',
      getParentRoute: () => rootRoute,
    })

    const TeamIdChannelsChannelIdRoute = TeamIdChannelsChannelIdImport.update({
      id: '/$teamId/channels/$channelId',
      path: '/$teamId/channels/$channelId',
      fullPath: '/$teamId/channels/$channelId',
      getParentRoute: () => rootRoute,
    })

    const TeamIdIssuesRoute = TeamIdIssuesImport.update({
      id: '/$teamId/issues',
      path: '/$teamId/issues',
      fullPath: '/$teamId/issues',
      getParentRoute: () => rootRoute,
    })
  `;

  it("extracts all unique route patterns", () => {
    const matchers = parseRouteTreeContent(sampleRouteTree);
    const patterns = matchers.map((m) => m.pattern);

    expect(patterns).toContain("/");
    expect(patterns).toContain("/login");
    expect(patterns).toContain("/$teamId/channels/$channelId");
    expect(patterns).toContain("/$teamId/issues");
  });

  it("correctly matches parameterized routes", () => {
    const matchers = parseRouteTreeContent(sampleRouteTree);

    const findMatch = (urlPath: string) => {
      for (const matcher of matchers) {
        if (matcher.regex.test(urlPath)) {
          return matcher.pattern;
        }
      }
      return null;
    };

    expect(findMatch("/")).toBe("/");
    expect(findMatch("/login")).toBe("/login");
    expect(findMatch("/team-alpha/channels/general")).toBe("/$teamId/channels/$channelId");
    expect(findMatch("/team-alpha/issues")).toBe("/$teamId/issues");
    expect(findMatch("/unregistered/deep/path/that/does/not/match")).toBeNull();
  });

  it("prioritizes fullPath to prevent relative child fragments from masking routes", () => {
    const complexTree = `
      const ChannelRoute = ChannelImport.update({
        id: '/$channelId',
        path: '/$channelId',
        getParentRoute: () => ChannelsRoute,
      })

      interface FileRoutesByPath {
        '/$teamId/channels/$channelId': {
          id: '/$teamId/channels/$channelId'
          path: '/$channelId'
          fullPath: '/$teamId/channels/$channelId'
        }
      }
    `;

    const matchers = parseRouteTreeContent(complexTree);
    const patterns = matchers.map((m) => m.pattern);

    expect(patterns).toContain("/$teamId/channels/$channelId");
    expect(patterns).not.toContain("/$channelId");
  });

  it("extracts routes with native OXC AST parser including interfaces and calls", () => {
    const tsCode = `
      import { createFileRoute } from '@tanstack/react-router'

      export const Route = createFileRoute('/$teamId/projects/$projectId')({
        component: ProjectComponent,
      })

      export interface FileRoutesByFullPath {
        '/': typeof IndexRoute
        '/login': typeof LoginRoute
        '/$teamId/settings': typeof SettingsRoute
      }

      export type AppRoutes = '/' | '/dashboard';
    `;

    const routes = parseRouteTreeAst(tsCode);
    expect(routes).toContain("/$teamId/projects/$projectId");
    expect(routes).toContain("/");
    expect(routes).toContain("/login");
    expect(routes).toContain("/$teamId/settings");
    expect(routes).toContain("/dashboard");
  });
});

describe("Native Rust formatLogEntry", () => {
  it("formats server functions with decoded name and file", () => {
    const b64 =
      "eyJmaWxlIjoiL3NyYy9yb3V0ZXMvX19yb290LnRzeD90c3Mtc2VydmVyZm4tc3BsaXQiLCJleHBvcnQiOiJnZXRBdXRoU2Vzc2lvbl9jcmVhdGVTZXJ2ZXJGbl9oYW5kbGVyIn0";
    const url = `/_serverFn/${b64}`;

    const log = formatLogEntry(url, "GET", 200, 18.82, null, null, null, null);
    expect(log).not.toBeNull();
    expect(log).toContain("[server-fn]");
    expect(log).toContain("getAuthSession");
    expect(log).toContain("routes/__root.tsx");
    expect(log).toContain("18.82ms");
  });

  it("formats server function with repeat count when batched", () => {
    const b64 =
      "eyJmaWxlIjoiL3NyYy9saWIvd29ya3NwYWNlLWxvYWRlci50cz90c3Mtc2VydmVyZm4tc3BsaXQiLCJleHBvcnQiOiJnZXRXb3Jrc3BhY2VzX2NyZWF0ZVNlcnZlckZuX2hhbmRsZXIifQ";
    const url = `/_serverFn/${b64}`;

    const log = formatLogEntry(url, "GET", 200, 14.28, null, null, null, 5);
    expect(log).not.toBeNull();
    expect(log).toContain("[server-fn]");
    expect(log).toContain("getWorkspaces");
    expect(log).toContain("(x5)");
  });

  it("formats server function failure with red status and fail indicator", () => {
    const b64 =
      "eyJmaWxlIjoiL3NyYy9yb3V0ZXMvX19yb290LnRzeD90c3Mtc2VydmVyZm4tc3BsaXQiLCJleHBvcnQiOiJnZXRBdXRoU2Vzc2lvbl9jcmVhdGVTZXJ2ZXJGbl9oYW5kbGVyIn0";
    const url = `/_serverFn/${b64}`;

    const log = formatLogEntry(url, "POST", 500, 42.1, null, null, null, null);
    expect(log).not.toBeNull();
    expect(log).toContain("[server-fn]");
    expect(log).toContain("500");
    expect(log).toContain("❌");
  });

  it("formats redirect responses with destination arrow", () => {
    const log = formatLogEntry("/", "GET", 307, 120.5, null, "/login?redirect=%2F", null, null);
    expect(log).not.toBeNull();
    expect(log).toContain("[route]");
    expect(log).toContain("307");
    expect(log).toContain("➜");
    expect(log).toContain("/login?redirect=%2F");
  });

  it("formats routes with matched route pattern", () => {
    const log = formatLogEntry(
      "/team-alpha/channels/general",
      "GET",
      200,
      45.2,
      null,
      null,
      "/$teamId/channels/$channelId",
      null,
    );
    expect(log).not.toBeNull();
    expect(log).toContain("[route]");
    expect(log).toContain("/team-alpha/channels/general");
    expect(log).toContain("[/$teamId/channels/$channelId]");
  });

  it("categorizes tsx source files as [module]", () => {
    const log = formatLogEntry("/src/router.tsx", "GET", 200, 0.23, null, null, null, null);
    expect(log).not.toBeNull();
    expect(log).toContain("[module]");
  });
});

describe("Native Rust formatRouteLog", () => {
  it("formats client-side SPA route navigation events", () => {
    const log = formatRouteLog(
      "/$teamId/issues",
      "/team-alpha/issues",
      JSON.stringify({ teamId: "team-alpha" }),
      24.5,
      false,
    );
    expect(log).not.toBeNull();
    expect(log).toContain("[route]");
    expect(log).toContain("➜");
    expect(log).toContain("/team-alpha/issues");
    expect(log).toContain("[/$teamId/issues]");
    expect(log).toContain("24.5ms");
    expect(log).toContain("teamId");
  });

  it("formats client-side route preloads", () => {
    const log = formatRouteLog("/$teamId/settings", "/$teamId/settings", null, 14.2, true);
    expect(log).not.toBeNull();
    expect(log).toContain("[preload]");
    expect(log).toContain("⤓");
    expect(log).toContain("/$teamId/settings");
    expect(log).toContain("preloaded in 14.2ms");
  });
});

describe("Native Rust formatBrowserLog", () => {
  it("formats browser log with clickable caller location", () => {
    const log = formatBrowserLog("log", "User authenticated", "src/components/Login.tsx:42", null);
    expect(log).not.toBeNull();
    expect(log).toContain("[browser]");
    expect(log).toContain("User authenticated");
    expect(log).toContain("(src/components/Login.tsx:42)");
  });

  it("formats browser timer from console.timeEnd", () => {
    const log = formatBrowserLog("time", "fetchData: 142.50ms", "src/lib/api.ts:20", null);
    expect(log).not.toBeNull();
    expect(log).toContain("[browser timer]");
    expect(log).toContain("fetchData: 142.50ms");
    expect(log).toContain("(src/lib/api.ts:20)");
  });

  it("formats and colorizes json objects logged in browser", () => {
    const json = JSON.stringify({ user: "alex", count: 10, active: true });
    const log = formatBrowserLog("log", json, "src/main.ts:15", null);
    expect(log).not.toBeNull();
    expect(log).toContain("user");
    expect(log).toContain("alex");
    expect(log).toContain("10");
    expect(log).toContain("true");
    expect(log).toContain("(src/main.ts:15)");
  });

  it("cleans browser error stack trace and highlights user code", () => {
    const stack =
      "Error: Database disconnected\n    at query (http://localhost:3000/src/db.ts:18:9)\n    at dispatch (http://localhost:3000/node_modules/.vite/deps/react.js:45:10)";
    const log = formatBrowserLog("error", stack, "src/db.ts:18", null);
    expect(log).not.toBeNull();
    expect(log).toContain("[browser error]");
    expect(log).toContain("Database disconnected");
    expect(log).toContain("➜");
    expect(log).toContain("src/db.ts:18");
  });

  it("formats repeated browser log with repeat badge", () => {
    const log = formatBrowserLog("warn", "Slow render detected", "src/view.tsx:30", 5);
    expect(log).not.toBeNull();
    expect(log).toContain("[browser warn]");
    expect(log).toContain("(x5)");
  });
});

describe("Native OXC SourceMap Remapping", () => {
  const sampleSourceMap = JSON.stringify({
    version: 3,
    file: "bundle.js",
    sources: ["src/App.tsx"],
    sourcesContent: ["const App = () => { throw new Error('Crash'); };"],
    names: ["App", "Error"],
    mappings: "AAAA,MAAMA,GAAM,QAAQ,IAAIC,GAAM",
  });

  it("remaps compiled positions to original source TypeScript file and lines", () => {
    const pos = remapSourcePosition(sampleSourceMap, 1, 6);
    expect(pos).not.toBeNull();
    expect(pos?.source).toBe("src/App.tsx");
    expect(pos?.line).toBe(1);
    expect(pos?.name).toBe("App");
  });

  it("remaps error stack trace frames using native sourcemap engine", () => {
    const stack = "Error: Crash\n    at bundle.js:1:6";
    const remapped = remapStackTrace(sampleSourceMap, stack);
    expect(remapped).toContain("src/App.tsx:1");
    expect(remapped).toContain("App");
  });
});

describe("Client registerTanStackRouterLogger", () => {
  it("subscribes to onBeforeNavigate, onResolved, onPreloaded and dispatches events", async () => {
    const subscribers = new Map<string, (event: any) => void>();
    const fakeRouter = {
      state: {
        matches: [
          { routeId: "__root__", id: "__root__" },
          { routeId: "/$teamId", id: "/$teamId", params: { teamId: "team-alpha" } },
          { routeId: "/$teamId/issues/", id: "/$teamId/issues/", params: { teamId: "team-alpha" } },
        ],
        location: { pathname: "/team-alpha/issues", href: "/team-alpha/issues" },
      },
      subscribe: (event: string, cb: (e: any) => void) => {
        subscribers.set(event, cb);
        return () => subscribers.delete(event);
      },
    };

    let fetchCall: { url: string; body: any } | null = null;
    const originalFetch = globalThis.fetch;
    // SAFETY: Preserving global window reference for teardown
    const originalWindow = (globalThis as any).window;
    // SAFETY: Mocking globalThis.window so registerTanStackRouterLogger can run in node test environment
    (globalThis as any).window = globalThis;
    // @ts-expect-error mock fetch
    globalThis.fetch = async (url: string, init?: any) => {
      fetchCall = { url, body: JSON.parse(init?.body || "{}") };
      return new Response(null, { status: 204 });
    };

    try {
      registerTanStackRouterLogger(fakeRouter);

      expect(subscribers.has("onBeforeNavigate")).toBe(true);
      expect(subscribers.has("onResolved")).toBe(true);
      expect(subscribers.has("onPreloaded")).toBe(true);

      // Trigger navigation start
      subscribers.get("onBeforeNavigate")!({});

      // Trigger navigation resolution
      subscribers.get("onResolved")!({
        toLocation: { pathname: "/team-alpha/issues" },
      });

      expect(fetchCall).not.toBeNull();
      expect(fetchCall?.url).toBe("/__hyperlog/route");
      expect(fetchCall?.body.path).toBe("/team-alpha/issues");
      expect(fetchCall?.body.routeId).toBe("/$teamId/issues");
      expect(fetchCall?.body.isPreload).toBe(false);
      expect(fetchCall?.body.durationMs).toBeGreaterThanOrEqual(0);
      expect(fetchCall?.body.params).toContain("team-alpha");

      // Test preload
      fetchCall = null;
      subscribers.get("onPreloaded")!({
        toLocation: { pathname: "/team-alpha/projects" },
        matches: [{ routeId: "/$teamId/projects" }],
      });

      expect(fetchCall).not.toBeNull();
      expect(fetchCall?.url).toBe("/__hyperlog/route");
      expect(fetchCall?.body.path).toBe("/team-alpha/projects");
      expect(fetchCall?.body.routeId).toBe("/$teamId/projects");
      expect(fetchCall?.body.isPreload).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
      // SAFETY: Restoring original window after test teardown
      (globalThis as any).window = originalWindow;
    }
  });
});
