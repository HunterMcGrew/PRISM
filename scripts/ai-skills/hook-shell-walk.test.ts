/**
 * Pins how the hook's shell readers treat a command they cannot fully trust:
 * heredoc bodies cut from the write-gate scan only when they are provably a
 * data reader's input, read credit withheld from doubtful or nested commands,
 * and one walk shared by every reader of the same command.
 */
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
	parseShellReadTargets,
	parseUnprovenShellPaths,
	resolveArgumentsAfterCd,
	walkCommand,
} from "./hooks/hook.mjs";

const ROUTED = ".prism/rules/x.md";

// --- Heredoc bodies in the write-gate scan ---

test("parseUnprovenShellPaths: a body held by a data reader leaves the scan", () => {
	const command = "cat <<'EOF'\nsee .prism/y.md\nEOF\n";

	assert.equal(parseUnprovenShellPaths(command).includes(".prism/y.md"), false);
});

test("parseUnprovenShellPaths: an earlier line equal to a body does not stand in for it", () => {
	const command = [
		"cat a.md # <<",
		"cat b.md",
		`cat src.md | tee ${ROUTED}`,
		"cat <<'A'",
		"cat b.md",
		"A",
		"",
	].join("\n");

	assert.equal(parseUnprovenShellPaths(command).includes(ROUTED), true);
});

test("parseUnprovenShellPaths: a CRLF body leaves the scan like an LF one", () => {
	const command = "gh pr comment 1 --body-file - <<'EOF'\r\nsee .prism/y.md\r\nEOF\r\n";

	assert.equal(parseUnprovenShellPaths(command).includes(".prism/y.md"), false);
});

test("parseUnprovenShellPaths: every body of two heredocs on one line leaves the scan", () => {
	const command = "cat <<'A' <<'B'\nsee .prism/a.md\nA\nsee .prism/b.md\nB\n";
	const candidates = parseUnprovenShellPaths(command);

	assert.equal(candidates.includes(".prism/a.md"), false);
	assert.equal(candidates.includes(".prism/b.md"), false);
});

test("parseUnprovenShellPaths: a body fed to a shell stays in the scan", () => {
	const command = "bash <<'EOF'\ntee .prism/y.md\nEOF\n";

	assert.equal(parseUnprovenShellPaths(command).includes(".prism/y.md"), true);
});

test("parseUnprovenShellPaths: a body that runs a substitution stays in the scan", () => {
	const substitution = `cat <<EOF\n$(tee ${ROUTED} </dev/null)\nEOF\n`;
	const backticks = `cat <<EOF\n\`tee ${ROUTED} </dev/null\`\nEOF\n`;

	assert.equal(parseUnprovenShellPaths(substitution).includes(ROUTED), true);
	assert.equal(parseUnprovenShellPaths(backticks).includes(ROUTED), true);
});

test("parseUnprovenShellPaths: only the body that runs a substitution stays when two share a line", () => {
	const command = `cat <<'A' <<EOF\nsee .prism/a.md\nA\n$(tee ${ROUTED} </dev/null)\nEOF\n`;
	const candidates = parseUnprovenShellPaths(command);

	assert.equal(candidates.includes(ROUTED), true);
	assert.equal(candidates.includes(".prism/a.md"), false);
});

// --- Arguments after a cd ---

const root = path.resolve("/repo");

test("resolveArgumentsAfterCd: a cd inside a substitution or a nested shell does not move the shell's directory", () => {
	const commands = [
		"ROOT=$(cd scripts && pwd); cd src && tee index.ts",
		"sh -c 'cd scripts && ls'; cd src && tee index.ts",
	];

	for (const command of commands) {
		const resolved = resolveArgumentsAfterCd(command, root);

		assert.equal(resolved.includes(path.join(root, "src", "index.ts")), true, command);
		assert.equal(
			resolved.includes(path.join(root, "scripts", "src", "index.ts")),
			false,
			command
		);
	}
});

test("resolveArgumentsAfterCd: a command the walk cannot read resolves its paths under every cd it names", () => {
	const resolved = resolveArgumentsAfterCd(
		'echo "$(echo ")")"; cd src && tee index.ts',
		root
	);

	assert.equal(resolved.includes(path.join(root, "src", "index.ts")), true);
});

test("resolveArgumentsAfterCd: a cd target that holds a substitution leaves the last known directory in place", () => {
	const resolved = resolveArgumentsAfterCd(
		'cd .prism && cd "$(pwd)" && tee rules/a.md',
		root
	);

	assert.equal(resolved.includes(path.join(root, ".prism", "rules", "a.md")), true);
	assert.equal(
		resolved.some((target) => target.includes(" pwd ")),
		false
	);
});

// --- Read credit under doubt ---

test("parseShellReadTargets: a command the walk cannot read credits nothing", () => {
	assert.deepEqual(parseShellReadTargets("cat a.md\ncat 'x"), []);
	assert.deepEqual(parseShellReadTargets("cat a.md\ncat x"), [
		{ filePath: "a.md", credit: true },
		{ filePath: "x", credit: true },
	]);
});

test("parseShellReadTargets: a cat inside a nested shell string credits nothing", () => {
	assert.deepEqual(parseShellReadTargets("bash -c 'cat a.md'"), []);
	assert.deepEqual(parseShellReadTargets('sh -c "cat a.md"'), []);
});

// --- One walk per command ---

test("walkCommand: one command is walked once, whatever its line endings", () => {
	assert.equal(walkCommand("cat a.md\ncat b.md"), walkCommand("cat a.md\ncat b.md"));
	assert.equal(walkCommand("cat a.md\r\ncat b.md"), walkCommand("cat a.md\ncat b.md"));
});
