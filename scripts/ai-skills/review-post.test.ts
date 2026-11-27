/**
 * Contract for `hooks/review/post.mjs`: it posts one inline comment on a PR's
 * head commit, marked as an agent's, and refuses a never-reviewed file, a
 * line outside the diff, and a config with no GitHub repo. Every `gh` call is
 * an injected fake, so nothing reaches GitHub.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { postComment } from "./hooks/review/post.mjs";
import type { GhResult } from "./hooks/review/post.mjs";

const SCRIPT = fileURLToPath(new URL("./hooks/review/post.mjs", import.meta.url));
const HEAD = "0123456789abcdef0123456789abcdef01234567";
const MARKER = "<!-- prism-agent -->";

interface FakeGh {
	gh: (args: string[]) => GhResult;
	calls: string[][];
}

/**
 * A fake `gh` that answers `pr view` with `HEAD` and the comment post with
 * `post`, recording every call.
 */
function fakeGh(post: GhResult = { status: 0, stdout: "{}", stderr: "" }): FakeGh {
	const calls: string[][] = [];

	return {
		calls,
		gh: (args) => {
			calls.push(args);
			if (args[0] === "pr" && args[1] === "view") {
				return { status: 0, stdout: `${HEAD}\n`, stderr: "" };
			}

			return post;
		},
	};
}

/** A repo top level holding `.ai-skills/config.json` and a body file. */
function makeRepo(config: unknown, body = "Null check missing here.\n"): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "review-post-"));
	fs.mkdirSync(path.join(dir, ".ai-skills"));
	fs.writeFileSync(path.join(dir, ".ai-skills", "config.json"), JSON.stringify(config));
	fs.writeFileSync(path.join(dir, "body.md"), body);

	return dir;
}

const CONFIG = { github: { owner: "acme", repo: "widgets" } };

function post(
	cwd: string,
	fake: FakeGh,
	overrides: Partial<{ pr: string; file: string; line: string; bodyFile: string }> = {}
) {
	return postComment({
		pr: "42",
		file: "src/app.ts",
		line: "17",
		bodyFile: "body.md",
		gh: fake.gh,
		cwd,
		...overrides,
	});
}

/** The value of `-f <key>=` or `-F <key>=` in a `gh api` argv. */
function field(args: string[], key: string): string | undefined {
	const entry = args.find((arg) => arg.startsWith(`${key}=`));

	return entry?.slice(key.length + 1);
}

test("posts one comment on the head commit with side RIGHT and the agent marker first", () => {
	const fake = fakeGh();
	const result = post(makeRepo(CONFIG), fake);

	assert.equal(result.status, 0);
	const apiCalls = fake.calls.filter((args) => args[0] === "api");
	assert.equal(apiCalls.length, 1);

	const args = apiCalls[0] as string[];
	assert.equal(args[1], "repos/acme/widgets/pulls/42/comments");
	assert.equal(field(args, "commit_id"), HEAD);
	assert.equal(field(args, "path"), "src/app.ts");
	assert.equal(field(args, "line"), "17");
	assert.equal(field(args, "side"), "RIGHT");
	assert.equal(field(args, "body"), `${MARKER}\nNull check missing here.\n`);
	assert.equal(args[args.indexOf("line=17") - 1], "-F");
	assert.equal(args[args.indexOf("side=RIGHT") - 1], "-f");
});

test("passes --repo <owner>/<repo> to gh pr view", () => {
	const fake = fakeGh();
	post(makeRepo(CONFIG), fake);

	const view = fake.calls.find((call) => call[0] === "pr") as string[];
	assert.equal(view[view.indexOf("--repo") + 1], "acme/widgets");
});

test("accepts the PR as N, #N, or a URL ending /pull/N, and posts to number N", () => {
	for (const pr of ["42", "#42", "https://github.com/acme/widgets/pull/42"]) {
		const fake = fakeGh();
		const result = post(makeRepo(CONFIG), fake, { pr });

		assert.equal(result.status, 0, pr);
		const view = fake.calls.find((call) => call[0] === "pr") as string[];
		assert.equal(view[2], "42", pr);
		const api = fake.calls.find((call) => call[0] === "api") as string[];
		assert.equal(api[1], "repos/acme/widgets/pulls/42/comments", pr);
	}
});

test("exits 2 posting nothing on a PR that is not N, #N, or a /pull/N URL", () => {
	for (const pr of ["0", "-1", "42abc", "#", "pull/42", "https://github.com/acme/widgets/pull/42/files", "42; rm"]) {
		const fake = fakeGh();
		const result = post(makeRepo(CONFIG), fake, { pr });

		assert.equal(result.status, 2, pr);
		assert.deepEqual(fake.calls, [], pr);
	}
});

test("exits 2 posting nothing when github.owner or github.repo holds characters outside a GitHub name", () => {
	for (const github of [
		{ owner: "acme/evil", repo: "widgets" },
		{ owner: "acme", repo: "widgets/../x" },
		{ owner: "ac me", repo: "widgets" },
		{ owner: "acme", repo: "widgets?x=1" },
	]) {
		const fake = fakeGh();
		const result = post(makeRepo({ github }), fake);

		assert.equal(result.status, 2, JSON.stringify(github));
		assert.match(result.message, /github\.(owner|repo)/);
		assert.deepEqual(fake.calls, []);
	}
});

