// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Waits for a PR's CI to finish on its newest commit:
 * `node <hook-runtime>/plan/watch-ci.mjs <pr> [--required <check>] [--timeout-min <n>]`.
 *
 * The PR stage runs it in the background after a push, and the session acts on
 * its exit: 0 when every check on the head passed, 1 when one failed or was
 * cancelled, 8 when the timeout ran out first, 2 on a usage error, and 3 at
 * once when `gh` can't read the PR, such as a wrong number or an auth
 * failure. On 0, 1, and 8 it prints one JSON line naming the head it judged
 * and any failed checks with their links.
 *
 * The required check is `--required` when given, else `ci.requiredCheck` from
 * `.ai-skills/config.json`, else none. With none, the head is settled once it
 * has at least one check and none is pending.
 *
 * It follows the PR rather than one commit, so a push made while it waits
 * moves it to the new head. `gh pr checks --watch` alone can end early in two
 * ways: right after a push the head has no checks yet, and `gh` exits with
 * "no checks reported"; and the main build can register minutes after quicker
 * checks, so a watch can see nothing pending and report green before the build
 * starts. So it waits until the head has a check and nothing is pending, and
 * until the required check exists when one is named, then reads the head again
 * before it answers.
 *
 * Only a named required check closes the second gap. With none set, a check
 * that registers after the others settle can be missed, and the watcher can
 * exit 0 before it runs. Set `ci.requiredCheck`, or pass `--required`, to
 * close it.
 */
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { readRepoConfig } from "../lib/command.mjs";

const FAILED_BUCKETS = new Set(["fail", "cancel"]);

/**
 * @typedef {{ status: number | null, stdout: string, stderr: string }} GhResult
 * @typedef {(args: string[]) => GhResult} GhRunner
 * @typedef {{ name: string, bucket: string, link: string }} Check
 */

/**
 * Polls until the head's checks settle, and returns `{ state, head, failed }`,
 * where `state` is `pass`, `fail`, or `pending` and `failed` lists
 * `{ name, link }`.
 *
 * `gh(args)` returns `{ status, stdout, stderr }`, `sleep(ms)` waits, and
 * `now()` reads the clock, so a test drives every branch without GitHub.
 * Throws when `gh` can't read the PR's head on the first read.
 *
 * @param {{
 *   pr: string,
 *   gh: GhRunner,
 *   sleep: (ms: number) => Promise<void>,
 *   now: () => number,
 *   required?: string | null,
 *   intervalMs?: number,
 *   timeoutMs?: number,
 * }} input
 * @returns {Promise<{ state: "pass" | "fail" | "pending", head: string, failed: { name: string, link: string }[] }>}
 */
export async function watchCi({
	pr,
	gh,
	sleep,
	now,
	required = null,
	intervalMs = 20_000,
	timeoutMs = 60 * 60_000,
}) {
	const deadline = now() + timeoutMs;
	let head = readHead(gh, pr);

	while (now() < deadline) {
		const checks = readChecks(gh, pr);
		const settled =
			checks !== null &&
			(required === null || checks.some((check) => check.name === required)) &&
			!checks.some((check) => check.bucket === "pending");
		if (checks !== null && settled) {
			const latest = tryReadHead(gh, pr);
			if (latest === head) {
				const failed = checks
					.filter((check) => FAILED_BUCKETS.has(check.bucket))
					.map(({ name, link }) => ({ name, link }));

				return { state: failed.length > 0 ? "fail" : "pass", head, failed };
			}

			if (latest !== null) {
				head = latest;
				continue;
			}
		}

		await sleep(intervalMs);
		head = tryReadHead(gh, pr) ?? head;
	}

	return { state: "pending", head, failed: [] };
}

/**
 * The check to wait for: `--required` when given, else `ci.requiredCheck`
 * from the config under `toplevel`, else null. An empty string counts as
 * none, because the config validator does not enforce the schema's
 * `minLength`.
 *
 * @param {{ argv: string[], toplevel: string }} input
 * @returns {string | null}
 */
