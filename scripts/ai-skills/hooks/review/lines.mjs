// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Reads the review record lines under a plan's `## Review` section.
 *
 * `record.mjs` writes `- review round <n> at <sha>[ (part <k> of <m>)]: <verdict>`,
 * and older plans also hold `self-review` and `pr-review` lines and `confirm`
 * lines in the same shape, per `REVIEW.md`. This module is the one reader of
 * that grammar, so every script that judges a review sees the same lines.
 */
import { sectionBody } from "../plan/frontmatter.mjs";

const RECORD_LINE =
	/^\s*-\s*((?:self-|pr-)?review (?:round (\d+)|confirm) at ([^\s:]+)(?: \(part (\d+) of (\d+)\))?:\s*(.*?))\s*$/;

/**
 * @typedef {{
 *   kind: "round" | "confirm",
 *   round: number | null,
 *   sha: string,
 *   part: { k: number, m: number } | null,
 *   verdict: string,
 *   line: string,
 * }} ReviewLine
 */

/**
 * Returns every record line under `## Review`, in file order.
 *
 * A line that does not match the grammar is skipped rather than reported, so
 * prose or notes in the section never break a reader. `round` is null on a
 * `confirm` line, and `line` is the record text without its leading dash.
 *
 * @param {string} text
 * @returns {ReviewLine[]}
 */
export function readReviewLines(text) {
	const body = sectionBody(text, "Review");
	if (body === null) return [];

	/** @type {ReviewLine[]} */
	const entries = [];
	for (const raw of body.split("\n")) {
		const match = RECORD_LINE.exec(raw);
		if (!match) continue;

		const [, line, round, sha, k, m, verdict] = match;
		entries.push({
			kind: round === undefined ? "confirm" : "round",
			round: round === undefined ? null : Number(round),
			sha: /** @type {string} */ (sha),
			part: k === undefined || m === undefined ? null : { k: Number(k), m: Number(m) },
			verdict: /** @type {string} */ (verdict),
			line: /** @type {string} */ (line),
		});
	}

	return entries;
}
