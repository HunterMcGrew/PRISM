/**
 * Code-standards rule generator (PR-2.3, plan task 2).
 *
 * Emits one `.prism/rules/code-standards-<lang>.md` per detected language
 * (TypeScript, JavaScript, PHP, Python, Go, Rust, Ruby, Elixir, Java). Each
 * generated file opens with an applicability declaration per ADR-0029 so the
 * agent can scope the rules itself — skills do not have to reference the file
 * by name.
 *
 * Every generated file also carries `load: paths` frontmatter with a
 * `paths:` glob matching the language's file extensions (ADR-0070) — a
 * language rule is inherently stack-scoped, so it defaults to path-scoped
 * load rather than always-on. This is the default Atlas proposes during the
 * question flow, not a silent final answer; see `.ai-skills/skills/prism-onboarding/shared.md`
 * § Generated-rule load confirmation.
 *
 * Skip-if-exists is the default posture: when the target file already exists,
 * the generator returns `{ written: false, reason: REASONS.exists }` without
 * touching disk. The `force: true` option overrides — overwriting is opt-in
 * so a team's hand-edits to a generated rule survive the next onboarding run.
 *
 * Inline templates keep the generator self-contained. Adding a new language
 * is a two-step change: extend `LANGUAGE_TEMPLATES` with a new entry and add
 * its enum value to the `DetectedLanguage` name union in `stack-detect.ts`.
 */
import fs from "node:fs/promises";
import path from "node:path";

import type { DetectedLanguage } from "../stack-detect";
import {
	REASONS,
	type GenerateOptions,
	type GeneratedRuleResult,
	type RuleGenerator,
} from "./types";
import type { OnboardingConfig } from "../onboarding-types";

type SupportedLanguage = Exclude<DetectedLanguage["name"], "unknown">;

interface LanguageTemplate {
	slug: string;
	displayName: string;
	/** Glob patterns for `load: paths` frontmatter — this language's file extensions. */
	paths: string[];
	applicability: string;
	body: string;
}

const LANGUAGE_TEMPLATES: Record<SupportedLanguage, LanguageTemplate> = {
	typescript: {
		slug: "typescript",
		displayName: "TypeScript",
		paths: ["**/*.ts", "**/*.tsx"],
		applicability:
			"These rules apply when writing or reviewing TypeScript code in this repository.",
		body: typescriptBody(),
	},
	javascript: {
		slug: "javascript",
		displayName: "JavaScript",
		paths: ["**/*.js", "**/*.jsx", "**/*.mjs", "**/*.cjs"],
		applicability:
			"These rules apply when writing or reviewing JavaScript code in this repository.",
		body: javascriptBody(),
	},
	php: {
		slug: "php",
		displayName: "PHP",
		paths: ["**/*.php"],
		applicability:
			"These rules apply when writing or reviewing PHP code in this repository.",
		body: phpBody(),
	},
	python: {
		slug: "python",
		displayName: "Python",
		paths: ["**/*.py"],
		applicability:
			"These rules apply when writing or reviewing Python code in this repository.",
		body: pythonBody(),
	},
	go: {
		slug: "go",
		displayName: "Go",
		paths: ["**/*.go"],
		applicability:
			"These rules apply when writing or reviewing Go code in this repository.",
		body: goBody(),
	},
	rust: {
		slug: "rust",
		displayName: "Rust",
		paths: ["**/*.rs"],
		applicability:
			"These rules apply when writing or reviewing Rust code in this repository.",
		body: rustBody(),
	},
	ruby: {
		slug: "ruby",
		displayName: "Ruby",
		paths: ["**/*.rb"],
		applicability:
			"These rules apply when writing or reviewing Ruby code in this repository.",
		body: rubyBody(),
	},
	elixir: {
		slug: "elixir",
		displayName: "Elixir",
		paths: ["**/*.ex", "**/*.exs"],
		applicability:
			"These rules apply when writing or reviewing Elixir code in this repository.",
		body: elixirBody(),
	},
	java: {
		slug: "java",
		displayName: "Java",
		paths: ["**/*.java"],
		applicability:
			"These rules apply when writing or reviewing Java code in this repository.",
		body: javaBody(),
	},
};

