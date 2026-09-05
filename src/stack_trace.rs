#[derive(Debug, PartialEq, Eq)]
pub struct StackFrame<'a> {
  pub fn_name: Option<&'a str>,
  pub path: &'a str,
  pub line: u32,
  pub col: u32,
}

#[must_use]
pub fn parse_stack_frame(line: &str) -> Option<StackFrame<'_>> {
  let s = line.trim();
  let s = s.strip_suffix(')').unwrap_or(s);

  let (rest, col_str) = s.rsplit_once(':')?;
  let col: u32 = col_str.parse().ok()?;

  let (prefix, line_str) = rest.rsplit_once(':')?;
  let line: u32 = line_str.parse().ok()?;

  let (fn_raw, mut path_raw) = if let Some(paren_idx) = prefix.rfind('(') {
    let fn_part = prefix.get(..paren_idx)?.trim();
    let path_part = prefix.get(paren_idx + 1..)?.trim();
    (Some(fn_part), path_part)
  } else if let Some((fn_part, path_part)) = prefix.split_once('@') {
    (Some(fn_part.trim()), path_part.trim())
  } else {
    let path_part = prefix.strip_prefix("at ").unwrap_or(prefix).trim();
    (None, path_part)
  };

  let fn_name = fn_raw.and_then(|raw| {
    let mut cleaned = raw.strip_prefix("at ").unwrap_or(raw).trim();
    if let Some((f, _)) = cleaned.split_once("(cid:") {
      cleaned = f.trim();
    }
    if cleaned.is_empty() {
      None
    } else {
      Some(cleaned)
    }
  });

  if let Some(pos) = path_raw.find("://") {
    if let Some(after_proto) = path_raw.get(pos + 3..) {
      if let Some(slash_idx) = after_proto.find('/') {
        if let Some(path_from_slash) = after_proto.get(slash_idx..) {
          path_raw = path_from_slash;
        }
      }
    }
  }

  if let Some(stripped) = path_raw.strip_prefix("/@fs") {
    path_raw = stripped;
  }

  if path_raw.is_empty() {
    return None;
  }

  Some(StackFrame {
    fn_name,
    path: path_raw,
    line,
    col,
  })
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_parse_chrome_frame() {
    let frame = parse_stack_frame("    at query (http://localhost:3000/src/db.ts:18:9)").unwrap();
    assert_eq!(frame.fn_name, Some("query"));
    assert_eq!(frame.path, "/src/db.ts");
    assert_eq!(frame.line, 18);
    assert_eq!(frame.col, 9);
  }

  #[test]
  fn test_parse_safari_frame() {
    let frame = parse_stack_frame("query@http://localhost:3000/src/db.ts:18:9").unwrap();
    assert_eq!(frame.fn_name, Some("query"));
    assert_eq!(frame.path, "/src/db.ts");
    assert_eq!(frame.line, 18);
    assert_eq!(frame.col, 9);
  }

  #[test]
  fn test_parse_simple_frame() {
    let frame = parse_stack_frame("    at bundle.js:1:6").unwrap();
    assert_eq!(frame.fn_name, None);
    assert_eq!(frame.path, "bundle.js");
    assert_eq!(frame.line, 1);
    assert_eq!(frame.col, 6);
  }
}
