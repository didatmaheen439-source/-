#!/usr/bin/env bash
set -euo pipefail

refresh=false
if [[ "${1:-}" == "--refresh" ]]; then
  refresh=true
  shift
fi

if [[ $# -ne 0 ]]; then
  echo "Usage: $0 [--refresh]" >&2
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

if [[ "$refresh" == true ]]; then
  git -C "$repo_root" fetch origin --prune
fi

origin_main="$(git -C "$repo_root" rev-parse origin/main)"
local_main="$(git -C "$repo_root" rev-parse main)"

printf 'Repository: %s\n' "$repo_root"
printf 'origin/main: %s\n' "$origin_main"
printf 'local main:  %s\n' "$local_main"

if [[ "$local_main" == "$origin_main" ]]; then
  echo 'Main status: synchronized'
else
  echo 'Main status: NOT synchronized'
fi

echo
echo 'Worktrees:'
while IFS= read -r worktree; do
  branch="$(git -C "$worktree" symbolic-ref --quiet --short HEAD || printf 'detached')"
  changes="$(git -C "$worktree" status --porcelain)"

  if [[ -z "$changes" ]]; then
    printf '  clean  %-36s %s\n' "$branch" "$worktree"
  else
    printf '  DIRTY  %-36s %s\n' "$branch" "$worktree"
    printf '%s\n' "$changes" | sed 's/^/         /'
  fi
done < <(git -C "$repo_root" worktree list --porcelain | awk '/^worktree / { print substr($0, 10) }')

echo
echo 'Local branches:'
git -C "$repo_root" branch -vv
