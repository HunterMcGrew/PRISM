/**
 * Framework-guidelines rule generator (PR-2.3, plan task 4).
 *
 * Emits one `.prism/rules/<framework>-guidelines.md` per detected framework
 * — React, Next.js, Vue, WordPress, Django, Rails at v1. Each generated file
 * opens with an applicability declaration per ADR-0029 so the agent scopes
 * the rules itself; skills do not reference these files by name.
 *
 * Every generated file carries `load: always` frontmatter (ADR-0070) — a
 * detected framework is, in practice, the single framework the whole repo is
 * built on, so path-scoping it the way `code-standards.ts` scopes a language
 * would under-load it on every session that doesn't happen to touch a
 * matching glob. This is the default Atlas proposes during the question
 * flow, not a silent final answer; see
 * `.prism/references/onboarding/question-flow.md` § Generated-rule load
 * confirmation.
 *
 * Skip-if-exists posture and `force: true` override match the
 * code-standards generator. Frameworks not in `FRAMEWORK_TEMPLATES` are
 * silently ignored — Atlas's stack detection can surface frameworks (e.g.
 * Phoenix, Express) before this generator has a template for them, and that
 * is a normal state, not an error.
 */
import fs from "node:fs/promises";
import path from "node:path";

import {
	REASONS,
	type GenerateOptions,
	type GeneratedRuleResult,
	type RuleGenerator,
} from "./types";
import type { OnboardingConfig } from "../onboarding-types";

interface FrameworkTemplate {
	slug: string;
	displayName: string;
	applicability: string;
	body: string;
}

const FRAMEWORK_TEMPLATES: Record<string, FrameworkTemplate> = {
	react: {
		slug: "react",
		displayName: "React",
		applicability:
			"These rules apply when writing or reviewing React components, hooks, or context in this repository.",
		body: reactBody(),
	},
	next: {
		slug: "next",
		displayName: "Next.js",
		applicability:
			"These rules apply when writing or reviewing Next.js routes, layouts, server components, client components, or route handlers in this repository.",
		body: nextBody(),
	},
	vue: {
		slug: "vue",
		displayName: "Vue",
		applicability:
			"These rules apply when writing or reviewing Vue components, composables, or stores in this repository.",
		body: vueBody(),
	},
	wordpress: {
		slug: "wordpress",
		displayName: "WordPress",
		applicability:
			"These rules apply when writing or reviewing WordPress plugins, themes, blocks, or hook callbacks in this repository.",
		body: wordpressBody(),
	},
	django: {
		slug: "django",
		displayName: "Django",
		applicability:
			"These rules apply when writing or reviewing Django views, models, templates, or middleware in this repository.",
		body: djangoBody(),
	},
	rails: {
		slug: "rails",
		displayName: "Rails",
		applicability:
			"These rules apply when writing or reviewing Rails controllers, models, views, or background jobs in this repository.",
		body: railsBody(),
	},
};

/**
 * Generates one rule file per detected framework that has a template. The
 * iteration order matches the order frameworks appear in `DetectedStack`
 * — which is confidence-sorted, so the highest-signal framework's rule
 * lands first on disk. Order only matters for reporting; the files
 * themselves are independent.
 */
export const generate: RuleGenerator = async function generate(
	config: OnboardingConfig,
	repoRoot: string,
	options: GenerateOptions = {}
): Promise<GeneratedRuleResult[]> {
	const results: GeneratedRuleResult[] = [];
	const seen = new Set<string>();

	for (const framework of config.techStack.frameworks) {
		if (seen.has(framework.name)) {
			continue;
		}
		seen.add(framework.name);

		const template = FRAMEWORK_TEMPLATES[framework.name];
		if (!template) {
			continue;
		}

		const targetPath = path.join(
			repoRoot,
			".prism",
			"rules",
			`${template.slug}-guidelines.md`
		);

		results.push(await writeRuleFile(targetPath, template, options));
	}

	return results;
};

