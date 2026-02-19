use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;

// ---- Persisted state ----

#[derive(Serialize, Deserialize, Default)]
struct PersistedState {
    width: Option<f64>,
    height: Option<f64>,
    zoom: Option<u32>,
    recent_files: Option<Vec<String>>,
}

// ---- App state ----

pub struct AppState {
    pub current_file: Mutex<Option<PathBuf>>,
    pub config_dir: PathBuf,
}

// ---- Config helpers ----

fn get_config_dir() -> PathBuf {
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

fn state_path(config_dir: &PathBuf) -> PathBuf {
    config_dir.join("state.json")
}

fn load_persisted(config_dir: &PathBuf) -> PersistedState {
    fs::read_to_string(state_path(config_dir))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_persisted(config_dir: &PathBuf, state: &PersistedState) {
    let _ = fs::create_dir_all(config_dir);
    if let Ok(json) = serde_json::to_string_pretty(state) {
        let _ = fs::write(state_path(config_dir), json);
    }
}

// ---- Commands ----

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", path, e))
}

#[tauri::command]
fn get_initial_file(state: State<AppState>) -> Option<String> {
    state
        .current_file
        .lock()
        .unwrap()
        .as_ref()
        .and_then(|p| p.to_str().map(String::from))
}

#[tauri::command]
fn set_current_file(state: State<AppState>, path: String) {
    *state.current_file.lock().unwrap() = Some(PathBuf::from(path));
}

#[tauri::command]
async fn open_file_dialog(app: tauri::AppHandle) -> Option<String> {
    let (sender, receiver) = std::sync::mpsc::channel();
    app.dialog()
        .file()
        .add_filter(
            "Markdown",
            &["md", "markdown", "mdown", "mkd", "mkdn", "mdwn", "txt"],
        )
        .pick_file(move |file_response| {
            let _ = sender.send(file_response);
        });

    tauri::async_runtime::spawn_blocking(move || receiver.recv().ok().flatten())
        .await
        .ok()
        .flatten()
        .and_then(|f| f.into_path().ok())
        .and_then(|p| p.to_str().map(String::from))
}

#[tauri::command]
async fn open_theme_file_dialog(app: tauri::AppHandle) -> Option<String> {
    let (sender, receiver) = std::sync::mpsc::channel();
    app.dialog()
        .file()
        .add_filter("Theme", &["json"])
        .pick_file(move |file_response| {
            let _ = sender.send(file_response);
        });

    tauri::async_runtime::spawn_blocking(move || receiver.recv().ok().flatten())
        .await
        .ok()
        .flatten()
        .and_then(|f| f.into_path().ok())
        .and_then(|p| p.to_str().map(String::from))
}

#[tauri::command]
fn save_window_state(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    zoom: u32,
) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("No main window")?;
    let size = window.outer_size().map_err(|e| e.to_string())?;
    let scale = window.scale_factor().map_err(|e| e.to_string())?;

    // Load existing state to preserve recent_files
    let mut persisted = load_persisted(&state.config_dir);
    persisted.width = Some(size.width as f64 / scale);
    persisted.height = Some(size.height as f64 / scale);
    persisted.zoom = Some(zoom);
    save_persisted(&state.config_dir, &persisted);
    Ok(())
}

#[tauri::command]
fn get_saved_zoom(state: State<'_, AppState>) -> Option<u32> {
    load_persisted(&state.config_dir).zoom
}

#[tauri::command]
fn get_recent_files(state: State<'_, AppState>) -> Vec<String> {
    load_persisted(&state.config_dir)
        .recent_files
        .unwrap_or_default()
}

#[tauri::command]
fn add_recent_file(state: State<'_, AppState>, path: String) {
    // Always store the fully resolved path so recents work from any cwd
    let resolved = fs::canonicalize(&path)
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or(path);

    let mut persisted = load_persisted(&state.config_dir);
    let mut recents = persisted.recent_files.unwrap_or_default();

    // Remove if already present, then push to front
    recents.retain(|p| p != &resolved);
    recents.insert(0, resolved);
    recents.truncate(10);

    persisted.recent_files = Some(recents);
    save_persisted(&state.config_dir, &persisted);
}

#[tauri::command]
fn list_md_files() -> Result<Vec<String>, String> {
    let dir = std::env::current_dir().map_err(|e| e.to_string())?;
    let mut files: Vec<String> = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let path = entry.path();
            if path.is_file() {
                let ext = path.extension()?.to_str()?;
                if ext.eq_ignore_ascii_case("md") || ext.eq_ignore_ascii_case("markdown") {
                    return path.to_str().map(String::from);
                }
            }
            None
        })
        .collect();
    files.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    Ok(files)
}

// ---- Entry point ----

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let file_arg: Option<PathBuf> = std::env::args()
        .nth(1)
        .map(PathBuf::from)
        .map(|p| fs::canonicalize(&p).unwrap_or(p));
    let config_dir = get_config_dir();
    let saved = load_persisted(&config_dir);

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            current_file: Mutex::new(file_arg),
            config_dir,
        })
        .invoke_handler(tauri::generate_handler![
            read_file,
            get_initial_file,
            set_current_file,
            open_file_dialog,
            open_theme_file_dialog,
            save_window_state,
            get_saved_zoom,
            get_recent_files,
            add_recent_file,
            list_md_files,
        ])
        .setup(move |app| {
            let window = app.get_webview_window("main").unwrap();
            window.set_title("smd").unwrap();

            // Restore saved window size
            if let (Some(w), Some(h)) = (saved.width, saved.height) {
                let _ = window.set_size(tauri::LogicalSize::new(w, h));
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running smd");
}
