use std::fmt::Write;

use crate::ansi;

/// The detection thresholds themselves live in the plugin, not here, because the
/// decision is made in TypeScript before this formatter is ever called.
#[must_use]
pub fn format_graph_reevaluation(
  distinct_modules: u32,
  repeated_requests: u32,
  window_ms: f64,
) -> String {
  let mut buf = String::with_capacity(320);
  ansi::write_now_time(&mut buf);

  write!(
    buf,
    " {} {}module graph re-evaluated{}",
    ansi::YELLOW,
    ansi::WHITE_BOLD,
    ansi::RESET
  )
  .ok();

  let total_requests = distinct_modules.saturating_add(repeated_requests);
  writeln!(
    buf,
    " {}{distinct_modules} modules requested again ({} requests total) within {:.0}ms{}",
    ansi::DIM,
    total_requests,
    window_ms,
    ansi::RESET
  )
  .ok();

  writeln!(
    buf,
    "     {}\u{21b3} no document request between them, so the entry graph ran twice in one page load{}",
    ansi::DIM,
    ansi::RESET
  )
  .ok();

  writeln!(
    buf,
    "     {}\u{21b3} look for a duplicate <script type=\"module\"> in index.html, or a cache-busted dynamic import() of your entry{}",
    ansi::DIM,
    ansi::RESET
  )
  .ok();

  // console.log appends its own newline, so drop ours to avoid a blank line.
  if buf.ends_with('\n') {
    buf.pop();
  }

  buf
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_graph_reevaluation_mentions_module_and_window() {
    let out = format_graph_reevaluation(24, 24, 1934.0);
    assert!(out.contains("module graph re-evaluated"));
    assert!(out.contains("24 modules requested again"));
    assert!(out.contains("within 1934ms"));
    assert!(out.contains("duplicate <script type=\"module\">"));
    assert!(out.contains("cache-busted dynamic import()"));
  }

  #[test]
  fn test_graph_reevaluation_request_count_is_distinct_plus_repeats() {
    let out = format_graph_reevaluation(24, 24, 900.0);
    assert!(out.contains("(48 requests total)"));
  }

  #[test]
  fn test_graph_reevaluation_has_no_trailing_blank_line() {
    let out = format_graph_reevaluation(24, 24, 900.0);
    assert!(!out.ends_with('\n'));
  }
}
