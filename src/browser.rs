use std::fmt::Write;

use crate::ansi;

use crate::stack_trace::parse_stack_frame;

#[must_use]
pub fn colorize_json(message: &str) -> String {
  let trimmed = message.trim();
  if message.len() > 262_144
    || (!((trimmed.starts_with('{') && trimmed.ends_with('}'))
      || (trimmed.starts_with('[') && trimmed.ends_with(']'))))
  {
    return message.to_string();
  }

  let bytes = trimmed.as_bytes();
  let len = bytes.len();
  let mut out = String::with_capacity(len + 128);
  let mut i = 0;

  while i < len {
    if let Some(&b) = bytes.get(i) {
      match b {
        b'"' => {
          let start = i;
          i += 1;
          while i < len {
            if bytes.get(i) == Some(&b'\\') {
              i += 2;
              continue;
            }
            if bytes.get(i) == Some(&b'"') {
              i += 1;
              break;
            }
            i += 1;
          }
          if let Some(str_token) = trimmed.get(start..i) {
            let mut k = i;
            while bytes.get(k).is_some_and(u8::is_ascii_whitespace) {
              k += 1;
            }
            let is_key = bytes.get(k) == Some(&b':');

            if is_key {
              let _ = write!(out, "\x1b[36m{str_token}\x1b[0m");
            } else {
              let _ = write!(out, "\x1b[32m{str_token}\x1b[0m");
            }
          }
        }
        b'0'..=b'9' | b'-' => {
          let start = i;
          i += 1;
          while i < len {
            if let Some(&c) = bytes.get(i) {
              if c.is_ascii_digit() || c == b'.' || c == b'e' || c == b'E' || c == b'+' || c == b'-'
              {
                i += 1;
              } else {
                break;
              }
            } else {
              break;
            }
          }
          if let Some(num_token) = trimmed.get(start..i) {
            let _ = write!(out, "\x1b[33m{num_token}\x1b[0m");
          }
        }
        b't' if trimmed.get(i..).is_some_and(|s| s.starts_with("true")) => {
          out.push_str("\x1b[35mtrue\x1b[0m");
          i += 4;
        }
        b'f' if trimmed.get(i..).is_some_and(|s| s.starts_with("false")) => {
          out.push_str("\x1b[35mfalse\x1b[0m");
          i += 5;
        }
        b'n' if trimmed.get(i..).is_some_and(|s| s.starts_with("null")) => {
          out.push_str("\x1b[90mnull\x1b[0m");
          i += 4;
        }
        _ => {
          out.push(char::from(b));
          i += 1;
        }
      }
    } else {
      break;
    }
  }

  out
}

#[must_use]
pub fn clean_error_stack(message: &str) -> String {
  let mut lines = message.lines();
  let Some(first_line) = lines.next() else {
    return String::new();
  };

  let mut result = String::with_capacity(message.len() + 64);
  let _ = write!(result, "{}{first_line}{}", ansi::RED, ansi::RESET);

  for line in lines {
    result.push('\n');
    let trimmed = line.trim();
    if let Some(frame) = parse_stack_frame(trimmed) {
      let mut path = frame.path;
      if let Some(stripped) = path.strip_prefix('/') {
        path = stripped;
      }

      let is_user_code = (path.starts_with("src/")
        || path.contains("/src/")
        || path.contains("routes/")
        || path.contains("components/"))
        && !path.contains("node_modules");

      if is_user_code {
        let _ = write!(
          result,
          "  {}➜{} {}{}:{}:{}{}",
          ansi::RED,
          ansi::RESET,
          ansi::WHITE_BOLD,
          path,
          frame.line,
          frame.col,
          ansi::RESET,
        );
        if let Some(f) = frame.fn_name {
          let _ = write!(
            result,
            " {}in{} {}{f}{}",
            ansi::DIM,
            ansi::RESET,
            ansi::CYAN,
            ansi::RESET
          );
        }
      } else {
        let _ = write!(
          result,
          "    {}{}:{}:{}",
          ansi::DIM,
          path,
          frame.line,
          frame.col
        );
        if let Some(f) = frame.fn_name {
          let _ = write!(result, " in {f}");
        }
        result.push_str(ansi::RESET);
      }
    } else {
      let _ = write!(result, "  {}{trimmed}{}", ansi::DIM, ansi::RESET);
    }
  }

  result
}