test("normalizes the file to a repo-relative path before the ignore check and the post", () => {
	const repo = makeRepo(CONFIG);

	const ignored = fakeGh();
	assert.equal(
		post(repo, ignored, { file: path.join(repo, ".prism", "plans", "prism-1", "plan.md") }).status,
		1
	);
	assert.deepEqual(ignored.calls, []);

	const fake = fakeGh();
	assert.equal(post(repo, fake, { file: ".\\src\\lib\\..\\app.ts" }).status, 0);
	const api = fake.calls.find((call) => call[0] === "api") as string[];
	assert.equal(field(api, "path"), "src/app.ts");
});

test("exits 1 with no api call when gh pr view fails", () => {
	const calls: string[][] = [];
	const result = post(makeRepo(CONFIG), {
		calls,
		gh: (args) => {
			calls.push(args);

			return args[0] === "pr"
				? { status: 1, stdout: "", stderr: "GraphQL: Could not resolve to a PullRequest\n" }
				: { status: 0, stdout: "{}", stderr: "" };
		},
	});

	assert.equal(result.status, 1);
	assert.match(result.message, /Could not resolve/);
	assert.equal(calls.filter((call) => call[0] === "api").length, 0);
});

test("keeps a body that already opens with the marker as it is", () => {
	const fake = fakeGh();
	const body = `${MARKER}\nAlready marked.\n`;
	post(makeRepo(CONFIG, body), fake);

	const args = fake.calls.find((call) => call[0] === "api") as string[];
	assert.equal(field(args, "body"), body);
});

test("exits 1 posting nothing for a never-reviewed file", () => {
	const fake = fakeGh();
	const result = post(makeRepo(CONFIG), fake, { file: ".prism/plans/prism-1/plan.md" });

	assert.equal(result.status, 1);
	assert.match(result.message, /\.prism\/plans\/prism-1\/plan\.md/);
	assert.deepEqual(fake.calls, []);
});

test("reads a set reviewIgnore list from the config", () => {
	const fake = fakeGh();
	const repo = makeRepo({ ...CONFIG, reviewIgnore: ["docs/**"] });

	assert.equal(post(repo, fake, { file: "docs/guide.md" }).status, 1);
	assert.equal(post(repo, fake, { file: ".prism/plans/prism-1/plan.md" }).status, 0);
});

test("exits 2 on a malformed reviewIgnore list", () => {
	const fake = fakeGh();
	const result = post(makeRepo({ ...CONFIG, reviewIgnore: "docs/**" }), fake);

	assert.equal(result.status, 2);
	assert.match(result.message, /reviewIgnore/);
	assert.deepEqual(fake.calls, []);
});

test("exits 1 naming the reason when GitHub answers 422", () => {
	const fake = fakeGh({
		status: 1,
		stdout: '{"message":"Validation Failed"}',
		stderr: "gh: Validation Failed (HTTP 422)\n",
	});
	const result = post(makeRepo(CONFIG), fake);

	assert.equal(result.status, 1);
	assert.equal(result.message, "post: line outside the diff (422)");
});

test("passes any other gh failure through as exit 1 with its stderr", () => {
	const fake = fakeGh({ status: 1, stdout: "", stderr: "gh: Not Found (HTTP 404)\n" });
	const result = post(makeRepo(CONFIG), fake);

	assert.equal(result.status, 1);
	assert.match(result.message, /Not Found \(HTTP 404\)/);
});

test("exits 2 when github.owner or github.repo is missing", () => {
	for (const config of [
		{ github: { repo: "widgets" } },
		{ github: { owner: "acme" } },
		{},
	]) {
		const fake = fakeGh();
		const result = post(makeRepo(config), fake);

		assert.equal(result.status, 2, JSON.stringify(config));
		assert.match(result.message, /github\.(owner|repo)/);
		assert.deepEqual(fake.calls, []);
	}
});

test("exits 2 on a line that is not a positive integer", () => {
	for (const line of ["0", "-3", "1.5", "abc", ""]) {
		const fake = fakeGh();

		assert.equal(post(makeRepo(CONFIG), fake, { line }).status, 2, line);
		assert.deepEqual(fake.calls, []);
	}
});

test("exits 2 on an unreadable body file", () => {
	const fake = fakeGh();
	const result = post(makeRepo(CONFIG), fake, { bodyFile: "missing.md" });

	assert.equal(result.status, 2);
	assert.deepEqual(fake.calls, []);
});

test("the command exits 2 with its usage when an argument is missing", () => {
	const result = spawnSync(process.execPath, [SCRIPT, "42", "src/app.ts"], {
		encoding: "utf8",
	});

	assert.equal(result.status, 2);
	assert.match(result.stderr, /usage: node <hook-runtime>\/review\/post\.mjs <pr> <file> <line> <body-file>/);
});
