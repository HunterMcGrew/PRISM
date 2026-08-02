#!/usr/bin/env tsx
/**
 * Mechanical grader for the hook adherence A/B harness (plan
 * `context-delivery-mechanism.md` task 9).
 *
 * Grades one run's resulting worktree against the criteria for whichever
 * prompt (`p1`, `p2`, `p3`) produced it, plus the positive control that
 * proves the architect-context hook actually fired. Every criterion is a
 * path assertion or a text grep — nothing here turns on taste, so a run is
 * always AFK-gradeable.
 *
 * Contract for the graded directory (a run's worktree, or a fixture standing
 * in for one): the directory root is treated as the repo root of that run.
 * It is expected to contain:
 *
 * - `changed-files.txt` — one repo-relative path per line, the union of every
 *   file the run touched (tracked modifications plus new untracked files).
 *   `run.sh` writes this from `git diff --name-only <base-sha>` plus
 *   `git ls-files --others --exclude-standard` before invoking this grader;
 *   the fixtures under `fixtures/` hand-author the same file.
 * - `response.json` (optional) — the raw `claude -p --output-format json`
 *   output, read for criteria that grade what the agent said rather than
 *   what it touched.
 * - The real repo-relative paths this prompt's criteria inspect (e.g.
 *   `.prism/architect/manifest.json`), present with their post-run content.
 * - `.prism/architect-route-state.<session_id>.json`, present only when the
 *   hook fired this session — absence is itself a graded fact.
 *
 * Run standalone against a graded directory:
 *
 *   npx tsx grade.ts --dir <path> --prompt p1|p2|p3 --arm control|variant [--session-id <id>]
 *
 * Or self-test against the committed fixtures:
 *
 *   npx tsx grade.ts --self-test
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type Arm = "control" | "variant";
export type Prompt = "p1" | "p2" | "p3";

export interface Criterion {
	name: string;
	passed: boolean;
}

export interface GradeResult {
	prompt: Prompt;
	arm: Arm;
	hookFired: "yes" | "no";
	injectedDocs: string[];
	positiveControlOk: boolean;
	criteria: Criterion[];
	criteriaPassed: number;
	criteriaTotal: number;
}

/** The doc every variant-arm P1/P2 run must show in its state file's `injected` array. */
const INSTALL_LAYOUT_DOC = "_toolkit/install-layout.md";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

/**
 * Reads `changed-files.txt` from the graded directory as a set of
 * repo-relative paths. Missing file reads as no changes — a run that
 * touched nothing is a legitimate (if adherence-failing) outcome, not a
 * grader error.
 */
function readChangedFiles(dir: string): Set<string> {
	const filePath = path.join(dir, "changed-files.txt");
	if (!existsSync(filePath)) {
		return new Set();
	}

	return new Set(
		readFileSync(filePath, "utf8")
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
	);
}

/**
 * Reads the agent's response text out of `response.json`, tolerating both a
 * parseable `{"result": "..."}` shape (Claude Code's `--output-format json`)
 * and a plain-text fallback — a grep-based criterion only needs the text to
 * search, not a validated schema.
 */
function readResponseText(dir: string): string {
	const filePath = path.join(dir, "response.json");
	if (!existsSync(filePath)) {
		return "";
	}

	const raw = readFileSync(filePath, "utf8");
	try {
		const parsed = JSON.parse(raw) as { result?: unknown };
		if (typeof parsed.result === "string") {
			return parsed.result;
		}
	} catch {
		// Not valid JSON — fall through and grep the raw text.
	}

	return raw;
}

/**
 * Locates the architect-route session state file inside the graded
 * directory. An explicit `sessionId` targets the exact path the hook would
 * have written; without one (fixtures, ad hoc grading) this globs `.prism/`
 * for the one state file a single-session run can have.
 */
function findStateFile(dir: string, sessionId: string | undefined): string | null {
	if (sessionId !== undefined) {
		const exact = path.join(dir, ".prism", `architect-route-state.${sessionId}.json`);
		return existsSync(exact) ? exact : null;
	}

	const prismDir = path.join(dir, ".prism");
	if (!existsSync(prismDir)) {
		return null;
	}

	const match = readdirSync(prismDir).find(
		(entry) => entry.startsWith("architect-route-state.") && entry.endsWith(".json")
	);
	return match ? path.join(prismDir, match) : null;
}

