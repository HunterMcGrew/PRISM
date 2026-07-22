#!/usr/bin/env tsx
/**
 * PRISM canonical-source build.
 *
 * Reads `.ai-skills/skills/<id>/{frontmatter.yml, shared.md, claude.md, codex.md, cursor.md}`
 * and generates platform-specific outputs:
 *   - .claude/skills/<id>/SKILL.md
 *   - .agents/skills/<id>/SKILL.md (Codex)
 *   - .codex/agents/<id>.toml (Codex agent adapter)
 *   - .cursor/skills/<id>/SKILL.md (Cursor)
 *   - .codex/codex-config.toml
 *
 * Run `pnpm prism:build` to regenerate, or `pnpm prism:check` to fail on drift.
 *
 * Ported from TracTru/thrive#1758's scripts/ai-skills/sync.ts. Renamed to
 * build.ts to free up "sync" for the future Phase 2 consumer-side install flow.
 */
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
	collectTier1RuleBodies,
	renderTier1Block,
	replaceTier1Block,
} from "./agents-md-block";
import { deriveTokenMap, loadConfig, substituteTokens } from "./lib/tokens";
import { isDirectCliEntry } from "./lib/cli-entry";
import { runBomGuard } from "./bom-guard";
import {
	runConsumerSeedLiteralGuard,
	runLeftoverTokenGuard,
	runLiteralGuard,
} from "./literal-guard";
import { runPathGuard } from "./path-guard";
import { isSkillLoadRuleFile, validateCanonicalRuleLoadDeclarations } from "./rule-load";
import { generateSyncManifest, writeSyncManifest } from "./sync-manifest";
import {
	codexRuleDialect,
	cursorRuleDialect,
	type RuleDialect,
	verbatimRuleDialect,
} from "./rule-dialect";
import {
	buildRoleMap,
	generatePlatformSkills,
	GENERATED_MARKDOWN_HEADER_LINE,
	type RolesDefinitions,
} from "./generate-skills";
import {
	buildPlatformDirs,
	ensureDirectory,
	filesAreEqual,
	GENERATED_HEADER_LINE,
	listRelativeDirectoryEntries,
	loadPathDefinitions,
	MANAGED_MARKER,
	pathExists,
	readFileIfExists,
	writeFileIfChanged,
} from "./utils";

export {
	buildClaudeAgentMarkdown,
	buildCodexAgentToml,
	buildRoleMap,
	CLAUDE_AGENT_MODEL_DEFAULTS,
	type RoleDefinition,
	type RolesDefinitions,
} from "./generate-skills";
export { listRelativeDirectoryEntries } from "./utils";

