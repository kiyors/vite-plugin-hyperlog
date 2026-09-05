use std::collections::BTreeSet;

use oxc_allocator::Allocator;
use oxc_ast::ast::*;
use oxc_parser::Parser;
use oxc_span::SourceType;

#[inline]
fn is_valid_route(s: &str) -> bool {
  let trimmed = s.trim();
  trimmed.starts_with('/')
    && !trimmed.starts_with("/api")
    && !trimmed.contains("node_modules")
    && !trimmed.contains('?')
}

fn extract_from_expr<'a>(expr: &Expression<'a>, routes: &mut BTreeSet<String>) {
  match expr {
    Expression::ObjectExpression(obj) => {
      for prop_kind in &obj.properties {
        if let ObjectPropertyKind::ObjectProperty(prop) = prop_kind {
          let key_name = match &prop.key {
            PropertyKey::StaticIdentifier(ident) => Some(ident.name.as_str()),
            PropertyKey::StringLiteral(lit) => Some(lit.value.as_str()),
            _ => None,
          };

          if let Some(key) = key_name {
            if is_valid_route(key) {
              routes.insert(key.to_string());
            } else if key == "path"
              || key == "fullPath"
              || key == "id"
              || key == "to"
              || key == "href"
            {
              if let Expression::StringLiteral(val) = &prop.value {
                let s = val.value.as_str().trim();
                if is_valid_route(s) {
                  routes.insert(s.to_string());
                }
              }
            }
          }

          extract_from_expr(&prop.value, routes);
        }
      }
    }
    Expression::CallExpression(call) => {
      for arg in &call.arguments {
        match arg {
          Argument::StringLiteral(lit) => {
            let s = lit.value.as_str().trim();
            if is_valid_route(s) {
              routes.insert(s.to_string());
            }
          }
          _ => {
            if let Some(arg_expr) = arg.as_expression() {
              extract_from_expr(arg_expr, routes);
            }
          }
        }
      }
      extract_from_expr(&call.callee, routes);
    }
    Expression::StaticMemberExpression(s) => {
      extract_from_expr(&s.object, routes);
    }
    Expression::ComputedMemberExpression(c) => {
      extract_from_expr(&c.object, routes);
      extract_from_expr(&c.expression, routes);
    }
    Expression::PrivateFieldExpression(p) => {
      extract_from_expr(&p.object, routes);
    }
    Expression::ParenthesizedExpression(paren) => {
      extract_from_expr(&paren.expression, routes);
    }
    Expression::ArrayExpression(arr) => {
      for elem in &arr.elements {
        if let Some(elem_expr) = elem.as_expression() {
          extract_from_expr(elem_expr, routes);
        }
      }
    }
    Expression::TSAsExpression(as_expr) => {
      extract_from_expr(&as_expr.expression, routes);
    }
    Expression::TSTypeAssertion(assertion) => {
      extract_from_expr(&assertion.expression, routes);
    }
    Expression::TSNonNullExpression(non_null) => {
      extract_from_expr(&non_null.expression, routes);
    }
    _ => {}
  }
}

fn extract_from_ts_type<'a>(ts_type: &TSType<'a>, routes: &mut BTreeSet<String>) {
  match ts_type {
    TSType::TSLiteralType(lit) => {
      if let TSLiteral::StringLiteral(s) = &lit.literal {
        let val = s.value.as_str().trim();
        if is_valid_route(val) {
          routes.insert(val.to_string());
        }
      }
    }
    TSType::TSUnionType(union) => {
      for t in &union.types {
        extract_from_ts_type(t, routes);
      }
    }
    TSType::TSParenthesizedType(paren) => {
      extract_from_ts_type(&paren.type_annotation, routes);
    }
    _ => {}
  }
}

fn extract_from_declaration<'a>(decl: &Declaration<'a>, routes: &mut BTreeSet<String>) {
  match decl {
    Declaration::VariableDeclaration(v) => {
      for d in &v.declarations {
        if let Some(ref init) = d.init {
          extract_from_expr(init, routes);
        }
      }
    }
    Declaration::TSInterfaceDeclaration(iface) => {
      for sig in &iface.body.body {
        if let TSSignature::TSPropertySignature(prop) = sig {
          if let PropertyKey::StringLiteral(lit) = &prop.key {
            let s = lit.value.as_str().trim();
            if is_valid_route(s) {
              routes.insert(s.to_string());
            }
          }
        }
      }
    }
    Declaration::TSTypeAliasDeclaration(alias) => {
      extract_from_ts_type(&alias.type_annotation, routes);
    }
    _ => {}
  }
}

fn extract_from_statement<'a>(stmt: &Statement<'a>, routes: &mut BTreeSet<String>) {
  if let Some(decl) = stmt.as_declaration() {
    extract_from_declaration(decl, routes);
    return;
  }

  match stmt {
    Statement::ExportDeclaration(export_decl) => {
      extract_from_declaration(&export_decl.declaration, routes);
    }
    Statement::ExportDefaultDeclaration(export_default) => {
      if let Some(e) = export_default.declaration.as_expression() {
        extract_from_expr(e, routes);
      }
    }
    Statement::ExpressionStatement(expr_stmt) => {
      extract_from_expr(&expr_stmt.expression, routes);
    }
    _ => {}
  }
}

pub fn parse_route_tree_ast(source_text: &str) -> Vec<String> {
  let allocator = Allocator::default();
  let source_type = SourceType::ts();
  let parsed = Parser::new(&allocator, source_text, source_type).parse();

  let mut routes = BTreeSet::new();

  for stmt in &parsed.program.body {
    extract_from_statement(stmt, &mut routes);
  }

  routes.into_iter().collect()
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_parse_route_tree_ast() {
    let code = r#"
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
    "#;

    let routes = parse_route_tree_ast(code);
    assert!(routes.contains(&"/login".to_string()));
    assert!(routes.contains(&"/$teamId/channels/$channelId".to_string()));
  }

  #[test]
  fn test_parse_route_tree_call_expr() {
    let code = r#"
      export const Route = createFileRoute('/$teamId/projects/$projectId')({
        component: ProjectComponent,
      })
    "#;

    let routes = parse_route_tree_ast(code);
    assert!(routes.contains(&"/$teamId/projects/$projectId".to_string()));
  }

  #[test]
  fn test_parse_route_tree_interfaces() {
    let code = r#"
      export interface FileRoutesByFullPath {
        '/': typeof IndexRoute
        '/login': typeof LoginRoute
        '/$teamId/channels/$channelId': typeof TeamRoute
      }

      export type FullPaths = '/' | '/dashboard' | '/settings';
    "#;

    let routes = parse_route_tree_ast(code);
    assert!(routes.contains(&"/".to_string()));
    assert!(routes.contains(&"/login".to_string()));
    assert!(routes.contains(&"/$teamId/channels/$channelId".to_string()));
    assert!(routes.contains(&"/dashboard".to_string()));
    assert!(routes.contains(&"/settings".to_string()));
  }
}