/**
 * Grades the positive control: whether the hook's own session state file
 * proves it fired, against what this run's arm and prompt expect.
 *
 * Variant-arm P1/P2 must show the state file with `install-layout.md` in its
 * `injected` array — that is the hook actually routing this run's target
 * file. Control-arm runs, every prompt, must show no state file — the kill
 * switch returns before any write. Variant-arm P3 carries no expectation
 * either way, per task 9: its own target has no route, but the agent may
 * read other files that do.
 */
function gradePositiveControl(
	dir: string,
	arm: Arm,
	prompt: Prompt,
	sessionId: string | undefined
): { hookFired: "yes" | "no"; injectedDocs: string[]; positiveControlOk: boolean } {
	const stateFile = findStateFile(dir, sessionId);
	let injectedDocs: string[] = [];

	if (stateFile) {
		try {
			const state = JSON.parse(readFileSync(stateFile, "utf8")) as { injected?: unknown };
			if (Array.isArray(state.injected)) {
				injectedDocs = state.injected.filter((entry): entry is string => typeof entry === "string");
			}
		} catch {
			// Unparseable state file — treat as no confirmed injections, same
			// tolerance the hook itself applies to its own state file.
		}
	}

	const hookFired: "yes" | "no" = stateFile !== null ? "yes" : "no";

	if (arm === "control") {
		return { hookFired, injectedDocs, positiveControlOk: hookFired === "no" };
	}

	if (prompt === "p3") {
		return { hookFired, injectedDocs, positiveControlOk: true };
	}

	const positiveControlOk = hookFired === "yes" && injectedDocs.includes(INSTALL_LAYOUT_DOC);
	return { hookFired, injectedDocs, positiveControlOk };
}

/**
 * P1 criteria — new architect doc under `_toolkit/`, routed through the live
 * manifest. Governed by install-layout.md § "Ownership is path-decidable".
 */
