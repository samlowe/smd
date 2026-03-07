#!/bin/bash
# Validate Bash commands before execution

read -r cmd

# # Check 1: Prevent direct pytest usage (pytest or python -m pytest)
# if echo "$cmd" | grep -qE "^(pytest|python -m pytest)"; then
#     echo "Use .venv/bin/pytest instead" >&2
#     exit 2
# fi

# Check 2: Prevent unnecessary cd to current directory
if echo "$cmd" | grep -q "^cd /"; then
    path=$(echo "$cmd" | sed 's/^cd //' | sed 's/[;& ].*$//')
    path="${path%/}"
    current_dir=$(pwd)
    if [ "$path" = "$current_dir" ]; then
        echo "no need to cd (you are already in that folder)" >&2
        exit 2
    fi
fi

# Check 3: Prevent grep usage (use ripgrep instead)
if echo "$cmd" | grep -q "^grep "; then
    echo "use ripgrep (rg) instead of grep" >&2
    exit 2
fi

# Check 4: Prevent ls usage (allow git ls-tree)
if echo "$cmd" | grep -q "\bls\b"; then
    if echo "$cmd" | grep -qE "\bgit\s+ls-tree\b"; then
        :  # allow git ls-tree
    else
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
    
    echo "use the tools provided instead of ls (BTW you are in: $RELATIVE_PATH relative to project root)" >&2
    exit 2
    fi
fi

# # Check 5: Prevent cd ui && npm run (lint|format)
# if echo "$cmd" | grep -qE "^cd ui[^A-Za-z]*npm run (lint|format)"; then
#     echo "use ./lfc.sh for that, either with path(s) of individual file(s) or with no args to run on all changed unstaged .py and .ts/tsx files" >&2
#     exit 2
# fi

# Check 6: Prevent absolute home directory paths
if echo "$cmd" | grep -qE "/home/[A-Za-z]+/"; then
    echo "use relative paths" >&2
    exit 2
fi

# Check 7: Prevent pwd command
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

# Check 8: Validate cd .. command
if echo "$cmd" | grep -qE "^\s*cd\s+\.\.\s*$|^\s*cd\s+\.\.\s+"; then
    SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
    PROJECT_ROOT=$(dirname "$SCRIPT_DIR")
    CURRENT_DIR="$PWD"
    
    # Normalize paths for comparison
    PROJECT_ROOT_NORM=$(realpath "$PROJECT_ROOT")
    CURRENT_DIR_NORM=$(realpath "$CURRENT_DIR")
    
    # Check if we're at the project root or above
    if [ "$CURRENT_DIR_NORM" = "$PROJECT_ROOT_NORM" ]; then
        echo "cd .. is not allowed - you are in the project root" >&2
        exit 2
    fi
    
    # Check if current directory is a subdirectory of project root
    # If CURRENT_DIR starts with PROJECT_ROOT/, it's a subdirectory
    if [ "${CURRENT_DIR_NORM#$PROJECT_ROOT_NORM/}" = "$CURRENT_DIR_NORM" ]; then
        # If the prefix removal didn't change the path, we're not in a subdirectory
        echo "cd .. is not allowed - you are in the project root" >&2
        exit 2
    fi
fi

# Check 9: Validate cd <path> - check if path exists
if echo "$cmd" | grep -qE "^\s*cd\s+"; then
    # Extract the path from cd command (handle cd path, cd "path", cd 'path')
    path=$(echo "$cmd" | sed -E 's/^\s*cd\s+//' | sed -E 's/[;&|].*$//' | sed -E "s/^['\"]|['\"]$//g" | xargs)
    
    # Skip if it's cd .. (already handled in Check 8)
    if [ "$path" = ".." ]; then
        :
    else
        SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
        PROJECT_ROOT=$(dirname "$SCRIPT_DIR")
        CURRENT_DIR="$PWD"
        
        # Resolve the target path (relative to current directory)
        if [ "${path#/}" != "$path" ]; then
            # Absolute path
            target_path="$path"
        else
            # Relative path
            target_path="$CURRENT_DIR/$path"
        fi
        
        # Check if the path exists and is a directory
        if [ ! -d "$target_path" ]; then
            # Calculate relative path for error message
            RELATIVE_PATH=$(realpath --relative-to="$PROJECT_ROOT" "$CURRENT_DIR" 2>/dev/null || echo "$CURRENT_DIR")
            if [ "$CURRENT_DIR" = "$PROJECT_ROOT" ]; then
                RELATIVE_PATH="."
            fi
            echo "cd failed - folder does not exist: $path (you are in: $RELATIVE_PATH relative to project root)" >&2
            exit 2
        fi
    fi
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
