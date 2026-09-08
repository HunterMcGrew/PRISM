export function unquote(token: string): string;

export function splitShellSegments(command: string): string[][];

export function readHeredocDelimiter(
	command: string,
	index: number,
	pendingHeredocs: string[]
): number;

export function skipHeredocBodies(
	command: string,
	index: number,
	pendingHeredocs: string[]
): number;
