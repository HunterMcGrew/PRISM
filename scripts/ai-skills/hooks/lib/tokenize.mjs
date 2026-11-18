// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
// The shell tokenizer every agent hook shares. It reads a command the way
// bash would, without running it, and reports what it couldn't read by
// throwing. Each hook decides what an unreadable command means: the approval
// guard denies it and architect-context lets it through, so that rule stays in
// the hooks and out of this file.

// Bash's operators, longest first, so a run like `;>` splits the way bash
// reads it.
const OPERATORS = [
	"<<<",
	"&>>",
	";;&",
	"<<",
	">>",
	"<&",
	">&",
	"<>",
	">|",
	"&&",
	"||",
	"|&",
	";;",
	";&",
	"&>",
	";",
	"&",
	"|",
	"(",
	")",
	"<",
	">",
	"\n",
];
export const REDIRECTS = new Set([
	"<",
	">",
	">>",
	"<<",
	"<<<",
	"<&",
	">&",
	"<>",
	">|",
	"&>",
	"&>>",
]);
export const PIPES = new Set(["|", "|&"]);
/** @type {Record<string, string>} */
const ANSI_C_ESCAPES = {
	a: "\x07",
	b: "\b",
	e: "\x1b",
	E: "\x1b",
	f: "\f",
	n: "\n",
	r: "\r",
	t: "\t",
	v: "\v",
	"\\": "\\",
	"'": "'",
	'"': '"',
	"?": "?",
};

// Bash's metacharacters. A carriage return is not one: bash reads it as part
// of a word.
const SEPARATOR_CHARS = new Set([";", "&", "|", "(", ")", "<", ">", "\n"]);
const COMMENT_AFTER = new Set([
	" ",
	"\t",
	"\n",
	";",
	"&",
	"|",
	"(",
	")",
	"<",
	">",
]);

/**
 * A shlex-style tokenizer in POSIX mode. Single quotes are literal, and
 * ANSI-C `$'…'` quotes decode their escapes. Double quotes honor backslash
 * escapes. A bare backslash escapes the next character, and a backslash-newline
 * joins two lines. Operators come out one at a time by bash's longest match,
 * so `;>` is `;` then `>`, and a newline outside quotes is an operator rather
 * than whitespace. A `#` comments out the rest of its line when it starts a
 * word at the start of input or after a blank or a metacharacter.
 *
 * Every live substitution, `$( … )`, `<( … )`, or `>( … )` outside single
 * quotes, or a backtick span outside single quotes, is returned in
 * `substitutions` as its inner command text, and its words join the word it
 * sits in. A heredoc becomes a `<<` operator and one body word in its
 * command's segment, and an unquoted delimiter's body adds its own
 * substitutions. `operators` and `bodies` hold the indexes of operator and
 * body tokens, so a quoted `;` stays a word. A heredoc whose body never
 * comes, such as `cat <<EOF; cat x` on one line, keeps an empty body, since
 * bash warns and runs the rest. A `((` whose matching close is an adjacent
 * `))` is an arithmetic command or a `for ((` header, where `<<` is a shift
 * and starts no heredoc. A `((` closed by separated parens, as in
 * `((cat <<EOF … ) )`, is two subshells, and zsh runs its heredoc. Throws on
 * an unbalanced quote, backtick, or substitution.
 *
 * @param {string} command
 */
