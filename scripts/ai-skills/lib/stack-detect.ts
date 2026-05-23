/**
 * Stack detection types — forward declaration for PR-2.2.
 *
 * PR-2.1 (Atlas skill scaffold + config writing) needs `DetectedStack` as a
 * type import so `OnboardingConfig` can declare its `techStack` field. The
 * actual detector — `detectStack(repoRoot)`, the package-file inspectors, the
 * test fixtures — lands in PR-2.2 (epic-prism-atlas plan § PR-2.2). This file
 * exists today as a forward-typed placeholder so PR-2.1's TypeScript compiles
 * without depending on PR-2.2 having shipped.
 *
 * When PR-2.2 lands, the implementation fills in alongside these types; the
 * type shapes here match the plan's task 1 specification verbatim so PR-2.2
 * can replace the placeholder without an API break.
 */

export interface DetectedLanguage {
	name:
		| "typescript"
		| "javascript"
		| "php"
		| "python"
		| "go"
		| "rust"
		| "ruby"
		| "elixir"
		| "java"
		| "unknown";
	confidence: "high" | "medium" | "low";
	evidence: string[];
}

export interface DetectedFramework {
	name: string;
	confidence: "high" | "medium" | "low";
	evidence: string[];
}

/**
 * Result of stack detection. The empty-repo sentinel — a single `unknown`
 * language with no frameworks — is a valid state, not an error (per the
 * epic-prism-atlas plan § Decisions, "Stack detection returns `['unknown']`
 * sentinel for empty repos, not an error").
 */
export type DetectedStack =
	| {
			languages: DetectedLanguage[];
			frameworks: DetectedFramework[];
	  }
	| {
			languages: [{ name: "unknown"; confidence: "high"; evidence: [] }];
			frameworks: [];
	  };
