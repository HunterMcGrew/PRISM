#!/usr/bin/env sh
#
# run.sh — the hook adherence A/B matrix (plan `context-delivery-mechanism.md`
# task 9). Loops arms x prompts x runs, preparing a fresh worktree per run,
# invoking the agent, grading the result, and appending one row to the
# results TSV. Never invoke this against a live experiment without the
# operator's model/budget decision already made — see README.md.
#
# Usage:
#   MODEL=<full-model-id> BUDGET=<usd> ./run.sh
#
# Env overrides (all optional except MODEL/BUDGET, which have no safe default
# per the plan's "never straddle an alias rotation" requirement):
#   CLAUDE_BIN   path to the claude binary (default: /Users/hunter/.local/bin/claude)
#   RUNS_PER_CELL  runs per arm per prompt (default: 10 -> 60 runs total)

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

CLAUDE_BIN="${CLAUDE_BIN:-/Users/hunter/.local/bin/claude}"
RUNS_PER_CELL="${RUNS_PER_CELL:-10}"
DATE_STAMP="$(date +%Y-%m-%d)"
RESULTS_FILE="$SCRIPT_DIR/results/${DATE_STAMP}-run.tsv"

: "${MODEL:?MODEL must be set to a full model id, never an alias — see README.md}"
: "${BUDGET:?BUDGET must be set (per-run USD ceiling passed to --max-budget-usd)}"

if [ ! -f "$RESULTS_FILE" ]; then
	printf 'date\tprompt\tarm\trun_index\tmodel\tsession_id\texit_status\thook_fired\tinjected_docs\tcriteria_passed\tcriteria_total\tvoid_reason\n' > "$RESULTS_FILE"
fi

# --- one run: prepare worktree, invoke agent, grade, append row, tear down ---
run_one() {
	prompt="$1"
	arm="$2"
	run_index="$3"

	prompt_file="$SCRIPT_DIR/prompts/${prompt}-$(prompt_slug "$prompt").md"
	session_id="$(uuidgen)"
	worktree_name="hook-ab-${arm}-${prompt}-${run_index}"
	worktree_path="$REPO_ROOT/.claude/worktrees/${worktree_name}"

	git -C "$REPO_ROOT" worktree add -q "$worktree_path" HEAD

	if ! "$REPO_ROOT/scripts/worktree-setup.sh" "$worktree_path"; then
		echo "run.sh: worktree-setup.sh failed for $worktree_name — aborting this run, producing no row" >&2
		git -C "$REPO_ROOT" worktree remove -q --force "$worktree_path" 2>/dev/null || true
		return 1
	fi

	base_sha="$(git -C "$worktree_path" rev-parse HEAD)"

	if [ "$arm" = "control" ]; then
		export PRISM_HOOK_DISABLE=1
	else
		unset PRISM_HOOK_DISABLE || true
	fi

	exit_status="ok"
	void_reason="-"

	# Portable 600s timeout — neither `timeout` nor `gtimeout` exists on this
	# machine (verified 2026-08-02), so wrap with perl's alarm rather than
	# assume coreutils. Perl's `alarm` delivers SIGALRM, which a killed child
	# reports as exit code 142 (128 + SIGALRM's signal number 14) — that is
	# the only exit code that means "the 600s ceiling actually fired." Any
	# other non-zero exit is a real, fast failure (e.g. an auth error) and
	# must not be recorded as a timeout, or a poisoned row looks identical to
	# a run that legitimately ran the full 600s.
	run_exit_code=0
	(
		cd "$worktree_path" && \
		perl -e 'alarm shift; exec @ARGV' 600 \
			"$CLAUDE_BIN" -p "$(cat "$prompt_file")" \
			--model "$MODEL" \
			--session-id "$session_id" \
			--permission-mode bypassPermissions \
			--setting-sources project \
			--output-format json \
			--max-budget-usd "$BUDGET" \
			> "$worktree_path/response.json" 2> "$worktree_path/stderr.log"
	) || run_exit_code=$?

	if [ "$run_exit_code" -eq 142 ]; then
		exit_status="timeout"
		void_reason="timeout"
	elif [ "$run_exit_code" -ne 0 ]; then
		exit_status="error:$run_exit_code"
	fi

	unset PRISM_HOOK_DISABLE || true

	# changed-files.txt: union of tracked diff-from-base and new untracked
	# files, exactly what grade.ts's contract expects.
	{
		git -C "$worktree_path" diff --name-only "$base_sha" 2>/dev/null || true
		git -C "$worktree_path" ls-files --others --exclude-standard 2>/dev/null || true
	} | sort -u > "$worktree_path/changed-files.txt"

	grade_json="$(npx tsx "$SCRIPT_DIR/grade.ts" --dir "$worktree_path" --prompt "$prompt" --arm "$arm" --session-id "$session_id" 2>>"$worktree_path/stderr.log" || echo '{}')"

	hook_fired="$(json_field "$grade_json" hookFired)"
	criteria_passed="$(json_field "$grade_json" criteriaPassed)"
	criteria_total="$(json_field "$grade_json" criteriaTotal)"
	positive_control_ok="$(json_field "$grade_json" positiveControlOk)"
	injected_docs="$(json_array_field "$grade_json" injectedDocs)"

	if [ "$void_reason" = "-" ] && [ "$positive_control_ok" != "true" ]; then
		void_reason="positive_control"
	fi

	printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
		"$DATE_STAMP" "$prompt" "$arm" "$run_index" "$MODEL" "$session_id" \
		"$exit_status" "${hook_fired:--}" "${injected_docs:--}" \
		"${criteria_passed:-0}" "${criteria_total:-0}" "$void_reason" \
		>> "$RESULTS_FILE"

	git -C "$REPO_ROOT" worktree remove -q --force "$worktree_path" 2>/dev/null || true
}

prompt_slug() {
	case "$1" in
		p1) echo "architect-doc" ;;
		p2) echo "canonical-file" ;;
		p3) echo "control" ;;
	esac
}

# Minimal field extraction from grade.ts's JSON output — no dependency, the
# shape is fixed and flat enough for a targeted grep.
json_field() {
	printf '%s' "$1" | grep -o "\"$2\": *[^,}]*" | head -1 | sed -E 's/.*: *"?([^"]*)"?$/\1/'
}

json_array_field() {
	printf '%s' "$1" | grep -o "\"$2\": *\[[^]]*\]" | head -1 | sed -E 's/.*\[(.*)\]/\1/' | tr -d '"' | tr ',' ';'
}

# --- the matrix: 3 prompts x 2 arms x RUNS_PER_CELL ---
for prompt in p1 p2 p3; do
	for arm in control variant; do
		i=1
		while [ "$i" -le "$RUNS_PER_CELL" ]; do
			run_one "$prompt" "$arm" "$i"
			i=$((i + 1))
		done
	done
done

echo "run.sh: wrote $RESULTS_FILE"