/**
 * Generates one rule file per detected language. The `unknown` sentinel
 * language is skipped — Atlas surfaces an unknown stack to the user during
 * the survey rather than emitting code-standards files for it.
 */
export const generate: RuleGenerator = async function generate(
	config: OnboardingConfig,
	repoRoot: string,
	options: GenerateOptions = {}
): Promise<GeneratedRuleResult[]> {
	const results: GeneratedRuleResult[] = [];
	const seen = new Set<SupportedLanguage>();

	for (const language of config.techStack.languages) {
		if (language.name === "unknown") {
			continue;
		}

		if (seen.has(language.name)) {
			continue;
		}
		seen.add(language.name);

		const template = LANGUAGE_TEMPLATES[language.name];
		const targetPath = path.join(
			repoRoot,
			".prism",
			"rules",
			`code-standards-${template.slug}.md`
		);

		results.push(await writeRuleFile(targetPath, template, options));
	}

	return results;
};

async function writeRuleFile(
	targetPath: string,
	template: LanguageTemplate,
	options: GenerateOptions
): Promise<GeneratedRuleResult> {
	const exists = await pathExists(targetPath);
	if (exists && !options.force) {
		return {
			path: targetPath,
			written: false,
			reason: REASONS.exists,
		};
	}

	await fs.mkdir(path.dirname(targetPath), { recursive: true });
	await fs.writeFile(targetPath, renderRuleContent(template), "utf8");

	return {
		path: targetPath,
		written: true,
		reason: exists ? REASONS.forced : REASONS.created,
	};
}

function renderRuleContent(template: LanguageTemplate): string {
	const frontmatter = ["---", "load: paths", "paths:"]
		.concat(template.paths.map((glob) => `  - "${glob}"`))
		.concat(["---"])
		.join("\n");
	const heading = `# ${template.displayName} Code Standards`;
	return `${frontmatter}\n\n${heading}\n\n${template.applicability}\n\n${template.body.trimEnd()}\n`;
}

async function pathExists(targetPath: string): Promise<boolean> {
	try {
		await fs.access(targetPath);
		return true;
	} catch {
		return false;
	}
}

function typescriptBody(): string {
	return `## Types

- No \`any\`. When the type is genuinely unknown, use \`unknown\` and narrow before use.
- Prefer \`type\` aliases for unions and primitives; \`interface\` for object shapes that may be extended.
- Do not assert with \`as\` to silence the compiler — narrow with type guards or fix the source type.
- Use \`readonly\` on properties that should not be reassigned after construction.

## Imports

- Use named imports. Default imports only when the upstream module exports a default.
- Group imports: built-ins, third-party, internal — separated by blank lines.
- Do not introduce barrel files (\`index.ts\` re-exports) — they hide dependency graphs and slow tree-shaking.

## Functions

- Functions must start with a verb (\`checkPermission\`, \`filterItems\`).
- Boolean-returning functions use \`is\`/\`has\` prefix only for TypeScript type guards (\`x is SomeType\` return type).
- Async functions return a \`Promise<T>\`; do not mix \`Promise\` and \`async\` syntax in the same function.

## Null and undefined

- Prefer \`undefined\` for "not yet set"; reserve \`null\` for "intentionally absent" only when the consuming API requires it.
- Use optional chaining (\`?.\`) and nullish coalescing (\`??\`) over manual null checks.

## Error handling

- Throw \`Error\` (or subclasses); never throw strings.
- Catch the narrowest type you can act on; re-throw or wrap when the caller needs context.

## Tests

- Jest tests live next to the code they cover (\`foo.ts\` + \`foo.test.ts\`).
- One assertion per test when feasible — failures should name the broken behavior, not require detective work.
- Use \`describe\`/\`it\` to mirror the function shape under test.
`;
}

function javascriptBody(): string {
	return `## Modules

- Use ES modules (\`import\`/\`export\`); avoid \`require\` outside legacy entry points.
- Prefer named exports. Default exports only when the consumer convention requires it.

## Variables

- \`const\` by default; \`let\` when reassignment is required; never \`var\`.
- Do not reuse a single variable name for two semantic purposes within the same scope.

## Functions

- Functions must start with a verb (\`checkPermission\`, \`filterItems\`).
- Arrow functions for callbacks and one-liners; \`function\` declarations for top-level named exports so stack traces remain readable.

## Null and undefined

- Prefer \`undefined\` for "not yet set"; \`null\` only when an API requires it.
- Use optional chaining (\`?.\`) and nullish coalescing (\`??\`) over manual null checks.

## Error handling

- Throw \`Error\` instances (or subclasses); never throw strings.
- Catch as narrowly as you can act on; re-throw or wrap when the caller needs context.

## Tests

- Jest tests live next to the code they cover (\`foo.js\` + \`foo.test.js\`).
- One assertion per test when feasible.
`;
}

