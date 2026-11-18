import assert from "node:assert/strict";
import test from "node:test";

import { tokenize, type TokenizeResult } from "./hooks/lib/tokenize.mjs";

/** The tokens at the operator indexes, in order. */
function operatorsOf(result: TokenizeResult): string[] {
	return [...result.operators].map((index) => result.tokens[index]);
}

test("plain words split on blanks", () => {
	const result = tokenize("git  status\t-s");
	assert.deepEqual(result.tokens, ["git", "status", "-s"]);
	assert.equal(result.operators.size, 0);
});

test("single quotes keep their text literal", () => {
	assert.deepEqual(tokenize("echo 'a b $HOME \\n'").tokens, [
		"echo",
		"a b $HOME \\n",
	]);
});

test("double quotes honor backslash escapes and join adjacent text", () => {
	assert.deepEqual(tokenize('echo "say \\"hi\\""x').tokens, [
		"echo",
		'say "hi"x',
	]);
});

test("ANSI-C quotes decode their escapes", () => {
	assert.deepEqual(tokenize("printf $'a\\tb\\x41\\101'").tokens, [
		"printf",
		"a\tbAA",
	]);
});

test("a heredoc becomes a << operator and one body word", () => {
	const result = tokenize("cat <<'EOF'\nline one\n$(not run)\nEOF\necho done");
	assert.deepEqual(result.tokens, [
		"cat",
		"<<",
		"line one\n$(not run)",
		"\n",
		"echo",
		"done",
	]);
	assert.deepEqual([...result.bodies], [2]);
	assert.deepEqual(result.substitutions, []);
});

test("an unquoted heredoc body reports its substitutions", () => {
	const result = tokenize("cat <<EOF\n$(whoami)\nEOF");
	assert.deepEqual(result.substitutions, ["whoami"]);
});

test("$( ) and backticks are returned and their words join the word", () => {
	const result = tokenize("echo $(git rev-parse HEAD) `date -u`");
	assert.deepEqual(result.substitutions, ["git rev-parse HEAD", "date -u"]);
	assert.deepEqual(result.tokens, [
		"echo",
		" git rev-parse HEAD ",
		" date -u ",
	]);
});

test("; && || and | come out as operators", () => {
	const result = tokenize("a; b && c || d | e");
	assert.deepEqual(result.tokens, [
		"a",
		";",
		"b",
		"&&",
		"c",
		"||",
		"d",
		"|",
		"e",
	]);
	assert.deepEqual(operatorsOf(result), [";", "&&", "||", "|"]);
});

test("a quoted separator stays a word", () => {
	const result = tokenize("echo 'a;b' \"c&&d\"");
	assert.deepEqual(result.tokens, ["echo", "a;b", "c&&d"]);
	assert.equal(result.operators.size, 0);
});

test("a bash -c string is one word whose inside tokenizes again", () => {
	const outer = tokenize("bash -c 'cat .env | grep KEY'");
	assert.deepEqual(outer.tokens, ["bash", "-c", "cat .env | grep KEY"]);

	const inner = tokenize(outer.tokens[2]);
	assert.deepEqual(inner.tokens, ["cat", ".env", "|", "grep", "KEY"]);
	assert.deepEqual(operatorsOf(inner), ["|"]);
});

test("a bash -lc string is one word whose inside tokenizes again", () => {
	const outer = tokenize('bash -lc "cd /workspace && git commit -m \\"x\\""');
	assert.deepEqual(outer.tokens, [
		"bash",
		"-lc",
		'cd /workspace && git commit -m "x"',
	]);

	const inner = tokenize(outer.tokens[2]);
	assert.deepEqual(inner.tokens, [
		"cd",
		"/workspace",
		"&&",
		"git",
		"commit",
		"-m",
		"x",
	]);
});

test("unreadable syntax throws so each hook can apply its own rule", () => {
	assert.throws(() => tokenize("echo 'open"), /unbalanced single quote/);
	assert.throws(() => tokenize('echo "open'), /unbalanced double quote/);
	assert.throws(() => tokenize("echo $(open"), /unbalanced \$\( \)/);
});

test("a heredoc that never gets a body reads as an empty body, as bash runs it", () => {
	const parsed = tokenize("cat <<EOF; cat .env");
	assert.deepEqual(parsed.tokens, ["cat", "<<", "", ";", "cat", ".env"]);
	assert.deepEqual([...parsed.bodies], [2]);
	assert.deepEqual(tokenize("cat <<EOF").tokens, ["cat", "<<", ""]);
});

test("an arithmetic << inside (( )) or a for (( header starts no heredoc", () => {
	for (const command of [
		"(( x = 1 << 2 ))\ncat .env",
		"(( x <<= 1 ))\ncat .env",
		"for ((i=0; i<<1; i++)); do :; done\ncat .env",
		"for((i=0; i<<1; i++)); do :; done\ncat .env",
	]) {
		const result = tokenize(command);
		assert.equal(result.bodies.size, 0, command);
		assert.deepEqual(result.tokens.slice(-3), ["\n", "cat", ".env"], command);
	}
});

test("a heredoc still starts outside an arithmetic command", () => {
	for (const command of [
		"cat <<EOF\nx\nEOF",
		"cat <<-EOF\nx\n\tEOF",
		"cat <<'EOF'\nx\nEOF",
		"(( x = 1 << 2 )); cat <<EOF\nx\nEOF",
		"(cat <<EOF\nx\nEOF\n)",
	]) {
		const result = tokenize(command);
		assert.equal(result.bodies.size, 1, command);
		assert.equal(result.tokens[[...result.bodies][0]], "x", command);
	}
});

test("a (( closed by an adjacent )) reads << as a shift", () => {
	for (const command of [
		"((cat<<2))\ncat .env",
		"(( (x) << 2 ))\ncat .env",
		"(( $(echo 1) << 2 ))\ncat .env",
		"(( x = 1 << 2\ncat .env",
	]) {
		const result = tokenize(command);
		assert.equal(result.bodies.size, 0, command);
		assert.deepEqual(result.tokens.slice(-3), ["\n", "cat", ".env"], command);
	}
});

test("a (( closed by separated parens is two subshells whose heredoc opens", () => {
	for (const command of [
		"((cat <<EOF\n'x\nEOF\n) )\nhead -c 99 .env",
		"((echo <<EOF\n'x\nEOF\n) )\nhead -c 99 .env",
		"((cat <<EOF\n'x\nEOF\n)\n)\nhead -c 99 .env",
		"(cat <<EOF\n'x\nEOF\n(true))\nhead -c 99 .env",
	]) {
		const result = tokenize(command);
		assert.equal(result.bodies.size, 1, command);
		assert.equal(result.tokens[[...result.bodies][0]], "'x", command);
		assert.deepEqual(
			result.tokens.slice(-4),
			["head", "-c", "99", ".env"],
			command
		);
	}
});

test("$(( )) and let keep reading << as arithmetic", () => {
	assert.equal(tokenize("echo $(( 1 << 2 ))\ncat .env").bodies.size, 0);
	assert.deepEqual(tokenize("let 'x = 1 << 2'\ncat .env").tokens, [
		"let",
		"x = 1 << 2",
		"\n",
		"cat",
		".env",
	]);
});

test("the module exports only what a hook imports", async () => {
	const exported = Object.keys(await import("./hooks/lib/tokenize.mjs")).sort();
	assert.deepEqual(exported, [
		"PIPES",
		"REDIRECTS",
		"flattenCommand",
		"tokenize",
	]);
});
