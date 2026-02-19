# smd

A simple, lightweight markdown viewer for the desktop.

Built with [Tauri v2](https://tauri.app) — uses the system WebView, so the binary is small (~13MB) and resource usage is minimal.

## Features

- **GitHub Flavored Markdown** — tables, task lists, strikethrough, fenced code blocks
- **Syntax highlighting** — automatic language detection for code blocks
- **15 built-in themes** — GitHub Light/Dark, Monokai, Dracula, Nord, Solarized, Tokyo Night, Gruvbox, and more
- **Custom themes** — create and save your own themes via the theme editor
- **Font presets** — choose from System, Inter, JetBrains Mono, Fira Code, Iosevka, or Source Code Pro
- **YAML frontmatter** — displays metadata (title, author, tags, etc.) as a styled card above the content
- **File browser drawer** — toggle a sidebar listing all .md files in the working directory (Ctrl+B)
- **Recent files** — quick access to the last 10 opened files from the toolbar
- **Zoom** — Ctrl+/-, Ctrl+scroll, or toolbar buttons; remembered across sessions
- **Remembers window size** — restores your last window dimensions on launch
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
| Ctrl+B | Toggle file browser drawer |
| Ctrl+T | Cycle through themes |
| Ctrl+= | Zoom in |
| Ctrl+- | Zoom out |
| Ctrl+0 | Reset zoom |
| Escape | Close open panels/drawer |

## Frontmatter

smd recognises YAML frontmatter delimited by `---`. Any fields are displayed as a styled card above the rendered markdown — useful for skills files, blog posts, notes, or any document with metadata.

```markdown
---
title: My Document
author: Jane Doe
date: 2026-02-16
tags: [markdown, notes]
---

# Hello world
```

Supported YAML features: scalars, quoted strings, inline and indented lists, folded (`>`) and literal (`|`) multi-line strings, booleans, and comments.

## Building from Source

### Prerequisites

You need [Rust](https://rustup.rs), [Node.js](https://nodejs.org), and the Tauri CLI on all platforms.

```sh
# Install Rust (all platforms)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install the Tauri CLI
cargo install tauri-cli

# Node.js — install from https://nodejs.org or via your package manager
```

### Linux

#### Debian / Ubuntu

```sh
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

#### Fedora / RHEL

```sh
sudo dnf install webkit2gtk4.1-devel gtk3-devel libappindicator-gtk3-devel librsvg2-devel
```

#### Arch Linux

```sh
sudo pacman -S webkit2gtk-4.1 gtk3 libappindicator-gtk3 librsvg
```

Then build:

```sh
npm install
cargo tauri build
```

Output:
- Binary: `src-tauri/target/release/smd`
- Packages: `src-tauri/target/release/bundle/` (.deb, .rpm, .AppImage)

The `.AppImage` is a portable single-file executable that runs on most Linux distributions without installation:

```sh
chmod +x smd_0.3.1_amd64.AppImage
./smd_0.3.1_amd64.AppImage
```

To integrate it with your desktop (application menu, file associations), use [AppImageLauncher](https://github.com/TheAssassin/AppImageLauncher) or move it to `~/.local/bin`.

### macOS

> **Note:** These instructions are provisional and have not been tested. Please open an issue if you run into problems.

No extra system dependencies — Tauri uses the built-in WebKit WebView.

```sh
npm install
cargo tauri build
```

Output:
- App bundle: `src-tauri/target/release/bundle/macos/smd.app`
- Disk image: `src-tauri/target/release/bundle/dmg/smd_0.3.1_aarch64.dmg`

### Windows

> **Note:** These instructions are provisional and have not been tested. Please open an issue if you run into problems.

Install the [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the "Desktop development with C++" workload. Tauri uses the built-in WebView2 (included in Windows 10/11).

```sh
npm install
cargo tauri build
```

Output:
- Executable: `src-tauri\target\release\smd.exe`
- Installer: `src-tauri\target\release\bundle\msi\smd_0.3.1_x64_en-US.msi`
- Setup: `src-tauri\target\release\bundle\nsis\smd_0.3.1_x64-setup.exe`

### Development mode

For a faster feedback loop during development (hot-reloading frontend, debug build):

```sh
npm install
cargo tauri dev
```
