# Writing a Skill

A skill is a function a session runs: the policy for one job, and a defined
lane of what it does and does not touch. This guide covers authoring one — the
layout the body follows, and the naming rule that keeps your skills and
PRISM's from colliding.

Every line should pass four tests. It encodes policy the model would not apply
unprompted. The `description` fires the skill reliably. The body, plus every
file it tells a run to read, stays short enough to follow. Anything that must
always hold is enforced by a hook or a check. A line that fails is cut, not
moved into a reference, because a run that is told to read the reference pays
for it anyway.

---

## The body layout

A skill body reads top to bottom in the order a session needs it.

1. **What it does.** One line naming the job and the artifact it produces.
   There is no persona and no voice; the session answers in its own voice.
2. **Startup.** Only what this job needs that the always-on rules don't
   already cover, such as a file it reads or a state it checks. Each item
   names what goes wrong if the session skips it.
3. **The work.** The procedure, in the order it runs, as PRISM-specific
   policy: formats, gates, owners. Leave out method the model applies
   without being told.
4. **Boundaries and handoff.** What the skill does not do, and which skill to
   route to instead. This is what keeps lanes from blurring.
5. **Close.** What the session leaves behind — files written, plan updated,
   evidence for anything claimed done.

Write for a competent reader who has never run this skill. Every instruction
carries its reason, for the same cause a rule does: an instruction whose reason
is missing gets skipped in the edge case it was written for.

## Namespace ownership

**The `prism-*` prefix belongs to PRISM.** Every skill PRISM ships is named
`prism-<something>`, with one exception: `tdd` keeps the bare name it shipped
under. Every update rewrites those directories from the current
roster. A skill of yours that borrows the prefix is at risk of being
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

## Where `prism-forge-skill` fits

`prism-forge-skill` is the utility that scaffolds skills. It runs in two modes:

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
