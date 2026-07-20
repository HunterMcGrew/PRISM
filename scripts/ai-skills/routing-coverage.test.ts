/**
 * Registry-parity gate for the skill-routing surface. Run via `pnpm prism:test`.
 *
 * Asserts that `.ai-skills/definitions/roles.json`'s `routing` field and the
 * prose routing surfaces agree in both directions:
 *   - every `routing: "auto"` id appears exactly once in the canonical rule's
 *     routing table (and the install seed twin's)
 *   - every `routing: "named-only"` id appears in the rule's named-invocation
 *     or utility section (and the seed twin's)
 *   - every `prism-*` id referenced anywhere in the rule exists in
 *     `roles.json` — no ghost routes
 *   - every persona in `roles.json` appears in `skills-ecosystem.md`'s roster
 *
 * This is the validate-not-generate gate from the routing-completeness
 * evaluation: membership drift between the registry and the hand-maintained
 * prose is a silent failure, and this test converts it into a named, red one.
 */
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");

interface RoleEntry {
	id: string;
	persona?: string;
	type?: "persona" | "utility";
	routing?: "auto" | "named-only";
}

async function loadRoles(): Promise<RoleEntry[]> {
	const rolesPath = path.join(
		repoRoot,
		".ai-skills",
		"definitions",
		"roles.json"
	);
	const raw = await fs.readFile(rolesPath, "utf8");
	return (JSON.parse(raw) as { skills: RoleEntry[] }).skills;
}

/**
 * Extracts the lines between a top-level `## heading` and the next top-level
 * `## ` heading (or end of file). The routing rule only nests headings one
 * level deep past `## `, so this boundary is unambiguous.
 */
function extractSection(markdown: string, heading: string): string {
	const lines = markdown.split("\n");
	const startIndex = lines.findIndex((line) => line.trim() === heading);
	if (startIndex === -1) {
		throw new Error(`Section '${heading}' not found`);
	}
	const rest = lines.slice(startIndex + 1);
	const endOffset = rest.findIndex((line) => line.startsWith("## "));
	const sectionLines = endOffset === -1 ? rest : rest.slice(0, endOffset);
	return sectionLines.join("\n");
}

function extractBacktickedSkillIds(text: string): string[] {
	const matches = text.match(/`(prism-[a-z0-9-]+)`/g) ?? [];
	return matches.map((match) => match.slice(1, -1));
}

/**
 * Runs the five parity assertions from the routing-completeness evaluation
 * against one rule file (the canonical rule or its install seed twin).
 */
async function assertRoutingRuleAgreesWithRoles(
	rulePath: string,
	roles: RoleEntry[]
): Promise<void> {
	const raw = await fs.readFile(rulePath, "utf8");
	const routingTableSection = extractSection(raw, "## Routing table");
	// Atlas's onboarding-intent trigger lives in its own section rather than a
	// routing-table row (a one-time setup flow, not a conversational-intent
	// row parallel to the others) — its auto id is still counted here so the
	// gate accepts that legitimate exception without opening the door to
	// duplicates elsewhere in the document.
	const onboardingSection = extractSection(raw, "## Onboarding intent routing");
	const namedInvocationSection = extractSection(
		raw,
		"## Named-invocation personas"
	);
	const utilitySection = extractSection(raw, "## Utility skills");

	const autoIdsInScope = [
		...extractBacktickedSkillIds(routingTableSection),
		...extractBacktickedSkillIds(onboardingSection),
	];
	const namedOnlyIds = new Set([
		...extractBacktickedSkillIds(namedInvocationSection),
		...extractBacktickedSkillIds(utilitySection),
	]);

	for (const role of roles) {
		if (role.routing === "auto") {
			const occurrences = autoIdsInScope.filter((id) => id === role.id).length;
			assert.equal(
				occurrences,
				1,
				`${rulePath}: expected '${role.id}' to appear exactly once in the routing table or the onboarding-intent section, found ${occurrences}`
			);
		} else if (role.routing === "named-only") {
			assert.ok(
				namedOnlyIds.has(role.id),
				`${rulePath}: expected '${role.id}' to appear in the Named-invocation personas or Utility skills section`
			);
		}
	}

	const knownIds = new Set(roles.map((role) => role.id));
	for (const id of extractBacktickedSkillIds(raw)) {
		assert.ok(
			knownIds.has(id),
			`${rulePath}: '${id}' is referenced but has no entry in roles.json`
		);
	}
}

test("skill-routing.md: routing table and named-invocation sections agree with roles.json", async () => {
	const roles = await loadRoles();
	await assertRoutingRuleAgreesWithRoles(
		path.join(repoRoot, ".prism", "rules", "skill-routing.md"),
		roles
	);
});

test("install seed twin: routing table and named-invocation sections agree with roles.json", async () => {
	const roles = await loadRoles();
	await assertRoutingRuleAgreesWithRoles(
		path.join(
			repoRoot,
			"templates",
			"install",
			".prism",
			"rules",
			"skill-routing.md"
		),
		roles
	);
});

async function assertEcosystemRosterAgreesWithRoles(
	ecosystemPath: string,
	roles: RoleEntry[]
): Promise<void> {
	const raw = await fs.readFile(ecosystemPath, "utf8");
	for (const role of roles) {
		if (!role.persona) {
			continue;
		}
		assert.ok(
			raw.includes(`**${role.persona}**`),
			`${ecosystemPath}: persona '${role.persona}' (${role.id}) is missing from the roster`
		);
	}
}

test("skills-ecosystem.md roster includes every persona in roles.json", async () => {
	const roles = await loadRoles();
	await assertEcosystemRosterAgreesWithRoles(
		path.join(
			repoRoot,
			".prism",
			"architect",
			"_toolkit",
			"skills-ecosystem.md"
		),
		roles
	);
});

test("install seed twin: skills-ecosystem.md roster includes every persona in roles.json", async () => {
	const roles = await loadRoles();
	await assertEcosystemRosterAgreesWithRoles(
		path.join(
			repoRoot,
			"templates",
			"install",
			".prism",
			"architect",
			"_toolkit",
			"skills-ecosystem.md"
		),
		roles
	);
});
