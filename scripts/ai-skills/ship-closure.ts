#!/usr/bin/env -S npx tsx
/**
 * Ship-surface closure — the mechanical answer to "what does a consumer get?"
 *
 * The ship surface is four things plus dependency closure: the skills, the
 * rules, the writing guides, and the runtime. Everything link-reachable from
 * those roots ships; everything else stays home. Stating that in prose goes
 * stale on the first new cross-reference, so it is computed here and enforced
 * in `pnpm prism:check`.
 *
 * Two failure directions, and both matter:
 * - A file inside the closure marked `excluded` in `seed-curation.json` means
 *   a shipped file points at something the consumer cannot reach — a dead link
 *   in every install.
 * - A file marked shippable but outside the closure is dead weight: nothing a
 *   consumer reads ever leads to it.
 *
 * Reference extraction reuses `crossref-lint.ts`'s `extractRefs` / `resolveRef`
 * rather than adding a second link parser, so a link form the linter learns to
 * read is a link form the closure follows.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	extractRefs,
	isExternalOrToken,
	isLazyOrHistoricalTarget,
	resolveRef,
} from "./crossref-lint";
import { isDirectCliEntry } from "./lib/cli-entry";
import { pathExists, readFileIfExists } from "./utils";

/** Content areas `build.ts` mirrors into the install seed, relative to `.prism/`. */
const SEED_CONTENT_AREAS = ["rules", "architect", "spec", "templates", "references"] as const;

/** Loose files `build.ts` mirrors into the install seed, relative to `.prism/`. */
const SEED_LOOSE_FILES = ["SPEC.md"] as const;

/** File extensions the closure walk reads for outbound references. */
const SCANNED_EXTENSIONS = [".md", ".tmpl", ".mdc", ".ts", ".mjs", ".json"];

const CONSUMER_STUB_PATH = "templates/install/.prism/architect/manifest.stub.json";

/**
 * The toolkit's base routing table. It ships as-is inside the seed, so a route
 * it names is a promise the install can keep — the same promise the consumer
 * stub makes, from a second table.
 *
 * The canonical copy is read rather than its seed twin: `build.ts` mirrors one
 * into the other, so they carry identical routes, and the canonical path is
 * where a route is authored.
 */
const TOOLKIT_BASE_MANIFEST_PATH = ".prism/architect/_toolkit/manifest.base.json";

/**
 * Repo-relative paths the walk never follows into. These are PRISM's own
 * working notes — read by this repo's own sessions, never delivered — and
 * they name paths freely. Following them would let a passing mention in a
 * lesson entry pull an arbitrary file into the ship set.
 *
 * `.prism/plans/` needs no entry here: `crossref-lint`'s
 * `isLazyOrHistoricalTarget` already skips plan citations for the same reason.
 */
const NON_SHIPPING_WORKING_FILES = new Set([".prism/lessons.md"]);

/**
 * Excluded files the ship surface already points at, tracked pending a fix —
 * same shape and same intent as `crossref-lint`'s
 * `INSTALL_RELATIVE_LINK_TRACKED_VIOLATIONS`, which was seeded with its known
 * set and emptied by the PR that fixed them.
 *
 * Every entry is a self-dev ADR (or a rule only self-dev ADRs justify) cited
 * by path from a `.ai-skills/skills/**` body. ADR-0064 already settled that
 * PRISM ships none of its own ADRs and that each citation distils into the
 * surface that needs it, but its `crossref-lint` gate only covers
 * `templates/install/**` — the skill bodies ship as generated skills and were
 * never swept. Closing that gap is a prose sweep across the persona roster,
 * which is a different change from wiring up this check.
 *
 * Entries are targets, not referrer/target pairs: a new citation of an
 * already-tracked ADR is the same defect already recorded here. A citation of
 * anything not listed fails on the first run, including a re-run.
 */
