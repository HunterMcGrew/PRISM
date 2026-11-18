export function quoteForShell(arg: string, platform?: NodeJS.Platform): string;

export function fillCommand(
	command: string,
	placeholder: "{path}" | "{files}",
	paths: string[],
	platform?: NodeJS.Platform
): string;

export function isCommandNotFound(result: {
	status: number | null;
	stderr?: string | Buffer | null;
}): boolean;

export function readRepoConfig(toplevel: string): Record<string, any> | null;
