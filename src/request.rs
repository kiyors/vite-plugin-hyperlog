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

fn is_asset_path(path: &str) -> bool {
  path.ends_with(".css")
    || path.ends_with(".svg")
    || path.ends_with(".png")
    || path.ends_with(".ico")
    || path.ends_with(".jpg")
    || path.ends_with(".jpeg")
    || path.ends_with(".webp")
    || path.ends_with(".avif")
    || path.ends_with(".woff")
    || path.ends_with(".woff2")
    || path.ends_with(".ttf")
    || path.ends_with(".map")
    || path.ends_with(".json")
    || path.ends_with(".wasm")
}

fn is_module_path(path: &str) -> bool {
  path.starts_with("/@id/")
    || path.starts_with("/@fs/")
    || path.starts_with("/@vite/")
    || path.starts_with("/node_modules/")
    || path.ends_with(".js")
    || path.ends_with(".mjs")
    || path.ends_with(".cjs")
    || path.ends_with(".ts")
    || path.ends_with(".tsx")
    || path.ends_with(".jsx")
    || path.ends_with(".vue")
    || path.ends_with(".svelte")
}

#[allow(clippy::too_many_arguments)]
pub fn format_log_entry(
  original_url: String,
  method: String,
  status: u32,
  duration_ms: f64,
  content_length: Option<f64>,
  redirect_location: Option<String>,
  route_name: Option<String>,
  repeat_count: Option<u32>,
) -> Option<String> {
  let (path, query) = match original_url.split_once('?') {
    Some((p, q)) => (p, Some(q)),
    None => (original_url.as_str(), None),
  };

  let category = classify_path(path);

  let label = match category {
    RequestCategory::ServerFn => format!("{}[server-fn]{}", ansi::MAGENTA, ansi::RESET),
    RequestCategory::Api => format!("{}[api]{}", ansi::MAGENTA, ansi::RESET),
    RequestCategory::Asset => format!("{}[asset]{}", ansi::DIM, ansi::RESET),
    RequestCategory::Module => format!("{}[module]{}", ansi::DIM, ansi::RESET),
    RequestCategory::Route => format!("{}[route]{}", ansi::CYAN, ansi::RESET),
  };

  let status_color = ansi::status_color(status);
  let method_color = ansi::method_color(&method);

  let query_string = match query {
    Some(q) => format!("?{}{}{}", ansi::DIM, q, ansi::RESET),
    None => String::new(),
  };

  let target_string = match category {
    RequestCategory::ServerFn => {
      if let Some((func_name, file_name)) = server_fn::decode_server_fn(path) {
        let fail_icon = if status >= 400 {
          format!(" {}❌{}", ansi::RED, ansi::RESET)
        } else {
          String::new()
        };
        format!(
          "{}{}{} {}({}){}{}",
          ansi::CYAN_BOLD,
          func_name,
          ansi::RESET,
          ansi::DIM,
          file_name,
          ansi::RESET,
          fail_icon
        )
      } else {
        format!("{}{}", path, query_string)
      }
    }
    RequestCategory::Asset | RequestCategory::Module => {
      format!("{}{}{}{}", ansi::DIM, path, query_string, ansi::RESET)
    }
    RequestCategory::Route => {
      if let Some(ref loc) = redirect_location {
        format!(
          "{}{}{} ➜ {}{}{}",
          ansi::WHITE_BOLD,
          path,
          ansi::RESET,
          ansi::CYAN,
          loc,
          ansi::RESET
        )
      } else if let Some(ref r_name) = route_name {
        format!(
          "{}{}{}{} {}[{}]{}",
          ansi::WHITE_BOLD,
          path,
          ansi::RESET,
          query_string,
          ansi::DIM,
          r_name,
          ansi::RESET
        )
      } else {
        format!(
          "{}{}{}{}",
          ansi::WHITE_BOLD,
          path,
          ansi::RESET,
          query_string
        )
      }
    }
    RequestCategory::Api => {
      format!("{}{}", path, query_string)
    }
  };

  let duration_color = ansi::duration_color(duration_ms);

  let size_string = match content_length {
    Some(bytes) if bytes > 0.0 => {
      format!(" {}{:.1}kB{}", ansi::DIM, bytes / 1024.0, ansi::RESET)
    }
    _ => String::new(),
  };

  let repeat_string = match repeat_count {
    Some(count) if count > 1 => format!(" {}(x{}){}", ansi::YELLOW, count, ansi::RESET),
    _ => String::new(),
  };

  let time = ansi::now_time_string();

  Some(format!(
    "{}{}{} {} {}{}{} {}{:<6}{} {} {}{:.2}ms{}{}{}",
    ansi::DIM,
    time,
    ansi::RESET,
    label,
    status_color,
    status,
    ansi::RESET,
    method_color,
    method,
    ansi::RESET,
    target_string,
    duration_color,
    duration_ms,
    ansi::RESET,
    size_string,
    repeat_string
  ))
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
    let url = "/_serverFn/eyJmaWxlIjoiL3NyYy9yb3V0ZXMvX19yb290LnRzeD90c3Mtc2VydmVyZm4tc3BsaXQiLCJleHBvcnQiOiJnZXRBdXRoU2Vzc2lvbl9jcmVhdGVTZXJ2ZXJGbl9oYW5kbGVyIn0".to_string();
    let res = format_log_entry(url, "GET".into(), 200, 18.82, None, None, None, Some(3));
    assert!(res.is_some());
    let log = res.unwrap();
    assert!(log.contains("[server-fn]"));
    assert!(log.contains("getAuthSession"));
    assert!(log.contains("(routes/__root.tsx)"));
    assert!(log.contains("(x3)"));
  }

  #[test]
  fn test_format_log_entry_redirect() {
    let res = format_log_entry(
      "/".into(),
      "GET".into(),
      307,
      100.0,
      None,
      Some("/login".into()),
      None,
      None,
    );
    assert!(res.is_some());
    let log = res.unwrap();
    assert!(log.contains("[route]"));
    assert!(log.contains("➜"));
    assert!(log.contains("/login"));
  }

  #[test]
  fn test_format_log_entry_route_name() {
    let res = format_log_entry(
      "/team-alpha/projects/123".into(),
      "GET".into(),
      200,
      35.0,
      None,
      None,
      Some("/$teamId/projects/$projectId".into()),
      None,
    );
    assert!(res.is_some());
    let log = res.unwrap();
    assert!(log.contains("[route]"));
    assert!(log.contains("/team-alpha/projects/123"));
    assert!(log.contains("[/$teamId/projects/$projectId]"));
  }
}
