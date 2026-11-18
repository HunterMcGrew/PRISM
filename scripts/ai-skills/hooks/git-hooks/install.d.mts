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
	active: { "pre-commit": boolean; "pre-push": boolean };
}

export function classifyHooksPath(
	value: string | null | undefined,
	repoRoot: string
): "unset" | "ours" | "foreign";

export function isRunnableShim(filePath: string, platform?: NodeJS.Platform): boolean;

export function readGitHooksState(repoRoot: string): GitHooksState;

export function describeForeignHooks(
	repoRoot: string,
	scopes: GitHooksState["scopes"]
): string | null;

export function installGitHooks(
	repoRoot: string,
	options?: { dryRun?: boolean; shimsDelivered?: boolean }
): InstallResult;

export function removeGitHooksPath(
	repoRoot: string,
	options?: { dryRun?: boolean }
): string | null;

export function runSessionStartInstall(rawStdin: string): string | null;

export function runInstallCli(): void;
