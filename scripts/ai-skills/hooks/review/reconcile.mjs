// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Reconciles a PR after an agent review run:
 * `node <hook-runtime>/review/reconcile.mjs <pr> [--log <path>] [--no-write] [--classes] [--json]`.
 *
 * It replies to and resolves the agent's own threads whose lines changed,
 * holding back a thread where a person has the last word. It corrects the
 * review labels against the summary comment's `prism-verdict` line, and
 * reports what is still unclean: threads that need a reply, human comments
 * not yet in the review-misses log, required PR body headings that are
 * missing, log lines that don't parse, and a PR with more than 100 review
 * threads, which it doesn't page through. It exits 0 only when nothing is
 * unclean. `--json` prints the findings as one object instead of the report,
 * with the same exit code, so a hook can read them without parsing prose.
 * Every GitHub read and write goes through `gh api`, so it runs on the host
 * where `gh` is authenticated.
 *
 * A marked comment from any non-bot login reads as an agent's when comments
 * are classified, so another dev's agent is neither a miss nor owed a reply.
 * Every write also needs the login `gh api user` returns, so anyone else
 * pasting the marker can't get a thread resolved or the labels changed.
 *
 * The log at `.prism/metrics/review-misses.jsonl` is append-only JSON lines.
 * A miss row is `{"pr","reviewer","file","summary","class","nearest_pass",
 * "comment","logged_at"}`, where `comment` is the human comment's `html_url`
 * and is what marks that comment as logged. A resolve row is
 * `{"class","resolved","fix"}`. A missing log reads as empty, and the first
 * appended row creates it, so the file is never committed empty.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AGENT_MARKER = "<!-- prism-agent -->";
const SUMMARY_MARKER = "<!-- code-review-pr-summary -->";
const VERDICT_LINE =
	/<!--\s*prism-verdict:\s*state=(\S+)\s+effort=(\S+)\s+confidence=(\S+)\s*-->/;
const GRAPHQL_BLOCKED =
	"GitHub GraphQL is not available from Claude Code sessions";
const REVIEW_LABELS = new Set([
	"effort:glance",
	"effort:quick",
	"effort:deep",
	"confidence:high",
	"confidence:needs-judgment",
	"confidence:standards-only",
	"review:has-minors",
]);
const OPTIONAL_SECTION = /Delete this section|Skip this section/i;
const EXCERPT_LENGTH = 200;
const OPEN_CLASS_THRESHOLD = 3;
const ADDRESSED_REPLY = /^addressed in \S+/m;
const DEFAULT_TEMPLATE = ".prism/templates/pr-description.md";
const DEFAULT_LOG = ".prism/metrics/review-misses.jsonl";
const THREADS_QUERY = `query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      reviewThreads(first: 100) {
        pageInfo { hasNextPage }
        nodes { id isResolved isOutdated path comments(first: 100) { nodes { databaseId } } }
      }
    }
  }
}`;
const RESOLVE_MUTATION = `mutation($id: ID!) {
  resolveReviewThread(input: { threadId: $id }) { thread { isResolved } }
}`;

/**
 * @typedef {{ login?: string, type?: string }} User
 * @typedef {{
 *   id?: number,
 *   user?: User,
 *   body?: string | null,
 *   path?: string | null,
 *   html_url?: string,
 *   original_commit_id?: string,
 * }} Comment
 * @typedef {{
 *   id?: string | null,
 *   resolved: boolean,
 *   outdated?: boolean,
 *   path?: string | null,
 *   comments: Comment[],
 * }} Thread
 * @typedef {{
 *   user: { login: string },
 *   body?: string | null,
 *   head?: { sha: string },
 *   labels?: { name: string }[],
 * }} Pull
 * @typedef {{ class?: unknown, resolved?: unknown, nearest_pass?: unknown, comment?: unknown }} LogRow
 * @typedef {{ line: number, error: string }} BadLine
 * @typedef {{
 *   needsReply: Thread[],
 *   unlogged: Comment[],
 *   missingHeadings: string[],
 *   badLines: BadLine[],
 *   failures: string[],
 *   unchecked: string[],
 * }} Findings
 * @typedef {(args: string[]) => any} Gh
 * @typedef {(args: string[]) => string} Git
 */

