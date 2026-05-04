import fs from "node:fs/promises";
import path from "node:path";

export const MANAGED_MARKER = ".ai-skill-generated";

/**
 * Codex skill discovery silently drops skills whose frontmatter description
 * exceeds this length. Enforced at build time and verified by the discovery
 * metadata regression test.
 */
export const MAX_FRONTMATTER_DESCRIPTION_LENGTH = 1000;

/**
 * First-line header emitted on every generated TOML / Codex config file and
 * matched by the prune and overwrite guards. Keep the generator, prune check,
 * and install-time overwrite guard in sync by importing this constant instead
 * of repeating the literal.
 */
export const GENERATED_HEADER_LINE =
	"# AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.";

export interface PathDefinitions {
	canonical: {
		skillsRoot: string;
		contentRoot: string;
		templatesContentRoot: string;
	};
	generated: {
		claudeSkillsRoot: string;
		codexSkillsRoot: string;
		codexAgentsRoot: string;
		codexConfigFile: string;
		cursorSkillsRoot: string;
		platformContentCopies: {
			claude: string;
			codex: string;
			cursor: string;
		};
	};
}

export async function readFileIfExists(
	filePath: string
): Promise<string | null> {
	try {
		return await fs.readFile(filePath, "utf8");
	} catch (error) {
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "ENOENT"
		) {
			return null;
		}
		throw error;
	}
}

export async function pathExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

export async function listDirectories(rootPath: string): Promise<string[]> {
	const entries = await fs.readdir(rootPath, { withFileTypes: true });

	return entries
		.filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
		.map((entry) => entry.name)
		.sort((a, b) => a.localeCompare(b));
}

export async function ensureDirectory(filePath: string): Promise<void> {
	await fs.mkdir(filePath, { recursive: true });
}

export async function normalizeFrontmatter(
	frontmatterPath: string
): Promise<string> {
	const rawFrontmatter = await fs.readFile(frontmatterPath, "utf8");
	const trimmed = rawFrontmatter.trim();

	if (trimmed.startsWith("---")) {
		const match = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\s*$/);
		if (!match) {
			throw new Error(`Invalid frontmatter at ${frontmatterPath}`);
		}
		return match[1].trim();
	}

	return trimmed;
}

export function stripSurroundingQuotes(value: string): string {
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		return value.slice(1, -1);
	}

	return value;
}

/**
 * Escapes a string for embedding inside a TOML basic string (delimited by `"`).
 *
 * Backslashes and quotes get backslash-escaped. Raw newlines and carriage
 * returns become `\n` and `\r` escape sequences — TOML basic strings forbid
 * raw newline characters but interpret these escapes. Tabs are allowed
 * unescaped per the TOML 1.0 spec.
 */
export function escapeToml(value: string): string {
	return value
		.replaceAll("\\", "\\\\")
		.replaceAll('"', '\\"')
		.replaceAll("\n", "\\n")
		.replaceAll("\r", "\\r");
}

/**
 * Escapes a string for embedding inside a TOML multiline basic string
 * (delimited by `"""`).
 *
 * Backslashes and triple-quote sequences get backslash-escaped. Raw newlines
 * pass through — multiline basic strings allow them by design.
 */
export function escapeTomlMultiline(value: string): string {
	return value.replaceAll("\\", "\\\\").replaceAll('"""', '\\"\\"\\"');
}

/**
 * Parses a supported subset of YAML frontmatter into a key/value map.
 *
 * Supports flat `key: value` pairs and folded scalars (`key: >` followed by
 * indented continuation lines). Arrays (`key: [a, b]`), nested objects, and
 * pipe-literal blocks (`key: |`) are not supported — array syntax is captured
 * verbatim as a string. Keep frontmatter within this subset or extend the
 * parser before introducing new shapes.
 */
export function parseFrontmatter(frontmatterText: string): Map<string, string> {
	const entries = new Map<string, string>();
	const lines = frontmatterText.split(/\r?\n/);

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
		if (!match) {
			continue;
		}

		const key = match[1];
		const rawValue = match[2].trim();
		if (rawValue === ">") {
			const foldedLines: string[] = [];
			while (index + 1 < lines.length && /^\s{2,}/.test(lines[index + 1])) {
				index += 1;
				foldedLines.push(lines[index].trim());
			}
			entries.set(key, foldedLines.join(" ").trim());
			continue;
		}

		entries.set(key, stripSurroundingQuotes(rawValue));
	}

	return entries;
}

export async function writeFileIfChanged(
	filePath: string,
	content: string,
	checkMode: boolean,
	changedPaths: string[]
): Promise<void> {
	const previousContent = await readFileIfExists(filePath);
	if (previousContent === content) {
		return;
	}

	changedPaths.push(filePath);
	if (checkMode) {
		return;
	}

	await ensureDirectory(path.dirname(filePath));
	await fs.writeFile(filePath, content, "utf8");
}

export async function removeDeletedManagedSkills(
	outputRoot: string,
	validSkillIds: Set<string>,
	checkMode: boolean,
	changedPaths: string[]
): Promise<void> {
	if (!(await pathExists(outputRoot))) {
		return;
	}

	const entries = await fs.readdir(outputRoot, { withFileTypes: true });
	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name.startsWith(".")) {
			continue;
		}

		if (validSkillIds.has(entry.name)) {
			continue;
		}

		const skillPath = path.join(outputRoot, entry.name);
		const markerPath = path.join(skillPath, MANAGED_MARKER);
		if (!(await pathExists(markerPath))) {
			continue;
		}

		changedPaths.push(skillPath);
		if (checkMode) {
			continue;
		}

		await fs.rm(skillPath, { force: true, recursive: true });
	}
}

/**
 * Reads and parses `.ai-skills/definitions/paths.json` from the given repo
 * root. Centralized so the read/parse/throw shape stays in one place.
 */
export async function loadPathDefinitions(
	repoRoot: string
): Promise<PathDefinitions> {
	const pathDefinitionsPath = path.join(
		repoRoot,
		".ai-skills",
		"definitions",
		"paths.json"
	);
	if (!(await pathExists(pathDefinitionsPath))) {
		throw new Error(`Missing path definitions: ${pathDefinitionsPath}`);
	}

	try {
		return JSON.parse(
			await fs.readFile(pathDefinitionsPath, "utf8")
		) as PathDefinitions;
	} catch (error) {
		throw new Error(
			`Invalid path definitions JSON at ${pathDefinitionsPath}: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}
