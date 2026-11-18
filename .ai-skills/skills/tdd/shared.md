# TDD

Holds the red-green loop and its anti-patterns in one place other skills can
point at, rather than restating them.

## The loop

Red, then green. Write a test that fails for the reason you expect, watch it
fail, then write the minimum code that makes it pass. A test written after the
implementation it verifies has already been contaminated by having watched the
implementation decide what "correct" means.

Tests verify behavior through public interfaces, not internals — call the
function, hit the endpoint, render the component, assert on the observable
result. A test that reaches into internal state or asserts on implementation
details breaks the moment the implementation changes shape, even when the
behavior it's supposed to guard didn't move.

**Test only at agreed seams.** A seam picked carelessly is a guess about
what's worth locking down, and a wrong guess either tests nothing that matters
or pins down something that was never meant to be stable. On a plan, the task's
`proof` names the seam. With no plan, pick the defensible seam, name it and the
alternative you rejected in your closing message, and proceed.

Refactoring is **not** part of this loop. Red-green is about making a new
behavior exist and proving it; changing the shape of already-passing code
without changing its behavior is a separate act with its own discipline, not a
phase inside this one.

## Test-first rules

Test-first is the default, and every task that changes behavior lands with a proof that fails without it. A docs or config task may have a proof that passes both before and after, and the plan marks `proof fails on main: yes` only on a task whose proof is a test that fails first.

- A new file gets tests.
- Untested code that a task changes gets characterization tests first.
- A bug fix's failing test lands before the fix.

A characterization test pins what the code does today, right or wrong. Commit it
passing before the task's own edit, so the change shows up as a behavior diff in
that test instead of as a surprise somewhere else.

For a bug fix, the failing test is its own earlier task, and that task carries
`proof fails on main: yes`. The marker records that the proof is expected to
fail until the fix lands.

## Changing an existing test

Add tests freely. Change or delete a line of a test file that already exists
only when the task's `files:` names that file and the task carries
`behavior change:` saying what changed and why.

Never edit a test to make it pass. A test that goes red after your change is
reporting either a regression or a behavior change, and only the plan can say
which. When the task doesn't permit the edit, stop and return `needs-replan`
naming the test.

## Test efficacy

A test that can't fail proves nothing, and it reads exactly like one that
holds. Before you report a new test as a proof, run a mutation check: back up
the file the test covers, break what the test pins, confirm the test goes red,
then restore the file. Run `git diff` after both steps, once to confirm the
mutation landed and once to confirm the restore left no change.

## Three anti-patterns, each with its tell

None of these announce themselves — a suite full of them still shows green and
still looks like coverage. Check for the tell, not the intent.

**Implementation-coupled tests.** The tell: a refactor breaks the test even
though the behavior didn't change. The test asserts on how the code does
something (a call count, an internal method, a specific intermediate shape)
rather than what it produces. Fix by re-anchoring the assertion on the public
interface's observable output.

**Tautological tests.** The tell: the assertion recomputes the expected value
the same way the code under test does, so the two can never disagree — the
test passes for any input, correct or not. Expected values need an independent
source: a hand-computed constant, a fixture, a known answer from outside the
code being tested — never the same formula copied into the test.

**Horizontal slicing.** The tell: all the tests get written, then all the
implementation, verifying imagined behavior that hasn't been built yet and
often doesn't match what gets built. Work in vertical slices instead — one
test, then the one piece of implementation that turns it green, each slice a
tracer bullet through the real system rather than a rehearsal for one.
