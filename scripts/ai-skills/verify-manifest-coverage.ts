#!/usr/bin/env tsx
/**
 * Verifies that `.prism/architect/manifest.json` preserves `skills-ecosystem.md`
 * coverage for the personas that need it. Implements the matcher contract from
 * `.prism/references/architect-context.md` lines 14–22: iterate the full file
 * list and check each path against every key in the manifest; for each file,
 * walk every key and collect all matches.
 *
 * There is no code-level consumer of `manifest.json` in PRISM — `build.ts` does
 * not parse it. The runtime "consumer" is the LLM persona reading the manifest
 * at session start, governed by the architect-context reference. This script
 * implements that contract independently so spec-level coverage stays auditable
 * when the manifest changes.
 *
 * Composes with `pnpm prism:check`: any manifest edit re-runs this script as
 * part of the umbrella check. Exit 1 if any expected-positive persona loses
 * `skills-ecosystem.md` from its loaded-doc set.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.PRISM_REPO_ROOT
	? path.resolve(process.env.PRISM_REPO_ROOT)
	: path.resolve(scriptDirectory, "../..");

export type Manifest = Record<string, string | string[]>;

export interface PersonaScope {
	name: string;
	files: string[];
}

const SKILLS_ECOSYSTEM_DOC = "skills-ecosystem.md";

const PERSONA_SCOPES: PersonaScope[] = [
	{
		name: "nora",
		files: [
			".claude/skills/prism-ticket-start/SKILL.md",
			".prism/plans/chore-manifest-hygiene-dev-doc.md",
		],
	},
	{
		name: "zoe",
		files: [
			".claude/skills/prism-surface-audit/SKILL.md",
			".prism/lessons.md",
			".prism/spec/adrs/0035-rule-loading-tiers.md",
		],
	},
	{
		name: "winston",
		files: [".claude/skills/prism-architect/SKILL.md"],
	},
	{
		name: "eric",
		files: [".claude/skills/prism-code-review-pr/SKILL.md"],
	},
	{
		name: "sage",
		files: [".claude/skills/prism-changelog/SKILL.md"],
	},
	{
		name: "fallthrough",
		files: ["package.json"],
	},
];

const EXPECTED_POSITIVES: ReadonlySet<string> = new Set([
	"nora",
	"zoe",
	"winston",
	"eric",
	"sage",
]);

/**
 * Compiles a manifest key into a matcher. Three shapes are supported,
 * matching the patterns in use across the current manifest:
 *   - Exact path (no wildcards, no trailing slash): `.prism/SPEC.md`
 *   - Directory prefix (trailing slash, no wildcards):
 *     `.claude/skills/prism-qa-test-plan/`
 *   - Glob: `**` matches across path segments; `*` matches within a single
 *     segment. Other regex metacharacters are escaped.
 */
export function compileMatcher(pattern: string): (filePath: string) => boolean {
	if (!pattern.includes("*") && !pattern.endsWith("/")) {
		return (filePath) => filePath === pattern;
	}

	if (pattern.endsWith("/") && !pattern.includes("*")) {
		const prefix = pattern;
		const exact = pattern.slice(0, -1);
		return (filePath) => filePath === exact || filePath.startsWith(prefix);
	}

	const doubleStarToken =
		String.fromCharCode(0) + "DOUBLE_STAR" + String.fromCharCode(0);
	const regexBody = pattern
		.replace(/\*\*/g, doubleStarToken)
		.replace(/[.+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*/g, "[^/]*")
		.split(doubleStarToken)
		.join(".*");
	const regex = new RegExp(`^${regexBody}$`);
	return (filePath) => regex.test(filePath);
}

/**
 * Resolves the architect docs that would load for a given file scope against
 * the manifest. Iterates every manifest key per file and collects all matches,
 * matching the contract in `.prism/references/architect-context.md`.
 */
export function loadedDocsForScope(
	manifest: Manifest,
	scope: string[]
): string[] {
	const docs = new Set<string>();
	const compiledEntries = Object.entries(manifest).map(
		([pattern, docOrDocs]) => ({
			matcher: compileMatcher(pattern),
			docs: Array.isArray(docOrDocs) ? docOrDocs : [docOrDocs],
		})
	);

	for (const file of scope) {
		for (const { matcher, docs: entryDocs } of compiledEntries) {
			if (matcher(file)) {
				for (const doc of entryDocs) {
					docs.add(doc);
				}
			}
		}
	}

	return Array.from(docs).sort();
}

/**
 * Returns one failure message per expected-positive persona that is missing
 * `skills-ecosystem.md`. Empty array means coverage is preserved.
 */
export function findMissingCoverage(
	result: Record<string, string[]>
): string[] {
	const failures: string[] = [];
	for (const persona of EXPECTED_POSITIVES) {
		if (!result[persona]?.includes(SKILLS_ECOSYSTEM_DOC)) {
			failures.push(
				`${persona} expected to load ${SKILLS_ECOSYSTEM_DOC} but it is missing from its loaded docs.`
			);
		}
	}
	return failures;
}

async function main(): Promise<void> {
	const manifestPath = path.join(
		repoRoot,
		".prism",
		"architect",
		"manifest.json"
	);
	const raw = await fs.readFile(manifestPath, "utf8");
	const manifest = JSON.parse(raw) as Manifest;

	const result: Record<string, string[]> = {};
	for (const persona of PERSONA_SCOPES) {
		result[persona.name] = loadedDocsForScope(manifest, persona.files);
	}

	console.log(JSON.stringify(result, null, 2));

	const failures = findMissingCoverage(result);
	if (failures.length > 0) {
		console.error("\nverify-manifest-coverage failed:");
		for (const failure of failures) {
			console.error(`  - ${failure}`);
		}
		process.exit(1);
	}
}

const invokedDirectly =
	process.argv[1] &&
	fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
