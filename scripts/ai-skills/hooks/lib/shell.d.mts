export interface HeredocReader {
	head: string | undefined;
	piped: boolean;
}

export interface HeredocBody {
	start: number;
	end: number;
	readers: HeredocReader[];
}

export function unquote(token: string): string;

export function splitShellSegments(command: string, heredocs?: HeredocBody[]): string[][];

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
