// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Resolves a ticket ID to its plan: a plan folder first, then a flat plan, in
 * the order `.prism/rules/branch-plan.md` § Plan Lookup gives.
 *
 * Every function is synchronous, so a hook can call it without awaiting. The
 * live lookup and the archive lookup are separate functions on purpose: a
 * frozen record under `.prism/archived/plans/` must never resolve as a live
 * plan, and no caller can mistake one for the other.
 */
import fs from "node:fs";
import path from "node:path";

import { readFrontmatter } from "./frontmatter.mjs";

export const CHAIN_FILES = ["intent.md", "design.md", "spec.md", "plan.md"];

const LIVE_ROOT = ".prism/plans";
const ARCHIVE_ROOT = ".prism/archived/plans";
const TICKET_ID_RE = /^[a-z][a-z0-9]*-\d+$/i;
const TICKET_SECTION_RE = /## Ticket\s*\r?\n+([^\r\n#]*)/i;

// Latest stage first, because every caller reads one file's text and the
// furthest-along file holds the most current state.
const LATEST_STAGE_FIRST = ["plan.md", "spec.md", "design.md", "intent.md"];

/**
 * @typedef {object} PlanMatch
 * @property {"folder" | "flat" | "epic-folder" | "epic-flat"} kind
 * @property {string | null} dir The plan folder, or null for a flat plan.
 * @property {string} file The file a caller reads, repo-relative with forward slashes.
 */

/**
 * Finds the live plan for `ticketId` under `<repoRoot>/.prism/plans/`.
 *
 * A folder counts as a plan only when it holds a chain file as a regular
 * file, because `plans/` also holds folders that are not plans. A folder
 * resolves to its latest-stage file. Returns null when nothing matches,
 * including when `plans/` is missing. Never reads `.prism/archived/`.
 *
 * @param {string} repoRoot
 * @param {string} ticketId
 * @returns {PlanMatch | null}
 */
export function resolvePlan(repoRoot, ticketId) {
	return resolveIn(repoRoot, LIVE_ROOT, ticketId);
}

/**
 * Finds the archived plan for `ticketId` under
 * `<repoRoot>/.prism/archived/plans/`, by the same rules as `resolvePlan`.
 *
 * @param {string} repoRoot
 * @param {string} ticketId
 * @returns {PlanMatch | null}
 */
export function findArchivedPlan(repoRoot, ticketId) {
	return resolveIn(repoRoot, ARCHIVE_ROOT, ticketId);
}

/**
 * @param {string} repoRoot
 * @param {string} root Repo-relative plans root.
 * @param {string} ticketId
 * @returns {PlanMatch | null}
 */
function resolveIn(repoRoot, root, ticketId) {
	if (!TICKET_ID_RE.test(ticketId)) {
		throw new TypeError(`not a ticket ID: ${ticketId}`);
	}

	const id = ticketId.toLowerCase();
	const absoluteRoot = path.join(repoRoot, ...root.split("/"));

	return (
		findByName(absoluteRoot, root, id) ??
		findByTicketField(absoluteRoot, root, id)
	);
}

/**
 * @param {string} absoluteRoot
 * @param {string} root
 * @param {string} id
 * @returns {PlanMatch | null}
 */
function findByName(absoluteRoot, root, id) {
	return (
		folderMatch(absoluteRoot, root, id, "folder") ??
		flatMatch(absoluteRoot, root, `${id}.md`, "flat") ??
		folderMatch(absoluteRoot, root, `epic-${id}`, "epic-folder") ??
		flatMatch(absoluteRoot, root, `epic-${id}.md`, "epic-flat")
	);
}

/**
 * Scans the root's direct entries, sorted, for a folder whose chain-file
 * `ticket:` frontmatter names `id`, or a flat file whose `## Ticket` line
 * does. A name starting with `epic-` gives the epic kind.
 *
 * @param {string} absoluteRoot
 * @param {string} root
 * @param {string} id
 * @returns {PlanMatch | null}
 */
function findByTicketField(absoluteRoot, root, id) {
	const idRe = new RegExp(`(?:^|[^a-z0-9])${id}(?:[^a-z0-9]|$)`, "i");

	for (const entry of readEntries(absoluteRoot)) {
		const isEpic = entry.name.startsWith("epic-");

		if (entry.isDirectory()) {
			const dir = path.join(absoluteRoot, entry.name);
			const tickets = CHAIN_FILES.filter((name) =>
				isFile(path.join(dir, name))
			).map((name) =>
				readFrontmatterTicket(fs.readFileSync(path.join(dir, name), "utf8"))
			);

			if (tickets.some((ticket) => idRe.test(ticket))) {
				return folderMatch(
					absoluteRoot,
					root,
					entry.name,
					isEpic ? "epic-folder" : "folder"
				);
			}
		} else if (entry.isFile() && entry.name.endsWith(".md")) {
			const text = fs.readFileSync(path.join(absoluteRoot, entry.name), "utf8");
			const ticketLine = TICKET_SECTION_RE.exec(text)?.[1] ?? "";

			if (idRe.test(ticketLine)) {
				return flatMatch(
					absoluteRoot,
					root,
					entry.name,
					isEpic ? "epic-flat" : "flat"
				);
			}
		}
	}

	return null;
}

/**
 * @param {string} absoluteRoot
 * @param {string} root
 * @param {string} name
 * @param {"folder" | "epic-folder"} kind
 * @returns {PlanMatch | null}
 */
function folderMatch(absoluteRoot, root, name, kind) {
	const dir = path.join(absoluteRoot, name);
	const latest = LATEST_STAGE_FIRST.find((file) => isFile(path.join(dir, file)));

	return latest
		? { kind, dir: `${root}/${name}`, file: `${root}/${name}/${latest}` }
		: null;
}

/**
 * @param {string} absoluteRoot
 * @param {string} root
 * @param {string} name
 * @param {"flat" | "epic-flat"} kind
 * @returns {PlanMatch | null}
 */
function flatMatch(absoluteRoot, root, name, kind) {
	return isFile(path.join(absoluteRoot, name))
		? { kind, dir: null, file: `${root}/${name}` }
		: null;
}

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function isFile(filePath) {
	try {
		return fs.statSync(filePath).isFile();
	} catch (error) {
		if (isAbsent(error)) {
			return false;
		}

		throw error;
	}
}

/**
 * @param {string} dir
 * @returns {fs.Dirent[]}
 */
function readEntries(dir) {
	try {
		return fs
			.readdirSync(dir, { withFileTypes: true })
			.sort((a, b) => a.name.localeCompare(b.name));
	} catch (error) {
		if (isAbsent(error)) {
			return [];
		}

		throw error;
	}
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isAbsent(error) {
	const code = /** @type {NodeJS.ErrnoException} */ (error).code;

	return code === "ENOENT" || code === "ENOTDIR";
}

/**
 * @param {string} text
 * @returns {string}
 */
function readFrontmatterTicket(text) {
	return readFrontmatter(text)?.fields["ticket"] ?? "";
}
