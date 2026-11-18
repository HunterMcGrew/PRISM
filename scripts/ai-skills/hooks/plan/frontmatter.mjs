// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Reads and writes the leading `---` frontmatter block of a plan-chain file,
 * and the `## ` sections below it.
 *
 * Only `key: value` lines are parsed. The runtime carries no YAML package, and the
 * chain templates use nothing richer. The approval script and the approve
 * guard both read approval state through `approvalLines` and
 * `matchApprovalLine`, so the writer and the guard can never disagree on it.
 */

/** @typedef {"status" | "approved_by" | "approved_at"} ApprovalKey */

/** @type {ApprovalKey[]} */
const APPROVAL_KEYS = ["status", "approved_by", "approved_at"];

// Looser than the field parser on purpose: leading space, quotes around the
// key, and a different case all still count, so a near-miss spelling of an
// approval line reads as one rather than slipping past the guard.
const APPROVAL_LINE =
	/^\s*["']?(status|approved_by|approved_at)["']?\s*:(.*)$/i;
const FIELD_LINE = /^([A-Za-z_][\w-]*):(.*)$/;
const FENCE_LINE = /^(```|~~~)/;

/**
 * Matches a chain file path with forward slashes. Group 1 is the plan folder
 * and group 2 the stage. Case is ignored because macOS paths ignore it.
 */
export const CHAIN_FILE =
	/(?:^|\/)\.prism\/(?:archived\/)?plans\/([^/]+)\/(intent|design|spec|plan)\.md$/i;

/**
 * Returns the parsed block and its character range, or null when the text
 * does not open with a `---` line closed by a second `---` line.
 *
 * `start` is the offset of the first line inside the block and `end` the
 * offset of the closing `---`, so `text.slice(start, end)` is the block body.
 * A repeated key keeps its first value.
 *
 * @param {string} text
 * @returns {{ fields: Record<string, string>, start: number, end: number } | null}
 */
export function readFrontmatter(text) {
	if (typeof text !== "string" || !/^---\r?\n/.test(text)) return null;

	const start = text.indexOf("\n") + 1;
	const close = /^---\r?$/m;
	const rest = text.slice(start);
	const match = close.exec(rest);
	if (!match) return null;

	const end = start + match.index;
	/** @type {Record<string, string>} */
	const fields = {};
	for (const line of text.slice(start, end).split("\n")) {
		const field = FIELD_LINE.exec(line.replace(/\r$/, ""));
		if (field && !(field[1] in fields))
			fields[/** @type {string} */ (field[1])] = (field[2] ?? "").trim();
	}

	return { fields, start, end };
}

/**
 * Reads one line as an approval line. Returns `{ key, value }` with the key
 * lowercased and the value trimmed, or null.
 *
 * @param {string} line
 * @returns {{ key: ApprovalKey, value: string } | null}
 */
export function matchApprovalLine(line) {
	const match = APPROVAL_LINE.exec(String(line).replace(/\r$/, ""));

	return match
		? {
				key: /** @type {ApprovalKey} */ ((match[1] ?? "").toLowerCase()),
				value: (match[2] ?? "").trim(),
			}
		: null;
}

/**
 * Returns `{ status, approved_by, approved_at }` from the frontmatter block,
 * with `null` for a key that is absent or when there is no block.
 *
 * Every occurrence of a key counts, joined by newlines in file order, so a
 * second `status:` line added below the first changes the result.
 *
 * @param {string} text
 * @returns {Record<ApprovalKey, string | null>}
 */
export function approvalLines(text) {
	/** @type {Record<ApprovalKey, string | null>} */
	const result = { status: null, approved_by: null, approved_at: null };
	const block = readFrontmatter(text);
	if (!block) return result;

	/** @type {Record<ApprovalKey, string[]>} */
	const seen = { status: [], approved_by: [], approved_at: [] };
	for (const line of text.slice(block.start, block.end).split("\n")) {
		const approval = matchApprovalLine(line);
		if (approval) seen[approval.key]?.push(approval.value);
	}

	for (const key of APPROVAL_KEYS) {
		const values = seen[key];
		if (values.length > 0) result[key] = values.join("\n");
	}

	return result;
}

/**
 * Replaces the first `<key>:` line inside the frontmatter block with
 * `replacement` and leaves every other byte as it was. Text with no block, or
 * a block with no such line, comes back unchanged.
 *
 * @param {string} text
 * @param {string} key
 * @param {string} replacement
 * @returns {string}
 */
export function replaceFrontmatterLine(text, key, replacement) {
	const block = readFrontmatter(text);
	if (!block) return text;

	const pattern = new RegExp(`^${key}:[^\\r\\n]*`, "m");
	const body = text
		.slice(block.start, block.end)
		.replace(pattern, () => replacement);

	return text.slice(0, block.start) + body + text.slice(block.end);
}

/**
 * Replaces the `status:` line with `status: approved` plus the two approval
 * lines, and an `approved_via:` line when `via` is given. The caller has
 * already checked that the frontmatter holds exactly one `status: draft` line
 * and no approval lines.
 *
 * `approved_via` records how the person approved for the commit's reader. It
 * is not an approval line, so `approvalLines` and the guard ignore it.
 *
 * @param {string} text
 * @param {string} approver
 * @param {string} today
 * @param {string | null} [via]
 * @returns {string}
 */
export function stampApproval(text, approver, today, via = null) {
	const viaLine = via ? `\napproved_via: ${via}` : "";

	return replaceFrontmatterLine(
		text,
		"status",
		`status: approved\napproved_by: ${approver}\napproved_at: ${today}${viaLine}`
	);
}

/**
 * Formats a date as `YYYY-MM-DD` in the machine's local time zone.
 *
 * @param {Date} date
 * @returns {string}
 */
export function formatLocalDate(date) {
	/** @param {number} n */
	const pad = (n) => String(n).padStart(2, "0");

	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Returns the body under `## <heading>` with HTML comments removed and
 * whitespace trimmed, or null when the heading is absent.
 *
 * The body runs to the next `#` or `##` heading outside a fenced code block,
 * so a `# comment` line inside a fence never ends it. CRLF reads as LF.
 *
 * @param {string} text
 * @param {string} heading
 * @returns {string | null}
 */
export function sectionBody(text, heading) {
	const lines = text
		.replace(/\r\n/g, "\n")
		.replace(/<!--[\s\S]*?-->/g, "")
		.split("\n");
	const start = lines.findIndex((line) => line.trimEnd() === `## ${heading}`);
	if (start === -1) return null;

	/** @type {string[]} */
	const body = [];
	let inFence = false;
	for (const line of lines.slice(start + 1)) {
		if (FENCE_LINE.test(line)) inFence = !inFence;
		else if (!inFence && /^#{1,2} /.test(line)) break;

		body.push(line);
	}

	return body.join("\n").trim();
}
