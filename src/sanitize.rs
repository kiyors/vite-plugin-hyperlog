use std::borrow::Cow;

/// Strips terminal control characters from untrusted text before it reaches a
/// log formatter.
///
/// Anything a dev server prints can be influenced by the page being served, so
/// an unescaped ESC lets a page clear the screen, move the cursor, or forge log
/// lines that look like they came from the plugin. We drop C0 controls except
/// tab and newline, drop the C1 range (some terminals honour C1 CSI/OSC), and
/// replace each dropped byte with a space so words do not run together.
///
/// Returns `Cow::Borrowed` on the common clean path, so formatting an ordinary
/// log line allocates nothing extra.
#[must_use]
pub fn sanitize(input: &str) -> Cow<'_, str> {
  if !needs_sanitizing(input) {
    return Cow::Borrowed(input);
  }

  let mut out = String::with_capacity(input.len());
  for ch in input.chars() {
    if is_forbidden(ch) {
      out.push(' ');
    } else {
      out.push(ch);
    }
  }
  Cow::Owned(out)
}

fn needs_sanitizing(input: &str) -> bool {
  input.chars().any(is_forbidden)
}

fn is_forbidden(ch: char) -> bool {
  // Tab and newline are legitimate log structure, so keep them.
  if matches!(ch, '\t' | '\n') {
    return false;
  }
  // C0 controls (including ESC 0x1B and CR 0x0D), DEL, and the C1 range.
  // Some terminals honour C1 directly: 0x9B is CSI and 0x9D is OSC.
  matches!(ch, '\u{0}'..='\u{08}' | '\u{0B}'..='\u{1F}' | '\u{7F}'..='\u{9F}')
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_keeps_clean_text_as_borrowed() {
    let input = "hello world";
    assert!(matches!(sanitize(input), Cow::Borrowed(_)));
  }

  #[test]
  fn test_keeps_tab_and_newline() {
    let input = "a\tb\nc";
    assert!(matches!(sanitize(input), Cow::Borrowed(_)));
  }

  #[test]
  fn test_strips_escape_sequences() {
    // Dropping the ESC byte is what makes the sequence inert. The remaining
    // "[2J" prints as literal text, which is intentional: swallowing the whole
    // CSI sequence would require a real ANSI parser and could mangle legitimate
    // log text that happens to contain bracket-digit runs.
    let out = sanitize("\x1b[2J\x1b[HFAKE [browser error]");
    assert!(!out.contains('\x1b'), "ESC byte must not survive");
    assert!(out.contains("FAKE [browser error]"));
  }

  #[test]
  fn test_strips_carriage_return_forgery() {
    // Without stripping CR this renders as two lines in a real terminal.
    let out = sanitize("legit message\r[error] fabricated");
    assert!(!out.contains('\r'));
    assert!(!out.contains('\n'));
  }

  #[test]
  fn test_strips_c1_osc_sequence() {
    // OSC 52 can write to the clipboard on terminals that accept C1.
    let out = sanitize("\u{9d}52;c;BASE64\u{9c}");
    assert!(!out.contains('\u{9d}'));
    assert!(!out.contains('\u{9c}'));
  }

  #[test]
  fn test_strips_del_and_nul() {
    let out = sanitize("a\u{0}b\u{7f}c");
    assert!(!out.contains('\u{0}'));
    assert!(!out.contains('\u{7f}'));
  }

  #[test]
  fn test_replaces_with_space_not_removal() {
    let out = sanitize("a\x07b");
    assert_eq!(out, "a b");
  }

  #[test]
  fn test_preserves_multibyte_utf8() {
    let out = sanitize("caf\u{e9} \u{65e5}\u{672c}\u{8a9e}");
    assert_eq!(out, "caf\u{e9} \u{65e5}\u{672c}\u{8a9e}");
  }

  #[test]
  fn test_does_not_split_multibyte_chars() {
    // A byte-oriented implementation would panic or corrupt here.
    let out = sanitize("\u{65e5}\x1b[0m\u{672c}");
    assert!(out.contains('\u{65e5}'));
    assert!(out.contains('\u{672c}'));
  }
}
