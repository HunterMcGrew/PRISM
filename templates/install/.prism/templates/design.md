---
title:
ticket:
stage: design
status: draft
approval:
---

<!--
Copy this file to .prism/plans/<ticket>/design.md as is, then fill each section. Only a script changes status.

Frontmatter:
- title and ticket: copied from intent.md.
- approval: required or not-required, copied from the intent's Design section. "needed" always copies required. A supplement copies whatever the intent says.
- Leave status at draft. Only the approval script changes it, and only when approval is required.

Every wireframe names measurable units, such as design tokens or explicit px and rem. Every visual choice names the principle behind it, such as Hick's Law, Fitts's Law, a Nielsen heuristic by number, or a Gestalt principle by name. Name design sources, such as a design file or frame, in plain words.
-->

## User & Goal

<!-- One paragraph: who uses this, what they are trying to do, and why. -->

## Feeling

<!-- One or two sentences on what this screen should feel like. Every later choice is tuned against it. -->

## States

<!-- One ### subsection per state in the state list prism-design uses, each with an ASCII wireframe and annotations. -->

## Interaction notes

<!-- Keyboard flow, focus management, Tab order, modifier keys, and confirmation before anything destructive. -->

## Reused components

<!-- Each existing component or block this stitches together, with its file path. -->

## New patterns

<!-- Any net-new pattern, and why an existing one could not do the job. Write "none" when there are none. -->

## Accessibility notes

<!-- ARIA roles, focus traps, contrast, and reduced-motion behavior. -->

## Copy direction

<!-- The direction for each string, not the final string. For example: the delete confirmation reads as a pause, not a warning, so "Remove link" rather than "Delete link forever". -->

## Mobile behavior

<!-- How the design changes at mobile widths: content priority, interaction pattern, and touch targets. -->

## Open questions

<!-- Anything a developer, PM, or designer has to answer before the spec starts. -->

## Architectural inputs for the spec

<!--
What the spec needs from this design:
- Data flow: where state lives, where data is fetched, and what the source of truth is.
- Component boundaries: what is a new component and what reuses an existing one.
- Architectural concerns: a new shared component, a coupling risk, or a pattern that reaches past this screen.
-->
