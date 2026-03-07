#!/bin/bash
# Format and lint TypeScript/TSX files after Write/Edit operations (run from ui)

file_path="$1"

if [[ ! "$file_path" =~ \.(ts|tsx)$ ]]; then
    exit 0
fi

project_root="$(cd "$(dirname "$0")/.." && pwd)"
ui_dir="${project_root}/ui"

if [ ! -d "$ui_dir" ]; then
    exit 0
fi

if [[ "$file_path" == ui/* ]]; then
    relative_path="${file_path#ui/}"
elif [[ "$file_path" == /* ]]; then
    if [[ "$file_path" == *"/ui/"* ]]; then
        relative_path="${file_path#*ui/}"
    else
        exit 0
    fi
else
    if [[ "$file_path" == ui/* ]]; then
        relative_path="${file_path#ui/}"
    else
        relative_path="$file_path"
    fi
fi

cd "$ui_dir" && \
npm run format "$relative_path" && \
npm run lint:check "$relative_path"
