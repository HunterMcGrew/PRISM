/**
 * Shared types for Atlas's per-team rule generators (PR-2.3).
 *
 * Each generator emits one or more rule files into `.prism/rules/` based on
 * `DetectedStack` from the stack-detection subsystem. Generators are
 * skip-if-exists by default — a `--force` flag is the escape hatch so a team
 * can intentionally regenerate after a stack change. The result shape is
 * uniform across generators: `path` (absolute), `written` (true when the file
 * was created or overwritten), and `reason` (a short string surfaced in the
 * closing summary so the user can see why a given file was or wasn't
 * touched).
 *
 * The `written: false` case fires when the target already exists and force
 * was not passed. The reason string is stable — tests assert on it.
 */
import type { OnboardingConfig } from "../onboarding-types";

/**
 * One emitted file's outcome. `path` is the absolute path the generator
 * targeted; `written` is true when the generator wrote the file; `reason`
 * is the short, stable string that explains the outcome to the user.
 */
export interface GeneratedRuleResult {
	path: string;
	written: boolean;
	reason: string;
}

/**
 * Optional overrides every generator accepts. `force: true` overrides the
 * skip-if-exists posture — the file is overwritten regardless of prior
 * content. Atlas's `--force` flag in reconfigure mode is the only documented
 * caller.
 */
export interface GenerateOptions {
	force?: boolean;
}

/**
 * Shape every generator exports. Generators are pure side-effect functions
 * (read `OnboardingConfig`, write files at `repoRoot`) — they do not consult
 * git state, network, or environment beyond the working directory passed in.
 */
export type RuleGenerator = (
	config: OnboardingConfig,
	repoRoot: string,
	options?: GenerateOptions
) => Promise<GeneratedRuleResult[]>;

/**
 * Stable reason strings — exported so tests and the orchestrator share the
 * exact same literals. When a new reason needs adding, declare it here
 * rather than inline.
 */
export const REASONS = {
	created: "created",
	exists:
		"exists — preserve team hand-edits; pass --force to regenerate",
	forced: "force-overwrote existing file",
	noStackMatch: "no detected stack matched this generator",
} as const;
