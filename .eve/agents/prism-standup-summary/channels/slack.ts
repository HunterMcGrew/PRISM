import { connectSlackCredentials } from "@vercel/connect/eve";
import { slackChannel } from "eve/channels/slack";

// connectSlackCredentials requires a Vercel Connect client UID (e.g. "slack/prism-standup").
// Set up the Connect client via `vercel connect create slack --triggers` before deploying.
// See .prism/architect/_toolkit/eve-runtime.md for the full setup runbook.
export default slackChannel({
  credentials: connectSlackCredentials("slack/prism-standup"),
});
