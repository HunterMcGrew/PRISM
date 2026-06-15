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
import { runLiteralGuard } from "./literal-guard";
import { runPathGuard } from "./path-guard";
import { generateSyncManifest, writeSyncManifest } from "./sync-manifest";
import {
	codexRuleDialect,
	cursorRuleDialect,
	type RuleDialect,
	verbatimRuleDialect,
} from "./rule-dialect";
import {
	ensureDirectory,
	escapeToml,
	escapeTomlMultiline,
	GENERATED_HEADER_LINE,
	listDirectories,
	loadPathDefinitions,
	MANAGED_MARKER,
	MAX_FRONTMATTER_DESCRIPTION_LENGTH,
	normalizeFrontmatter,
	parseFrontmatter,
	pathExists,
	readFileIfExists,
	removeDeletedManagedSkills,
	writeFileIfChanged,
} from "./utils";

export interface RoleDefinition {
	id: string;
	persona?: string;
	type?: "persona" | "utility";
}

export interface RolesDefinitions {
	skills: RoleDefinition[];
}

export interface SeedCuration {
	excluded: string[];
	curated: string[];
	seedOnly: string[];
	renames: Record<string, string>;
}

interface SkillSource {
	claudeBody: string;
	codexBody: string;
	cursorBody: string;
	frontmatter: string;
	frontmatterMap: Map<string, string>;
	sharedBody: string;
}

interface BuildSkillMarkdownArgs {
	frontmatter: string;
	platformBody: string;
	platformName: string;
	sharedBody: string;
	skillId: string;
	tokenMap: Map<string, string>;
}

interface BuildCodexAgentTomlArgs {
	codexSkillMarkdown: string;
	description: string;
	roleDefinition: RoleDefinition;
	skillId: string;
	tokenMap: Map<string, string>;
}

interface BuildClaudeAgentMarkdownArgs {
	claudeSkillMarkdown: string;
	description: string;
	skillId: string;
	tokenMap: Map<string, string>;
}

/**
 * Default dispatch-model tier per persona agent definition.
 *
 * The conductor (Sol) and the architect (Winston) run on the strong model —
 * Sol is the dispatcher and Winston is the plan-readiness firewall, the two
 * roles the conductor tiering table never lets run cheap. Every other persona
 * defaults to the cheaper tier and escalates only on a stall signal at runtime.
 */
export const CLAUDE_AGENT_MODEL_DEFAULTS = new Map<string, string>([
	["prism-conductor", "opus"],
	["prism-architect", "opus"],
]);
const DEFAULT_CLAUDE_AGENT_MODEL = "sonnet";

const GENERATED_MARKDOWN_HEADER_LINE = "<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->";

type OptionalSkillPayload =
	| { kind: "directory"; relativePath: string }
	| { kind: "file"; relativePath: string };

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.PRISM_REPO_ROOT
	? path.resolve(process.env.PRISM_REPO_ROOT)
	: path.resolve(scriptDirectory, "../..");

const checkMode = process.argv.includes("--check");
const changedPaths: string[] = [];
const optionalSkillPayloads: OptionalSkillPayload[] = [
	{ kind: "directory", relativePath: "assets" },
	{ kind: "directory", relativePath: "references" },
	{ kind: "directory", relativePath: "scripts" },
	{ kind: "file", relativePath: path.join("agents", "openai.yaml") },
];

function buildSkillMarkdown({
	frontmatter,
	platformBody,
	platformName,
	sharedBody,
	skillId,
	tokenMap,
}: BuildSkillMarkdownArgs): string {
	const header = [
		"<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->",
		`<!-- Source: .ai-skills/skills/${skillId} -->`,
		`<!-- Target: ${platformName} | Regenerate with: pnpm prism:build -->`,
	].join("\n");

	const contentSections = [sharedBody.trim(), platformBody.trim()]
		.filter(Boolean)
		.join("\n\n");

	const assembled = `---\n${frontmatter}\n---\n\n${header}\n\n${contentSections}\n`;

	return substituteTokens(assembled, tokenMap);
}

