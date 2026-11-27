export interface User {
	login?: string;
	type?: string;
}

export interface Comment {
	id?: number;
	user?: User;
	body?: string | null;
	path?: string | null;
	html_url?: string;
	original_commit_id?: string;
}

export interface Thread {
	id?: string | null;
	resolved: boolean;
	outdated?: boolean;
	path?: string | null;
	comments: Comment[];
}

export interface Pull {
	user: { login: string };
	body?: string | null;
	head?: { sha: string };
}

export interface LogRow {
	class?: unknown;
	resolved?: unknown;
	nearest_pass?: unknown;
	comment?: unknown;
}

export interface BadLine {
	line: number;
	error: string;
}

export interface Findings {
	needsReply: Thread[];
	unlogged: Comment[];
	missingHeadings: string[];
	badLines: BadLine[];
	failures: string[];
	unchecked: string[];
}

export interface OpenClass {
	class: string;
	count: number;
	passes: string[];
}

export type Gh = (args: string[]) => any;
export type Git = (args: string[]) => string;

export interface ReconcileResult {
	code: number;
	findings: Findings;
	actions: string[];
	lines: string[];
}

export function reconcile(input: {
	pr: number;
	repo: string;
	gh: Gh;
	git: Git;
	agentLogin: string;
	logPath: string;
	templatePath?: string;
	write?: boolean;
}): ReconcileResult;

export function isAgent(comment: Comment, agentLogin: string): boolean;
export function readsAsAgent(comment: Comment): boolean;
export function isBot(comment: Comment): boolean;
export function isAuthorNote(comment: Comment, pull: Pull): boolean;
export function isHuman(comment: Comment, pull: Pull): boolean;
export function needsReply(thread: Thread, pull: Pull): boolean;
export function ownAddressed(thread: Thread, agentLogin: string): boolean;

export function missingHeadings(body: string, template: string): string[];

export function readLog(logPath: string): { rows: LogRow[]; badLines: BadLine[] };

export function openClasses(rows: LogRow[]): OpenClass[];

export function toJsonReport(result: { code: number; findings: Findings }): {
	clean: boolean;
	unloggedComments: { url?: string; author: string | null; path: string | null }[];
	threadsNeedingReply: { url?: string; path: string | null; author: string | null }[];
	missingHeadings: string[];
	badLogLines: number[];
	truncatedThreads: boolean;
	failedWrites: string[];
};

export function formatClasses(classes: OpenClass[]): string[];
