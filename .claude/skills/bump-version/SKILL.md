---
name: bump-version
allowed-tools: Read, Write, Edit, Bash(git status:*), Bash(git diff:*), Bash(git show:*)
description: Increment the version of the software
argument-hint: [version-number-or-increment]
---

Increment the version of the software: `$ARGUMENTS`

## Instructions

Update the version number as per the argument.

The user may indicate frontend (FE) or backend (BE) or both (both) for you to increment.

- If the user does not specify, then increment both.

Unless the user asks for different FE and BE numbers, keep **one release version** across Rust/Tauri and npm (same semver everywhere).

Increments:

- If the user specifies a specific version number, then update the version number to that.
- If the user specifies an increment, then increment the version number by that amount if it is a number.
- Or it may be a string like "major" or "minor" or "patch" (for incrementing the 1st, 2nd, or 3rd digit accordingly).

### Backend (Rust / Tauri)

Update all of these to the same version:

- `src-tauri/Cargo.toml` — `package.version` (root `smd` package)
- `src-tauri/smd-core/Cargo.toml` — `package.version` (workspace member `smd-core`; must stay in sync with the app)
- `src-tauri/tauri.conf.json` — top-level `"version"` (bundler / app metadata)
- `src-tauri/Cargo.lock` — only the `[[package]]` entries for **`smd`** and **`smd-core`** (their `version = "..."` lines). Prefer refreshing the lockfile with `cargo check` or `cargo build` in `src-tauri` after editing the `Cargo.toml` files so Cargo updates those blocks; do not edit unrelated crates’ versions in the lockfile (many third-party crates share similar semver strings).

Runtime / UI display:

- The Tauri command `get_app_version` uses `env!("CARGO_PKG_VERSION")` in `src-tauri/src/lib.rs`. No separate Rust constant needs bumping if `Cargo.toml` is updated and the project is rebuilt.

### Frontend (npm)

This repo keeps npm metadata at the **repository root** (there is no `ui/package.json`):

- `package.json` — `"version"`
- `package-lock.json` — the root package `"version"` **and** `packages[""].version` (both must match `package.json`)

### Code constants

- If any hardcoded app version exists in JS/HTML/Rust (e.g. About text not using `get_app_version`), update those to match.
- Do **not** edit generated trees (e.g. `src-tauri/gen/`) for version bumps.

### Verification

- Use ripgrep (`rg`) for the **old** version string in the repo and confirm no stale app-owned occurrences remain (ignore matches inside `node_modules/` if present).
- Ignore unrelated semver hits (dependency versions in lockfiles, other crates named with similar versions).

Finally propose a commit message to the user. Examples:

- "Bump version to $VERSION"
- "Bump FE version to $VERSION"
- "Bump BE and FE version to $VERSION"