function phpBody(): string {
	return `## PHP version and types

- Declare strict types at the top of every file: \`declare(strict_types=1);\`.
- Type every method parameter and return value. Use union types and \`?Type\` nullables instead of untyped \`mixed\`.
- Prefer named arguments at call sites when the function has more than two parameters.

## Classes

- Class names are \`PascalCase\`; methods and properties are \`camelCase\`; constants are \`UPPER_SNAKE\`.
- Make properties \`private\` or \`protected\` by default; expose access only through methods.
- Use \`readonly\` on properties set once in the constructor.

## Functions and methods

- Methods must start with a verb (\`fetchOrder\`, \`assertPermitted\`).
- Boolean-returning methods may use \`is\`/\`has\` prefix.
- Avoid static methods unless the method is genuinely stateless and unrelated to instance state.

## Error handling

- Throw \`Throwable\` subclasses (typically \`Exception\` or \`RuntimeException\`); never throw strings or plain values.
- Catch the narrowest type you can act on. Do not swallow exceptions silently — log or rethrow.

## Tests

- Pest or PHPUnit tests live under \`tests/\` mirroring the \`src/\` tree.
- One behavior per test; group related tests with \`describe\` (Pest) or test class names (PHPUnit).
`;
}

function pythonBody(): string {
	return `## Style

- Follow PEP 8. Run \`black\` or \`ruff format\` before committing.
- Snake_case for functions and variables; PascalCase for classes; UPPER_SNAKE for module-level constants.
- Line length: 100 characters unless the project's formatter is configured otherwise.

## Type hints

- Type every function signature. Use \`from __future__ import annotations\` so forward references resolve cleanly.
- Use \`Optional[T]\` (or \`T | None\` on Python 3.10+) instead of \`Any\` for nullable values.
- Run \`mypy\` or \`pyright\` in CI; do not merge code with new type errors.

## Functions and methods

- Functions must start with a verb (\`fetch_order\`, \`validate_payload\`).
- Use keyword-only arguments (\`*\`, then params) for any function with more than two parameters.
- Prefer dataclasses or \`pydantic\` models over loose dicts for structured data.

## Error handling

- Raise \`Exception\` subclasses; never \`raise "string"\`.
- Catch the narrowest type you can act on. Bare \`except:\` is not allowed — at minimum, \`except Exception:\`.

## Tests

- Pytest tests live under \`tests/\` mirroring the package tree.
- One behavior per test. Use fixtures over setUp/tearDown class methods.
`;
}

function goBody(): string {
	return `## Style

- Run \`gofmt\` and \`goimports\` before committing. CI rejects unformatted code.
- Package names are lowercase, no underscores. File names are snake_case.
- Exported identifiers are PascalCase; unexported are camelCase.

## Error handling

- Return errors as the last value. Do not panic for recoverable errors.
- Wrap errors with \`fmt.Errorf("context: %w", err)\` to preserve the chain.
- Check every error at the call site; do not assign to \`_\` unless ignoring is intentional and commented.

## Concurrency

- Prefer channels for communication between goroutines, mutexes for shared state.
- Pass \`context.Context\` as the first parameter to any function that may block or be cancelled.
- Do not start a goroutine without a clear story for how it terminates.

## Tests

- Tests live next to the code they cover (\`foo.go\` + \`foo_test.go\`).
- Use table-driven tests when the same logic is exercised against many inputs.
`;
}

