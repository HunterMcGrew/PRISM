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
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { deriveTokenMap, loadConfig, substituteTokens } from "./lib/tokens";
import { runLiteralGuard } from "./literal-guard";
import { runPathGuard } from "./path-guard";
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

interface RelativeDirectoryEntry {
	kind: "directory" | "file";
	relativePath: string;
}

async function listRelativeDirectoryEntries(
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
	tokenMap: Map<string, string>
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
			const targetPath = path.join(targetArea, entry.relativePath);
			await copyContentFileWithSubstitution(
				sourcePath,
				targetPath,
				checkModeArg,
				changedPathsArg,
				tokenMap
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
	tokenMap: Map<string, string>
): Promise<void> {
	const sourceContent = await fs.readFile(sourcePath, "utf8");
	const substituted = substituteTokens(sourceContent, tokenMap);

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
	tokenMap: Map<string, string>
): Promise<void> {
	if (checkModeArg && !(await platformHasManagedContent(platformDir))) {
		return;
	}

	await copyContentToPlatformDir(
		contentRoot,
		platformDir,
		checkModeArg,
		changedPathsArg,
		tokenMap
	);
	await removeDeletedManagedContent(
		contentRoot,
		platformDir,
		checkModeArg,
		changedPathsArg
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
	changedPathsArg: string[]
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
			const sourcePath = path.join(sourceArea, entry.relativePath);
			if (await pathExists(sourcePath)) {
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

async function removeDeletedManagedAgentFiles(
	outputRoot: string,
	validSkillIds: Set<string>
): Promise<void> {
	if (!(await pathExists(outputRoot))) {
		return;
	}

	const entries = await fs.readdir(outputRoot, { withFileTypes: true });
	for (const entry of entries) {
		if (
			!entry.isFile() ||
			!entry.name.endsWith(".toml") ||
			entry.name.startsWith(".")
		) {
			continue;
		}

		const skillId = entry.name.replace(/\.toml$/, "");
		if (validSkillIds.has(skillId)) {
			continue;
		}

		const filePath = path.join(outputRoot, entry.name);
		const fileContent = (await readFileIfExists(filePath)) ?? "";
		if (!fileContent.startsWith(GENERATED_HEADER_LINE)) {
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

async function main(): Promise<void> {
	const pathDefinitions = await loadPathDefinitions(repoRoot);
	const roleDefinitions = await loadJsonFile<RolesDefinitions>(
		".ai-skills/definitions/roles.json",
		"roles definitions"
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
		const platformDirs = [
			path.join(repoRoot, platformCopies.claude),
			path.join(repoRoot, platformCopies.codex),
			path.join(repoRoot, platformCopies.cursor),
		];
		for (const platformDir of platformDirs) {
			await syncPlatformContentCopy(
				contentRoot,
				platformDir,
				checkMode,
				changedPaths,
				tokenMap
			);
		}
	}

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
	await removeDeletedManagedAgentFiles(targetRoots.codexAgents, agentSkillIds);

	const literalGuardRoots = [
		targetRoots.claude,
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
		if (changedPaths.length > 0) {
			console.error("prism:check failed. These files are out of sync:");
			for (const changedPath of changedPaths) {
				console.error(` - ${path.relative(repoRoot, changedPath)}`);
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
