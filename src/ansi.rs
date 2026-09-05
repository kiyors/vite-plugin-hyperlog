pub const RESET: &str = "\x1b[0m";
pub const DIM: &str = "\x1b[90m";
pub const RED: &str = "\x1b[31m";
pub const GREEN: &str = "\x1b[32m";
pub const YELLOW: &str = "\x1b[33m";
pub const BLUE: &str = "\x1b[34m";
pub const MAGENTA: &str = "\x1b[35m";
pub const CYAN: &str = "\x1b[36m";
pub const WHITE_BOLD: &str = "\x1b[1;37m";
pub const CYAN_BOLD: &str = "\x1b[1;36m";

pub fn status_color(status: u32) -> &'static str {
  match status {
    500..=599 => RED,
    400..=499 => YELLOW,
    300..=399 => CYAN,
    200..=299 => GREEN,
    _ => RESET,
  }
}

pub fn method_color(method: &str) -> &'static str {
  match method {
    "GET" => GREEN,
    "POST" => YELLOW,
    "PUT" => BLUE,
    "DELETE" => RED,
    "PATCH" => MAGENTA,
    _ => CYAN,
  }
}

pub fn duration_color(duration_ms: f64) -> &'static str {
  if duration_ms > 500.0 {
    RED
  } else if duration_ms > 200.0 {
    YELLOW
  } else {
    DIM
  }
}

pub fn now_time_string() -> String {
  chrono::Local::now().format("%H:%M:%S").to_string()
}
