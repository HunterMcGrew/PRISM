import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sectionBody } from "./hooks/plan/frontmatter.mjs";
import { isDirectCliEntry } from "./lib/cli-entry";

/**
 * Fails a closed folder plan whose `Retro:` line is empty or names no file.
 *
 * A plan is checked once it carries a dated `> Closed: <date>` line before its
 * first `##` heading, because the close step writes that line and the `Retro:`
 * line together. A value with no whitespace, backticks stripped, is read as a
 * path from the repo root and must name a regular file. A value holding
 * whitespace is not a path, so `none — no trigger` and older prose lines pass.
 * Review lines are never read.
 *
 * Only live folder plans are read: `.prism/archived/`, epic folders, and flat
 * plans are skipped, because their retro stays declinable or lives in a
 * different file.
 *
 * This is PRISM's own lint, run by `prism:check`. It is not delivered to a
 * consumer.
 */

const PLANS_ROOT = ".prism/plans";

const CLOSED_LINE = /^>\s*Closed:\s*\d{4}-\d{2}-\d{2}/;

const RETRO_LINE = /^>?\s*Retro:/;

/**
 * Returns the repo-relative path of each closed live folder plan whose
 * `Retro:` line is missing, empty, or a single token naming no regular file,
 * sorted.
 */
export async function findEmptyRetroLines(repoRoot: string): Promise<string[]> {
	const failing: string[] = [];

	for (const planPath of await findFolderPlans(repoRoot)) {
		const text = await fs.readFile(path.join(repoRoot, planPath), "utf8");

		if (holdsClosedLine(text) && !(await acceptsRetroValue(repoRoot, retroValue(text)))) {
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

function holdsClosedLine(text: string): boolean {
	for (const line of text.split("\n")) {
		if (/^##\s/.test(line)) {
			return false;
		}

		if (CLOSED_LINE.test(line)) {
			return true;
		}
	}

	return false;
}

async function acceptsRetroValue(repoRoot: string, value: string): Promise<boolean> {
	if (value === "") {
		return false;
	}

	if (/\s/.test(value)) {
		return true;
	}

	try {
		return (await fs.stat(path.join(repoRoot, value.replaceAll("`", "")))).isFile();
	} catch {
		return false;
	}
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
		console.error(`plan-retro-line: ${planPath}: closed and Retro: is empty or names no file`);
	}

	if (failing.length > 0) {
		process.exitCode = 1;
	}
}

if (isDirectCliEntry("plan-retro-line")) {
	void main();
}
