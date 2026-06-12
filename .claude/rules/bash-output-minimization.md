# Bash Output Minimization

## Purpose

Every bash command's input and output consumes tokens from the context window. Minimize output volume for routine operations — and keep it visible where the output is the information.

**Why:** routine confirmations ("push succeeded", "install finished") spend context tokens to tell you something the exit code already says. Cutting that noise keeps the window clear for the output that actually carries signal — diffs, test results, error messages. The goal is to cut noise on routine confirmations, not to hide useful information.

## How to apply

Minimize output for routine operations:

- **Git:** use quiet flags — `git push -q`, `git pull -q`, `git fetch -q`, `git commit -q`. Use `git status -s` (short format) instead of `git status`.
- **gh CLI:** redirect JSON responses to `/dev/null` when you only need the exit code — e.g. `gh api ... > /dev/null`. When creating comments or updating PRs, the response URL is rarely useful.
- **Build tools:** when only pass/fail matters — `pnpm run build > /dev/null 2>&1 && echo "Build passed" || echo "Build failed"`.
- **Package installs:** `pnpm install --silent` or `npm install --silent`.
- **Heredocs to files:** writing content to a temp file (e.g. a PR body) with `cat > /tmp/file.md << 'EOF' ... EOF` already produces no output; don't follow it with a read-back unless needed.

Keep output visible for:

- Diffs, file searches, and test results — the output is the information.
- Commands that fail — error output is needed for debugging.
- Linting and formatting checks that find violations — the violations are actionable.
