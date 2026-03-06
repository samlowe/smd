//! smd-core — Pure logic for the Simple Markdown Viewer.
//!
//! This crate contains all platform-independent logic (markdown rendering,
//! state persistence, file-type detection, recent-files management) so that
//! it can be tested without Tauri / GTK system dependencies.

pub mod markdown;
pub mod persistence;
pub mod files;
