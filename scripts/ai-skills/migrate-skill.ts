#!/usr/bin/env tsx
/**
 * Decomposes a consumer-side generated skill artifact back into canonical
 * `.ai-skills/skills/<id>/{frontmatter.yml, shared.md}` source — the reverse of
 * `pnpm prism:build`. Generalizes `bootstrap-from-claude.ts` to handle all four
 * generated shapes: `.claude` SKILL.md, `.cursor` SKILL.md, `.agents` SKILL.md,
 * and `.codex` `.toml` (which embeds a full codex SKILL.md inside
 * `developer_instructions`).
 *
 * The codex TOML path unwraps the TOML fence, strips the three scaffolding
 * lines (`You are <Name>.`, `Canonical skill source: …`, `Follow this generated
 * skill definition:`), then delegates to the same `decomposeSkillMarkdown` used
 * by the three markdown shapes — no second full parser needed.
 *
 * Run: `pnpm prism:migrate-skill <source> [--id <new-id>] [--platform <claude|cursor|agents|codex>] [--force] [--dry-run]`
 */
import fs from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "./lib/tokens";
import {
	ensureDirectory,
	parseFrontmatter,
	pathExists,
	readFileIfExists,
} from "./utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SourceShape = "claude" | "cursor" | "agents" | "codex";

export interface DecomposedSkill {
	frontmatter: string;
	body: string;
}

export interface DecomposedToml extends DecomposedSkill {
	persona: string | undefined;
}

// ---------------------------------------------------------------------------
// Source-shape autodetection
// ---------------------------------------------------------------------------

/**
 * Detects the source platform shape from the file path or extension.
 *
 * `.toml` → codex. `.md` (or a directory containing SKILL.md) → inspect
 * path segments for `.claude/`, `.cursor/`, or `.agents/` ancestry. When the
 * path gives no signal, `--platform` is required; if absent, throws a guidance
 * error naming the flag.
 */
export function detectSourceShape(
	sourcePath: string,
	platformOverride?: string
): SourceShape {
	if (platformOverride) {
		const valid: SourceShape[] = ["claude", "cursor", "agents", "codex"];
		if (!valid.includes(platformOverride as SourceShape)) {
			throw new Error(
				`--platform must be one of: claude, cursor, agents, codex (got "${platformOverride}")`
			);
		}
		return platformOverride as SourceShape;
	}

	if (sourcePath.endsWith(".toml")) {
		return "codex";
	}

	const normalized = sourcePath.replace(/\\/g, "/");
	if (normalized.includes("/.claude/")) {
		return "claude";
	}
	if (normalized.includes("/.cursor/")) {
		return "cursor";
	}
	if (normalized.includes("/.agents/")) {
		return "agents";
	}

	throw new Error(
		`Cannot detect source shape from path: ${sourcePath}\n` +
			"The path has no .claude/, .cursor/, .agents/ ancestor and is not a .toml file.\n" +
			"Pass --platform <claude|cursor|agents|codex> to specify the shape explicitly."
	);
}

// ---------------------------------------------------------------------------
// Skill-markdown decomposition
// ---------------------------------------------------------------------------

/**
 * Splits a generated SKILL.md document (any markdown shape) into its
 * frontmatter and body. Strips the three-line AUTO-GENERATED HTML header block
 * that `buildSkillMarkdown` injects immediately after the closing `---` so the
 * recovered body matches the canonical `shared.md` source.
 *
 * The frontmatter is returned verbatim (the build emits it via
 * `normalizeFrontmatter`, so it already round-trips through the build without
 * change). The description is preserved as a folded (`>`) scalar — plain
 * multi-line continuation silently truncates in `parseFrontmatter` (lessons.md
 * 2026-06-04).
 */
export function decomposeSkillMarkdown(
	content: string,
	sourcePath = "<unknown>"
): DecomposedSkill {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) {
		throw new Error(`Missing or invalid frontmatter in ${sourcePath}`);
	}

	const frontmatter = match[1].trim();
	let body = match[2];

	// Strip leading blank lines between the closing `---` and the body content
	// (the regex above captures `\r?\n?` after the closing `---`, which may leave
	// a leading newline before the generated header block).
	body = body.replace(/^\n+/, "");

	// Strip the three-line AUTO-GENERATED HTML header block emitted by
	// buildSkillMarkdown (build.ts:148–158). The block always leads the body
	// (after any leading blank lines have been removed above).
	const generatedBlockPattern =
		/^<!-- AUTO-GENERATED FILE\. DO NOT EDIT DIRECTLY\. -->\n<!-- Source: \.ai-skills\/skills\/[^\n]+ -->\n<!-- Target: [^\n]+ \| Regenerate with: pnpm prism:build -->\n?/;
	body = body.replace(generatedBlockPattern, "");

	// Trim any blank lines left behind after header removal.
	body = body.replace(/^\n+/, "");

	return {
		frontmatter,
		body: body.trimEnd(),
	};
}

