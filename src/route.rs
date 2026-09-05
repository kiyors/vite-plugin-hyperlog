use std::fmt::Write;

use crate::ansi;

#[must_use]
pub fn format_route_log(
  route_id: &str,
  path: &str,
  params: Option<&str>,
  duration_ms: Option<f64>,
  is_preload: Option<bool>,
) -> Option<String> {
  let preload = is_preload.unwrap_or(false);

  let label = if preload {
    ansi::LABEL_PRELOAD
  } else {
    ansi::LABEL_ROUTE_PAD
  };

  let action_symbol = if preload { "⤓" } else { "➜" };

  let mut buf = String::with_capacity(128);
  ansi::write_now_time(&mut buf);

  write!(
    buf,
    " {} {} {}{}{}  {}[{}]{}",
    label,
    action_symbol,
    ansi::WHITE_BOLD,
    path,
    ansi::RESET,
    ansi::DIM,
    route_id,
    ansi::RESET,
  )
  .ok()?;

  if let Some(p) = params {
    if !p.is_empty() && p != "{}" {
      write!(buf, " {}(params: {}){}", ansi::DIM, p, ansi::RESET).ok()?;
    }
  }

  if let Some(ms) = duration_ms {
    let color = ansi::duration_color(ms);
    if preload {
      write!(buf, " {}(preloaded in {:.1}ms){}", color, ms, ansi::RESET).ok()?;
    } else {
      write!(buf, " {}({:.1}ms){}", color, ms, ansi::RESET).ok()?;
    }
  }

  Some(buf)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_format_route_log_navigation() {
    let res = format_route_log(
      "/$teamId/projects",
      "/my-team/projects",
      Some("{\"teamId\":\"my-team\"}"),
      Some(24.5),
      Some(false),
    );
    assert!(res.is_some());
    let log = res.unwrap();
    assert!(log.contains("[route]"));
    assert!(log.contains("➜"));
    assert!(log.contains("/my-team/projects"));
    assert!(log.contains("[/$teamId/projects]"));
    assert!(log.contains("24.5ms"));
  }

  #[test]
  fn test_format_route_log_preload() {
    let res = format_route_log(
      "/$teamId/settings",
      "/$teamId/settings",
      None,
      Some(12.0),
      Some(true),
    );
    assert!(res.is_some());
    let log = res.unwrap();
    assert!(log.contains("[preload]"));
    assert!(log.contains("⤓"));
    assert!(log.contains("preloaded in 12.0ms"));
  }
}
