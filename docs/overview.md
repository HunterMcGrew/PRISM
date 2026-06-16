---
title: "PRISM Overview"
description: "What PRISM is, who it's for, and why teams adopt it."
category: "overview"
audience: "developer-user"
last_updated: "2026-06-16"
---

# PRISM Overview

PRISM is a multi-platform AI toolkit for Claude Code, Codex, and Cursor. It ships named-persona skills, opinionated engineering rules, and a parameterization layer that adapts everything to your team's codebase — so your AI tools behave consistently, carry your conventions, and hand work off between each other without losing context.

## What problem it solves

Out of the box, AI coding tools have no memory of your team's decisions, no shared handoff protocol between agents, and no way to enforce consistent review or documentation standards across sessions. Every conversation starts cold.

PRISM addresses this by giving each AI tool a set of personas — specialists with defined roles, defined inputs, and defined outputs. When Winston plans architecture, Clove implements it, Briar reviews it, and Eli documents it, each one picks up where the last left off. The branch plan carries context across sessions; the tier system carries conventions across the codebase.

## What you get

- **Named personas** — each owning a domain (architecture, implementation, review, debugging, documentation, and more). See [personas.md](./personas.md) for the full reference.
- **Multi-platform skill generation** — author once in `.ai-skills/`, generate platform-specific outputs for Claude Code, Codex, and Cursor.
- **A tiered context system** — rules load at the right scope: universal rules always, path-scoped rules when the diff touches their domain, skill-internal rules when the skill fires. See [SPEC.md](../.prism/SPEC.md) for the tier detail.
- **Per-team parameterization** — your org name, ticket prefix, GitHub repo, and tech stack flow through the install. See [parameterization.md](./parameterization.md) for the config reference.
- **Templates** — PR descriptions, acceptance criteria, bug reports, and standup summaries shaped for cross-team consistency.

## How teams adopt it

PRISM lives as a sibling repo next to your codebase, not inside it. You pull it down once, run the build, then invoke Atlas (the onboarding persona) from inside your target repo. Atlas detects your stack, asks the questions it needs, and writes a customized `.claude/`, `.codex/`, or `.cursor/` setup into your repo.

The workflow after that is persona-driven: Winston for architecture, Clove for implementation, Briar and Eric for review, Eli for documentation. Each persona reads the branch plan to pick up context, and writes back to it when decisions are made.

## Going deeper

The technical record for every architectural decision lives in [`.prism/spec/adrs/`](../.prism/spec/adrs/). The tier system, promotion pathways, and spec ownership model are in [`.prism/SPEC.md`](../.prism/SPEC.md). Start there if you want to understand why PRISM is shaped the way it is.
