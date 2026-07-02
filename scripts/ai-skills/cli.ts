#!/usr/bin/env -S npx tsx
/**
 * Consumer-facing `prism` command — the single entry point a consumer repo
 * uses after linking PRISM globally (`pnpm link --global` from the PRISM
 * clone). Dispatches `prism adopt` and `prism update` to the existing
 * adopt/update mains without duplicating their logic. The PRISM source is
 * auto-derived from this script's own location (see `resolveSelfPrismSource`
 * in update.ts), so no `--prism-source` argument is needed; an explicit
 * `--prism-source` flag still overrides.
 *
 * The shebang runs `npx tsx` rather than bare `tsx` so the runtime resolves
 * from PRISM's own node_modules (this file's real path is inside the PRISM
 * clone even when invoked via a global symlink), not the consumer's PATH.
 */
import { runAdoptCli } from "./adopt";
import { runDoctorCli } from "./doctor";
import { runInitCli } from "./init";
import { runUpdateCli } from "./update";

const USAGE = `prism — PRISM consumer CLI

Usage:
  prism init     Write .ai-skills/config.json so this repo can adopt PRISM (run before adopt)
  prism adopt    Seed .prism/ and project the persona roster into this repo (first run)
  prism update   Pull PRISM's latest canonical content into this repo (steady-state)
  prism doctor   Report install health — config, git repo, sync state, version

Run from your consumer repo root. PRISM source is auto-derived from the linked
PRISM checkout; pass --prism-source <path> to override.

Pass --consumer <path> to target a specific consumer repo (defaults to the
current repo, or — when run from inside a vendored PRISM — the repo that
contains PRISM).`;

async function main(): Promise<void> {
	const subcommand = process.argv[2];

	switch (subcommand) {
		case "init":
			await runInitCli();
			break;
		case "adopt":
			await runAdoptCli();
			break;
		case "update":
			await runUpdateCli();
			break;
		case "doctor":
			await runDoctorCli();
			break;
		case "--help":
		case "-h":
		case undefined:
			console.log(USAGE);
			break;
		default:
			console.error(`prism: unknown subcommand "${subcommand}"\n`);
			console.error(USAGE);
			process.exit(1);
	}
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
