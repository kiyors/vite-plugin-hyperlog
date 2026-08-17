#![deny(clippy::all)]
use napi_derive::napi;

#[napi]
pub fn format_log_entry(
  original_url: String,
  method: String,
  status: u32,
  duration_ms: f64,
  content_length: Option<f64>,
) -> Option<String> {
  // URL exclusions are now handled on the JS side for better performance (avoids attaching event listeners entirely)

  // Avoid Vec allocation by using split_once instead of .split().collect()
  let (path, query) = match original_url.split_once('?') {
    Some((p, q)) => (p, Some(q)),
    None => (original_url.as_str(), None),
  };

  let is_api = path.starts_with("/api");

  // Use ends_with on the path instead of contains on the whole URL.
  // This is both faster O(1) and fixes a bug where /api?file=x.js was treated as an asset.
  let is_asset = path.ends_with(".js")
    || path.ends_with(".css")
    || path.ends_with(".svg")
    || path.ends_with(".png")
    || path.ends_with(".ico")
    || path.ends_with(".map")
    || path.ends_with(".json");

  let label = if is_api {
    "\x1b[35m[api]\x1b[0m"
  } else if is_asset {
    "\x1b[90m[asset]\x1b[0m"
  } else {
    "\x1b[36m[router]\x1b[0m"
  };

  let status_color = match status {
    500..=599 => "\x1b[31m",
    400..=499 => "\x1b[33m",
    300..=399 => "\x1b[36m",
    200..=299 => "\x1b[32m",
    _ => "\x1b[0m",
  };

  let method_color = match method.as_str() {
    "GET" => "\x1b[32m",
    "POST" => "\x1b[33m",
    "PUT" => "\x1b[34m",
    "DELETE" => "\x1b[31m",
    "PATCH" => "\x1b[35m",
    _ => "\x1b[36m",
  };

  let query_string = match query {
    Some(q) => format!("?\x1b[90m{}\x1b[0m", q),
    None => String::new(),
  };

  let url_string = if is_asset {
    format!("\x1b[90m{}\x1b[0m{}", path, query_string)
  } else {
    format!("{}{}", path, query_string)
  };

  let duration_color = if duration_ms > 500.0 {
    "\x1b[31m"
  } else if duration_ms > 200.0 {
    "\x1b[33m"
  } else {
    "\x1b[90m"
  };

  let size_string = match content_length {
    Some(bytes) if bytes > 0.0 => format!(" \x1b[90m{:.1}kB\x1b[0m", bytes / 1024.0),
    _ => String::new(),
  };

  let time = chrono::Local::now().format("%H:%M:%S").to_string();

  // Construct final string in a single allocation format! macro
  Some(format!(
    "\x1b[90m{}\x1b[0m {} {}{}\x1b[0m {}{:<6}\x1b[0m {} {}{:.2}ms\x1b[0m{}",
    time,
    label,
    status_color,
    status,
    method_color,
    method,
    url_string,
    duration_color,
    duration_ms,
    size_string
  ))
}

#[napi]
pub fn format_browser_log(log_type: String, message: String) -> Option<String> {
  // Skip React Hot Reloading logs
  if message.contains("[HMR]") || message.contains("[vite]") {
    return None;
  }

  let time = chrono::Local::now().format("%H:%M:%S").to_string();

  let (color, prefix) = match log_type.as_str() {
    "error" => ("\x1b[31m", "\x1b[31m[browser error]\x1b[0m"),
    "warn" => ("\x1b[33m", "\x1b[33m[browser warn]\x1b[0m"),
    _ => ("\x1b[90m", "\x1b[34m[browser]\x1b[0m"),
  };

  Some(format!(
    "\x1b[90m{}\x1b[0m {} {}{}\x1b[0m",
    time, prefix, color, message
  ))
}

#[napi]
pub fn get_browser_logger_script() -> String {
  r#"
if (typeof window !== 'undefined' && import.meta.hot) {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;

  function safeStringify(obj) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return "[Circular]";
        seen.add(value);
      }
      return value;
    }, 2);
  }

  function sendLog(type, args) {
    try {
      const message = Array.from(args).map(arg => {
        if (arg instanceof Error) {
          return arg.stack || arg.message;
        }
        if (typeof arg === 'object') {
          try { return safeStringify(arg); } catch(e) { return '[Object]'; }
        }
        return String(arg);
      }).join(' ');

      import.meta.hot.send('tameio:browser-log', { type, message });
    } catch(e) {}
  }

  // Only patch once
  if (!window.__BROWSER_LOGGER_PATCHED__) {
    window.__BROWSER_LOGGER_PATCHED__ = true;

    console.log = function(...args) {
      originalLog.apply(console, args);
      sendLog('log', args);
    };
    console.error = function(...args) {
      originalError.apply(console, args);
      sendLog('error', args);
    };
    console.warn = function(...args) {
      originalWarn.apply(console, args);
      sendLog('warn', args);
    };
    console.info = function(...args) {
      if (originalInfo) originalInfo.apply(console, args);
      sendLog('info', args);
    };

    window.addEventListener("error", (event) => {
      sendLog('error', ['[Uncaught Error]', event.error || event.message]);
    });

    window.addEventListener("unhandledrejection", (event) => {
      sendLog('error', ['[Unhandled Promise]', event.reason]);
    });
  }
}
"#
  .to_string()
}
