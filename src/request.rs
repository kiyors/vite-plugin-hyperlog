use std::fmt::Write;

use crate::ansi;
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
  path.starts_with("/@id/")
    || path.starts_with("/@fs/")
    || path.starts_with("/@vite/")
    || path.starts_with("/node_modules/")
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
  let (path, query) = match original_url.split_once('?') {
    Some((p, q)) => (p, Some(q)),
    None => (original_url, None),
  };

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
    assert_eq!(classify_path("/dashboard"), RequestCategory::Route);
    assert_eq!(classify_path("/"), RequestCategory::Route);
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
}
