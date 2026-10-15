use std::fmt::Write;

use crate::ansi;
use crate::sanitize;
use crate::server_fn;

#[derive(Debug, PartialEq, Eq)]
pub enum RequestCategory {
  ServerFn,
  Api,
  Asset,
  Module,
  Route,
}

#[must_use]
pub fn classify_path(path: &str) -> RequestCategory {
  if path.starts_with("/_serverFn") {
    RequestCategory::ServerFn
  } else if path.starts_with("/api") {
    RequestCategory::Api
  } else if is_asset_path(path) {
    RequestCategory::Asset
  } else if is_module_path(path) {
    RequestCategory::Module
  } else {
    RequestCategory::Route
  }
}

#[inline]
fn is_asset_path(path: &str) -> bool {
  if let Some((_, ext)) = path.rsplit_once('.') {
    matches!(
      ext,
      "css"
        | "svg"
        | "png"
        | "ico"
        | "jpg"
        | "jpeg"
        | "webp"
        | "avif"
        | "woff"
        | "woff2"
        | "ttf"
        | "map"
        | "json"
        | "wasm"
    )
  } else {
    false
  }
}

#[inline]
fn is_module_path(path: &str) -> bool {
  path.starts_with("/@")
    || path.starts_with("/node_modules/")
    || path.contains("node_modules")
    || if let Some((_, ext)) = path.rsplit_once('.') {
      matches!(
        ext,
        "js" | "mjs" | "cjs" | "ts" | "tsx" | "jsx" | "vue" | "svelte"
      )
    } else {
      false
    }
}

#[must_use]
pub fn matches_exclusion(url: &str, pattern: &str) -> bool {
  if !pattern.starts_with('/') {
    return url.contains(pattern);
  }

  let pathname = match url.split_once('?') {
    Some((p, _)) => p,
    None => url,
  };

  // Fast-path: root-anchored prefix check (matches 95%+ of typical exclusions like "/node_modules/", "/api", "/favicon.ico")
  if let Some(rest) = pathname.strip_prefix(pattern) {
    if pattern.ends_with('/') || rest.is_empty() || rest.starts_with('/') {
      return true;
    }
  }

  let mut from = 0;
  while let Some(slice) = pathname.get(from..) {
    let Some(idx) = slice.find(pattern) else {
      break;
    };
    let match_pos = from.saturating_add(idx);
    let before = if match_pos == 0 {
      None
    } else {
      pathname
        .as_bytes()
        .get(match_pos.saturating_sub(1))
        .copied()
    };
    let after_pos = match_pos.saturating_add(pattern.len());
    let after = pathname.as_bytes().get(after_pos).copied();

    let starts_segment = before.is_none() || before == Some(b'/');
    let ends_segment = pattern.ends_with('/') || after.is_none() || after == Some(b'/');

    if starts_segment && ends_segment {
      return true;
    }

    from = match_pos.saturating_add(1);
    if from >= pathname.len() {
      break;
    }
  }

  false
}

#[must_use]
pub fn is_module_request(url: &str) -> bool {
  if url.starts_with("/api") || url.starts_with("/_serverFn") {
    return false;
  }
  let pathname = match url.split_once('?') {
    Some((p, _)) => p,
    None => url,
  };
  if pathname.starts_with("/@") {
    return true;
  }
  if pathname.contains("/node_modules/") {
    return true;
  }
  if pathname.starts_with("/src/") {
    return true;
  }
  if let Some((_, ext)) = pathname.rsplit_once('.') {
    matches!(
      ext,
      "tsx" | "ts" | "jsx" | "js" | "mjs" | "cjs" | "css" | "vue" | "svelte"
    )
  } else {
    false
  }
}

#[must_use]
pub fn should_exclude_request(url: &str, exclusions: &[String], exclude_modules: bool) -> bool {
  // FAST-PATH: In Vite dev mode, >80% of incoming requests are module or asset requests
  // (@vite/client, @react-refresh, /src/..., node_modules, .tsx, .css).
  // Checking module status first avoids iterating over user exclusions for high-frequency dev assets.
  if exclude_modules && is_module_request(url) {
    return true;
  }
  for pattern in exclusions {
    if matches_exclusion(url, pattern) {
      return true;
    }
  }
  false
}

