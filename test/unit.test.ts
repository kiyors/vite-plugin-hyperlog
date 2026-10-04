import { describe, expect, it } from "vitest";

import {
  formatBrowserLog,
  formatLogEntry,
  formatRouteLog,
  parseRouteTreeAst,
  remapSourcePosition,
  remapStackTrace,
} from "../index.js";
import { GraphReevaluationDetector } from "../src/graph";
import { browserLoggerScriptSrc, isModuleRequest, matchesExclusion } from "../src/plugin";
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

describe("Terminal escape sanitization", () => {
  it("strips escape sequences from browser log messages", () => {
    const log = formatBrowserLog("error", "\x1b[2J\x1b[HFAKE [browser error] boom", "src/x.ts:1");
    expect(log).not.toBeNull();
    expect(log).not.toContain("\x1b[2J");
    expect(log).not.toContain("\x1b[H");
    expect(log).toContain("FAKE [browser error]");
  });

  it("strips carriage returns so a message cannot forge a second log line", () => {
    const log = formatBrowserLog("info", "legit message\r[browser error] fabricated");
    expect(log).not.toContain("\r");
    expect(log).not.toContain("\n");
  });

  it("strips escapes from the caller annotation", () => {
    const log = formatBrowserLog("info", "hello", "src/\x1b[31mred\x1b[0m.ts:1");
    expect(log).not.toContain("\x1b[31m");
    expect(log).toContain("src/");
  });

  it("strips escapes from an untrusted route id posted by a page", () => {
    const log = formatRouteLog("\x1b[31mFAKE-ROUTE\x1b[0m", "/x", null, 1.0, false);
    expect(log).not.toContain("\x1b[31m");
    expect(log).toContain("FAKE-ROUTE");
  });

  it("strips escapes from a route path and params", () => {
    // The formatter's own colors legitimately contain ESC, so assert on the
    // untrusted payloads specifically rather than on ESC in general.
    const log = formatRouteLog("/id", "/x\x1b[2J", "\x1b[31mred\x1b[0m", 1.0, false);
    expect(log).not.toContain("\x1b[2J");
    expect(log).not.toContain("\x1b[31m");
    expect(log).toContain("/x [2J");
  });

  it("preserves legitimate newlines and tabs in messages", () => {
    const log = formatBrowserLog("info", "line one\nline two\ttabbed");
    expect(log).toContain("line one\nline two\ttabbed");
  });

  it("preserves multibyte characters in messages", () => {
    const log = formatBrowserLog("info", "café 日本語");
    expect(log).toContain("café 日本語");
  });

  it("still applies its own colors after sanitizing", () => {
    const log = formatBrowserLog("error", "plain message");
    expect(log).toContain("[browser error]");
    expect(log).toContain("\x1b[31m");
  });
});

describe("matchesExclusion segment boundaries", () => {
  it("matches a path pattern on a segment boundary", () => {
    expect(matchesExclusion("/api/v1/users", "/api")).toBe(true);
    expect(matchesExclusion("/api", "/api")).toBe(true);
  });

  it("does not match a path pattern that is only a prefix of a segment", () => {
    // These were all silently dropped by the old substring match.
    expect(matchesExclusion("/api-key", "/api")).toBe(false);
    expect(matchesExclusion("/dashboard/apiSettings", "/api")).toBe(false);
    expect(matchesExclusion("/apiary", "/api")).toBe(false);
    expect(matchesExclusion("/settings/node_modules-check", "/node_modules/")).toBe(false);
  });

  it("still excludes real dependency paths", () => {
    expect(matchesExclusion("/node_modules/.vite/deps/react.js", "/node_modules/")).toBe(true);
    expect(matchesExclusion("/@id/virtual:browser-logger", "/@id/")).toBe(true);
    expect(matchesExclusion("/@vite/client", "/@vite")).toBe(true);
  });

  it("keeps substring matching for query-shaped and bare patterns", () => {
    expect(matchesExclusion("/src/App.tsx?import", "?import")).toBe(true);
    expect(matchesExclusion("/src/main.tsx?t=123", "?import")).toBe(false);
    expect(matchesExclusion("/some/vite_ping", "vite_ping")).toBe(true);
  });

  it("ignores the query string when matching a path pattern", () => {
    expect(matchesExclusion("/api?page=2", "/api")).toBe(true);
    expect(matchesExclusion("/apiary?page=2", "/api")).toBe(false);
  });
});

describe("isModuleRequest", () => {
  it("classifies app source modules as module noise", () => {
    expect(isModuleRequest("/src/main.tsx")).toBe(true);
    expect(isModuleRequest("/src/App.tsx")).toBe(true);
    expect(isModuleRequest("/src/globals.css")).toBe(true);
    expect(isModuleRequest("/src/components/ui/button.tsx")).toBe(true);
  });

  it("classifies dependency and vite-internal modules as module noise", () => {
    expect(isModuleRequest("/node_modules/.vite/deps/react.js")).toBe(true);
    expect(isModuleRequest("/@react-refresh")).toBe(true);
    expect(isModuleRequest("/@fs/Users/x/src/y.ts")).toBe(true);
  });

  it("does not classify app routes or apis as modules", () => {
    expect(isModuleRequest("/")).toBe(false);
    expect(isModuleRequest("/dashboard")).toBe(false);
    expect(isModuleRequest("/login")).toBe(false);
    expect(isModuleRequest("/api/v1/users")).toBe(false);
    expect(isModuleRequest("/_serverFn/abc")).toBe(false);
  });

  it("does not treat an api path that ends in a script extension as a module", () => {
    expect(isModuleRequest("/api/config.js")).toBe(false);
  });
});