export function buildCodexAgentToml({
	codexSkillMarkdown,
	description,
	roleDefinition,
	skillId,
	tokenMap,
}: BuildCodexAgentTomlArgs): string {
	const header = [
		GENERATED_HEADER_LINE,
		`# Source: .ai-skills/skills/${skillId}`,
		"# Target: codex-agent | Regenerate with: pnpm prism:build",
		"",
	].join("\n");

	const substitutedDescription = substituteTokens(description, tokenMap);
	// Utility entries carry no persona — the adapter opens with the skill
	// source line instead of a "You are X." identity.
	const substitutedPersona = roleDefinition.persona
		? substituteTokens(roleDefinition.persona, tokenMap)
		: undefined;

	const developerInstructions = [
		...(substitutedPersona ? [`You are ${substitutedPersona}.`] : []),
		`Canonical skill source: .ai-skills/skills/${skillId}`,
		"Follow this generated skill definition:",
		"",
		codexSkillMarkdown.trim(),
	].join("\n");

	return [
		header,
		`name = "${escapeToml(skillId)}"`,
		`description = "${escapeToml(substitutedDescription)}"`,
		'developer_instructions = """',
		escapeTomlMultiline(developerInstructions),
		'"""',
		"",
	].join("\n");
}

/**
 * Builds a Claude Code agent definition — YAML frontmatter (`name`,
 * `description`, `model`) followed by the generated Claude SKILL.md body — so a
 * dispatched persona loads its full persona at spawn under the conductor's
 * tiering table. The `model` is the per-persona default from
 * CLAUDE_AGENT_MODEL_DEFAULTS, falling back to the cheaper worker tier.
 */
export function buildClaudeAgentMarkdown({
	claudeSkillMarkdown,
	description,
	skillId,
	tokenMap,
}: BuildClaudeAgentMarkdownArgs): string {
	const header = [
		GENERATED_MARKDOWN_HEADER_LINE,
		`<!-- Source: .ai-skills/skills/${skillId} -->`,
		"<!-- Target: claude-agent | Regenerate with: pnpm prism:build -->",
	].join("\n");

	const substitutedDescription = substituteTokens(description, tokenMap).replace(
		/\s+/g,
		" "
	);
	const model =
		CLAUDE_AGENT_MODEL_DEFAULTS.get(skillId) ?? DEFAULT_CLAUDE_AGENT_MODEL;

	const frontmatter = [
		"---",
		`name: ${skillId}`,
		`description: ${JSON.stringify(substitutedDescription)}`,
		`model: ${model}`,
		"---",
	].join("\n");

	return `${frontmatter}\n\n${header}\n\n${claudeSkillMarkdown.trim()}\n`;
}

export interface RelativeDirectoryEntry {
	kind: "directory" | "file";
	relativePath: string;
}

export async function listRelativeDirectoryEntries(
	rootPath: string,
	currentPath: string = rootPath
): Promise<RelativeDirectoryEntry[]> {
	const entries = await fs.readdir(currentPath, { withFileTypes: true });
	const relativeEntries: RelativeDirectoryEntry[] = [];

	for (const entry of entries) {
		if (entry.name.startsWith(".")) {
			continue;
		}

		const entryPath = path.join(currentPath, entry.name);
		const relativePath = path.relative(rootPath, entryPath);

		if (entry.isDirectory()) {
			relativeEntries.push({ kind: "directory", relativePath });
			relativeEntries.push(
				...(await listRelativeDirectoryEntries(rootPath, entryPath))
			);
			continue;
		}

		if (entry.isFile()) {
			relativeEntries.push({ kind: "file", relativePath });
		}
	}

	return relativeEntries.sort((a, b) =>
		a.relativePath.localeCompare(b.relativePath)
	);
}

async function filesAreEqual(
	sourcePath: string,
	targetPath: string
): Promise<boolean> {
	const sourceContent = await fs.readFile(sourcePath);
	const targetContent = await fs.readFile(targetPath);

	return sourceContent.equals(targetContent);
}