/**
 * Runs one reconcile pass over a PR and returns `{ code, lines, findings,
 * actions }`, where `code` is the exit code and `lines` is the report.
 *
 * `gh(args)` runs `gh api <args>` and returns parsed JSON, or throws
 * `{ status, body }`. `git(args)` returns git's stdout. Both are parameters so
 * tests pass fakes over recorded fixtures. `agentLogin` is the login the agent
 * posts as. With `write` false, every POST, PATCH, and DELETE is skipped and
 * reported as what it would do. `templatePath` defaults to the PR description
 * template under the repo's top level, which `git` locates.
 *
 * @param {{
 *   pr: number,
 *   repo: string,
 *   gh: Gh,
 *   git: Git,
 *   agentLogin: string,
 *   logPath: string,
 *   templatePath?: string,
 *   write?: boolean,
 * }} input
 * @returns {{ code: number, findings: Findings, actions: string[], lines: string[] }}
 */
export function reconcile({
	pr,
	repo,
	gh,
	git,
	agentLogin,
	logPath,
	templatePath,
	write = true,
}) {
	if (!agentLogin) throw new Error("reconcile needs the agent's login");

	const base = `repos/${repo}`;
	/** @type {Pull & { head: { sha: string } }} */
	const pull = gh([`${base}/pulls/${pr}`]);
	/** @type {Comment[]} */
	const issueComments = readPages(gh, `${base}/issues/${pr}/comments`);
	/** @type {Comment[]} */
	const reviewComments = readPages(gh, `${base}/pulls/${pr}/comments`);
	/** @type {Comment[]} */
	const reviews = readPages(gh, `${base}/pulls/${pr}/reviews`).filter(
		(/** @type {Comment} */ review) => (review.body ?? "").trim() !== ""
	);
	const { threads, source, truncated } = readThreads({
		gh,
		repo,
		pr,
		reviewComments,
	});
	const template =
		templatePath ??
		path.join(git(["rev-parse", "--show-toplevel"]).trim(), DEFAULT_TEMPLATE);

	/** @type {Findings} */
	const findings = {
		needsReply: threads.filter(
			(thread) =>
				needsReply(thread, pull) || awaitsAnswerToPerson(thread, agentLogin)
		),
		unlogged: [],
		missingHeadings: missingHeadings(
			pull.body ?? "",
			readFileSync(template, "utf8")
		),
		badLines: [],
		failures: [],
		unchecked: truncated ? ["more than 100 threads; not checked"] : [],
	};
	/** @type {string[]} */
	const actions = [];
	/**
	 * @param {string} description
	 * @param {string[]} args
	 */
	const run = (description, args) => {
		if (!write) {
			actions.push(`would ${description}`);
			return;
		}

		try {
			gh(args);
			actions.push(description);
		} catch (error) {
			findings.failures.push(`${description}: ${errorText(error)}`);
		}
	};

	for (const thread of threads.filter((t) => ownAddressed(t, agentLogin))) {
		const opening = /** @type {Comment} */ (thread.comments[0]);
		// An earlier run whose resolve failed already posted the reply.
		const alreadyReplied = thread.comments
			.slice(1)
			.some(
				(comment) =>
					isAgent(comment, agentLogin) &&
					ADDRESSED_REPLY.test(comment.body ?? "")
			);
		if (!alreadyReplied) {
			const sha = addressedSha(git, opening, thread.path, pull.head.sha);
			run(`reply "addressed in ${sha}" on ${opening.html_url}`, [
				"-X",
				"POST",
				`${base}/pulls/${pr}/comments/${opening.id}/replies`,
				"-f",
				`body=${AGENT_MARKER}\naddressed in ${sha}`,
			]);
		}

		run(
			`resolve the thread at ${opening.html_url}`,
			source === "graphql"
				? [
						"graphql",
						"-f",
						`query=${RESOLVE_MUTATION}`,
						"-f",
						`id=${thread.id}`,
					]
				: [
						"-X",
						"POST",
						`${base}/pulls/${pr}/ccr/comments/${opening.id}/resolve`,
					]
		);
	}

	const labelPlan = planLabels(issueComments, pull.labels ?? [], agentLogin);
	actions.push(labelPlan.note);
	for (const label of labelPlan.remove) {
		run(`remove label ${label}`, [
			"-X",
			"DELETE",
			`${base}/issues/${pr}/labels/${label}`,
		]);
	}

	if (labelPlan.add.length > 0) {
		run(`add labels ${labelPlan.add.join(", ")}`, [
			"-X",
			"POST",
			`${base}/issues/${pr}/labels`,
			...labelPlan.add.flatMap((label) => ["-f", `labels[]=${label}`]),
		]);
	}

	const log = readLog(logPath);
	findings.badLines = log.badLines;
	const logged = new Set(log.rows.map((row) => row.comment).filter(Boolean));
	findings.unlogged = [...issueComments, ...reviewComments, ...reviews].filter(
		(comment) => isHuman(comment, pull) && !logged.has(comment.html_url)
	);

	const uncleanCount =
		findings.needsReply.length +
		findings.unlogged.length +
		findings.missingHeadings.length +
		findings.badLines.length +
		findings.failures.length +
		findings.unchecked.length;
	const code = uncleanCount === 0 ? 0 : 1;

	return {
		code,
		findings,
		actions,
		lines: formatReport({
			pr,
			repo,
			code,
			findings,
			actions,
			classes: existingClasses(log.rows),
		}),
	};
}

