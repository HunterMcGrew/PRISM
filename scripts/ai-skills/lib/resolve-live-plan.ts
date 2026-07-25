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

/** Matches a ticket-id token such as `prism-1234` or `thr-42` anywhere in a branch name. */
const TICKET_ID_RE = /([a-z]+-\d+)/i;

/** Matches the `## Ticket` section heading and captures its first content line. */
const TICKET_SECTION_RE = /## Ticket\s*\r?\n+([^\r\n#]*)/i;

/**
 * Extracts a lowercase ticket id (e.g. `prism-1234`) from a branch name, or
 * null when the branch carries no ticket-id-shaped token — a plan-less draft
 * branch, as this ticket's own branch is before Nora files it.
 */
export function extractTicketId(branchName: string): string | null {
	const match = branchName.match(TICKET_ID_RE);
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

	for (const entry of entries.sort()) {
		const absPath = path.join(plansDir, entry);
		const content = await fs.readFile(absPath, "utf8");
		const sectionMatch = content.match(TICKET_SECTION_RE);

		if (
			sectionMatch &&
			sectionMatch[1].toLowerCase().includes(ticketId)
		) {
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