async function directoriesAreEqual(
	sourcePath: string,
	targetPath: string
): Promise<boolean> {
	const sourceEntries = await listRelativeDirectoryEntries(sourcePath);
	const targetEntries = await listRelativeDirectoryEntries(targetPath);

	if (sourceEntries.length !== targetEntries.length) {
		return false;
	}

	for (let index = 0; index < sourceEntries.length; index += 1) {
		const sourceEntry = sourceEntries[index];
		const targetEntry = targetEntries[index];
		if (
			sourceEntry.kind !== targetEntry.kind ||
			sourceEntry.relativePath !== targetEntry.relativePath
		) {
			return false;
		}

		if (
			sourceEntry.kind === "file" &&
			!(await filesAreEqual(
				path.join(sourcePath, sourceEntry.relativePath),
				path.join(targetPath, sourceEntry.relativePath)
			))
		) {
			return false;
		}
	}

	return true;
}

async function payloadIsDifferent(
	sourcePath: string,
	targetPath: string,
	payloadKind: "file" | "directory"
): Promise<boolean> {
	if (!(await pathExists(targetPath))) {
		return true;
	}

	if (payloadKind === "file") {
		return !(await filesAreEqual(sourcePath, targetPath));
	}

	return !(await directoriesAreEqual(sourcePath, targetPath));
}

async function syncOptionalSkillPayloads(
	sourceSkillRoot: string,
	targetSkillRoot: string
): Promise<void> {
	for (const payload of optionalSkillPayloads) {
		const sourcePath = path.join(sourceSkillRoot, payload.relativePath);
		const targetPath = path.join(targetSkillRoot, payload.relativePath);
		const sourceExists = await pathExists(sourcePath);
		const targetExists = await pathExists(targetPath);

		if (!sourceExists && !targetExists) {
			continue;
		}

		if (!sourceExists) {
			changedPaths.push(targetPath);
			if (!checkMode) {
				await fs.rm(targetPath, {
					force: true,
					recursive: payload.kind === "directory",
				});
			}
			continue;
		}

		if (!(await payloadIsDifferent(sourcePath, targetPath, payload.kind))) {
			continue;
		}

		changedPaths.push(targetPath);
		if (checkMode) {
			continue;
		}

		await fs.rm(targetPath, {
			force: true,
			recursive: payload.kind === "directory",
		});
		await ensureDirectory(path.dirname(targetPath));
		if (payload.kind === "file") {
			await fs.copyFile(sourcePath, targetPath);
			continue;
		}

		await fs.cp(sourcePath, targetPath, { force: true, recursive: true });
	}
}

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

