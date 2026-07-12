#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <module> <purpose>" >&2
  exit 2
fi

module="$1"
purpose="$2"
if [[ ! "$module" =~ ^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$ ]] || [[ ! "$purpose" =~ ^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$ ]]; then
  echo 'Module and purpose must use lowercase letters, numbers, and single hyphens.' >&2
  exit 2
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
script_worktree="$(git -C "$script_dir/../.." rev-parse --show-toplevel)"
repo_root="$(git -C "$script_worktree" worktree list --porcelain | awk '
  /^worktree / { path = substr($0, 10) }
  /^branch refs\/heads\/main$/ { print path; exit }
')"

if [[ -z "$repo_root" ]]; then
  echo 'Unable to find the canonical main worktree.' >&2
  exit 1
fi
worktree_root="${WORKTREE_ROOT:-${repo_root}-worktrees}"
branch="codex/${module}-${purpose}"
destination="${worktree_root}/${module}-${purpose}"

if [[ "$(git -C "$repo_root" symbolic-ref --quiet --short HEAD || true)" != 'main' ]]; then
  echo "The canonical project directory must be on main: $repo_root" >&2
  exit 1
fi

if [[ -n "$(git -C "$repo_root" status --porcelain)" ]]; then
  echo "The canonical main worktree has uncommitted changes: $repo_root" >&2
  exit 1
fi

git -C "$repo_root" fetch origin --prune
git -C "$repo_root" pull --ff-only

if [[ "$(git -C "$repo_root" rev-parse main)" != "$(git -C "$repo_root" rev-parse origin/main)" ]]; then
  echo 'Local main is not synchronized with origin/main.' >&2
  exit 1
fi

if git -C "$repo_root" show-ref --verify --quiet "refs/heads/${branch}" || git -C "$repo_root" ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
  echo "Branch already exists: $branch" >&2
  exit 1
fi

if [[ -e "$destination" ]]; then
  echo "Worktree directory already exists: $destination" >&2
  exit 1
fi

mkdir -p "$worktree_root"
git -C "$repo_root" worktree add "$destination" -b "$branch" origin/main

printf 'Created branch: %s\n' "$branch"
printf 'Created worktree: %s\n' "$destination"
