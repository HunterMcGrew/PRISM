#!/usr/bin/env -S npx tsx
/**
 * `prism doctor` — reports install health for a consumer repo in one pass.
 *
 * A bad `.ai-skills/config.json` field, a target that isn't a git repo, or a
 * `.prism/` tree that's drifted from its recorded sync manifest currently
 * surfaces late and far from the cause — the first visible symptom is often an
 * opaque leftover-token build failure pointing at rendered platform output.
 * `doctor` runs the same checks `adopt`/`update` run before writing, plus a
 * sync-state and version report, and prints every finding in one pass instead
 * of failing fast on the first problem.
 *
 * Two exported entry points, matching the `init.ts` / `update.ts` shape:
 * - `runDoctor` — the testable core. Takes a resolved consumer root and PRISM
 *   source root, returns a `DoctorReport`. No process.exit, no console output.
 * - `runDoctorCli` — the CLI wrapper. Resolves roots from argv, calls
 *   `runDoctor`, prints the report, and sets the process exit code.
 *
 * Unlike `adopt`/`update`, `doctor` never writes to disk and never throws on a
 * bad finding — throwing would stop at the first problem, defeating the point
 * of a single command that reports everything wrong at once. Each check is
 * independently wrapped so one failure doesn't prevent the others from running.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { validateConsumerConfigAgainstSchema } from "./lib/config-schema-validate";
import { assertInsideGitRepo, parseConsumerFlag, resolveConsumerRoot } from "./lib/consumer-root";
import { isDirectCliEntry } from "./lib/cli-entry";
import { classifyPath } from "./ownership";
import { parseRuleLoad } from "./rule-load";
import { loadSeedCurationRenames } from "./lib/seed-curation";
import { OVERLAY_SUBPATH, resolvePrismSource, resolveSelfPrismSource } from "./update";
import { loadSyncManifest, SYNC_MANIFEST_FILENAME, type SyncManifest } from "./sync-manifest";
import { hashFile, pathExists, readFileIfExists } from "./utils";

const NPM_REGISTRY_URL = "https://registry.npmjs.org/@huntermcgrew/prism";
const NPM_FETCH_TIMEOUT_MS = 3000;

/** A single named health finding. `check` identifies which section produced it. */
export interface DoctorFinding {
	check:
		| "config"
		| "git-repo"
		| "sync-manifest"
		| "seed-delivery"
		| "version"
		| "rule-load"
		| "architect-route"
		| "hook-registration";
	severity: "error" | "warning" | "info";
	message: string;
}

export interface SyncStateReport {
	/** `null` when no `.sync-manifest.json` exists — a pre-adopt or pre-manifest install. */
	manifest: {
		prismOwnedCount: number;
		consumerOwnedCount: number;
		divergedFiles: Array<{ relativePath: string; backups: string[] }>;
		missingFiles: string[];
	} | null;
}

export interface VersionReport {
	installed: string;
	/** `null` when the npm lookup could not complete — network, timeout, 404, or unpublished. */
	latest: string | null;
	/** True when both versions parse and the installed one is genuinely older. */
	outOfDate: boolean;
}

export interface DoctorReport {
	findings: DoctorFinding[];
	syncState: SyncStateReport;
	version: VersionReport;
	/** True when `findings` contains no `error`-severity entry. */
	healthy: boolean;
}

/**
 * Resolves the PRISM source root the same way `resolvePrismSource` does, but
 * never throws. `resolvePrismSource` falls through to `loadConfig` when no
 * `--prism-source` flag is passed, and `loadConfig` throws synchronously on a
 * missing `.ai-skills/config.json`, invalid JSON, a missing required
 * top-level key, or a non-string `org`/`project`/`ticketPrefix` — exactly the
 * bad-install states `doctor` exists to diagnose. A throw here previously
 * propagated out of `runDoctorCli` before any of `runDoctor`'s own
 * try/catch-wrapped checks ran, defeating the "report everything in one pass"
 * contract for that entire class of bad config.
 *
 * On failure, falls back to `resolveSelfPrismSource()` so `checkConfigSchema`
 * and `checkVersion` still have a real schema and `package.json` to read —
 * the resolution failure itself becomes a `config` finding, and the other
 * checks proceed against the caller's own PRISM installation instead of the
 * (broken) consumer-configured one.
 */