async function loadSkillSource(
	skillId: string,
	sourceSkillsRoot: string
): Promise<SkillSource> {
	const skillRoot = path.join(sourceSkillsRoot, skillId);
	const frontmatterPath = path.join(skillRoot, "frontmatter.yml");
	const sharedPath = path.join(skillRoot, "shared.md");
	const claudePath = path.join(skillRoot, "claude.md");
	const codexPath = path.join(skillRoot, "codex.md");
	const cursorPath = path.join(skillRoot, "cursor.md");

	if (!(await pathExists(frontmatterPath))) {
		throw new Error(`Missing required file: ${frontmatterPath}`);
	}

	if (!(await pathExists(sharedPath))) {
		throw new Error(`Missing required file: ${sharedPath}`);
	}

	const frontmatter = await normalizeFrontmatter(frontmatterPath);
	const frontmatterMap = parseFrontmatter(frontmatter);
	const description = frontmatterMap.get("description");
	if (
		typeof description === "string" &&
		description.length > MAX_FRONTMATTER_DESCRIPTION_LENGTH
	) {
		throw new Error(
			`Description for skill '${skillId}' is ${description.length} characters. Keep frontmatter descriptions under ${MAX_FRONTMATTER_DESCRIPTION_LENGTH} characters so Codex skill discovery can expose the skill.`
		);
	}

	const sharedBody = (await fs.readFile(sharedPath, "utf8")).trim();
	const claudeBody = ((await readFileIfExists(claudePath)) ?? "").trim();
	const codexBody = ((await readFileIfExists(codexPath)) ?? "").trim();
	const cursorBody = ((await readFileIfExists(cursorPath)) ?? "").trim();

	return {
		claudeBody,
		codexBody,
		cursorBody,
		frontmatter,
		frontmatterMap,
		sharedBody,
	};
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

export async function copyContentToPlatformDir(
	contentRoot: string,
	platformDir: string,
	checkModeArg: boolean,
	changedPathsArg: string[],
	tokenMap: Map<string, string>,
	dialect: RuleDialect = verbatimRuleDialect
): Promise<void> {
	for (const area of COPIED_CONTENT_AREAS) {
		const sourceArea = path.join(contentRoot, area);
		const targetArea = path.join(platformDir, area);
		if (!(await pathExists(sourceArea))) {
			continue;
		}

		const entries = await listRelativeDirectoryEntries(sourceArea);
		for (const entry of entries) {
			if (entry.kind !== "file") {
				continue;
			}
			const sourcePath = path.join(sourceArea, entry.relativePath);
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
	dialect: RuleDialect = verbatimRuleDialect
): Promise<void> {
	if (checkModeArg && !(await platformHasManagedContent(platformDir))) {
		return;
	}

	await copyContentToPlatformDir(
		contentRoot,
		platformDir,
		checkModeArg,
		changedPathsArg,
		tokenMap,
		dialect
	);
	await removeDeletedManagedContent(
		contentRoot,
		platformDir,
		checkModeArg,
		changedPathsArg,
		dialect
	);
}

async function platformHasManagedContent(platformDir: string): Promise<boolean> {
	for (const area of COPIED_CONTENT_AREAS) {
		if (await pathExists(path.join(platformDir, area, MANAGED_MARKER))) {
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
	dialect: RuleDialect = verbatimRuleDialect
): Promise<void> {
	for (const area of COPIED_CONTENT_AREAS) {
		const targetArea = path.join(platformDir, area);
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
			if (sourceExists && sourceMapsBack) {
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

async function removeDeletedManagedAgentFiles(
	outputRoot: string,
	validSkillIds: Set<string>,
	extension: string,
	headerLine: string
): Promise<void> {
	if (!(await pathExists(outputRoot))) {
		return;
	}

	const entries = await fs.readdir(outputRoot, { withFileTypes: true });
	for (const entry of entries) {
		if (
			!entry.isFile() ||
			!entry.name.endsWith(extension) ||
			entry.name.startsWith(".")
		) {
			continue;
		}

		const skillId = entry.name.slice(0, -extension.length);
		if (validSkillIds.has(skillId)) {
			continue;
		}

		const filePath = path.join(outputRoot, entry.name);
		const fileContent = (await readFileIfExists(filePath)) ?? "";
		// The TOML adapter leads with its header; the Markdown agent def carries
		// the header after the YAML frontmatter, so match anywhere in the file.
		if (!fileContent.includes(headerLine)) {
			continue;
		}

		changedPaths.push(filePath);
		if (checkMode) {
			continue;
		}

		await fs.rm(filePath, { force: true });
	}
}

/**
 * Validates role entries and indexes them by skill ID.
 *
 * Persona entries require a persona name; utility entries (type: "utility")
 * validate with id alone — they have no persona to require.
 */
export function buildRoleMap(
	roleDefinitions: RolesDefinitions
): Map<string, RoleDefinition> {
	const roleMap = new Map<string, RoleDefinition>();
	for (const role of roleDefinitions.skills ?? []) {
		// The registry arrives through an unchecked JSON cast, so the
		// discriminator is validated here — an unrecognized value would
		// otherwise fall through to persona semantics silently.
		if (
			role.type !== undefined &&
			role.type !== "persona" &&
			role.type !== "utility"
		) {
			throw new Error(
				`Role '${role.id}' in .ai-skills/definitions/roles.json has unrecognized type '${role.type}' — use "persona", "utility", or omit type.`
			);
		}
		if (!role.id || (role.type !== "utility" && !role.persona)) {
			throw new Error(
				'Each role in .ai-skills/definitions/roles.json must include id, plus persona unless type is "utility".'
			);
		}
		if (role.type === "utility" && role.persona) {
			throw new Error(
				`Utility role '${role.id}' must not carry a persona — a persona on a utility entry is contradictory and would sit inert in the registry.`
			);
		}
		roleMap.set(role.id, role);
	}

	return roleMap;
}

const execFileAsync = promisify(execFile);

/**
 * Reads the `version` field from the repo-root `package.json`, falling back to
 * `"0.0.0"` when the field is missing so manifest generation never throws on a
 * malformed package file.
 */
async function resolvePrismVersion(repoRootArg: string): Promise<string> {
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
async function resolveSourceCommit(repoRootArg: string): Promise<string> {
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
		codex:
			!checkMode || (await skillsRootHasManagedContent(targetRoots.codex)),
		cursor:
			!checkMode || (await skillsRootHasManagedContent(targetRoots.cursor)),
		codexAgents:
			!checkMode ||
			(await codexAgentsRootHasManagedContent(targetRoots.codexAgents)),
		claudeAgents:
			!checkMode ||
			(await claudeAgentsRootHasManagedContent(targetRoots.claudeAgents)),
		codexConfig: !checkMode || (await pathExists(codexConfigPath)),
	};

	if (!checkMode) {
		for (const targetRoot of Object.values(targetRoots)) {
			await ensureDirectory(targetRoot);
		}
	}

	const roleMap = buildRoleMap(roleDefinitions);

	const skillIds = await listDirectories(sourceSkillsRoot);
	const knownSkillIds = new Set(skillIds);

	for (const skillId of skillIds) {
		const skillSource = await loadSkillSource(skillId, sourceSkillsRoot);
		const roleDefinition = roleMap.get(skillId);
		if (!roleDefinition) {
			throw new Error(
				`Missing role definition for skill '${skillId}' in .ai-skills/definitions/roles.json`
			);
		}

		const claudeMarkdown = buildSkillMarkdown({
			frontmatter: skillSource.frontmatter,
			platformBody: skillSource.claudeBody,
			platformName: "claude",
			sharedBody: skillSource.sharedBody,
			skillId,
			tokenMap,
		});
		const codexMarkdown = buildSkillMarkdown({
			frontmatter: skillSource.frontmatter,
			platformBody: skillSource.codexBody,
			platformName: "codex",
			sharedBody: skillSource.sharedBody,
			skillId,
			tokenMap,
		});
		const cursorMarkdown = buildSkillMarkdown({
			frontmatter: skillSource.frontmatter,
			platformBody: skillSource.cursorBody,
			platformName: "cursor",
			sharedBody: skillSource.sharedBody,
			skillId,
			tokenMap,
		});

		const claudeSkillRoot = path.join(targetRoots.claude, skillId);
		const codexSkillRoot = path.join(targetRoots.codex, skillId);
		const cursorSkillRoot = path.join(targetRoots.cursor, skillId);

		if (optedIn.claude) {
			await writeFileIfChanged(
				path.join(claudeSkillRoot, "SKILL.md"),
				claudeMarkdown,
				checkMode,
				changedPaths
			);
			await writeFileIfChanged(
				path.join(claudeSkillRoot, MANAGED_MARKER),
				"Managed by scripts/ai-skills/build.ts\n",
				checkMode,
				changedPaths
			);
		}

		if (optedIn.codex) {
			await writeFileIfChanged(
				path.join(codexSkillRoot, "SKILL.md"),
				codexMarkdown,
				checkMode,
				changedPaths
			);
			await writeFileIfChanged(
				path.join(codexSkillRoot, MANAGED_MARKER),
				"Managed by scripts/ai-skills/build.ts\n",
				checkMode,
				changedPaths
			);
			await syncOptionalSkillPayloads(
				path.join(sourceSkillsRoot, skillId),
				codexSkillRoot
			);
		}

		if (optedIn.cursor) {
			await writeFileIfChanged(
				path.join(cursorSkillRoot, "SKILL.md"),
				cursorMarkdown,
				checkMode,
				changedPaths
			);
			await writeFileIfChanged(
				path.join(cursorSkillRoot, MANAGED_MARKER),
				"Managed by scripts/ai-skills/build.ts\n",
				checkMode,
				changedPaths
			);
			await syncOptionalSkillPayloads(
				path.join(sourceSkillsRoot, skillId),
				cursorSkillRoot
			);
		}

		if (optedIn.codexAgents && roleDefinition.type !== "utility") {
			const description =
				skillSource.frontmatterMap.get("description") ??
				`Generated codex agent adapter for ${skillId}.`;
			const codexAgentToml = buildCodexAgentToml({
				codexSkillMarkdown: codexMarkdown,
				description,
				roleDefinition,
				skillId,
				tokenMap,
			});
			await writeFileIfChanged(
				path.join(targetRoots.codexAgents, `${skillId}.toml`),
				codexAgentToml,
				checkMode,
				changedPaths
			);
		}

		if (optedIn.claudeAgents && roleDefinition.type !== "utility") {
			const description =
				skillSource.frontmatterMap.get("description") ??
				`Generated claude agent definition for ${skillId}.`;
			const claudeAgentMarkdown = buildClaudeAgentMarkdown({
				claudeSkillMarkdown: claudeMarkdown,
				description,
				skillId,
				tokenMap,
			});
			await writeFileIfChanged(
				path.join(targetRoots.claudeAgents, `${skillId}.md`),
				claudeAgentMarkdown,
				checkMode,
				changedPaths
			);
		}
	}

	if (optedIn.codexConfig) {
		const codexConfig = [
			GENERATED_HEADER_LINE,
			"# Source: .ai-skills/definitions/roles.json",
			"# Target: codex-config | Regenerate with: pnpm prism:build",
			"",
			"[agents]",
			"max_threads = 6",
			"max_depth = 1",
			"",
		].join("\n");
		await writeFileIfChanged(
			codexConfigPath,
			codexConfig,
			checkMode,
			changedPaths
		);
	}

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
		const platformCopies = pathDefinitions.generated.platformContentCopies;
		const platformDirs: { dir: string; dialect: RuleDialect }[] = [
			{
				dir: path.join(repoRoot, platformCopies.claude),
				dialect: verbatimRuleDialect,
			},
			{
				dir: path.join(repoRoot, platformCopies.codex),
				dialect: codexRuleDialect,
			},
			{
				dir: path.join(repoRoot, platformCopies.cursor),
				dialect: cursorRuleDialect,
			},
		];
		for (const { dir, dialect } of platformDirs) {
			await syncPlatformContentCopy(
				contentRoot,
				dir,
				checkMode,
				changedPaths,
				tokenMap,
				dialect
			);
		}

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
			await writeSyncManifest(contentRoot, syncManifest, checkMode, changedPaths);
		}
	}

	await syncAgentsMdTier1Block(repoRoot, checkMode, changedPaths, tokenMap);

	await removeDeletedManagedSkills(
		targetRoots.claude,
		knownSkillIds,
		checkMode,
		changedPaths
	);
	await removeDeletedManagedSkills(
		targetRoots.codex,
		knownSkillIds,
		checkMode,
		changedPaths
	);
	await removeDeletedManagedSkills(
		targetRoots.cursor,
		knownSkillIds,
		checkMode,
		changedPaths
	);
	// Utility skills never own an agent adapter, so their IDs are excluded
	// here — a skill that flips to utility gets its stale .toml cleaned up.
	const agentSkillIds = new Set(
		[...knownSkillIds].filter((id) => roleMap.get(id)?.type !== "utility")
	);
	await removeDeletedManagedAgentFiles(
		targetRoots.codexAgents,
		agentSkillIds,
		".toml",
		GENERATED_HEADER_LINE
	);
	await removeDeletedManagedAgentFiles(
		targetRoots.claudeAgents,
		agentSkillIds,
		".md",
		GENERATED_MARKDOWN_HEADER_LINE
	);

	const literalGuardRoots = [
		targetRoots.claude,
		targetRoots.claudeAgents,
		targetRoots.codex,
		targetRoots.cursor,
		targetRoots.codexAgents,
		path.join(repoRoot, pathDefinitions.generated.platformContentCopies.claude),
		path.join(repoRoot, pathDefinitions.generated.platformContentCopies.codex),
		path.join(repoRoot, pathDefinitions.generated.platformContentCopies.cursor),
	];
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

	if (changedPaths.length === 0) {
		console.log("prism:build completed. No changes needed.");
		return;
	}

	console.log(`prism:build completed. Updated ${changedPaths.length} file(s):`);
	for (const changedPath of changedPaths) {
		console.log(` - ${path.relative(repoRoot, changedPath)}`);
	}
}

const invokedDirectly =
	process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
