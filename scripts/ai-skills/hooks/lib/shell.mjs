// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Shell command segmentation shared by the architect write gate and the git
 * gates. Zero-dependency `.mjs` — see `hook.mjs` for why.
 */

/**
 * Strips one layer of matching surrounding quotes from a token.
 *
 * @param {string} token
 * @returns {string}
 */
export function unquote(token) {
	const quoted = /^(["'])(.*)\1$/.exec(token);
	return quoted ? quoted[2] : token;
}

/**
 * Splits a raw command into one token array per command segment, cutting at
 * every unquoted `;`, `&&`, `||`, `|`, `&`, and line break.
 *
 * Every caller runs on this rather than tokenizing the raw command itself.
 * The architect gate's `resolveProvenSafePaths` needs the cuts so one
 * segment's read-only head token cannot vouch for the next command's
 * operands; its read detector needs them so a remedy pasted as several lines
 * into one call credits each line; the git gates need them so `git commit -m x
 * && git push` is two subcommands to judge rather than one. A shared splitter
 * is what keeps those answers from drifting.
 *
 * This scans characters rather than splitting on whitespace and comparing
 * whole tokens against a separator set. The token form could only see a
 * separator that had space on both sides, so `a;b` and `a&&b` never cut — the
 * write arm resumed claiming operands past the separator and named a path the
 * command only read. Two things make the character form worth its length over
 * a regex split on the separators:
 *
 * - **Quotes.** `sed -i 's/a/b/;s/c/d/' out.md` carries a `;` that is part of
 *   the script, not a separator. Cutting there loses `out.md` — a real write
 *   the gate then never sees.
 * - **Heredocs.** A `<<DELIM` introducer makes every line up to `DELIM` data
 *   rather than commands, so the body is skipped whole. Otherwise a PR body
 *   written through `tee <<'E'` would have its own text parsed as commands.
 *
 * The architect gate's callers test the whole command against
 * `SHELL_READ_SAFE_CHARACTERS` first, and that class excludes `<`, `&`, `|`,
 * and `\` — so through those callers the heredoc branches, the `&`/`|` cut,
 * and the backslash escape inside a double quote are never reached. The git
 * gates run the splitter with no pre-filter, and those branches are what keep
 * a `git commit -m "$(cat <<'EOF' … EOF)"` body or a `tee <<'E'` body from
 * being read as commands there. The class test is still a single point of
 * failure for the architect gate: widen it by one character and each branch
 * is the difference between an over-refusal and a silent miss.
 *
 * Two things it still does not model:
 *
 * - **Substitution containing a separator** — `$(a; b)` and its backtick
 *   twin. This produces an *extra* cut the shell would not make, stranding
 *   the token after it in a segment whose head is not a command. Unreachable
 *   through the architect gate, whose callers refuse `$` and `` ` `` up front.
 *   Reachable through the git gates, where the cost is a stranded segment
 *   whose head is not `git` and which therefore matches nothing.
 * - **A separator inside an unterminated quote**, which is swallowed rather
 *   than cut. This matches what the shell itself does with an unterminated
 *   quote, which is to treat the rest of the line as one quoted word rather
 *   than as further commands.
 *
 * @param {string} command
 * @returns {string[][]}
 */
export function splitShellSegments(command) {
	/** @type {string[][]} */
	const segments = [];
	/** @type {string[]} */
	const pendingHeredocs = [];
	/** @type {string[]} */
	let tokens = [];
	let token = "";
	let started = false;
	/** @type {string | null} */
	let quote = null;

	const endToken = () => {
		if (started) {
			tokens.push(token);
			token = "";
			started = false;
		}
	};

	const endSegment = () => {
		endToken();
		if (tokens.length > 0) {
			segments.push(tokens);
			tokens = [];
		}
	};

	for (let index = 0; index < command.length; index++) {
		const char = command[index];

		if (quote !== null) {
			token += char;
			if (char === "\\" && quote === '"' && index + 1 < command.length) {
				token += command[index + 1];
				index++;
			} else if (char === quote) {
				quote = null;
			}
			continue;
		}

		if (char === "\n" || char === "\r") {
			endSegment();
			if (pendingHeredocs.length > 0) {
				index = skipHeredocBodies(command, index, pendingHeredocs);
			}
			continue;
		}

		if (char === " " || char === "\t") {
			endToken();
			continue;
		}

		if (char === ";" || char === "&" || char === "|") {
			if (char !== ";" && command[index + 1] === char) {
				index++;
			}
			endSegment();
			continue;
		}

		if (char === "<" && command[index + 1] === "<" && command[index + 2] !== "<") {
			endToken();
			index = readHeredocDelimiter(command, index, pendingHeredocs);
			continue;
		}

		if (char === "'" || char === '"') {
			quote = char;
			token += char;
			started = true;
			continue;
		}

		if (char === "\\" && index + 1 < command.length) {
			token += command[index + 1];
			index++;
			started = true;
			continue;
		}

		token += char;
		started = true;
	}

	endSegment();

	return segments;
}

/**
 * Records the delimiter word of the heredoc introduced at `index` and returns
 * the index of its last consumed character.
 *
 * The introducer and its delimiter are dropped rather than kept as tokens —
 * neither is an operand of the command, and `tee out.md <<'E'` previously
 * yielded `<<'E'` as a write target alongside the real one.
 *
 * @param {string} command
 * @param {number} index index of the first `<` of the `<<`
 * @param {string[]} pendingHeredocs delimiters awaiting their body, in order
 * @returns {number}
 */
export function readHeredocDelimiter(command, index, pendingHeredocs) {
	let cursor = index + 2;
	if (command[cursor] === "-") {
		cursor++;
	}

	while (command[cursor] === " " || command[cursor] === "\t") {
		cursor++;
	}

	let delimiter = "";
	while (cursor < command.length && !/[\s;&|<>]/.test(command[cursor])) {
		if (command[cursor] !== "'" && command[cursor] !== '"') {
			delimiter += command[cursor];
		}
		cursor++;
	}

	if (delimiter.length > 0) {
		pendingHeredocs.push(delimiter);
	}

	return cursor - 1;
}

/**
 * Skips the bodies of every heredoc awaiting one, starting from the line break
 * at `index`, and returns the index of the last consumed character.
 *
 * A body line is data the command writes, not a command. An unterminated
 * heredoc consumes the rest of the input, which is what the shell does too.
 *
 * @param {string} command
 * @param {number} index
 * @param {string[]} pendingHeredocs
 * @returns {number}
 */
export function skipHeredocBodies(command, index, pendingHeredocs) {
	let cursor = index;

	while (pendingHeredocs.length > 0 && cursor < command.length) {
		while (
			cursor < command.length &&
			(command[cursor] === "\n" || command[cursor] === "\r")
		) {
			cursor++;
		}

		let lineEnd = cursor;
		while (
			lineEnd < command.length &&
			command[lineEnd] !== "\n" &&
			command[lineEnd] !== "\r"
		) {
			lineEnd++;
		}

		if (command.slice(cursor, lineEnd).trim() === pendingHeredocs[0]) {
			pendingHeredocs.shift();
		}

		cursor = lineEnd;
	}

	return cursor - 1;
}