export function resolvePrismSourceOrFinding(
	argv: string[],
	consumerRepoRoot: string
): { prismSourceRoot: string; finding: DoctorFinding | null } {
	try {
		const resolved = resolvePrismSource(argv, consumerRepoRoot);

		if (resolved !== null) {
			return { prismSourceRoot: resolved, finding: null };
		}
	} catch (error) {
		return {
			prismSourceRoot: resolveSelfPrismSource(),
			finding: {
				check: "config",
				severity: "error",
				message: error instanceof Error ? error.message : String(error),
			},
		};
	}

	return {
		prismSourceRoot: resolveSelfPrismSource(),
		finding: {
			check: "config",
			severity: "error",
			message:
				"prism doctor needs a PRISM source. Pass --prism-source <path-to-prism-repo>, " +
				'or add a "prismSource" field to .ai-skills/config.json pointing at your ' +
				"local PRISM checkout.",
		},
	};
}

/**
 * Validates `.ai-skills/config.json` against `config.schema.json`, reusing
 * L376's schema validator. Catches rather than lets the error propagate — a
 * single bad field should be one finding among several, not a thrown
 * exception that stops every other check from running.
 */
async function checkConfigSchema(
	consumerRepoRoot: string,
	prismSourceRoot: string
): Promise<DoctorFinding[]> {
	try {
		validateConsumerConfigAgainstSchema(consumerRepoRoot, prismSourceRoot);

		return [];
	} catch (error) {
		return [
			{
				check: "config",
				severity: "error",
				message: error instanceof Error ? error.message : String(error),
			},
		];
	}
}

/**
 * Confirms the target is inside a git repository, reusing L376's guard.
 * Catches rather than lets the error propagate, for the same reason as
 * `checkConfigSchema`.
 */
function checkGitRepo(consumerRepoRoot: string): DoctorFinding[] {
	try {
		assertInsideGitRepo(consumerRepoRoot);

		return [];
	} catch (error) {
		return [
			{
				check: "git-repo",
				severity: "error",
				message: error instanceof Error ? error.message : String(error),
			},
		];
	}
}

/**
 * Reports a consumer `.prism/` missing a file `seed-curation.json` renames on
 * the seed side (`architect/manifest.json`, `SPEC.md`). A repo adopted before
 * `prism adopt`/`prism update` learned to invert that rename copied the seed
 * file verbatim under its seed name — the consumer has
 * `architect/manifest.stub.json` or `SPEC.md.tmpl` on disk and never got the
 * file it was told it had. `prism adopt` refuses to re-run on an established
 * repo (`assertConsumerIsEstablished`), and `architect/manifest.json` is
 * consumer-owned so `prism update` never writes it either — this check is the
 * only path that surfaces the `architect/manifest.json` gap for an
 * already-adopted repo. `SPEC.md` is prism-owned, so a stale `SPEC.md.tmpl`
 * self-clears on the next `prism update`; this check still flags it in the
 * meantime so the gap doesn't sit silent until then.
 *
 * Never writes — `doctor` reports, it doesn't repair (see file header). When
 * the stray seed-named copy is still on disk, the remedy is a plain rename;
 * when even that's gone, the remedy points at the seed's own copy in the
 * PRISM source.
 *
 * `runDoctor` only calls this once `checkSyncManifest` confirms a sync
 * manifest exists — a consumer with no manifest has never run `prism adopt`
 * and has no renamed file to be missing yet, so there is nothing this check
 * should report for it (mirrors `checkSyncManifest`'s own null-manifest
 * gate).
 */
