use pulldown_cmark::{html, Event, Options, Parser, Tag, TagEnd};

/// Convert a Markdown string to HTML.
///
/// Enables tables, strikethrough, task-lists, and footnotes.
/// Headings receive slugified `id` attributes so that anchor links work.
pub fn to_html(md: &str) -> String {
    let mut opts = Options::empty();
    opts.insert(Options::ENABLE_TABLES);
    opts.insert(Options::ENABLE_STRIKETHROUGH);
    opts.insert(Options::ENABLE_TASKLISTS);
    opts.insert(Options::ENABLE_FOOTNOTES);

    let parser = Parser::new_ext(md, opts);

    // Collect events, injecting id attributes on headings.
    // Track the position of the current heading start to avoid an O(n) reverse scan.
    let mut heading_text = String::new();
    let mut heading_start: Option<usize> = None;
    let mut events: Vec<Event> = Vec::new();

    for event in parser {
        match &event {
            Event::Start(Tag::Heading { .. }) => {
                heading_text.clear();
                heading_start = Some(events.len());
                events.push(event);
            }
            Event::End(TagEnd::Heading(level)) => {
                let lvl = *level as u8;
                if let Some(pos) = heading_start.take() {
                    let slug = slugify(&heading_text);
                    events[pos] =
                        Event::Html(format!("<h{lvl} id=\"{slug}\">").into());
                }
                events.push(Event::Html(format!("</h{lvl}>\n").into()));
            }
            Event::Text(t) if heading_start.is_some() => {
                heading_text.push_str(t);
                events.push(event);
            }
            _ => {
                events.push(event);
            }
        }
    }

    let mut html_output = String::with_capacity(md.len() * 2);
    html::push_html(&mut html_output, events.into_iter());
    html_output
}

/// Turn heading text into a URL-friendly slug matching GitHub conventions.
fn slugify(text: &str) -> String {
    let mut slug = String::with_capacity(text.len());
    for c in text.chars() {
        if c.is_alphanumeric() {
            for lc in c.to_lowercase() {
                slug.push(lc);
            }
        } else if c == ' ' || c == '-' {
            slug.push('-');
        }
    }
    let trimmed = slug.trim_matches('-');
    if trimmed.len() == slug.len() {
        slug
    } else {
        trimmed.to_string()
    }
}

/// Result of splitting YAML frontmatter from markdown body.
pub struct Frontmatter<'a> {
    pub body: &'a str,
}

