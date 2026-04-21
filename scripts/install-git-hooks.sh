#!/bin/sh
# One-time setup: installs the repo's git hooks into .git/hooks/.
# Run once per clone:  bash scripts/install-git-hooks.sh
#
# This exists because git hooks under .git/ are not tracked by git and
# therefore do not travel with a clone. The hooks live in scripts/hooks/
# and this script copies them into place.

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
HOOKS_SRC="$REPO_ROOT/scripts/hooks"
HOOKS_DST="$REPO_ROOT/.git/hooks"

if [ ! -d "$HOOKS_SRC" ]; then
  echo "scripts/hooks/ not found — nothing to install."
  exit 0
fi

for hook in "$HOOKS_SRC"/*; do
  name=$(basename "$hook")
  cp "$hook" "$HOOKS_DST/$name"
  chmod +x "$HOOKS_DST/$name"
  echo "Installed $name"
done

echo "Done. Hooks now active in .git/hooks/."
