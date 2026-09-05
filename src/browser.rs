use crate::ansi;

fn colorize_json_value(val: &serde_json::Value, indent: usize) -> String {
  let indent_str = "  ".repeat(indent);
  match val {
    serde_json::Value::Null => format!("{}null{}", ansi::DIM, ansi::RESET),
    serde_json::Value::Bool(b) => format!("{}{}{}", ansi::MAGENTA, b, ansi::RESET),
    serde_json::Value::Number(n) => format!("{}{}{}", ansi::YELLOW, n, ansi::RESET),
    serde_json::Value::String(s) => format!("{}\"{}\"{}", ansi::GREEN, s, ansi::RESET),
    serde_json::Value::Array(arr) => {
      if arr.is_empty() {
        return "[]".to_string();
      }
      if arr.len() <= 3 && arr.iter().all(|v| !v.is_object() && !v.is_array()) {
        let items: Vec<String> = arr.iter().map(|v| colorize_json_value(v, 0)).collect();
        return format!("[ {} ]", items.join(", "));
      }
      let mut out = String::from("[\n");
      for (i, item) in arr.iter().enumerate() {
        out.push_str(&format!(
          "  {}{}{}",
          indent_str,
          colorize_json_value(item, indent + 1),
          if i + 1 < arr.len() { "," } else { "" }
        ));
        out.push('\n');
      }
      out.push_str(&format!("{}]", indent_str));
      out
    }
    serde_json::Value::Object(obj) => {
      if obj.is_empty() {
        return "{}".to_string();
      }
      let mut out = String::from("{\n");
      let entries: Vec<_> = obj.iter().collect();
      for (i, (key, value)) in entries.iter().enumerate() {
        out.push_str(&format!(
          "  {}{}\"{}\"{}: {}{}",
          indent_str,
          ansi::CYAN,
          key,
          ansi::RESET,
          colorize_json_value(value, indent + 1),
          if i + 1 < entries.len() { "," } else { "" }
        ));
        out.push('\n');
      }
      out.push_str(&format!("{}}}", indent_str));
      out
    }
  }
}

pub fn colorize_json(message: &str) -> String {
  if let Ok(val) = serde_json::from_str::<serde_json::Value>(message) {
    colorize_json_value(&val, 0)
  } else {
    message.to_string()
  }
}

pub fn clean_error_stack(message: &str) -> String {
  let lines: Vec<&str> = message.split('\n').collect();
  if lines.len() <= 1 {
    return format!("{}{}{}", ansi::RED, message, ansi::RESET);
  }

  let mut result = Vec::with_capacity(lines.len());
  // First line is the error message header
  result.push(format!("{}{}{}", ansi::RED, lines[0], ansi::RESET));

  for line in &lines[1..] {
    let trimmed = line.trim_start();
    if !trimmed.starts_with("at ") {
      result.push(format!("{}{}{}", ansi::DIM, line, ansi::RESET));
      continue;
    }

    let is_user_code = (trimmed.contains("/src/")
      || trimmed.contains("src/")
      || trimmed.contains("routes/")
      || trimmed.contains("components/"))
      && !trimmed.contains("node_modules");

    if is_user_code {
      // Highlight user application frame
      result.push(format!(
        "  {}➜{} {}{}{}",
        ansi::RED,
        ansi::RESET,
        ansi::WHITE_BOLD,
        trimmed,
        ansi::RESET
      ));
    } else {
      // Dim dependency and framework noise
      result.push(format!("  {}{}{}", ansi::DIM, trimmed, ansi::RESET));
    }
  }

  result.join("\n")
}

pub fn format_browser_log(
  log_type: String,
  message: String,
  caller: Option<String>,
  repeat_count: Option<u32>,
) -> Option<String> {
  // Skip Hot Reloading framework noise
  if message.contains("[HMR]") || message.contains("[vite]") {
    return None;
  }

  let time = ansi::now_time_string();

  let (prefix, default_color) = match log_type.as_str() {
    "error" => (
      format!("{}[browser error]{}", ansi::RED, ansi::RESET),
      ansi::RED,
    ),
    "warn" => (
      format!("{}[browser warn]{} ", ansi::YELLOW, ansi::RESET),
      ansi::YELLOW,
    ),
    "info" => (
      format!("{}[browser info]{} ", ansi::CYAN, ansi::RESET),
      ansi::CYAN,
    ),
    "debug" => (
      format!("{}[browser debug]{}", ansi::DIM, ansi::RESET),
      ansi::DIM,
    ),
    "time" => (
      format!("{}[browser timer]{}", ansi::MAGENTA, ansi::RESET),
      ansi::MAGENTA,
    ),
    "table" => (
      format!("{}[browser table]{}", ansi::CYAN, ansi::RESET),
      ansi::CYAN,
    ),
    _ => (
      format!("{}[browser]{}      ", ansi::BLUE, ansi::RESET),
      ansi::RESET,
    ),
  };

  let formatted_message = if log_type == "error" && message.contains("\n    at ") {
    clean_error_stack(&message)
  } else if message.starts_with('{') || message.starts_with('[') {
    colorize_json(&message)
  } else {
    format!("{}{}{}", default_color, message, ansi::RESET)
  };

  let caller_str = match caller {
    Some(c) if !c.is_empty() => format!(" {}({}){}", ansi::DIM, c, ansi::RESET),
    _ => String::new(),
  };

  let repeat_str = match repeat_count {
    Some(count) if count > 1 => format!(" {}(x{}){}", ansi::YELLOW, count, ansi::RESET),
    _ => String::new(),
  };

  Some(format!(
    "{}{}{} {} {}{}{}",
    ansi::DIM,
    time,
    ansi::RESET,
    prefix,
    formatted_message,
    caller_str,
    repeat_str
  ))
}

pub fn get_browser_logger_script() -> String {
  r#"
if (typeof window !== 'undefined' && import.meta.hot) {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;
  const originalDebug = console.debug;
  const originalTime = console.time;
  const originalTimeEnd = console.timeEnd;
  const originalTable = console.table;

  const timers = new Map();

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

  function extractCaller() {
    try {
      const err = new Error();
      const lines = err.stack ? err.stack.split("\n") : [];
      for (let i = 2; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        if (
          line.includes("virtual:browser-logger") ||
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

      import.meta.hot.send('vite-plugin-logger:browser-log', {
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

    console.timeEnd = function(label = 'default') {
      if (originalTimeEnd) originalTimeEnd.call(console, label);
      const start = timers.get(label);
      if (start != null) {
        timers.delete(label);
        const durationMs = (performance.now() - start).toFixed(2);
        sendLog('time', [`${label}: ${durationMs}ms`]);
      }
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

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_format_browser_log_with_caller() {
    let res = format_browser_log(
      "log".into(),
      "User logged in".into(),
      Some("src/components/Login.tsx:42".into()),
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
    let res = format_browser_log(
      "time".into(),
      "fetchData: 142.50ms".into(),
      Some("src/api.ts:18".into()),
      None,
    );
    assert!(res.is_some());
    let log = res.unwrap();
    assert!(log.contains("[browser timer]"));
    assert!(log.contains("fetchData: 142.50ms"));
    assert!(log.contains("(src/api.ts:18)"));
  }

  #[test]
  fn test_format_browser_log_repeat_count() {
    let res = format_browser_log(
      "warn".into(),
      "Deprecation warning".into(),
      Some("src/legacy.ts:10".into()),
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
    assert!(colored.contains("\"name\""));
    assert!(colored.contains("\"test\""));
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