export const SHIP_CLOSURE_TRACKED_DANGLING_REFS: ReadonlySet<string> = new Set([
	"rules/skill-authoring.md",
	"spec/adrs/_toolkit/0011-eric-never-approves-prs.md",
	"spec/adrs/_toolkit/0014-plan-section-ownership.md",
	"spec/adrs/_toolkit/0035-rule-loading-tiers.md",
	"spec/adrs/_toolkit/0037-cadence-driven-personas.md",
	"spec/adrs/_toolkit/0043-parker-prd-persona.md",
	"spec/adrs/_toolkit/0044-direct-write-tool-outputs.md",
	"spec/adrs/_toolkit/0045-skill-content-disclosure-model.md",
	"spec/adrs/_toolkit/0046-persona-vs-utility-skill-type.md",
	"spec/adrs/_toolkit/0055-conductor-partitions-run-control-by-epic-subtree.md",
	"spec/adrs/_toolkit/0058-single-audience-retires-paired-dev-docs.md",
	"spec/adrs/_toolkit/0060-business-layer-substrate.md",
	"spec/adrs/_toolkit/0067-runtime-ratifies-verdicts.md",
	"spec/adrs/_toolkit/0069-deterministic-verification-is-a-pipeline-stage.md",
]);

export interface SeedCurationTiers {
	excluded: string[];
	/** Canonical paths whose seed twin is hand-maintained rather than mirrored. */
	curated?: string[];
	/** Canonical path → the name its seed twin ships under. */
	renames?: Record<string, string>;
}

export interface ShipClosureReport {
	/** Every repo-relative path the walk reached, sorted. */
	closure: string[];
	/**
	 * Seed-relative paths inside the closure that `seed-curation.json`
	 * excludes, minus the tracked set — the failing half.
	 */
	shippedButExcluded: string[];
	/** Seed-relative paths the seed ships that nothing in the closure reaches. */
	shippableOutsideClosure: string[];
	/** Tracked entries the closure no longer reaches — their tracking is stale. */
	staleTrackedRefs: string[];
}

export interface ShipClosureOptions {
	repoRoot: string;
	curation: SeedCurationTiers;
	/**
	 * Repo-relative closure roots — files are seeded directly, directories are
	 * walked. Defaults to the four real roots via `resolveDefaultRoots`.
	 */
	roots?: string[];
	/**
	 * Repo-relative content root whose files form the shippable universe.
	 * Defaults to `.prism`, matching what `seed-curation.json` classifies.
	 */
	contentRoot?: string;
	/**
	 * Dangling ship-surface references accepted for now. Defaults to
	 * `SHIP_CLOSURE_TRACKED_DANGLING_REFS`; tests pass an empty set so the
	 * failure they assert is the check's, not the tracking's.
	 */
	trackedDanglingRefs?: ReadonlySet<string>;
}

/**
 * Rewrites the `<repo-root>/` prefix skill bodies use for startup reads into a
 * plain repo-root-absolute path.
 *
 * `crossref-lint` treats any angle-bracketed target as an unresolvable
 * placeholder, which is right for `<ticket-id>` but wrong here: every persona
 * cites its startup files as `<repo-root>/.prism/references/plan-lookup.md`,
 * and dropping those made the two files every persona reads at startup look
 * like dead weight the seed could trim.
 */
function stripRepoRootToken(target: string): string {
	return target.replace(/^<repo-root>\//, "");
}

/** Lists every file under `dir` recursively, as absolute paths. Absent dir yields nothing. */
async function listFilesRecursive(dir: string): Promise<string[]> {
	if (!(await pathExists(dir))) {
		return [];
	}

	const found: string[] = [];
	const entries = await fs.readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		const absolute = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			found.push(...(await listFilesRecursive(absolute)));
			continue;
		}

		found.push(absolute);
	}

	return found;
}

/**
 * Reads one shipped routing table as a closure root in both directions: its
 * keys name paths the table points *at*, and its values name the architect
 * docs it routes *to*. Glob keys are skipped — a pattern names no single file
 * — and keys resolving outside the canonical tree drop out on the walk's own
 * existence check.
 *
 * Every shipped table is read, not just the consumer stub: a route in any
 * table a consumer receives names a doc that install has to contain, so a
 * table left out of the roots is a routing surface the closure cannot see.
 */
