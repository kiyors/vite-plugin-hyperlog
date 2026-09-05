use std::sync::LazyLock;

use napi_derive::napi;
use oxc_sourcemap::SourceMap;
use regex::Regex;

#[napi(object)]
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RemappedPosition {
  pub source: Option<String>,
  pub line: u32,
  pub column: u32,
  pub name: Option<String>,
}

static STACK_FRAME_RE: LazyLock<Regex> = LazyLock::new(|| {
  Regex::new(
    r#"(?m)(?P<prefix>^\s*at\s+(?:(?P<fn>[a-zA-Z0-9_$<>.]+)\s+\()?(?:https?://[^/]+(?:/@fs)?)?(?P<path>/?[a-zA-Z0-9_$./@-]+(?:\.[a-zA-Z0-9]+)?)):(?P<line>\d+):(?P<col>\d+)(?P<suffix>\)?)"#,
  )
  .unwrap()
});

/// Remaps a compiled line and column position to its original TypeScript source location
/// using high-performance OXC sourcemap decoding.
pub fn remap_source_position(
  sourcemap_json: &str,
  line: u32,
  col: u32,
) -> Option<RemappedPosition> {
  let sm = SourceMap::from_json_string(sourcemap_json).ok()?;
  let lookup_table = sm.generate_lookup_table();

  // Sourcemap lines are 0-indexed; editors and stack traces are 1-indexed
  let target_line = if line > 0 { line - 1 } else { 0 };
  let token = sm.lookup_source_view_token(&lookup_table, target_line, col)?;
  let (source, src_line, src_col, name) = token.to_tuple();

  Some(RemappedPosition {
    source: source.map(|s| s.to_string()),
    line: src_line + 1,
    column: src_col,
    name: name.map(|n| n.to_string()),
  })
}

/// Remaps all stack frames in a browser error stack trace using the provided source map.
pub fn remap_stack_trace(sourcemap_json: &str, stack: &str) -> String {
  let sm = match SourceMap::from_json_string(sourcemap_json) {
    Ok(s) => s,
    Err(_) => return stack.to_string(),
  };
  let lookup_table = sm.generate_lookup_table();

  let mut remapped = String::with_capacity(stack.len());
  let mut last_idx = 0;

  for caps in STACK_FRAME_RE.captures_iter(stack) {
    let full_match = caps.get(0).unwrap();
    remapped.push_str(&stack[last_idx..full_match.start()]);

    let line: u32 = caps
      .name("line")
      .and_then(|m| m.as_str().parse().ok())
      .unwrap_or(0);
    let col: u32 = caps
      .name("col")
      .and_then(|m| m.as_str().parse().ok())
      .unwrap_or(0);

    let target_line = if line > 0 { line - 1 } else { 0 };

    if let Some(token) = sm.lookup_source_view_token(&lookup_table, target_line, col) {
      let (source, src_line, src_col, name) = token.to_tuple();
      let original_file = source.unwrap_or("");
      let original_line = src_line + 1;
      let original_col = src_col;

      let fn_str = match name {
        Some(n) => n.to_string(),
        None => caps
          .name("fn")
          .map(|m| m.as_str().to_string())
          .unwrap_or_default(),
      };

      if fn_str.is_empty() {
        remapped.push_str(&format!(
          "    at {}:{}:{}",
          original_file, original_line, original_col
        ));
      } else {
        remapped.push_str(&format!(
          "    at {} ({}:{}:{})",
          fn_str, original_file, original_line, original_col
        ));
      }
    } else {
      remapped.push_str(full_match.as_str());
    }

    last_idx = full_match.end();
  }

  remapped.push_str(&stack[last_idx..]);
  remapped
}

#[cfg(test)]
mod tests {
  use super::*;

  const SAMPLE_SOURCEMAP: &str = r#"{
    "version": 3,
    "file": "bundle.js",
    "sources": ["src/App.tsx"],
    "sourcesContent": ["const App = () => { throw new Error('Crash'); };"],
    "names": ["App", "Error"],
    "mappings": "AAAA,MAAMA,GAAM,QAAQ,IAAIC,GAAM"
  }"#;

  #[test]
  fn test_remap_source_position() {
    let pos = remap_source_position(SAMPLE_SOURCEMAP, 1, 6).unwrap();
    assert_eq!(pos.source.as_deref(), Some("src/App.tsx"));
    assert_eq!(pos.line, 1);
    assert_eq!(pos.name.as_deref(), Some("App"));
  }

  #[test]
  fn test_remap_stack_trace() {
    let stack = "Error: Crash\n    at bundle.js:1:6";
    let remapped = remap_stack_trace(SAMPLE_SOURCEMAP, stack);
    assert!(remapped.contains("src/App.tsx:1"));
  }
}
