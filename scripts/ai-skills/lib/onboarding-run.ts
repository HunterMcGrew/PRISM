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
