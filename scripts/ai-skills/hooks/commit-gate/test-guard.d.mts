import type { Task } from "../plan/tasks.mjs";
import type { CheckResult, Context } from "./checks.mjs";

export const DEFAULT_TEST_GLOBS: string[];
export const NO_TASK_REASON: string;
export const NO_TASK_REMEDY: string;

export const TEST_GUARD_CHECK: {
	name: "weakened tests";
	run: (ctx: Context) => CheckResult | null;
};

export function resolveTestGlobs(
	config: Record<string, unknown> | null | undefined
): string[];

export function claimsFile(task: Task, file: string | null): boolean;