// ---------------------------------------------------------------------------
// Codex TOML decomposition
// ---------------------------------------------------------------------------

/**
 * Reverses `buildCodexAgentToml` (build.ts:163). Recovers the skill ID,
 * description, and embedded skill-markdown from the `.toml` file, then
 * delegates to `decomposeSkillMarkdown` so no second frontmatter parser is
 * needed.
 *
 * Persona name is extracted from the optional `You are <Name>.` opener inside
 * `developer_instructions`. Utility skills have no such line, in which case
 * `persona` is `undefined`.
 */
export function decomposeCodexToml(
	content: string,
	sourcePath = "<unknown>"
): DecomposedToml {
	// Drop the leading TOML generated header lines (# AUTO-GENERATED …, # Source:, # Target:)
	// plus the following blank line.
	const lines = content.split(/\r?\n/);
	let startIndex = 0;
	while (
		startIndex < lines.length &&
		(lines[startIndex].startsWith("#") || lines[startIndex].trim() === "")
	) {
		startIndex += 1;
	}
	const body = lines.slice(startIndex).join("\n");

	// Recover description from `description = "…"` (single-line TOML basic string).
	const descriptionMatch = body.match(/^description = "(.*)"/m);
	if (!descriptionMatch) {
		throw new Error(`Cannot find description field in ${sourcePath}`);
	}
	const description = unescapeToml(descriptionMatch[1]);

	// Extract the developer_instructions multiline basic string.
	const instructionsMatch = body.match(
		/^developer_instructions = """\n([\s\S]*?)\n"""/m
	);
	if (!instructionsMatch) {
		throw new Error(
			`Cannot find developer_instructions block in ${sourcePath}`
		);
	}
	const rawInstructions = unescapeTomlMultiline(instructionsMatch[1]);

	// Strip scaffolding lines added by buildCodexAgentToml:
	//   (optional) "You are <Name>."
	//   "Canonical skill source: .ai-skills/skills/<id>"
	//   "Follow this generated skill definition:"
	//   (blank line)
	const instrLines = rawInstructions.split(/\r?\n/);
	let instrIndex = 0;
	let persona: string | undefined;

	// Optional persona opener
	const personaMatch = instrLines[instrIndex]?.match(/^You are (.+)\.$/);
	if (personaMatch) {
		persona = personaMatch[1];
		instrIndex += 1;
	}

	// Canonical skill source line
	if (instrLines[instrIndex]?.startsWith("Canonical skill source:")) {
		instrIndex += 1;
	}

	// "Follow this generated skill definition:"
	if (
		instrLines[instrIndex]?.trim() ===
		"Follow this generated skill definition:"
	) {
		instrIndex += 1;
	}

	// Skip any blank lines between scaffolding and the embedded skill markdown
	while (
		instrIndex < instrLines.length &&
		instrLines[instrIndex].trim() === ""
	) {
		instrIndex += 1;
	}

	// What remains from the first `---` onward is a skill-markdown document.
	const embeddedMarkdown = instrLines.slice(instrIndex).join("\n");
	if (!embeddedMarkdown.startsWith("---")) {
		throw new Error(
			`Expected embedded skill-markdown starting with --- in ${sourcePath}`
		);
	}

	const decomposed = decomposeSkillMarkdown(embeddedMarkdown, sourcePath);

	// Merge the outer description into frontmatter if the embedded frontmatter
	// somehow lacks it (defensive — should always be present).
	let frontmatter = decomposed.frontmatter;
	if (!frontmatter.includes("description:") && description) {
		frontmatter = `${frontmatter}\ndescription: ${description}`;
	}

	return {
		frontmatter,
		body: decomposed.body,
		persona,
	};
}

/** Inverse of `escapeToml` (utils.ts): unescapes a TOML basic-string value. */
export function unescapeToml(value: string): string {
	// Order matters: unescape \\ last so we don't double-process.
	return value
		.replaceAll('\\"', '"')
		.replaceAll("\\n", "\n")
		.replaceAll("\\r", "\r")
		.replaceAll("\\\\", "\\");
}

