/**
 * Keeps Codex's `project_doc_max_bytes` in the repo's `.codex/config.toml` large
 * enough to hold the whole `AGENTS.md`.
 *
 * Codex reads only the first 32 KiB of `AGENTS.md` unless `project_doc_max_bytes`
 * is raised, and the generated Tier-1 block pushes the file well past that.
 * The edit is line-based with no TOML parser: only one top-level integer key is
 * ever read or written, and a parser would be a new dependency. Both PRISM's own
 * build and `prism update` call `syncCodexProjectDocLimit`.
 */
import fs from "node:fs/promises";
import path from "node:path";

import type { FileOutcome } from "./update";
import { readFileIfExists } from "./utils";

export const CODEX_DEFAULT_PROJECT_DOC_MAX_BYTES = 32 * 1024;
export const CODEX_CONFIG_RELATIVE_PATH = ".codex/config.toml";

const LIMIT_STEP_BYTES = 64 * 1024;
const LIMIT_KEY = "project_doc_max_bytes";
const LIMIT_COMMENT =
	"# Raises Codex's AGENTS.md read limit (32 KiB by default). prism update keeps it at or above the file's size.";

const KEY_SEGMENT = `(?:[A-Za-z0-9_-]+|"[^"]*"|'[^']*')`;
const KEY_PATH = `${KEY_SEGMENT}(?:\\s*\\.\\s*${KEY_SEGMENT})*`;
const TABLE_HEADER = new RegExp(
	`^\\s*(?:\\[\\s*${KEY_PATH}\\s*\\]|\\[\\[\\s*${KEY_PATH}\\s*\\]\\])\\s*(?:#.*)?$`
);
const LIMIT_LINE = new RegExp(`^\\s*${LIMIT_KEY}\\s*=\\s*(.*?)\\s*(#.*)?$`);
const LIMIT_VALUE_DIGITS = new RegExp(`^(\\s*${LIMIT_KEY}\\s*=\\s*)[0-9][0-9_]*`);

export type ProjectDocMaxBytesSetting =
	| { kind: "absent" }
	| { kind: "set"; value: number }
	| { kind: "unparseable"; raw: string };

/**
 * Rounds `agentsMdBytes` up to the next 64 KiB multiple, then adds one more
 * 64 KiB step. The extra step is headroom for small nested `AGENTS.md` files
 * that share Codex's budget on its root-to-working-directory walk.
 */
export function computeProjectDocMaxBytes(agentsMdBytes: number): number {
	return Math.ceil(agentsMdBytes / LIMIT_STEP_BYTES) * LIMIT_STEP_BYTES + LIMIT_STEP_BYTES;
}

/**
 * Lines before the first table header; a key inside a table is not top-level.
 *
 * A header is `[a.b]` or `[[a.b]]` and nothing else on the line, so an element
 * of a multi-line array such as `[1, 2],` does not end the top level. A header-
 * shaped line inside a multi-line string still does, because telling it apart
 * would take a TOML parser.
 */
function topLevelLines(toml: string): string[] {
	const lines = toml.split("\n");
	const firstTable = lines.findIndex((line) => TABLE_HEADER.test(line.replace(/\r$/, "")));

	return firstTable === -1 ? lines : lines.slice(0, firstTable);
}

/**
 * Reads the top-level `project_doc_max_bytes` from `toml`. A value that is not a
 * plain integer (hex, a string, an inline expression) is `unparseable` so the
 * caller leaves it alone instead of rewriting something it does not understand.
 */
export function readProjectDocMaxBytes(toml: string | null): ProjectDocMaxBytesSetting {
	if (toml === null) {
		return { kind: "absent" };
	}

	for (const line of topLevelLines(toml)) {
		const match = LIMIT_LINE.exec(line.replace(/\r$/, ""));

		if (match === null) {
			continue;
		}

		const raw = match[1];

		return /^[0-9][0-9_]*$/.test(raw)
			? { kind: "set", value: Number(raw.replace(/_/g, "")) }
			: { kind: "unparseable", raw };
	}

	return { kind: "absent" };
}

/**
 * Returns `toml` with `project_doc_max_bytes = value` at the top level.
 *
 * An existing integer value has only its digits replaced, so a trailing comment
 * survives. An absent key is prepended with a comment before any existing
 * content, which keeps it ahead of every table header. The file's line ending is
 * preserved. `setting` is what `readProjectDocMaxBytes` returned for `toml`.
 */
export function mergeProjectDocMaxBytes(
	toml: string | null,
	setting: Exclude<ProjectDocMaxBytesSetting, { kind: "unparseable" }>,
	value: number
): string {
	const eol = toml !== null && toml.includes("\r\n") ? "\r\n" : "\n";
	const addedLines = `${LIMIT_COMMENT}${eol}${LIMIT_KEY} = ${value}${eol}`;

	if (toml === null || toml.trim() === "") {
		return addedLines;
	}

	if (setting.kind !== "set") {
		return `${addedLines}${eol}${toml}`;
	}

	const lines = toml.split("\n");
	const keyLine = topLevelLines(toml).findIndex((line) =>
		LIMIT_LINE.test(line.replace(/\r$/, ""))
	);
	lines[keyLine] = lines[keyLine].replace(LIMIT_VALUE_DIGITS, `$1${value}`);

	return lines.join("\n");
}

/**
 * Brings `<repoRoot>/.codex/config.toml` up to the limit the repo's `AGENTS.md`
 * needs. Returns `null` when there is nothing to do: no `AGENTS.md` to size, or
 * one inside Codex's default window and no config to update.
 *
 * A larger existing value is kept, because a team may have raised it for nested
 * `AGENTS.md` files. A value this module cannot read is left unchanged with a
 * warning. Nothing is written when `dryRun` is set.
 */
export async function syncCodexProjectDocLimit(
	repoRoot: string,
	dryRun: boolean
): Promise<{ outcome: FileOutcome; warning?: string } | null> {
	const agentsMd = await readFileIfExists(path.join(repoRoot, "AGENTS.md"));

	if (agentsMd === null) {
		return null;
	}

	const agentsMdBytes = Buffer.byteLength(agentsMd, "utf8");
	const configPath = path.join(repoRoot, CODEX_CONFIG_RELATIVE_PATH);
	const existing = await readFileIfExists(configPath);

	if (existing === null && agentsMdBytes <= CODEX_DEFAULT_PROJECT_DOC_MAX_BYTES) {
		return null;
	}

	const computed = computeProjectDocMaxBytes(agentsMdBytes);
	const setting = readProjectDocMaxBytes(existing);

	if (setting.kind === "unparseable") {
		return {
			outcome: { relativePath: CODEX_CONFIG_RELATIVE_PATH, action: "no-op" },
			warning: `${CODEX_CONFIG_RELATIVE_PATH} sets ${LIMIT_KEY} to ${setting.raw}, which PRISM cannot read; left unchanged. Set it to ${computed} or more.`,
		};
	}

	if (setting.kind === "set" && setting.value >= computed) {
		return { outcome: { relativePath: CODEX_CONFIG_RELATIVE_PATH, action: "no-op" } };
	}

	if (!dryRun) {
		await fs.mkdir(path.dirname(configPath), { recursive: true });
		await fs.writeFile(configPath, mergeProjectDocMaxBytes(existing, setting, computed), "utf8");
	}

	return {
		outcome: {
			relativePath: CODEX_CONFIG_RELATIVE_PATH,
			action: existing === null ? "written" : "overwritten",
		},
	};
}
