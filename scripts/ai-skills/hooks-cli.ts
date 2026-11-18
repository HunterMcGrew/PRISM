/**
 * `prism hooks install` — points git at PRISM's `.githooks/` in a consumer
 * clone.
 *
 * Every outcome exits 0, `left-alone` included. A repo whose `core.hooksPath`
 * belongs to husky or lefthook is set up correctly in its own way, so the
 * command reports the value it left alone on stderr and does not fail the
 * `prepare` script or CI step that called it.
 */
import { installGitHooks } from "./hooks/git-hooks/install.mjs";
import { isDirectCliEntry } from "./lib/cli-entry";
import { parseConsumerFlag, resolveConsumerRoot } from "./lib/consumer-root";
import { resolveSelfPrismSource } from "./update";

const USAGE = "Usage: prism hooks install [--consumer <path>]";

/**
 * @param argv the arguments after `hooks`, e.g. `["install", "--consumer", "."]`
 */
export async function runHooksCli(argv: string[]): Promise<void> {
	if (argv[0] !== "install") {
		console.error(USAGE);
		process.exitCode = 1;

		return;
	}

	const consumerRepoRoot = resolveConsumerRoot({
		explicitConsumer: parseConsumerFlag(argv),
		cwd: process.cwd(),
		selfPrismRoot: resolveSelfPrismSource(),
	});
	const { action, message } = installGitHooks(consumerRepoRoot);

	if (action === "left-alone") {
		console.error(message);
	} else {
		console.log(message);
	}
}

if (isDirectCliEntry("hooks-cli")) {
	runHooksCli(process.argv.slice(2)).catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
