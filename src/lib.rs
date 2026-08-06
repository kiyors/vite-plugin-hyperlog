#![deny(clippy::all)]
use napi_derive::napi;

#[napi]
pub fn format_log_entry(
  original_url: String,
  method: String,
  status: u32,
  duration_ms: f64,
  content_length: Option<String>,
) -> Option<String> {
  // Ignore polling or HMR requests
  if original_url.contains("?import")
    || original_url.contains("vite_ping")
    || original_url.contains("@fs")
    || original_url.contains("/@vite/client")
    || original_url.contains("/@react-refresh")
  {
    return None;
  }

  let is_api = original_url.starts_with("/api");
  // Simple regex equivalent in Rust to check file extensions
  let is_asset = original_url.contains(".js")
    || original_url.contains(".css")
    || original_url.contains(".svg")
    || original_url.contains(".png");

  let label = if is_api {
    "\x1b[35m[api]\x1b[0m"
  } else if is_asset {
    "\x1b[90m[asset]\x1b[0m"
  } else {
    "\x1b[36m[router]\x1b[0m"
  };

  let status_color = match status {
    500..=599 => "\x1b[31m", // Red
    400..=499 => "\x1b[33m", // Yellow
    300..=399 => "\x1b[36m", // Cyan
    200..=299 => "\x1b[32m", // Green
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

  let padded_method = format!("{:<6}", method);

  // Split URL and query
  let parts: Vec<&str> = original_url.split('?').collect();
  let path = parts[0];
  let query = if parts.len() > 1 {
    format!("?{}", parts[1])
  } else {
    "".to_string()
  };

  let mut url_string = if is_asset {
    format!("\x1b[90m{}\x1b[0m", path)
  } else {
    path.to_string()
  };

  if !query.is_empty() {
    url_string.push_str(&format!("\x1b[90m{}\x1b[0m", query));
  }

  let duration_color = if duration_ms > 500.0 {
    "\x1b[31m"
  } else if duration_ms > 200.0 {
    "\x1b[33m"
  } else {
    "\x1b[90m"
  };

  let size_string = if let Some(len_str) = content_length {
    if let Ok(bytes) = len_str.parse::<f64>() {
      format!(" \x1b[90m{:.1}kB\x1b[0m", bytes / 1024.0)
    } else {
      "".to_string()
    }
  } else {
    "".to_string()
  };

  // Get current time formatting (simplified for brevity)
  let time = chrono::Local::now().format("%H:%M:%S").to_string();

  let final_log = format!(
    "\x1b[90m{}\x1b[0m {} {}{}\x1b[0m {}{}\x1b[0m {} {}{:.2}ms\x1b[0m{}",
    time,
    label,
    status_color,
    status,
    method_color,
    padded_method,
    url_string,
    duration_color,
    duration_ms,
    size_string
  );

  Some(final_log)
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
