/**
 * Contract for `hooks/plan/watch-ci.mjs`: it judges a PR's newest head, waits
 * for the required check (or for every check when none is set), and answers
 * with a distinct exit code per outcome. Every `gh` call is an injected fake.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { resolveRequiredCheck, watchCi } from "./hooks/plan/watch-ci.mjs";
import type { GhResult, GhRunner } from "./hooks/plan/watch-ci.mjs";

const SCRIPT = fileURLToPath(new URL("./hooks/plan/watch-ci.mjs", import.meta.url));
const REQUIRED = "build";
const BUILD = { name: REQUIRED, bucket: "pass", link: "https://ci/build" };
const DOCS = { name: "docs-preview", bucket: "pass", link: "https://v" };
const USAGE = /usage: node <hook-runtime>\/plan\/watch-ci\.mjs <pr>/;

interface Poll {
	head: string;
	checks: unknown[] | string;
}

/** Host markers that would change what a spawned process believes it runs in. */
function cleanEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = { ...process.env, ...extra };
	for (const key of [
		"CLAUDECODE",
		"CLAUDE_CODE_SESSION_ID",
		"CODEX_THREAD_ID",
		"CODEX_SESSION_ID",
		"CODEX_CI",
		"PRISM_HOOK_DISABLE",
		"PRISM_HOOK_DENY_DISABLE",
	]) {
		delete env[key];
	}

	return env;
}

/**
 * A fake `gh` that answers from a script of polls. Each poll is
 * `{ head, checks }`, where `checks` is an array or a string printed as the
 * error `gh` gives for a head with no checks. The poll advances on every
 * `pr checks` call, and the last one repeats.
 */
function fakeGh(polls: Poll[]): GhRunner {
	let index = 0;
	const current = (): Poll => polls[Math.min(index, polls.length - 1)] as Poll;

	return (args) => {
		if (args[1] === "view") {
			return { status: 0, stdout: `${current().head}\n`, stderr: "" };
		}

		const { checks } = current();
		index += 1;
		if (typeof checks === "string") {
			return { status: 1, stdout: "", stderr: checks };
		}

		return { status: 8, stdout: JSON.stringify(checks), stderr: "" };
	};
}

function run(
	polls: Poll[],
	options: { required?: string | null; timeoutMs?: number } = {}
) {
	let clock = 0;

	return watchCi({
		pr: "1",
		gh: fakeGh(polls),
		sleep: async (ms) => {
			clock += ms;
		},
		now: () => clock,
		intervalMs: 1000,
		timeoutMs: 60_000,
		required: REQUIRED,
		...options,
	});
}

test("passes once the build check exists and nothing is pending", async () => {
	const result = await run([
		{ head: "a", checks: [{ ...BUILD, bucket: "pending" }, DOCS] },
		{ head: "a", checks: [BUILD, DOCS] },
	]);

	assert.deepEqual(result, { state: "pass", head: "a", failed: [] });
});

test("keeps waiting while the build hasn't registered, even with nothing pending", async () => {
	const result = await run([
		{ head: "b", checks: [DOCS] },
		{ head: "b", checks: [DOCS] },
		{ head: "b", checks: [{ ...BUILD, bucket: "fail" }, DOCS] },
	]);

	assert.equal(result.state, "fail");
	assert.deepEqual(result.failed, [{ name: REQUIRED, link: "https://ci/build" }]);
});

test("waits through the no-checks error a fresh push gives", async () => {
	const result = await run([
		{ head: "c", checks: "no checks reported on the 'x' branch" },
		{ head: "c", checks: [BUILD] },
	]);

	assert.equal(result.state, "pass");
});

test("follows a push made while it waits and judges the new head", async () => {
	const result = await run([
		{ head: "old", checks: [{ ...BUILD, bucket: "pending" }] },
		{ head: "new", checks: [{ ...BUILD, bucket: "pending" }] },
		{ head: "new", checks: [BUILD] },
	]);

	assert.deepEqual(result, { state: "pass", head: "new", failed: [] });
});