async function collectManifestRoutedPaths(
	repoRoot: string,
	manifestPath: string
): Promise<string[]> {
	const raw = await readFileIfExists(path.join(repoRoot, manifestPath));
	if (raw === null) {
		return [];
	}

	let manifest: Record<string, unknown>;
	try {
		manifest = JSON.parse(raw) as Record<string, unknown>;
	} catch {
		return [];
	}

	const routed: string[] = [];

	for (const [key, value] of Object.entries(manifest)) {
		if (!key.includes("*")) {
			routed.push(key);
		}

		for (const doc of Array.isArray(value) ? value : [value]) {
			if (typeof doc === "string") {
				routed.push(path.posix.join(".prism/architect", doc));
			}
		}
	}

	return routed;
}

/**
 * The four ship-surface roots, as repo-relative paths: the `prism-*` skills,
 * the rules, the writing guides, and the runtime (hook scripts, both shipped
 * routing tables, and `doctor`).
 */
export async function resolveDefaultRoots(repoRoot: string): Promise<string[]> {
	const roots = [
		".prism/rules",
		".prism/architect/guides",
		"scripts/ai-skills/hooks",
		"scripts/ai-skills/doctor.ts",
		CONSUMER_STUB_PATH,
		TOOLKIT_BASE_MANIFEST_PATH,
	];

	const skillsDir = path.join(repoRoot, ".ai-skills", "skills");
	if (await pathExists(skillsDir)) {
		const entries = await fs.readdir(skillsDir, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isDirectory() && entry.name.startsWith("prism-")) {
				roots.push(path.posix.join(".ai-skills/skills", entry.name));
			}
		}
	}

	for (const manifestPath of [CONSUMER_STUB_PATH, TOOLKIT_BASE_MANIFEST_PATH]) {
		roots.push(...(await collectManifestRoutedPaths(repoRoot, manifestPath)));
	}

	return roots;
}

/** Expands one repo-relative root into the absolute files it contributes. */
async function expandRoot(repoRoot: string, root: string): Promise<string[]> {
	const absolute = path.resolve(repoRoot, root);

	if (!(await pathExists(absolute))) {
		return [];
	}

	const stat = await fs.stat(absolute);

	return stat.isDirectory() ? listFilesRecursive(absolute) : [absolute];
}

/**
 * Walks outbound references transitively from `roots` and returns every
 * absolute path reached, the roots included.
 *
 * Both repo-root-absolute and file-relative link forms are followed.
 * `crossref-lint` verifies only the repo-root-absolute form, because the
 * relative form is authored to resolve in the consumer's installed tree — but
 * relative sibling links are how `.prism/rules/` files cite each other, so a
 * closure blind to them would call reachable files dead weight and trim
 * exactly the documents a consumer follows.
 */
async function walkClosure(
	repoRoot: string,
	roots: string[],
	readScanSource: (absolutePath: string) => Promise<string>,
	isExcludedFromSeed: (absolutePath: string) => boolean
): Promise<Set<string>> {
	const queue: string[] = [];
	for (const root of roots) {
		queue.push(...(await expandRoot(repoRoot, root)));
	}

	const reached = new Set<string>();

	while (queue.length > 0) {
		const current = queue.pop() as string;
		if (reached.has(current) || !(await pathExists(current))) {
			continue;
		}

		const repoRelative = path.relative(repoRoot, current).split(path.sep).join("/");
		if (NON_SHIPPING_WORKING_FILES.has(repoRelative)) {
			continue;
		}

		const stat = await fs.stat(current);
		if (!stat.isFile()) {
			continue;
		}

		reached.add(current);

		if (!SCANNED_EXTENSIONS.includes(path.extname(current))) {
			continue;
		}

		// An excluded file is reached — that is the violation — but consumers
		// never receive it, so what it points at is not on the ship surface
		// either. Recursing through it would turn one real dangling reference
		// into a cascade: the self-dev ADRs cite each other densely, so a
		// single skill-body citation would drag in nearly the whole corpus and
		// bury the handful of citations someone actually has to fix.
		if (isExcludedFromSeed(current)) {
			continue;
		}

		const content = await readScanSource(current);
		for (const line of content.split("\n")) {
			for (const rawRef of extractRefs(line)) {
				const raw = stripRepoRootToken(rawRef);
				if (isExternalOrToken(raw)) {
					continue;
				}

				const target = raw.split("#")[0].split("?")[0];
				if (target === "" || isLazyOrHistoricalTarget(target)) {
					continue;
				}

				const resolved = resolveRef(current, repoRoot, target);
				if (resolved !== "" && !reached.has(resolved)) {
					queue.push(resolved);
				}
			}
		}
	}

	return reached;
}

