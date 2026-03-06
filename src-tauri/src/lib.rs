use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::Serialize;
use smd_core::files;
use smd_core::persistence::{self, PersistedState, MAX_RECENT_FILES};
use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;

// ---- App state ----

pub struct AppState {
    pub current_file: Mutex<Option<PathBuf>>,
    pub initial_folder: Option<PathBuf>,
    pub config_dir: PathBuf,
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
fn get_initial_folder(state: State<AppState>) -> Option<String> {
    state
        .initial_folder
        .as_ref()
        .and_then(|p| p.to_str().map(String::from))
}

#[tauri::command]
fn set_current_file(state: State<AppState>, path: String) {
    *state.current_file.lock().unwrap() = Some(PathBuf::from(path));
}

/// Open a native file picker with the given filter and return the selected path.
async fn pick_file(app: &tauri::AppHandle, label: &str, extensions: &[&str]) -> Option<String> {
    let (sender, receiver) = std::sync::mpsc::channel();
    app.dialog()
        .file()
        .add_filter(label, extensions)
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
async fn open_file_dialog(app: tauri::AppHandle) -> Option<String> {
    // Include "txt" alongside standard markdown extensions in the dialog
    let mut exts: Vec<&str> = files::MARKDOWN_EXTENSIONS.to_vec();
    exts.push("txt");
    pick_file(&app, "Markdown", &exts).await
}

#[tauri::command]
async fn open_theme_file_dialog(app: tauri::AppHandle) -> Option<String> {
    pick_file(&app, "Theme", &["json"]).await
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

    let mut persisted = persistence::load(&state.config_dir);
    persisted.width = Some(size.width as f64 / scale);
    persisted.height = Some(size.height as f64 / scale);
    persisted.zoom = Some(zoom);
    persistence::save(&state.config_dir, &persisted);
    Ok(())
}

#[tauri::command]
fn get_saved_zoom(state: State<'_, AppState>) -> Option<u32> {
    persistence::load(&state.config_dir).zoom
}

#[tauri::command]
fn get_recent_files(state: State<'_, AppState>) -> Vec<String> {
    persistence::load(&state.config_dir)
        .recent_files
        .unwrap_or_default()
}

#[tauri::command]
fn add_recent_file(state: State<'_, AppState>, path: String) {
    let resolved = fs::canonicalize(&path)
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or(path);

    let mut persisted = persistence::load(&state.config_dir);
    let mut recents = persisted.recent_files.unwrap_or_default();
    persistence::update_recent_list(&mut recents, resolved, MAX_RECENT_FILES);
    persisted.recent_files = Some(recents);
    persistence::save(&state.config_dir, &persisted);
}

#[tauri::command]
fn resolve_relative_path(base_file: String, relative: String) -> Option<String> {
    files::resolve_relative(&PathBuf::from(base_file), &relative)
        .and_then(|p| p.to_str().map(String::from))
}

#[tauri::command]
fn list_md_files(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let dir = state
        .current_file
        .lock()
        .unwrap()
        .as_ref()
        .and_then(|p| p.parent().map(PathBuf::from))
        .or_else(|| state.initial_folder.clone())
        .or_else(|| std::env::current_dir().ok())
        .ok_or_else(|| "Cannot determine directory".to_string())?;
    files::list_markdown_files(&dir)
}

// ---- Markdown rendering ----

#[derive(Serialize)]
struct RenderedMarkdown {
    html: String,
}

#[tauri::command]
fn render_markdown(text: String) -> RenderedMarkdown {
    RenderedMarkdown {
        html: smd_core::markdown::to_html(&text),
    }
}

// ---- Entry point ----

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let cli_arg: Option<PathBuf> = std::env::args()
        .nth(1)
        .map(PathBuf::from)
        .map(|p| fs::canonicalize(&p).unwrap_or(p));

    let (file_arg, folder_arg) = match cli_arg {
        Some(ref p) if p.is_dir() => (None, Some(p.clone())),
        other => (other, None),
    };

    let config_dir = persistence::get_config_dir();
    let saved = persistence::load(&config_dir);

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            current_file: Mutex::new(file_arg),
            initial_folder: folder_arg,
            config_dir,
        })
        .invoke_handler(tauri::generate_handler![
            read_file,
            get_initial_file,
            get_initial_folder,
            set_current_file,
            open_file_dialog,
            open_theme_file_dialog,
            save_window_state,
            get_saved_zoom,
            get_recent_files,
            add_recent_file,
            resolve_relative_path,
            list_md_files,
            render_markdown,
        ])
        .setup(move |app| {
            let window = app.get_webview_window("main").unwrap();
            window.set_title("smd").unwrap();

            if let (Some(w), Some(h)) = (saved.width, saved.height) {
                let _ = window.set_size(tauri::LogicalSize::new(w, h));
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running smd");
}
