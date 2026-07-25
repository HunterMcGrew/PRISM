/**
 * Resolves the live plan a branch owns, per `.prism/rules/branch-plan.md`
 * § Plan Lookup: a ticket id parsed from the branch name, then `<id>.md`,
 * then `epic-<id>.md`, then a `## Ticket` field scan across every plan.
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
		return null;
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
