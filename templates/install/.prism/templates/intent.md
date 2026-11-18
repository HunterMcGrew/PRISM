---
title:
ticket:
stage: intent
status: draft
size:
---

<!--
Copy this file to .prism/plans/<ticket>/intent.md as is, then fill each section. Only a script changes status.

Frontmatter:
- title: a short name for the work.
- ticket: the ticket ID or URL from your tracker. Plan lookup reads this line.
- size: standard or epic. Use epic only inside an epic-<id>/ folder, for work split into several stories under one tracker parent.
- Leave status at draft. Only the approval script changes it, after the person approves.

The approval script reads the section headings below by name, so keep them exactly as written.
-->

## Problem

<!-- What is wrong or missing today, and who it hurts. -->

## Proposed outcome

<!--
What is true once this ships, stated as behavior someone can observe.
Non-functional constraints go here too, such as contrast, performance, or type safety.
-->

## Regression surface

<!--
What existing behavior this change could break, and how we would notice.
Required. Write "none — <why>" only when nothing existing can break, and say why.
A bare "none" fails approval.
-->

## Security surface

<!--
What this change exposes: user input, auth, secrets, new endpoints, third-party scripts.
Required. Write "none — <why>" only when nothing is exposed, and say why.
A bare "none" fails approval.
-->

## Design

<!--
Open with one of three words, then a reason:
- needed — new UI with no approved mock. The design stage runs, and its design.md needs approval.
- supplement — an approved mock exists but has gaps. Add "approval: required" or "approval: not-required".
- not needed — no UI change, or the approved mock covers it.
-->

## Acceptance criteria

<!--
Use the format in .prism/templates/acceptance-criteria.md: each criterion gets a stable ID and an Evidence line.
Only an epic intent may write "none — <why>", because its children carry the criteria.
-->

## Open questions

<!-- Anything a person has to answer before the spec starts. Write "none" when there are none. -->