async function checkSeedDelivery(
	consumerContentRoot: string,
	prismSourceRoot: string
): Promise<DoctorFinding[]> {
	let renames: Record<string, string>;
	try {
		renames = await loadSeedCurationRenames(prismSourceRoot);
	} catch (error) {
		return [
			{
				check: "seed-delivery",
				severity: "warning",
				message: `Could not check renamed seed files: ${error instanceof Error ? error.message : String(error)}`,
			},
		];
	}

	const findings: DoctorFinding[] = [];

	for (const [canonicalPath, seedPath] of Object.entries(renames)) {
		if (await pathExists(path.join(consumerContentRoot, canonicalPath))) {
			continue;
		}

		const staleSeedAbsolute = path.join(consumerContentRoot, seedPath);
		if (await pathExists(staleSeedAbsolute)) {
			findings.push({
				check: "seed-delivery",
				severity: "error",
				message: `.prism/${canonicalPath} is missing — this repo adopted before prism:adopt inverted seed renames. Repair: mv .prism/${seedPath} .prism/${canonicalPath}.`,
			});
			continue;
		}

		findings.push({
			check: "seed-delivery",
			severity: "error",
			message: `.prism/${canonicalPath} is missing and no seed copy (.prism/${seedPath}) was found either. Copy it from ${path.join(prismSourceRoot, "templates", "install", ".prism", seedPath)} as .prism/${canonicalPath}, then re-run npx @huntermcgrew/prism update.`,
		});
	}

	return findings;
}

/**
 * Resolves every `.bak` / `.bak.N` sibling that already exists next to
 * `absolutePath`, matching the naming scheme `update.ts`'s `resolveBackupPath`
 * writes to (`<file>.bak`, then `<file>.bak.1`, `<file>.bak.2`, …).
 */
async function findBackupSiblings(absolutePath: string): Promise<string[]> {
	const siblings: string[] = [];

	const base = `${absolutePath}.bak`;
	if (await pathExists(base)) {
		siblings.push(base);
	}

	let suffix = 1;
	while (await pathExists(`${base}.${suffix}`)) {
		siblings.push(`${base}.${suffix}`);
		suffix += 1;
	}

	return siblings;
}

/**
 * Reports sync state from `.prism/.sync-manifest.json`: how many recorded
 * files are PRISM-owned vs consumer-owned per `classifyPath`, which
 * PRISM-owned files have diverged from their recorded hash (paired with any
 * `.bak` siblings already on disk), and which recorded PRISM-owned files are
 * missing entirely.
 *
 * Returns `manifest: null` when no manifest exists — a pre-adopt repo, or one
 * that predates the manifest — which `runDoctor` turns into an informational
 * finding rather than an error, since a fresh `prism adopt` target legitimately
 * has none yet.
 */
async function checkSyncManifest(consumerContentRoot: string): Promise<{
	findings: DoctorFinding[];
	syncState: SyncStateReport;
}> {
	const manifest: SyncManifest | null = await loadSyncManifest(consumerContentRoot);

	if (manifest === null) {
		return {
			findings: [
				{
					check: "sync-manifest",
					severity: "info",
					message: `No ${SYNC_MANIFEST_FILENAME} found — this repo has not run \`prism adopt\` yet, or predates the sync manifest.`,
				},
			],
			syncState: { manifest: null },
		};
	}

	let prismOwnedCount = 0;
	let consumerOwnedCount = 0;
	const divergedFiles: Array<{ relativePath: string; backups: string[] }> = [];
	const missingFiles: string[] = [];

	for (const [relativePath, entry] of Object.entries(manifest.files)) {
		const ownership = classifyPath(relativePath);
		if (ownership === "consumer") {
			consumerOwnedCount += 1;
			continue;
		}
		if (ownership !== "prism") {
			continue;
		}

		prismOwnedCount += 1;

		const absolutePath = path.join(consumerContentRoot, relativePath);
		if (!(await pathExists(absolutePath))) {
			missingFiles.push(relativePath);
			continue;
		}

		const currentHash = await hashFile(absolutePath);
		if (currentHash !== entry.contentHash) {
			divergedFiles.push({
				relativePath,
				backups: await findBackupSiblings(absolutePath),
			});
		}
	}

	const findings: DoctorFinding[] = [];
	if (missingFiles.length > 0) {
		findings.push({
			check: "sync-manifest",
			severity: "error",
			message: `${missingFiles.length} PRISM-owned file(s) recorded in the manifest are missing on disk: ${missingFiles.join(", ")}`,
		});
	}
	if (divergedFiles.length > 0) {
		findings.push({
			check: "sync-manifest",
			severity: "warning",
			message: `${divergedFiles.length} PRISM-owned file(s) have diverged from the recorded PRISM base: ${divergedFiles.map((f) => f.relativePath).join(", ")}`,
		});
	}

	return {
		findings,
		syncState: {
			manifest: { prismOwnedCount, consumerOwnedCount, divergedFiles, missingFiles },
		},
	};
}

