#![deny(clippy::all)]

pub mod ansi;
pub mod browser;
pub mod oxc_routes;
pub mod request;
pub mod route;
pub mod server_fn;
pub mod sourcemap;

use napi_derive::napi;

#[napi]
#[allow(clippy::too_many_arguments)]
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
    original_url,
    method,
    status,
    duration_ms,
    content_length,
    redirect_location,
    route_name,
    repeat_count,
  )
}

#[napi]
pub fn format_route_log(
  route_id: String,
  path: String,
  params: Option<String>,
  duration_ms: Option<f64>,
  is_preload: Option<bool>,
) -> Option<String> {
  route::format_route_log(route_id, path, params, duration_ms, is_preload)
}

#[napi]
pub fn format_browser_log(
  log_type: String,
  message: String,
  caller: Option<String>,
  repeat_count: Option<u32>,
) -> Option<String> {
  browser::format_browser_log(log_type, message, caller, repeat_count)
}

#[napi]
pub fn get_browser_logger_script() -> String {
  browser::get_browser_logger_script()
}

#[napi]
pub fn parse_route_tree_ast(content: String) -> Vec<String> {
  oxc_routes::parse_route_tree_ast(&content)
}

#[napi]
pub fn remap_source_position(
  sourcemap_json: String,
  line: u32,
  column: u32,
) -> Option<sourcemap::RemappedPosition> {
  sourcemap::remap_source_position(&sourcemap_json, line, column)
}

#[napi]
pub fn remap_stack_trace(sourcemap_json: String, stack: String) -> String {
  sourcemap::remap_stack_trace(&sourcemap_json, &stack)
}
