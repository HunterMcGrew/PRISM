/**
 * Guards the 32 KiB window Codex reads of the repo's `AGENTS.md` by default.
 *
 * Every rule in `AGENTS_MD_LEAD_RULES` must end inside that window, so a default
 * Codex session still sees routing and the behavioral norms. A lead set that
 * overflows fails here rather than silently dropping rules from Codex sessions.
 * Growing the list means shortening a lead rule or moving one out.
 */
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { AGENTS_MD_LEAD_RULES, measureLeadSectionEnds } from "./agents-md-block";
import { CODEX_DEFAULT_PROJECT_DOC_MAX_BYTES } from "./codex-project-doc";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("every lead rule in AGENTS.md ends inside the window Codex reads by default", () => {
	const agentsMd = fs.readFileSync(path.join(repoRoot, "AGENTS.md"), "utf8");

	for (const { name, endByte } of measureLeadSectionEnds(agentsMd)) {
		assert.notEqual(endByte, null, `${name} is in AGENTS_MD_LEAD_RULES but not in AGENTS.md`);
		assert.ok(
			endByte !== null && endByte <= CODEX_DEFAULT_PROJECT_DOC_MAX_BYTES,
			`${name} ends at byte ${endByte}, past the ${CODEX_DEFAULT_PROJECT_DOC_MAX_BYTES} bytes Codex reads by default. Shorten a lead rule or move one out of AGENTS_MD_LEAD_RULES.`
		);
	}
});

test("the workflow rule is the first section of the generated block", () => {
	const agentsMd = fs.readFileSync(path.join(repoRoot, "AGENTS.md"), "utf8");
	const firstSource = agentsMd.match(/<!-- source: \.prism\/rules\/(\S+) -->/);

	assert.equal(firstSource?.[1], "workflow.md");
	assert.equal(AGENTS_MD_LEAD_RULES[0], "workflow.md");
});
