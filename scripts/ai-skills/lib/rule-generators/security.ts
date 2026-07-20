/**
 * Security rule generator (PR-2.3, plan task 3).
 *
 * Emits a single `.prism/rules/security.md` file composed of a universal
 * section plus per-stack sections gated on the detected languages and
 * frameworks. The universal section always emits — secret-scanning,
 * dependency hygiene, and input-validation discipline apply to every stack.
 * The per-stack sections are appended only when their gate fires.
 *
 * Carries `load: always` frontmatter (ADR-0070) — the security baseline
 * applies regardless of which file is being touched, so it is always-on by
 * default rather than path-scoped. This is the default Atlas proposes during
 * the question flow, not a silent final answer; see
 * `.prism/references/onboarding/question-flow.md` § Generated-rule load
 * confirmation.
 *
 * Skip-if-exists is the default posture (matches the code-standards
 * generator); `force: true` overwrites. Each section opens with its own
 * sub-applicability declaration so an agent reading the composed file can
 * scope correctly even when multiple language sections are present.
 */
import fs from "node:fs/promises";
import path from "node:path";

import type {
	DetectedFramework,
	DetectedLanguage,
} from "../stack-detect";
import {
	REASONS,
	type GenerateOptions,
	type GeneratedRuleResult,
	type RuleGenerator,
} from "./types";
import type { OnboardingConfig } from "../onboarding-types";

const FRONTMATTER = "---\nload: always\n---";
const HEADING = "# Security";
const APPLICABILITY =
	"These rules apply when writing or reviewing code that handles user input, secrets, authentication, authorization, or external data in this repository.";

/**
 * Generates `.prism/rules/security.md`. Returns a single-element array so
 * the caller sees the same shape as the code-standards generator.
 */
export const generate: RuleGenerator = async function generate(
	config: OnboardingConfig,
	repoRoot: string,
	options: GenerateOptions = {}
): Promise<GeneratedRuleResult[]> {
	const targetPath = path.join(repoRoot, ".prism", "rules", "security.md");

	const exists = await pathExists(targetPath);
	if (exists && !options.force) {
		return [
			{
				path: targetPath,
				written: false,
				reason: REASONS.exists,
			},
		];
	}

	const content = renderSecurityContent(
		config.techStack.languages,
		config.techStack.frameworks
	);

	await fs.mkdir(path.dirname(targetPath), { recursive: true });
	await fs.writeFile(targetPath, content, "utf8");

	return [
		{
			path: targetPath,
			written: true,
			reason: exists ? REASONS.forced : REASONS.created,
		},
	];
};

function renderSecurityContent(
	languages: DetectedLanguage[],
	frameworks: DetectedFramework[]
): string {
	const langNames = new Set(languages.map((l) => l.name));
	const fwNames = new Set(frameworks.map((f) => f.name));

	const sections: string[] = [
		FRONTMATTER,
		"",
		HEADING,
		"",
		APPLICABILITY,
		"",
		universalSection(),
	];

	if (langNames.has("typescript") || langNames.has("javascript")) {
		sections.push("", typescriptJavascriptSection());
	}

	if (langNames.has("php")) {
		sections.push("", phpSection(fwNames.has("wordpress")));
	}

	if (fwNames.has("django")) {
		sections.push("", djangoSection());
	}

	if (langNames.has("go")) {
		sections.push("", goSection());
	}

	if (langNames.has("rust")) {
		sections.push("", rustSection());
	}

	if (fwNames.has("rails")) {
		sections.push("", railsSection());
	}

	return `${sections.join("\n").trimEnd()}\n`;
}

async function pathExists(targetPath: string): Promise<boolean> {
	try {
		await fs.access(targetPath);
		return true;
	} catch {
		return false;
	}
}

function universalSection(): string {
	return `## Universal

Applies to all code regardless of stack.

### Secrets

- Never commit secrets — API keys, tokens, private keys, database passwords. Use environment variables, a secrets manager, or your platform's equivalent.
- Pre-commit hooks should scan for high-entropy strings (\`gitleaks\`, \`detect-secrets\`, or equivalent). Failing the scan blocks the commit.
- Treat \`.env\` files as untracked. Commit \`.env.example\` with placeholders so contributors know which variables the app needs.
- Rotate any secret that appears in git history. Revocation is the only fix — rewriting history doesn't help if the value was already pushed.

### Dependencies

- Pin direct dependencies to known-good versions; let the lockfile track transitives.
- Run a vulnerability scanner in CI (Dependabot, Snyk, \`npm audit\`, \`composer audit\`, \`cargo audit\`, \`pip-audit\`). Treat high/critical findings as merge blockers.
- Review new dependencies before adding — supply-chain attacks ride in transitives. Prefer well-maintained packages with active maintainers.

### Input validation

- Validate every input at the trust boundary — request handlers, message consumers, file readers, CLI arguments.
- Do not trust client-side validation alone. The server must re-validate before any state change.
- Parameterize all queries against external systems (SQL, search indexes, shell commands). String concatenation into a query is the canonical injection bug.

### Logging

- Do not log secrets, session tokens, PII, or payment details. Redact at the logging boundary, not at the call site.
- Log the security-relevant action (login attempt, permission denial, secret rotation), not the secret itself.
`;
}

