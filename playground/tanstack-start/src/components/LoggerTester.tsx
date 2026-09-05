import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export default function LoggerTester() {
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState("Ready");

  useEffect(() => {
    setHydrated(true);
  }, []);

  const callServerFn = async () => {
    setStatus("Calling server function...");
    const b64 =
      "eyJmaWxlIjoiL3NyYy9yb3V0ZXMvX19yb290LnRzeD90c3Mtc2VydmVyZm4tc3BsaXQiLCJleHBvcnQiOiJnZXRBdXRoU2Vzc2lvbl9jcmVhdGVTZXJ2ZXJGbl9oYW5kbGVyIn0";
    try {
      await fetch(`/_serverFn/${b64}`);
    } catch {}
    setStatus("Server function called");
  };

  const callBatchedServerFn = async () => {
    setStatus("Calling batched server functions...");
    const b64 =
      "eyJmaWxlIjoiL3NyYy9yb3V0ZXMvX19yb290LnRzeD90c3Mtc2VydmVyZm4tc3BsaXQiLCJleHBvcnQiOiJnZXRBdXRoU2Vzc2lvbl9jcmVhdGVTZXJ2ZXJGbl9oYW5kbGVyIn0";
    await Promise.all([
      fetch(`/_serverFn/${b64}`).catch(() => {}),
      fetch(`/_serverFn/${b64}`).catch(() => {}),
      fetch(`/_serverFn/${b64}`).catch(() => {}),
    ]);
    setStatus("Batched server functions dispatched");
  };

  const callMatchedRoute = async () => {
    setStatus("Requesting matched route...");
    try {
      await fetch("/speakers/cedric-grolet");
    } catch {}
    setStatus("Matched route requested");
  };

  const triggerRichLog = () => {
    console.log({
      type: "tanstack-logger-test",
      user: "alex",
      conference: "Haute Pâtisserie",
      sessions: 4,
      isLive: true,
      timestamp: Date.now(),
    });
    setStatus("Rich object logged to terminal");
  };

  const triggerTimerLog = () => {
    console.time("tanstack-operation");
    for (let i = 0; i < 1000; i++) {}
    console.timeEnd("tanstack-operation");
    setStatus("Timer logged to terminal");
  };

  const triggerErrorLog = () => {
    console.error(new Error("Database disconnected in fetchConferenceDetails"));
    setStatus("Error stack logged to terminal");
  };

  return (
    <div
      id="logger-tester"
      data-hydrated={hydrated ? "true" : "false"}
      className="bg-charcoal/80 border border-gold/30 rounded-xl p-6 my-8 max-w-4xl mx-auto shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xl text-gold font-bold">⚡ Logger Integration Verification</h3>
        <span
          id="logger-status"
          className="text-xs bg-copper/20 text-copper-light px-3 py-1 rounded-full border border-copper/30 font-mono"
        >
          {status}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <button
          id="btn-server-fn"
          onClick={callServerFn}
          className="px-3 py-2 text-sm bg-charcoal-light hover:bg-gold/20 text-cream rounded-lg border border-white/10 transition-colors"
        >
          Decode Server Fn
        </button>

        <button
          id="btn-batch-server-fn"
          onClick={callBatchedServerFn}
          className="px-3 py-2 text-sm bg-charcoal-light hover:bg-gold/20 text-cream rounded-lg border border-white/10 transition-colors"
        >
          Batch Server Fn (x3)
        </button>

        <button
          id="btn-route-request"
          onClick={callMatchedRoute}
          className="px-3 py-2 text-sm bg-charcoal-light hover:bg-gold/20 text-cream rounded-lg border border-white/10 transition-colors"
        >
          Match /speakers/$slug
        </button>

        <button
          id="btn-rich-log"
          onClick={triggerRichLog}
          className="px-3 py-2 text-sm bg-charcoal-light hover:bg-gold/20 text-cream rounded-lg border border-white/10 transition-colors"
        >
          Colorized JSON Log
        </button>

        <button
          id="btn-timer-log"
          onClick={triggerTimerLog}
          className="px-3 py-2 text-sm bg-charcoal-light hover:bg-gold/20 text-cream rounded-lg border border-white/10 transition-colors"
        >
          Browser Timer Log
        </button>

        <button
          id="btn-error-log"
          onClick={triggerErrorLog}
          className="px-3 py-2 text-sm bg-charcoal-light hover:bg-gold/20 text-cream rounded-lg border border-white/10 transition-colors"
        >
          Clean Error Stack
        </button>
      </div>

      <div className="border-t border-white/10 pt-4 flex flex-wrap gap-4 text-xs text-cream/70 items-center">
        <span className="font-semibold text-gold">SPA Navigation Links:</span>
        <Link
          id="link-spa-speaker"
          to="/speakers/$slug"
          params={{ slug: "cedric-grolet" }}
          className="hover:text-gold transition-colors underline"
        >
          /speakers/cedric-grolet
        </Link>
        <Link id="link-spa-about" to="/about" className="hover:text-gold transition-colors underline">
          /about
        </Link>
      </div>
    </div>
  );
}