// --- Marker logic ---

/**
 * True for a marked comment from this runner's own login, the gate on every
 * write: a thread resolve, a reply check, and the summary the labels follow.
 *
 * @param {Comment} comment
 * @param {string} agentLogin
 * @returns {boolean}
 */
export function isAgent(comment, agentLogin) {
	return readsAsAgent(comment) && comment.user?.login === agentLogin;
}

/**
 * True for a marked comment from any non-bot login, which is how comments are
 * classified. Another dev's agent posts under that dev's login, and its
 * comments are neither misses nor threads that need a reply.
 *
 * @param {Comment} comment
 * @returns {boolean}
 */
export function readsAsAgent(comment) {
	return (comment.body ?? "").includes(AGENT_MARKER) && !isBot(comment);
}

/**
 * @param {Comment} comment
 * @returns {boolean}
 */
export function isBot(comment) {
	const login = comment.user?.login ?? "";

	return comment.user?.type === "Bot" || login.endsWith("[bot]");
}

/**
 * @param {Comment} comment
 * @param {Pull} pull
 * @returns {boolean}
 */
export function isAuthorNote(comment, pull) {
	return !readsAsAgent(comment) && comment.user?.login === pull.user.login;
}

/**
 * @param {Comment} comment
 * @param {Pull} pull
 * @returns {boolean}
 */
export function isHuman(comment, pull) {
	return (
		!readsAsAgent(comment) && !isBot(comment) && !isAuthorNote(comment, pull)
	);
}

/**
 * True when an unresolved thread was opened by anyone but an agent or the PR
 * author, bots included, and no agent comment follows the opening one.
 *
 * @param {Thread} thread
 * @param {Pull} pull
 * @returns {boolean}
 */
export function needsReply(thread, pull) {
	const [opening, ...later] = thread.comments;
	if (thread.resolved || !opening) return false;
	if (readsAsAgent(opening) || isAuthorNote(opening, pull)) return false;

	return !later.some((comment) => readsAsAgent(comment));
}

/**
 * True for an unresolved agent thread whose lines changed in a later commit,
 * unless a person has the last word in it.
 *
 * GitHub marks a thread outdated when its commented lines change, and that
 * flag is the one signal both the GraphQL and the `ccr/` thread routes return.
 * A person's reply may say the change didn't fix it, so the thread stays open
 * and needs a reply while it `awaitsAnswerToPerson`, and resolves once an
 * agent answers them.
 *
 * @param {Thread} thread
 * @param {string} agentLogin
 * @returns {boolean}
 */
export function ownAddressed(thread, agentLogin) {
	const opening = thread.comments[0];

	return Boolean(
		opening &&
		isAgent(opening, agentLogin) &&
		!thread.resolved &&
		thread.outdated &&
		!awaitsAnswerToPerson(thread, agentLogin)
	);
}