/**
 * Reports every rule under one rules directory missing a valid `load:`
 * declaration. Reuses `parseRuleLoad`'s `"warn"` mode — the returned warning
 * already carries the file name and the one-line remedy, so `doctor` nags on
 * every run until the rule declares `load:`, matching the ratified
 * legacy-rule default (`prism update`/`doctor` degrade the rule to the
 * pre-`load:` discriminator — `paths:` present stays path-scoped, absent
 * falls back to always-on — rather than excluding it, but they no longer do
 * so silently). Returns no findings when `rulesDir` is absent.
 *
 * `fileLabelPrefix` is threaded straight into `parseRuleLoad`'s `fileLabel`,
 * so `checkRuleLoadDeclarations` can call this once per rules directory
 * (base, then overlay) and still produce a warning that names which one a
 * finding came from.
 */
async function checkRulesDirLoadDeclarations(
	rulesDir: string,
	fileLabelPrefix: string
): Promise<DoctorFinding[]> {
	if (!(await pathExists(rulesDir))) {
		return [];
	}

	const entries = await fs.readdir(rulesDir);
	const findings: DoctorFinding[] = [];

	for (const name of entries.filter((e) => e.endsWith(".md")).sort()) {
		const content = await readFileIfExists(path.join(rulesDir, name));
		if (content === null) {
			continue;
		}

		const { warning } = parseRuleLoad(content, `${fileLabelPrefix}${name}`, "warn");
		if (warning !== null) {
			findings.push({ check: "rule-load", severity: "warning", message: warning });
		}
	}

	return findings;
}

/**
 * Reports every consumer rule missing a valid `load:` declaration, across
 * both `.prism/rules/` and the `.prism/custom/` overlay. The overlay is
 * entirely consumer-authored, so it holds the real population of legacy
 * rules that predate this mechanism — checking only the base directory would
 * leave `doctor` silent on exactly the rules most likely to need the nag.
 * Overlay findings are labeled `custom/<name>` (via `OVERLAY_SUBPATH`,
 * shared with `update.ts`'s `scanConsumerRuleLoad` so the two never diverge
 * on the overlay path) so a finding never reads ambiguously against a
 * same-named base rule.
 */
async function checkRuleLoadDeclarations(
	consumerContentRoot: string
): Promise<DoctorFinding[]> {
	const rulesDir = path.join(consumerContentRoot, "rules");
	const overlayRulesDir = path.join(consumerContentRoot, OVERLAY_SUBPATH, "rules");

	return [
		...(await checkRulesDirLoadDeclarations(rulesDir, "")),
		...(await checkRulesDirLoadDeclarations(overlayRulesDir, `${OVERLAY_SUBPATH}/`)),
	];
}

/**
 * Lists every `.md` file under `dir`, as paths relative to `dir` with `/`
 * separators.
 *
 * The `.md` filter is also what keeps the routing tables themselves out of the
 * orphan scan — `manifest.json` and `manifest.base.json` are routing tables,
 * not routable documents, and neither is Markdown.
 */
async function listMarkdownFilesRelative(dir: string): Promise<string[]> {
	const found: string[] = [];

	async function walk(current: string, prefix: string): Promise<void> {
		const entries = await fs.readdir(current, { withFileTypes: true });

		for (const entry of entries) {
			const relative = prefix === "" ? entry.name : `${prefix}/${entry.name}`;

			if (entry.isDirectory()) {
				await walk(path.join(current, entry.name), relative);
				continue;
			}

			if (entry.name.endsWith(".md")) {
				found.push(relative);
			}
		}
	}

	await walk(dir, "");

	return found.sort();
}

