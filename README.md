# smd

A simple, lightweight markdown viewer for the desktop.

Built with [Tauri v2](https://tauri.app) — uses the system WebView, so the binary is small (~13MB) and resource usage is minimal.

## Features

- **GitHub Flavored Markdown** — tables, task lists, strikethrough, fenced code blocks
- **Syntax highlighting** — automatic language detection for code blocks
- **Light & dark themes** — follows system preference, toggle with Ctrl+T, remembers your choice
- **Zoom** — Ctrl+/-, Ctrl+scroll, or toolbar buttons
- **File opening** — CLI argument, Ctrl+O dialog, or drag & drop

## Usage

```sh
# Open a file directly
smd README.md

# Or launch and use Ctrl+O / drag & drop
smd
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+O | Open file |
| Ctrl+T | Toggle light/dark theme |
| Ctrl+= | Zoom in |
| Ctrl+- | Zoom out |
| Ctrl+0 | Reset zoom |

## Building

Requires [Rust](https://rustup.rs), [Node.js](https://nodejs.org), and system dependencies for Tauri on Linux:

```sh
# Linux dependencies (Debian/Ubuntu)
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev

# Build
npm install
cargo tauri build
```

The binary will be at `src-tauri/target/release/smd`. Packages (.deb, .rpm, .AppImage) are in `src-tauri/target/release/bundle/`.

## License

MIT
