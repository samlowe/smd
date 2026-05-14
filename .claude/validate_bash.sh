#!/bin/bash
# Validate Bash commands before execution

# Print one ls operand per line; use '.' when listing the current directory.
_collect_ls_operands_from_args() {
    local args="$1"
    local -a toks
    read -ra toks <<< "$args"
    local endopts=false
    local seen_op=false
    local -a ops=()
    local tok

    for tok in "${toks[@]}"; do
        if $endopts; then
            ops+=("$tok")
            continue
        fi
        if [[ "$tok" == "--" ]]; then
            endopts=true
            continue
        fi
        if ! $seen_op; then
            if [[ "$tok" == -* ]]; then
                continue
            fi
            seen_op=true
        elif [[ "$tok" == -* ]] && { [[ "$tok" == -[[:alnum:]]+ ]] || [[ "$tok" == --* ]]; }; then
            continue
        fi
        ops+=("$tok")
    done

    if [ ${#ops[@]} -eq 0 ]; then
        printf '%s\n' '.'
    else
        printf '%s\n' "${ops[@]}"
    fi
}

# Return 0 if operand resolves to a path under PROJECT_ROOT; else print to stderr and return 2.
_validate_ls_operand_under_project_root() {
    local operand="$1"
    local current_dir="$2"
    local project_root="$3"
    local project_root_norm="$4"
    local rel_display path target_path target_norm

    path="$operand"
    if [[ "$path" == "~" ]]; then
        path="$HOME"
    elif [[ "$path" == '~/'* ]]; then
        path="${HOME}/${path:2}"
    fi
    if [ "${path#/}" != "$path" ]; then
        target_path="$path"
    else
        target_path="${current_dir%/}/$path"
    fi

    if [ ! -e "$target_path" ]; then
        rel_display=$(realpath --relative-to="$project_root" "$current_dir" 2>/dev/null || echo "$current_dir")
        if [ "$current_dir" = "$project_root" ]; then
            rel_display="."
        fi
        echo "ls target does not exist: $operand (you are in: $rel_display relative to project root)" >&2
        return 2
    fi

    target_norm=$(realpath "$target_path")
    if [ "$target_norm" != "$project_root_norm" ] && [ "${target_norm#$project_root_norm/}" = "$target_norm" ]; then
        rel_display=$(realpath --relative-to="$project_root" "$current_dir" 2>/dev/null || echo "$current_dir")
        if [ "$current_dir" = "$project_root" ]; then
            rel_display="."
        fi
        echo "ls outside the project tree is not allowed: $target_norm (you are in: $rel_display relative to project root)" >&2
        return 2
    fi
    return 0
}

read -r cmd

# Check 1a: Prevent direct pytest usage (pytest or python/python3 -m pytest)
if echo "$cmd" | grep -qE "^(pytest|python3? -m pytest)"; then
    echo "Use .venv/bin/pytest instead" >&2
    exit 2
fi

# Check 1b: Remind to use venv when running python or python3
if echo "$cmd" | grep -qE "^\s*python3?\s+"; then
    echo "Use .venv/bin/python instead" >&2
    exit 2
fi

# Check 1c: Remind of uv when pip is tried
if echo "$cmd" | grep -qE "^\s*pip\s+"; then
    echo "Project uses uv not pip" >&2
    exit 2
fi

# Check 2: Check to not use run commands using bash
if echo "$cmd" | grep -qE "^\s*bash\s+[a-zA-Z0-9_-]+\.sh"; then
    echo "Run the script without the bash prefix" >&2
    exit 2
fi


# Check 3: Prevent grep usage (use ripgrep instead)
if echo "$cmd" | grep -q "^grep "; then
    echo "use ripgrep (rg) instead of grep" >&2
    exit 2
fi

# Check 4: Validate cd .. command
if echo "$cmd" | grep -qE "^\s*cd\s+\.\.\s*$|^\s*cd\s+\.\.\s+"; then
    SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
    PROJECT_ROOT=$(dirname "$SCRIPT_DIR")
    CURRENT_DIR="$PWD"

    PROJECT_ROOT_NORM=$(realpath "$PROJECT_ROOT")
    CURRENT_DIR_NORM=$(realpath "$CURRENT_DIR")

    if [ "$CURRENT_DIR_NORM" = "$PROJECT_ROOT_NORM" ]; then
        echo "cd .. is not allowed - you are in the project root" >&2
        exit 2
    fi

    if [ "${CURRENT_DIR_NORM#$PROJECT_ROOT_NORM/}" = "$CURRENT_DIR_NORM" ]; then
        echo "cd .. is not allowed - you are in the project root" >&2
        exit 2
    fi
fi

# Check 5: Validate cd <path> (existence, project tree, redundant cd to cwd). Runs before ls so e.g. cd ~/proj && ls is rejected for useless cd first.
if echo "$cmd" | grep -qE "^\s*cd\s+"; then
    path=$(echo "$cmd" | sed -E 's/^\s*cd\s+//' | sed -E 's/[;&|].*$//' | sed -E "s/^['\"]|['\"]$//g" | xargs)

    if [ "$path" != ".." ]; then
        SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
        PROJECT_ROOT=$(dirname "$SCRIPT_DIR")
        CURRENT_DIR="$PWD"

        if [[ "$path" == "~" ]]; then
            path="$HOME"
        elif [[ "$path" == '~/'* ]]; then
            path="${HOME}/${path:2}"
        fi

        if [ "${path#/}" != "$path" ]; then
            target_path="$path"
        else
            target_path="$CURRENT_DIR/$path"
        fi

        if [ ! -d "$target_path" ]; then
            RELATIVE_PATH=$(realpath --relative-to="$PROJECT_ROOT" "$CURRENT_DIR" 2>/dev/null || echo "$CURRENT_DIR")
            if [ "$CURRENT_DIR" = "$PROJECT_ROOT" ]; then
                RELATIVE_PATH="."
            fi
            echo "cd failed - folder does not exist: $path (you are in: $RELATIVE_PATH relative to project root)" >&2
            exit 2
        fi

        PROJECT_ROOT_NORM=$(realpath "$PROJECT_ROOT")
        TARGET_NORM=$(realpath "$target_path")
        CURRENT_DIR_NORM=$(realpath "$CURRENT_DIR")
        if [ "$TARGET_NORM" = "$CURRENT_DIR_NORM" ]; then
            echo "no need to cd (you are in that folder already)" >&2
            exit 2
        fi
        if [ "$TARGET_NORM" != "$PROJECT_ROOT_NORM" ] && [ "${TARGET_NORM#$PROJECT_ROOT_NORM/}" = "$TARGET_NORM" ]; then
            RELATIVE_PATH=$(realpath --relative-to="$PROJECT_ROOT" "$CURRENT_DIR" 2>/dev/null || echo "$CURRENT_DIR")
            if [ "$CURRENT_DIR" = "$PROJECT_ROOT" ]; then
                RELATIVE_PATH="."
            fi
            echo "cd outside the project tree is not allowed: $TARGET_NORM (you are in: $RELATIVE_PATH relative to project root)" >&2
            exit 2
        fi
    fi
fi

# Check 6: ls — allow any git ls-* (match git ls-… anywhere so e.g. `&& git ls-files` is not blocked by \bls\b); allow leading ls only when operands resolve under PROJECT_ROOT
if echo "$cmd" | grep -qE '\bgit\s+ls(-|[[:space:]]|$)'; then
    :
elif echo "$cmd" | grep -q "\bls\b"; then
    if echo "$cmd" | grep -qE '^[[:space:]]*ls([[:space:]]|$)'; then
        SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
        PROJECT_ROOT=$(dirname "$SCRIPT_DIR")
        CURRENT_DIR="$PWD"
        PROJECT_ROOT_NORM=$(realpath "$PROJECT_ROOT")

        cmd_for_ls=$(echo "$cmd" | sed -E 's/[[:space:]]*&&.*$//; s/[[:space:]]*\|\|.*$//; s/[;&|].*$//')
        args=$(echo "$cmd_for_ls" | sed -E 's/^[[:space:]]*ls[[:space:]]*//')

        while IFS= read -r operand; do
            [ -n "$operand" ] || continue
            if ! _validate_ls_operand_under_project_root "$operand" "$CURRENT_DIR" "$PROJECT_ROOT" "$PROJECT_ROOT_NORM"; then
                exit 2
            fi
        done < <(_collect_ls_operands_from_args "$args")
    else
        SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
        PROJECT_ROOT=$(dirname "$SCRIPT_DIR")
        CURRENT_DIR="$PWD"
        RELATIVE_PATH=$(realpath --relative-to="$PROJECT_ROOT" "$CURRENT_DIR" 2>/dev/null || echo "$CURRENT_DIR")
        if [ "$CURRENT_DIR" = "$PROJECT_ROOT" ]; then
            RELATIVE_PATH="."
        fi
        echo "ls is only allowed as the leading command, or use git ls-*. You are in: $RELATIVE_PATH relative to project root" >&2
        exit 2
    fi
fi

# Check 7: Prevent cd frontend && npm run (lint|format)
if echo "$cmd" | grep -qE "^cd frontend[^A-Za-z]*npm run (lint|format)"; then
    echo "use ./lfc.sh for that, either with path(s) of individual file(s) or with no args to run on all changed unstaged .py and .ts/tsx files" >&2
    exit 2
fi

# Check 8: Prevent absolute home directory paths
if echo "$cmd" | grep -qE "/home/[A-Za-z]+/"; then
    echo "use relative paths" >&2
    exit 2
fi

# Check 9: Prevent pwd command
if echo "$cmd" | grep -qE "^\s*pwd\s*$|^\s*pwd\s+"; then
    # Get project root (parent of .claude directory where this script is located)
    SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
    PROJECT_ROOT=$(dirname "$SCRIPT_DIR")
    
    # Get current directory and calculate relative path
    CURRENT_DIR="$PWD"
    RELATIVE_PATH=$(realpath --relative-to="$PROJECT_ROOT" "$CURRENT_DIR" 2>/dev/null || echo "$CURRENT_DIR")
    
    # If we're at the project root, show "."
    if [ "$CURRENT_DIR" = "$PROJECT_ROOT" ]; then
        RELATIVE_PATH="."
    fi
    
    echo "pwd command is not allowed. Use relative paths - you are in: $RELATIVE_PATH (relative to project root)" >&2
    exit 2
fi

# Check 10: Prevent commands starting with or using ../
if echo "$cmd" | grep -q '\.\./'; then
    SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
    PROJECT_ROOT=$(dirname "$SCRIPT_DIR")
    CURRENT_DIR="$PWD"
    RELATIVE_PATH=$(realpath --relative-to="$PROJECT_ROOT" "$CURRENT_DIR" 2>/dev/null || echo "$CURRENT_DIR")
    if [ "$CURRENT_DIR" = "$PROJECT_ROOT" ]; then
        RELATIVE_PATH="."
    fi
    echo "cd to the correct folder first - you are in: $RELATIVE_PATH (relative to project root)" >&2
    exit 2
fi

# Check 11: Prevent git commit, push, merge, and rebase commands
if echo "$cmd" | grep -qE "\bgit\s+(commit|push|merge|rebase)\b"; then
    echo "write.update git commands are not allowed" >&2
    exit 2
fi

exit 0
