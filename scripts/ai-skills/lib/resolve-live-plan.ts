/**
 * Resolves the live plan a branch owns: a ticket id parsed from the branch
 * name, then the lookup order in `hooks/plan/lookup.mjs` — a plan folder, a
 * flat plan, an epic folder, an epic flat plan, and a ticket-field scan, as
 * `.prism/rules/branch-plan.md` § Plan Lookup gives them. When
 * the branch carries no ticket-id-shaped token at all — a plan-first branch,
 * cut before Nora files a ticket per that same rule's step 5 — falls back to
 * matching an unfiled plan by filename slug instead of returning null.
 *
 * Shared by `spec-scope-lint.ts` and the queued plan-drift check so two
 * independent resolvers can't disagree about which plan a branch owns and
 * surface a lint firing on the wrong ticket.
 *
 * Never reads `.prism/archived/` — a frozen record must not resolve as a
 * branch's live plan.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { resolvePlan } from "../hooks/plan/lookup.mjs";

/** Matches a ticket-id token such as `prism-1234` or `thr-42` anywhere in a branch segment. */
const TICKET_ID_RE = /([a-z]+-\d+)/i;

/** Matches the `## Ticket` section heading and captures its first content line. */
const TICKET_SECTION_RE = /## Ticket\s*\r?\n+([^\r\n#]*)/i;

/** Matches a `## Ticket` field that reads as unfiled — empty, or opening with "none", "n/a", "tbd", or "unfiled". */
const UNFILED_TICKET_RE = /^\s*(?:none|n\/a|tbd|unfiled)\b/i;

/**
 * Extracts a lowercase ticket id (e.g. `prism-1234`) from a branch name, or
 * null when the branch carries no ticket-id-shaped token — a plan-less draft
 * branch, as this ticket's own branch is before Nora files it.
 *
 * Matches only within the branch name's final `/`-separated segment, per
 * `git-conventions.md` § Branch Naming's `<username>/prism-NNNN-<slug>`
 * shape. Matching the whole string would let a hyphenated username (e.g.
 * `dev-2` in `dev-2/prism-1234-fix-thing`) shadow the real ticket id, since
 * the regex takes the leftmost match.
 */
export function extractTicketId(branchName: string): string | null {
	const finalSegment = branchName.split("/").pop() ?? branchName;
	const match = finalSegment.match(TICKET_ID_RE);
	return match ? match[1].toLowerCase() : null;
}

/** Splits a hyphenated string into lowercase, non-empty tokens for token-run matching. */
function hyphenTokens(value: string): string[] {
	return value.toLowerCase().split("-").filter(Boolean);
}

/**
 * True when every token in `needle` appears somewhere in `haystack` — order
 * and adjacency are not required, because a branch name interleaves the plan
 * slug's words with its own descriptors (`thrive-port-opus5-rule-amendments`
 * carries the `opus5-port` slug reversed, and `opus5-lint-port-fix` carries it
 * split). Whole-token equality is what guards against false positives: a slug
 * token `log` never matches the branch token `catalog`, at any position. The
 * caller supplies the two guards that bound the looseness — a minimum of two
 * slug tokens, and failing closed when more than one plan matches.
 */
function containsAllTokens(haystack: string[], needle: string[]): boolean {
	return needle.length > 0 && needle.every((token) => haystack.includes(token));
}

/**
 * Fallback tier for a branch with no ticket-id-shaped token — a plan-first
 * branch, cut before Nora files a ticket per `branch-plan.md` § Plan Lookup
 * step 5. Scans `.prism/plans/*.md` for every plan whose `## Ticket` field
 * reads as unfiled and whose filename slug's tokens all appear in the
 * branch's final `/`-segment, requiring at least two hyphen-separated
 * tokens in the slug (a one-word slug is too coincidence-prone to trust).
 *
 * Returns every match rather than collapsing to a single winner — exported
 * separately from `resolveLivePlan` so a caller that needs to explain *why*
 * resolution failed (zero candidates vs. several, an ambiguity a plain
 * `null` can't distinguish) can inspect the full candidate list instead of
 * re-scanning the plans directory itself.
 */
export async function findUnfiledPlanCandidatesBySlug(
	branchName: string,
	repoRoot: string
): Promise<string[]> {
	const finalSegment = branchName.split("/").pop() ?? branchName;
	const branchTokens = hyphenTokens(finalSegment);

	const plansDir = path.join(repoRoot, ".prism", "plans");
	let entries: string[];

	try {
		entries = (await fs.readdir(plansDir)).filter((name) =>
			name.endsWith(".md")
		);
	} catch {
		return [];
	}

	const matches: string[] = [];

	for (const entry of entries.sort()) {
		const slugTokens = hyphenTokens(entry.slice(0, -".md".length));
		if (slugTokens.length < 2 || !containsAllTokens(branchTokens, slugTokens)) {
			continue;
		}

		const absPath = path.join(plansDir, entry);
		const content = await fs.readFile(absPath, "utf8");
		const sectionMatch = content.match(TICKET_SECTION_RE);
		const ticketField = sectionMatch ? sectionMatch[1].trim() : "";

		if (ticketField === "" || UNFILED_TICKET_RE.test(ticketField)) {
			matches.push(
				path.join(".prism", "plans", entry).split(path.sep).join("/")
			);
		}
	}

	return matches;
}

/**
 * Collapses `findUnfiledPlanCandidatesBySlug`'s candidate list to a single
 * winner, failing closed (null) on zero or multiple matches rather than
 * guessing between them — a silent wrong-plan resolution is worse than no
 * resolution, the same discipline the ticket-field scan in `lookup.mjs`
 * applies with its boundary-anchored match on the ticket-id-prefix-collision
 * case.
 */
async function findUnfiledPlanBySlug(
	branchName: string,
	repoRoot: string
): Promise<string | null> {
	const matches = await findUnfiledPlanCandidatesBySlug(branchName, repoRoot);
	return matches.length === 1 ? matches[0] : null;
}

/**
 * Resolves the live plan path a branch owns, or null when none resolves.
 * Returns a repo-root-relative POSIX path (e.g. `.prism/plans/prism-1234.md`).
 *
 * A plans directory that can't be read resolves as no plan, because
 * `resolvePlan` throws on it and `spec-scope-lint` passes a branch whose plan
 * is missing, so an unreadable directory ends that lint as a pass rather than
 * a crash.
 */
export async function resolveLivePlan(
	branchName: string,
	repoRoot: string
): Promise<string | null> {
	const ticketId = extractTicketId(branchName);
	if (!ticketId) {
		return findUnfiledPlanBySlug(branchName, repoRoot);
	}

	try {
		return resolvePlan(repoRoot, ticketId)?.file ?? null;
	} catch {
		return null;
	}
}
