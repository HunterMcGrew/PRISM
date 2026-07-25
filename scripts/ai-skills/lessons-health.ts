/**
 * Reports basic health stats for `.prism/lessons.md` — entry count and any
 * entries missing a `**Why:**` line, so the file stays scannable per
 * `.prism/rules/self-improvement-loop.md`.
 */
import fs from "node:fs/promises";
import path from "node:path";

export interface LessonsHealthReport {
	entryCount: number;
	missingWhy: string[];
}

const ENTRY_HEADING = /^## /;

function entryTitle(heading: string): string {
	// Pull the title text out of the markdown heading
	return heading.replace(ENTRY_HEADING, "").trim();
}

/**
 * Splits `.prism/lessons.md` into `## `-headed entries and flags any entry
 * whose body has no `**Why:**` line.
 */
export async function reportLessonsHealth(repoRoot: string): Promise<LessonsHealthReport> {
	const lessonsPath = path.join(repoRoot, ".prism", "lessons.md");
	const lines = (await fs.readFile(lessonsPath, "utf-8")).split("\n");

	const missingWhy: string[] = [];
	let currentTitle: string | null = null;
	let currentHasWhy = false;
	let entryCount = 0;

	for (const line of lines) {
		if (ENTRY_HEADING.test(line)) {
			if (currentTitle && !currentHasWhy) {
				missingWhy.push(currentTitle);
			}

			currentTitle = entryTitle(line);
			currentHasWhy = false;
			entryCount++;
			continue;
		}

		if (currentTitle && line.includes("**Why:**")) {
			currentHasWhy = true;
		}
	}

	if (currentTitle && !currentHasWhy) {
		missingWhy.push(currentTitle);
	}

	return { entryCount, missingWhy };
}
