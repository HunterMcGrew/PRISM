#!/usr/bin/env -S npx tsx
/**
 * `prism detect` — reports the detected tech stack and doc layout as JSON.
 *
 * Read-only and consumer-reachable: Atlas calls this in consumer context
 * (where `scripts/ai-skills/lib/` lives inside `node_modules` and isn't
 * importable directly) instead of calling `detectStack`/`detectDocLayout`
 * itself. Writes no file.
 */
import { detectDocLayout } from "./lib/doc-detect";
import { detectStack, type DetectedStack } from "./lib/stack-detect";
import { isDirectCliEntry } from "./lib/cli-entry";
import {
	resolveConsumerRoot,
	parseConsumerFlag,
} from "./lib/consumer-root";
import type { DetectedDocLayout } from "./lib/onboarding-types";
import { resolveSelfPrismSource } from "./update";

export interface DetectReport {
	stack: DetectedStack;
	docLayout: DetectedDocLayout;
}

/**
 * Runs stack and doc-layout detection against `opts.consumerRepoRoot`. Pure
 * with respect to the process — no argv parsing, no stdout — so tests call
 * it directly against a temp-dir fixture.
 */
export async function runDetect(opts: {
	consumerRepoRoot: string;
}): Promise<DetectReport> {
	const [stack, docLayout] = await Promise.all([
		detectStack(opts.consumerRepoRoot),
		detectDocLayout(opts.consumerRepoRoot),
	]);

	return { stack, docLayout };
}

export async function runDetectCli(): Promise<void> {
	const argv = process.argv.slice(2);
	const consumerRepoRoot = resolveConsumerRoot({
		explicitConsumer: parseConsumerFlag(argv),
		cwd: process.cwd(),
		selfPrismRoot: resolveSelfPrismSource(),
	});

	const report = await runDetect({ consumerRepoRoot });
	console.log(JSON.stringify(report, null, 2));
}

if (isDirectCliEntry("detect")) {
	runDetectCli().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