/**
 * True for an unresolved agent thread whose latest non-bot comment is a
 * person's, whether or not its lines changed. Such a thread needs a reply,
 * and `ownAddressed` holds it back from resolving.
 *
 * @param {Thread} thread
 * @param {string} agentLogin
 * @returns {boolean}
 */
function awaitsAnswerToPerson(thread, agentLogin) {
	const [opening, ...later] = thread.comments;
	if (!opening || !isAgent(opening, agentLogin)) return false;
	if (thread.resolved) return false;

	const last = later.filter((comment) => !isBot(comment)).at(-1);

	return Boolean(last && !readsAsAgent(last));
}

// --- Labels ---

/**
 * Returns `{ remove, add, note }` for the closed review-label set, read
 * against the verdict line in the agent's latest summary comment. No other
 * label is touched.
 *
 * @param {Comment[]} issueComments
 * @param {{ name: string }[]} labels
 * @param {string} agentLogin
 * @returns {{ remove: string[], add: string[], note: string }}
 */
export function planLabels(issueComments, labels, agentLogin) {
	const summary = issueComments
		.filter(
			(comment) =>
				isAgent(comment, agentLogin) &&
				(comment.body ?? "").includes(SUMMARY_MARKER)
		)
		.at(-1);
	const verdict = summary ? VERDICT_LINE.exec(summary.body ?? "") : null;
	if (!verdict) {
		return { remove: [], add: [], note: "labels left alone: no verdict line" };
	}

	const [line, state = "", effort = "", confidence = ""] = verdict;
	const expected = expectedLabels(state, effort, confidence);
	if (!expected) {
		return {
			remove: [],
			add: [],
			note: `labels left alone: unreadable verdict line ${line}`,
		};
	}

	const current = labels.map((label) => label.name);

	return {
		remove: current.filter(
			(name) => REVIEW_LABELS.has(name) && !expected.includes(name)
		),
		add: expected.filter((name) => !current.includes(name)),
		note: `labels checked against verdict state=${state}`,
	};
}

/**
 * @param {string} state
 * @param {string} effort
 * @param {string} confidence
 * @returns {string[] | null}
 */
function expectedLabels(state, effort, confidence) {
	if (state === "1") return [];

	/** @type {string[] | null} */
	let expected = null;
	if (state === "2") expected = [`effort:${effort}`, "review:has-minors"];
	if (state === "3")
		expected = [`effort:${effort}`, `confidence:${confidence}`];
	if (!expected || !expected.every((name) => REVIEW_LABELS.has(name))) {
		return null;
	}

	return expected;
}

// --- PR body ---

/**
 * Returns the template's required `## ` headings that the body lacks.
 *
 * The template body starts after its `---` divider. A section is optional
 * when its placeholder says "Delete this section" or "Skip this section".
 *
 * @param {string} body
 * @param {string} template
 * @returns {string[]}
 */
export function missingHeadings(body, template) {
	const lines = template.split("\n");
	/** @type {{ heading: string, text: string }[]} */
	const sections = [];
	for (const line of lines.slice(lines.indexOf("---") + 1)) {
		if (line.startsWith("## ")) {
			sections.push({ heading: line.trimEnd(), text: "" });
		} else if (sections.length > 0) {
			/** @type {{ text: string }} */ (sections.at(-1)).text += `${line}\n`;
		}
	}

	const present = new Set(body.split(/\r?\n/).map((line) => line.trim()));

	return sections
		.filter((section) => !OPTIONAL_SECTION.test(section.text))
		.map((section) => section.heading)
		.filter((heading) => !present.has(heading));
}

// --- Review-misses log ---

/**
 * Reads the log as JSON lines. A missing file reads as empty. Each line that
 * doesn't parse to an object comes back in `badLines` with its line number.
 *
 * @param {string} logPath
 * @returns {{ rows: LogRow[], badLines: BadLine[] }}
 */
