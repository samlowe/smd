# Project stack

- Rust (2021 edition) with Cargo workspaces
- Tauri 2.x (Rust backend + web frontend)
- Node.js/npm for frontend (in project root)
- Frontend: vanilla JS/CSS with highlight.js, mermaid
- smd-core workspace crate (core markdown logic)
- Clippy, rustfmt for linting/formatting

# Core Development Guidelines

- Keep changes focused to a few areas at a time
- Don't make sweeping changes unrelated to the task
- Run tests often, especially after completing work or adding tests
  - Rust tests: `cargo test -p smd-core` or `cargo test` for all
  - JS tests: `node --test ui/tests/*.test.js`
  - Full test suite: `npm test` (runs both)
- Make one change at a time for complex tasks, verify it works before proceeding
- If a new dependency/library is required, ask the user first (with rationale as to why something new vs using the current dependencies)
- Format and lint:
  - Rust: `cargo fmt` and `cargo clippy --fix` (or `cargo clippy` to check)
  - JS: formatting is currently manual; keep code clean

# Important Don'ts

- Don't delete any files/folders without asking the user first
- Don't remove existing comments or commented-out code unless explicitly asked
- Never run any git write/commit/update commands without asking first
- Never run destructive operations without asking first
- Do not add redundant/pointless inline comments; use meaningful-named variables and functions as self-documenting code

# Code Style and Approach

## Rust
- Use idiomatic Rust with proper error handling (Result types, `?` operator)
- Prefer `thiserror` or similar for custom error types when beneficial
- Document public functions with doc comments (`///`)
- Use the type system to prevent invalid states; avoid `unwrap()` in production code unless the context guarantees validity
- Keep functions focused; extract helper functions for reusable logic
- Use `clippy` suggestions when reasonable

## Tauri Specific
- Tauri commands (`#[tauri::command]`) should be async when they do I/O
- State management via `State<T>`; use mutex for mutable shared state
- Keep command handlers thin; delegate to domain logic in smd-core when possible
- When adding new commands, ensure they're registered in `invoke_handler!`

## Frontend (JS)
- Keep JS simple; this is a vanilla JS project (no build step for frontend)
- Use `async/await` for Tauri invoke calls
- Keep functions small and focused

# Project Structure

```
src-tauri/          # Rust/Tauri backend
├── src/             # Main app (commands, state, entry point)
├── smd-core/        # Core markdown processing (separate crate)
│   └── src/
│       ├── lib.rs
│       ├── markdown.rs
│       ├── files.rs
│       └── persistence.rs
├── Cargo.toml       # Workspace root
└── tauri.conf.json  # Tauri configuration

ui/                  # Frontend
├── index.html       # Main HTML
├── app.js           # Main app logic
├── styles.css       # Styling
├── themes.js        # Theme management
├── utils.js         # Utilities
└── tests/           # Node.js tests
```

# Communication

- If you notice a problem or see a better way, discuss with user before proceeding
- If a test is failing and it might be a bug in the app code, ask user before proceeding. But if a test/mock just needs updating to align with a code change, go ahead and update it
- If getting stuck in a rabbit hole, stop, review, and give options to user