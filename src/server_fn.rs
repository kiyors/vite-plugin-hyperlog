#[must_use]
pub fn decode_base64_url(input: &str) -> Option<Vec<u8>> {
  let bytes = input.as_bytes();
  let mut buf = Vec::with_capacity(bytes.len() * 3 / 4);
  let mut accumulator: u32 = 0;
  let mut bits: u32 = 0;

  for &b in bytes {
    let val: u32 = match b {
      b'A'..=b'Z' => u32::from(b - b'A'),
      b'a'..=b'z' => u32::from(b - b'a') + 26,
      b'0'..=b'9' => u32::from(b - b'0') + 52,
      b'-' | b'+' => 62,
      b'_' | b'/' => 63,
      b'=' | b' ' | b'\r' | b'\n' => continue,
      _ => return None,
    };
    accumulator = (accumulator << 6) | val;
    bits += 6;
    if bits >= 8 {
      bits -= 8;
      if let Ok(byte) = u8::try_from((accumulator >> bits) & 0xFF) {
        buf.push(byte);
      }
    }
  }
  Some(buf)
}

use crate::json_utils::extract_json_field;

#[must_use]
pub fn decode_server_fn(path: &str) -> Option<(String, String)> {
  let b64 = path.strip_prefix("/_serverFn/")?;
  let b64_token = b64.split('/').next()?;
  // Prevent unbounded memory allocation from malicious/huge URLs
  if b64_token.is_empty() || b64_token.len() > 4096 {
    return None;
  }

  let decoded = decode_base64_url(b64_token)?;
  let decoded_str = std::str::from_utf8(&decoded).ok()?;

  let export_name = extract_json_field(decoded_str, "export")?;
  let file_path = extract_json_field(decoded_str, "file")?;

  let clean_export = export_name
    .strip_suffix("_createServerFn_handler")
    .unwrap_or(export_name)
    .to_string();

  let clean_file = match file_path.split_once('?') {
    Some((f, _)) => f,
    None => file_path,
  };
  let short_file = clean_file
    .strip_prefix("/src/")
    .unwrap_or(clean_file)
    .to_string();

  Some((clean_export, short_file))
}

use crate::ansi;
use crate::sanitize;
use std::fmt::Write;

#[must_use]
pub fn format_payload_preview(raw: &str, max_len: usize) -> String {
  let trimmed = raw.trim();
  if trimmed.is_empty() {
    return String::new();
  }

  let display_str = if let Some(inner) = extract_json_field(trimmed, "data") {
    inner
  } else if let Some(msg) = extract_json_field(trimmed, "message") {
    msg
  } else if let Some(err) = extract_json_field(trimmed, "error") {
    err
  } else {
    trimmed
  };

  if display_str.len() > max_len {
    let mut end = max_len;
    while end > 0 && !display_str.is_char_boundary(end) {
      end -= 1;
    }
    let truncated = match display_str.get(..end) {
      Some(s) => s,
      None => display_str,
    };
    format!("{truncated}…")
  } else {
    display_str.to_string()
  }
}

