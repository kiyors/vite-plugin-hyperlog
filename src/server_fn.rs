#[must_use]
pub fn decode_base64_url(input: &str) -> Option<Vec<u8>> {
  let bytes = input.as_bytes();
  let mut buf = Vec::with_capacity(bytes.len() * 3 / 4);
  let mut accumulator: u32 = 0;
  let mut bits: u32 = 0;

  for &b in bytes {
    let val: u32 = match b {
      b'A'..=b'Z' => u32::from(b - b'A'),
      b'a'..=b'z' => u32::from(b - b'a') + 26,
      b'0'..=b'9' => u32::from(b - b'0') + 52,
      b'-' | b'+' => 62,
      b'_' | b'/' => 63,
      b'=' | b' ' | b'\r' | b'\n' => continue,
      _ => return None,
    };
    accumulator = (accumulator << 6) | val;
    bits += 6;
    if bits >= 8 {
      bits -= 8;
      if let Ok(byte) = u8::try_from((accumulator >> bits) & 0xFF) {
        buf.push(byte);
      }
    }
  }
  Some(buf)
}

use crate::json_utils::extract_json_field;

#[must_use]
pub fn decode_server_fn(path: &str) -> Option<(String, String)> {
  let b64 = path.strip_prefix("/_serverFn/")?;
  let b64_token = b64.split('/').next()?;
  // Prevent unbounded memory allocation from malicious/huge URLs
  if b64_token.is_empty() || b64_token.len() > 4096 {
    return None;
  }

  let decoded = decode_base64_url(b64_token)?;
  let decoded_str = std::str::from_utf8(&decoded).ok()?;

  let export_name = extract_json_field(decoded_str, "export")?;
  let file_path = extract_json_field(decoded_str, "file")?;

  let clean_export = export_name
    .strip_suffix("_createServerFn_handler")
    .unwrap_or(export_name)
    .to_string();

  let clean_file = match file_path.split_once('?') {
    Some((f, _)) => f,
    None => file_path,
  };
  let short_file = clean_file
    .strip_prefix("/src/")
    .unwrap_or(clean_file)
    .to_string();

  Some((clean_export, short_file))
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_decode_server_fn_valid_url_safe() {
    let path = "/_serverFn/eyJmaWxlIjoiL3NyYy9yb3V0ZXMvX19yb290LnRzeD90c3Mtc2VydmVyZm4tc3BsaXQiLCJleHBvcnQiOiJnZXRBdXRoU2Vzc2lvbl9jcmVhdGVTZXJ2ZXJGbl9oYW5kbGVyIn0";
    let (export_name, file_path) = decode_server_fn(path).expect("failed to decode");
    assert_eq!(export_name, "getAuthSession");
    assert_eq!(file_path, "routes/__root.tsx");
  }

  #[test]
  fn test_decode_server_fn_invalid_path() {
    assert!(decode_server_fn("/not_server_fn").is_none());
    assert!(decode_server_fn("/_serverFn/").is_none());
  }

  #[test]
  fn test_decode_server_fn_oversized() {
    let huge_token = format!("/_serverFn/{}", "a".repeat(5000));
    assert!(decode_server_fn(&huge_token).is_none());
  }
}