export function readLog(logPath) {
	if (!existsSync(logPath)) return { rows: [], badLines: [] };

	/** @type {LogRow[]} */
	const rows = [];
	/** @type {BadLine[]} */
	const badLines = [];
	readFileSync(logPath, "utf8")
		.split("\n")
		.forEach((line, index) => {
			if (line.trim() === "") return;

			try {
				const row = JSON.parse(line);
				if (row === null || typeof row !== "object" || Array.isArray(row)) {
					throw new Error("not a JSON object");
				}

				rows.push(row);
			} catch (error) {
				badLines.push({ line: index + 1, error: errorText(error) });
			}
		});

	return { rows, badLines };
}

/**
 * Groups miss rows by normalized class and returns the classes with at least
 * three rows and no resolve row, each with its count and `nearest_pass` values.
 *
 * @param {LogRow[]} rows
 * @returns {{ class: string, count: number, passes: string[] }[]}
 */
export function openClasses(rows) {
	const resolved = new Set(
		rows.filter((row) => row.resolved).map((row) => normalizeClass(row.class))
	);
	/** @type {Map<string, { class: string, count: number, passes: Set<string> }>} */
	const groups = new Map();
	for (const row of rows.filter(isMissRow)) {
		const key = normalizeClass(row.class);
		const group = groups.get(key) ?? {
			class: key,
			count: 0,
			passes: new Set(),
		};
		group.count += 1;
		group.passes.add(String(row.nearest_pass ?? "none"));
		groups.set(key, group);
	}

	return [...groups.values()]
		.filter(
			(group) =>
				group.count >= OPEN_CLASS_THRESHOLD && !resolved.has(group.class)
		)
		.map((group) => ({ ...group, passes: [...group.passes].sort() }))
		.sort((a, b) => b.count - a.count || a.class.localeCompare(b.class));
}

/**
 * @param {LogRow[]} rows
 * @returns {string[]}
 */
function existingClasses(rows) {
	/** @type {Map<string, string>} */
	const seen = new Map();
	for (const row of rows.filter(isMissRow)) {
		const key = normalizeClass(row.class);
		if (!seen.has(key)) seen.set(key, String(row.class).trim());
	}

	return [...seen.values()].sort();
}

/**
 * @param {LogRow} row
 * @returns {boolean}
 */