function rustBody(): string {
	return `## Style

- Run \`cargo fmt\` and \`cargo clippy\` before committing. CI rejects warnings.
- Module and function names are snake_case; types and traits are PascalCase; constants are UPPER_SNAKE.

## Ownership and borrowing

- Prefer borrowing (\`&T\`, \`&mut T\`) over ownership transfer unless the function takes ownership intentionally.
- Avoid \`clone()\` to silence the borrow checker — restructure the code instead.
- Lifetimes are explicit only when the compiler asks; do not annotate prophylactically.

## Error handling

- Use \`Result<T, E>\` for recoverable errors; \`panic!\` only for unrecoverable bugs (assertion failures, invariant breaks).
- The \`?\` operator is preferred over manual match-on-Err for propagation.
- Define crate-level error types with \`thiserror\` or hand-rolled enums; avoid \`Box<dyn Error>\` in public APIs.

## \`unwrap\` and \`expect\`

- \`unwrap()\` is acceptable in tests and example code; not in production paths.
- \`expect("message")\` documents the invariant the panic implies. Use it sparingly and only where the invariant is genuinely impossible to violate.

## Tests

- Unit tests live in the same file under \`#[cfg(test)] mod tests\`.
- Integration tests live in the \`tests/\` directory at crate root.
`;
}

function rubyBody(): string {
	return `## Style

- Follow the Ruby style guide (rubocop default config or your team's overrides).
- Method names and variables are snake_case; classes and modules are PascalCase; constants are UPPER_SNAKE.
- Two-space indent. No tabs.

## Methods

- Methods must start with a verb (\`fetch_order\`, \`validate_payload\`).
- Predicate methods end in \`?\` (\`active?\`, \`valid?\`); destructive methods end in \`!\` (\`save!\`, \`destroy!\`).
- Keep methods short — five lines is a soft ceiling; over fifteen is a code smell.

## Blocks

- Single-line blocks use \`{ }\`; multi-line blocks use \`do ... end\`.
- Prefer \`each\`, \`map\`, \`select\` over manual indexing.

## Error handling

- Raise \`StandardError\` subclasses; do not raise strings.
- \`rescue\` the narrowest class you can act on. Bare \`rescue\` is not allowed.

## Tests

- RSpec specs live under \`spec/\` mirroring the \`app/\` or \`lib/\` tree.
- One behavior per \`it\` block. Use \`let\` for fixtures.
`;
}

function elixirBody(): string {
	return `## Style

- Run \`mix format\` before committing. CI rejects unformatted code.
- Module names are PascalCase; functions and variables are snake_case.
- Use pipe operators (\`|>\`) when chaining three or more transformations.

## Functions

- Functions must start with a verb (\`fetch_order\`, \`validate_payload\`).
- Predicate functions end in \`?\` (\`active?\`); functions that raise end in \`!\` (\`save!\`).
- Pattern-match in the function head when possible; reserve \`case\`/\`cond\` for branching that can't be expressed in clauses.

## Error handling

- Return \`{:ok, result}\` / \`{:error, reason}\` tuples for recoverable errors.
- Raise exceptions only for unrecoverable bugs. Use the bang version (\`!\`) for functions that raise.

## Processes

- Use OTP behaviors (\`GenServer\`, \`Supervisor\`) instead of hand-rolled \`spawn\`.
- Every process has a supervisor; do not start unsupervised processes outside scripts.

## Tests

- ExUnit tests live under \`test/\` mirroring the \`lib/\` tree.
- Use \`describe\` to group related tests; one assertion per \`test\` when feasible.
`;
}

function javaBody(): string {
	return `## Style

- Follow Google Java Style or your team's overrides. Run the formatter before committing.
- Class names are PascalCase; methods and variables are camelCase; constants are UPPER_SNAKE.
- One public type per file; file name matches the type name.

## Methods

- Methods must start with a verb (\`fetchOrder\`, \`validatePayload\`).
- Boolean-returning methods may use \`is\`/\`has\` prefix.
- Prefer composition over inheritance; mark classes \`final\` unless designed for extension.

## Null handling

- Annotate nullable parameters and return types with \`@Nullable\`; non-null is the default.
- Prefer \`Optional<T>\` for return values that may be absent; do not return \`null\` from public APIs.

## Error handling

- Use checked exceptions for recoverable errors callers must handle; unchecked for programmer errors.
- Do not catch \`Throwable\` or \`Exception\` without a specific reason; catch the narrowest type you can act on.

## Tests

- JUnit tests live under \`src/test/java\` mirroring the \`src/main/java\` tree.
- One behavior per test method. Use \`@DisplayName\` for human-readable test labels.
`;
}
