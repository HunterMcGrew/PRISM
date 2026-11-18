/**
 * Contract tests for the compaction arms in `hooks/compact-handoff.mjs`: the
 * `PreCompact` summary template, the `SessionStart` post-compact note, plan
 * lookup from the branch's ticket ID, and the silent paths. The spawned leg
 * runs the real `hook.mjs` entry point, because the registration reaches the
 * arms only through its `--event` dispatch.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

import {
	findPlanForBranch,
	formatStatus,
	runPreCompactArm,
	runSessionStartArm,
} from "./hooks/compact-handoff.mjs";

const HOOK_ENTRY = path.join(path.dirname(fileURLToPath(import.meta.url)), "hooks", "hook.mjs");

const SUMMARY_HEADINGS = [
	"## Continue from",
	"## User framing and corrections",
	"## Unrecorded decisions (not in the plan yet)",
	"## Open threads",
	"## Dead ends",
	"## Active skill and in-flight work",
	"## Live state",
	"## Artifacts",
];

/** Builds a git repo with a PRISM install marker, a config, and the given branch checked out. */
function makeRepo(branch: string, ticketPrefix = "ACME"): string {
	const root = mkdtempSync(path.join(os.tmpdir(), "compact-handoff-"));
	mkdirSync(path.join(root, ".prism", "architect"), { recursive: true });
	writeFileSync(path.join(root, ".prism", "architect", "manifest.json"), "{}\n");
	mkdirSync(path.join(root, ".ai-skills"), { recursive: true });
	writeFileSync(
		path.join(root, ".ai-skills", "config.json"),
		JSON.stringify({ ticketPrefix })
	);
	execFileSync("git", ["init", "-q", "-b", branch, root]);
	return root;
}

function writePlan(root: string, relative: string): void {
	mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
	writeFileSync(path.join(root, relative), "# Plan\n");
}

