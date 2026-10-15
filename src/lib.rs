#![deny(clippy::all)]
#![expect(
  clippy::needless_pass_by_value,
  reason = "NAPI-RS requires owned String parameters for JavaScript primitive strings"
)]
#![expect(
  clippy::too_many_arguments,
  reason = "NAPI interface signatures have 8-9 arguments"
)]

pub mod ansi;
pub mod browser;
pub mod diagnostic;
pub mod json_utils;
pub mod oxc_routes;
pub mod request;
pub mod route;
pub mod sanitize;
pub mod server_fn;
pub mod sourcemap;
pub mod stack_trace;

use napi_derive::napi;

#[napi]
#[must_use]
pub fn format_log_entry(
  original_url: String,
  method: String,
  status: u32,
  duration_ms: f64,
  content_length: Option<f64>,
  redirect_location: Option<String>,
  route_name: Option<String>,
  repeat_count: Option<u32>,
) -> Option<String> {
  request::format_log_entry(
    &original_url,
    &method,
    status,
    duration_ms,
    content_length,
    redirect_location.as_deref(),
    route_name.as_deref(),
    repeat_count,
  )
}

#[napi]
#[must_use]
pub fn format_route_log(
  route_id: String,
  path: String,
  params: Option<String>,
  duration_ms: Option<f64>,
  is_preload: Option<bool>,
) -> Option<String> {
  route::format_route_log(&route_id, &path, params.as_deref(), duration_ms, is_preload)
}

#[napi]
#[must_use]
pub fn format_server_fn_log(
  function_name: String,
  file_path: String,
  line_number: Option<u32>,
  status: u32,
  duration_ms: f64,
  args: Option<String>,
  result: Option<String>,
  is_tree_child: Option<bool>,
  repeat_count: Option<u32>,
) -> Option<String> {
  server_fn::format_server_fn_log(
    &function_name,
    &file_path,
    line_number,
    status,
    duration_ms,
    args.as_deref(),
    result.as_deref(),
    is_tree_child,
    repeat_count,
  )
}

#[napi]
#[must_use]
pub fn format_server_fn_payload(raw: String, max_len: Option<u32>) -> String {
  let limit = max_len.unwrap_or(60) as usize;
  server_fn::format_payload_preview(&raw, limit)
}

#[napi]
#[must_use]
pub fn format_browser_log(
  log_type: String,
  message: String,
  caller: Option<String>,
  repeat_count: Option<u32>,
) -> Option<String> {
  browser::format_browser_log(&log_type, &message, caller.as_deref(), repeat_count)
}

#[napi]
#[must_use]
pub fn format_graph_reevaluation(
  distinct_modules: u32,
  repeated_requests: u32,
  window_ms: f64,
) -> String {
  diagnostic::format_graph_reevaluation(distinct_modules, repeated_requests, window_ms)
}

#[napi]
#[must_use]
pub fn get_browser_logger_script() -> String {
  browser::get_browser_logger_script()
}

#[napi]
#[must_use]
pub fn get_server_fn_overlay_script() -> String {
  server_fn::get_server_fn_overlay_script()
}

#[napi]
#[must_use]
pub fn parse_route_tree_ast(content: String) -> Vec<String> {
  oxc_routes::parse_route_tree_ast(&content)
}

#[napi]
#[must_use]
pub fn remap_source_position(
  sourcemap_json: String,
  line: u32,
  column: u32,
) -> Option<sourcemap::RemappedPosition> {
  sourcemap::remap_source_position(&sourcemap_json, line, column)
}

#[napi]
#[must_use]
pub fn remap_stack_trace(sourcemap_json: String, stack: String) -> String {
  sourcemap::remap_stack_trace(&sourcemap_json, &stack)
}

#[napi(object)]
pub struct DecodedServerFn {
  pub function_name: String,
  pub file_path: String,
}

#[napi]
#[must_use]
pub fn decode_server_fn(url: String) -> Option<DecodedServerFn> {
  let (function_name, file_path) = server_fn::decode_server_fn(&url)?;
  Some(DecodedServerFn {
    function_name,
    file_path,
  })
}

#[napi]
#[must_use]
pub fn matches_exclusion(url: String, pattern: String) -> bool {
  request::matches_exclusion(&url, &pattern)
}

#[napi]
#[must_use]
pub fn is_module_request(url: String) -> bool {
  request::is_module_request(&url)
}

#[napi]
#[must_use]
pub fn should_exclude_request(url: String, exclusions: Vec<String>, exclude_modules: bool) -> bool {
  request::should_exclude_request(&url, &exclusions, exclude_modules)
}

#[napi]
#[must_use]
pub fn match_route_path(path: String, routes: Vec<String>) -> Option<String> {
  oxc_routes::match_route_path(&path, &routes)
}
