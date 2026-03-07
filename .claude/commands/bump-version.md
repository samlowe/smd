---
allowed-tools: Read, Write, Edit, Bash(git status:*), Bash(git diff:*), Bash(git show:*)
description: Increment the version of the software
argument-hint: [version-number-or-increment]
---

Increment the version of the software: `$ARGUMENTS`

## Instructions

Update the version number as per the argument.

The user may indicate frontend (FE) or backend (BE) or both (both) for you to increment.

- If the user does not specify, then increment both.

Increments:

- If the user specifies a specific version number, then update the version number to that.
- If the user specifies an increment, then increment the version number by that amount if it is a number.
- Or it may be a string like "major" or "minor" or "patch" (for incrementing the 1st, 2nd, or 3rd digit accordingly).

Places to update the version number:

- For changing the version of the backend (Rust/Tauri), change:
  - `src-tauri/Cargo.toml` (package.version)
  - `src-tauri/tauri.conf.json` (version)
  - any constants defined in the code (e.g. in Rust or in the frontend that display app version)

- For changing the version of the frontend, change:
  - `ui/package.json` (version)
  - any constants defined in the code (e.g. in constants.ts, config.ts or similar)

- Use ripgrep (rg) to search for the old version number in the codebase to check you have found all places to update.

Finally propose a commit message to the user. Examples:

- "Bump version to $VERSION"
- "Bump FE version to $VERSION"
- "Bump BE and FE version to $VERSION"