export function tokenize(command) {
	/** @type {string[]} */
	const tokens = [];
	const operators = new Set();
	const bodies = new Set();
	const substitutions = [];
	/** @type {{ delimiter: string, dashed: boolean, quoted: boolean, next: number, index?: number }[]} */
	const heredocs = [];
	let word = "";
	let inWord = false;
	let arithmeticDepth = 0;
	let i = 0;

	const flush = () => {
		if (inWord) tokens.push(word);
		word = "";
		inWord = false;
	};

	/** @param {string} text */
	const pushOperator = (text) => {
		operators.add(tokens.length);
		tokens.push(text);
	};

	const readBodies = () => {
		for (const heredoc of heredocs) {
			const body = readHeredocBody(command, i, heredoc);
			tokens[/** @type {number} */ (heredoc.index)] = body.text;
			if (!heredoc.quoted) substitutions.push(...findSubstitutions(body.text));
			i = body.end;
		}
		heredocs.length = 0;
	};

	while (i < command.length) {
		const c = command[i];
		if (
			c === "#" &&
			!inWord &&
			(i === 0 || COMMENT_AFTER.has(command[i - 1]))
		) {
			while (i < command.length && command[i] !== "\n") i += 1;
			continue;
		}
		if (c === "'") {
			const close = command.indexOf("'", i + 1);
			if (close === -1) throw new Error("unbalanced single quote");
			word += command.slice(i + 1, close);
			inWord = true;
			i = close + 1;
			continue;
		}
		if (c === "$" && command[i + 1] === "'") {
			const quote = readAnsiCQuote(command, i);
			word += quote.text;
			inWord = true;
			i = quote.end;
			continue;
		}
		if (c === "$" && command[i + 1] === '"') {
			i += 1;
			continue;
		}
		if (c === '"') {
			i += 1;
			let closed = false;
			while (i < command.length) {
				const d = command[i];
				if (d === "\\" && command[i + 1] === "\n") {
					i += 2;
					continue;
				}
				if (
					d === "\\" &&
					i + 1 < command.length &&
					'"\\$`'.includes(command[i + 1])
				) {
					word += command[i + 1];
					i += 2;
					continue;
				}
				if (d === "$" && command[i + 1] === "(") {
					const sub = consumeCommandSubstitution(command, i);
					word += flattenCommand(sub.inner);
					substitutions.push(sub.inner);
					i = sub.end;
					continue;
				}
				if (d === "`") {
					const sub = readBacktick(command, i);
					word += flattenCommand(sub.inner);
					substitutions.push(sub.inner);
					i = sub.end;
					continue;
				}
				if (d === '"') {
					closed = true;
					i += 1;
					break;
				}
				word += d;
				i += 1;
			}
			if (!closed) throw new Error("unbalanced double quote");
			inWord = true;
			continue;
		}
		if (c === "`") {
			const sub = readBacktick(command, i);
			word += flattenCommand(sub.inner);
			substitutions.push(sub.inner);
			inWord = true;
			i = sub.end;
			continue;
		}
		if ("$<>".includes(c) && command[i + 1] === "(") {
			const sub = consumeCommandSubstitution(command, i);
			word += flattenCommand(sub.inner);
			substitutions.push(sub.inner);
			inWord = true;
			i = sub.end;
			continue;
		}
		if (c === "\\") {
			if (command[i + 1] !== "\n" && i + 1 < command.length) {
				word += command[i + 1];
				inWord = true;
			}
			i += 2;
			continue;
		}
		if (c === " " || c === "\t") {
			flush();
			i += 1;
			continue;
		}
		if (
			c === "<" &&
			command[i + 1] === "<" &&
			command[i + 2] !== "<" &&
			arithmeticDepth === 0
		) {
			const heredoc = readHeredocStart(command, i);
			if (heredoc) {
				flush();
				pushOperator("<<");
				heredoc.index = tokens.length;
				bodies.add(tokens.length);
				tokens.push("");
				heredocs.push(heredoc);
				i = heredoc.next;
				continue;
			}
		}
		if (SEPARATOR_CHARS.has(c)) {
			flush();
			const operator = /** @type {string} */ (
				OPERATORS.find((op) => command.startsWith(op, i))
			);
			pushOperator(operator);
			i += operator.length;
			if (
				operator === "(" &&
				(arithmeticDepth > 0 || opensArithmetic(command, i - 1))
			)
				arithmeticDepth += 1;
			else if (operator === ")" && arithmeticDepth > 0) arithmeticDepth -= 1;
			if (operator === "\n" && heredocs.length > 0) readBodies();
			continue;
		}
		word += c;
		inWord = true;
		i += 1;
	}
	flush();

	return { tokens, operators, bodies, substitutions };
}

/**
 * The words of a substitution's inner command, spaced so they join the word
 * around them as separate names. Text that can't be tokenized joins as is.
 *
 * @param {string} inner
 */
export function flattenCommand(inner) {
	try {
		return ` ${tokenize(inner).tokens.join(" ")} `;
	} catch {
		return ` ${inner} `;
	}
}

/**
 * Whether the `((` at `command[start]` opens arithmetic: the inner `(`
 * closes right before the outer one, as `))`.
 *
 * Parens are counted without reading quotes or heredoc bodies, so a `))`
 * inside one can make two subshells read as arithmetic. Their heredoc body
 * is then read as commands, and an unmatched quote in it throws. A `((`
 * that never closes reads as arithmetic, which keeps `<<` a shift.
 *
 * @param {string} command
 * @param {number} start
 */