function typescriptJavascriptSection(): string {
	return `## TypeScript and JavaScript

### DOM injection

- Never assemble HTML by string concatenation with user input. Use the DOM API (\`textContent\`, \`createElement\`, \`setAttribute\`) — these escape automatically.
- \`innerHTML\`, \`outerHTML\`, and \`document.write\` accept HTML strings. Treat any user-controlled value flowing into them as an XSS bug until proven otherwise.
- React's \`dangerouslySetInnerHTML\` is the framework escape hatch — use it only with content that has been explicitly sanitized (\`DOMPurify\` or equivalent), and document the sanitization in a JSDoc above the call.

### Prototype pollution

- Do not deep-merge untrusted objects into application objects without filtering \`__proto__\`, \`constructor\`, and \`prototype\` keys.
- Prefer \`Object.create(null)\` for maps that take user-supplied keys; the resulting object has no prototype chain to pollute.

### Server-side handling

- Validate request bodies and query strings against a schema (\`zod\`, \`yup\`, \`io-ts\`) before passing the values into business logic.
- Set \`HttpOnly; Secure; SameSite\` on every session cookie. \`SameSite=Lax\` is the safe default; \`Strict\` for high-value sessions.
- Use a CSP header. Even a permissive policy is better than none; tighten over time.

### Dependencies

- \`npm audit\` / \`pnpm audit\` in CI on every PR. Treat high/critical as merge blockers.
- Avoid \`eval\`, \`Function(...)\`, \`setTimeout("string", ...)\` — every form of dynamic code execution is a CSP-bypass surface.
`;
}

function phpSection(hasWordPress: boolean): string {
	const wpContent = hasWordPress
		? `\n### WordPress-specific

- Verify nonces on every state-changing request (\`wp_verify_nonce\`, \`check_admin_referer\`, \`check_ajax_referer\`).
- Gate every admin action behind a capability check (\`current_user_can(...)\`) before any database write or filesystem mutation.
- Escape every output with the function matching the context: \`esc_html\` for text, \`esc_attr\` for HTML attributes, \`esc_url\` for URLs, \`esc_js\` for inline JavaScript, \`wp_kses\` or \`wp_kses_post\` when limited HTML is allowed.
- Use \`$wpdb->prepare()\` for every SQL query with user input. Never concatenate values into the SQL string — \`prepare()\` parameterizes them safely.
- Sanitize input on the way in (\`sanitize_text_field\`, \`sanitize_email\`, \`absint\`) and escape on the way out (the \`esc_*\` family).
`
		: "";

	return `## PHP

### Output escaping

- Escape every value rendered into HTML, attributes, URLs, or JavaScript contexts. Match the escape function to the context — escaping for HTML does not protect a JavaScript context.
- Treat database content as untrusted output. A value safe to store is not automatically safe to render.

### SQL

- Use parameterized queries — PDO with bound parameters, or your ORM's parameter binding. String concatenation into SQL is the canonical injection bug.
- The query string is constant code; the values are parameters. Never invert that relationship.

### File operations

- Validate file paths against a whitelist of allowed directories before reading or writing. \`realpath\` + prefix check is the minimum.
- Never pass user input to \`include\`, \`require\`, \`eval\`, or \`exec\` family functions.${wpContent}`;
}