/**
 * The toolkit's base routing table, relative to `.prism/architect/`.
 *
 * An install receives two routing tables, and a doc named by either one is
 * reachable. Reading only `manifest.json` would report every doc the base
 * table routes as an orphan, and would also let a dead base route pass — the
 * same split that made `ship-closure` miss a routing surface.
 */
const TOOLKIT_BASE_MANIFEST_RELATIVE = "_toolkit/manifest.base.json";

/** Collects every doc path a manifest routes to, flattening single-string and array values. */
function collectRoutedDocs(manifest: Record<string, unknown>): Set<string> {
	const routed = new Set<string>();

	for (const value of Object.values(manifest)) {
		for (const doc of Array.isArray(value) ? value : [value]) {
			if (typeof doc === "string") {
				routed.add(doc);
			}
		}
	}

	return routed;
}

/**
 * Reports both halves of architect-route integrity: docs on disk that no
 * manifest route names (orphans), and routes naming a doc that is not on disk
 * (dead routes).
 *
 * The two directions together are what replaces per-doc frontmatter as the
 * route-integrity mechanism. Without the orphan half, a doc can be authored
 * and never routed, so nothing ever loads it; without the dead-route half,
 * adding a route at authoring time is aspirational rather than verifiable —
 * a typo'd route reads as healthy.
 *
 * "Routed" means named by either shipped table — `manifest.json` or the
 * toolkit's `_toolkit/manifest.base.json` — so both directions agree with
 * `ship-closure`, which seeds its roots from the same pair.
 *
 * Returns no findings when the architect tree or its manifest is absent.
 * `checkSeedDelivery` already reports a missing `architect/manifest.json`
 * with the remedy attached, so reporting it here too would double-count one
 * problem.
 */
async function checkArchitectRoutes(consumerContentRoot: string): Promise<DoctorFinding[]> {
	const architectDir = path.join(consumerContentRoot, "architect");
	const manifestPath = path.join(architectDir, "manifest.json");

	if (!(await pathExists(architectDir)) || !(await pathExists(manifestPath))) {
		return [];
	}

	let manifest: Record<string, unknown>;
	try {
		manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as Record<string, unknown>;
	} catch (error) {
		return [
			{
				check: "architect-route",
				severity: "error",
				message: `.prism/architect/manifest.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
			},
		];
	}

	const routed = collectRoutedDocs(manifest);

	const baseRaw = await readFileIfExists(path.join(architectDir, TOOLKIT_BASE_MANIFEST_RELATIVE));
	if (baseRaw !== null) {
		let base: Record<string, unknown>;
		try {
			base = JSON.parse(baseRaw) as Record<string, unknown>;
		} catch (error) {
			return [
				{
					check: "architect-route",
					severity: "error",
					message: `.prism/architect/${TOOLKIT_BASE_MANIFEST_RELATIVE} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
				},
			];
		}

		for (const doc of collectRoutedDocs(base)) {
			routed.add(doc);
		}
	}

	const onDisk = await listMarkdownFilesRelative(architectDir);
	const onDiskSet = new Set(onDisk);

	const findings: DoctorFinding[] = [];

	const orphans = onDisk.filter((doc) => !routed.has(doc));
	if (orphans.length > 0) {
		findings.push({
			check: "architect-route",
			severity: "warning",
			message: `${orphans.length} architect doc(s) on disk are named by no manifest route, so nothing loads them: ${orphans.join(", ")}`,
		});
	}

	const deadRoutes = [...routed].filter((doc) => !onDiskSet.has(doc)).sort();
	if (deadRoutes.length > 0) {
		findings.push({
			check: "architect-route",
			severity: "warning",
			message: `${deadRoutes.length} manifest route(s) name an architect doc that is not on disk: ${deadRoutes.join(", ")}`,
		});
	}

	return findings;
}

/** Matches any `hook.mjs` path inside a parsed hook command string. */
const HOOK_COMMAND_PATH_RE = /(\S*hook\.mjs)/g;

/**
 * Resolves one hook path as written in a hook command string to an absolute
 * path. Strips the `$CLAUDE_PROJECT_DIR` prefix, which expands to the repo
 * root, and the quotes that wrap a path with spaces.
 *
 * The command arrives from `JSON.parse`, so its escapes are already resolved
 * and only surrounding quotes remain. A bare backslash survives: it is a
 * Windows path separator, and stripping those collapsed such a registration
 * into one token that could never match a file on disk.
 */