#[must_use]
#[expect(
  clippy::too_many_arguments,
  reason = "Matches JS formatLogEntry signature with 8 arguments"
)]
#[expect(
  clippy::too_many_lines,
  reason = "Comprehensive log line formatting for various request categories"
)]
pub fn format_log_entry(
  original_url: &str,
  method: &str,
  status: u32,
  duration_ms: f64,
  content_length: Option<f64>,
  redirect_location: Option<&str>,
  route_name: Option<&str>,
  repeat_count: Option<u32>,
) -> Option<String> {
  // Untrusted: the URL comes straight from the request line, so any page the dev
  // server serves can smuggle terminal control sequences into the log via
  // `fetch("/\x1b[2J")`. Sanitize once here so every branch below is safe.
  let sanitized_url = sanitize::sanitize(original_url);
  let sanitized_url = sanitized_url.as_ref();

  let (path, query) = match sanitized_url.split_once('?') {
    Some((p, q)) => (p, Some(q)),
    None => (sanitized_url, None),
  };

  let redirect_location = redirect_location.map(sanitize::sanitize);
  let route_name = route_name.map(sanitize::sanitize);

  let category = classify_path(path);

  let label = match category {
    RequestCategory::ServerFn => ansi::LABEL_SERVER_FN,
    RequestCategory::Api => ansi::LABEL_API,
    RequestCategory::Asset => ansi::LABEL_ASSET,
    RequestCategory::Module => ansi::LABEL_MODULE,
    RequestCategory::Route => ansi::LABEL_ROUTE,
  };

  let status_color = ansi::status_color(status);
  let method_color = ansi::method_color(method);
  let duration_color = ansi::duration_color(duration_ms);

  let mut buf = String::with_capacity(160);
  ansi::write_now_time(&mut buf);

  write!(
    buf,
    " {} {}{status}{} {}{method:<6}{} ",
    label,
    status_color,
    ansi::RESET,
    method_color,
    ansi::RESET,
  )
  .ok()?;

  match category {
    RequestCategory::ServerFn => {
      if let Some((func_name, file_name)) = server_fn::decode_server_fn(path) {
        // Decoded from a base64 segment of the URL, so also untrusted.
        let func_name = sanitize::sanitize(&func_name);
        let file_name = sanitize::sanitize(&file_name);
        write!(
          buf,
          "{}{func_name}{} {}({file_name}){}",
          ansi::CYAN_BOLD,
          ansi::RESET,
          ansi::DIM,
          ansi::RESET,
        )
        .ok()?;
        if status >= 400 {
          write!(buf, " {}❌{}", ansi::RED, ansi::RESET).ok()?;
        }
      } else {
        buf.push_str(path);
        if let Some(q) = query {
          write!(buf, "?{}{q}{}", ansi::DIM, ansi::RESET).ok()?;
        }
      }
    }
    RequestCategory::Asset | RequestCategory::Module => {
      write!(buf, "{}{path}", ansi::DIM).ok()?;
      if let Some(q) = query {
        write!(buf, "?{q}").ok()?;
      }
      buf.push_str(ansi::RESET);
    }
    RequestCategory::Route => {
      if let Some(loc) = redirect_location {
        write!(
          buf,
          "{}{path}{} ➜ {}{loc}{}",
          ansi::WHITE_BOLD,
          ansi::RESET,
          ansi::CYAN,
          ansi::RESET,
        )
        .ok()?;
      } else if let Some(r_name) = route_name {
        write!(buf, "{}{path}{}", ansi::WHITE_BOLD, ansi::RESET).ok()?;
        if let Some(q) = query {
          write!(buf, "?{}{q}{}", ansi::DIM, ansi::RESET).ok()?;
        }
        write!(buf, " {}[{r_name}]{}", ansi::DIM, ansi::RESET).ok()?;
      } else {
        write!(buf, "{}{path}{}", ansi::WHITE_BOLD, ansi::RESET).ok()?;
        if let Some(q) = query {
          write!(buf, "?{}{q}{}", ansi::DIM, ansi::RESET).ok()?;
        }
      }
    }
    RequestCategory::Api => {
      buf.push_str(path);
      if let Some(q) = query {
        write!(buf, "?{}{q}{}", ansi::DIM, ansi::RESET).ok()?;
      }
    }
  }

  write!(
    buf,
    " {}{:.2}ms{}",
    duration_color,
    duration_ms,
    ansi::RESET
  )
  .ok()?;

  if let Some(bytes) = content_length {
    if bytes > 0.0 {
      write!(buf, " {}{:.1}kB{}", ansi::DIM, bytes / 1024.0, ansi::RESET).ok()?;
    }
  }

  if let Some(count) = repeat_count {
    if count > 1 {
      write!(buf, " {}(x{}){}", ansi::YELLOW, count, ansi::RESET).ok()?;
    }
  }

  Some(buf)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_classify_path() {
    assert_eq!(classify_path("/api/v1/users"), RequestCategory::Api);
    assert_eq!(classify_path("/_serverFn/xyz"), RequestCategory::ServerFn);
    assert_eq!(classify_path("/favicon.ico"), RequestCategory::Asset);
    assert_eq!(classify_path("/src/main.tsx"), RequestCategory::Module);
    assert_eq!(classify_path("/@id/virtual:entry"), RequestCategory::Module);
    assert_eq!(classify_path("/@react-refresh"), RequestCategory::Module);
    assert_eq!(
      classify_path("/node_modules/.vite/deps/react.js"),
      RequestCategory::Module
    );
    assert_eq!(classify_path("/dashboard"), RequestCategory::Route);
    assert_eq!(classify_path("/"), RequestCategory::Route);
  }

  #[test]
  fn test_format_log_entry_strips_escapes_from_url() {
    // The URL comes from the request line, so a served page can inject escapes.
    let res = format_log_entry(
      "/\x1b[2J\x1b[HFAKE",
      "GET",
      200,
      1.0,
      None,
      None,
      None,
      None,
    );
    let log = res.unwrap();
    assert!(!log.contains("\x1b[2J"));
    assert!(!log.contains("\x1b[H"));
    assert!(log.contains("FAKE"));
  }

  #[test]
  fn test_format_log_entry_strips_escapes_from_route_name() {
    let res = format_log_entry(
      "/dash",
      "GET",
      200,
      1.0,
      None,
      None,
      Some("\x1b[31mFAKE\x1b[0m"),
      None,
    );
    let log = res.unwrap();
    assert!(!log.contains("\x1b[31m"));
    assert!(log.contains("FAKE"));
  }

  #[test]
  fn test_format_log_entry_strips_escapes_from_redirect_location() {
    let res = format_log_entry(
      "/old",
      "GET",
      302,
      1.0,
      None,
      Some("/\x1b[2Jnew"),
      None,
      None,
    );
    let log = res.unwrap();
    assert!(!log.contains("\x1b[2J"));
  }

  #[test]
  fn test_format_log_entry_strips_carriage_return_from_url() {
    let res = format_log_entry(
      "/legit\r[browser error] forged",
      "GET",
      200,
      1.0,
      None,
      None,
      None,
      None,
    );
    let log = res.unwrap();
    assert!(!log.contains('\r'));
  }

  #[test]
  fn test_format_log_entry_preserves_normal_urls() {
    let res = format_log_entry(
      "/dashboard/settings?tab=general",
      "GET",
      200,
      1.0,
      None,
      None,
      Some("/dashboard/settings"),
      None,
    );
    let log = res.unwrap();
    assert!(log.contains("/dashboard/settings"));
    assert!(log.contains("tab=general"));
  }

  #[test]
  fn test_format_log_entry_server_fn() {
    let url = "/_serverFn/eyJmaWxlIjoiL3NyYy9yb3V0ZXMvX19yb290LnRzeD90c3Mtc2VydmVyZm4tc3BsaXQiLCJleHBvcnQiOiJnZXRBdXRoU2Vzc2lvbl9jcmVhdGVTZXJ2ZXJGbl9oYW5kbGVyIn0";
    let res = format_log_entry(url, "GET", 200, 18.82, None, None, None, Some(3));
    assert!(res.is_some());
    let log = res.unwrap();
    assert!(log.contains("[server-fn]"));
    assert!(log.contains("getAuthSession"));
    assert!(log.contains("(routes/__root.tsx)"));
    assert!(log.contains("(x3)"));
  }

  #[test]
  fn test_format_log_entry_redirect() {
    let res = format_log_entry("/", "GET", 307, 100.0, None, Some("/login"), None, None);
    assert!(res.is_some());
    let log = res.unwrap();
    assert!(log.contains("[route]"));
    assert!(log.contains("➜"));
    assert!(log.contains("/login"));
  }

  #[test]
  fn test_format_log_entry_route_name() {
    let res = format_log_entry(
      "/team-alpha/projects/123",
      "GET",
      200,
      35.0,
      None,
      None,
      Some("/$teamId/projects/$projectId"),
      None,
    );
    assert!(res.is_some());
    let log = res.unwrap();
    assert!(log.contains("[route]"));
    assert!(log.contains("/team-alpha/projects/123"));
    assert!(log.contains("[/$teamId/projects/$projectId]"));
  }

  #[test]
  fn test_matches_exclusion() {
    assert!(matches_exclusion("/api/v1/users", "/api"));
    assert!(matches_exclusion("/api", "/api"));
    assert!(!matches_exclusion("/api-key", "/api"));
    assert!(!matches_exclusion("/dashboard/apiSettings", "/api"));
    assert!(!matches_exclusion("/apiary", "/api"));
    assert!(!matches_exclusion(
      "/settings/node_modules-check",
      "/node_modules/"
    ));
    assert!(matches_exclusion(
      "/node_modules/.vite/deps/react.js",
      "/node_modules/"
    ));
    assert!(matches_exclusion("/@id/virtual:browser-logger", "/@id/"));
    assert!(matches_exclusion("/@vite/client", "/@vite"));
    assert!(matches_exclusion("/src/App.tsx?import", "?import"));
    assert!(!matches_exclusion("/src/main.tsx?t=123", "?import"));
    assert!(matches_exclusion("/some/vite_ping", "vite_ping"));
    assert!(matches_exclusion("/api?page=2", "/api"));
    assert!(!matches_exclusion("/apiary?page=2", "/api"));
  }

  #[test]
  fn test_is_module_request() {
    assert!(is_module_request("/src/main.tsx"));
    assert!(is_module_request("/src/App.tsx"));
    assert!(is_module_request("/src/globals.css"));
    assert!(is_module_request("/src/components/ui/button.tsx"));
    assert!(is_module_request("/node_modules/.vite/deps/react.js"));
    assert!(is_module_request("/@react-refresh"));
    assert!(is_module_request("/@fs/Users/x/src/y.ts"));

    assert!(!is_module_request("/"));
    assert!(!is_module_request("/dashboard"));
    assert!(!is_module_request("/login"));
    assert!(!is_module_request("/api/v1/users"));
    assert!(!is_module_request("/_serverFn/abc"));
    assert!(!is_module_request("/api/config.js"));
  }

  #[test]
  fn test_should_exclude_request() {
    let exclusions = vec!["/api".to_string(), "?import".to_string()];
    assert!(should_exclude_request("/api/users", &exclusions, false));
    assert!(should_exclude_request(
      "/src/App.tsx?import",
      &exclusions,
      false
    ));
    assert!(!should_exclude_request("/dashboard", &exclusions, false));
    assert!(should_exclude_request("/src/main.tsx", &exclusions, true));
    assert!(!should_exclude_request("/dashboard", &exclusions, true));
  }
}
