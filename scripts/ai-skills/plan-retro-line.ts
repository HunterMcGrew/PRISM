import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sectionBody } from "./hooks/plan/frontmatter.mjs";
import { isDirectCliEntry } from "./lib/cli-entry";

/**
 * Fails a folder plan whose PR review has given its final verdict while its
 * `Retro:` line is still empty.
 *
 * The retro is the fixed last stage of a folder plan, so a plan that reached
 * its final PR-review verdict and carries no retro line was left unfinished.
 * Only live folder plans are read: `.prism/archived/`, epic folders, and flat
 * plans are skipped, because their retro stays declinable or lives in a
 * different file.
 *
 * The final verdict is the last `pr-review` line under `## Review`, and it is
 * final when that line is a `confirm` line or a `round` line whose verdict
 * reads exactly `clean`. A round with open counts means fixes and another
 * round are coming, so the retro is not due yet.
 *
 * This is PRISM's own lint, run by `prism:check`. It is not delivered to a
 * consumer.
 */

const PLANS_ROOT = ".prism/plans";

const PR_REVIEW_LINE = /^\s*-\s*pr-review (round \d+|confirm) at \S+:\s*(.*)$/;

const RETRO_LINE = /^>?\s*Retro:/;

/**
 * Returns the repo-relative path of each live folder plan whose final
 * PR-review verdict is recorded and whose `Retro:` line is missing or empty,
 * sorted.
 */
export async function findEmptyRetroLines(repoRoot: string): Promise<string[]> {
	const failing: string[] = [];

	for (const planPath of await findFolderPlans(repoRoot)) {
		const text = await fs.readFile(path.join(repoRoot, planPath), "utf8");

		if (hasFinalPrReviewVerdict(text) && retroValue(text) === "") {
			failing.push(planPath);
		}
	}

	return failing.sort();
}

async function findFolderPlans(repoRoot: string): Promise<string[]> {
	let entries;

	try {
		entries = await fs.readdir(path.join(repoRoot, PLANS_ROOT), {
			withFileTypes: true,
		});
	} catch {
		return [];
	}

	const plans: string[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name.startsWith("epic-")) {
			continue;
		}

		const planPath = `${PLANS_ROOT}/${entry.name}/plan.md`;

		try {
			if ((await fs.stat(path.join(repoRoot, planPath))).isFile()) {
				plans.push(planPath);
			}
		} catch {
			continue;
		}
	}

	return plans;
}

function hasFinalPrReviewVerdict(text: string): boolean {
	const lines = (sectionBody(text, "Review") ?? "")
		.split("\n")
		.map((line) => PR_REVIEW_LINE.exec(line))
		.filter((match): match is RegExpExecArray => match !== null);
	const last = lines.at(-1);

	if (last === undefined) {
		return false;
	}

	return last[1] === "confirm" || (last[2] ?? "").trim() === "clean";
}

/**
 * The text after the colon of the last `Retro:` line under `## PR Readiness`,
 * or an empty string when the line is absent or holds only whitespace.
 */
function retroValue(text: string): string {
	const lines = (sectionBody(text, "PR Readiness") ?? "")
		.split("\n")
		.filter((line) => RETRO_LINE.test(line));
	const last = lines.at(-1);

	return last === undefined ? "" : last.replace(RETRO_LINE, "").trim();
}

async function main(): Promise<void> {
	const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
	const failing = await findEmptyRetroLines(repoRoot);

	for (const planPath of failing) {
		console.error(`plan-retro-line: ${planPath}: PR review recorded and Retro: is empty`);
	}

	if (failing.length > 0) {
		process.exitCode = 1;
	}
}

if (isDirectCliEntry("plan-retro-line")) {
	void main();
}