function resolveHookCommandPath(rawPath: string, consumerRepoRoot: string): string {
	const unquoted = rawPath.replace(/["']/g, "");
	const withoutProjectDir = unquoted
		.replace(/^\$\{?CLAUDE_PROJECT_DIR\}?\//, "")
		.replace(/^\$\{?CLAUDE_PROJECT_DIR\}?/, "");

	return path.resolve(consumerRepoRoot, withoutProjectDir);
}

/**
 * Collects every `command` string under a parsed `settings.json`'s `hooks`
 * block, across every event and every matcher group.
 *
 * Walking the parsed shape rather than scanning the file text keeps a hook
 * path that appears in some unrelated string field out of the count, and
 * leaves the escape handling to the parser.
 */
function collectHookCommands(settings: Record<string, unknown>): string[] {
	const hooks = settings.hooks;
	if (typeof hooks !== "object" || hooks === null) {
		return [];
	}

	const commands: string[] = [];

	for (const matchers of Object.values(hooks as Record<string, unknown>)) {
		for (const matcher of Array.isArray(matchers) ? matchers : []) {
			const entries = (matcher as { hooks?: unknown })?.hooks;

			for (const entry of Array.isArray(entries) ? entries : []) {
				const command = (entry as { command?: unknown })?.command;

				if (typeof command === "string") {
					commands.push(command);
				}
			}
		}
	}

	return commands;
}

/**
 * Reports a hook runtime that is present but unregistered, and a registration
 * that points at a file which is not there.
 *
 * The write gate cannot prevent its own removal — deleting the runtime or its
 * registration disables it, and neither is prevented (ADR-0072). Visibility is
 * the compensating control the ADR names, and this check delivers the half of
 * it that is decidable from the consumer tree alone: each side reports the
 * other's absence.
 *
 * Removing both halves is silent. Nothing on disk then distinguishes a
 * consumer who deleted the gate from one who never received it — a Cursor or
 * Codex consumer has no `.claude/` tree at all — so reporting it would fire on
 * installs that are correct as they stand.
 */
async function checkHookRegistration(consumerRepoRoot: string): Promise<DoctorFinding[]> {
	const hookRuntimePath = path.join(consumerRepoRoot, ".claude", "hooks", "hook.mjs");
	const settingsPath = path.join(consumerRepoRoot, ".claude", "settings.json");
	const settingsRaw = await readFileIfExists(settingsPath);

	const findings: DoctorFinding[] = [];
	const registeredPaths = new Set<string>();

	if (settingsRaw !== null) {
		let settings: Record<string, unknown>;
		try {
			settings = JSON.parse(settingsRaw) as Record<string, unknown>;
		} catch (error) {
			return [
				{
					check: "hook-registration",
					severity: "error",
					message: `.claude/settings.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
				},
			];
		}

		for (const command of collectHookCommands(settings)) {
			for (const match of command.matchAll(HOOK_COMMAND_PATH_RE)) {
				registeredPaths.add(resolveHookCommandPath(match[1], consumerRepoRoot));
			}
		}
	}

	if ((await pathExists(hookRuntimePath)) && !registeredPaths.has(hookRuntimePath)) {
		findings.push({
			check: "hook-registration",
			severity: "warning",
			message:
				".claude/hooks/hook.mjs is present but .claude/settings.json registers no hook command pointing at it — the architect-context hook is inert. Repair: re-run npx @huntermcgrew/prism update, or restore the hooks block in .claude/settings.json.",
		});
	}

	for (const registered of [...registeredPaths].sort()) {
		if (!(await pathExists(registered))) {
			findings.push({
				check: "hook-registration",
				severity: "warning",
				message: `.claude/settings.json registers a hook command pointing at ${path.relative(consumerRepoRoot, registered)}, which is not on disk — the registration fails silently on every matching tool call.`,
			});
		}
	}

	return findings;
}

/** Fetcher shape `checkVersion` depends on — lets tests inject a stub instead of hitting the network. */
export type NpmVersionFetcher = (url: string, timeoutMs: number) => Promise<string | null>;

/**
 * Fetches the npm registry's `dist-tags.latest` for `@huntermcgrew/prism`,
 * returning `null` on any failure — network error, timeout, 404 (package not
 * yet published), or malformed JSON. `doctor` never fails the whole run over
 * an unreachable registry; the version check degrades to "unavailable".
 */
export async function fetchLatestNpmVersion(
	url: string = NPM_REGISTRY_URL,
	timeoutMs: number = NPM_FETCH_TIMEOUT_MS
): Promise<string | null> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) {
			return null;
		}

		const body = (await response.json()) as { "dist-tags"?: { latest?: string } };

		return body["dist-tags"]?.latest ?? null;
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

/**
 * Parses the `version` field out of a raw `package.json` string, degrading to
 * `"unknown"` on a missing file (`pkgRaw === null`) or malformed JSON — same
 * catch-and-degrade pattern as every other check in this file, so a corrupted
 * `package.json` at the PRISM source root is a finding, not a crash.
 */
function readInstalledVersion(pkgRaw: string | null): string {
	if (pkgRaw === null) {
		return "unknown";
	}

	try {
		const pkg = JSON.parse(pkgRaw) as { version?: string };
		return pkg.version ?? "unknown";
	} catch {
		return "unknown";
	}
}

/**
 * Compares two `major.minor.patch` strings field-by-field as numbers, returning
 * a negative number when `a` is older, zero when equal, and a positive number
 * when `a` is newer. Returns `null` when either string is not three numeric
 * fields — `"unknown"` from a missing `package.json` lands here, and an
 * unorderable pair produces no staleness claim at all.
 *
 * A text compare would order `0.10.0` before `0.9.0`, so the fields are parsed
 * to numbers before comparison.
 */
function compareVersions(a: string, b: string): number | null {
	const parse = (value: string): number[] | null => {
		const fields = value.split(".");

		if (fields.length !== 3) {
			return null;
		}

		const numbers = fields.map((field) => (/^\d+$/.test(field) ? Number(field) : Number.NaN));

		return numbers.some(Number.isNaN) ? null : numbers;
	};

	const left = parse(a);
	const right = parse(b);

	if (left === null || right === null) {
		return null;
	}

	for (let index = 0; index < 3; index += 1) {
		if (left[index] !== right[index]) {
			return left[index] - right[index];
		}
	}

	return 0;
}

/**
 * Reads the installed PRISM version from `prismSourceRoot`'s own
 * `package.json`, then compares it against npm's `latest` dist-tag via
 * `fetcher` (defaults to `fetchLatestNpmVersion`, overridable so tests never
 * depend on live network).
 */
async function checkVersion(
	prismSourceRoot: string,
	fetcher: NpmVersionFetcher
): Promise<{ findings: DoctorFinding[]; version: VersionReport }> {
	const pkgRaw = await readFileIfExists(path.join(prismSourceRoot, "package.json"));
	const installed = readInstalledVersion(pkgRaw);

	const latest = await fetcher(NPM_REGISTRY_URL, NPM_FETCH_TIMEOUT_MS);
	const ordering = latest === null ? null : compareVersions(installed, latest);
	const outOfDate = ordering !== null && ordering < 0;

	const findings: DoctorFinding[] = [];
	if (latest === null) {
		findings.push({
			check: "version",
			severity: "info",
			message: `Installed version ${installed}; latest-on-npm check unavailable (offline, unpublished, or registry unreachable).`,
		});
	} else if (outOfDate) {
		findings.push({
			check: "version",
			severity: "warning",
			message: `Installed version ${installed} is behind the latest published version ${latest}.`,
		});
	}

	return { findings, version: { installed, latest, outOfDate } };
}

export interface RunDoctorOptions {
	consumerRepoRoot: string;
	prismSourceRoot: string;
	/** Overridable for tests — defaults to the real npm registry fetch. */
	npmVersionFetcher?: NpmVersionFetcher;
	/**
	 * Findings collected before `runDoctor` was called — e.g. `runDoctorCli`
	 * resolving `prismSourceRoot` itself failed. Prepended to the report so a
	 * pre-check failure still surfaces alongside every other check's findings
	 * instead of replacing them.
	 */
	additionalFindings?: DoctorFinding[];
}

/**
 * Runs every health check and returns a single report. Each check is
 * independent — a config-schema failure does not prevent the git-repo, sync-
 * manifest, or version checks from also running, so a consumer sees every
 * problem in one pass instead of fixing them one at a time across repeated
 * runs.
 */
export async function runDoctor(options: RunDoctorOptions): Promise<DoctorReport> {
	const {
		consumerRepoRoot,
		prismSourceRoot,
		npmVersionFetcher = fetchLatestNpmVersion,
		additionalFindings = [],
	} = options;
	const consumerContentRoot = path.join(consumerRepoRoot, ".prism");

	const findings: DoctorFinding[] = [...additionalFindings];

	findings.push(...(await checkConfigSchema(consumerRepoRoot, prismSourceRoot)));
	findings.push(...checkGitRepo(consumerRepoRoot));

	const syncResult = await checkSyncManifest(consumerContentRoot);
	findings.push(...syncResult.findings);

	// A consumer with no sync manifest has never run `prism adopt`, so it was
	// never delivered a renamed file in the first place — skip the check
	// rather than misreport it as unhealthy with a "re-run prism:update"
	// remedy that doesn't apply pre-adopt.
	if (syncResult.syncState.manifest !== null) {
		findings.push(...(await checkSeedDelivery(consumerContentRoot, prismSourceRoot)));
	}

	findings.push(...(await checkRuleLoadDeclarations(consumerContentRoot)));
	findings.push(...(await checkArchitectRoutes(consumerContentRoot)));
	findings.push(...(await checkHookRegistration(consumerRepoRoot)));

	const versionResult = await checkVersion(prismSourceRoot, npmVersionFetcher);
	findings.push(...versionResult.findings);

	return {
		findings,
		syncState: syncResult.syncState,
		version: versionResult.version,
		healthy: !findings.some((f) => f.severity === "error"),
	};
}

const SEVERITY_LABEL: Record<DoctorFinding["severity"], string> = {
	error: "ERROR",
	warning: "WARN",
	info: "INFO",
};

/** Renders a `DoctorReport` as human-readable lines, in the order `runDoctorCli` prints them. */
export function formatDoctorReport(report: DoctorReport): string {
	const lines: string[] = [];

	if (report.syncState.manifest !== null) {
		const { prismOwnedCount, consumerOwnedCount } = report.syncState.manifest;
		lines.push(
			`Sync state: ${prismOwnedCount} PRISM-owned file(s), ${consumerOwnedCount} consumer-owned file(s) recorded.`
		);
	}

	lines.push(
		report.version.latest !== null
			? `Version: ${report.version.installed} installed, ${report.version.latest} latest on npm.`
			: `Version: ${report.version.installed} installed, latest-on-npm unavailable.`
	);

	if (report.findings.length === 0) {
		lines.push("No issues found.");
	} else {
		for (const finding of report.findings) {
			lines.push(`[${SEVERITY_LABEL[finding.severity]}] ${finding.check}: ${finding.message}`);
		}
	}

	lines.push(report.healthy ? "prism doctor: healthy." : "prism doctor: unhealthy — see findings above.");

	return lines.join("\n");
}

export async function runDoctorCli(): Promise<void> {
	const argv = process.argv.slice(2);
	const consumerRepoRoot = resolveConsumerRoot({
		explicitConsumer: parseConsumerFlag(argv),
		cwd: process.cwd(),
		selfPrismRoot: resolveSelfPrismSource(),
	});
	const { prismSourceRoot, finding: resolutionFinding } = resolvePrismSourceOrFinding(
		argv,
		consumerRepoRoot
	);

	const report = await runDoctor({
		consumerRepoRoot,
		prismSourceRoot,
		additionalFindings: resolutionFinding !== null ? [resolutionFinding] : [],
	});

	console.log(formatDoctorReport(report));

	if (!report.healthy) {
		process.exitCode = 1;
	}
}

if (isDirectCliEntry("doctor")) {
	runDoctorCli().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
