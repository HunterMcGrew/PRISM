/**
 * Drift guard for the conductor's dispatch verdict enum. Run via `pnpm prism:test`.
 *
 * The verdict enum is written down in three places that must never disagree:
 * the `## Primary verdict` table (the human-readable spec), the
 * `## Canonical dispatch schema` fenced block (the copy-target every
 * authoring Sol pastes verbatim), and the `## Routing table (deterministic)`
 * (every verdict must route somewhere). A fourth check guards the consumer
 * surfaces against re-enumerating a subset of the six values from memory —
 * the exact failure mode that dropped `needs-fix` from a hand-authored
 * dispatch schema and from the public conductor doc.
 */
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");

const EXPECTED_VERDICTS = [
	"done",
	"needs-fix",
	"blocked",
	"needs-replan",
	"needs-stronger-model",
	"needs-human",
];

const REPORT_BACK_PATH = path.join(
	repoRoot,
	".prism",
	"skills",
	"prism-conductor",
	"lib",
	"report-back.md"
);
const CLAUDE_MD_PATH = path.join(
	repoRoot,
	".ai-skills",
	"skills",
	"prism-conductor",
	"claude.md"
);
const CONDUCTOR_DOC_PATH = path.join(repoRoot, "docs", "ai-skills", "conductor.md");

/**
 * Extracts the lines between a top-level `## heading` and the next top-level
 * `## ` heading (or end of file). Mirrors the boundary logic in
 * `routing-coverage.test.ts` — the routing rule and this doc both nest
 * headings one level deep past `## `, so the boundary is unambiguous.
 */
function extractSection(markdown: string, heading: string): string {
	const lines = markdown.split("\n");
	const startIndex = lines.findIndex((line) => line.trim() === heading);
	if (startIndex === -1) {
		throw new Error(`Section '${heading}' not found`);
	}
	const rest = lines.slice(startIndex + 1);
	const endOffset = rest.findIndex((line) => line.startsWith("## "));
	const sectionLines = endOffset === -1 ? rest : rest.slice(0, endOffset);
	return sectionLines.join("\n");
}

/** Extracts the first-column backticked value from each `| \`x\` | ... |` table row. */
function extractTableFirstColumnValues(text: string): string[] {
	const values: string[] = [];
	for (const line of text.split("\n")) {
		const match = line.match(/^\|\s*`([a-z-]+)`\s*\|/);
		if (match) {
			values.push(match[1]);
		}
	}
	return values;
}

/** Extracts the quoted string literals off a `verdict: "a" | "b" | ...` line inside a fenced block. */
function extractSchemaVerdictValues(text: string): string[] {
	const fenceMatch = text.match(/```([\s\S]*?)```/);
	if (!fenceMatch) {
		throw new Error("No fenced code block found in § Canonical dispatch schema");
	}
	const verdictLine = fenceMatch[1]
		.split("\n")
		.find((line) => line.trim().startsWith("verdict:"));
	if (!verdictLine) {
		throw new Error("No `verdict:` line found in the canonical dispatch schema block");
	}
	return [...verdictLine.matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
}

test("report-back.md: Primary verdict table matches the expected six-value enum, in order", async () => {
	const raw = await fs.readFile(REPORT_BACK_PATH, "utf8");
	const section = extractSection(raw, "## Primary verdict");
	const values = extractTableFirstColumnValues(section);
	assert.deepEqual(
		values,
		EXPECTED_VERDICTS,
		`report-back.md § Primary verdict table order/values diverged from the expected enum. Found: [${values.join(", ")}]`
	);
});

test("report-back.md: Canonical dispatch schema verdict enum matches the Primary verdict table", async () => {
	const raw = await fs.readFile(REPORT_BACK_PATH, "utf8");
	const tableValues = new Set(
		extractTableFirstColumnValues(extractSection(raw, "## Primary verdict"))
	);
	const schemaSection = extractSection(raw, "## Canonical dispatch schema");
	const schemaValues = new Set(extractSchemaVerdictValues(schemaSection));

	const missingFromSchema = [...tableValues].filter((v) => !schemaValues.has(v));
	const missingFromTable = [...schemaValues].filter((v) => !tableValues.has(v));

	assert.equal(
		missingFromSchema.length,
		0,
		`§ Canonical dispatch schema is missing verdict(s) present in § Primary verdict: [${missingFromSchema.join(", ")}]`
	);
	assert.equal(
		missingFromTable.length,
		0,
		`§ Primary verdict table is missing verdict(s) present in § Canonical dispatch schema: [${missingFromTable.join(", ")}]`
	);
});

test("report-back.md: every verdict in the Primary verdict table is routed in the Routing table", async () => {
	const raw = await fs.readFile(REPORT_BACK_PATH, "utf8");
	const verdicts = extractTableFirstColumnValues(extractSection(raw, "## Primary verdict"));
	const routingSection = extractSection(raw, "## Routing table (deterministic)");

	const unrouted = verdicts.filter((verdict) => !routingSection.includes(`\`${verdict}\``));
	assert.equal(
		unrouted.length,
		0,
		`Verdict(s) defined in § Primary verdict but never routed in § Routing table (deterministic): [${unrouted.join(", ")}]`
	);
});

test("claude.md: cites the canonical schema instead of hardcoding the verdict enum", async () => {
	const raw = await fs.readFile(CLAUDE_MD_PATH, "utf8");
	assert.ok(
		raw.includes("Canonical dispatch schema"),
		"claude.md should cite '§ Canonical dispatch schema' rather than reconstructing the verdict enum in prose"
	);
	for (const line of raw.split("\n")) {
		assert.ok(
			!/'done'\s*,\s*'needs-/.test(line) && !/"done"\s*,\s*"needs-/.test(line),
			`claude.md hardcodes a verdict enum literal instead of citing the schema block: "${line.trim()}"`
		);
	}
});

/**
 * `needs-replan` is verdict-exclusive vocabulary — it never appears as a gate
 * disposition (the disposition enum is `auto-cleared` | `needs-human` |
 * `blocked`, per report-back.md § Gate dispositions), so a line naming
 * `needs-replan` is unambiguously enumerating *verdicts*, not something else
 * that happens to share the `blocked` / `needs-human` tokens. This is the
 * exact drift task 15 caught: a verdict enumeration that named `needs-replan`
 * while silently dropping `needs-fix`.
 */
function assertNoNeedsReplanWithoutNeedsFix(filePath: string, raw: string): void {
	const lines = raw.split("\n");
	for (const [index, line] of lines.entries()) {
		const hasNeedsReplan = line.includes("`needs-replan`");
		const hasNeedsFix = line.includes("`needs-fix`");
		assert.ok(
			!hasNeedsReplan || hasNeedsFix,
			`${filePath}:${index + 1} enumerates \`needs-replan\` without \`needs-fix\` — a verdict enumeration that lists needs-replan must also list needs-fix: "${line.trim()}"`
		);
	}
}

test("docs/ai-skills/conductor.md: no verdict enumeration lists needs-replan but omits needs-fix", async () => {
	const raw = await fs.readFile(CONDUCTOR_DOC_PATH, "utf8");
	assertNoNeedsReplanWithoutNeedsFix("docs/ai-skills/conductor.md", raw);
});