/**
 * Builds the reader the closure walk scans with. A `curated` or renamed file's
 * seed twin is hand-maintained and generally shorter than its canonical
 * source, so the two carry different links — canonical rules cite self-dev
 * ADRs that the install ADR gate (`crossref-lint`'s `runInstallAdrGate`) keeps
 * out of the twin on purpose. Reachability has to be measured over the bytes
 * the consumer receives, or every curated file drags its canonical-only
 * citations into the ship set and the whole ADR corpus reads as shippable.
 *
 * Falls back to the canonical bytes when no twin is on disk, so a missing twin
 * degrades to over-reporting rather than silently shrinking the closure.
 */
function createSeedAwareReader(
	repoRoot: string,
	absoluteContentRoot: string,
	curation: SeedCurationTiers
): (absolutePath: string) => Promise<string> {
	const curated = new Set(curation.curated ?? []);
	const renames = curation.renames ?? {};
	const seedRoot = path.join(repoRoot, "templates", "install", ".prism");

	return async (absolutePath: string): Promise<string> => {
		const seedPath = path.relative(absoluteContentRoot, absolutePath).split(path.sep).join("/");

		if (seedPath.startsWith("..") || path.isAbsolute(seedPath)) {
			return fs.readFile(absolutePath, "utf8");
		}

		const twinName = renames[seedPath] ?? (curated.has(seedPath) ? seedPath : null);
		if (twinName === null) {
			return fs.readFile(absolutePath, "utf8");
		}

		const twin = await readFileIfExists(path.join(seedRoot, twinName));

		return twin ?? fs.readFile(absolutePath, "utf8");
	};
}

/**
 * Computes the closure and diffs it against `seed-curation.json`'s shippable
 * set — every file in the seeded content areas that is not marked `excluded`.
 */
export async function computeShipClosure(options: ShipClosureOptions): Promise<ShipClosureReport> {
	const {
		repoRoot,
		curation,
		contentRoot = ".prism",
		trackedDanglingRefs = SHIP_CLOSURE_TRACKED_DANGLING_REFS,
	} = options;
	const roots = options.roots ?? (await resolveDefaultRoots(repoRoot));
	const absoluteContentRoot = path.resolve(repoRoot, contentRoot);
	const excluded = new Set(curation.excluded);
	const toSeedPath = (absolute: string): string =>
		path.relative(absoluteContentRoot, absolute).split(path.sep).join("/");

	const reached = await walkClosure(
		repoRoot,
		roots,
		createSeedAwareReader(repoRoot, absoluteContentRoot, curation),
		(absolute) => excluded.has(toSeedPath(absolute))
	);

	const universe: string[] = [];
	for (const area of SEED_CONTENT_AREAS) {
		universe.push(...(await listFilesRecursive(path.join(absoluteContentRoot, area))));
	}
	for (const looseFile of SEED_LOOSE_FILES) {
		const absolute = path.join(absoluteContentRoot, looseFile);
		if (await pathExists(absolute)) {
			universe.push(absolute);
		}
	}

	const shippedButExcluded: string[] = [];
	const shippableOutsideClosure: string[] = [];
	const trackedStillReached = new Set<string>();

	for (const absolute of universe) {
		const seedPath = toSeedPath(absolute);
		const isExcluded = excluded.has(seedPath);

		if (reached.has(absolute) && isExcluded) {
			if (trackedDanglingRefs.has(seedPath)) {
				trackedStillReached.add(seedPath);
			} else {
				shippedButExcluded.push(seedPath);
			}
			continue;
		}

		if (!reached.has(absolute) && !isExcluded) {
			shippableOutsideClosure.push(seedPath);
		}
	}

	return {
		closure: [...reached]
			.map((absolute) => path.relative(repoRoot, absolute).split(path.sep).join("/"))
			.sort(),
		shippedButExcluded: shippedButExcluded.sort(),
		shippableOutsideClosure: shippableOutsideClosure.sort(),
		staleTrackedRefs: [...trackedDanglingRefs].filter((p) => !trackedStillReached.has(p)).sort(),
	};
}

