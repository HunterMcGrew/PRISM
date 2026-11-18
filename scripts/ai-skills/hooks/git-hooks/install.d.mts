export type InstallAction = "set" | "already" | "left-alone" | "no-shims";

export interface InstallResult {
	action: InstallAction;
	message: string;
}

export interface GitHooksState {
	scopes: {
		system: string | null;
		global: string | null;
		local: string | null;
		worktree: string | null;
	};
	effective: string | null;
	installed: boolean;
}

export function classifyHooksPath(
	value: string | null | undefined,
	repoRoot: string
): "unset" | "ours" | "foreign";

export function readGitHooksState(repoRoot: string): GitHooksState;

export function installGitHooks(
	repoRoot: string,
	options?: { dryRun?: boolean }
): InstallResult;

export function runSessionStartInstall(rawStdin: string): string | null;
