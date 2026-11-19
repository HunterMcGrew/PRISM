# Security

Does the diff weaken a trust boundary? Trigger: the diff changes executable code, or the intent's security surface is not "none".

Its enumeration unit, severity, finding shape, and coverage line are in `REVIEW.md`.

## Checklist

- **Security surface by name.** Check every item in the intent's security surface, per `.prism/templates/intent.md` § `Security surface`. Each one gets a verdict and the evidence behind it. A diff that exposes something the surface doesn't list is a finding too.
- **The repo's own security rules.** When a manifest-matched architect doc covers security, apply it to the diff and read its section on the patterns easiest to miss.
- **Configuration.** Correct values, no secrets, and safe defaults.

Then confirm each of these five by name, even when the docs were skimmed. Each one gets a verdict in the enumeration, or `n/a` with the reason when the diff has nothing of that kind.

- **Input validation.** Every input the diff reads from a request, a webhook, a file, or a third-party response is validated at the edge.
- **Output escaping.** Every value the diff renders, writes to a shell, or places in a query reaches a sink-safe output.
- **Auth checks.** Every new route, action, or privileged write checks who is calling before it acts.
- **Secrets.** No credential in code, fixtures, or committed files. A local-development value clears only when it is a throwaway for a service that runs on the developer's machine.
- **Every external call.** Each outbound request the diff adds validates the scheme and host it sends to.

Stack checks for this pass, when the repo has them: `.prism/review/stack/security.md`.