#[must_use]
#[expect(
  clippy::too_many_arguments,
  reason = "Comprehensive server function logging parameters"
)]
pub fn format_server_fn_log(
  function_name: &str,
  file_path: &str,
  line_number: Option<u32>,
  status: u32,
  duration_ms: f64,
  args: Option<&str>,
  result: Option<&str>,
  is_tree_child: Option<bool>,
  repeat_count: Option<u32>,
) -> Option<String> {
  let is_child = is_tree_child.unwrap_or(false);
  let function_name = sanitize::sanitize(function_name);
  let file_path = sanitize::sanitize(file_path);
  let formatted_args = args.map(|a| format_payload_preview(a, 60));
  let formatted_result = result.map(|r| format_payload_preview(r, 60));
  let args = formatted_args.as_deref().map(sanitize::sanitize);
  let result = formatted_result.as_deref().map(sanitize::sanitize);

  let mut buf = String::with_capacity(256);
  let duration_color = ansi::duration_color(duration_ms);

  if is_child {
    // Tree format: "  └─ ƒ myAction(args) ➜ result in 5.20ms (file:line)"
    write!(
      buf,
      "  {}└─{} {}ƒ {}{}",
      ansi::DIM,
      ansi::RESET,
      ansi::CYAN_BOLD,
      function_name,
      ansi::RESET,
    )
    .ok()?;

    if let Some(ref a) = args {
      if a.is_empty() {
        write!(buf, "{}(){}", ansi::DIM, ansi::RESET).ok()?;
      } else {
        write!(buf, "{}({a}){}", ansi::DIM, ansi::RESET).ok()?;
      }
    } else {
      write!(buf, "{}(){}", ansi::DIM, ansi::RESET).ok()?;
    }

    if let Some(ref r) = result {
      if !r.is_empty() {
        if status >= 400 {
          write!(buf, " {}➜ ❌ {r}{}", ansi::RED, ansi::RESET).ok()?;
        } else {
          write!(buf, " {}➜ {r}{}", ansi::GREEN, ansi::RESET).ok()?;
        }
      }
    }

    write!(
      buf,
      " {}in{} {}{duration_ms:.2}ms{}",
      ansi::DIM,
      ansi::RESET,
      duration_color,
      ansi::RESET,
    )
    .ok()?;

    if let Some(line) = line_number {
      write!(buf, " {}({file_path}:{line}){}", ansi::DIM, ansi::RESET).ok()?;
    } else if !file_path.is_empty() {
      write!(buf, " {}({file_path}){}", ansi::DIM, ansi::RESET).ok()?;
    }
  } else {
    // Standalone format: "12:34:56 [server-fn] 200 POST ƒ myAction(args) ➜ result 5.20ms (file:line)"
    ansi::write_now_time(&mut buf);

    let status_color = ansi::status_color(status);
    let method_color = ansi::method_color("POST");

    write!(
      buf,
      " {} {status_color}{status}{} {method_color}POST  {} {}ƒ {}{}",
      ansi::LABEL_SERVER_FN,
      ansi::RESET,
      ansi::RESET,
      ansi::CYAN_BOLD,
      function_name,
      ansi::RESET,
    )
    .ok()?;

    if let Some(ref a) = args {
      if a.is_empty() {
        write!(buf, "{}(){}", ansi::DIM, ansi::RESET).ok()?;
      } else {
        write!(buf, "{}({a}){}", ansi::DIM, ansi::RESET).ok()?;
      }
    } else {
      write!(buf, "{}(){}", ansi::DIM, ansi::RESET).ok()?;
    }

    if let Some(ref r) = result {
      if !r.is_empty() {
        if status >= 400 {
          write!(buf, " {}➜ ❌ {r}{}", ansi::RED, ansi::RESET).ok()?;
        } else {
          write!(buf, " {}➜ {r}{}", ansi::GREEN, ansi::RESET).ok()?;
        }
      }
    }

    write!(buf, " {duration_color}{duration_ms:.2}ms{}", ansi::RESET).ok()?;

    if let Some(line) = line_number {
      write!(buf, " {}({file_path}:{line}){}", ansi::DIM, ansi::RESET).ok()?;
    } else if !file_path.is_empty() {
      write!(buf, " {}({file_path}){}", ansi::DIM, ansi::RESET).ok()?;
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
  reason = "Self-contained injected client-side Server Function DevTools overlay bundle"
)]
pub fn get_server_fn_overlay_script() -> String {
  r##"
if (typeof window !== 'undefined' && import.meta.hot) {
  (function() {
    if (window.__HYPERLOG_SERVER_FN_UI__) return;
    window.__HYPERLOG_SERVER_FN_UI__ = true;

    const logs = [];
    const MAX_LOGS = 50;
    let isOpen = false;
    let activeFilter = "";

    const host = document.createElement("div");
    host.id = "hyperlog-server-fn-host";
    const shadow = host.attachShadow({ mode: "open" });
    document.body.appendChild(host);

    const style = document.createElement("style");
    style.textContent = `
      :host {
        all: initial;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        color: #f1f5f9;
        z-index: 999999;
        position: fixed;
        bottom: 16px;
        right: 16px;
      }
      * {
        box-sizing: border-box;
      }
      .pill {
        display: flex;
        align-items: center;
        gap: 6px;
        background: #0f172a;
        color: #e2e8f0;
        border: 1px solid #334155;
        border-radius: 9999px;
        padding: 6px 12px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
        transition: all 0.15s ease;
        user-select: none;
      }
      .pill:hover {
        background: #1e293b;
        border-color: #475569;
        transform: translateY(-1px);
      }
      .pill-badge {
        background: #7c3aed;
        color: #fff;
        font-size: 11px;
        font-weight: 600;
        padding: 1px 6px;
        border-radius: 9999px;
      }
      .panel {
        display: flex;
        flex-direction: column;
        width: 480px;
        max-width: calc(100vw - 32px);
        height: 520px;
        max-height: calc(100vh - 80px);
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        overflow: hidden;
      }
      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: #1e293b;
        border-bottom: 1px solid #334155;
      }
      .header-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
        color: #f8fafc;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .btn {
        background: #334155;
        border: none;
        color: #cbd5e1;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .btn:hover {
        background: #475569;
        color: #fff;
      }
      .btn-icon {
        padding: 2px 6px;
        font-size: 14px;
      }
      .search-bar {
        padding: 8px 12px;
        background: #090d16;
        border-bottom: 1px solid #1e293b;
      }
      .search-input {
        width: 100%;
        background: #1e293b;
        border: 1px solid #334155;
        color: #f1f5f9;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        outline: none;
      }
      .search-input:focus {
        border-color: #38bdf8;
      }
      .log-list {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .empty-state {
        text-align: center;
        color: #64748b;
        padding: 40px 16px;
      }
      .log-item {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 8px 10px;
        cursor: pointer;
        transition: border-color 0.15s;
      }
      .log-item:hover {
        border-color: #475569;
      }
      .log-item.open {
        border-color: #38bdf8;
      }
      .log-summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .log-left {
        display: flex;
        align-items: center;
        gap: 8px;
        overflow: hidden;
      }
      .badge-status {
        font-size: 11px;
        font-weight: 700;
        padding: 1px 5px;
        border-radius: 4px;
      }
      .status-200 { background: #065f46; color: #34d399; }
      .status-400 { background: #78350f; color: #fbbf24; }
      .status-500 { background: #7f1d1d; color: #f87171; }
      .fn-name {
        font-weight: 600;
        color: #38bdf8;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
      }
      .duration {
        font-size: 11px;
        color: #94a3b8;
        white-space: nowrap;
      }
      .duration.fast { color: #34d399; }
      .duration.medium { color: #fbbf24; }
      .duration.slow { color: #f87171; }
      .log-details {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #334155;
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 12px;
      }
      .detail-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .detail-label {
        font-size: 11px;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
      }
      .code-block {
        background: #0f172a;
        border: 1px solid #334155;
        padding: 6px 8px;
        border-radius: 6px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 11px;
        white-space: pre-wrap;
        word-break: break-all;
        color: #e2e8f0;
        max-height: 120px;
        overflow-y: auto;
      }
      .file-link {
        color: #38bdf8;
        text-decoration: underline;
        cursor: pointer;
      }
      .btn-toolbar {
        display: flex;
        gap: 6px;
        margin-top: 4px;
      }
    `;
    shadow.appendChild(style);

    const root = document.createElement("div");
    shadow.appendChild(root);

    function render() {
      if (!isOpen) {
        root.innerHTML = `
          <div class="pill" id="open-pill">
            <span>⚡ Server Fns</span>
            <span class="pill-badge">${logs.length}</span>
          </div>
        `;
        root.querySelector("#open-pill")?.addEventListener("click", () => {
          isOpen = true;
          render();
        });
        return;
      }

      const filteredLogs = logs.filter(l => {
        if (!activeFilter) return true;
        const q = activeFilter.toLowerCase();
        return l.name.toLowerCase().includes(q) || (l.file && l.file.toLowerCase().includes(q));
      });

      root.innerHTML = `
        <div class="panel">
          <div class="panel-header">
            <div class="header-title">
              <span>⚡ Server Functions</span>
              <span class="pill-badge">${logs.length}</span>
            </div>
            <div class="header-actions">
              <button class="btn" id="btn-clear">Clear</button>
              <button class="btn btn-icon" id="btn-close">✕</button>
            </div>
          </div>
          <div class="search-bar">
            <input class="search-input" id="filter-input" placeholder="Filter functions or files..." />
          </div>
          <div class="log-list">
            ${filteredLogs.length === 0 ? '<div class="empty-state">No server function calls yet. Trigger a server action in your app!</div>' : ''}
            ${filteredLogs.map(item => {
              const statusClass = item.status < 300 ? "status-200" : (item.status < 500 ? "status-400" : "status-500");
              const durClass = item.durationMs < 50 ? "fast" : (item.durationMs < 200 ? "medium" : "slow");
              return `
                <div class="log-item ${item.expanded ? 'open' : ''}" data-id="${item.id}">
                  <div class="log-summary">
                    <div class="log-left">
                      <span class="badge-status ${statusClass}">${item.status}</span>
                      <span class="fn-name">ƒ ${escapeHtml(item.name)}</span>
                    </div>
                    <span class="duration ${durClass}">${item.durationMs.toFixed(1)}ms</span>
                  </div>
                  ${item.expanded ? `
                    <div class="log-details">
                      <div class="detail-row">
                        <span class="detail-label">Location</span>
                        <div>
                          <span class="file-link" data-file="${escapeHtml(item.file)}">${escapeHtml(item.file)}</span>
                        </div>
                      </div>
                      ${item.args !== undefined ? `
                        <div class="detail-row">
                          <span class="detail-label">Arguments</span>
                          <div class="code-block">${escapeHtml(typeof item.args === 'string' ? item.args : JSON.stringify(item.args, null, 2))}</div>
                        </div>
                      ` : ''}
                      ${item.result !== undefined ? `
                        <div class="detail-row">
                          <span class="detail-label">${item.status >= 400 ? 'Error / Failure' : 'Result'}</span>
                          <div class="code-block">${escapeHtml(typeof item.result === 'string' ? item.result : JSON.stringify(item.result, null, 2))}</div>
                        </div>
                      ` : ''}
                      <div class="btn-toolbar">
                        <button class="btn btn-open-editor" data-file="${escapeHtml(item.file)}">Open in Editor</button>
                        <button class="btn btn-copy" data-payload="${escapeHtml(JSON.stringify({ name: item.name, args: item.args, result: item.result }))}">Copy JSON</button>
                      </div>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;

      root.querySelector("#btn-close")?.addEventListener("click", () => {
        isOpen = false;
        render();
      });

      root.querySelector("#btn-clear")?.addEventListener("click", () => {
        logs.length = 0;
        render();
      });

      const filterInput = root.querySelector("#filter-input");
      if (filterInput) {
        // Assigned through the DOM API instead of a `value="${activeFilter}"`
        // attribute: the filter text is untrusted and interpolating it into
        // HTML would allow an attribute breakout to inject event handlers.
        filterInput.value = activeFilter;
        filterInput.addEventListener("input", (e) => {
          activeFilter = e.target.value;
          render();
          const newInput = root.querySelector("#filter-input");
          if (newInput) {
            newInput.focus();
            newInput.setSelectionRange(newInput.value.length, newInput.value.length);
          }
        });
      }

      root.querySelectorAll(".log-item").forEach(el => {
        el.addEventListener("click", (e) => {
          if (e.target.closest("button") || e.target.closest(".file-link")) return;
          const id = Number(el.getAttribute("data-id"));
          const target = logs.find(l => l.id === id);
          if (target) {
            target.expanded = !target.expanded;
            render();
          }
        });
      });

      root.querySelectorAll(".btn-open-editor, .file-link").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const file = btn.getAttribute("data-file");
          if (file) {
            fetch("/__open-in-editor?file=" + encodeURIComponent(file)).catch(() => {});
          }
        });
      });

      root.querySelectorAll(".btn-copy").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const payload = btn.getAttribute("data-payload");
          if (payload && navigator.clipboard) {
            navigator.clipboard.writeText(payload);
            const orig = btn.textContent;
            btn.textContent = "Copied!";
            setTimeout(() => { btn.textContent = orig; }, 1500);
          }
        });
      });
    }

    function escapeHtml(str) {
      if (!str) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    let nextId = 1;
    import.meta.hot.on("vite-plugin-hyperlog:server-fn", (data) => {
      const entry = {
        id: nextId++,
        name: data.name || "serverFn",
        file: data.file || "",
        status: data.status || 200,
        durationMs: Number(data.durationMs) || 0,
        args: data.args,
        result: data.result,
        timestamp: Date.now(),
        expanded: false,
      };

      logs.unshift(entry);
      if (logs.length > MAX_LOGS) {
        logs.pop();
      }

      if (data.browserConsole) {
        try {
          const statusStyle = entry.status < 300 ? "color:#10b981" : (entry.status < 500 ? "color:#f59e0b" : "color:#ef4444");
          console.groupCollapsed(
            `%c[server-fn] %c${entry.name}%c ${entry.status} in ${entry.durationMs.toFixed(1)}ms%c (${entry.file})`,
            "background:#7c3aed;color:#ffffff;font-weight:bold;padding:1px 5px;border-radius:3px;",
            "color:#38bdf8;font-weight:bold;",
            statusStyle,
            "color:#94a3b8;"
          );
          if (entry.args !== undefined) {
            console.log("Arguments:", entry.args);
          }
          if (entry.result !== undefined) {
            if (entry.status >= 400) {
              console.error("Result / Error:", entry.result);
            } else {
              console.log("Result:", entry.result);
            }
          }
          if (entry.file) {
            console.log("Location:", entry.file);
          }
          console.groupEnd();
        } catch {}
      }

      render();
    });

    render();
  })();
}
"##.to_string()
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_decode_server_fn_valid_url_safe() {
    let path = "/_serverFn/eyJmaWxlIjoiL3NyYy9yb3V0ZXMvX19yb290LnRzeD90c3Mtc2VydmVyZm4tc3BsaXQiLCJleHBvcnQiOiJnZXRBdXRoU2Vzc2lvbl9jcmVhdGVTZXJ2ZXJGbl9oYW5kbGVyIn0";
    let (export_name, file_path) = decode_server_fn(path).expect("failed to decode");
    assert_eq!(export_name, "getAuthSession");
    assert_eq!(file_path, "routes/__root.tsx");
  }

  #[test]
  fn test_decode_server_fn_invalid_path() {
    assert!(decode_server_fn("/not_server_fn").is_none());
    assert!(decode_server_fn("/_serverFn/").is_none());
  }

  #[test]
  fn test_decode_server_fn_oversized() {
    let huge_token = format!("/_serverFn/{}", "a".repeat(5000));
    assert!(decode_server_fn(&huge_token).is_none());
  }

  #[test]
  fn test_format_server_fn_log_tree_child() {
    let log = format_server_fn_log(
      "myAction",
      "app/actions.ts",
      Some(42),
      200,
      5.12,
      Some("5, \"test\""),
      Some("{\"ok\":true}"),
      Some(true),
      None,
    )
    .expect("failed to format");

    assert!(log.contains("└─"));
    assert!(log.contains("ƒ myAction"));
    assert!(log.contains("(5, \"test\")"));
    assert!(log.contains("➜ {\"ok\":true}"));
    assert!(log.contains("5.12ms"));
    assert!(log.contains("app/actions.ts:42"));
  }

  #[test]
  fn test_format_server_fn_log_standalone_error() {
    let log = format_server_fn_log(
      "deleteUser",
      "src/actions.ts",
      None,
      500,
      12.0,
      Some("101"),
      Some("Unauthorized"),
      Some(false),
      Some(3),
    )
    .expect("failed to format");

    assert!(log.contains("[server-fn]"));
    assert!(log.contains("500"));
    assert!(log.contains("POST"));
    assert!(log.contains("ƒ deleteUser"));
    assert!(log.contains("❌ Unauthorized"));
    assert!(log.contains("(x3)"));
    assert!(log.contains("(src/actions.ts)"));
  }

  #[test]
  fn test_get_server_fn_overlay_script() {
    let script = get_server_fn_overlay_script();
    assert!(script.contains("hyperlog-server-fn-host"));
    assert!(script.contains("vite-plugin-hyperlog:server-fn"));
    assert!(script.contains("attachShadow"));
  }
}
