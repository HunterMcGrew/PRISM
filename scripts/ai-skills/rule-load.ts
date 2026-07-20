/**
 * Parses and validates the `load:` frontmatter key that governs how a
 * canonical rule reaches each platform surface.
 *
 * `load: always` — Tier-1. Inlined into the AGENTS.md generated block and
 * copied to every platform's always-on rules surface (`.claude/rules/`,
 * `.cursor/rules/` with `alwaysApply: true`).
 * `load: paths` — Tier-2. Requires a `paths:` YAML list in the same
 * frontmatter block; the platform dialect governs how each surface reads it
 * (Cursor rewrites to `globs:`, Codex strips it).
 * `load: skill` — Tier-3. Never copied to any platform's always-on rules
 * surface and never inlined into AGENTS.md; the rule exists only under
 * `.prism/rules/` and loads when a skill cites it as an imperative trigger.
 *
 * A canonical rule missing `load:`, or carrying an unrecognized value, fails
 * the build — "always on" is an affirmative authoring decision, not an
 * inherited default. See ADR-0070 (amends ADR-0035's Tier discriminator).
 *
 * A consumer-owned rule that predates this mechanism may still have no
 * `load:` at all. `mode: "warn"` (used by `prism update`/`prism doctor`)
 * never throws on that case — it degrades to the pre-`load:` discriminator
 * (`paths:` present → `load: "paths"`; absent → `load: "always"`) and returns
 * a warning naming the file, the remedy, and the effective classification, so
 * nothing silently drops out of a consumer's context mid-upgrade and a
 * legacy path-scoped rule doesn't silently widen to always-on either (the
 * ratified legacy-rule default, amended per ADR-0070). `mode: "fail"` (used
 * by PRISM's own `pnpm prism:build`) throws instead, because every canonical
 * rule is expected to declare `load:` explicitly.
 *
 * Single-sourced here rather than duplicated per module: `agents-md-block.ts`,
 * `rule-dialect.ts`, and `build.ts` all need the same fail-vs-warn semantics,
 * and inconsistent validation between them would let a rule reach one
 * platform surface but not another for no declared reason.
 */
import fs from "node:fs/promises";
import path from "node:path";

export type RuleLoad = "always" | "paths" | "skill";

const VALID_LOADS: ReadonlySet<string> = new Set(["always", "paths", "skill"]);

/**
 * Splits a rule file into its frontmatter block (when present) and remaining
 * body.
 */
export function splitFrontmatter(content: string): {
	frontmatter: string | null;
	body: string;
} {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) {
		return { frontmatter: null, body: content };
	}

	return { frontmatter: match[1], body: match[2] };
}

export interface ParsedRuleLoad {
	load: RuleLoad;
	/** Non-null only in "warn" mode, when the declaration was missing or invalid. */
	warning: string | null;
}

/**
 * Parses the `load:` key from a rule's frontmatter and cross-checks it
 * against `paths:` presence (each requires the other). In `"fail"` mode
 * (the default), a missing or invalid declaration throws, naming `fileLabel`.
 * In `"warn"` mode, a missing/invalid declaration degrades to the pre-`load:`
 * discriminator (`paths:` present → `load: "paths"`, absent → `load:
 * "always"`); a present-but-mismatched declaration (e.g. `load: skill` with a
 * leftover `paths:` list) keeps the declared value. Either way the return
 * carries a `warning` string with the file name and the one-line remedy, so a
 * consumer-facing caller (`prism update`, `prism doctor`) never crashes on a
 * legacy rule.
 */
export function parseRuleLoad(
	content: string,
	fileLabel: string,
	mode: "fail" | "warn" = "fail"
): ParsedRuleLoad {
	const { frontmatter } = splitFrontmatter(content);
	const loadMatch = frontmatter?.match(/^load:\s*(\S+)\s*$/m);
	const loadValue = loadMatch?.[1];
	const hasPaths = frontmatter !== null && /^paths:/m.test(frontmatter);

	if (!loadValue || !VALID_LOADS.has(loadValue)) {
		const message = `${fileLabel}: missing or invalid \`load:\` frontmatter declaration — expected "always", "paths", or "skill". Add \`load: always\`, \`load: paths\`, or \`load: skill\` to the file's frontmatter.`;
		if (mode === "fail") {
			throw new Error(message);
		}

		const effectiveLoad: RuleLoad = hasPaths ? "paths" : "always";
		const scopingNote = hasPaths
			? ", preserving the pre-`load:` `paths:` scoping"
			: "";
		return {
			load: effectiveLoad,
			warning: `${message} Treated as \`load: ${effectiveLoad}\` for this run${scopingNote}.`,
		};
	}

	if (loadValue === "paths" && !hasPaths) {
		const message = `${fileLabel}: \`load: paths\` requires a \`paths:\` list in the same frontmatter block.`;
		if (mode === "fail") {
			throw new Error(message);
		}

		// No paths: list to scope by, so there is nothing to preserve — always-on
		// is the only sensible degrade here (unlike the mismatch branch below,
		// which has a declared value worth keeping).
		return {
			load: "always",
			warning: `${message} Treated as \`load: always\` for this run.`,
		};
	}

	if (loadValue !== "paths" && hasPaths) {
		const message = `${fileLabel}: \`paths:\` frontmatter is present but \`load:\` is "${loadValue}", not "paths". Set \`load: paths\`, or remove the \`paths:\` list.`;
		if (mode === "fail") {
			throw new Error(message);
		}

		return {
			load: loadValue as RuleLoad,
			warning: `${message} Treated as \`load: ${loadValue}\` for this run, honoring the explicit declaration over the leftover \`paths:\` list.`,
		};
	}

	return { load: loadValue as RuleLoad, warning: null };
}

/**
 * Walks every `*.md` in `rulesDir` and validates its `load:` declaration in
 * `"fail"` mode, throwing on the first invalid file. Used by `pnpm
 * prism:build` as an unconditional pre-copy gate — canonical rules are
 * validated before any platform copy is written, independent of whether
 * AGENTS.md exists (`collectTier1RuleBodies`'s own validation only fires when
 * AGENTS.md is present, which is not a strong enough guarantee for the
 * platform-copy path).
 */
export async function validateCanonicalRuleLoadDeclarations(
	rulesDir: string
): Promise<void> {
	const entries = await fs.readdir(rulesDir);
	const mdFiles = entries.filter((e) => e.endsWith(".md")).sort();

	for (const name of mdFiles) {
		const content = await fs.readFile(path.join(rulesDir, name), "utf8");
		parseRuleLoad(content, name, "fail");
	}
}

/**
 * Reads a rule file and reports whether it declares `load: skill`, using
 * `"warn"` mode so a missing declaration never throws (it degrades to the
 * pre-`load:` discriminator — `paths` or `always` — neither of which is
 * `skill`). Used by the platform-copy path to exclude Tier-3 rules from
 * every always-on platform surface while leaving them in place canonically.
 */
export async function isSkillLoadRuleFile(filePath: string): Promise<boolean> {
	const content = await fs.readFile(filePath, "utf8");
	const { load } = parseRuleLoad(content, path.basename(filePath), "warn");

	return load === "skill";
}