function opensArithmetic(command, start) {
	if (command[start + 1] !== "(") return false;

	let depth = 0;
	for (let i = start; i < command.length; i += 1) {
		if (command[i] === "(") depth += 1;
		else if (command[i] === ")" && --depth === 1) return command[i + 1] === ")";
	}

	return true;
}

/**
 * Reads an ANSI-C `$'…'` quote starting at the `$` of `command[start]`.
 * Returns its decoded text and the index just past the closing quote.
 *
 * @param {string} command
 * @param {number} start
 */
function readAnsiCQuote(command, start) {
	let text = "";
	let i = start + 2;
	while (i < command.length) {
		const c = command[i];
		if (c === "'") return { text, end: i + 1 };
		if (c !== "\\") {
			text += c;
			i += 1;
			continue;
		}

		const escape = readAnsiCEscape(command, i + 1);
		text += escape.text;
		i = escape.end;
	}
	throw new Error("unbalanced ANSI-C quote");
}

/**
 * Decodes one escape after a backslash at `command[start - 1]`.
 *
 * @param {string} command
 * @param {number} start
 */
function readAnsiCEscape(command, start) {
	const c = command[start];
	if (Object.hasOwn(ANSI_C_ESCAPES, c))
		return { text: ANSI_C_ESCAPES[c], end: start + 1 };

	/** @type {[RegExp, number, number][]} */
	const forms = [
		[/^[0-7]{1,3}/, 0, 8],
		[/^x([0-9a-fA-F]{1,2})/, 1, 16],
		[/^u([0-9a-fA-F]{1,4})/, 1, 16],
		[/^U([0-9a-fA-F]{1,8})/, 1, 16],
	];
	const rest = command.slice(start, start + 9);
	for (const [pattern, group, radix] of forms) {
		const match = pattern.exec(rest);
		if (!match) continue;

		const code = Number.parseInt(match[group], radix);
		const text = code <= 0x10ffff ? String.fromCodePoint(code) : "";
		return { text, end: start + match[0].length };
	}
	if (c === "c" && start + 1 < command.length)
		return {
			text: String.fromCharCode(command.charCodeAt(start + 1) & 0x1f),
			end: start + 2,
		};

	return { text: `\\${c ?? ""}`, end: start + 1 };
}

/**
 * Reads a backtick span starting at `command[start]`. Returns its raw text,
 * its inner command, and the index just past the closing backtick.
 *
 * @param {string} command
 * @param {number} start
 */
function readBacktick(command, start) {
	let i = start + 1;
	while (i < command.length) {
		if (command[i] === "\\") {
			i += 2;
			continue;
		}
		if (command[i] === "`") {
			return {
				raw: command.slice(start, i + 1),
				inner: command.slice(start + 1, i),
				end: i + 1,
			};
		}
		i += 1;
	}
	throw new Error("unbalanced backtick");
}

/**
 * Reads a heredoc redirect (`<<DELIM`, `<<'DELIM'`, `<<-DELIM`) at
 * `command[start]`. Returns its delimiter, whether it is dashed or quoted, and
 * the index just past the delimiter word, or null when no delimiter follows.
 *
 * @param {string} command
 * @param {number} start
 * @returns {{ delimiter: string, dashed: boolean, quoted: boolean, next: number, index?: number } | null}
 */
