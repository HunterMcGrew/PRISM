import type { StopPaths } from "../plan/stop-paths.mjs";
import type { parseSubject, Task } from "../plan/tasks.mjs";
import type { Commit } from "./parse.mjs";
import type { WouldBeIndex } from "./tree.mjs";

export interface CheckResult {
	reason: string;
	remedy: string;
}

export interface Context {
	repoRoot: string;
	planFolder: string | null;
	tasks: Task[] | null;
	commit: Commit;
	subject: ReturnType<typeof parseSubject>;
	index: WouldBeIndex;
	paths: string[];
	namedTasks: Task[];
	stopPaths: StopPaths | null;
	testGlobs: string[];
	defaultBranch: string;
	configError: string | null;
}

export const RETRO_PATHS: string[];

export const CONFIG_CHECK: {
	name: "config";
	run: (ctx: Context) => CheckResult | null;
};

export const SUBJECT_CHECK: {
	name: "subject";
	run: (ctx: Context) => CheckResult | null;
};

/** The flag denies read only `ctx.commit`, so the rest of the context may be absent. */
export const STOPS_CHECK: {
	name: "stops";
	run: (ctx: Pick<Context, "commit"> & Partial<Context>) => CheckResult | null;
};

export function loadContext(options: {
	repoRoot: string;
	commit: Commit;
	index: WouldBeIndex;
}): Context;
