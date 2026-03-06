use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// Application state persisted to disk as JSON.
#[derive(Serialize, Deserialize, Default, Debug, Clone, PartialEq)]
pub struct PersistedState {
    pub width: Option<f64>,
    pub height: Option<f64>,
    pub zoom: Option<u32>,
    pub recent_files: Option<Vec<String>>,
}

/// Maximum number of entries kept in the recent-files list.
pub const MAX_RECENT_FILES: usize = 10;

/// Return the platform-specific configuration directory for smd.
pub fn get_config_dir() -> PathBuf {
    if let Ok(dir) = std::env::var("XDG_CONFIG_HOME") {
        PathBuf::from(dir).join("smd")
    } else if let Ok(home) = std::env::var("HOME") {
        PathBuf::from(home).join(".config").join("smd")
    } else if let Ok(appdata) = std::env::var("APPDATA") {
        PathBuf::from(appdata).join("smd")
    } else {
        PathBuf::from(".smd")
    }
}

/// Path to the state JSON file inside the given config directory.
pub fn state_path(config_dir: &Path) -> PathBuf {
    config_dir.join("state.json")
}

/// Load persisted state from disk, returning defaults on any error.
pub fn load(config_dir: &Path) -> PersistedState {
    fs::read_to_string(state_path(config_dir))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// Save persisted state to disk, creating the config directory if needed.
pub fn save(config_dir: &Path, state: &PersistedState) {
    let _ = fs::create_dir_all(config_dir);
    if let Ok(json) = serde_json::to_string_pretty(state) {
        let _ = fs::write(state_path(config_dir), json);
    }
}

/// Insert `path` at the front of the recent-files list, removing any
/// duplicate and capping at `max` entries.
pub fn update_recent_list(recents: &mut Vec<String>, path: String, max: usize) {
    recents.retain(|p| p != &path);
    recents.insert(0, path);
    recents.truncate(max);
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    // -- state_path --

    #[test]
    fn state_path_appends_json() {
        let dir = PathBuf::from("/tmp/smd-test");
        assert_eq!(state_path(&dir), PathBuf::from("/tmp/smd-test/state.json"));
    }

    // -- save + load round-trip --

    #[test]
    fn save_and_load_round_trip() {
        let dir = TempDir::new().unwrap();
        let state = PersistedState {
            width: Some(1024.0),
            height: Some(768.0),
            zoom: Some(120),
            recent_files: Some(vec!["a.md".into(), "b.md".into()]),
        };
        save(dir.path(), &state);
        let loaded = load(dir.path());
        assert_eq!(loaded, state);
    }

    #[test]
    fn load_missing_file_returns_default() {
        let dir = TempDir::new().unwrap();
        assert_eq!(load(dir.path()), PersistedState::default());
    }

    #[test]
    fn load_corrupt_json_returns_default() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("state.json"), "not json!!!").unwrap();
        assert_eq!(load(dir.path()), PersistedState::default());
    }

    #[test]
    fn save_creates_nested_directory() {
        let dir = TempDir::new().unwrap();
        let nested = dir.path().join("nested").join("config");
        save(&nested, &PersistedState::default());
        assert!(nested.join("state.json").exists());
    }

    #[test]
    fn partial_fields() {
        let dir = TempDir::new().unwrap();
        let state = PersistedState {
            width: None,
            height: None,
            zoom: Some(80),
            recent_files: None,
        };
        save(dir.path(), &state);
        let loaded = load(dir.path());
        assert_eq!(loaded.zoom, Some(80));
        assert_eq!(loaded.width, None);
        assert_eq!(loaded.recent_files, None);
    }

    #[test]
    fn default_is_all_none() {
        let state = PersistedState::default();
        assert_eq!(state.width, None);
        assert_eq!(state.height, None);
        assert_eq!(state.zoom, None);
        assert_eq!(state.recent_files, None);
    }

    #[test]
    fn json_serde_roundtrip() {
        let state = PersistedState {
            width: Some(1200.0),
            height: Some(900.0),
            zoom: Some(150),
            recent_files: Some(vec!["/path/to/file.md".into()]),
        };
        let json = serde_json::to_string(&state).unwrap();
        let back: PersistedState = serde_json::from_str(&json).unwrap();
        assert_eq!(back, state);
    }

    #[test]
    fn json_ignores_extra_fields() {
        let json = r#"{"width":800,"height":600,"zoom":100,"recent_files":[],"unknown":true}"#;
        let state: PersistedState = serde_json::from_str(json).unwrap();
        assert_eq!(state.width, Some(800.0));
    }

    #[test]
    fn overwrite_existing_state() {
        let dir = TempDir::new().unwrap();
        let state1 = PersistedState { zoom: Some(100), ..Default::default() };
        save(dir.path(), &state1);
        let state2 = PersistedState { zoom: Some(150), ..Default::default() };
        save(dir.path(), &state2);
        assert_eq!(load(dir.path()).zoom, Some(150));
    }

    // -- update_recent_list --

    #[test]
    fn adds_to_front() {
        let mut recents = vec!["a.md".into(), "b.md".into()];
        update_recent_list(&mut recents, "c.md".into(), 10);
        assert_eq!(recents, vec!["c.md", "a.md", "b.md"]);
    }

    #[test]
    fn deduplicates() {
        let mut recents = vec!["a.md".into(), "b.md".into(), "c.md".into()];
        update_recent_list(&mut recents, "b.md".into(), 10);
        assert_eq!(recents, vec!["b.md", "a.md", "c.md"]);
    }

    #[test]
    fn truncates_at_max() {
        let mut recents: Vec<String> = (0..10).map(|i| format!("{}.md", i)).collect();
        update_recent_list(&mut recents, "new.md".into(), 10);
        assert_eq!(recents.len(), 10);
        assert_eq!(recents[0], "new.md");
        assert!(!recents.contains(&"9.md".to_string()));
    }

    #[test]
    fn empty_list() {
        let mut recents = vec![];
        update_recent_list(&mut recents, "first.md".into(), 10);
        assert_eq!(recents, vec!["first.md"]);
    }

    #[test]
    fn same_item_moves_to_front() {
        let mut recents = vec!["a.md".into(), "b.md".into(), "c.md".into()];
        update_recent_list(&mut recents, "c.md".into(), 10);
        assert_eq!(recents[0], "c.md");
        assert_eq!(recents.len(), 3);
    }

    #[test]
    fn custom_max() {
        let mut recents = vec!["a.md".into(), "b.md".into()];
        update_recent_list(&mut recents, "c.md".into(), 2);
        assert_eq!(recents, vec!["c.md", "a.md"]);
    }

    // -- get_config_dir --

    #[test]
    fn config_dir_ends_in_smd() {
        let dir = get_config_dir();
        assert!(dir.ends_with("smd"));
    }
}
