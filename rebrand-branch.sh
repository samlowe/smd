#!/bin/bash
set -euo pipefail

SCRIPT_NAME=$(basename "$0")
DRY_RUN=false
DELETE_ORIGINAL=false
SOURCE_BRANCH=""
TARGET_BRANCH=""
NEW_AUTHOR_NAME=""
NEW_AUTHOR_EMAIL=""
BASE_BRANCH="main"
COMMIT_RANGE=""
COMMIT_COUNT="0"
COMMITS_TO_REBRAND=()

usage() {
    cat <<EOF
Usage: $SCRIPT_NAME [OPTIONS] <source-branch> <target-branch>

Rebrand a branch by copying its commits to a new branch with optional author rewriting.
Designed for homogenising assistant-created branches to user conventions.

Arguments:
  source-branch    The branch to copy commits from (must exist on origin)
  target-branch    The new branch name to create

Options:
  -a, --author NAME      New author name (requires --email)
  -e, --email EMAIL      New author email (requires --author)
                         If neither --author nor --email is provided, uses git config
                         user.name and user.email (if available)
  -b, --base BRANCH      Base branch to compare against (default: main)
  -d, --delete           Delete the original branch from origin after success
  -n, --dry-run          Show what would be done without making changes
  -h, --help             Show this help message

Examples:
  $SCRIPT_NAME claude/feature-abc feature/abc
  $SCRIPT_NAME -a "John Doe" -e "john@example.com" claude/feature-abc feature/abc
  $SCRIPT_NAME --dry-run --delete claude/feature-abc feature/abc
  $SCRIPT_NAME --base develop claude/feature-abc feature/abc
EOF
    exit "${1:-0}"
}

log() {
    echo "[INFO] $*"
}

log_dry() {
    echo "[DRY-RUN] $*"
}

log_error() {
    echo "[ERROR] $*" >&2
}

run_cmd() {
    if $DRY_RUN; then
        log_dry "Would run: $*"
        return 0
    fi
    "$@"
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -a|--author)
                NEW_AUTHOR_NAME="$2"
                shift 2
                ;;
            -e|--email)
                NEW_AUTHOR_EMAIL="$2"
                shift 2
                ;;
            -b|--base)
                BASE_BRANCH="$2"
                shift 2
                ;;
            -d|--delete)
                DELETE_ORIGINAL=true
                shift
                ;;
            -n|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -h|--help)
                usage 0
                ;;
            -*)
                log_error "Unknown option: $1"
                usage 1
                ;;
            *)
                if [[ -z "$SOURCE_BRANCH" ]]; then
                    SOURCE_BRANCH="$1"
                elif [[ -z "$TARGET_BRANCH" ]]; then
                    TARGET_BRANCH="$1"
                else
                    log_error "Unexpected argument: $1"
                    usage 1
                fi
                shift
                ;;
        esac
    done
}

get_default_git_user() {
    if [[ -z "$NEW_AUTHOR_NAME" && -z "$NEW_AUTHOR_EMAIL" ]]; then
        local git_name
        local git_email
        git_name=$(git config user.name 2>/dev/null || echo "")
        git_email=$(git config user.email 2>/dev/null || echo "")
        
        if [[ -n "$git_name" && -n "$git_email" ]]; then
            NEW_AUTHOR_NAME="$git_name"
            NEW_AUTHOR_EMAIL="$git_email"
            log "Using default git user: $NEW_AUTHOR_NAME <$NEW_AUTHOR_EMAIL>"
        fi
    fi
}

validate_args() {
    if [[ -z "$SOURCE_BRANCH" ]]; then
        log_error "Source branch is required"
        usage 1
    fi

    if [[ -z "$TARGET_BRANCH" ]]; then
        log_error "Target branch is required"
        usage 1
    fi

    if [[ -n "$NEW_AUTHOR_NAME" && -z "$NEW_AUTHOR_EMAIL" ]]; then
        log_error "--author requires --email"
        exit 1
    fi

    if [[ -n "$NEW_AUTHOR_EMAIL" && -z "$NEW_AUTHOR_NAME" ]]; then
        log_error "--email requires --author"
        exit 1
    fi
}

