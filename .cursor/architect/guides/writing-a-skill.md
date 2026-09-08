# Writing a Skill

A skill is a persona or an action a session can step into: a body of
instructions, a voice, and a defined lane of what it does and does not touch.
This guide covers authoring one — the layout the body follows, and the naming
rule that keeps your skills and PRISM's from colliding.

---

## The body layout

A skill body reads top to bottom in the order a session needs it.

1. **Identity and pronouns.** Who this persona is, in one opening line, with
   declared pronouns. A deliberately persona-less utility declares nothing —
   the absence is how a reader tells the two apart.
2. **Voice.** How the persona talks and what it cares about. Two or three
   sentences; a page of characterization is a page nobody reads.
3. **Startup.** What has to be known before work begins — the plan, the repo's
   conventions, the source of the task. State each one as a consequence: what
   goes wrong if the session skips it.
4. **The work.** The actual procedure, in the order it runs.
5. **Ownership and handoff.** What the persona does not do, and who to route
   to instead. This is what keeps lanes from blurring.
6. **Close.** What the session leaves behind — files written, plan updated,
   evidence for anything claimed done.

Write for a competent reader who has never run this skill. Every instruction
carries its reason, for the same cause a rule does: an instruction whose reason
is missing gets skipped in the edge case it was written for.

## Namespace ownership

**The `prism-*` prefix belongs to PRISM.** Every skill PRISM ships is named
`prism-<something>`, and every update rewrites those directories from the
current roster. A skill of yours that borrows the prefix is at risk of being
overwritten or swept as an orphan.

Your own skills use your own prefix — your team name, your product, anything
that is not `prism-`. Two things follow from that, and both are protections
rather than restrictions:

- **PRISM never writes outside its own namespace.** Your skills are not
  rendered, not updated, and not removed by an update.
- **Ownership is decidable from the name alone.** Nobody has to keep a list or
  check a marker to know whose skill a directory holds.

When you want to change how a PRISM persona behaves in your repo, adjust it
through the configuration and anchor points the install exposes, rather than by
editing the rendered skill body — a rendered body is regenerated on the next
update, and the edit disappears with it.

## Where `prism-skill-forge` fits

`prism-skill-forge` is the utility that scaffolds skills. It runs in two modes:

- **Create** — scaffolds a new skill from scratch with the layout above already
  in place, so a new skill starts consistent with the roster instead of
  converging on it later.
- **Migrate** — takes a skill that only exists as generated platform output and
  decomposes it back into canonical source, which is what makes it maintainable
  rather than a one-time paste.

Reach for it when you are adding a persona or bringing an existing one under
management. Editing generated output directly is the failure mode both modes
exist to prevent.

---

## Route-verify

When you edit a doc this guide governs, confirm the route still names it: check
the pattern in `.prism/architect/manifest.json` that should
match the path you touched, and run `prism doctor` if you are unsure whether it
still resolves.