function readHeredocStart(command, start) {
	let j = start + 2;
	const dashed = command[j] === "-";
	if (dashed) j += 1;
	while (command[j] === " " || command[j] === "\t") j += 1;

	const match = /^[^\s()<>|&;]+/.exec(command.slice(j));
	if (!match) return null;

	return {
		delimiter: match[0].replace(/["'\\]/g, ""),
		dashed,
		quoted: /["'\\]/.test(match[0]),
		next: j + match[0].length,
	};
}

/**
 * Reads a heredoc body starting at `command[start]`, the line after its
 * redirect. Returns the body text and the index just past the delimiter line,
 * or the end of the command when the delimiter never comes.
 *
 * @param {string} command
 * @param {number} start
 * @param {{delimiter: string, dashed: boolean}} heredoc
 */
function readHeredocBody(command, start, { delimiter, dashed }) {
	const lines = [];
	let pos = start;
	while (pos < command.length) {
		const newline = command.indexOf("\n", pos);
		const lineEnd = newline === -1 ? command.length : newline;
		const raw = command.slice(pos, lineEnd).replace(/\r$/, "");
		pos = newline === -1 ? command.length : newline + 1;
		if ((dashed ? raw.replace(/^\t+/, "") : raw) === delimiter)
			return { text: lines.join("\n"), end: pos };

		lines.push(raw);
	}

	return { text: lines.join("\n"), end: command.length };
}

/**
 * Returns the inner text of every `$( … )` and backtick span in an unquoted
 * heredoc body, where quotes are literal and both still run. An unclosed one
 * returns the rest of the body.
 *
 * @param {string} text
 */
function findSubstitutions(text) {
	const found = [];
	let i = 0;
	while (i < text.length) {
		if (text[i] === "\\") {
			i += 2;
			continue;
		}
		if (text[i] === "`") {
			const close = text.indexOf("`", i + 1);
			found.push(text.slice(i + 1, close === -1 ? text.length : close));
			i = close === -1 ? text.length : close + 1;
			continue;
		}
		if (text[i] === "$" && text[i + 1] === "(") {
			let depth = 0;
			let j = i + 1;
			for (; j < text.length; j += 1) {
				if (text[j] === "(") depth += 1;
				else if (text[j] === ")" && --depth === 0) break;
			}
			found.push(text.slice(i + 2, j));
			i = j + 1;
			continue;
		}
		i += 1;
	}

	return found;
}

/**
 * Consumes a `$( … )`, `<( … )`, or `>( … )` substitution starting at the
 * `$`, `<`, or `>` of `command[start]`. Nested parens are depth-counted so a
 * subshell inside the substitution doesn't close it early, and any heredoc
 * body inside it is consumed whole via `matchHeredocStart` rather than
 * scanned character by character — a `"` or `(` inside that body plays no
 * part in either count. Returns the inner command text and the index just
 * past the closing `)`.
 *
 * @param {string} command
 * @param {number} start
 */
function consumeCommandSubstitution(command, start) {
	let i = start + 2;
	let depth = 1;
	while (i < command.length) {
		const heredocEnd = matchHeredocStart(command, i);
		if (heredocEnd !== null) {
			i = heredocEnd;
			continue;
		}
		const c = command[i];
		i += 1;
		if (c === "(") depth += 1;
		else if (c === ")") {
			depth -= 1;
			if (depth === 0)
				return { inner: command.slice(start + 2, i - 1), end: i };
		}
	}
	throw new Error("unbalanced $( )");
}

/**
 * Recognizes a heredoc redirect (`<<DELIM`, `<<'DELIM'`, `<<-DELIM`)
 * starting at `command[i]` and returns the index just past its terminator
 * line, or null when `i` isn't a heredoc start or the terminator line is
 * never reached. The delimiter can be quoted or bare; `<<-` allows the
 * terminator line to carry leading tabs.
 *
 * @param {string} command
 * @param {number} i
 */
function matchHeredocStart(command, i) {
	if (command[i] !== "<" || command[i + 1] !== "<") return null;
	let j = i + 2;
	const dashed = command[j] === "-";
	if (dashed) j += 1;
	while (command[j] === " " || command[j] === "\t") j += 1;

	let delimiter;
	if (command[j] === "'" || command[j] === '"') {
		const quote = command[j];
		const close = command.indexOf(quote, j + 1);
		if (close === -1) return null;
		delimiter = command.slice(j + 1, close);
		j = close + 1;
	} else {
		const word = /^[^\s()<>|&;]+/.exec(command.slice(j));
		if (!word) return null;
		delimiter = word[0];
		j += word[0].length;
	}

	const lineEnd = command.indexOf("\n", j);
	if (lineEnd === -1) return null;

	let pos = lineEnd + 1;
	while (pos <= command.length) {
		const nextNewline = command.indexOf("\n", pos);
		const rawLine = command.slice(
			pos,
			nextNewline === -1 ? command.length : nextNewline
		);
		const line = dashed ? rawLine.replace(/^\t+/, "") : rawLine;
		if (line === delimiter)
			return nextNewline === -1 ? command.length : nextNewline + 1;
		if (nextNewline === -1) return null;
		pos = nextNewline + 1;
	}
	return null;
}
