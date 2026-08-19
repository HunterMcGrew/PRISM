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
 * Reports whether a route pattern is anchored to a real location: its first
 * path segment must carry at least one literal character rather than being
 * built entirely from wildcards.
 *
 * This is the property "the route constrains something," stated directly. The
 * obvious alternative — probing the compiled matcher with the empty string —
 * looks computable but tests something narrower. A double-star and a single
 * star both accept the empty string and are caught by a probe. Three further
 * spellings are not: a double-star followed by a slash and a single star, a
 * single star followed by a slash and a double star, and two double-stars
 * joined by a slash. Each compiles to a regex that requires a separator, so
 * each rejects the empty string while still matching every nested path in the
 * repo. Enumerating those spellings in a probe set closes only the ones
 * someone thought to write down; requiring a leading literal segment closes
 * the whole family, because a first segment made only of wildcards is exactly
 * what lets a pattern span the entire tree.
 *
 * A catch-all route matches every read in the repo, which would make the
 * write-time deny gate unconditional rather than scoped.
 */
function checkRouteIsAnchored(pattern: string): boolean {
	const firstSegment = pattern.split("/")[0];

	return firstSegment.replaceAll("*", "").length > 0;
}

/**
 * Returns one failure message per manifest route that is not anchored to a
 * leading literal segment — see `checkRouteIsAnchored`. Empty array means
 * every route constrains something.
 */
export function findCatchAllKeys(manifest: Manifest): string[] {
	return Object.keys(manifest)
		.filter((key) => !checkRouteIsAnchored(key))
		.map(
			(key) =>
				`manifest route "${key}" opens with a wildcard-only path segment, so it constrains nothing and matches every path — narrow it to a real prefix.`
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

/**
 * Every manifest the structural checks run against, relative to the repo root.
 *
 * All three, not just the repo's own. The `**` catch-all this gate exists to
 * reject shipped in the consumer-facing stub, so a gate pointed only at
 * `.prism/architect/manifest.json` would have been aimed at the one file that
 * did not have the bug. Persona-coverage checking stays on the repo manifest
 * below — it asserts against PRISM's own persona scopes, which the stub and
 * the base manifest do not claim to carry.
 */
const STRUCTURALLY_CHECKED_MANIFESTS = [
	".prism/architect/manifest.json",
	".prism/architect/_toolkit/manifest.base.json",
	"templates/install/.prism/architect/manifest.stub.json",
];

async function main(): Promise<void> {
	const structuralFailures: string[] = [];
	for (const relativePath of STRUCTURALLY_CHECKED_MANIFESTS) {
		const absolutePath = path.join(repoRoot, ...relativePath.split("/"));
		const raw = await fs.readFile(absolutePath, "utf8").catch(() => null);
		if (raw === null) {
			continue;
		}

		const candidate = JSON.parse(raw) as Manifest;
		structuralFailures.push(
			...[...findCatchAllKeys(candidate), ...findBraceGlobKeys(candidate)].map(
				(failure) => `${relativePath}: ${failure}`
			)
		);
	}

	if (structuralFailures.length > 0) {
		console.error("\nverify-manifest-coverage failed:");
		for (const failure of structuralFailures) {
			console.error(`  - ${failure}`);
		}
		process.exit(1);
	}

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

if (isDirectCliEntry("verify-manifest-coverage")) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
