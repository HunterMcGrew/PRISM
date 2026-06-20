import { defineSandbox } from "eve/sandbox";
import { docker } from "eve/sandbox/docker";

export default defineSandbox({
  backend: docker(),
  revalidationKey: () => "changelog-repo-bootstrap-v1",
  async bootstrap({ use }) {
    const sandbox = await use();
    await sandbox.run({
      command:
        "git clone https://github.com/HunterMcGrew/PRISM.git .",
    });
  },
  async onSession({ use }) {
    const sandbox = await use();
    await sandbox.run({
      command:
        "git fetch origin && git reset --hard origin/main",
    });
  },
});