verify_source_branch_exists() {
    log "Fetching origin/$SOURCE_BRANCH..."
    if ! git fetch origin "$SOURCE_BRANCH" 2>/dev/null; then
        log_error "Branch '$SOURCE_BRANCH' does not exist on origin"
        exit 1
    fi
}

verify_base_branch_exists() {
    log "Fetching origin/$BASE_BRANCH..."
    if ! git fetch origin "$BASE_BRANCH" 2>/dev/null; then
        log_error "Base branch '$BASE_BRANCH' does not exist on origin"
        exit 1
    fi
}

verify_target_branch_available() {
    if git show-ref --verify --quiet "refs/heads/$TARGET_BRANCH" 2>/dev/null; then
        log_error "Local branch '$TARGET_BRANCH' already exists"
        exit 1
    fi

    if git ls-remote --exit-code --heads origin "$TARGET_BRANCH" >/dev/null 2>&1; then
        log_error "Remote branch '$TARGET_BRANCH' already exists on origin"
        exit 1
    fi
}

verify_sed_support() {
    if ! command -v sed >/dev/null 2>&1; then
        log_error "sed is required but not found in PATH"
        exit 1
    fi

    if ! printf '%s\n' "x" | sed -E 's/x/y/' >/dev/null 2>&1; then
        log_error "sed does not support -E (extended regex). Please use a sed that supports -E."
        exit 1
    fi
}

get_commits_to_rebrand() {
    COMMIT_RANGE="origin/$BASE_BRANCH..origin/$SOURCE_BRANCH"
    mapfile -t COMMITS_TO_REBRAND < <(git rev-list --reverse --no-merges "$COMMIT_RANGE" 2>/dev/null || true)
    COMMIT_COUNT="${#COMMITS_TO_REBRAND[@]}"

    if [[ "$COMMIT_COUNT" -eq 0 ]]; then
        log_error "No commits found between $BASE_BRANCH and $SOURCE_BRANCH"
        exit 1
    fi

    log "Found $COMMIT_COUNT commit(s) to rebrand"

    if $DRY_RUN; then
        log_dry "Commits to be rebranded:"
        git log --oneline --reverse --no-merges "$COMMIT_RANGE"
    fi
}

create_rebranded_branch() {
    log "Creating branch '$TARGET_BRANCH' from origin/$BASE_BRANCH..."
    run_cmd git checkout -b "$TARGET_BRANCH" "origin/$BASE_BRANCH"
}

