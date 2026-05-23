/**
 * Atlas's rule-generation orchestrator (PR-2.3, plan task 6).
 *
 * `runRuleGenerators` invokes the per-team rule generators in the order
 * Atlas's shared.md § Interactive flow declares — code-standards first,
 * then security, then framework-guidelines. The orchestrator collates the
 * per-generator `GeneratedRuleResult` arrays into a single summary structure
 * the closing-summary renderer can consume without knowing which generator
 * produced which file.
 *
 * The split out of `onboarding-config.ts` is deliberate: config writing is
 * one filesystem write and a schema check; rule generation is a multi-step
 * orchestration that will grow as Phase 2 lands new generators. Keeping the
 * orchestration in its own module means new generators slot in here without
 * touching the config-writing seam.
 *
 * Ordering matters for reporting only. Generators are independent of each
 * other — code-standards does not consume security's output — so a generator
 * that throws does not poison sibling generators. Errors propagate to the
 * caller, which decides whether to abort the session or surface and
 * continue.
 */
import {
	substituteAnchorsAcrossSkills,
	type AnchorResult,
} from "./anchor-substitute";
import { generate as generateCodeStandards } from "./rule-generators/code-standards";
import { generate as generateSecurity } from "./rule-generators/security";
import { generate as generateFrameworkGuidelines } from "./rule-generators/framework-guidelines";
import type {
	GenerateOptions,
	GeneratedRuleResult,
	RuleGenerator,
} from "./rule-generators/types";
import type { OnboardingConfig } from "./onboarding-types";

/**
 * The ordered set of generators Atlas runs during onboarding. Sequence
 * matches Atlas's shared.md § Closing summary and the plan task ordering.
 * Each entry pairs a human-readable name with the generator function so the
 * summary can attribute every file to its source generator.
 */
export const RULE_GENERATORS: ReadonlyArray<{
	name: "code-standards" | "security" | "framework-guidelines";
	run: RuleGenerator;
}> = [
	{ name: "code-standards", run: generateCodeStandards },
	{ name: "security", run: generateSecurity },
	{ name: "framework-guidelines", run: generateFrameworkGuidelines },
];

/**
 * One entry in the rule-generation summary. `generator` names the generator
 * that produced the file; `result` carries the per-file write outcome from
 * the generator itself. The shape is flat-friendly so the closing-summary
 * renderer can group by `generator`, by `written`, or by `path` without
 * re-walking the source data.
 */
export interface RuleGenerationEntry {
	generator: "code-standards" | "security" | "framework-guidelines";
	result: GeneratedRuleResult;
}

/**
 * The full output of a rule-generation run. `entries` is the flat list of
 * every generated-or-skipped file across all generators; `written` and
 * `skipped` are pre-filtered views the closing summary uses directly.
 */
export interface RuleGenerationSummary {
	entries: RuleGenerationEntry[];
	written: RuleGenerationEntry[];
	skipped: RuleGenerationEntry[];
}

/**
 * Runs every rule generator in declaration order against `config`. The
 * `force` option propagates to every generator — there is no per-generator
 * force override today because the dogfood reconfigure flow (the only
 * documented caller for force) wants all-or-nothing semantics.
 */
export async function runRuleGenerators(
	config: OnboardingConfig,
	repoRoot: string,
	options: GenerateOptions = {}
): Promise<RuleGenerationSummary> {
	const entries: RuleGenerationEntry[] = [];

	for (const { name, run } of RULE_GENERATORS) {
		const results = await run(config, repoRoot, options);
		for (const result of results) {
			entries.push({ generator: name, result });
		}
	}

	return {
		entries,
		written: entries.filter((e) => e.result.written),
		skipped: entries.filter((e) => !e.result.written),
	};
}

/**
 * Summary of a single anchor-substitution run. `entries` is one record per
 * canonical persona-source file that contained at least one anchor;
 * `written` and `touchedAnchors` are pre-filtered views the closing summary
 * can use directly.
 */
export interface AnchorSubstitutionSummary {
	entries: AnchorResult[];
	written: AnchorResult[];
	touchedAnchors: string[];
}

/**
 * Runs Atlas's stub-anchor population step after rule generation. Builds the
 * `contentByAnchor` map from `OnboardingConfig` — `specializes-in` from the
 * detected stack, `domain-context` from the captured product domain — and
 * runs `substituteAnchorsAcrossSkills` against the canonical persona-source
 * surface. Examples-class anchors stay empty in v1 (future Atlas iterations
 * fill them from team artifacts).
 *
 * The shape mirrors `runRuleGenerators` so the orchestration code at the
 * Atlas-shared.md level can compose the two in a uniform way — one call per
 * step, one summary per step, the closing summary stitches both together.
 */
export async function runAnchorSubstitution(
	config: OnboardingConfig,
	repoRoot: string
): Promise<AnchorSubstitutionSummary> {
	const contentByAnchor = buildContentByAnchor(config);
	const results = await substituteAnchorsAcrossSkills(
		repoRoot,
		contentByAnchor
	);

	const entries = Array.from(results.values());
	const written = entries.filter((e) => e.written);
	const touchedAnchors = Array.from(
		new Set(written.flatMap((e) => e.anchorsReplaced))
	).sort();

	return { entries, written, touchedAnchors };
}

/**
 * Builds the replacement map from `OnboardingConfig`. Only anchors with a
 * non-empty value are included — empty content would replace existing
 * default content with a single newline, which the v1 spec treats as
 * "leave the default until a future Atlas iteration fills it."
 */
function buildContentByAnchor(
	config: OnboardingConfig
): Record<string, string> {
	const map: Record<string, string> = {};

	const stackSummary = renderStackSummary(config);
	if (stackSummary.length > 0) {
		map["specializes-in"] = stackSummary;
	}

	const domain = config.productDomain.trim();
	if (domain.length > 0) {
		map["domain-context"] = domain;
	}

	return map;
}

/**
 * Renders the detected-stack section content. Languages list first, then
 * frameworks, both sorted by confidence-then-name. The `unknown` sentinel
 * (an empty repo or unrecognized package files) collapses to an empty
 * string so Atlas falls back to the canonical default.
 */
function renderStackSummary(config: OnboardingConfig): string {
	const languages = config.techStack.languages.filter(
		(l) => l.name !== "unknown"
	);
	const frameworks = config.techStack.frameworks;

	if (languages.length === 0 && frameworks.length === 0) {
		return "";
	}

	const lines: string[] = [];

	if (languages.length > 0) {
		lines.push(`Languages: ${languages.map((l) => l.name).join(", ")}.`);
	}
	if (frameworks.length > 0) {
		lines.push(`Frameworks: ${frameworks.map((f) => f.name).join(", ")}.`);
	}

	return lines.join(" ");
}