test("rereads the head before answering, so a settled old head doesn't count", async () => {
	let views = 0;
	const gh: GhRunner = (args): GhResult => {
		if (args[1] === "view") {
			views += 1;

			return { status: 0, stdout: views < 2 ? "old\n" : "new\n", stderr: "" };
		}

		return {
			status: 0,
			stdout: JSON.stringify(views < 2 ? [BUILD] : [{ ...BUILD, bucket: "fail" }]),
			stderr: "",
		};
	};
	let clock = 0;
	const result = await watchCi({
		pr: "1",
		gh,
		sleep: async (ms) => {
			clock += ms;
		},
		now: () => clock,
		intervalMs: 1000,
		timeoutMs: 60_000,
		required: REQUIRED,
	});

	assert.equal(result.head, "new");
	assert.equal(result.state, "fail");
});

test("counts a cancelled check on the head as failed", async () => {
	const result = await run([{ head: "d", checks: [{ ...BUILD, bucket: "cancel" }] }]);

	assert.equal(result.state, "fail");
});

test("reports pending when the timeout runs out", async () => {
	const result = await run(
		[{ head: "e", checks: [{ ...BUILD, bucket: "pending" }] }],
		{ timeoutMs: 5000 }
	);

	assert.deepEqual(result, { state: "pending", head: "e", failed: [] });
});

test("the CLI exits 2 with usage when no PR is given", () => {
	const result = spawnSync(process.execPath, [SCRIPT], {
		encoding: "utf8",
		env: cleanEnv(),
	});

	assert.equal(result.status, 2);
	assert.match(result.stderr, USAGE);
});

test("throws at once when gh can't read the PR's head", async () => {
	let polls = 0;
	await assert.rejects(
		watchCi({
			pr: "999999",
			gh: (args) => {
				if (args[1] === "checks") {
					polls += 1;
				}

				return {
					status: 1,
					stdout: "",
					stderr: "GraphQL: Could not resolve to a PullRequest",
				};
			},
			sleep: async () => {},
			now: () => 0,
		}),
		/gh pr view 999999 failed: GraphQL: Could not resolve/
	);
	assert.equal(polls, 0);
});

test("polls past a gh failure on a later head read", async () => {
	const gh = fakeGh([
		{ head: "a", checks: [{ ...BUILD, bucket: "pending" }, DOCS] },
		{ head: "a", checks: [BUILD, DOCS] },
		{ head: "a", checks: [BUILD, DOCS] },
	]);
	let views = 0;
	let clock = 0;
	const result = await watchCi({
		pr: "1",
		gh: (args) => {
			if (args[1] === "view") {
				views += 1;
				if (views === 2 || views === 3) {
					return { status: 1, stdout: "", stderr: "HTTP 502" };
				}
			}

			return gh(args);
		},
		sleep: async (ms) => {
			clock += ms;
		},
		now: () => clock,
		intervalMs: 1000,
		timeoutMs: 60_000,
		required: REQUIRED,
	});

	assert.deepEqual(result, { state: "pass", head: "a", failed: [] });
});

const WINDOWS_SKIP = process.platform === "win32" && "a shell-script gh stand-in can't run on Windows";

test("the CLI exits 3 naming the gh error when gh can't read the PR", { skip: WINDOWS_SKIP }, () => {
	const bin = fs.mkdtempSync(path.join(os.tmpdir(), "watch-ci-gh-"));
	fs.writeFileSync(
		path.join(bin, "gh"),
		"#!/bin/sh\necho 'HTTP 401: Bad credentials' >&2\nexit 1\n",
		{ mode: 0o755 }
	);
	try {
		const result = spawnSync(process.execPath, [SCRIPT, "1"], {
			encoding: "utf8",
			env: cleanEnv({ PATH: `${bin}${path.delimiter}${process.env["PATH"] ?? ""}` }),
			timeout: 10_000,
		});

		assert.equal(result.status, 3, result.stderr);
		assert.match(result.stderr, /^watch-ci\.mjs: .*Bad credentials/m);
	} finally {
		fs.rmSync(bin, { recursive: true, force: true });
	}
});