export interface SeedCuration {
	excluded: string[];
	curated: string[];
	seedOnly: string[];
	renames: Record<string, string>;
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.PRISM_REPO_ROOT
	? path.resolve(process.env.PRISM_REPO_ROOT)
	: path.resolve(scriptDirectory, "../..");

const checkMode = process.argv.includes("--check");
const changedPaths: string[] = [];

async function loadJsonFile<T>(
	relativePath: string,
	fileLabel: string
): Promise<T> {
	const absolutePath = path.join(repoRoot, relativePath);
	if (!(await pathExists(absolutePath))) {
		throw new Error(`Missing ${fileLabel}: ${absolutePath}`);
	}

	try {
		return JSON.parse(await fs.readFile(absolutePath, "utf8")) as T;
	} catch (error) {
		throw new Error(
			`Invalid ${fileLabel} JSON at ${absolutePath}: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

/**
 * Areas under the canonical contentRoot (.prism/) that get mirrored to every
 * platform copy directory. Agent-written areas (plans/, lessons.md) are
 * deliberately excluded — those live only at canonical.
 */
const COPIED_CONTENT_AREAS = [
	"rules",
	"architect",
	"spec",
	"templates",
	"references",
] as const;
const COPIED_LOOSE_FILES = ["SPEC.md"] as const;

/** The `COPIED_CONTENT_AREAS` entry whose files carry `load:` frontmatter semantics. */
const RULES_AREA_NAME = "rules";

/**
 * Copies all managed content areas from `contentRoot` into `platformDir`,
 * applying token substitution and dialect transformation per file.
 *
 * `targetSubpath` controls where within each area dir the output lands:
 * `""` (default) writes directly into `<platformDir>/<area>/` (base pass);
 * `"custom"` writes into `<platformDir>/<area>/custom/` (overlay pass).
 *
 * Within the `rules` area, a file declaring `load: skill` is skipped entirely
 * — Tier-3 rules never reach any platform's always-on rules surface; they
 * exist only under the canonical (or consumer) `.prism/rules/`. The check
 * reads `load:` in `"warn"` mode so a legacy rule with no declaration copies
 * as before rather than being silently dropped (the ratified consumer-facing
 * default), regardless of which caller (PRISM's own build or a consumer's
 * `prism update`) is running this pass.
 */
export async function copyContentToPlatformDir(
	contentRoot: string,
	platformDir: string,
	checkModeArg: boolean,
	changedPathsArg: string[],
	tokenMap: Map<string, string>,
	dialect: RuleDialect = verbatimRuleDialect,
	targetSubpath = ""
): Promise<void> {
	for (const area of COPIED_CONTENT_AREAS) {
		const sourceArea = path.join(contentRoot, area);
		const targetArea = path.join(platformDir, area, targetSubpath);
		if (!(await pathExists(sourceArea))) {
			continue;
		}

		const entries = await listRelativeDirectoryEntries(sourceArea);
		for (const entry of entries) {
			if (entry.kind !== "file") {
				continue;
			}
			const sourcePath = path.join(sourceArea, entry.relativePath);
			if (area === RULES_AREA_NAME && (await isSkillLoadRuleFile(sourcePath))) {
				continue;
			}
			const targetRelativePath = dialect.mapTargetRelativePath(
				area,
				entry.relativePath
			);
			const targetPath = path.join(targetArea, targetRelativePath);
			await copyContentFileWithSubstitution(
				sourcePath,
				targetPath,
				checkModeArg,
				changedPathsArg,
				tokenMap,
				(content) => dialect.transformContent(area, content)
			);
		}

		await writeFileIfChanged(
			path.join(targetArea, MANAGED_MARKER),
			"Managed by scripts/ai-skills/build.ts\n",
			checkModeArg,
			changedPathsArg
		);
	}

	// Loose files (SPEC.md) belong to the base content pass only. The overlay
	// (.prism/custom) mirrors the area dirs, not the loose top-level files, so
	// it never carries a SPEC.md to copy. Skip them when emitting into a subpath.
	if (targetSubpath !== "") {
		return;
	}

	for (const looseFile of COPIED_LOOSE_FILES) {
		const sourcePath = path.join(contentRoot, looseFile);
		const targetPath = path.join(platformDir, looseFile);
		if (!(await pathExists(sourcePath))) {
			continue;
		}
		await copyContentFileWithSubstitution(
			sourcePath,
			targetPath,
			checkModeArg,
			changedPathsArg,
			tokenMap
		);
	}
}

/**
 * Reads a canonical-content file, substitutes tokens against the build's
 * token map, and writes the substituted form to its platform-copy target.
 * Drift detection compares the on-disk target against the substituted output,
 * so `prism:check` operates on the post-substitution form — what consumers
 * actually load — not on the canonical-with-token-literals source.
 */
async function copyContentFileWithSubstitution(
	sourcePath: string,
	targetPath: string,
	checkModeArg: boolean,
	changedPathsArg: string[],
	tokenMap: Map<string, string>,
	transformContent: (content: string) => string = (content) => content
): Promise<void> {
	const sourceContent = await fs.readFile(sourcePath, "utf8");
	const substituted = transformContent(substituteTokens(sourceContent, tokenMap));

	await writeFileIfChanged(
		targetPath,
		substituted,
		checkModeArg,
		changedPathsArg
	);
}

/**
 * Wraps the per-platform copy + cleanup so platforms without managed content
 * are treated as opt-out in check mode rather than reported as drift. The
 * signal is the area-level managed marker — if no copied area carries it,
 * `prism:build` has never run for this platform and a fresh clone shouldn't
 * fail `prism:check` over it. Once any area is built, the marker is present
 * and drift detection picks the platform up on subsequent checks.
 *
 * Plain "does the platform dir exist" isn't a strong enough signal because
 * `ensureDirectory(targetRoots.codexAgents)` materializes `.codex/` early in
 * main() for the skill-output side of the build, even when no content copy
 * has happened.
 */
export async function syncPlatformContentCopy(
	contentRoot: string,
	platformDir: string,
	checkModeArg: boolean,
	changedPathsArg: string[],
	tokenMap: Map<string, string>,
	dialect: RuleDialect = verbatimRuleDialect,
	targetSubpath = ""
): Promise<void> {
	if (
		checkModeArg &&
		!(await platformHasManagedContent(platformDir, targetSubpath))
	) {
		return;
	}

	await copyContentToPlatformDir(
		contentRoot,
		platformDir,
		checkModeArg,
		changedPathsArg,
		tokenMap,
		dialect,
		targetSubpath
	);
	await removeDeletedManagedContent(
		contentRoot,
		platformDir,
		checkModeArg,
		changedPathsArg,
		dialect,
		targetSubpath
	);
}

/**
 * Runs `syncPlatformContentCopy` for every platform dir, each with its own rule
 * dialect. Both `main()` (PRISM's own build) and the consumer-side
 * `pnpm prism:update` flow call this after `.prism/` is in its final state, so
 * the loop lives here once rather than being duplicated across the two entry
 * points.
 */
export async function syncAllPlatformContentCopies(
	contentRoot: string,
	platformDirs: { dir: string; dialect: RuleDialect }[],
	checkModeArg: boolean,
	changedPathsArg: string[],
	tokenMap: Map<string, string>,
	targetSubpath = ""
): Promise<void> {
	for (const { dir, dialect } of platformDirs) {
		await syncPlatformContentCopy(
			contentRoot,
			dir,
			checkModeArg,
			changedPathsArg,
			tokenMap,
			dialect,
			targetSubpath
		);
	}
}

async function platformHasManagedContent(
	platformDir: string,
	targetSubpath = ""
): Promise<boolean> {
	for (const area of COPIED_CONTENT_AREAS) {
		if (
			await pathExists(path.join(platformDir, area, targetSubpath, MANAGED_MARKER))
		) {
			return true;
		}
	}
	return false;
}

async function skillsRootHasManagedContent(
	skillsRoot: string
): Promise<boolean> {
	if (!(await pathExists(skillsRoot))) {
		return false;
	}
	const entries = await fs.readdir(skillsRoot, { withFileTypes: true });
	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name.startsWith(".")) {
			continue;
		}
		if (await pathExists(path.join(skillsRoot, entry.name, MANAGED_MARKER))) {
			return true;
		}
	}
	return false;
}

async function codexAgentsRootHasManagedContent(
	agentsRoot: string
): Promise<boolean> {
	if (!(await pathExists(agentsRoot))) {
		return false;
	}
	const entries = await fs.readdir(agentsRoot, { withFileTypes: true });
	for (const entry of entries) {
		if (
			!entry.isFile() ||
			!entry.name.endsWith(".toml") ||
			entry.name.startsWith(".")
		) {
			continue;
		}
		const content =
			(await readFileIfExists(path.join(agentsRoot, entry.name))) ?? "";
		if (content.startsWith(GENERATED_HEADER_LINE)) {
			return true;
		}
	}
	return false;
}

async function claudeAgentsRootHasManagedContent(
	agentsRoot: string
): Promise<boolean> {
	if (!(await pathExists(agentsRoot))) {
		return false;
	}
	const entries = await fs.readdir(agentsRoot, { withFileTypes: true });
	for (const entry of entries) {
		if (
			!entry.isFile() ||
			!entry.name.endsWith(".md") ||
			entry.name.startsWith(".")
		) {
			continue;
		}
		const content =
			(await readFileIfExists(path.join(agentsRoot, entry.name))) ?? "";
		if (content.includes(GENERATED_MARKDOWN_HEADER_LINE)) {
			return true;
		}
	}
	return false;
}

/**
 * Removes managed build-copy files under `<platformDir>/<area>/` whose
 * canonical source no longer exists. Detects the build copy by the presence of
 * the area-level managed marker; refuses to delete files in directories that
 * lack the marker.
 */
export async function removeDeletedManagedContent(
	contentRoot: string,
	platformDir: string,
	checkModeArg: boolean,
	changedPathsArg: string[],
	dialect: RuleDialect = verbatimRuleDialect,
	targetSubpath = ""
): Promise<void> {
	for (const area of COPIED_CONTENT_AREAS) {
		const targetArea = path.join(platformDir, area, targetSubpath);
		const sourceArea = path.join(contentRoot, area);
		const markerPath = path.join(targetArea, MANAGED_MARKER);
		if (!(await pathExists(targetArea)) || !(await pathExists(markerPath))) {
			continue;
		}

		const entries = await listRelativeDirectoryEntries(targetArea);
		for (const entry of entries) {
			if (entry.kind !== "file") {
				continue;
			}
			if (entry.relativePath === MANAGED_MARKER) {
				continue;
			}
			// Scope the base pass to its own files: when no subpath is set, the
			// overlay's custom/ subtree is a separate managed tree with its own
			// marker. Its files have no canonical source under the base area, so
			// the base cleanup would otherwise treat every overlay file as an
			// orphan and delete it. Base and overlay cleanup never cross.
			if (targetSubpath === "" && entry.relativePath.startsWith(`custom${path.sep}`)) {
				continue;
			}
			const sourceRelativePath = dialect.mapSourceRelativePath(
				area,
				entry.relativePath
			);
			const sourcePath = path.join(sourceArea, sourceRelativePath);
			// A target is live only when its canonical source exists AND that
			// source maps forward to this exact target name. The forward check
			// catches stale verbatim copies left behind when the dialect renames
			// (e.g. a pre-existing `.cursor/rules/foo.md` once the Cursor dialect
			// began emitting `foo.mdc`): the source `foo.md` still exists, but it
			// now maps to `foo.mdc`, so the old `.md` copy is an orphan.
			const sourceExists = await pathExists(sourcePath);
			const sourceMapsBack =
				dialect.mapTargetRelativePath(area, sourceRelativePath) ===
				entry.relativePath;
			// A rule reclassified to `load: skill` keeps its canonical source file
			// but must stop appearing on every platform's always-on surface — treat
			// it the same as a deleted source so the stale copy is swept.
			const sourceIsSkillRule =
				sourceExists &&
				area === RULES_AREA_NAME &&
				(await isSkillLoadRuleFile(sourcePath));
			if (sourceExists && sourceMapsBack && !sourceIsSkillRule) {
				continue;
			}
			const targetPath = path.join(targetArea, entry.relativePath);
			changedPathsArg.push(targetPath);
			if (checkModeArg) {
				continue;
			}
			await fs.rm(targetPath, { force: true });
		}

		if (!(await pathExists(sourceArea))) {
			// A base pass must not recursively remove an area whose overlay
			// subtree (custom/) is still managed — that subtree has its own
			// source under .prism/custom and its own cleanup pass. Removing the
			// area wholesale here would cross into the overlay's lane.
			const overlayMarkerPath = path.join(
				targetArea,
				"custom",
				MANAGED_MARKER
			);
			if (targetSubpath === "" && (await pathExists(overlayMarkerPath))) {
				continue;
			}

			changedPathsArg.push(targetArea);
			if (!checkModeArg) {
				await fs.rm(targetArea, { force: true, recursive: true });
			}
		}
	}
}

/**
 * Inlines the Tier-1 rule bodies into AGENTS.md's generated block.
 *
 * Codex auto-loads only AGENTS.md; the generated block ensures every Tier-1
 * rule body (rules with no `paths:` frontmatter) is present in Codex sessions.
 * When AGENTS.md is absent the function returns early — lazy, no creation.
 * Follows the same check-mode / changedPaths contract as `writeFileIfChanged`.
 */
export async function syncAgentsMdTier1Block(
	repoRootArg: string,
	checkModeArg: boolean,
	changedPathsArg: string[],
	tokenMap: Map<string, string>
): Promise<void> {
	const agentsPath = path.join(repoRootArg, "AGENTS.md");

	if (!(await pathExists(agentsPath))) {
		return;
	}

	const current = await fs.readFile(agentsPath, "utf8");
	const rules = await collectTier1RuleBodies(
		path.join(repoRootArg, ".prism", "rules"),
		tokenMap
	);
	const block = renderTier1Block(rules);
	const next = replaceTier1Block(current, block);

	if (next === current) {
		return;
	}

	changedPathsArg.push(agentsPath);

	if (!checkModeArg) {
		await fs.writeFile(agentsPath, next, "utf8");
	}
}

/**
 * Checks for drift between the canonical content root and the install seed
 * (`templates/install/.prism/`). Check-mode only — never writes, moves, or
 * deletes any file.
 *
 * Compares raw unsubstituted bytes per ADR-0030: the seed ships tokens as
 * literals; substitution happens at install time, not at seed-write time.
 * Calling substituteTokens() here would produce false-positive drift on every
 * token-bearing file.
 */
export async function checkSeedDrift(
	contentRoot: string,
	seedRoot: string,
	curation: SeedCuration,
	changedPathsArg: string[]
): Promise<void> {
	if (!(await pathExists(seedRoot))) {
		return;
	}

	const excludedSet = new Set(curation.excluded);
	const curatedSet = new Set(curation.curated);
	const seedOnlySet = new Set(curation.seedOnly);
	const renames = curation.renames;
	const renameValues = new Set(Object.values(renames));

	for (const area of COPIED_CONTENT_AREAS) {
		const sourceArea = path.join(contentRoot, area);
		if (!(await pathExists(sourceArea))) {
			continue;
		}

		const entries = await listRelativeDirectoryEntries(sourceArea);
		for (const entry of entries) {
			if (entry.kind !== "file") {
				continue;
			}

			const relPath = path.posix.join(area, entry.relativePath.replace(/\\/g, "/"));

			if (excludedSet.has(relPath)) {
				const seedPath = path.join(seedRoot, relPath);
				if (await pathExists(seedPath)) {
					changedPathsArg.push(`seed contains excluded file: ${relPath}`);
				}
				continue;
			}

			if (relPath in renames) {
				const renamedRelPath = renames[relPath];
				const renamedSeedPath = path.join(seedRoot, renamedRelPath);
				if (!(await pathExists(renamedSeedPath))) {
					changedPathsArg.push(`seed drift: ${relPath} (expected renamed as ${renamedRelPath})`);
				}
				continue;
			}

			if (curatedSet.has(relPath)) {
				const seedPath = path.join(seedRoot, relPath);
				if (!(await pathExists(seedPath))) {
					changedPathsArg.push(`seed drift: ${relPath} (curated file missing from seed)`);
				}
				continue;
			}

			const seedPath = path.join(seedRoot, relPath);
			if (!(await pathExists(seedPath))) {
				changedPathsArg.push(`seed drift: ${relPath}`);
				continue;
			}

			if (!(await filesAreEqual(path.join(sourceArea, entry.relativePath), seedPath))) {
				changedPathsArg.push(`seed drift: ${relPath}`);
			}
		}
	}

	for (const looseFile of COPIED_LOOSE_FILES) {
		const relPath = looseFile;
		if (excludedSet.has(relPath) || seedOnlySet.has(relPath) || curatedSet.has(relPath)) {
			continue;
		}

		if (relPath in renames) {
			const renamedRelPath = renames[relPath];
			const renamedSeedPath = path.join(seedRoot, renamedRelPath);
			if (!(await pathExists(renamedSeedPath))) {
				changedPathsArg.push(`seed drift: ${relPath} (expected renamed as ${renamedRelPath})`);
			}
			continue;
		}

		const sourcePath = path.join(contentRoot, looseFile);
		const seedPath = path.join(seedRoot, looseFile);
		if (!(await pathExists(sourcePath))) {
			continue;
		}
		if (!(await pathExists(seedPath))) {
			changedPathsArg.push(`seed drift: ${relPath}`);
			continue;
		}
		if (!(await filesAreEqual(sourcePath, seedPath))) {
			changedPathsArg.push(`seed drift: ${relPath}`);
		}
	}

	for (const area of COPIED_CONTENT_AREAS) {
		const seedArea = path.join(seedRoot, area);
		if (!(await pathExists(seedArea))) {
			continue;
		}

		const seedEntries = await listRelativeDirectoryEntries(seedArea);
		for (const seedEntry of seedEntries) {
			if (seedEntry.kind !== "file") {
				continue;
			}

			const relPath = path.posix.join(area, seedEntry.relativePath.replace(/\\/g, "/"));

			if (curatedSet.has(relPath) || seedOnlySet.has(relPath) || renameValues.has(relPath)) {
				continue;
			}

			const canonicalPath = path.join(contentRoot, relPath);
			if (!(await pathExists(canonicalPath))) {
				changedPathsArg.push(`seed orphan: ${relPath}`);
			}
		}
	}
}

/**
 * Writes non-curated canonical files to the install seed so prism:build is the
 * single command that keeps templates/install/.prism/ in parity. The build-mode
 * inverse of checkSeedDrift: same classification (excluded / renames / curated
 * skipped), but writes the raw canonical bytes instead of comparing them.
 *
 * Raw bytes, not substituted: the seed ships tokens as literals (ADR-0030), and
 * checkSeedDrift compares raw bytes — so the write path must NOT call
 * substituteTokens or copyContentFileWithSubstitution. Use writeFileIfChanged
 * with fs.readFile output directly. Idempotent: writeFileIfChanged is a no-op
 * when the seed already matches, so a second prism:build produces no git diff.
 *
 * unclassifiedMirrored collects non-curated files that are absent from every
 * tier in seed-curation.json — main() warns on these so a forgotten curation
 * decision surfaces at build time (see Decision: unclassified-file handling).
 */
export async function writeSeedMirror(
	contentRoot: string,
	seedRoot: string,
	curation: SeedCuration,
	checkModeArg: boolean,
	changedPathsArg: string[],
	unclassifiedMirrored: string[]
): Promise<void> {
	const excludedSet = new Set(curation.excluded);
	const curatedSet = new Set(curation.curated);
	const renames = curation.renames;

	for (const area of COPIED_CONTENT_AREAS) {
		const sourceArea = path.join(contentRoot, area);
		if (!(await pathExists(sourceArea))) {
			continue;
		}

		const entries = await listRelativeDirectoryEntries(sourceArea);
		for (const entry of entries) {
			if (entry.kind !== "file") {
				continue;
			}

			const relPath = path.posix.join(area, entry.relativePath.replace(/\\/g, "/"));

			if (excludedSet.has(relPath)) {
				continue;
			}

			if (relPath in renames) {
				continue;
			}

			if (curatedSet.has(relPath)) {
				continue;
			}

			const seedFilePath = path.join(seedRoot, relPath);
			const seedFileIsNew = !(await pathExists(seedFilePath));
			const raw = await fs.readFile(path.join(sourceArea, entry.relativePath), "utf8");
			await writeFileIfChanged(seedFilePath, raw, checkModeArg, changedPathsArg);
			if (seedFileIsNew) {
				unclassifiedMirrored.push(relPath);
			}
		}
	}

	for (const looseFile of COPIED_LOOSE_FILES) {
		const relPath = looseFile;
		const seedOnlySet = new Set(curation.seedOnly);

		if (excludedSet.has(relPath) || seedOnlySet.has(relPath) || curatedSet.has(relPath)) {
			continue;
		}

		if (relPath in renames) {
			continue;
		}

		const sourcePath = path.join(contentRoot, looseFile);
		if (!(await pathExists(sourcePath))) {
			continue;
		}

		const seedFilePath = path.join(seedRoot, looseFile);
		const seedFileIsNew = !(await pathExists(seedFilePath));
		const raw = await fs.readFile(sourcePath, "utf8");
		await writeFileIfChanged(seedFilePath, raw, checkModeArg, changedPathsArg);
		if (seedFileIsNew) {
			unclassifiedMirrored.push(relPath);
		}
	}
}

const execFileAsync = promisify(execFile);

/**
 * Reads the `version` field from the repo-root `package.json`, falling back to
 * `"0.0.0"` when the field is missing so manifest generation never throws on a
 * malformed package file.
 */
export async function resolvePrismVersion(repoRootArg: string): Promise<string> {
	const packageJsonPath = path.join(repoRootArg, "package.json");
	const raw = await readFileIfExists(packageJsonPath);
	if (raw === null) {
		return "0.0.0";
	}

	try {
		const parsed = JSON.parse(raw) as { version?: unknown };
		return typeof parsed.version === "string" ? parsed.version : "0.0.0";
	} catch {
		return "0.0.0";
	}
}

/**
 * Resolves the current commit SHA via `git rev-parse HEAD`, returning
 * `"unknown"` when git is unavailable or the repo root is not a git checkout
 * (e.g. a tarball install) so the manifest still generates.
 */
export async function resolveSourceCommit(repoRootArg: string): Promise<string> {
	try {
		const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
			cwd: repoRootArg,
		});
		return stdout.trim() || "unknown";
	} catch {
		return "unknown";
	}
}

async function main(): Promise<void> {
	const pathDefinitions = await loadPathDefinitions(repoRoot);
	const roleDefinitions = await loadJsonFile<RolesDefinitions>(
		".ai-skills/definitions/roles.json",
		"roles definitions"
	);
	const seedCuration = await loadJsonFile<SeedCuration>(
		".ai-skills/definitions/seed-curation.json",
		"seed curation manifest"
	);
	const config = loadConfig(repoRoot);
	const tokenMap = deriveTokenMap(config);

	const sourceSkillsRoot = path.join(
		repoRoot,
		pathDefinitions.canonical.skillsRoot
	);
	if (!(await pathExists(sourceSkillsRoot))) {
		throw new Error(
			`Missing canonical skill source directory: ${sourceSkillsRoot}`
		);
	}

	const targetRoots = {
		claude: path.join(repoRoot, pathDefinitions.generated.claudeSkillsRoot),
		claudeAgents: path.join(
			repoRoot,
			pathDefinitions.generated.claudeAgentsRoot
		),
		codex: path.join(repoRoot, pathDefinitions.generated.codexSkillsRoot),
		codexAgents: path.join(repoRoot, pathDefinitions.generated.codexAgentsRoot),
		cursor: path.join(repoRoot, pathDefinitions.generated.cursorSkillsRoot),
	};
	const codexConfigPath = path.join(
		repoRoot,
		pathDefinitions.generated.codexConfigFile
	);

	const optedIn = {
		claude:
			!checkMode || (await skillsRootHasManagedContent(targetRoots.claude)),
		// `.agents/` is gitignored (the per-user Codex skills root), so a branch
		// checkout leaves prior-branch content in place. In check mode that stale
		// content would make skillsRootHasManagedContent return true, causing
		// drift against the freshly-generated output — a false positive. Build
		// mode still writes `.agents/` normally.
		codex: !checkMode,
		cursor:
			!checkMode || (await skillsRootHasManagedContent(targetRoots.cursor)),
		codexAgents:
			!checkMode ||
			(await codexAgentsRootHasManagedContent(targetRoots.codexAgents)),
		claudeAgents:
			!checkMode ||
			(await claudeAgentsRootHasManagedContent(targetRoots.claudeAgents)),
		// `.codex/codex-config.toml` is gitignored (per-user), so a branch
		// checkout leaves prior-branch content on disk. Skipping the pathExists
		// check in check mode prevents stale presence from being treated as drift.
		codexConfig: !checkMode,
	};

	if (!checkMode) {
		for (const targetRoot of Object.values(targetRoots)) {
			await ensureDirectory(targetRoot);
		}
	}

	const roleMap = buildRoleMap(roleDefinitions);

	await generatePlatformSkills({
		sourceSkillsRoot,
		targetRoots,
		codexConfigPath,
		roleMap,
		tokenMap,
		optedIn,
		checkMode,
		changedPaths,
	});

	const contentRoot = path.join(repoRoot, pathDefinitions.canonical.contentRoot);
	const templatesContentRoot = path.join(
		repoRoot,
		pathDefinitions.canonical.templatesContentRoot
	);

	const guardedRoots: { absolutePath: string; relativeLabel: string }[] = [
		{
			absolutePath: contentRoot,
			relativeLabel: pathDefinitions.canonical.contentRoot,
		},
		{
			absolutePath: templatesContentRoot,
			relativeLabel: pathDefinitions.canonical.templatesContentRoot,
		},
	];
	let totalViolations = 0;
	for (const guardedRoot of guardedRoots) {
		if (!(await pathExists(guardedRoot.absolutePath))) {
			continue;
		}
		const violations = await runPathGuard(guardedRoot.absolutePath);
		if (violations.length === 0) {
			continue;
		}
		for (const violation of violations) {
			console.error(
				`path-guard: ${guardedRoot.relativeLabel}/${violation.relativePath}:${violation.line}: ${violation.text}`
			);
		}
		console.error(
			`path-guard: ${violations.length} violation(s) found in ${guardedRoot.relativeLabel}/. Canonical content must reference .prism/<area>/ paths, not platform-dir build copies.`
		);
		totalViolations += violations.length;
	}
	if (totalViolations > 0) {
		process.exit(1);
	}

	if (await pathExists(contentRoot)) {
		// Validates every canonical rule's `load:` declaration before any platform
		// copy is written — unconditionally, independent of whether AGENTS.md
		// exists (syncAgentsMdTier1Block's own validation only fires when it does,
		// which is not a strong enough guarantee to gate the platform-copy path).
		// A missing or invalid declaration throws here, naming the file, and the
		// build fails before any copy work happens.
		const rulesDir = path.join(contentRoot, "rules");
		if (await pathExists(rulesDir)) {
			await validateCanonicalRuleLoadDeclarations(rulesDir);
		}

		const platformDirs = buildPlatformDirs(repoRoot, pathDefinitions);
		await syncAllPlatformContentCopies(
			contentRoot,
			platformDirs,
			checkMode,
			changedPaths,
			tokenMap
		);

		// The manifest carries per-build volatile fields (sourceCommit,
		// generatedAt), so it is a build-mode-only output and gitignored — not a
		// drift target. Skipping it in check mode keeps prism:check stable across
		// commits instead of reporting drift on every new SHA.
		if (!checkMode) {
			const syncManifest = await generateSyncManifest(contentRoot, {
				prismVersion: await resolvePrismVersion(repoRoot),
				sourceCommit: await resolveSourceCommit(repoRoot),
				generatedAt: new Date().toISOString(),
			});
			await writeSyncManifest(contentRoot, syncManifest, false, changedPaths);
		}
	}

	const unclassifiedMirrored: string[] = [];
	if (!checkMode && (await pathExists(contentRoot))) {
		await writeSeedMirror(
			contentRoot,
			templatesContentRoot,
			seedCuration,
			checkMode,
			changedPaths,
			unclassifiedMirrored
		);
	}

	if (await pathExists(templatesContentRoot)) {
		const seedViolations = await runConsumerSeedLiteralGuard(
			repoRoot,
			templatesContentRoot
		);
		if (seedViolations.length > 0) {
			for (const violation of seedViolations) {
				console.error(
					`seed-literal-guard: ${violation.relativePath}:${violation.line}: ${violation.match}`
				);
			}
			console.error(
				`seed-literal-guard: ${seedViolations.length} dogfooding literal(s) in the install seed — consumers receive this content verbatim. Genericize the canonical source, or allowlist the file in .ai-skills/definitions/literal-allowlist.json.`
			);
			process.exit(1);
		}
	}

	await syncAgentsMdTier1Block(repoRoot, checkMode, changedPaths, tokenMap);

	// Skill-content roots: shared base for both Thrive-literal and leftover-token scanning.
	const skillContentRoots = [
		targetRoots.claude,
		targetRoots.claudeAgents,
		targetRoots.codex,
		targetRoots.cursor,
		targetRoots.codexAgents,
		path.join(repoRoot, pathDefinitions.generated.platformContentCopies.claude),
		path.join(repoRoot, pathDefinitions.generated.platformContentCopies.codex),
		path.join(repoRoot, pathDefinitions.generated.platformContentCopies.cursor),
	];

	const literalGuardRoots = skillContentRoots;
	const leftoverTokenGuardRoots = skillContentRoots;

	const bomViolations = await runBomGuard(repoRoot);
	if (bomViolations.length > 0) {
		for (const violation of bomViolations) {
			console.error(
				`bom-guard: ${violation.relativePath}: UTF-8 BOM detected at byte offset(s) ${violation.byteOffsets.join(", ")}`
			);
		}
		console.error(
			`bom-guard: ${bomViolations.length} canonical source file(s) contain a UTF-8 BOM. Re-save as UTF-8 without BOM.`
		);
		process.exit(1);
	}

	const literalViolations = await runLiteralGuard(repoRoot, literalGuardRoots);
	if (literalViolations.length > 0) {
		for (const violation of literalViolations) {
			console.error(
				`literal-guard: ${violation.relativePath}:${violation.line}: ${violation.match}`
			);
		}
		console.error(
			`literal-guard: ${literalViolations.length} non-allowlisted Thrive-flavored literal(s) found in platform outputs. Tokenize the canonical source or add the file to .ai-skills/definitions/literal-allowlist.json.`
		);
		process.exit(1);
	}

	const leftoverTokenViolations = await runLeftoverTokenGuard(
		repoRoot,
		leftoverTokenGuardRoots
	);
	if (leftoverTokenViolations.length > 0) {
		for (const violation of leftoverTokenViolations) {
			console.error(
				`leftover-token-guard: ${violation.relativePath}:${violation.line}: ${violation.match}`
			);
		}
		console.error(
			`leftover-token-guard: ${leftoverTokenViolations.length} unresolved \${TOKEN} literal(s) found in platform outputs. Add the token to the build's token map or fix the canonical source.`
		);
		process.exit(1);
	}

	if (checkMode) {
		await checkSeedDrift(contentRoot, templatesContentRoot, seedCuration, changedPaths);

		if (changedPaths.length > 0) {
			console.error("prism:check failed. These files are out of sync:");
			for (const changedPath of changedPaths) {
				const displayPath = path.isAbsolute(changedPath)
					? path.relative(repoRoot, changedPath)
					: changedPath;
				console.error(` - ${displayPath}`);
			}
			process.exit(1);
		}

		console.log("prism:check passed. Generated outputs are in sync.");
		return;
	}

	if (unclassifiedMirrored.length > 0) {
		console.warn(
			`prism:build auto-mirrored ${unclassifiedMirrored.length} unclassified file(s) to the install seed as non-curated:`
		);
		for (const relPath of unclassifiedMirrored) {
			console.warn(` - ${relPath}`);
		}
		console.warn(
			"If any of these should be curated (consumer-facing simplified) or excluded (dogfood-only), add them to .ai-skills/definitions/seed-curation.json and rebuild."
		);
	}

	if (changedPaths.length === 0) {
		console.log("prism:build completed. No changes needed.");
		return;
	}

	console.log(`prism:build completed. Updated ${changedPaths.length} file(s):`);
	for (const changedPath of changedPaths) {
		console.log(` - ${path.relative(repoRoot, changedPath)}`);
	}
}

if (isDirectCliEntry("build")) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
