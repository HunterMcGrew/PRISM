/**
 * Suite for the plan-chain frontmatter helpers: the chain-file path pattern,
 * the `key: value` block reader, the approval-line reader and stamper, and the
 * `## ` section reader.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
	approvalLines,
	CHAIN_FILE,
	formatLocalDate,
	matchApprovalLine,
	readFrontmatter,
	replaceFrontmatterLine,
	sectionBody,
	stampApproval,
} from "./hooks/plan/frontmatter.mjs";

const DRAFT = "---\ntitle: T\nstatus: draft\n---\n\nbody\n";

// --- CHAIN_FILE ---

test("CHAIN_FILE matches a live and an archived chain file", () => {
	const live = CHAIN_FILE.exec(".prism/plans/acme-1/plan.md");
	assert.equal(live?.[1], "acme-1");
	assert.equal(live?.[2], "plan");

	const archived = CHAIN_FILE.exec(".prism/archived/plans/acme-1/intent.md");
	assert.equal(archived?.[1], "acme-1");
	assert.equal(archived?.[2], "intent");
});

test("CHAIN_FILE rejects a non-chain name, a flat plan, and another tree", () => {
	assert.equal(CHAIN_FILE.test(".prism/plans/acme-1/notes.md"), false);
	assert.equal(CHAIN_FILE.test(".prism/plans/acme-1.md"), false);
	assert.equal(CHAIN_FILE.test(".ai-spec/plans/acme-1/plan.md"), false);
});

// --- readFrontmatter ---

test("readFrontmatter keeps the first of two title lines", () => {
	const block = readFrontmatter("---\ntitle: First\ntitle: Second\n---\nbody");
	assert.equal(block?.fields["title"], "First");
});

test("readFrontmatter returns null for a file with no frontmatter block", () => {
	assert.equal(readFrontmatter("# Just a heading\n\nbody"), null);
	assert.equal(readFrontmatter("---\ntitle: never closed\n"), null);
});

test("readFrontmatter reports the body range", () => {
	const block = readFrontmatter(DRAFT);
	assert.ok(block);
	assert.equal(DRAFT.slice(block.start, block.end), "title: T\nstatus: draft\n");
});

// --- approval lines ---

test("approvalLines with two status lines does not report approved", () => {
	const text = "---\nstatus: draft\nstatus: approved\n---\n";
	assert.notEqual(approvalLines(text).status, "approved");
	assert.equal(approvalLines(text).status, "draft\napproved");
});

test("approvalLines reports null for absent keys and for a file with no block", () => {
	assert.deepEqual(approvalLines("no block"), {
		status: null,
		approved_by: null,
		approved_at: null,
	});
	assert.equal(approvalLines(DRAFT).approved_by, null);
});

test("matchApprovalLine reads a near-miss spelling as an approval line", () => {
	assert.deepEqual(matchApprovalLine('  "Status" : approved'), {
		key: "status",
		value: "approved",
	});
	assert.equal(matchApprovalLine("title: x"), null);
});

// --- stampApproval and replaceFrontmatterLine ---

test("stampApproval writes the three approval lines and no approved_via", () => {
	const stamped = stampApproval(DRAFT, "auto", "2026-01-05");
	assert.match(
		stamped,
		/status: approved\napproved_by: auto\napproved_at: 2026-01-05\n---/
	);
	assert.equal(stamped.includes("approved_via"), false);
});

test("stampApproval writes a fourth line when via is chat", () => {
	const stamped = stampApproval(DRAFT, "hunter", "2026-01-05", "chat");
	assert.match(
		stamped,
		/status: approved\napproved_by: hunter\napproved_at: 2026-01-05\napproved_via: chat\n---/
	);
	assert.equal(approvalLines(stamped).status, "approved");
});

test("replaceFrontmatterLine leaves a Status line alone because the match is case-sensitive", () => {
	const text = "---\nStatus: draft\n---\n";
	assert.equal(replaceFrontmatterLine(text, "status", "status: approved"), text);
});

test("replaceFrontmatterLine never touches a matching line below the block", () => {
	const text = "---\ntitle: T\n---\nstatus: draft\n";
	assert.equal(replaceFrontmatterLine(text, "status", "status: approved"), text);
});

// --- sectionBody ---

test("sectionBody strips HTML comments and reads CRLF as LF", () => {
	const text = "## Goal\r\n<!-- hint -->\r\nship it\r\n\r\n## Next\r\nx";
	assert.equal(sectionBody(text, "Goal"), "ship it");
});

test("sectionBody stops at the next ## heading but not at a ### heading", () => {
	const text = "## A\none\n### Sub\ntwo\n## B\nthree";
	assert.equal(sectionBody(text, "A"), "one\n### Sub\ntwo");
});

test("sectionBody ignores a ## inside a fenced block", () => {
	const text = "## A\none\n```\n## not a heading\n```\ntwo\n## B\nthree";
	assert.equal(
		sectionBody(text, "A"),
		"one\n```\n## not a heading\n```\ntwo"
	);
});

test("sectionBody returns null for an absent heading", () => {
	assert.equal(sectionBody("## A\none", "B"), null);
});

// --- formatLocalDate ---

test("formatLocalDate pads the month and day", () => {
	assert.equal(formatLocalDate(new Date(2026, 0, 5)), "2026-01-05");
});