#[must_use]
pub fn format_browser_log(
  log_type: &str,
  message: &str,
  caller: Option<&str>,
  repeat_count: Option<u32>,
) -> Option<String> {
  // Skip Hot Reloading framework noise
  if message.contains("[HMR]") || message.contains("[vite]") {
    return None;
  }

  let (prefix, default_color) = match log_type {
    "error" => (ansi::PREFIX_BROWSER_ERROR, ansi::RED),
    "warn" => (ansi::PREFIX_BROWSER_WARN, ansi::YELLOW),
    "info" => (ansi::PREFIX_BROWSER_INFO, ansi::CYAN),
    "debug" => (ansi::PREFIX_BROWSER_DEBUG, ansi::DIM),
    "time" => (ansi::PREFIX_BROWSER_TIMER, ansi::MAGENTA),
    "table" => (ansi::PREFIX_BROWSER_TABLE, ansi::CYAN),
    _ => (ansi::PREFIX_BROWSER_DEFAULT, ansi::RESET),
  };

  let formatted_message =
    if log_type == "error" && (message.contains("\n    at ") || message.contains('@')) {
      clean_error_stack(message)
    } else if message.starts_with('{') || message.starts_with('[') {
      colorize_json(message)
    } else {
      format!("{default_color}{message}{}", ansi::RESET)
    };

  let mut buf = String::with_capacity(message.len() + 64);
  ansi::write_now_time(&mut buf);

  write!(buf, " {prefix} {formatted_message}").ok()?;

  if let Some(c) = caller {
    if !c.is_empty() {
      write!(buf, " {}({c}){}", ansi::DIM, ansi::RESET).ok()?;
    }
  }

  if let Some(count) = repeat_count {
    if count > 1 {
      write!(buf, " {}(x{count}){}", ansi::YELLOW, ansi::RESET).ok()?;
    }
  }

  Some(buf)
}

