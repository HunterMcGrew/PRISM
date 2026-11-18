export interface TokenizeResult {
	tokens: string[];
	operators: Set<number>;
	bodies: Set<number>;
	substitutions: string[];
}

export const REDIRECTS: Set<string>;

export const PIPES: Set<string>;

export function tokenize(command: string): TokenizeResult;

export function flattenCommand(inner: string): string;