/** Renders a report as the lines the CLI prints, in order. */
export function formatShipClosureReport(report: ShipClosureReport): string {
	const lines: string[] = [];

	if (report.shippedButExcluded.length > 0) {
		lines.push(
			`${report.shippedButExcluded.length} file(s) reachable from the ship surface are excluded from the seed — consumers follow a link to a file they do not have:`
		);
		lines.push(...report.shippedButExcluded.map((p) => `  .prism/${p}`));
	}

	if (report.shippableOutsideClosure.length > 0) {
		lines.push(
			`${report.shippableOutsideClosure.length} file(s) ship in the seed but nothing on the ship surface reaches them — dead weight:`
		);
		lines.push(...report.shippableOutsideClosure.map((p) => `  .prism/${p}`));
	}

	if (report.staleTrackedRefs.length > 0) {
		lines.push(
			`${report.staleTrackedRefs.length} entr(y/ies) in SHIP_CLOSURE_TRACKED_DANGLING_REFS are no longer reached — delete them from ship-closure.ts so the tracking cannot mask a regression:`
		);
		lines.push(...report.staleTrackedRefs.map((p) => `  .prism/${p}`));
	}

	if (lines.length === 0) {
		lines.push(`Ship-surface closure holds — ${report.closure.length} file(s) reachable.`);
	}

	return lines.join("\n");
}

async function loadCuration(repoRoot: string): Promise<SeedCurationTiers> {
	const curationPath = path.join(repoRoot, ".ai-skills", "definitions", "seed-curation.json");
	const raw = await readFileIfExists(curationPath);

	if (raw === null) {
		throw new Error(`Cannot compute ship closure: ${curationPath} is missing.`);
	}

	const parsed = JSON.parse(raw) as {
		excluded?: unknown;
		curated?: unknown;
		renames?: unknown;
	};
	if (!Array.isArray(parsed.excluded)) {
		throw new Error(`Invalid seed-curation.json at ${curationPath}: "excluded" must be an array.`);
	}

	return {
		excluded: parsed.excluded as string[],
		curated: Array.isArray(parsed.curated) ? (parsed.curated as string[]) : [],
		renames:
			typeof parsed.renames === "object" && parsed.renames !== null
				? (parsed.renames as Record<string, string>)
				: {},
	};
}

export async function runShipClosureCli(): Promise<void> {
	const repoRoot =
		process.env.PRISM_REPO_ROOT ??
		path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

	const report = await computeShipClosure({
		repoRoot,
		curation: await loadCuration(repoRoot),
	});

	console.log(formatShipClosureReport(report));

	if (
		report.shippedButExcluded.length > 0 ||
		report.shippableOutsideClosure.length > 0 ||
		report.staleTrackedRefs.length > 0
	) {
		process.exitCode = 1;
	}
}

if (isDirectCliEntry("ship-closure")) {
	runShipClosureCli().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
