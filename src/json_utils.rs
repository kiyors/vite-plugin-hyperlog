#[must_use]
#[inline]
pub fn unescape_json(s: &str) -> String {
  let mut out = String::with_capacity(s.len());
  let mut chars = s.chars();
  while let Some(c) = chars.next() {
    if c == '\\' {
      if let Some(next) = chars.next() {
        match next {
          '"' => out.push('"'),
          '\\' => out.push('\\'),
          '/' => out.push('/'),
          'b' => out.push('\x08'),
          'f' => out.push('\x0c'),
          'n' => out.push('\n'),
          'r' => out.push('\r'),
          't' => out.push('\t'),
          _ => {
            out.push('\\');
            out.push(next);
          }
        }
      }
    } else {
      out.push(c);
    }
  }
  out
}

#[must_use]
#[inline]
pub fn extract_json_field<'a>(json: &'a str, field: &str) -> Option<&'a str> {
  let mut search_key = String::with_capacity(field.len() + 4);
  search_key.push('"');
  search_key.push_str(field);
  search_key.push('"');

  let key_pos = json.find(&search_key)?;
  let after_key = json.get(key_pos + search_key.len()..)?;
  let colon_pos = after_key.find(':')?;
  let after_colon = after_key.get(colon_pos + 1..)?.trim_start();

  if let Some(stripped) = after_colon.strip_prefix('"') {
    let bytes = stripped.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
      if bytes.get(i) == Some(&b'\\') {
        i += 2;
        continue;
      }
      if bytes.get(i) == Some(&b'"') {
        return stripped.get(..i);
      }
      i += 1;
    }
  }
  None
}

#[must_use]
pub fn extract_json_string_array(json: &str, field: &str) -> Vec<String> {
  let mut search_key = String::with_capacity(field.len() + 4);
  search_key.push('"');
  search_key.push_str(field);
  search_key.push('"');

  let Some(key_pos) = json.find(&search_key) else {
    return Vec::new();
  };
  let Some(after_key) = json.get(key_pos + search_key.len()..) else {
    return Vec::new();
  };
  let Some(bracket_pos) = after_key.find('[') else {
    return Vec::new();
  };
  let Some(after_bracket) = after_key.get(bracket_pos + 1..) else {
    return Vec::new();
  };

  let mut items = Vec::new();
  let bytes = after_bracket.as_bytes();
  let len = bytes.len();
  let mut i = 0;

  while i < len {
    match bytes.get(i) {
      Some(&b']') => break,
      Some(&b'"') => {
        let start = i + 1;
        let mut j = start;
        let mut has_escape = false;
        while j < len {
          if bytes.get(j) == Some(&b'\\') {
            has_escape = true;
            j += 2;
            continue;
          }
          if bytes.get(j) == Some(&b'"') {
            break;
          }
          j += 1;
        }
        if j < len && bytes.get(j) == Some(&b'"') {
          if let Some(s) = after_bracket.get(start..j) {
            if has_escape {
              items.push(unescape_json(s));
            } else {
              items.push(s.to_string());
            }
          }
          i = j + 1;
          continue;
        }
      }
      _ => {}
    }
    i += 1;
  }

  items
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_extract_json_field() {
    let json = r#"{"name":"john","age":30,"file":"/src/app.tsx"}"#;
    assert_eq!(extract_json_field(json, "name"), Some("john"));
    assert_eq!(extract_json_field(json, "file"), Some("/src/app.tsx"));
    assert_eq!(extract_json_field(json, "missing"), None);
  }

  #[test]
  fn test_extract_json_string_array() {
    let json = r#"{"sources":["a.ts","b.tsx"],"names":["foo","bar"]}"#;
    assert_eq!(
      extract_json_string_array(json, "sources"),
      vec!["a.ts", "b.tsx"]
    );
    assert_eq!(extract_json_string_array(json, "names"), vec!["foo", "bar"]);
  }
}
