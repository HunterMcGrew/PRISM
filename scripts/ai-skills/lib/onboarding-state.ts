/**
 * Resumable state tracking for Atlas's onboarding flow (PR-2.1, plan task 9).
 *
 * Atlas's interactive flow is conversational and saves state after every
 * accepted answer (per Atlas's shared.md § Interactive flow). If the session
 * is interrupted — chat closes, context fills, user walks away — the next
 * invocation reads the state file and resumes from `nextIncompleteStep`
 * instead of restarting from step one. This module owns the persistence and
 * the step-transition functions.
 *
 * `loadState` returns `null` when no state file exists yet — Atlas's flow
 * uses that as the signal for first-install mode. `saveState` writes the
 * full record atomically (tmp + rename) so an interrupted save can't leave
 * a half-written JSON blob the next run will choke on. `markStepComplete`
 * is a pure function that returns a new state object — no in-place mutation,
 * so callers can compare before/after for idempotency.
 */
import fs from "node:fs/promises";
import path from "node:path";

import type {
	OnboardingState,
	OnboardingStep,
} from "./onboarding-types";

const STATE_DIRECTORY = path.join(".ai-skills", "registry");
const STATE_FILENAME = "onboarding-state.json";

/**
 * Canonical step order Atlas walks in first-install mode. The constant lives
 * here (not in `onboarding-config.ts`) because state tracking is the layer
 * that depends on a fixed ordering — `nextIncompleteStep` walks this list
 * to find the first `pending` step.
 *
 * Step names match the prompts in Atlas's shared.md § Interactive flow.
 * When the flow changes shape, this list updates alongside it; the state
 * file's `steps` array is rewritten in full by `saveState`, so reordering
 * here is safe.
 */
export const ONBOARDING_STEPS: ReadonlyArray<string> = [
	"project-name",
	"ticket-prefix",
	"github-org-repo",
	"linear-workspace",
	"linear-team-key",
	"product-domain",
	"existing-standards",
	"asset-path-survey",
	"discovery-sweep",
	"slack-channel",
	"documentation-setup",
	"stack-detection",
	"rule-generation",
	"anchor-substitution",
	"config-write",
	"build-verify",
];

/**
 * Reads `.ai-skills/registry/onboarding-state.json` from the repo root.
 * Returns `null` when the file does not exist — first-install mode reads
 * `null` and starts a fresh state via `initialState`.
 *
 * On a parse failure, the function throws — a corrupted state file is a
 * user-visible problem that needs explicit handling, not silent reset.
 * Atlas's flow surfaces the parse error and offers to start fresh after
 * confirming the user wants to discard the prior state.
 */
export async function loadState(
	repoRoot: string
): Promise<OnboardingState | null> {
	const statePath = path.join(repoRoot, STATE_DIRECTORY, STATE_FILENAME);

	let raw: string;
	try {
		raw = await fs.readFile(statePath, "utf8");
	} catch (error) {
		if (isNodeError(error) && error.code === "ENOENT") {
			return null;
		}
		throw error;
	}

	const parsed = JSON.parse(raw) as OnboardingState;
	return parsed;
}

/**
 * Persists onboarding state atomically. Tmp file in the same directory,
 * fsync via `rename` over the target — an interrupted save leaves either
 * the prior state or the new one but never a half-written record. The
 * write goes through even when the state file does not yet exist (the
 * function creates the parent directory on demand).
 */
export async function saveState(
	repoRoot: string,
	state: OnboardingState
): Promise<void> {
	const directory = path.join(repoRoot, STATE_DIRECTORY);
	await fs.mkdir(directory, { recursive: true });

	const targetPath = path.join(directory, STATE_FILENAME);
	const tmpPath = path.join(directory, `${STATE_FILENAME}.tmp`);

	const serialized = `${JSON.stringify(state, null, "\t")}\n`;
	await fs.writeFile(tmpPath, serialized, "utf8");

	try {
		await fs.rename(tmpPath, targetPath);
	} catch (error) {
		await fs.rm(tmpPath, { force: true });
		throw error;
	}
}

/**
 * Builds a fresh `OnboardingState` for a new session. Steps are seeded from
 * `ONBOARDING_STEPS` with `status: "pending"`. Atlas's flow calls this when
 * `loadState` returns `null` and the user is starting a first-install or
 * dogfood-self run.
 */
export function initialState(
	mode: OnboardingState["mode"],
	now: () => string = () => new Date().toISOString()
): OnboardingState {
	const timestamp = now();
	return {
		startedAt: timestamp,
		updatedAt: timestamp,
		mode,
		steps: ONBOARDING_STEPS.map(
			(name): OnboardingStep => ({
				name,
				status: "pending",
			})
		),
	};
}

/**
 * Marks a step complete and returns a new state object. Pure function — the
 * input state is not mutated, so callers can hold the prior value for
 * comparison or rollback. Idempotent — marking an already-complete step a
 * second time returns a state with the same `completedAt` timestamp.
 *
 * Throws when `stepName` is not in the state's `steps` array. Atlas's flow
 * uses the canonical step names from `ONBOARDING_STEPS`; a mismatch
 * indicates a flow/state desync and should surface, not silently no-op.
 */
export function markStepComplete(
	state: OnboardingState,
	stepName: string,
	now: () => string = () => new Date().toISOString()
): OnboardingState {
	const index = state.steps.findIndex((step) => step.name === stepName);
	if (index === -1) {
		throw new Error(
			`Unknown onboarding step ${JSON.stringify(stepName)}. ` +
				`Known steps: ${state.steps.map((step) => step.name).join(", ")}`
		);
	}

	const existing = state.steps[index];
	if (existing.status === "complete") {
		return state;
	}

	const timestamp = now();
	const updatedSteps = state.steps.slice();
	updatedSteps[index] = {
		name: existing.name,
		status: "complete",
		completedAt: timestamp,
	};

	return {
		...state,
		updatedAt: timestamp,
		steps: updatedSteps,
	};
}

/**
 * Returns the name of the next pending step, or `null` when every step is
 * complete. Atlas's flow uses this to decide whether to resume mid-flow,
 * declare the session done, or fall through to first-install mode.
 */
export function nextIncompleteStep(state: OnboardingState): string | null {
	for (const step of state.steps) {
		if (step.status !== "complete") {
			return step.name;
		}
	}
	return null;
}

interface NodeError extends Error {
	code?: string;
}

function isNodeError(value: unknown): value is NodeError {
	return value instanceof Error && typeof (value as NodeError).code === "string";
}
