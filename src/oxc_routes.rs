use std::collections::BTreeSet;

#[inline]
fn is_valid_route(s: &str) -> bool {
  let trimmed = s.trim();
  trimmed.starts_with('/')
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

  routes.into_iter().map(String::from).collect()
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
}
