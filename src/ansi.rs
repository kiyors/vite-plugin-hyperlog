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

// Pre-colored static labels to eliminate repeated runtime string allocations
pub const LABEL_SERVER_FN: &str = "\x1b[35m[server-fn]\x1b[0m";
pub const LABEL_API: &str = "\x1b[35m[api]\x1b[0m";
pub const LABEL_ASSET: &str = "\x1b[90m[asset]\x1b[0m";
pub const LABEL_MODULE: &str = "\x1b[90m[module]\x1b[0m";
pub const LABEL_ROUTE: &str = "\x1b[36m[route]\x1b[0m";
pub const LABEL_ROUTE_PAD: &str = "\x1b[36m[route]\x1b[0m  ";
pub const LABEL_PRELOAD: &str = "\x1b[33m[preload]\x1b[0m";

// Pre-colored static browser prefixes
pub const PREFIX_BROWSER_ERROR: &str = "\x1b[31m[browser error]\x1b[0m";
pub const PREFIX_BROWSER_WARN: &str = "\x1b[33m[browser warn]\x1b[0m ";
pub const PREFIX_BROWSER_INFO: &str = "\x1b[36m[browser info]\x1b[0m ";
pub const PREFIX_BROWSER_DEBUG: &str = "\x1b[90m[browser debug]\x1b[0m";
pub const PREFIX_BROWSER_TIMER: &str = "\x1b[35m[browser timer]\x1b[0m";
pub const PREFIX_BROWSER_TABLE: &str = "\x1b[36m[browser table]\x1b[0m";
pub const PREFIX_BROWSER_DEFAULT: &str = "\x1b[34m[browser]\x1b[0m      ";

#[must_use]
pub fn status_color(status: u32) -> &'static str {
  match status {
    500..=599 => RED,
    400..=499 => YELLOW,
    300..=399 => CYAN,
    200..=299 => GREEN,
    _ => RESET,
  }
}

#[must_use]
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

#[must_use]
pub fn duration_color(duration_ms: f64) -> &'static str {
  if duration_ms > 500.0 {
    RED
  } else if duration_ms > 200.0 {
    YELLOW
  } else {
    DIM
  }
}

#[cfg(unix)]
fn get_local_hms(sec: i64) -> (u32, u32, u32) {
  let mut tm = std::mem::MaybeUninit::<libc::tm>::uninit();
  unsafe {
    let t = sec as libc::time_t;
    libc::localtime_r(std::ptr::addr_of!(t), tm.as_mut_ptr());
    let tm = tm.assume_init();
    (
      u32::try_from(tm.tm_hour).unwrap_or(0),
      u32::try_from(tm.tm_min).unwrap_or(0),
      u32::try_from(tm.tm_sec).unwrap_or(0),
    )
  }
}

#[cfg(windows)]
#[repr(C)]
struct SystemTime {
  w_year: u16,
  w_month: u16,
  w_day_of_week: u16,
  w_day: u16,
  w_hour: u16,
  w_minute: u16,
  w_second: u16,
  w_milliseconds: u16,
}

#[cfg(windows)]
extern "system" {
  fn GetLocalTime(lp_system_time: *mut SystemTime);
}

#[cfg(windows)]
fn get_local_hms(_sec: i64) -> (u32, u32, u32) {
  let mut st = std::mem::MaybeUninit::<SystemTime>::uninit();
  unsafe {
    GetLocalTime(st.as_mut_ptr());
    let st = st.assume_init();
    (
      u32::from(st.w_hour),
      u32::from(st.w_minute),
      u32::from(st.w_second),
    )
  }
}

#[cfg(not(any(unix, windows)))]
fn get_local_hms(sec: i64) -> (u32, u32, u32) {
  let secs_in_day = (sec % 86400 + 86400) % 86400;
  let hour = (secs_in_day / 3600) as u32;
  let min = ((secs_in_day % 3600) / 60) as u32;
  let s = (secs_in_day % 60) as u32;
  (hour, min, s)
}

struct TimeCache {
  last_sec: i64,
  raw_time: String,
  dim_time: String,
}

static TIME_CACHE: std::sync::LazyLock<std::sync::RwLock<TimeCache>> =
  std::sync::LazyLock::new(|| {
    std::sync::RwLock::new(TimeCache {
      last_sec: 0,
      raw_time: String::new(),
      dim_time: String::new(),
    })
  });

#[inline]
pub fn write_now_time(out: &mut String) {
  let sec = i64::try_from(
    std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .unwrap_or_default()
      .as_secs(),
  )
  .unwrap_or(0);

  if let Ok(cache) = TIME_CACHE.read() {
    if cache.last_sec == sec && !cache.dim_time.is_empty() {
      out.push_str(&cache.dim_time);
      return;
    }
  }

  let (h, m, s) = get_local_hms(sec);
  let raw = format!("{h:02}:{m:02}:{s:02}");
  let dim = format!("\x1b[90m{h:02}:{m:02}:{s:02}\x1b[0m");

  out.push_str(&dim);

  if let Ok(mut cache) = TIME_CACHE.write() {
    cache.last_sec = sec;
    cache.raw_time = raw;
    cache.dim_time = dim;
  }
}

#[must_use]
pub fn now_time_string() -> String {
  let sec = i64::try_from(
    std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .unwrap_or_default()
      .as_secs(),
  )
  .unwrap_or(0);

  if let Ok(cache) = TIME_CACHE.read() {
    if cache.last_sec == sec && !cache.raw_time.is_empty() {
      return cache.raw_time.clone();
    }
  }

  let (h, m, s) = get_local_hms(sec);
  let raw = format!("{h:02}:{m:02}:{s:02}");
  let dim = format!("\x1b[90m{h:02}:{m:02}:{s:02}\x1b[0m");

  if let Ok(mut cache) = TIME_CACHE.write() {
    cache.last_sec = sec;
    cache.raw_time.clone_from(&raw);
    cache.dim_time = dim;
  }
  raw
}
