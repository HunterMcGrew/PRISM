#!/usr/bin/env bash
#
# PreToolUse guard for node tooling run in an unprepared worktree. Blocks with
# exit 2 + a stderr message that Claude Code feeds back to the agent so it
# self-corrects without prompting the human. It fires only when all three hold:
#
#   1. The command runs a node tool (pnpm, npx, tsx, tsc, jest, eslint,
#      prettier, node) — matched on the segment's program name, after env
#      assignments, so `FOO=bar pnpm ...` still counts and `echo "pnpm ..."`
#      does not.
#   2. The effective working directory is inside .claude/worktrees/<name>/ —
#      taken from the payload cwd and updated by any inline `cd` that precedes
#      the tool in the same command string.
#   3. That worktree has no resolvable node_modules — meaning scripts/worktree-
#      setup.sh has not been run, so package resolution would fail.
#
# Everything else — non-Bash tools, non-node commands, the main checkout, a
# prepared worktree, an undeterminable directory, a malformed payload — exits 0.
# The guard only ever redirects a command that is certain to fail; when in doubt
# it stays out of the way.
#
# Commands are tokenized with shlex, so shell quoting and separators (&&,
# |, ;, newline) are respected rather than regex-matched.
#
# python3 on Windows Git Bash is frequently the non-functional Microsoft Store
# stub, so the interpreter is resolved by trying python3 then python and keeping
# the first that actually runs; if neither does, the guard fails open.

input="$(cat)"

PYTHON=""
for candidate in python3 python; do
	p="$(command -v "$candidate" 2>/dev/null)" || continue
	if "$p" -c '' >/dev/null 2>&1; then
		PYTHON="$p"
		break
	fi
done
[ -z "$PYTHON" ] && exit 0

"$PYTHON" - "$input" <<'PY'
import sys, json, shlex, os, posixpath, re

try:
    data = json.loads(sys.argv[1])
except (ValueError, IndexError):
    sys.exit(0)  # unparseable payload, fail open, never block on our own bug

if data.get("tool_name") != "Bash":
    sys.exit(0)

command = ((data.get("tool_input") or {}).get("command") or "").strip()
if not command:
    sys.exit(0)

# A heredoc body (git commit message, PR body) is data, not executed commands,
# a node-tool word at the start of a heredoc line must not trigger the guard.
# Nothing after the heredoc operator is a command we care about, so scan only up
# to it; a real node-tool invocation always precedes its own heredoc.
command = command.split("<<", 1)[0].strip()
if not command:
    sys.exit(0)

NODE_TOOLS = {"pnpm", "npx", "tsx", "tsc", "jest", "eslint", "prettier", "node"}
MARKER = "/.claude/worktrees/"


def norm(p):
    return (p or "").replace("\\", "/")


def native_candidates(p):
    # Try the path as given, plus an MSYS-to-Windows rewrite (/d/foo -> D:/foo)
    # so a Windows python resolves an MSYS-form cwd.
    cands = [p]
    m = re.match(r"^/([A-Za-z])/(.*)$", p)
    if m:
        cands.append(m.group(1).upper() + ":/" + m.group(2))
    return cands


def isdir_any(p):
    for c in native_candidates(p):
        try:
            if os.path.isdir(c):
                return True
        except OSError:
            pass
    return False


def resolve_cd(base, target):
    t = norm(target)
    if not t:
        return base
    if t.startswith("/") or (len(t) >= 2 and t[1] == ":"):
        return posixpath.normpath(t)
    if not base:
        return t
    return posixpath.normpath(base + "/" + t)


def worktree_root(path):
    idx = path.find(MARKER)
    if idx == -1:
        return None
    name = path[idx + len(MARKER):].split("/", 1)[0]
    if not name:
        return None
    return path[:idx] + MARKER + name


try:
    lexer = shlex.shlex(command, posix=True, punctuation_chars="();<>|&\n")
    lexer.whitespace = " \t\r"  # drop newline so it surfaces as a separator token
    lexer.whitespace_split = True
    tokens = list(lexer)
except ValueError:
    sys.exit(0)  # unbalanced quotes etc., fail open

SEPARATOR_CHARS = set(";&|()<>") | {"\n", "\r"}


def is_separator(tok):
    return bool(tok) and all(c in SEPARATOR_CHARS for c in tok)


def program_index(seg):
    i = 0
    while i < len(seg) and "=" in seg[i] and not seg[i].startswith("-"):
        i += 1  # skip env-assignment prefix (FOO=bar pnpm ...)
    return i


# Walk segments left to right. A `cd <path>` segment updates the effective
# directory for every node-tool command that follows it in the same string.
effective = norm(data.get("cwd") or "")
segment = []
violation = None

for tok in tokens + [";"]:  # trailing separator flushes the final segment
    if is_separator(tok):
        if segment:
            i = program_index(segment)
            if i < len(segment):
                prog = posixpath.basename(norm(segment[i]))
                if prog == "cd" and i + 1 < len(segment):
                    effective = resolve_cd(effective, segment[i + 1])
                elif prog in NODE_TOOLS:
                    wt = worktree_root(effective)
                    if wt and isdir_any(wt) and not isdir_any(wt + "/node_modules"):
                        violation = (" ".join(segment), wt)
                        break
        segment = []
        continue
    segment.append(tok)

if violation is None:
    sys.exit(0)

cmd_text, wt = violation
sys.stderr.write(
    "Blocked: node tooling in an unprepared worktree.\n\n"
    "    " + cmd_text + "\n\n"
    "This worktree has no linked node_modules, so package resolution will fail. "
    "Prepare it once, then re-run:\n\n"
    "    sh " + wt + "/scripts/worktree-setup.sh\n"
)
sys.exit(2)
PY
exit $?