export function resolveRequiredCheck({ argv, toplevel }) {
	const fromFlag = readOption(argv, "--required");
	if (fromFlag !== undefined) {
		return fromFlag === "" ? null : fromFlag;
	}

	const ci = readRepoConfig(toplevel)?.["ci"];
	const fromConfig =
		typeof ci === "object" && ci !== null && !Array.isArray(ci)
			? /** @type {Record<string, unknown>} */ (ci)["requiredCheck"]
			: undefined;

	return typeof fromConfig === "string" && fromConfig !== "" ? fromConfig : null;
}

/**
 * The head, or null when `gh` fails. The first read already proved the PR
 * readable, so a later failure is a network or rate-limit blip to poll past.
 *
 * @param {GhRunner} gh
 * @param {string} pr
 * @returns {string | null}
 */
function tryReadHead(gh, pr) {
	try {
		return readHead(gh, pr);
	} catch {
		return null;
	}
}

/**
 * @param {GhRunner} gh
 * @param {string} pr
 * @returns {string}
 */
function readHead(gh, pr) {
	const result = gh([
		"pr",
		"view",
		pr,
		"--json",
		"headRefOid",
		"-q",
		".headRefOid",
	]);
	const head = result.stdout.trim();
	if (result.status !== 0 || !head) {
		throw new Error(
			`gh pr view ${pr} failed: ${result.stderr.trim() || `exit ${result.status}`}`
		);
	}

	return head;
}

/**
 * The head's checks as `{ name, bucket, link }`, or null while it has none.
 * `gh pr checks` exits non-zero for pending and failed checks, so the exit
 * code says nothing here, and only output that parses counts.
 *
 * @param {GhRunner} gh
 * @param {string} pr
 * @returns {Check[] | null}
 */
function readChecks(gh, pr) {
	const result = gh(["pr", "checks", pr, "--json", "name,bucket,link"]);
	try {
		const checks = JSON.parse(result.stdout);

		return Array.isArray(checks) && checks.length > 0 ? checks : null;
	} catch {
		return null;
	}
}

// --- CLI ---

/** @type {GhRunner} */
function runGh(args) {
	const result = spawnSync("gh", args, { encoding: "utf8" });

	return {
		status: result.status,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
	};
}

/**
 * @param {string[]} argv
 * @param {string} name
 * @returns {string | undefined}
 */
function readOption(argv, name) {
	const index = argv.indexOf(name);

	return index === -1 ? undefined : argv[index + 1];
}

/** @returns {string} */
function findToplevel() {
	const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
		encoding: "utf8",
	});
	const toplevel = (result.stdout ?? "").trim();

	return result.status === 0 && toplevel ? toplevel : process.cwd();
}

if (
	process.argv[1] &&
	realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	const argv = process.argv.slice(2);
	const pr = argv[0];
	const timeout = argv.includes("--timeout-min")
		? readOption(argv, "--timeout-min")
		: "60";
	if (!pr || pr.startsWith("-") || !/^\d+(?:\.\d+)?$/.test(timeout ?? "")) {
		process.stderr.write(
			"usage: node <hook-runtime>/plan/watch-ci.mjs <pr> [--required <check>] [--timeout-min <n>]\n"
		);
		process.exitCode = 2;
	} else {
		try {
			const result = await watchCi({
				pr,
				gh: runGh,
				sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
				now: Date.now,
				required: resolveRequiredCheck({ argv, toplevel: findToplevel() }),
				timeoutMs: Number(timeout) * 60_000,
			});
			process.stdout.write(`${JSON.stringify(result)}\n`);
			process.exitCode = { pass: 0, fail: 1, pending: 8 }[result.state];
		} catch (error) {
			process.stderr.write(
				`watch-ci.mjs: ${error instanceof Error ? error.message : String(error)}\n`
			);
			process.exitCode = 3;
		}
	}
}