/// Strip a leading `---\n...\n---` frontmatter block, returning the body.
pub fn parse_frontmatter(text: &str) -> Frontmatter<'_> {
    if !text.starts_with("---") {
        return Frontmatter { body: text };
    }
    // Find end of first line (the opening ---)
    let after_open = match text[3..].find('\n') {
        Some(i) => 3 + i + 1,
        None => return Frontmatter { body: text },
    };
    // Check that the opening line is just `---` with optional trailing whitespace
    if !text[3..after_open].trim().is_empty() {
        return Frontmatter { body: text };
    }
    // Find the closing ---
    if let Some(pos) = text[after_open..].find("\n---") {
        let end = after_open + pos;
        // Skip past the closing --- line
        let rest = &text[end + 4..];
        let body = rest.strip_prefix('\n').unwrap_or(rest);
        Frontmatter { body }
    } else {
        Frontmatter { body: text }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basic_paragraph() {
        let html = to_html("Hello world");
        assert_eq!(html.trim(), "<p>Hello world</p>");
    }

    #[test]
    fn heading() {
        let html = to_html("# Title");
        assert!(html.contains("<h1 id=\"title\">Title</h1>"));
    }

    #[test]
    fn heading_levels() {
        for level in 1..=6 {
            let md = format!("{} H{}", "#".repeat(level), level);
            let html = to_html(&md);
            assert!(
                html.contains(&format!("<h{} id=\"h{}\">H{}</h{}>", level, level, level, level)),
                "Level {} heading failed",
                level,
            );
        }
    }

    #[test]
    fn heading_slug() {
        let html = to_html("## Hello World!");
        assert!(html.contains(r#"<h2 id="hello-world">Hello World!</h2>"#));
    }

    #[test]
    fn bold_italic() {
        let html = to_html("**bold** and *italic*");
        assert!(html.contains("<strong>bold</strong>"));
        assert!(html.contains("<em>italic</em>"));
    }

    #[test]
    fn link() {
        let html = to_html("[link](https://example.com)");
        assert!(html.contains(r#"<a href="https://example.com">link</a>"#));
    }

    #[test]
    fn code_block_with_language() {
        let html = to_html("```rust\nfn main() {}\n```");
        assert!(html.contains("<code class=\"language-rust\">"));
        assert!(html.contains("fn main()"));
    }

    #[test]
    fn code_block_no_language() {
        let html = to_html("```\nplain code\n```");
        assert!(html.contains("<code>"));
        assert!(html.contains("plain code"));
    }

    #[test]
    fn inline_code() {
        let html = to_html("Use `code` here");
        assert!(html.contains("<code>code</code>"));
    }

    #[test]
    fn table() {
        let md = "| A | B |\n|---|---|\n| 1 | 2 |";
        let html = to_html(md);
        assert!(html.contains("<table>"));
        assert!(html.contains("<th>A</th>"));
        assert!(html.contains("<td>1</td>"));
    }

    #[test]
    fn strikethrough() {
        let html = to_html("~~deleted~~");
        assert!(html.contains("<del>deleted</del>"));
    }

    #[test]
    fn task_list() {
        let md = "- [x] done\n- [ ] todo";
        let html = to_html(md);
        assert!(html.contains("type=\"checkbox\""));
        assert!(html.contains("checked"));
    }

    #[test]
    fn blockquote() {
        let html = to_html("> quote");
        assert!(html.contains("<blockquote>"));
        assert!(html.contains("quote"));
    }

    #[test]
    fn unordered_list() {
        let html = to_html("- item 1\n- item 2");
        assert!(html.contains("<ul>"));
        assert!(html.contains("<li>item 1</li>"));
    }

    #[test]
    fn ordered_list() {
        let html = to_html("1. first\n2. second");
        assert!(html.contains("<ol>"));
        assert!(html.contains("<li>first</li>"));
    }

    #[test]
    fn image() {
        let html = to_html("![alt](image.png)");
        assert!(html.contains(r#"<img src="image.png" alt="alt""#));
    }

    #[test]
    fn horizontal_rule() {
        let html = to_html("---");
        assert!(html.contains("<hr"));
    }

    #[test]
    fn empty_input() {
        let html = to_html("");
        assert_eq!(html, "");
    }

    #[test]
    fn raw_html_passed_through() {
        // pulldown-cmark passes raw HTML through by design (CommonMark spec).
        // Tauri CSP handles XSS prevention for the desktop app.
        let html = to_html("Use <script> & \"quotes\"");
        assert!(html.contains("<script>"));
    }

    #[test]
    fn ampersand_in_text() {
        let html = to_html("A & B");
        assert!(html.contains("A &amp; B"));
    }

    #[test]
    fn footnote() {
        let md = "Text[^1]\n\n[^1]: Footnote content";
        let html = to_html(md);
        assert!(html.contains("Footnote content"));
    }

    #[test]
    fn nested_list() {
        let md = "- outer\n  - inner";
        let html = to_html(md);
        assert!(html.contains("<ul>"));
        assert!(html.contains("inner"));
    }

    #[test]
    fn multiline_paragraph() {
        let md = "Line 1\nLine 2";
        let html = to_html(md);
        assert!(html.contains("Line 1"));
        assert!(html.contains("Line 2"));
    }

    #[test]
    fn multiple_paragraphs() {
        let md = "Para 1\n\nPara 2";
        let html = to_html(md);
        assert!(html.contains("<p>Para 1</p>"));
        assert!(html.contains("<p>Para 2</p>"));
    }
}
