---
title: Fixture plan
ticket: ACME-1
stage: plan
status: draft
---

## Tasks

### T1: Change part 1

- files: src/blocks/foo/view.tsx, src/blocks/foo/view.test.tsx
- proof: node --test part1.test.mjs -> 1 passed
- depends on: none

### T2: Change part 2

- files: src/blocks/foo/schema.ts
- proof: node --test part2.test.mjs -> 1 passed
- depends on: none

### T3: Change part 3

- files: src/contracts/shape.ts
- proof: node --test part3.test.mjs -> 1 passed
- depends on: none

## Challenge

round 1: clean
round 2: clean

## Decisions

## History