function isMissRow(row) {
	return (
		!row.resolved && typeof row.class === "string" && row.class.trim() !== ""
	);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeClass(value) {
	return String(value ?? "")
		.trim()
		.toLowerCase();
}

// --- GitHub reads ---

/**
 * @param {Gh} gh
 * @param {string} route
 * @returns {any[]}
 */
function readPages(gh, route) {
	return gh(["--paginate", "--slurp", route]).flat();
}

/**
 * Returns `{ threads, source, truncated }`, each thread normalized to `{ id,
 * resolved, outdated, path, comments }` with its review comments in order.
 * `truncated` is true when GraphQL says more than the first 100 threads exist.
 *
 * Reads GraphQL first. A 403 carrying the cloud-session message switches to
 * the `ccr/` thread route, which returns comment IDs to join by.
 *
 * @param {{ gh: Gh, repo: string, pr: number, reviewComments: Comment[] }} input
 * @returns {{ threads: Thread[], source: "graphql" | "ccr", truncated: boolean }}
 */
function readThreads({ gh, repo, pr, reviewComments }) {
	const byId = new Map(reviewComments.map((comment) => [comment.id, comment]));
	/**
	 * @param {number[]} ids
	 * @returns {Comment[]}
	 */
	const join = (ids) =>
		ids
			.map((id) => byId.get(id))
			.filter((/** @type {Comment | undefined} */ c) => c !== undefined);
	const [owner, name] = repo.split("/");

	try {
		const response = gh([
			"graphql",
			"-f",
			`query=${THREADS_QUERY}`,
			"-f",
			`owner=${owner}`,
			"-f",
			`name=${name}`,
			"-F",
			`number=${pr}`,
		]);
		const { nodes, pageInfo } =
			response.data.repository.pullRequest.reviewThreads;

		return {
			source: "graphql",
			truncated: pageInfo?.hasNextPage === true,
			threads: nodes.map(
				(/** @type {any} */ node) => ({
					id: node.id,
					resolved: node.isResolved,
					outdated: node.isOutdated,
					path: node.path,
					comments: join(
						node.comments.nodes.map((/** @type {any} */ c) => c.databaseId)
					),
				})
			),
		};
	} catch (error) {
		if (!errorText(error).includes(GRAPHQL_BLOCKED)) throw error;
	}

	const threads = gh([`repos/${repo}/pulls/${pr}/ccr/review_threads`]);

	return {
		source: "ccr",
		truncated: false,
		threads: threads.map((/** @type {any} */ thread) => ({
			id: null,
			resolved: thread.resolved,
			outdated: thread.outdated,
			path: thread.path,
			comments: join(thread.comment_ids),
		})),
	};
}

/**
 * Returns the oldest commit after the comment's commit that touched its file,
 * or the PR head when git can't answer.
 *
 * @param {Git} git
 * @param {Comment} opening
 * @param {string | null | undefined} filePath
 * @param {string} headSha
 * @returns {string}
 */
function addressedSha(git, opening, filePath, headSha) {
	try {
		const output = git([
			"log",
			"--format=%H",
			"--reverse",
			`${opening.original_commit_id}..${headSha}`,
			"--",
			filePath ?? "",
		]);

		return (output.split("\n")[0] ?? "").trim() || headSha;
	} catch {
		return headSha;
	}
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function errorText(error) {
	if (error && typeof error === "object" && "body" in error) {
		return String(error.body);
	}

	return String(
		error && typeof error === "object" && "message" in error
			? error.message
			: error
	);
}

// --- Report ---

/**
 * @param {{ pr: number, repo: string, code: number, findings: Findings, actions: string[], classes: string[] }} input
 * @returns {string[]}
 */
function formatReport({ pr, repo, code, findings, actions, classes }) {
	const lines = [
		`reconcile ${repo}#${pr}: ${code === 0 ? "clean" : "unclean"}`,
	];
	/**
	 * @param {string} title
	 * @param {string[]} items
	 */
	const addSection = (title, items) => {
		if (items.length === 0) return;

		lines.push(
			"",
			`${title} (${items.length}):`,
			...items.map((item) => `- ${item}`)
		);
	};

	addSection(
		"Threads needing a reply",
		findings.needsReply.map((thread) => {
			const opening = /** @type {Comment} */ (thread.comments[0]);

			return `${opening.html_url} by ${opening.user?.login} on ${thread.path ?? "the PR"}`;
		})
	);
	addSection(
		"Human comments not in the review-misses log",
		findings.unlogged.map(
			(comment) =>
				`${comment.html_url} by ${comment.user?.login} on ${comment.path ?? "the PR"}: ${excerpt(comment.body)}`
		)
	);
	addSection("Missing PR body headings", findings.missingHeadings);
	addSection(
		"Unparseable review-misses log lines",
		findings.badLines.map((bad) => `line ${bad.line}: ${bad.error}`)
	);
	addSection("Failed writes", findings.failures);
	addSection("Review threads", findings.unchecked);
	addSection("Actions", actions);
	lines.push(
		"",
		`Existing classes: ${classes.length > 0 ? classes.join(" | ") : "none yet"}`
	);

	return lines;
}

/**
 * Returns the `--json` report for a reconcile result.
 *
 * `clean` follows the exit code. Each `failedWrites` entry names the write
 * GitHub refused and its error. A PR-level comment has no file, and its
 * `path` is null.
 *
 * @param {{ code: number, findings: Findings }} result
 */
export function toJsonReport({ code, findings }) {
	return {
		clean: code === 0,
		unloggedComments: findings.unlogged.map((comment) => ({
			url: comment.html_url,
			author: comment.user?.login ?? null,
			path: comment.path ?? null,
		})),
		threadsNeedingReply: findings.needsReply.map((thread) => {
			const opening = /** @type {Comment} */ (thread.comments[0]);

			return {
				url: opening.html_url,
				path: thread.path ?? null,
				author: opening.user?.login ?? null,
			};
		}),
		missingHeadings: findings.missingHeadings,
		badLogLines: findings.badLines.map((bad) => bad.line),
		truncatedThreads: findings.unchecked.length > 0,
		failedWrites: findings.failures,
	};
}

/**
 * @param {string | null | undefined} body
 * @returns {string}
 */
function excerpt(body) {
	return (body ?? "").replace(/\s+/g, " ").trim().slice(0, EXCERPT_LENGTH);
}

/**
 * @param {{ class: string, count: number, passes: string[] }[]} classes
 * @returns {string[]}
 */
export function formatClasses(classes) {
	if (classes.length === 0) return ["No open class has 3 or more rows."];

	return classes.map(
		(group) =>
			`${group.class}: ${group.count} rows, nearest passes ${group.passes.join(", ")}`
	);
}

// --- CLI ---

/**
 * @param {string[]} argv
 * @returns {{ pr: number | null, log: string | null, write: boolean, classes: boolean, json: boolean }}
 */
function parseArgs(argv) {
	const options = {
		/** @type {number | null} */
		pr: null,
		/** @type {string | null} */
		log: null,
		write: true,
		classes: false,
		json: false,
	};
	for (let i = 0; i < argv.length; i += 1) {
		const arg = /** @type {string} */ (argv[i]);
		if (arg === "--no-write") options.write = false;
		else if (arg === "--classes") options.classes = true;
		else if (arg === "--json") options.json = true;
		else if (arg === "--log") {
			const value = argv[++i];
			if (value === undefined || value.startsWith("--")) {
				throw new Error("--log needs a path");
			}

			options.log = value;
		} else if (/^\d+$/.test(arg)) options.pr = Number(arg);
		else throw new Error(`unknown argument ${arg}`);
	}

	return options;
}

/** @type {Gh} */
function runGh(args) {
	try {
		const stdout = execFileSync("gh", ["api", ...args], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
			maxBuffer: 64 * 1024 * 1024,
		});

		return stdout.trim() === "" ? null : JSON.parse(stdout);
	} catch (error) {
		const failure = /** @type {{ stdout?: unknown, stderr?: unknown }} */ (
			error
		);
		const stderr = String(failure.stderr ?? "");
		const status = Number(/HTTP (\d{3})/.exec(stderr)?.[1] ?? 0);
		throw { status, body: `${String(failure.stdout ?? "")}\n${stderr}`.trim() };
	}
}

/** @type {Git} */
function runGit(args) {
	return execFileSync("git", args, {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	});
}

function main() {
	const usage =
		"usage: node <hook-runtime>/review/reconcile.mjs <pr> [--log <path>] [--no-write] [--classes] [--json]";
	/** @type {ReturnType<typeof parseArgs>} */
	let options;
	try {
		options = parseArgs(process.argv.slice(2));
	} catch (error) {
		console.error(`reconcile.mjs: ${errorText(error)}\n${usage}`);
		process.exitCode = 2;

		return;
	}

	/** @type {string} */
	let logPath;
	if (options.log !== null && options.log !== undefined) {
		logPath = options.log;
	} else {
		try {
			logPath = path.join(runGit(["rev-parse", "--show-toplevel"]).trim(), DEFAULT_LOG);
		} catch {
			console.error(
				`reconcile.mjs: not inside a git repository, so the misses log path is unknown; pass --log <path>\n${usage}`
			);
			process.exitCode = 2;

			return;
		}
	}

	if (options.classes) {
		console.log(formatClasses(openClasses(readLog(logPath).rows)).join("\n"));

		return;
	}

	if (options.pr === null) {
		console.error(usage);
		process.exitCode = 2;

		return;
	}

	const repo = runGh(["repos/{owner}/{repo}"]).full_name;
	const agentLogin = runGh(["user"]).login;
	const result = reconcile({
		pr: options.pr,
		repo,
		gh: runGh,
		git: runGit,
		agentLogin,
		logPath,
		write: options.write,
	});
	console.log(
		options.json
			? JSON.stringify(toJsonReport(result))
			: result.lines.join("\n")
	);
	// An exit code, not an exit call, so output still queued for a pipe drains first.
	process.exitCode = result.code;
}

const isEntryModule =
	process.argv[1] !== undefined &&
	realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryModule) main();
