export type RetroTriggerResult =
	| { code: 0 | 1; reasons: string[] }
	| { code: 2; message: string };

export function retroTrigger(folder: string): RetroTriggerResult;
