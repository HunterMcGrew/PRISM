/**
 * Resolves the live plan a branch owns, per `.prism/rules/branch-plan.md`
 * § Plan Lookup: a ticket id parsed from the branch name, then `<id>.md`,
 * then `epic-<id>.md`, then a `## Ticket` field scan across every plan. When
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

import { pathExists } from "../utils";

/** Matches a ticket-id token such as `prism-1234` or `thr-42` anywhere in a branch segment. */
const TICKET_ID_RE = /([a-z]+-\d+)/i;

/** Matches the `## Ticket` section heading and captures its first content line. */
const TICKET_SECTION_RE = /## Ticket\s*\r?\n+([^\r\n#]*)/i;

/** Matches a `## Ticket` field that reads as unfiled — empty, or opening with "none", "n/a", "tbd", or "unfiled". */
const UNFILED_TICKET_RE = /^\s*(?:none|n\/a|tbd|unfiled)\b/i;

/** Escapes regex metacharacters so a ticket id can be dropped into a pattern literally. */
function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds a boundary-anchored, case-insensitive matcher for `ticketId` — true
 * only when `ticketId` appears as a whole token, not as a substring of a
 * longer ticket id (e.g. `prism-100` must not match inside `prism-1005`).
 * Mirrors the anchoring discipline `extractTicketId` already applies to the
 * branch-name side of this same lookup.
 */
function ticketIdBoundaryPattern(ticketId: string): RegExp {
	return new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(ticketId)}(?:[^a-z0-9]|$)`, "i");
}

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
 * True when `needle`'s tokens appear as a contiguous, in-order run inside
 * `haystack`'s tokens — e.g. `["review", "loop", "self", "audit"]` inside
 * `["prism", "review", "loop", "self", "audit"]`. Token-boundary matching
 * avoids the false positives a raw substring check would allow (a slug
 * `log` must not match inside a branch segment `catalog`).
 */
function containsTokenRun(haystack: string[], needle: string[]): boolean {
	if (needle.length === 0 || needle.length > haystack.length) {
		return false;
	}

	for (let start = 0; start <= haystack.length - needle.length; start++) {
		if (needle.every((token, offset) => haystack[start + offset] === token)) {
			return true;
		}
	}

	return false;
}

/**
 * Fallback tier for a branch with no ticket-id-shaped token — a plan-first
 * branch, cut before Nora files a ticket per `branch-plan.md` § Plan Lookup
 * step 5. Scans `.prism/plans/*.md` for every plan whose `## Ticket` field
 * reads as unfiled and whose filename slug appears as a contiguous token run
 * in the branch's final `/`-segment, requiring at least two hyphen-separated
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
		if (slugTokens.length < 2 || !containsTokenRun(branchTokens, slugTokens)) {
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
 * resolution, the same discipline `findPlanByTicketField`'s
 * boundary-anchored match already applies to the ticket-id-prefix-collision
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
 * Scans every plan directly under `.prism/plans/` (the directory carries no
 * subdirectories) for a `## Ticket` field whose content names `ticketId`.
 * Returns the first match's repo-root-relative POSIX path, or null.
 */
async function findPlanByTicketField(
	repoRoot: string,
	ticketId: string
): Promise<string | null> {
	const plansDir = path.join(repoRoot, ".prism", "plans");
	let entries: string[];

	try {
		entries = (await fs.readdir(plansDir)).filter((name) =>
			name.endsWith(".md")
		);
	} catch {
		return null;
	}

	const boundaryPattern = ticketIdBoundaryPattern(ticketId);

	for (const entry of entries.sort()) {
		const absPath = path.join(plansDir, entry);
		const content = await fs.readFile(absPath, "utf8");
		const sectionMatch = content.match(TICKET_SECTION_RE);

		if (sectionMatch && boundaryPattern.test(sectionMatch[1])) {
			return path
				.join(".prism", "plans", entry)
				.split(path.sep)
				.join("/");
		}
	}

	return null;
}

/**
 * Resolves the live plan path a branch owns, or null when none resolves.
 * Returns a repo-root-relative POSIX path (e.g. `.prism/plans/prism-1234.md`).
 */
export async function resolveLivePlan(
	branchName: string,
	repoRoot: string
): Promise<string | null> {
	const ticketId = extractTicketId(branchName);
	if (!ticketId) {
		return findUnfiledPlanBySlug(branchName, repoRoot);
	}

	const directPath = path.join(".prism", "plans", `${ticketId}.md`);
	if (await pathExists(path.join(repoRoot, directPath))) {
		return directPath.split(path.sep).join("/");
	}

	const epicPath = path.join(".prism", "plans", `epic-${ticketId}.md`);
	if (await pathExists(path.join(repoRoot, epicPath))) {
		return epicPath.split(path.sep).join("/");
	}

	return findPlanByTicketField(repoRoot, ticketId);
}
