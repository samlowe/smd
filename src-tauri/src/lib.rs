use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;

pub struct AppState {
    pub current_file: Mutex<Option<PathBuf>>,
}

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
fn open_file_dialog(app: tauri::AppHandle) -> Option<String> {
    let file = app
        .dialog()
        .file()
        .add_filter(
            "Markdown",
            &["md", "markdown", "mdown", "mkd", "mkdn", "mdwn", "txt"],
        )
        .blocking_pick_file();

    file.and_then(|f| f.into_path().ok())
        .and_then(|p| p.to_str().map(String::from))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let file_arg: Option<PathBuf> = std::env::args().nth(1).map(PathBuf::from);

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            current_file: Mutex::new(file_arg),
        })
        .invoke_handler(tauri::generate_handler![
            read_file,
            get_initial_file,
            set_current_file,
            open_file_dialog,
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.set_title("smd").unwrap();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running smd");
}