function djangoSection(): string {
	return `## Django

### CSRF

- Keep \`django.middleware.csrf.CsrfViewMiddleware\` enabled. Do not disable it on a per-view basis without an explicit, reviewed reason.
- POST forms include \`{% csrf_token %}\`; AJAX requests send the token in the \`X-CSRFToken\` header.

### Templates

- Auto-escape is on by default. Do not pass user content through \`mark_safe\` or the \`|safe\` filter without an explicit sanitization step. Document the sanitization at the call site.
- \`{% autoescape off %}\` blocks are a code smell — restrict their scope to the smallest possible region.

### ORM

- The ORM parameterizes queries by default. \`.extra(where=...)\` and \`.raw(...)\` accept SQL strings — pass values via the \`params\` argument, never via f-string concatenation.

### Authentication

- Use Django's built-in auth (\`django.contrib.auth\`) — \`User\`, \`PermissionRequiredMixin\`, \`login_required\`. Hand-rolled auth is rarely correct.
- Sessions and password storage use Django's defaults; do not downgrade the hasher or the session backend without security review.

### Settings

- \`DEBUG = False\` in production. Debug responses leak settings, tracebacks, and source paths.
- \`ALLOWED_HOSTS\` is set to the canonical hostnames; do not use \`['*']\` outside local development.
- \`SECURE_SSL_REDIRECT\`, \`SESSION_COOKIE_SECURE\`, \`CSRF_COOKIE_SECURE\` all \`True\` in production.
`;
}

function goSection(): string {
	return `## Go

### Templates

- Use \`html/template\` for rendering HTML; \`text/template\` does not escape and is unsafe for user-facing output.
- Context-aware escaping is automatic in \`html/template\` — do not bypass it with \`template.HTML\` unless the value is sanitized.

### SQL

- Use parameter placeholders (\`?\` or \`$1\` depending on driver). Never \`fmt.Sprintf\` values into a query string.
- Prefer a query builder or sqlc-generated code over hand-rolled \`db.Exec\` calls when the query takes user input.

### Crypto

- Use the standard library's \`crypto/*\` packages. Do not roll your own primitives.
- For password hashing, use \`bcrypt\`, \`argon2\`, or \`scrypt\` from \`golang.org/x/crypto\` — never plain SHA or MD5.
- Use \`crypto/rand\` (not \`math/rand\`) for any randomness used in security contexts (tokens, session IDs, nonces).

### Concurrency

- Race conditions are security bugs when they touch authorization checks. Run \`go test -race\` in CI.
- Pass \`context.Context\` through every request-scoped call so cancellation and timeouts work end-to-end.
`;
}

function rustSection(): string {
	return `## Rust

### Unsafe

- Every \`unsafe\` block needs a comment explaining the invariant the surrounding code maintains. Reviewers should read \`unsafe\` blocks line by line.
- Prefer safe abstractions in \`std\` or well-maintained crates over hand-rolled \`unsafe\`.

### \`unwrap\` and \`expect\`

- \`unwrap()\` panics on \`None\`/\`Err\` — fine in tests, never in production request paths. A panic in a request handler is at minimum a DoS bug.
- \`expect("invariant message")\` documents the assertion. Use it only where the invariant is genuinely impossible to violate; prefer \`?\` or explicit match-on-Err elsewhere.

### Deserialization

- \`serde\` derives the deserialization shape from the type. Validate semantic constraints (length, range, format) after deserialization — \`serde\` checks types, not values.
- Reject unknown fields by deriving with \`#[serde(deny_unknown_fields)]\` on types that accept external input; the default silently ignores extras.

### Dependencies

- \`cargo audit\` in CI on every PR. Treat advisories as merge blockers.
- Vet new crates before adding. Prefer crates with multiple maintainers and recent activity.
`;
}

function railsSection(): string {
	return `## Rails

### Mass assignment

- Use \`strong_parameters\` (\`.permit\`) on every controller action that updates a model. Never pass raw \`params\` to \`update\`, \`create\`, or assignment helpers.
- Permit only the attributes the action is supposed to change. A permitted but unintended attribute is the canonical mass-assignment bug.

### CSRF

- \`protect_from_forgery\` is on by default. Do not disable it on a per-action basis without an explicit reviewed reason.
- AJAX requests include the CSRF token from the meta tag; Rails' UJS handles this automatically when included.

### Output escaping

- Rails escapes \`<%= %>\` output by default. \`<%== %>\` and \`.html_safe\` bypass escaping — use only with sanitized content. Document the sanitization at the call site.
- \`sanitize\` permits an allowlist of tags; \`raw\` does not. Prefer \`sanitize\` when limited HTML is needed.

### ActiveRecord

- The query interface parameterizes by default. \`where("...#{user_input}...")\` is the canonical injection bug — use \`where("name = ?", user_input)\` or hash-form \`where(name: user_input)\`.
- \`find_by_sql\` and \`execute\` accept raw SQL — pass values via the parameters argument, not via interpolation.

### Sessions and cookies

- Use Rails' default cookie store with a long secret key base. \`Secure\`, \`HttpOnly\`, and \`SameSite=Lax\` are the defaults to keep.
- Rotate the secret key base if it leaks; rotating it invalidates all sessions and signed cookies.
`;
}