test("PreCompact returns the eight-section template with live branch and status", async () => {
	const root = makeRepo("dev/acme-12-thing");
	try {
		writeFileSync(path.join(root, "dirty.txt"), "x");
		const output = await runPreCompactArm(
			JSON.stringify({ hook_event_name: "PreCompact", cwd: root, trigger: "auto" })
		);

		assert.ok(output);
		for (const heading of SUMMARY_HEADINGS) {
			assert.ok(output.includes(heading), `template carries ${heading}`);
		}
		assert.ok(output.includes("- Branch: dev/acme-12-thing"));
		assert.ok(output.includes("?? dirty.txt"), "status comes from git, not memory");
		assert.ok(output.length < 10_000, "stays under the PreCompact stdout cap");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("PreCompact from a subdirectory names the ticket's plan and says to point at it", async () => {
	const root = makeRepo("dev/acme-12-thing");
	try {
		writePlan(root, ".prism/plans/acme-12.md");
		mkdirSync(path.join(root, "src"));
		const output = await runPreCompactArm(
			JSON.stringify({ hook_event_name: "PreCompact", cwd: path.join(root, "src") })
		);

		assert.ok(output?.includes("- Branch plan: .prism/plans/acme-12.md"));
		assert.ok(output?.includes("Point at that path instead."));
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("PreCompact on a branch with no ticket ID keeps every decision in the summary", async () => {
	const root = makeRepo("scratch");
	try {
		const output = await runPreCompactArm(JSON.stringify({ cwd: root }));

		assert.ok(output?.includes("- Branch plan: none found\n"));
		assert.ok(!output?.includes("by filename"));
		assert.ok(
			output?.includes(
				"No plan file was found for this branch's ticket, by name, by ticket field, or in the archive,"
			)
		);
		assert.ok(output?.includes("Keep all of them."));
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("findPlanForBranch follows plan-lookup order and matches only the configured prefix", () => {
	const root = makeRepo("main");
	try {
		writePlan(root, ".prism/plans/epic-acme-7.md");
		writePlan(root, ".prism/archived/plans/acme-9.md");

		assert.equal(findPlanForBranch(root, "dev/ACME-7-x"), ".prism/plans/epic-acme-7.md");
		assert.equal(findPlanForBranch(root, "dev/acme-9-x"), ".prism/archived/plans/acme-9.md");

		writePlan(root, ".prism/plans/acme-7.md");
		assert.equal(
			findPlanForBranch(root, "dev/acme-7-x"),
			".prism/plans/acme-7.md",
			"a ticket plan wins over an epic plan"
		);

		assert.equal(findPlanForBranch(root, "dev/acme-70-x"), null, "acme-7 is not a prefix match for acme-70");
		assert.equal(findPlanForBranch(root, "dev/notacme-7"), null, "the prefix needs a word boundary");
		assert.equal(findPlanForBranch(root, "hook-pr-896bdc"), null);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("findPlanForBranch resolves a plan folder to its latest-stage file", () => {
	const root = makeRepo("main");
	try {
		writePlan(root, ".prism/plans/acme-7/intent.md");
		assert.equal(findPlanForBranch(root, "dev/acme-7-x"), ".prism/plans/acme-7/intent.md");

		writePlan(root, ".prism/plans/acme-7/plan.md");
		assert.equal(findPlanForBranch(root, "dev/acme-7-x"), ".prism/plans/acme-7/plan.md");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("findPlanForBranch finds a flat plan by its ## Ticket section", () => {
	const root = makeRepo("main");
	try {
		mkdirSync(path.join(root, ".prism", "plans"), { recursive: true });
		writeFileSync(path.join(root, ".prism", "plans", "notes.md"), "## Ticket\n\nACME-8\n");

		assert.equal(findPlanForBranch(root, "dev/acme-8-x"), ".prism/plans/notes.md");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("findPlanForBranch prefers a live folder plan over an archived flat plan of the same id", () => {
	const root = makeRepo("main");
	try {
		writePlan(root, ".prism/archived/plans/acme-7.md");
		writePlan(root, ".prism/plans/acme-7/spec.md");

		assert.equal(findPlanForBranch(root, "dev/acme-7-x"), ".prism/plans/acme-7/spec.md");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("SessionStart prints the post-compact note only for source compact", async () => {
	const root = makeRepo("dev/acme-12-thing");
	try {
		writePlan(root, ".prism/plans/acme-12.md");
		const note = await runSessionStartArm(JSON.stringify({ source: "compact", cwd: root }));

		assert.ok(note?.startsWith("Context was compacted."));
		assert.ok(note?.includes("Re-read .prism/plans/acme-12.md in full."));
		assert.equal(await runSessionStartArm(JSON.stringify({ source: "startup", cwd: root })), null);
		assert.equal(await runSessionStartArm(JSON.stringify({ source: "resume", cwd: root })), null);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("both arms stay silent outside a PRISM install, on bad input, and under the kill switch", async () => {
	const outside = mkdtempSync(path.join(os.tmpdir(), "compact-handoff-outside-"));
	const root = makeRepo("main");
	try {
		assert.equal(await runPreCompactArm(JSON.stringify({ cwd: outside })), null);
		assert.equal(await runPreCompactArm("not json"), null);

		process.env.PRISM_HOOK_DISABLE = "1";
		assert.equal(await runPreCompactArm(JSON.stringify({ cwd: root })), null);
		assert.equal(await runSessionStartArm(JSON.stringify({ source: "compact", cwd: root })), null);
	} finally {
		delete process.env.PRISM_HOOK_DISABLE;
		rmSync(outside, { recursive: true, force: true });
		rmSync(root, { recursive: true, force: true });
	}
});

test("hook.mjs dispatches --event=PreCompact and --event=SessionStart and exits 0", () => {
	const root = makeRepo("main");
	try {
		const run = (event: string, payload: string) =>
			spawnSync("node", [HOOK_ENTRY, "--tool=claude", `--event=${event}`], {
				input: payload,
				encoding: "utf8",
			});

		const preCompact = run("PreCompact", JSON.stringify({ cwd: root }));
		assert.equal(preCompact.status, 0);
		assert.ok(preCompact.stdout.includes("## Continue from"));

		const sessionStart = run("SessionStart", JSON.stringify({ source: "compact", cwd: root }));
		assert.equal(sessionStart.status, 0);
		assert.ok(sessionStart.stdout.startsWith("Context was compacted."));

		const malformed = run("PreCompact", "not json");
		assert.equal(malformed.status, 0, "a malformed payload never blocks the compaction");
		assert.equal(malformed.stdout, "");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("formatStatus caps the listing at 40 lines and never reports a failed git call as clean", () => {
	const fiftyFiles = Array.from({ length: 50 }, (_, index) => `?? file-${index}.txt`).join("\n");
	const shown = formatStatus(fiftyFiles).split("\n");

	assert.equal(shown.length, 41);
	assert.equal(shown[40], "… 10 more");
	assert.equal(formatStatus(""), "(clean)");
	assert.ok(formatStatus(null).startsWith("(git status unavailable"));
});

test("PreCompact stays under the 10,000-character cap with a status past the line limit", async () => {
	const root = makeRepo("dev/acme-12-a-branch-name-long-enough-to-matter");
	try {
		for (let index = 0; index < 200; index += 1) {
			writeFileSync(path.join(root, `untracked-file-with-a-long-name-${index}.txt`), "x");
		}
		const output = await runPreCompactArm(JSON.stringify({ cwd: root }));

		assert.match(output ?? "", /^… 16\d more$/m, "the listing past 40 lines collapses to a count");
		assert.ok(output !== null && output.length < 10_000);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("PreCompact outside a git checkout labels the branch and the status as unknown", async () => {
	const root = makeRepo("main");
	try {
		rmSync(path.join(root, ".git"), { recursive: true, force: true });
		const output = await runPreCompactArm(JSON.stringify({ cwd: root }));

		assert.ok(output?.includes("- Branch: (detached HEAD or not a git checkout)"));
		assert.ok(output?.includes("(git status unavailable"));
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("SessionStart on a filename miss sends the session to the full plan lookup", async () => {
	const root = makeRepo("scratch");
	try {
		const note = await runSessionStartArm(JSON.stringify({ source: "compact", cwd: root }));

		assert.ok(note?.includes("`.prism/rules/branch-plan.md` § Plan Lookup"));
		assert.ok(note?.includes("do not create a plan to hold the summary"));
		assert.ok(!note?.includes("Re-read .prism/plans/"), "a miss never names a plan path");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("the PostCompact arm prints nothing to stdout, leaving PreCompact stdout to one writer", () => {
	const root = makeRepo("main");
	try {
		const postCompact = spawnSync("node", [HOOK_ENTRY, "--tool=claude", "--event=PostCompact"], {
			input: JSON.stringify({ session_id: "session-1", cwd: root }),
			encoding: "utf8",
		});

		assert.equal(postCompact.status, 0);
		assert.equal(postCompact.stdout, "");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
