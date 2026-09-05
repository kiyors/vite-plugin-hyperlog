#![deny(clippy::all)]
#![expect(
  clippy::needless_pass_by_value,
  reason = "NAPI-RS requires owned String parameters for JavaScript primitive strings"
)]
#![expect(
  clippy::too_many_arguments,
  reason = "NAPI interface matches JS formatLogEntry signature with 8 arguments"
)]

pub mod ansi;
pub mod browser;
pub mod json_utils;
pub mod oxc_routes;
pub mod request;
pub mod route;
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
pub fn get_browser_logger_script() -> String {
  browser::get_browser_logger_script()
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