for (const value of ["abc", "-5", undefined]) {
	test(`the CLI exits 2 with usage for --timeout-min ${value ?? "with no value"}`, () => {
		const args = [SCRIPT, "1", "--timeout-min", ...(value === undefined ? [] : [value])];
		const result = spawnSync(process.execPath, args, {
			encoding: "utf8",
			env: cleanEnv(),
		});

		assert.equal(result.status, 2);
		assert.match(result.stderr, USAGE);
	});
}

test("with no required check, a head with one check still pending keeps waiting and settles once both pass", async () => {
	const result = await run(
		[
			{ head: "f", checks: [BUILD, { ...DOCS, bucket: "pending" }] },
			{ head: "f", checks: [BUILD, { ...DOCS, bucket: "pending" }] },
			{ head: "f", checks: [BUILD, DOCS] },
		],
		{ required: null }
	);

	assert.deepEqual(result, { state: "pass", head: "f", failed: [] });
});

test("with no required check, a head that never settles reports pending", async () => {
	const result = await run(
		[{ head: "g", checks: [BUILD, { ...DOCS, bucket: "pending" }] }],
		{ required: null, timeoutMs: 5000 }
	);

	assert.equal(result.state, "pending");
});

test("with no required check, a head with zero checks is still waiting", async () => {
	const result = await run(
		[{ head: "h", checks: [] }],
		{ required: null, timeoutMs: 5000 }
	);

	assert.deepEqual(result, { state: "pending", head: "h", failed: [] });
});

test("a config's ci.requiredCheck makes the watcher wait for that check with no --required flag", async () => {
	const toplevel = fs.mkdtempSync(path.join(os.tmpdir(), "watch-ci-config-"));
	try {
		fs.mkdirSync(path.join(toplevel, ".ai-skills"));
		fs.writeFileSync(
			path.join(toplevel, ".ai-skills", "config.json"),
			JSON.stringify({ ci: { requiredCheck: "build" } })
		);
		const required = resolveRequiredCheck({ argv: ["1"], toplevel });

		assert.equal(required, "build");
		// Only docs is on the head, so a watcher that ignored the key would settle at once.
		const result = await run([{ head: "i", checks: [DOCS] }], {
			required,
			timeoutMs: 5000,
		});

		assert.equal(result.state, "pending");
	} finally {
		fs.rmSync(toplevel, { recursive: true, force: true });
	}
});

test("--required wins over the config, and an empty value counts as none", () => {
	const toplevel = fs.mkdtempSync(path.join(os.tmpdir(), "watch-ci-flag-"));
	try {
		fs.mkdirSync(path.join(toplevel, ".ai-skills"));
		fs.writeFileSync(
			path.join(toplevel, ".ai-skills", "config.json"),
			JSON.stringify({ ci: { requiredCheck: "build" } })
		);

		assert.equal(
			resolveRequiredCheck({ argv: ["1", "--required", "lint"], toplevel }),
			"lint"
		);
		assert.equal(
			resolveRequiredCheck({ argv: ["1", "--required", ""], toplevel }),
			null
		);
		fs.writeFileSync(
			path.join(toplevel, ".ai-skills", "config.json"),
			JSON.stringify({ ci: { requiredCheck: "" } })
		);

		assert.equal(resolveRequiredCheck({ argv: ["1"], toplevel }), null);
	} finally {
		fs.rmSync(toplevel, { recursive: true, force: true });
	}
});

test("with no flag and no config, there is no required check", () => {
	const toplevel = fs.mkdtempSync(path.join(os.tmpdir(), "watch-ci-none-"));
	try {
		assert.equal(resolveRequiredCheck({ argv: ["1"], toplevel }), null);
	} finally {
		fs.rmSync(toplevel, { recursive: true, force: true });
	}
});
