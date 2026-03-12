use std::fs;
use std::path::{Path, PathBuf};

/// File extensions recognized as Markdown.
pub const MARKDOWN_EXTENSIONS: &[&str] = &["md", "markdown", "mdown", "mkd", "mkdn", "mdwn"];

/// Check whether a file extension (case-insensitive) is a known Markdown type.
pub fn is_markdown_ext(ext: &str) -> bool {
    MARKDOWN_EXTENSIONS
        .iter()
        .any(|&e| e.eq_ignore_ascii_case(ext))
}

/// List Markdown files in `dir`, sorted case-insensitively.
pub fn list_markdown_files(dir: &Path) -> Result<Vec<String>, String> {
    let mut files: Vec<String> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let path = entry.path();
            if path.is_file() {
                let ext = path.extension()?.to_str()?;
                if is_markdown_ext(ext) {
                    return path.to_str().map(String::from);
                }
            }
            None
        })
        .collect();
    files.sort_by_cached_key(|f| f.to_lowercase());
    Ok(files)
}

/// Resolve a relative path against the parent directory of `base_file`.
///
/// Returns `None` if the base has no parent or if the resolved path does
/// not exist on disk.
pub fn resolve_relative(base_file: &Path, relative: &str) -> Option<PathBuf> {
    let dir = base_file.parent()?;
    let resolved = dir.join(relative);
    fs::canonicalize(&resolved).ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    // -- is_markdown_ext --

    #[test]
    fn common_extensions() {
        assert!(is_markdown_ext("md"));
        assert!(is_markdown_ext("markdown"));
        assert!(is_markdown_ext("mdown"));
        assert!(is_markdown_ext("mkd"));
        assert!(is_markdown_ext("mkdn"));
        assert!(is_markdown_ext("mdwn"));
    }

    #[test]
    fn case_insensitive() {
        assert!(is_markdown_ext("MD"));
        assert!(is_markdown_ext("Markdown"));
        assert!(is_markdown_ext("MDOWN"));
        assert!(is_markdown_ext("Md"));
    }

    #[test]
    fn non_markdown() {
        assert!(!is_markdown_ext("txt"));
        assert!(!is_markdown_ext("html"));
        assert!(!is_markdown_ext("json"));
        assert!(!is_markdown_ext("rs"));
        assert!(!is_markdown_ext(""));
    }

    #[test]
    fn extensions_constant_not_empty() {
        assert!(!MARKDOWN_EXTENSIONS.is_empty());
        assert!(MARKDOWN_EXTENSIONS.contains(&"md"));
    }

    // -- list_markdown_files --

    #[test]
    fn lists_only_markdown() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("readme.md"), "# Readme").unwrap();
        fs::write(dir.path().join("notes.markdown"), "notes").unwrap();
        fs::write(dir.path().join("data.json"), "{}").unwrap();
        fs::write(dir.path().join("script.rs"), "fn main(){}").unwrap();

        let files = list_markdown_files(dir.path()).unwrap();
        let names: Vec<&str> = files.iter().map(|f| f.rsplit('/').next().unwrap()).collect();

        assert_eq!(names.len(), 2);
        assert!(names.contains(&"readme.md"));
        assert!(names.contains(&"notes.markdown"));
        assert!(!names.contains(&"data.json"));
    }

    #[test]
    fn sorts_case_insensitively() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("Zebra.md"), "").unwrap();
        fs::write(dir.path().join("alpha.md"), "").unwrap();
        fs::write(dir.path().join("Beta.md"), "").unwrap();

        let files = list_markdown_files(dir.path()).unwrap();
        let names: Vec<&str> = files.iter().map(|f| f.rsplit('/').next().unwrap()).collect();
        assert_eq!(names, vec!["alpha.md", "Beta.md", "Zebra.md"]);
    }

    #[test]
    fn empty_directory() {
        let dir = TempDir::new().unwrap();
        let files = list_markdown_files(dir.path()).unwrap();
        assert!(files.is_empty());
    }

    #[test]
    fn nonexistent_directory() {
        let result = list_markdown_files(Path::new("/nonexistent/path"));
        assert!(result.is_err());
    }

    #[test]
    fn ignores_directories() {
        let dir = TempDir::new().unwrap();
        fs::create_dir(dir.path().join("subdir.md")).unwrap();
        fs::write(dir.path().join("real.md"), "# Real").unwrap();

        let files = list_markdown_files(dir.path()).unwrap();
        let names: Vec<&str> = files.iter().map(|f| f.rsplit('/').next().unwrap()).collect();
        assert_eq!(names, vec!["real.md"]);
    }

    #[test]
    fn all_extensions_recognized() {
        let dir = TempDir::new().unwrap();
        for ext in MARKDOWN_EXTENSIONS {
            fs::write(dir.path().join(format!("file.{}", ext)), "content").unwrap();
        }
        let files = list_markdown_files(dir.path()).unwrap();
        assert_eq!(files.len(), MARKDOWN_EXTENSIONS.len());
    }

    // -- resolve_relative --

    #[test]
    fn resolves_sibling_file() {
        let dir = TempDir::new().unwrap();
        let base = dir.path().join("doc.md");
        fs::write(&base, "").unwrap();
        let img = dir.path().join("image.png");
        fs::write(&img, "").unwrap();

        let resolved = resolve_relative(&base, "image.png");
        assert!(resolved.is_some());
        assert!(resolved.unwrap().ends_with("image.png"));
    }

    #[test]
    fn resolves_subdirectory() {
        let dir = TempDir::new().unwrap();
        let base = dir.path().join("doc.md");
        fs::write(&base, "").unwrap();
        let sub = dir.path().join("images");
        fs::create_dir(&sub).unwrap();
        let img = sub.join("pic.png");
        fs::write(&img, "").unwrap();

        let resolved = resolve_relative(&base, "images/pic.png");
        assert!(resolved.is_some());
        assert!(resolved.unwrap().ends_with("pic.png"));
    }

    #[test]
    fn returns_none_for_missing_file() {
        let dir = TempDir::new().unwrap();
        let base = dir.path().join("doc.md");
        fs::write(&base, "").unwrap();

        assert!(resolve_relative(&base, "missing.png").is_none());
    }

    #[test]
    fn resolves_parent_path() {
        let dir = TempDir::new().unwrap();
        let sub = dir.path().join("docs");
        fs::create_dir(&sub).unwrap();
        let base = sub.join("readme.md");
        fs::write(&base, "").unwrap();
        let img = dir.path().join("root.png");
        fs::write(&img, "").unwrap();

        let resolved = resolve_relative(&base, "../root.png");
        assert!(resolved.is_some());
    }
}