async function writeRuleFile(
	targetPath: string,
	template: FrameworkTemplate,
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

function renderRuleContent(template: FrameworkTemplate): string {
	const heading = `# ${template.displayName} Guidelines`;
	return `---\nload: always\n---\n\n${heading}\n\n${template.applicability}\n\n${template.body.trimEnd()}\n`;
}

async function pathExists(targetPath: string): Promise<boolean> {
	try {
		await fs.access(targetPath);
		return true;
	} catch {
		return false;
	}
}

function reactBody(): string {
	return `## Components

- Function components only. Class components are legacy and should not be added.
- One component per file. The file name matches the component name (\`UserCard.tsx\` exports \`UserCard\`).
- Components receive props as a typed object; do not destructure-and-rest at the boundary unless the rest props are forwarded to a DOM element.
- Avoid prop drilling beyond two levels. Reach for context, a query hook, or a state library at the third level.

## Props decoupling

- A component's props should describe what the component renders, not the shape of upstream data. Map upstream models to props at the call site, not inside the component.
- Do not pass entire domain objects when the component needs three fields. Pass the three fields.

## Hooks

- Hooks are called at the top level of a component or another hook — never inside conditionals, loops, or after early returns.
- Custom hooks start with \`use\` (\`useUserProfile\`, \`useDebouncedValue\`).
- The \`useEffect\` dependency array lists every value from component scope the effect reads. Disabling the exhaustive-deps lint is a code smell — restructure the effect instead.

## State

- Local state lives in \`useState\` or \`useReducer\`; cross-cutting state belongs in a query library (TanStack Query, SWR) or a store (Zustand, Redux Toolkit).
- Derived state is computed at render, not stored. \`useMemo\` is for expensive computations, not for storing what a re-render would re-derive cheaply.

## Lists and keys

- The \`key\` prop on list items is a stable identifier from the data, never the array index when items can be inserted, removed, or reordered.
`;
}

function nextBody(): string {
	return `## Server vs client components

- App Router components are server components by default. Mark a component \`'use client'\` only when it uses state, effects, browser APIs, or React context.
- Push \`'use client'\` as far down the tree as possible. A small leaf client component beats a large client-rooted subtree.
- Server components fetch data directly with \`fetch\` or by calling a server-only library; client components fetch through a query hook or a route handler.

## Data fetching

- \`fetch\` in server components is cached by default. Set \`cache: 'no-store'\` for per-request freshness; \`next: { revalidate: N }\` for time-based revalidation; \`next: { tags: [...] }\` for tag-based invalidation.
- Co-locate the \`fetch\` with the component that needs the data. Hoisting data to a parent for the sake of "data layer purity" defeats streaming and parallel rendering.

## Route handlers

- Route handlers (\`route.ts\` files) accept \`Request\` and return \`Response\`. Validate request bodies against a schema before any state change.
- Use the correct HTTP verbs — POST for create, PUT/PATCH for update, DELETE for delete, GET only for read.
- Route handlers run on the server; do not import client-only modules from them.

## Layouts and pages

- Layouts wrap pages and persist across navigation; they re-mount only when the segment they own re-mounts. Do not put data fetching in a layout that should refresh on navigation.
- Loading and error UIs (\`loading.tsx\`, \`error.tsx\`) are colocated with the segment they bound. Use them — they're how Next.js delivers streaming and graceful failure.

## Images and metadata

- Use \`next/image\` for every image; provide a meaningful \`alt\` (or \`alt=""\` for decorative).
- Use the metadata API (\`export const metadata\` or \`generateMetadata\`) for SEO; do not hand-roll \`<head>\` tags in components.
`;
}

function vueBody(): string {
	return `## Composition API

- Use \`<script setup>\` for component bodies. Options API is legacy and should not be added.
- Reactivity comes from \`ref\` (primitive cells) and \`reactive\` (object containers). Pick one model per file and stick to it.
- Computed properties (\`computed(() => ...)\`) are derived values; do not store derived state in a \`ref\` you update from a watcher.

## Props and emits

- Define props with \`defineProps<T>()\` (TypeScript) or \`defineProps({ ... })\` (runtime). Mark required props as required; default optional props.
- Use \`defineEmits<{ ... }>()\` to type the event surface. A component without typed emits is harder to refactor safely.
- Do not mutate props inside the component. The parent owns the prop; the child emits an event when it wants the value changed.

## Composables

- Composables are functions named \`useX\` that encapsulate reactive logic. They return refs and computeds for the calling component to consume.
- A composable should be testable in isolation. Avoid composables that reach into a global store or singleton without an injection seam.

## Templates

- One root element per template (Vue 3 supports fragments, but a single root keeps the component shape predictable).
- \`v-for\` requires a \`:key\` that is stable across renders — never the array index for lists that change.
- Avoid logic in templates. Move conditionals and transformations to \`computed\` or \`script setup\` body.

## Stores

- Pinia is the default store library. Each store is a function returning state, getters, and actions.
- Stores live under \`stores/\`; one store per file.
`;
}

function wordpressBody(): string {
	return `## Hook usage

- Use the correct hook for the lifecycle moment. Init-time work belongs on \`init\` or \`plugins_loaded\`; admin-only work on \`admin_init\` or \`admin_menu\`; output filtering on the named filter (\`the_content\`, \`get_the_excerpt\`, etc.).
- Specify priority and arg count explicitly when adding actions/filters. The defaults (10, 1) are easy to forget when the callback expects more args.
- \`remove_action\`/\`remove_filter\` must use the exact same callback reference and priority that \`add_action\`/\`add_filter\` used. Anonymous functions are unremovable; name them when you need to remove later.

## Capability checks

- Gate every admin action behind \`current_user_can(...)\` with the most specific capability that fits the action.
- Do not check \`is_admin()\` as a security boundary — it only tells you whether the request hits the admin UI, not whether the caller has permission.

## Nonces

- Every state-changing request (form submit, AJAX action, REST mutation) verifies a nonce.
- Generate nonces with \`wp_create_nonce(action)\` and verify with \`wp_verify_nonce\`, \`check_admin_referer\`, or \`check_ajax_referer\` against the same action string.

## Database

- Use \`$wpdb->prepare()\` for every query with user input. Use the correct placeholder (\`%s\`, \`%d\`, \`%f\`) for each value.
- Prefer the WordPress query APIs (\`WP_Query\`, \`get_posts\`, \`get_users\`) over raw SQL when the data shape fits.

## Block development

- Blocks register on \`init\` via \`register_block_type\`. Pass the \`block.json\` path; do not hand-roll the registration array.
- Server-rendered blocks return their HTML from a \`render_callback\`; static blocks save HTML in \`save\`. Mixing the two patterns leads to validation errors.
- Block attributes are typed in \`block.json\`. Add new attributes to the schema before the JavaScript that reads them.

## Output escaping

- Escape every value rendered into HTML with the function matching the context (\`esc_html\`, \`esc_attr\`, \`esc_url\`, \`esc_js\`, \`wp_kses\`).
- Database content is untrusted output. Escape on the way out, regardless of where the value came from.
`;
}

function djangoBody(): string {
	return `## Views

- Prefer class-based views (\`ListView\`, \`DetailView\`, \`FormView\`) for standard CRUD; function-based views when the logic doesn't fit a class-based mixin chain cleanly.
- Keep view logic thin. Business logic lives in models, managers, or service modules — not in the view body.
- Validate input via a form (\`forms.Form\`) or serializer (\`rest_framework.serializers\`) before passing values to the model layer.

## Models

- Define \`Meta.ordering\` on every model that's queried without an explicit \`order_by\` — implicit ordering is non-deterministic across databases.
- Use \`db_index=True\` on fields that appear in \`filter\` / \`order_by\` regularly. Profile before adding indexes speculatively.
- Custom managers (\`objects = MyManager()\`) hold reusable query logic. Do not put query helpers as class methods on the model itself when a manager is the right home.

## ORM queries

- \`select_related\` for forward foreign keys and one-to-ones; \`prefetch_related\` for reverse and many-to-many. Use them to defeat N+1 query patterns at the view boundary.
- \`.only(...)\` and \`.defer(...)\` restrict columns when the queryset doesn't need the full row.
- Avoid \`.extra()\` and \`.raw()\` unless the ORM genuinely can't express the query. When you must use them, parameterize with \`params=\` — never f-string interpolation.

## Templates

- Auto-escape is on by default. \`mark_safe\` and the \`|safe\` filter bypass escaping — use only with sanitized content, and document the sanitization at the call site.
- \`{% include %}\` and \`{% extends %}\` are the composition primitives. Avoid duplicating template fragments — extract to a partial.

## Migrations

- Every schema change has a migration. Never edit a migration that's been applied to a shared environment; create a new migration instead.
- Data migrations (\`RunPython\`) are reversible (\`reverse_code\` defined) so a rollback can run cleanly.

## Settings

- Settings split by environment via a settings package (\`settings/base.py\`, \`settings/dev.py\`, \`settings/prod.py\`) or environment variables read by a single settings module.
- Sensitive values (\`SECRET_KEY\`, database credentials, third-party API keys) come from environment variables — never committed to source control.
`;
}

function railsBody(): string {
	return `## Controllers

- Skinny controllers. The action method validates input, calls a model or service, and renders. Business logic does not live here.
- Use \`strong_parameters\` on every action that updates a model. Permit only the attributes the action is supposed to change.
- Filter responses by what the action returns. Do not return the full model when the client needs three fields.

## Models

- ActiveRecord models hold persistence, validations, scopes, and tightly-related instance methods. Cross-model orchestration belongs in service objects under \`app/services/\`.
- Validations enforce data invariants (\`presence\`, \`uniqueness\`, format). Business rules that depend on context belong in the calling code, not in the model.
- Callbacks (\`after_save\`, \`before_destroy\`) are seductive but easy to abuse. If a callback reaches outside the model (sends an email, calls an API, writes to a different model), move that logic to a service.

## ActiveRecord queries

- Use the query interface (\`where\`, \`joins\`, \`includes\`, \`order\`) — it parameterizes safely.
- \`where("name = ?", user_input)\` or \`where(name: user_input)\` — never \`where("name = '#{user_input}'")\`. The hash form is preferred when it fits.
- \`includes\` for eager loading when iterating an association; \`joins\` when you need the SQL join without loading the associated rows.

## Views

- Rails escapes \`<%= %>\` by default. \`<%== %>\` and \`.html_safe\` bypass escaping — use only with sanitized content.
- Partials (\`_partial.html.erb\`) are the composition primitive. Use \`render partial:\` with a local variables hash; avoid setting instance variables in partials.
- Helpers (\`app/helpers/\`) hold view-specific formatting. Business logic does not belong here.

## Background jobs

- Use ActiveJob with a queue backend (Sidekiq, GoodJob). Job classes inherit \`ApplicationJob\` and define \`#perform\`.
- Jobs receive primitive arguments (IDs, strings, hashes) — not ActiveRecord objects. Pass the ID and load the record inside \`#perform\`.
- Idempotency matters. A job that runs twice should produce the same result as running once; design for at-least-once delivery.

## Routes

- Resource routes (\`resources :posts\`) over individual route declarations. Customize with \`only:\`/\`except:\` and named member/collection routes.
- Nested resources go one level deep. Beyond that, flatten with a top-level route and a controller filter.
`;
}
