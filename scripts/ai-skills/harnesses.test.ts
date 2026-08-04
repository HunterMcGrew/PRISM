/**
 * Regression suite for the per-host harness table (plan `thr-2171-port`
 * tasks 1 and 5). Covers the claude, cursor, and codex rows' accessor and
 * envelope contracts, `extractPatchFilePaths`, and the `resolveToolKind`
 * fallback every row relies on.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { extractPatchFilePaths, HARNESSES, resolveToolKind } from "./hooks/harnesses";

test("claude row: sessionId reads session_id", () => {
	const result = HARNESSES.claude.sessionId({ session_id: "abc" });
	assert.equal(result, "abc");
});

test("claude row: sessionId returns null when session_id is absent", () => {
	const result = HARNESSES.claude.sessionId({});
	assert.equal(result, null);
});

test("claude row: filePaths reads tool_input.file_path", () => {
	const result = HARNESSES.claude.filePaths({
		tool_input: { file_path: "/repo/README.md" },
	});
	assert.deepEqual(result, ["/repo/README.md"]);
});

test("claude row: filePaths returns an empty list when file_path is absent", () => {
	const result = HARNESSES.claude.filePaths({});
	assert.deepEqual(result, []);
});

test("claude row: emitNag produces Claude Code's hookSpecificOutput envelope", () => {
	const result = HARNESSES.claude.emitNag("unread doc: foo.md");
	assert.deepEqual(result, {
		hookSpecificOutput: {
			hookEventName: "PostToolUse",
			additionalContext: "unread doc: foo.md",
		},
	});
});

test("claude row: emitNone is null", () => {
	assert.equal(HARNESSES.claude.emitNone(), null);
});

test("cursor row: sessionId reads conversation_id, not session_id", () => {
	const result = HARNESSES.cursor.sessionId({ conversation_id: "conv-1" });
	assert.equal(result, "conv-1");
});

test("cursor row: filePaths reads the same tool_input.file_path shape as claude", () => {
	const result = HARNESSES.cursor.filePaths({
		tool_input: { file_path: "/repo/README.md" },
	});
	assert.deepEqual(result, ["/repo/README.md"]);
});

test("cursor row: emitNag produces Cursor's additional_context envelope", () => {
	const result = HARNESSES.cursor.emitNag("unread doc: foo.md");
	assert.deepEqual(result, { additional_context: "unread doc: foo.md" });
});

test("cursor row: emitNone is an empty object, not null", () => {
	assert.deepEqual(HARNESSES.cursor.emitNone(), {});
});

test("cursor row: StrReplace is unmapped in toolKinds", () => {
	assert.equal(HARNESSES.cursor.toolKinds.StrReplace, undefined);
});

test("resolveToolKind: returns the mapped kind for a known tool name", () => {
	assert.equal(resolveToolKind(HARNESSES.claude, "Read"), "read");
	assert.equal(resolveToolKind(HARNESSES.claude, "Bash"), "shell");
});

test("resolveToolKind: defaults to write for an unmapped tool name", () => {
	assert.equal(resolveToolKind(HARNESSES.cursor, "StrReplace"), "write");
});

test("resolveToolKind: defaults to write when toolName is undefined", () => {
	assert.equal(resolveToolKind(HARNESSES.claude, undefined), "write");
});

test("codex row: sessionId reads session_id, same field as claude", () => {
	const result = HARNESSES.codex.sessionId({ session_id: "abc" });
	assert.equal(result, "abc");
});

test("codex row: filePaths reads tool_input.file_path for a non-apply_patch tool", () => {
	const result = HARNESSES.codex.filePaths({
		tool_name: "Bash",
		tool_input: { file_path: "/repo/README.md" },
	});
	assert.deepEqual(result, ["/repo/README.md"]);
});

test("codex row: filePaths extracts the target from an apply_patch command blob", () => {
	const result = HARNESSES.codex.filePaths({
		tool_name: "apply_patch",
		tool_input: {
			command: "*** Update File: src/foo.ts\n@@ ...",
		},
	});
	assert.deepEqual(result, ["src/foo.ts"]);
});

test("codex row: emitNag is identical in shape to claude's", () => {
	const result = HARNESSES.codex.emitNag("unread doc: foo.md");
	assert.deepEqual(result, {
		hookSpecificOutput: {
			hookEventName: "PostToolUse",
			additionalContext: "unread doc: foo.md",
		},
	});
});

test("codex row: emitNone is null", () => {
	assert.equal(HARNESSES.codex.emitNone(), null);
});

test("codex row: apply_patch is mapped to write in toolKinds, not read", () => {
	assert.equal(HARNESSES.codex.toolKinds.apply_patch, "write");
	assert.equal(HARNESSES.codex.toolKinds.Bash, "shell");
});

test("extractPatchFilePaths: returns the path from a single-file Add File header", () => {
	const command = "*** Add File: src/new-file.ts\n+export const x = 1;\n";
	assert.deepEqual(extractPatchFilePaths(command), ["src/new-file.ts"]);
});

test("extractPatchFilePaths: returns every path across a multi-file patch", () => {
	const command = [
		"*** Update File: src/a.ts",
		"@@ ...",
		"*** Add File: src/b.ts",
		"+content",
		"*** Delete File: src/c.ts",
	].join("\n");
	assert.deepEqual(extractPatchFilePaths(command), [
		"src/a.ts",
		"src/b.ts",
		"src/c.ts",
	]);
});

test("extractPatchFilePaths: returns an empty list for a blob with no recognized header, not a thrown error", () => {
	assert.deepEqual(extractPatchFilePaths("not a patch at all"), []);
});

test("extractPatchFilePaths: returns an empty list for undefined or empty input", () => {
	assert.deepEqual(extractPatchFilePaths(undefined), []);
	assert.deepEqual(extractPatchFilePaths(""), []);
});
