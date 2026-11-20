// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
// Prints the key names in a dotenv file, one per line, and never a value. The
// secrets gate denies an agent reading a secret file and points it here, so
// nothing in this script may print text from the right of an `=`.
//
//   node env-keys.mjs <file>
//
// Blank lines, `#` lines, and lines that aren't KEY=value are skipped, and an
// optional `export ` prefix is accepted. A key a file sets twice prints twice.
// A value that opens a single, double, or backtick quote and doesn't close it
// on the same line runs on until its closing quote, and every line inside it
// prints nothing, so a key-shaped line in a multi-line value stays hidden.
//
// A file whose name isn't `.env`, `.env.*`, or `*.env`, in any case, is
// refused before it is read, so a key or token file prints nothing. A symlink
// is refused unless the file it resolves to is named that way too. A byte
// order mark at the start of the file is skipped.
//
// A file with a line opening a PEM block outside a quoted value is refused,
// because a base64 line ending in `=` padding reads as a key name, and a PEM
// export can open with `Bag Attributes` lines before its first block. A PEM
// block inside a quoted multi-line value is hidden like any other line there.
//
// Exit codes: 0 prints the keys, 1 refuses the file, 2 cannot read it.

import { readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KEY_LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;
const PEM_LINE = /^\s*-----BEGIN/;
const DOTENV_NAME = /^(?:\.env|\.env\..*|.*\.env)$/i;

/**
 * Whether `text` holds the closing quote.
 *
 * A backslash escapes the next character in every quote style, so `\"` or `\'`
 * never closes the value early and a key-shaped line after it stays hidden.
 *
 * @param {string} quote
 * @param {string} text
 */
function findClose(quote, text) {
	for (let index = 0; index < text.length; index++) {
		if (text[index] === "\\") {
			index++;
			continue;
		}

		if (text[index] === quote) return true;
	}

	return false;
}

/**
 * The key names in dotenv `text`, in file order, or `null` when a line outside
 * a quoted value opens a PEM block.
 *
 * @param {string} text
 * @returns {string[] | null}
 */
export function listEnvKeys(text) {
	const keys = [];
	const lines = text.split("\n");
	let openQuote = "";

	for (const rawLine of lines) {
		const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;

		if (openQuote) {
			if (findClose(openQuote, line)) openQuote = "";

			continue;
		}

		if (PEM_LINE.test(line)) return null;

		const match = KEY_LINE.exec(line);

		if (!match) continue;

		keys.push(match[1]);

		const value = match[2];
		const first = value[0];

		if (
			(first === '"' || first === "'" || first === "`") &&
			!findClose(first, value.slice(1))
		) {
			openQuote = first;
		}
	}

	return keys;
}

/** @param {string[]} argv */
function runCli(argv) {
	const file = argv[0] ?? "";
	let text;

	try {
		if (!file || !statSync(file).isFile()) throw new Error("not a file");

		// A key or token file has no key names, and its base64 body can read as
		// one, so the name is checked before the file is opened.
		const names = [path.basename(file), path.basename(realpathSync(file))];

		if (!names.every((name) => DOTENV_NAME.test(name))) {
			process.stderr.write(
				`env-keys: ${file} is not named like a dotenv file\n`
			);
			process.exitCode = 1;

			return;
		}

		text = readFileSync(file, "utf8");
	} catch {
		process.stderr.write(`env-keys: cannot read ${file}\n`);
		process.exitCode = 2;

		return;
	}

	// Printed only once the whole file has read clean, so a PEM line found late
	// leaves nothing on stdout.
	const keys = listEnvKeys(text);

	if (keys === null) {
		process.stderr.write(`env-keys: ${file} is a PEM block, not a dotenv file\n`);
		process.exitCode = 1;

		return;
	}

	if (keys.length > 0) process.stdout.write(`${keys.join("\n")}\n`);
}

const isEntryModule =
	process.argv[1] !== undefined &&
	realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryModule) runCli(process.argv.slice(2));