apply_commits_with_optional_rewrite() {
    if $DRY_RUN; then
        log_dry "Would cherry-pick commits from $SOURCE_BRANCH onto $BASE_BRANCH"
        [[ -n "$NEW_AUTHOR_NAME" ]] && log_dry "Would rewrite author to: $NEW_AUTHOR_NAME <$NEW_AUTHOR_EMAIL>"
        return
    fi

    local commit_hash
    local original_author_name
    local original_author_email
    local original_message
    local rewritten_message

    if [[ -n "$NEW_AUTHOR_NAME" ]]; then
        log "Cherry-picking commits and rewriting author to: $NEW_AUTHOR_NAME <$NEW_AUTHOR_EMAIL>"
    else
        log "Cherry-picking commits using original authors"
    fi

    for commit_hash in "${COMMITS_TO_REBRAND[@]}"; do
        original_author_name=$(git show -s --format='%an' "$commit_hash")
        original_author_email=$(git show -s --format='%ae' "$commit_hash")
        original_message=$(git show -s --format=%B "$commit_hash")
        rewritten_message=$(printf '%s\n' "$original_message" | sed -E 's|https?://[^[:space:]]+||g; s/[[:space:]]+$//')

        if [[ -n "$NEW_AUTHOR_NAME" ]]; then
            GIT_AUTHOR_NAME="$NEW_AUTHOR_NAME" \
            GIT_AUTHOR_EMAIL="$NEW_AUTHOR_EMAIL" \
            GIT_COMMITTER_NAME="$NEW_AUTHOR_NAME" \
            GIT_COMMITTER_EMAIL="$NEW_AUTHOR_EMAIL" \
            git cherry-pick --no-commit "$commit_hash"
            GIT_AUTHOR_NAME="$NEW_AUTHOR_NAME" \
            GIT_AUTHOR_EMAIL="$NEW_AUTHOR_EMAIL" \
            GIT_COMMITTER_NAME="$NEW_AUTHOR_NAME" \
            GIT_COMMITTER_EMAIL="$NEW_AUTHOR_EMAIL" \
            git commit --author="$NEW_AUTHOR_NAME <$NEW_AUTHOR_EMAIL>" -F - <<<"$rewritten_message"
        else
            GIT_AUTHOR_NAME="$original_author_name" \
            GIT_AUTHOR_EMAIL="$original_author_email" \
            GIT_COMMITTER_NAME="$original_author_name" \
            GIT_COMMITTER_EMAIL="$original_author_email" \
            git cherry-pick --no-commit "$commit_hash"
            GIT_AUTHOR_NAME="$original_author_name" \
            GIT_AUTHOR_EMAIL="$original_author_email" \
            GIT_COMMITTER_NAME="$original_author_name" \
            GIT_COMMITTER_EMAIL="$original_author_email" \
            git commit --author="$original_author_name <$original_author_email>" -F - <<<"$rewritten_message"
        fi
    done
}

push_new_branch() {
    log "Pushing '$TARGET_BRANCH' to origin..."
    run_cmd git push -u origin "$TARGET_BRANCH"
}

delete_original_branch() {
    if ! $DELETE_ORIGINAL; then
        log "Original branch '$SOURCE_BRANCH' preserved on origin"
        return
    fi

    log "Deleting original branch '$SOURCE_BRANCH' from origin..."
    run_cmd git push origin --delete "$SOURCE_BRANCH"
}

cleanup_local() {
    local original_branch
    original_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

    if [[ "$original_branch" == "$TARGET_BRANCH" ]] && ! $DRY_RUN; then
        log "Staying on new branch '$TARGET_BRANCH'"
    fi
}

show_summary() {
    echo ""
    if $DRY_RUN; then
        echo "=== DRY RUN SUMMARY ==="
        echo "Would rebrand: origin/$SOURCE_BRANCH -> $TARGET_BRANCH"
        echo "Would base new branch on: origin/$BASE_BRANCH"
        echo "Would strip web links from commit messages"
        if [[ -n "$NEW_AUTHOR_NAME" ]]; then
            echo "Would rewrite author to: $NEW_AUTHOR_NAME <$NEW_AUTHOR_EMAIL>"
        fi
        if $DELETE_ORIGINAL; then
            echo "Would delete original branch: origin/$SOURCE_BRANCH"
        fi
    else
        echo "=== COMPLETED ==="
        echo "Rebranded: origin/$SOURCE_BRANCH -> $TARGET_BRANCH"
        echo "Based on: origin/$BASE_BRANCH"
        echo "Web links stripped from commit messages"
        if [[ -n "$NEW_AUTHOR_NAME" ]]; then
            echo "Author rewritten to: $NEW_AUTHOR_NAME <$NEW_AUTHOR_EMAIL>"
        fi
        if $DELETE_ORIGINAL; then
            echo "Deleted original branch: origin/$SOURCE_BRANCH"
        fi
    fi
}

main() {
    parse_args "$@"
    get_default_git_user
    validate_args

    log "Starting branch rebrand operation"
    $DRY_RUN && log "DRY RUN MODE - no changes will be made"

    verify_source_branch_exists
    verify_base_branch_exists
    verify_target_branch_available
    verify_sed_support
    get_commits_to_rebrand
    create_rebranded_branch
    apply_commits_with_optional_rewrite
    push_new_branch
    delete_original_branch
    cleanup_local
    show_summary
}

main "$@"