function gradeP1(dir: string): Criterion[] {
	const changed = readChangedFiles(dir);
	const flatDocPattern = /^\.prism\/architect\/[^/]+\.md$/;
	const toolkitDocPattern = /^\.prism\/architect\/_toolkit\/.+\.md$/;

	const newToolkitDocs = [...changed].filter((file) => toolkitDocPattern.test(file));
	const newFlatDocs = [...changed].filter(
		(file) => flatDocPattern.test(file) && file !== ".prism/architect/manifest.json"
	);

	const manifestChanged = changed.has(".prism/architect/manifest.json");
	const manifestPath = path.join(dir, ".prism", "architect", "manifest.json");
	const manifestContent = existsSync(manifestPath) ? readFileSync(manifestPath, "utf8") : "";
	const manifestReferencesNewDoc = newToolkitDocs.some((docPath) =>
		manifestContent.includes(docPath.replace(/^\.prism\/architect\//, ""))
	);

	return [
		{
			name: "new doc created under .prism/architect/_toolkit/, not flat .prism/architect/",
			passed: newToolkitDocs.length > 0 && newFlatDocs.length === 0,
		},
		{
			name: "a route for the new doc is added to manifest.json",
			passed: manifestReferencesNewDoc,
		},
		{
			name: "the route lands in the live manifest.json, not only manifest.base.json",
			passed: manifestChanged,
		},
	];
}

/**
 * P2 criteria — the adherent answer refuses the literal instruction and
 * rebuilds instead of hand-editing the generated Cursor mirror. Governed by
 * install-layout.md § "The bifurcation".
 */
function gradeP2(dir: string): Criterion[] {
	const changed = readChangedFiles(dir);
	const responseText = readResponseText(dir);

	return [
		{
			name: ".cursor/rules/code-comments.mdc is not hand-edited",
			passed: !changed.has(".cursor/rules/code-comments.mdc"),
		},
		{
			name: "the response or a commit names pnpm prism:build as the mechanism",
			passed: /prism:build/i.test(responseText),
		},
		{
			name: ".prism/rules/code-comments.md is left unmodified",
			passed: !changed.has(".prism/rules/code-comments.md"),
		},
	];
}

/**
 * P3 criterion — the negative control. Both arms must score identically;
 * separation here means the harness is measuring run-to-run variance, not
 * the hook. Governed by code-standards.md § Whitespace ("Remove double
 * blank lines"), a Tier-1 rule that reaches both arms via the generated
 * `AGENTS.md` block regardless of whether the hook fires.
 */
function gradeP3(dir: string): Criterion[] {
	const readmePath = path.join(dir, "README.md");
	const content = existsSync(readmePath) ? readFileSync(readmePath, "utf8") : "";

	return [
		{
			name: "README.md carries no doubled blank lines",
			passed: !content.includes("\n\n\n"),
		},
	];
}

const GRADERS: Record<Prompt, (dir: string) => Criterion[]> = {
	p1: gradeP1,
	p2: gradeP2,
	p3: gradeP3,
};

/**
 * Grades one run's directory against its prompt's criteria and the positive
 * control, returning the full per-criterion result the results TSV row is
 * built from.
 */
export function gradeRun(
	dir: string,
	prompt: Prompt,
	arm: Arm,
	sessionId?: string
): GradeResult {
	const criteria = GRADERS[prompt](dir);
	const { hookFired, injectedDocs, positiveControlOk } = gradePositiveControl(
		dir,
		arm,
		prompt,
		sessionId
	);

	return {
		prompt,
		arm,
		hookFired,
		injectedDocs,
		positiveControlOk,
		criteria,
		criteriaPassed: criteria.filter((c) => c.passed).length,
		criteriaTotal: criteria.length,
	};
}

/**
 * Proves the grader itself before any real run is graded by it. Runs P2
 * against the three committed fixtures under `fixtures/` and asserts the
 * exact expected shape of each result — including the positive control, so
 * a fixture without a working state-file check cannot pass silently.
 */
function runSelfTest(): boolean {
	const fixturesDir = path.join(SCRIPT_DIR, "fixtures");
	let ok = true;

	function check(label: string, condition: boolean): void {
		console.log(`${condition ? "PASS" : "FAIL"} — ${label}`);
		if (!condition) {
			ok = false;
		}
	}

	const adherent = gradeRun(path.join(fixturesDir, "p2-adherent"), "p2", "variant");
	check("p2-adherent: all 3 criteria pass", adherent.criteriaPassed === 3 && adherent.criteriaTotal === 3);
	check("p2-adherent: hook_fired=yes", adherent.hookFired === "yes");
	check(
		"p2-adherent: injected_docs contains install-layout.md",
		adherent.injectedDocs.includes(INSTALL_LAYOUT_DOC)
	);
	check("p2-adherent: positive control ok", adherent.positiveControlOk);

	const nonAdherent = gradeRun(path.join(fixturesDir, "p2-non-adherent"), "p2", "variant");
	check(
		"p2-non-adherent: exactly 1 of 3 criteria pass (unmodified canonical only)",
		nonAdherent.criteriaPassed === 1 && nonAdherent.criteriaTotal === 3
	);
	check("p2-non-adherent: hook_fired=yes (hook still fired; the answer was just wrong)", nonAdherent.hookFired === "yes");
	check("p2-non-adherent: positive control ok", nonAdherent.positiveControlOk);

	const control = gradeRun(path.join(fixturesDir, "p2-control"), "p2", "control");
	check("p2-control: hook_fired=no (kill switch, no state file)", control.hookFired === "no");
	check("p2-control: positive control ok", control.positiveControlOk);
	check("p2-control: injected_docs empty", control.injectedDocs.length === 0);

	return ok;
}

/** Minimal flag parser — no new dependency for a handful of `--key value` pairs. */
function parseArgs(argv: string[]): Record<string, string | boolean> {
	const args: Record<string, string | boolean> = {};
	for (let i = 0; i < argv.length; i++) {
		const token = argv[i];
		if (!token.startsWith("--")) {
			continue;
		}
		const key = token.slice(2);
		const next = argv[i + 1];
		if (next !== undefined && !next.startsWith("--")) {
			args[key] = next;
			i++;
		} else {
			args[key] = true;
		}
	}
	return args;
}

function isPrompt(value: unknown): value is Prompt {
	return value === "p1" || value === "p2" || value === "p3";
}

function isArm(value: unknown): value is Arm {
	return value === "control" || value === "variant";
}

function main(): void {
	const args = parseArgs(process.argv.slice(2));

	if (args["self-test"]) {
		const ok = runSelfTest();
		process.exitCode = ok ? 0 : 1;
		return;
	}

	const dir = args.dir;
	const prompt = args.prompt;
	const arm = args.arm;
	const sessionId = typeof args["session-id"] === "string" ? args["session-id"] : undefined;

	if (typeof dir !== "string" || !isPrompt(prompt) || !isArm(arm)) {
		console.error(
			"usage: grade.ts --dir <path> --prompt p1|p2|p3 --arm control|variant [--session-id <id>]\n" +
				"       grade.ts --self-test"
		);
		process.exitCode = 1;
		return;
	}

	const result = gradeRun(dir, prompt, arm, sessionId);
	console.log(JSON.stringify(result, null, "\t"));
	process.exitCode = 0;
}

const isEntryPoint =
	process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntryPoint) {
	main();
}
