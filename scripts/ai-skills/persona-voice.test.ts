/**
 * Holds every persona skill to the Voice shape in ADR-0084: one `## Voice`
 * block as the first `## ` section of `shared.md`, holding an identity line, a
 * tone line, three or four signature lines, and a greeting that a subagent
 * skips. No `claude.md` and no utility or agent skill file carries a Voice
 * section. Run via `pnpm prism:test`.
 *
 * The check sees only the shape. The 12-line target and the rule that a block
 * holds no rule from the skill's body stay a reviewer's to hold.
 */
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");

interface RoleEntry {
	id: string;
	persona?: string;
	type?: "persona" | "utility" | "agent";
}

async function loadRoles(): Promise<RoleEntry[]> {
	const raw = await fs.readFile(
		path.join(repoRoot, ".ai-skills", "definitions", "roles.json"),
		"utf8"
	);
	return (JSON.parse(raw) as { skills: RoleEntry[] }).skills;
}

/** Returns the lines of one of a skill's body files, or an empty list when the file does not exist. */
async function readSkillLines(id: string, file = "shared.md"): Promise<string[]> {
	try {
		const text = await fs.readFile(path.join(repoRoot, ".ai-skills", "skills", id, file), "utf8");
		return text.split("\n");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return [];
		}

		throw error;
	}
}

/** Returns the lines from the `## Voice` heading up to the next `## ` line, or the end of the file. */
function extractVoiceSection(lines: string[]): string[] {
	const start = lines.indexOf("## Voice");
	if (start === -1) {
		return [];
	}

	const next = lines.findIndex((line, index) => index > start && line.startsWith("## "));
	return lines.slice(start, next === -1 ? undefined : next);
}

function findVoiceShapeFailures(persona: string, lines: string[]): string[] {
	const failures: string[] = [];
	const headings = lines.filter((line) => line === "## Voice").length;
	if (headings !== 1) {
		return [`has ${headings} lines equal to "## Voice", expected 1`];
	}

	if (lines.find((line) => line.startsWith("## ")) !== "## Voice") {
		failures.push("`## Voice` is not the first `## ` section of the file");
	}

	const section = extractVoiceSection(lines);
	if (!section.some((line) => line.startsWith(`You are **${persona}** (`))) {
		failures.push(`the Voice section has no line starting "You are **${persona}** ("`);
	}

	if (!section.some((line) => line.startsWith("**Tone, in chat"))) {
		failures.push('the Voice section has no line starting "**Tone, in chat"');
	}

	const signatures = section.filter((line) => line.startsWith("- ")).length;
	if (signatures < 3 || signatures > 4) {
		failures.push(`the Voice section has ${signatures} signature lines, expected 3 or 4`);
	}

	const greetings = section.filter((line) => line.includes("subagent"));
	if (greetings.length !== 1 || !greetings[0].includes("Skip")) {
		failures.push('the Voice section needs exactly one line with "subagent", and it must contain "Skip"');
	}

	return failures;
}

test("every persona skill opens with one Voice block in the ADR-0084 shape", async () => {
	const failures: string[] = [];
	for (const role of (await loadRoles()).filter((entry) => entry.persona)) {
		const lines = await readSkillLines(role.id);
		for (const reason of findVoiceShapeFailures(role.persona as string, lines)) {
			failures.push(`${role.id}: ${reason}`);
		}

		if ((await readSkillLines(role.id, "claude.md")).includes("## Voice")) {
			failures.push(`${role.id}: claude.md has a "## Voice" line`);
		}
	}

	assert.deepEqual(failures, []);
});

test("no utility or agent skill carries a Voice block", async () => {
	const carriers: string[] = [];
	for (const role of (await loadRoles()).filter(
		(entry) => entry.type === "utility" || entry.type === "agent"
	)) {
		for (const file of ["shared.md", "claude.md"]) {
			if ((await readSkillLines(role.id, file)).includes("## Voice")) {
				carriers.push(`${role.id}/${file}`);
			}
		}
	}

	assert.deepEqual(carriers, []);
});

test("Eric's tone line keeps his voice out of his GitHub comments", async () => {
	const section = extractVoiceSection(await readSkillLines("prism-pr-review"));
	const toneLine = section.find((line) => line.startsWith("**Tone, in chat"));

	assert.ok(toneLine?.includes("never in the comments"), `tone line was: ${toneLine}`);
});
