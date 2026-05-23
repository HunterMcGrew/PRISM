/**
 * Tests for Atlas's resumable state tracker (PR-2.1, plan task 10).
 *
 * Covers the four contract guarantees:
 * - `loadState` returns null when no file exists (first-install signal).
 * - `saveState` + `loadState` roundtrip preserves the state record verbatim,
 *   including the canonical step list seeded by `initialState`.
 * - `markStepComplete` is idempotent — marking an already-complete step
 *   returns the prior state unchanged (same `completedAt`).
 * - `nextIncompleteStep` walks the canonical order and returns the first
 *   `pending` step after a partial run.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
	ONBOARDING_STEPS,
	initialState,
	loadState,
	markStepComplete,
	nextIncompleteStep,
	saveState,
} from "./lib/onboarding-state";

async function withTempRepo<T>(
	build: (repoRoot: string) => Promise<T>
): Promise<T> {
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "prism-onboarding-state-")
	);
	try {
		return await build(tempRoot);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

const FIXED_NOW = "2026-05-22T12:00:00.000Z";
const fixedClock = (): string => FIXED_NOW;

test("loadState returns null when the state file does not exist", async () => {
	await withTempRepo(async (root) => {
		const result = await loadState(root);
		assert.equal(result, null);
	});
});

test("saveState then loadState preserves the full record", async () => {
	await withTempRepo(async (root) => {
		const state = initialState("first-install", fixedClock);
		await saveState(root, state);

		const loaded = await loadState(root);
		assert.ok(loaded, "loaded state is non-null");
		assert.deepEqual(loaded, state);
	});
});

test("initialState seeds every canonical step as pending", () => {
	const state = initialState("first-install", fixedClock);

	assert.equal(state.mode, "first-install");
	assert.equal(state.startedAt, FIXED_NOW);
	assert.equal(state.updatedAt, FIXED_NOW);
	assert.equal(state.steps.length, ONBOARDING_STEPS.length);
	for (const step of state.steps) {
		assert.equal(step.status, "pending");
		assert.equal(step.completedAt, undefined);
	}
});

test("markStepComplete transitions a pending step and updates updatedAt", () => {
	const state = initialState("first-install", () => "2026-05-22T12:00:00.000Z");
	const next = markStepComplete(
		state,
		"project-name",
		() => "2026-05-22T12:05:00.000Z"
	);

	const completed = next.steps.find((step) => step.name === "project-name");
	assert.ok(completed);
	assert.equal(completed.status, "complete");
	assert.equal(completed.completedAt, "2026-05-22T12:05:00.000Z");
	assert.equal(next.updatedAt, "2026-05-22T12:05:00.000Z");

	const original = state.steps.find((step) => step.name === "project-name");
	assert.ok(original);
	assert.equal(
		original.status,
		"pending",
		"input state is not mutated by markStepComplete"
	);
});

test("markStepComplete is idempotent on a completed step", () => {
	let tick = 0;
	const ticking = (): string => `2026-05-22T12:0${tick++}:00.000Z`;

	const initial = initialState("first-install", ticking);
	const first = markStepComplete(initial, "project-name", ticking);
	const second = markStepComplete(first, "project-name", ticking);

	assert.equal(
		second,
		first,
		"second markStepComplete returns the same reference"
	);

	const completedFirst = first.steps.find((step) => step.name === "project-name");
	const completedSecond = second.steps.find(
		(step) => step.name === "project-name"
	);
	assert.equal(completedSecond?.completedAt, completedFirst?.completedAt);
});

test("markStepComplete throws on an unknown step name", () => {
	const state = initialState("first-install", fixedClock);
	assert.throws(
		() => markStepComplete(state, "not-a-real-step", fixedClock),
		(error: Error) => error.message.includes("not-a-real-step")
	);
});

test("nextIncompleteStep returns the first pending step", () => {
	const state = initialState("first-install", fixedClock);
	assert.equal(nextIncompleteStep(state), ONBOARDING_STEPS[0]);
});

test("nextIncompleteStep after partial progress returns the first remaining", () => {
	let tick = 0;
	const ticking = (): string => `2026-05-22T12:0${tick++}:00.000Z`;

	let state = initialState("first-install", ticking);
	state = markStepComplete(state, "project-name", ticking);
	state = markStepComplete(state, "ticket-prefix", ticking);
	state = markStepComplete(state, "github-org-repo", ticking);

	assert.equal(nextIncompleteStep(state), "linear-workspace");
});

test("nextIncompleteStep returns null when every step is complete", () => {
	let tick = 0;
	const ticking = (): string => `2026-05-22T12:0${tick++}:00.000Z`;

	let state = initialState("first-install", ticking);
	for (const stepName of ONBOARDING_STEPS) {
		state = markStepComplete(state, stepName, ticking);
	}

	assert.equal(nextIncompleteStep(state), null);
});

test("saveState is atomic — a failed rename leaves the prior state untouched", async () => {
	await withTempRepo(async (root) => {
		const first = initialState("first-install", () => "2026-05-22T12:00:00.000Z");
		await saveState(root, first);

		const statePath = path.join(
			root,
			".ai-skills",
			"registry",
			"onboarding-state.json"
		);
		const tmpPath = `${statePath}.tmp`;
		const priorBytes = await fs.readFile(statePath, "utf8");

		const originalRename = fs.rename;
		(fs as unknown as { rename: typeof fs.rename }).rename = async () => {
			throw new Error("simulated rename failure");
		};

		try {
			const altered = markStepComplete(
				first,
				"project-name",
				() => "2026-05-22T12:05:00.000Z"
			);
			await assert.rejects(
				() => saveState(root, altered),
				/simulated rename failure/
			);
		} finally {
			(fs as unknown as { rename: typeof fs.rename }).rename = originalRename;
		}

		const afterBytes = await fs.readFile(statePath, "utf8");
		assert.equal(afterBytes, priorBytes);

		await assert.rejects(
			() => fs.access(tmpPath),
			"tmp file is cleaned up after a failed rename"
		);
	});
});