/**
 * Inverse of `escapeTomlMultiline` (utils.ts): unescapes a TOML multiline
 * basic-string body. Only `\\"\\"\\"` → `"""` and `\\\\` → `\\` are needed
 * (multiline basic strings allow raw newlines).
 */
export function unescapeTomlMultiline(value: string): string {
	// Order matters: handle \\\\  before \\"\\"\\" to avoid double-processing.
	// Replace escaped backslashes with a sentinel, unescape triple quotes, then
	// restore backslashes.
	const SENTINEL = " ";
	return value
		.replaceAll("\\\\", SENTINEL)
		.replaceAll('\\"\\"\\"', '"""')
		.replaceAll(SENTINEL, "\\");
}

// ---------------------------------------------------------------------------
// ID normalization
// ---------------------------------------------------------------------------

/**
 * Normalizes a raw skill ID from a generated artifact to its canonical form in
 * the target repository.
 *
 * Rules (in priority order):
 * 1. `--id` explicit override always wins verbatim — callers contributing a
 *    `prism-*` skill back to PRISM pass `--id prism-<role>`.
 * 2. When the org token in `.ai-skills/config.json` is `"PRISM"` (case-
 *    insensitive), the repo is PRISM itself; a migrated `prism-<role>` ID stays
 *    `prism-<role>` — it is a PRISM contribution, not a consumer reclaim.
 * 3. For consumers: strip a leading `prism-` prefix (if present) and re-prefix
 *    with the org token in lowercase. When no org token is set, use `custom`.
 *
 * Resolved per Sol's ruling (2026-06-16): honor the config `org` token
 * verbatim; `--id` always overrides. Do not force explicit `--id` for
 * `prism-*` IDs from a repo whose org token is `prism`.
 */
export function normalizeSkillId(
	rawId: string,
	orgToken: string | undefined,
	explicitId: string | undefined
): string {
	if (explicitId) {
		return explicitId;
	}

	const org = (orgToken ?? "").toLowerCase();

	// In-PRISM exception: when the org token is "prism", the migrated skill
	// stays prism-* — this is a PRISM-internal contribution, not a consumer
	// namespace reclaim. PRISM's own config.json declares "org": "PRISM".
	if (org === "prism") {
		return rawId;
	}

	const role = rawId.startsWith("prism-") ? rawId.slice("prism-".length) : rawId;
	const prefix = org.length > 0 ? org : "custom";
	return `${prefix}-${role}`;
}

/**
 * Replaces all occurrences of `oldId` with `newId` in the given string. Used
 * to keep cross-skill trigger references coherent after an ID rename (mirrors
 * `rewriteSkillIdReferences` in `bootstrap-from-claude.ts:50`).
 */
export function rewriteIdInContent(
	content: string,
	oldId: string,
	newId: string
): string {
	if (oldId === newId) {
		return content;
	}
	return content.replaceAll(oldId, newId);
}

// ---------------------------------------------------------------------------
// Persona detection
// ---------------------------------------------------------------------------

/**
 * Detects whether recovered skill body describes a persona (opens with
 * `You are **Name**` or `You are Name.`) or a utility. Returns the persona
 * name when present, `undefined` for utility. When ambiguous, defaults to
 * `undefined` and logs a one-line note — never guesses a human name.
 */
