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
import { type Manifest, findBraceGlobKeys, findCatchAllKeys } from "./lib/manifest-routes";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.PRISM_REPO_ROOT
	? path.resolve(process.env.PRISM_REPO_ROOT)
	: path.resolve(scriptDirectory, "../..");

export type { Manifest };
export { findBraceGlobKeys, findCatchAllKeys } from "./lib/manifest-routes";

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
 * The consumer install seed for architect docs, relative to the repo root.
 * Every `.md` file under it is a doc a consumer receives on install.
 */
const SHIPPED_ARCHITECT_ROOT = "templates/install/.prism/architect";

/**
 * The consumer's seed routing table — becomes their `manifest.json` on install.
 */
const STUB_MANIFEST = "templates/install/.prism/architect/manifest.stub.json";

/**
 * PRISM's own routing tables. Split-ownership: `manifest.base.json` holds the
 * toolkit routes and the live `manifest.json` is the consumer-owned instance
 * PRISM maintains by hand until merge-at-onboard is built. A doc reachable
 * through either one is loadable in PRISM's own tree, so the gap check treats
 * them as a single set.
 */
const PRISM_OWNED_MANIFESTS = [
	".prism/architect/manifest.json",
	".prism/architect/_toolkit/manifest.base.json",
];

/**
 * Collects every architect doc a routing table names, flattening the
 * single-doc and multi-doc forms a route value may take.
 */
export function collectRoutedDocs(manifest: Manifest): Set<string> {
	const routed = new Set<string>();
	for (const value of Object.values(manifest)) {
		for (const doc of Array.isArray(value) ? value : [value]) {
			routed.add(doc);
		}
	}

	return routed;
}

/**
 * Returns one failure message per disagreement between what ships and what the
 * routing tables name. Empty array means the shipped set and both sides of the
 * routing surface agree.
 *
 * Three tables carry routes and none of them is derived from another, so a doc
 * can be reachable on one side and stranded on the other with nothing to say
 * so. That is not hypothetical: `architecture-doc-shape.md` and
 * `closing-messages.md` were routed in the consumer stub while PRISM's own
 * tables named neither, which left PRISM shipping its users a route to a doc
 * PRISM itself never loaded.
 *
 * The invariant is stated against the shipped set rather than between the
 * tables directly, which is what lets it run without an exception list. Byte
 * parity between the tables would be wrong — the stub routes broad patterns
 * for a fresh install while PRISM's tables enumerate its own rule files, and
 * both spellings are correct for their side. Anchoring on the shipped set also
 * keeps PRISM-dev-only docs out of the check on their own merits:
 * `output-guards.md` describes PRISM's build pipeline, is routed live at
 * `scripts/ai-skills/**`, and is deliberately excluded from the seed, so it
 * satisfies all three conditions without being named as an exception.
 */
export function findShipRoutingGaps(
	shippedDocs: ReadonlySet<string>,
	stubRouted: ReadonlySet<string>,
	prismRouted: ReadonlySet<string>
): string[] {
	const failures: string[] = [];

	for (const doc of [...shippedDocs].sort()) {
		if (!stubRouted.has(doc)) {
			failures.push(
				`${doc} ships in the install seed but no route in ${STUB_MANIFEST} names it, so a consumer receives a doc nothing loads.`
			);
		}

		if (!prismRouted.has(doc)) {
			failures.push(
				`${doc} ships to consumers but no route in PRISM's own tables names it, so PRISM hands out a doc it never loads itself. Add the route to ${PRISM_OWNED_MANIFESTS.join(" or ")}.`
			);
		}
	}

	for (const doc of [...stubRouted].sort()) {
		if (!shippedDocs.has(doc)) {
			failures.push(
				`${STUB_MANIFEST} routes ${doc}, but that doc is not in the install seed, so the route dangles on every consumer install.`
			);
		}
	}

	return failures;
}

/**
 * Reads every `.md` file under the install seed's architect directory and
 * returns the paths in the form a route names them — relative to the architect
 * root, so `_toolkit/spec-editing.md` rather than the full seed path.
 */
async function readShippedArchitectDocs(): Promise<Set<string>> {
	const root = path.join(repoRoot, ...SHIPPED_ARCHITECT_ROOT.split("/"));
	const entries = await fs.readdir(root, {
		recursive: true,
		withFileTypes: true,
	});

	const docs = new Set<string>();
	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith(".md")) {
			continue;
		}

		const absolute = path.join(entry.parentPath, entry.name);
		docs.add(path.relative(root, absolute).split(path.sep).join("/"));
	}

	return docs;
}

/**
 * Reads a routing table and returns the docs it names, or an empty set when
 * the file is absent.
 */
async function readRoutedDocs(relativePath: string): Promise<Set<string>> {
	const absolutePath = path.join(repoRoot, ...relativePath.split("/"));
	const raw = await fs.readFile(absolutePath, "utf8").catch(() => null);

	return raw === null
		? new Set<string>()
		: collectRoutedDocs(JSON.parse(raw) as Manifest);
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

	const prismRouted = new Set<string>();
	for (const relativePath of PRISM_OWNED_MANIFESTS) {
		for (const doc of await readRoutedDocs(relativePath)) {
			prismRouted.add(doc);
		}
	}

	const shipGaps = findShipRoutingGaps(
		await readShippedArchitectDocs(),
		await readRoutedDocs(STUB_MANIFEST),
		prismRouted
	);

	if (shipGaps.length > 0) {
		console.error("\nverify-manifest-coverage failed:");
		for (const failure of shipGaps) {
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
