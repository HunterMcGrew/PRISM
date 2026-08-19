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

import { isDirectCliEntry } from "./lib/cli-entry";
import { compileMatcher } from "./hooks/lib/match.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.PRISM_REPO_ROOT
	? path.resolve(process.env.PRISM_REPO_ROOT)
	: path.resolve(scriptDirectory, "../..");

export type Manifest = Record<string, string | string[]>;

export interface PersonaScope {
	name: string;
	files: string[];
}

const SKILLS_ECOSYSTEM_DOC = "_toolkit/skills-ecosystem.md";

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
			".prism/spec/adrs/_toolkit/0035-rule-loading-tiers.md",
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
 * Returns one failure message per manifest route whose compiled matcher
 * accepts the empty string — the computable definition of "this pattern
 * constrains nothing." `compileMatcher("**")` and `compileMatcher("*")` both
 * accept `""`; `compileMatcher(".prism/**")` does not. A catch-all route
 * matches every read in the repo, which makes the write-time deny gate
 * (PR 2D) unconditional rather than scoped — the failure this check exists
 * to prevent before that gate exists. Empty array means no route is a
 * catch-all.
 */
export function findCatchAllKeys(manifest: Manifest): string[] {
	return Object.keys(manifest)
		.filter((key) => compileMatcher(key)(""))
		.map(
			(key) =>
				`manifest route "${key}" matches the empty string, so it constrains nothing and matches every path — remove it or narrow it to a real prefix.`
		);
}

/**
 * Returns one failure message per manifest key containing a brace glob
 * (`{ts,tsx}`). `compileMatcher` escapes `{` and `}` into a regex literal
 * class rather than expanding brace alternation, so a route written this way
 * compiles to a regex that matches only a filename containing literal brace
 * characters — silently matching nothing real. Empty array means every key
 * is safe to compile.
 */
export function findBraceGlobKeys(manifest: Manifest): string[] {
	return Object.keys(manifest)
		.filter((key) => key.includes("{") || key.includes("}"))
		.map(
			(key) =>
				`manifest route "${key}" uses a brace glob; compileMatcher escapes braces as literals rather than expanding them, so this route would silently match nothing. Write one route per extension instead.`
		);
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

	const structuralFailures = [
		...findCatchAllKeys(manifest),
		...findBraceGlobKeys(manifest),
	];
	if (structuralFailures.length > 0) {
		console.error("\nverify-manifest-coverage failed:");
		for (const failure of structuralFailures) {
			console.error(`  - ${failure}`);
		}
		process.exit(1);
	}

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

if (isDirectCliEntry("verify-manifest-coverage")) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
