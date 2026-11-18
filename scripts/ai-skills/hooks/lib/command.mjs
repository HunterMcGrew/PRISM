// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Helpers shared by the git hooks (`git-hooks/pre-commit.mjs`,
 * `git-hooks/pre-push.mjs`) and the push gate (`git-gates.mjs`): shell-safe
 * quoting, placeholder substitution into a configured command line, the
 * "command not found" test, and a never-throwing config read.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

/** Every POSIX shell reports a missing command as exit 127. */
const POSIX_COMMAND_NOT_FOUND_STATUS = 127;

/**
 * `cmd.exe` reports a missing command as exit 1 with this message on stderr,
 * so the exit code alone cannot tell "not found" from a real failure there.
 */
const CMD_EXE_COMMAND_NOT_FOUND = /is not recognized as an internal or external command/;

/**
 * Quotes one argument for the shell `spawnSync(..., { shell: true })` runs:
 * `cmd.exe` on Windows, `/bin/sh` everywhere else.
 *
 * Windows filenames cannot contain `"`, so a name that carries one is not a
 * real path. Double quotes keep spaces and `&`, `|`, `<`, `>` literal under
 * `cmd.exe`, but not `%`: `cmd.exe` still expands `%NAME%` inside them when
 * `NAME` is a set variable, and there is no escape for it on a command line.
 * A filename like that reaches the command with the variable's value in it.
 * Everywhere else a single-quoted spelling suppresses every expansion, and the
 * one character it cannot hold, `'`, is written as `'\''`.
 *
 * @param {string} arg
 * @param {NodeJS.Platform} [platform]
 * @returns {string}
 */
export function quoteForShell(arg, platform = process.platform) {
	if (platform === "win32") {
		if (arg.includes('"')) {
			throw new Error(`cannot quote a path containing a double quote on Windows: ${arg}`);
		}

		return `"${arg}"`;
	}

	return `'${arg.replaceAll("'", "'\\''")}'`;
}

/**
 * Substitutes quoted `paths` into a configured command line. Every
 * `placeholder` token is replaced; a command with no token gets the paths
 * appended after one space. An empty `paths` leaves the command unchanged.
 *
 * @param {string} command
 * @param {"{path}" | "{files}"} placeholder
 * @param {string[]} paths
 * @param {NodeJS.Platform} [platform]
 * @returns {string}
 */
export function fillCommand(command, placeholder, paths, platform = process.platform) {
	if (paths.length === 0) {
		return command;
	}

	const quoted = paths.map((entry) => quoteForShell(entry, platform)).join(" ");
	if (!command.includes(placeholder)) {
		return `${command} ${quoted}`;
	}

	// A replacer function keeps `$&` and friends in a path literal.
	return command.replaceAll(placeholder, () => quoted);
}

/**
 * Whether a `spawnSync` result means the shell could not find the command.
 * Under `shell: true` a missing binary never surfaces as `ENOENT` on
 * `result.error` — the shell starts fine and reports the miss itself, so a
 * caller that wants to skip with a notice instead of failing needs both
 * spellings.
 *
 * @param {{ status: number | null, stderr?: string | Buffer | null }} result
 * @returns {boolean}
 */
export function isCommandNotFound(result) {
	if (result.status === POSIX_COMMAND_NOT_FOUND_STATUS) {
		return true;
	}

	return (
		result.status !== null &&
		result.status !== 0 &&
		CMD_EXE_COMMAND_NOT_FOUND.test(String(result.stderr ?? ""))
	);
}

/**
 * The parsed `.ai-skills/config.json` under `toplevel`, or `null` when the
 * file is absent, unreadable, or not valid JSON. Never throws: a git hook that
 * crashed on a config typo would block a commit for a reason unrelated to it.
 *
 * @param {string} toplevel
 * @returns {Record<string, unknown> | null}
 */
export function readRepoConfig(toplevel) {
	try {
		const parsed = JSON.parse(
			readFileSync(path.join(toplevel, ".ai-skills", "config.json"), "utf8")
		);

		return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
			? parsed
			: null;
	} catch {
		return null;
	}
}

/**
 * Narrows one block of a parsed config to an object, or to an empty one when
 * it is absent or not an object, so a nested read never throws on a config typo.
 *
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
export function asRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? /** @type {Record<string, unknown>} */ (value)
		: {};
}