describe("GraphReevaluationDetector", () => {
  // Ten modules, so a single re-walk clears the eight-repeat threshold.
  const modules = [
    "/src/main.tsx",
    "/src/App.tsx",
    "/src/index.css",
    "/src/App.css",
    "/src/lib/utils.ts",
    "/src/lib/api.ts",
    "/src/lib/hooks/use-auth.ts",
    "/src/components/button.tsx",
    "/src/components/nav.tsx",
    "/src/components/layout.tsx",
  ];

  function feed(urls: string[], detector: GraphReevaluationDetector) {
    let report = null;
    for (const url of urls) {
      report = detector.observe(isModuleRequest(url), url) ?? report;
    }
    return report;
  }

  it("does not report a re-walk when one module is fetched many times", () => {
    // Regression: this shape previously reported "1 modules requested again",
    // which is repeat polling, not a graph re-evaluation.
    const detector = new GraphReevaluationDetector(() => 0);
    const report = feed(
      Array.from({ length: 20 }, () => "/src/main.tsx"),
      detector,
    );
    expect(report).toBeNull();
  });

  it("does not report a re-walk when only a few distinct modules repeat", () => {
    const detector = new GraphReevaluationDetector(() => 0);
    const report = feed(
      ["/src/main.tsx", "/src/App.tsx", "/src/index.css"].flatMap((u) => Array.from({ length: 5 }, () => u)),
      detector,
    );
    expect(report).toBeNull();
  });

  it("reports a re-walk when many distinct modules are requested twice", () => {
    const detector = new GraphReevaluationDetector(() => 0);
    const report = feed([...modules, ...modules], detector);
    expect(report).not.toBeNull();
    expect(report?.distinctModules).toBe(modules.length);
    // Reports the moment the threshold is crossed, not after the full sweep.
    expect(report?.repeatedRequests).toBe(8);
  });

  it("reports at most once per page load", () => {
    const detector = new GraphReevaluationDetector(() => 0);
    const first = feed([...modules, ...modules], detector);
    expect(first).not.toBeNull();

    let second = null;
    for (const url of [...modules, ...modules, ...modules]) {
      second = detector.observe(isModuleRequest(url), url) ?? second;
    }
    expect(second).toBeNull();
  });

  it("resets on a document request so a later page load is judged on its own", () => {
    const detector = new GraphReevaluationDetector(() => 0);
    feed([...modules, ...modules], detector);

    // New page load: repeat the same modules and it should report again.
    detector.observe(isModuleRequest("/"), "/");
    let report = null;
    for (const url of [...modules, ...modules]) {
      report = detector.observe(isModuleRequest(url), url) ?? report;
    }
    expect(report).not.toBeNull();
  });

  it("reports the elapsed window since the page load began", () => {
    let clock = 1000;
    const detector = new GraphReevaluationDetector(() => clock);
    detector.observe(false, "/");
    clock = 2500;
    const report = feed([...modules, ...modules], detector);
    expect(report?.windowMs).toBe(1500);
  });

  it("stays quiet during an ordinary single module graph walk", () => {
    const detector = new GraphReevaluationDetector(() => 0);
    const report = feed(modules, detector);
    expect(report).toBeNull();
  });
});

describe("browserLoggerScriptSrc", () => {
  it("serves from the root by default", () => {
    expect(browserLoggerScriptSrc("/")).toBe("/@id/__x00__virtual:browser-logger");
  });

  it("honours a sub-path base", () => {
    expect(browserLoggerScriptSrc("/app/")).toBe("/app/@id/__x00__virtual:browser-logger");
    expect(browserLoggerScriptSrc("/deep/nested/")).toBe("/deep/nested/@id/__x00__virtual:browser-logger");
  });

  it("tolerates a base without a trailing slash", () => {
    expect(browserLoggerScriptSrc("/app")).toBe("/app/@id/__x00__virtual:browser-logger");
  });
});

describe("terminal escape sanitization on the request log path", () => {
  it("strips escapes from a URL supplied by the request line", () => {
    // Any served page can reach this with fetch("/\x1b[2J").
    const log = formatLogEntry("/\x1b[2J\x1b[HFAKE", "GET", 200, 1.0, null, null, null, null);
    expect(log).not.toBeNull();
    expect(log).not.toContain("\x1b[2J");
    expect(log).not.toContain("\x1b[H");
    expect(log).toContain("FAKE");
  });

  it("strips escapes from a route name supplied by resolveRoute", () => {
    const log = formatLogEntry("/dash", "GET", 200, 1.0, null, null, "\x1b[31mFAKE\x1b[0m", null);
    expect(log).not.toContain("\x1b[31m");
  });

  it("strips escapes from a redirect Location header", () => {
    const log = formatLogEntry("/old", "GET", 302, 1.0, null, "/\x1b[2Jnew", null, null);
    expect(log).not.toContain("\x1b[2J");
  });

  it("strips carriage returns so a URL cannot forge a log line", () => {
    const log = formatLogEntry("/legit\r[browser error] forged", "GET", 200, 1.0, null, null, null, null);
    expect(log).not.toContain("\r");
  });

  it("still logs ordinary URLs, query strings and route names intact", () => {
    const log = formatLogEntry(
      "/dashboard/settings?tab=general",
      "GET",
      200,
      1.0,
      null,
      null,
      "/dashboard/settings",
      null,
    );
    expect(log).toContain("/dashboard/settings");
    expect(log).toContain("tab=general");
  });
});