export function detectPersona(body: string): string | undefined {
	const firstNonBlank = body
		.split(/\r?\n/)
		.find((line) => line.trim().length > 0);

	if (!firstNonBlank) {
		return undefined;
	}

	// Match "You are **Name** (she/her)," (bold form) or "You are Name." (plain)
	const boldMatch = firstNonBlank.match(/^You are \*\*([^*]+)\*\*/);
	if (boldMatch) {
		// Strip any pronouns or trailing punctuation from the bold capture
		const name = boldMatch[1].replace(/\s*\(.*/, "").trim();
		return name.length > 0 ? name : undefined;
	}

	const plainMatch = firstNonBlank.match(/^You are ([^(.\n]+)/);
	if (plainMatch) {
		const name = plainMatch[1].replace(/\s*\(.*/, "").trim().replace(/\.$/, "");
		return name.length > 0 ? name : undefined;
	}

	return undefined;
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

/**
 * Writes `content` to `filePath`, creating parent directories as needed.
 * Skips when the file already exists and `force` is false, mirroring
 * `writeIfMissingOrForce` in `bootstrap-from-claude.ts:77`.
 *
 * Returns `true` when the file was written, `false` when skipped.
 */
async function writeIfMissingOrForce(
	filePath: string,
	content: string,
	force: boolean
): Promise<boolean> {
	if (!force && (await pathExists(filePath))) {
		return false;
	}
	await ensureDirectory(path.dirname(filePath));
	await fs.writeFile(filePath, `${content.trim()}\n`, "utf8");
	return true;
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

interface MigrateArgs {
	sourcePath: string;
	explicitId?: string;
	platformOverride?: string;
	force: boolean;
	dryRun: boolean;
	repoRoot: string;
}

function parseArgs(argv: string[]): MigrateArgs {
	const args = argv.slice(2); // strip node + script

	let sourcePath: string | undefined;
	let explicitId: string | undefined;
	let platformOverride: string | undefined;
	let force = false;
	let dryRun = false;

	for (let i = 0; i < args.length; i += 1) {
		const arg = args[i];
		if (arg === "--id") {
			explicitId = args[i + 1];
			i += 1;
		} else if (arg === "--platform") {
			platformOverride = args[i + 1];
			i += 1;
		} else if (arg === "--force") {
			force = true;
		} else if (arg === "--dry-run") {
			dryRun = true;
		} else if (!arg.startsWith("--")) {
			sourcePath = arg;
		}
	}

	if (!sourcePath) {
		throw new Error(
			"Usage: pnpm prism:migrate-skill <source> [--id <new-id>] [--platform <claude|cursor|agents|codex>] [--force] [--dry-run]\n" +
				"\n" +
				"  <source>   Path to the generated artifact — a SKILL.md file, a skill\n" +
				"             directory (SKILL.md inside), or a .codex/agents/<id>.toml file."
		);
	}

	return {
		sourcePath,
		explicitId,
		platformOverride,
		force,
		dryRun,
		repoRoot: process.cwd(),
	};
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function main(): Promise<void> {
	const { sourcePath, explicitId, platformOverride, force, dryRun, repoRoot } =
		parseArgs(process.argv);

	// Resolve source path — accept a directory (resolve SKILL.md inside).
	let resolvedSource = path.resolve(repoRoot, sourcePath);
	try {
		const stat = await fs.stat(resolvedSource);
		if (stat.isDirectory()) {
			resolvedSource = path.join(resolvedSource, "SKILL.md");
		}
	} catch {
		throw new Error(`Source path does not exist: ${resolvedSource}`);
	}

	if (!(await pathExists(resolvedSource))) {
		throw new Error(`Source file not found: ${resolvedSource}`);
	}

	const shape = detectSourceShape(resolvedSource, platformOverride);
	const content = await fs.readFile(resolvedSource, "utf8");

	// --- Decompose ---
	let frontmatter: string;
	let body: string;
	let tomlPersona: string | undefined;

	if (shape === "codex") {
		const result = decomposeCodexToml(content, resolvedSource);
		frontmatter = result.frontmatter;
		body = result.body;
		tomlPersona = result.persona;
	} else {
		const result = decomposeSkillMarkdown(content, resolvedSource);
		frontmatter = result.frontmatter;
		body = result.body;
	}

	// --- ID normalization ---
	const frontmatterMap = parseFrontmatter(frontmatter);
	const rawIdFromFrontmatter = frontmatterMap.get("name");

	// Derive raw ID: prefer frontmatter name, fall back to directory / file name.
	const dirName =
		shape === "codex"
			? path.basename(resolvedSource, ".toml")
			: path.basename(path.dirname(resolvedSource));
	const rawId = rawIdFromFrontmatter ?? dirName;

	// Load org token from config (best-effort — tolerate missing config for
	// consumers who haven't run `prism:update` yet).
	let orgToken: string | undefined;
	try {
		const config = loadConfig(repoRoot);
		orgToken = config.org;
	} catch {
		// No config present — org defaults to undefined, producing custom-* prefix.
	}

	const normalizedId = normalizeSkillId(rawId, orgToken, explicitId);

	// Rewrite cross-skill ID references in the recovered content.
	frontmatter = rewriteIdInContent(frontmatter, rawId, normalizedId);
	body = rewriteIdInContent(body, rawId, normalizedId);

	// --- Detect persona for roles.json ---
	const personaName = tomlPersona ?? detectPersona(body);
	if (!personaName && shape === "codex") {
		console.log(
			`Note: no persona detected in TOML — registering as utility. ` +
				`Set "persona" manually in .ai-skills/definitions/roles.json if this is a persona skill.`
		);
	}

	// --- Target paths ---
	const canonicalSkillsRoot = path.join(repoRoot, ".ai-skills", "skills");
	const targetSkillDir = path.join(canonicalSkillsRoot, normalizedId);
	const frontmatterPath = path.join(targetSkillDir, "frontmatter.yml");
	const sharedPath = path.join(targetSkillDir, "shared.md");
	const rolesPath = path.join(repoRoot, ".ai-skills", "definitions", "roles.json");

	// --- Detect sibling copies (multi-platform delta note, v1 advisory only) ---
	if (shape !== "codex") {
		// resolvedSource is e.g. /repo/.claude/skills/prism-changelog/SKILL.md
		// platform dir is /repo/.claude, repo root is /repo
		const skillDir = path.dirname(resolvedSource); // /repo/.claude/skills/<id>
		const platformSkillsDir = path.dirname(skillDir); // /repo/.claude/skills
		const platformDir = path.dirname(platformSkillsDir); // /repo/.claude
		const repoParent = path.dirname(platformDir); // /repo

		const siblingPlatforms = [".claude", ".cursor", ".agents"].filter(
			(p) => !platformDir.endsWith(`/${p}`) && !platformDir.endsWith(`\\${p}`)
		);
		const siblingChecks = await Promise.all(
			siblingPlatforms.map((p) =>
				pathExists(path.join(repoParent, p, "skills", rawId, "SKILL.md"))
			)
		);
		if (siblingChecks.some(Boolean)) {
			console.log(
				`Note: sibling platform copies detected for "${rawId}". ` +
					`Multi-copy delta recovery is not automated in v1 — ` +
					`diff platform copies manually if they diverged.`
			);
		}
	}

	// --- Roles.json delta ---
	const rolesContent = await readFileIfExists(rolesPath);
	const rolesData: {
		skills: Array<{ id: string; persona?: string; type?: string }>;
	} = rolesContent ? (JSON.parse(rolesContent) as { skills: Array<{ id: string; persona?: string; type?: string }> }) : { skills: [] };

	const existingEntry = rolesData.skills.find((s) => s.id === normalizedId);
	const newRolesEntry: { id: string; persona?: string; type?: string } =
		personaName
			? { id: normalizedId, persona: personaName }
			: { id: normalizedId, type: "utility" };

	// --- Dry run output ---
	if (dryRun) {
		console.log(`[dry-run] Planned writes for skill: ${normalizedId}`);
		console.log(`  ${frontmatterPath}`);
		console.log(`    ${frontmatter.split("\n")[0]}`);
		console.log(`  ${sharedPath}`);
		console.log(`    ${body.split("\n").find((l) => l.trim()) ?? "(empty)"}`);
		if (!existingEntry) {
			console.log(`  ${rolesPath}`);
			console.log(`    + ${JSON.stringify(newRolesEntry)}`);
		} else {
			console.log(
				`  ${rolesPath} — entry already exists for "${normalizedId}", no change`
			);
		}
		return;
	}

	// --- Write canonical source ---
	const wroteFrontmatter = await writeIfMissingOrForce(
		frontmatterPath,
		frontmatter,
		force
	);
	const wroteShared = await writeIfMissingOrForce(sharedPath, body, force);

	if (!wroteFrontmatter && !wroteShared) {
		console.log(
			`Skipped: canonical source already exists at ${targetSkillDir}\n` +
				`Pass --force to overwrite.`
		);
	} else {
		if (wroteFrontmatter) {
			console.log(`Wrote: ${frontmatterPath}`);
		}
		if (wroteShared) {
			console.log(`Wrote: ${sharedPath}`);
		}
	}

	// --- Register in roles.json ---
	if (!existingEntry) {
		rolesData.skills.push(newRolesEntry);
		const serialized = JSON.stringify(rolesData, null, "\t") + "\n";
		await fs.writeFile(rolesPath, serialized, "utf8");
		console.log(`Updated: ${rolesPath} — added entry for "${normalizedId}"`);
	}

	// --- Re-tokenization reminder ---
	console.log(
		`\nReminder: the generated artifact may contain substituted token values ` +
			`(org, project, slackChannel, etc.). Scan ${sharedPath} for ` +
			`team-specific strings and replace with \${TOKEN} placeholders before ` +
			`committing to canonical source.`
	);
}

// Only run when invoked directly — allows test files to import helpers without
// triggering side effects, mirroring the isMain guard pattern used by build.ts
// and update.ts.
const isMain =
	process.argv[1] &&
	(await import("node:url")).fileURLToPath(import.meta.url) ===
		path.resolve(process.argv[1]);
if (isMain) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
