use base64::prelude::*;

pub fn decode_server_fn(path: &str) -> Option<(String, String)> {
  let b64 = path.strip_prefix("/_serverFn/")?;
  let b64_token = b64.split('/').next()?;
  if b64_token.is_empty() {
    return None;
  }

  let decoded = BASE64_URL_SAFE_NO_PAD
    .decode(b64_token)
    .or_else(|_| BASE64_URL_SAFE.decode(b64_token))
    .or_else(|_| BASE64_STANDARD_NO_PAD.decode(b64_token))
    .or_else(|_| BASE64_STANDARD.decode(b64_token))
    .ok()?;

  let json: serde_json::Value = serde_json::from_slice(&decoded).ok()?;
  let export_name = json.get("export")?.as_str()?;
  let file_path = json.get("file")?.as_str()?;

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
}
