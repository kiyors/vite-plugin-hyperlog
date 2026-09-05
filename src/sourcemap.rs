use std::fmt::Write;

use napi_derive::napi;

use crate::json_utils::{extract_json_field, extract_json_string_array};
use crate::stack_trace::parse_stack_frame;

#[napi(object)]
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RemappedPosition {
  pub source: Option<String>,
  pub line: u32,
  pub column: u32,
  pub name: Option<String>,
}

#[inline]
fn decode_vlq(bytes: &[u8], idx: &mut usize) -> Option<i64> {
  let mut result = 0i64;
  let mut shift = 0;

  while let Some(&b) = bytes.get(*idx) {
    *idx += 1;
    let val = match b {
      b'A'..=b'Z' => i64::from(b - b'A'),
      b'a'..=b'z' => i64::from(b - b'a' + 26),
      b'0'..=b'9' => i64::from(b - b'0' + 52),
      b'+' => 62,
      b'/' => 63,
      _ => return None,
    };
    let has_continuation = (val & 32) != 0;
    let digit = val & 31;
    result |= digit << shift;
    shift += 5;
    if !has_continuation {
      break;
    }
  }

  let is_negative = (result & 1) != 0;
  let value = result >> 1;
  Some(if is_negative { -value } else { value })
}

struct DecodedToken<'a> {
  source: Option<&'a str>,
  src_line: u32,
  src_col: u32,
  name: Option<&'a str>,
}

fn lookup_source_token<'a>(
  sources: &'a [String],
  names: &'a [String],
  mappings: &str,
  target_line: u32,
  target_col: u32,
) -> Option<DecodedToken<'a>> {
  let bytes = mappings.as_bytes();
  let mut idx = 0;

  let mut current_line: u32 = 0;
  let mut source_idx: i64 = 0;
  let mut orig_line: i64 = 0;
  let mut orig_col: i64 = 0;
  let mut name_idx: i64 = 0;

  let mut best_token: Option<DecodedToken<'a>> = None;

  while current_line <= target_line && idx < bytes.len() {
    let mut gen_col: i64 = 0;

    while let Some(&b) = bytes.get(idx) {
      if b == b';' {
        idx += 1;
        break;
      }
      if b == b',' {
        idx += 1;
        continue;
      }

      let col_delta = decode_vlq(bytes, &mut idx)?;
      gen_col += col_delta;

      let has_source = bytes.get(idx).is_some_and(|&c| c != b',' && c != b';');
      if has_source {
        source_idx += decode_vlq(bytes, &mut idx)?;
        orig_line += decode_vlq(bytes, &mut idx)?;
        orig_col += decode_vlq(bytes, &mut idx)?;

        let has_name = bytes.get(idx).is_some_and(|&c| c != b',' && c != b';');
        let current_name = if has_name {
          name_idx += decode_vlq(bytes, &mut idx)?;
          usize::try_from(name_idx)
            .ok()
            .and_then(|i| names.get(i).map(String::as_str))
        } else {
          None
        };

        if current_line == target_line {
          if gen_col <= i64::from(target_col) {
            let current_source = usize::try_from(source_idx)
              .ok()
              .and_then(|i| sources.get(i).map(String::as_str));

            best_token = Some(DecodedToken {
              source: current_source,
              src_line: u32::try_from(orig_line).unwrap_or(0),
              src_col: u32::try_from(orig_col).unwrap_or(0),
              name: current_name,
            });
          } else {
            return best_token;
          }
        }
      }
    }

    if current_line == target_line {
      return best_token;
    }

    current_line += 1;
  }

  best_token
}

/// Remaps a compiled line and column position to its original TypeScript source location.
#[must_use]
pub fn remap_source_position(
  sourcemap_json: &str,
  line: u32,
  col: u32,
) -> Option<RemappedPosition> {
  let mappings = extract_json_field(sourcemap_json, "mappings")?;
  let sources = extract_json_string_array(sourcemap_json, "sources");
  let names = extract_json_string_array(sourcemap_json, "names");

  let target_line = line.saturating_sub(1);
  let token = lookup_source_token(&sources, &names, mappings, target_line, col)?;

  Some(RemappedPosition {
    source: token.source.map(ToString::to_string),
    line: token.src_line + 1,
    column: token.src_col,
    name: token.name.map(ToString::to_string),
  })
}

/// Remaps all stack frames in a browser error stack trace using the provided source map.
#[must_use]
pub fn remap_stack_trace(sourcemap_json: &str, stack: &str) -> String {
  let Some(mappings) = extract_json_field(sourcemap_json, "mappings") else {
    return stack.to_string();
  };
  let sources = extract_json_string_array(sourcemap_json, "sources");
  let names = extract_json_string_array(sourcemap_json, "names");

  let mut remapped = String::with_capacity(stack.len() + 64);

  for (i, line) in stack.lines().enumerate() {
    if i > 0 {
      remapped.push('\n');
    }
    let trimmed = line.trim();
    if trimmed.starts_with("at ") || line.starts_with("    at ") {
      if let Some(frame) = parse_stack_frame(trimmed) {
        let target_line = frame.line.saturating_sub(1);
        if let Some(token) = lookup_source_token(&sources, &names, mappings, target_line, frame.col)
        {
          let original_file = token.source.unwrap_or("");
          let original_line = token.src_line + 1;
          let original_col = token.src_col;

          let fn_str = token.name.or(frame.fn_name);
          match fn_str {
            Some(f) if !f.is_empty() => {
              let _ = write!(
                remapped,
                "    at {f} ({original_file}:{original_line}:{original_col})"
              );
            }
            _ => {
              let _ = write!(
                remapped,
                "    at {original_file}:{original_line}:{original_col}"
              );
            }
          }
          continue;
        }
      }
    }
    remapped.push_str(line);
  }

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
