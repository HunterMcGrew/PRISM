#!/usr/bin/env sh
#
# worktree-setup.sh — prepare an agent worktree so node tooling resolves.
#
# A git worktree under .claude/worktrees/<name> has no node_modules of its own.
# Node's module walk-up reaches the main checkout's root node_modules, but two
# other resolution paths never do: pnpm's script-runner .bin lookup (so bare
# `pnpm <script>` fails even though walk-up would resolve the modules
# themselves), and the hardcoded relative `tsc` path npm's TypeScript native
# binary packages ship with. This script links the root node_modules from the
# worktree back to the main checkout — the minimal set that satisfies both.
# PRISM has a single root package.json with no workspace packages (verified
# against pnpm-workspace.yaml's `packages: ["."]` — the packages key exists
# only to satisfy pnpm v9's `store path` check, not to declare real workspace
# members), so unlike thrive's per-package link loop, root is the whole set.
# If this repo later adopts real workspace packages (multiple entries in
# pnpm-workspace.yaml's `packages` key), the link set above would need to
# grow to cover each package's own node_modules, not just root's.
#
# Linux/Darwin use POSIX symlinks with relative targets — a relative target
# resolves identically regardless of where the tree is mounted, so the same
# link works everywhere. Windows has no equivalent unprivileged directory
# symlink (bare `ln -s` silently deep-copies in Git Bash), so it uses
# junctions with absolute targets via `mklink /J`.
#
# Run from inside the worktree, or pass the worktree path as the first argument.

set -eu

# --- resolve the worktree and its main checkout ---
WT_ARG="${1:-$(pwd)}"
WT="$(cd "$WT_ARG" 2>/dev/null && pwd)" || {
	echo "worktree-setup: cannot access '$WT_ARG'" >&2
	exit 1
}

case "$WT" in
	*/.claude/worktrees/*) ;;
	*)
		echo "worktree-setup: '$WT' is not under .claude/worktrees/ — run this from inside a worktree." >&2
		exit 1
		;;
esac

MAIN="${WT%/.claude/worktrees/*}"

case "$(uname -s)" in
	MINGW* | MSYS* | CYGWIN*) OS=windows ;;
	*) OS=posix ;;
esac

# --- verify the main checkout's own install exists before linking ---
# No link is created until the target checks out, so a missing install can
# never leave a half-linked worktree.
TARGET="$MAIN/node_modules"
if [ ! -d "$TARGET" ] || [ -z "$(ls -A "$TARGET" 2>/dev/null)" ]; then
	printf 'worktree-setup: the main checkout is missing installed dependencies:\n\n' >&2
	printf '    node_modules\n\n' >&2
	printf 'Install them in the main checkout first, then re-run this script:\n\n' >&2
	printf "    cd '%s' && pnpm install\n" "$MAIN" >&2
	exit 1
fi

# --- (re)create the link ---
LINK="$WT/node_modules"

if [ -L "$LINK" ]; then
	rm -f "$LINK"
elif [ -d "$LINK" ]; then
	echo "worktree-setup: '$LINK' is a real directory, not a link — leaving it untouched." >&2
	echo "worktree-setup: nothing else to link — done." >&2
	exit 0
fi

if [ "$OS" = windows ]; then
	MSYS_NO_PATHCONV=1 cmd.exe /c mklink /J "$(cygpath -w "$LINK")" "$(cygpath -w "$TARGET")" >/dev/null
else
	# Relative target: climb out of .claude/worktrees/<name> (3 levels), then
	# descend to node_modules — the worktree root has no subpath to add.
	ln -s ../../../node_modules "$LINK"
fi

# --- warn if the worktree's lockfile has drifted from main's ---
# The link carries main's installed tree, so worktree-only lockfile changes
# are not reflected until they are installed in main.
if [ -f "$WT/pnpm-lock.yaml" ] && [ -f "$MAIN/pnpm-lock.yaml" ] &&
	! cmp -s "$WT/pnpm-lock.yaml" "$MAIN/pnpm-lock.yaml"; then
	echo "worktree-setup: warning — this worktree's pnpm-lock.yaml differs from the main checkout's." >&2
	echo "  Linked node_modules reflects main's lockfile; re-install in main if the worktree needs different deps." >&2
fi

echo "worktree-setup: linked node_modules into the worktree from $MAIN."
