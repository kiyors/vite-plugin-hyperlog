use crate::ansi;

pub fn format_route_log(
  route_id: String,
  path: String,
  params: Option<String>,
  duration_ms: Option<f64>,
  is_preload: Option<bool>,
) -> Option<String> {
  let time = ansi::now_time_string();
  let preload = is_preload.unwrap_or(false);

  let label = if preload {
    format!("{}[preload]{}", ansi::YELLOW, ansi::RESET)
  } else {
    format!("{}[route]{}  ", ansi::CYAN, ansi::RESET)
  };

  let action_symbol = if preload { "⤓" } else { "➜" };

  let duration_str = match duration_ms {
    Some(ms) => {
      let color = ansi::duration_color(ms);
      if preload {
        format!(" {}(preloaded in {:.1}ms){}", color, ms, ansi::RESET)
      } else {
        format!(" {}({:.1}ms){}", color, ms, ansi::RESET)
      }
    }
    None => String::new(),
  };

  let params_str = match params {
    Some(p) if !p.is_empty() && p != "{}" => {
      format!(" {}(params: {}){}", ansi::DIM, p, ansi::RESET)
    }
    _ => String::new(),
  };

  Some(format!(
    "{}{}{} {} {} {}{}{}  {}[{}]{}{}{}",
    ansi::DIM,
    time,
    ansi::RESET,
    label,
    action_symbol,
    ansi::WHITE_BOLD,
    path,
    ansi::RESET,
    ansi::DIM,
    route_id,
    ansi::RESET,
    params_str,
    duration_str
  ))
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_format_route_log_navigation() {
    let res = format_route_log(
      "/$teamId/projects".into(),
      "/my-team/projects".into(),
      Some("{\"teamId\":\"my-team\"}".into()),
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
      "/$teamId/settings".into(),
      "/$teamId/settings".into(),
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
