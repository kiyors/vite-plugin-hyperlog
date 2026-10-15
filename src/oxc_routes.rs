use std::collections::BTreeSet;

#[inline]
fn is_valid_route(s: &str) -> bool {
  let trimmed = s.trim();
  trimmed.starts_with('/')
    && !trimmed.starts_with("/@")
    && !trimmed.starts_with("/api")
    && !trimmed.contains("node_modules")
    && !trimmed.contains('?')
}

#[must_use]
pub fn parse_route_tree_ast(source_text: &str) -> Vec<String> {
  let mut routes = BTreeSet::new();
  let bytes = source_text.as_bytes();
  let len = bytes.len();
  let mut i = 0;

  while i < len {
    if let Some(&quote) = bytes.get(i) {
      if (quote == b'\'' || quote == b'"') && bytes.get(i + 1) == Some(&b'/') {
        let start = i + 1;
        let mut j = start;
        let mut valid = true;
        while j < len {
          if let Some(&b) = bytes.get(j) {
            if b == quote {
              break;
            }
            if !(b.is_ascii_alphanumeric()
              || b == b'_'
              || b == b'$'
              || b == b'.'
              || b == b'/'
              || b == b'@'
              || b == b'-')
            {
              valid = false;
              break;
            }
          }
          j += 1;
        }
        if valid && j < len && bytes.get(j) == Some(&quote) {
          if let Some(candidate) = source_text.get(start..j) {
            if is_valid_route(candidate) {
              routes.insert(candidate);
            }
          }
          i = j + 1;
          continue;
        }
      }
    }
    i += 1;
  }

  let raw_routes: Vec<String> = routes.into_iter().map(String::from).collect();
  let mut filtered: Vec<String> = Vec::with_capacity(raw_routes.len());

  for route in &raw_routes {
    if route.starts_with("/$") && route.split('/').filter(|s| !s.is_empty()).count() == 1 {
      let is_child = raw_routes
        .iter()
        .any(|other| other != route && other.ends_with(route));
      if is_child {
        continue;
      }
    }
    filtered.push(route.clone());
  }

  filtered
}

#[must_use]
pub fn match_route_path(path: &str, routes: &[String]) -> Option<String> {
  let clean_path = match path.split_once('?') {
    Some((p, _)) => p,
    None => path,
  };
  let clean_path = clean_path.trim_end_matches('/');
  let path_segments: Vec<&str> = clean_path.split('/').filter(|s| !s.is_empty()).collect();

  let mut best_match: Option<(&String, usize)> = None;

  for pattern in routes {
    let clean_pattern = pattern.trim_end_matches('/');
    let pattern_segments: Vec<&str> = clean_pattern.split('/').filter(|s| !s.is_empty()).collect();

    if pattern_segments.len() != path_segments.len() {
      continue;
    }

    let mut matches = true;
    let mut static_segments: usize = 0;

    for (p_seg, u_seg) in pattern_segments.iter().zip(path_segments.iter()) {
      if p_seg.starts_with('$') {
        // Dynamic param matches any segment
      } else if p_seg == u_seg {
        static_segments = static_segments.saturating_add(1);
      } else {
        matches = false;
        break;
      }
    }

    if matches {
      match best_match {
        Some((_, best_static)) => {
          if static_segments > best_static {
            best_match = Some((pattern, static_segments));
          }
        }
        None => {
          best_match = Some((pattern, static_segments));
        }
      }
    }
  }

  // Handle root "/" match
  if best_match.is_none() && path_segments.is_empty() {
    for pattern in routes {
      if pattern == "/" || pattern.is_empty() {
        return Some("/".to_string());
      }
    }
  }

  best_match.map(|(pat, _)| (*pat).clone())
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_parse_route_tree_ast() {
    let code = r"
      import { Route as rootRoute } from './routes/__root'
      import { Route as LoginImport } from './routes/login/index'
      import { Route as TeamImport } from './routes/$teamId/index'

      const LoginRoute = LoginImport.update({
        id: '/login',
        path: '/login',
        getParentRoute: () => rootRoute,
      } as any)

      const TeamRoute = TeamImport.update({
        id: '/$teamId/channels/$channelId',
        path: '/$teamId/channels/$channelId',
        fullPath: '/$teamId/channels/$channelId',
        getParentRoute: () => rootRoute,
      })

      export const routeTree = rootRoute.addChildren([
        LoginRoute,
        TeamRoute,
      ])
    ";

    let routes = parse_route_tree_ast(code);
    assert!(routes.contains(&"/login".to_string()));
    assert!(routes.contains(&"/$teamId/channels/$channelId".to_string()));
  }

  #[test]
  fn test_parse_route_tree_call_expr() {
    let code = r"
      export const Route = createFileRoute('/$teamId/projects/$projectId')({
        component: ProjectComponent,
      })
    ";

    let routes = parse_route_tree_ast(code);
    assert!(routes.contains(&"/$teamId/projects/$projectId".to_string()));
  }

  #[test]
  fn test_parse_route_tree_interfaces() {
    let code = r"
      export interface FileRoutesByFullPath {
        '/': typeof IndexRoute
        '/login': typeof LoginRoute
        '/$teamId/channels/$channelId': typeof TeamRoute
      }

      export type FullPaths = '/' | '/dashboard' | '/settings';
    ";

    let routes = parse_route_tree_ast(code);
    assert!(routes.contains(&"/".to_string()));
    assert!(routes.contains(&"/login".to_string()));
    assert!(routes.contains(&"/$teamId/channels/$channelId".to_string()));
    assert!(routes.contains(&"/dashboard".to_string()));
    assert!(routes.contains(&"/settings".to_string()));
  }

  #[test]
  fn test_match_route_path() {
    let routes = vec![
      "/".to_string(),
      "/login".to_string(),
      "/$teamId/channels/$channelId".to_string(),
      "/$teamId/issues".to_string(),
    ];

    assert_eq!(match_route_path("/", &routes), Some("/".to_string()));
    assert_eq!(
      match_route_path("/login", &routes),
      Some("/login".to_string())
    );
    assert_eq!(
      match_route_path("/team-alpha/channels/general", &routes),
      Some("/$teamId/channels/$channelId".to_string())
    );
    assert_eq!(
      match_route_path("/team-alpha/issues", &routes),
      Some("/$teamId/issues".to_string())
    );
    assert_eq!(
      match_route_path("/unregistered/deep/path/that/does/not/match", &routes),
      None
    );
  }
}