#[must_use]
#[expect(
  clippy::too_many_lines,
  reason = "Self-contained injected client-side JavaScript bundle"
)]
pub fn get_browser_logger_script() -> String {
  r#"
if (typeof window !== 'undefined' && import.meta.hot) {
  window.__HYPERLOG_HOT__ = import.meta.hot;
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;
  const originalDebug = console.debug;
  const originalTime = console.time;
  const originalTimeLog = console.timeLog;
  const originalTimeEnd = console.timeEnd;
  const originalCount = console.count;
  const originalCountReset = console.countReset;
  const originalTable = console.table;

  const timers = new Map();
  const counts = new Map();

  function safeStringify(obj) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === "bigint") {
        return value.toString() + "n";
      }
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return "[Circular]";
        seen.add(value);
      }
      return value;
    }, 2);
  }

  function extractCaller() {
    try {
      const err = new Error();
      const lines = err.stack ? err.stack.split("\n") : [];
      for (let i = 2; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        if (
          line.includes("virtual:browser-logger") ||
          line.includes("extractCaller") ||
          line.includes("sendLog") ||
          line.includes("node_modules/.vite") ||
          line.includes("@vite/client")
        ) {
          continue;
        }
        const match = line.match(/(?:https?:\/\/[^/]+)?\/([^?:\s)]+)(?:\?[^:]*)?:(\d+)(?::(\d+))?/);
        if (match) {
          return match[1] + ":" + match[2];
        }
      }
    } catch {}
    return null;
  }

  function sendLog(type, args, customCaller) {
    try {
      const message = Array.from(args).map(arg => {
        if (arg instanceof Error) {
          return arg.stack || arg.message;
        }
        if (typeof arg === 'object' && arg !== null) {
          try { return safeStringify(arg); } catch(e) { return '[Object]'; }
        }
        return String(arg);
      }).join(' ');

      const caller = customCaller !== undefined ? customCaller : extractCaller();

      import.meta.hot.send('vite-plugin-hyperlog:browser-log', {
        type,
        message,
        caller,
      });
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
    console.debug = function(...args) {
      if (originalDebug) originalDebug.apply(console, args);
      sendLog('debug', args);
    };
    console.table = function(...args) {
      if (originalTable) originalTable.apply(console, args);
      sendLog('table', args);
    };

    console.time = function(label = 'default') {
      if (originalTime) originalTime.call(console, label);
      timers.set(label, performance.now());
    };

    console.timeLog = function(label = 'default', ...args) {
      if (originalTimeLog) originalTimeLog.apply(console, [label, ...args]);
      const start = timers.get(label);
      if (start != null) {
        const durationMs = (performance.now() - start).toFixed(2);
        sendLog('time', [`${label}: ${durationMs}ms`, ...args]);
      }
    };

    console.timeEnd = function(label = 'default') {
      if (originalTimeEnd) originalTimeEnd.call(console, label);
      const start = timers.get(label);
      if (start != null) {
        timers.delete(label);
        const durationMs = (performance.now() - start).toFixed(2);
        sendLog('time', [`${label}: ${durationMs}ms`]);
      }
    };

    console.count = function(label = 'default') {
      if (originalCount) originalCount.call(console, label);
      const current = (counts.get(label) || 0) + 1;
      counts.set(label, current);
      sendLog('debug', [`${label}: ${current}`]);
    };

    console.countReset = function(label = 'default') {
      if (originalCountReset) originalCountReset.call(console, label);
      counts.delete(label);
    };

    window.addEventListener("error", (event) => {
      sendLog('error', ['[Uncaught Error]', event.error || event.message]);
    });

    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason !== undefined && event.reason !== null ? event.reason : 'Unspecified rejection';
      sendLog('error', ['[Unhandled Promise]', reason]);
    });
  }
}
"#
  .to_string()
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_format_browser_log_with_caller() {
    let res = format_browser_log(
      "log",
      "User logged in",
      Some("src/components/Login.tsx:42"),
      None,
    );
    assert!(res.is_some());
    let log = res.unwrap();
    assert!(log.contains("[browser]"));
    assert!(log.contains("User logged in"));
    assert!(log.contains("(src/components/Login.tsx:42)"));
  }

  #[test]
  fn test_format_browser_log_timer() {
    let res = format_browser_log("time", "fetchData: 142.50ms", Some("src/api.ts:18"), None);
    assert!(res.is_some());
    let log = res.unwrap();
    assert!(log.contains("[browser timer]"));
    assert!(log.contains("fetchData: 142.50ms"));
    assert!(log.contains("(src/api.ts:18)"));
  }

  #[test]
  fn test_format_browser_log_repeat_count() {
    let res = format_browser_log(
      "warn",
      "Deprecation warning",
      Some("src/legacy.ts:10"),
      Some(4),
    );
    assert!(res.is_some());
    let log = res.unwrap();
    assert!(log.contains("[browser warn]"));
    assert!(log.contains("(x4)"));
  }

  #[test]
  fn test_colorize_json() {
    let json = r#"{"name":"test","count":42,"active":true}"#;
    let colored = colorize_json(json);
    assert!(colored.contains("name"));
    assert!(colored.contains("test"));
    assert!(colored.contains("42"));
    assert!(colored.contains("true"));
  }

  #[test]
  fn test_clean_error_stack() {
    let stack = "Error: Boom\n    at doSomething (http://localhost:3000/src/app.tsx:20:5)\n    at dispatch (http://localhost:3000/node_modules/react-dom.js:10:2)";
    let cleaned = clean_error_stack(stack);
    assert!(cleaned.contains("Error: Boom"));
    assert!(cleaned.contains("➜"));
    assert!(cleaned.contains("src/app.tsx:20:5"));
  }
}
