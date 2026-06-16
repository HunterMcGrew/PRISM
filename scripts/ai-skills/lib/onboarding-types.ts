/**
 * Type definitions for Atlas's onboarding flow (PR-2.1).
 *
 * `OnboardingConfig` is the assembled shape Atlas collects across the
 * interactive flow. It maps onto — but is not identical to — the on-disk
 * `.ai-skills/config.json` schema. The two-layer split is deliberate: the
 * flow-internal shape carries fields Atlas needs during a session (paths to
 * user-supplied standards, the resolved `DetectedStack`); the on-disk schema
 * is the stable contract the build's token-substitution layer reads from
 * (ADR-0030). `writeOnboardingConfig` is the translation seam.
 *
 * `OnboardingState` tracks step completion so an interrupted session resumes
 * from `nextIncompleteStep` instead of restarting from step one (per Atlas's
 * shared.md § Interactive flow).
 */
import type { DetectedStack } from "./stack-detect";

/**
 * Documentation layout detected from the repo before Atlas asks the
 * documentation question set. Atlas proposes this as the default answer
 * — the user confirms or corrects.
 */
export interface DetectedDocLayout {
	/** Root path of the team's docs directory, relative to the repo root. */
	location?: string;
	/** Doc tool inferred from config-file fingerprints. */
	tool?: "nextra" | "docusaurus" | "mkdocs" | "vitepress" | "plain-markdown";
	/** Files that surfaced the detection. */
	evidence: string[];
}

/**
 * Documentation answers gathered from Atlas's interactive flow. Maps 1:1
 * onto the `documentation` block in the on-disk schema.
 */
export interface DocumentationConfig {
	location: string;
	audience: string;
	keepsDevDocs: boolean;
	/** Open string — not validated against an enum. Consumers add their own value without a schema change. */
	format: string;
}

/**
 * In-session config assembled across Atlas's interactive flow. Fields named
 * here align with the prompts in Atlas's shared.md § Interactive flow.
 */
export interface OnboardingConfig {
	project: string;
	ticketPrefix: string;
	githubOwner: string;
	githubRepo: string;
	linearTeam: string;
	productDomain: string;
	techStack: DetectedStack;
	existingStandards: string[];
	/** Present when the user has answered the documentation question set. */
	documentation?: DocumentationConfig;
}

/**
 * Step completion state. `name` identifies the step; `status` is the gate;
 * `completedAt` is ISO-8601 when the step transitioned to `complete`.
 */
export interface OnboardingStep {
	name: string;
	status: "pending" | "complete";
	completedAt?: string;
}

/**
 * Persisted state for resumable onboarding. The full step list is fixed by
 * Atlas's flow — `saveState` writes the whole record so an external editor
 * can't desync the array shape.
 */
export interface OnboardingState {
	startedAt: string;
	updatedAt: string;
	mode: "first-install" | "reconfigure" | "dogfood-self" | "first-contact";
	steps: OnboardingStep[];
}
