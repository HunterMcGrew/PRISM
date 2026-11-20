export interface Deny {
	id: string;
	flag: string;
}

export interface Commit {
	form: "git" | "commit.mjs";
	subject: string | null;
	paths: string[];
	cwd: string | null;
	denies: Deny[];
}

export interface Push {
	cwd: string | null;
	denies: Deny[];
}

export function readCommit(command: string, sessionCwd: string): Commit | null;

export function readPushes(command: string, sessionCwd: string): Push[];

export function readKillSwitch(
	command: string,
	sessionCwd: string
): { id: "kill-switch"; flag: string } | null;

export function repoRelativePaths(
	commit: Pick<Commit, "cwd" | "paths">,
	repoRoot: string
): string[];
