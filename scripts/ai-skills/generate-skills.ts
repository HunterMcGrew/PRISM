/**
 * Root-agnostic persona-skill generation.
 *
 * Renders the `prism-*` skill roster (Claude / Codex / Cursor SKILL.md bodies,
 * the Codex agent `.toml` adapters, the Claude agent `.md` definitions, and the
 * Codex config file), writes the managed marker into every generated skill dir,
 * and prunes orphaned skill dirs and agent files whose source no longer exists.
 *
 * `generatePlatformSkills` takes absolute source/target paths and the caller's
 * token map, so both PRISM's own build (`build.ts`) and the consumer-side
 * `prism:update` / `prism:adopt` flow share one render path. The marker write in
 * every platform branch is load-bearing — orphan cleanup deletes a skill dir
 * only when the marker is present, so a consumer's own marker-less `prism-*`
 * file is never a delete target (see plan prism-242 Decision "Managed-marker
 * invariant").
 */
import fs from "node:fs/promises";
import path from "node:path";

import { substituteTokens } from "./lib/tokens";
import {
	ensureDirectory,
	escapeToml,
	escapeTomlMultiline,
	filesAreEqual,
	GENERATED_HEADER_LINE,
	listDirectories,
	listRelativeDirectoryEntries,
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

export const GENERATED_MARKDOWN_HEADER_LINE =
	"<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->";

type OptionalSkillPayload =
	| { kind: "directory"; relativePath: string }
	| { kind: "file"; relativePath: string };

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
	targetSkillRoot: string,
	checkModeArg: boolean,
	changedPathsArg: string[]
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
			changedPathsArg.push(targetPath);
			if (!checkModeArg) {
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

		changedPathsArg.push(targetPath);
		if (checkModeArg) {
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

async function removeDeletedManagedAgentFiles(
	outputRoot: string,
	validSkillIds: Set<string>,
	extension: string,
	headerLine: string,
	checkModeArg: boolean,
	changedPathsArg: string[]
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

		changedPathsArg.push(filePath);
		if (checkModeArg) {
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

export interface GeneratePlatformSkillsOptions {
	sourceSkillsRoot: string;
	targetRoots: {
		claude: string;
		claudeAgents: string;
		codex: string;
		codexAgents: string;
		cursor: string;
	};
	codexConfigPath: string;
	roleMap: Map<string, RoleDefinition>;
	tokenMap: Map<string, string>;
	optedIn: {
		claude: boolean;
		codex: boolean;
		cursor: boolean;
		codexAgents: boolean;
		claudeAgents: boolean;
		codexConfig: boolean;
	};
	checkMode: boolean;
	changedPaths: string[];
}

export interface GeneratePlatformSkillsResult {
	knownSkillIds: Set<string>;
}

/**
 * Renders the persona-skill roster from `sourceSkillsRoot` into the platform
 * target roots, writes the Codex config file, and prunes orphaned skill dirs
 * and agent files. Root-agnostic: every path the function reads or writes
 * arrives as an absolute path in `options`, so PRISM's own build and the
 * consumer flow share one render path with their own roots and token maps.
 */
export async function generatePlatformSkills(
	options: GeneratePlatformSkillsOptions
): Promise<GeneratePlatformSkillsResult> {
	const {
		sourceSkillsRoot,
		targetRoots,
		codexConfigPath,
		roleMap,
		tokenMap,
		optedIn,
		checkMode,
		changedPaths,
	} = options;

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
				codexSkillRoot,
				checkMode,
				changedPaths
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
				cursorSkillRoot,
				checkMode,
				changedPaths
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
		GENERATED_HEADER_LINE,
		checkMode,
		changedPaths
	);
	await removeDeletedManagedAgentFiles(
		targetRoots.claudeAgents,
		agentSkillIds,
		".md",
		GENERATED_MARKDOWN_HEADER_LINE,
		checkMode,
		changedPaths
	);

	return { knownSkillIds };
}
