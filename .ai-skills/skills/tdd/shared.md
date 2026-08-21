# TDD

This is a utility, not a persona — no name, no voice, no greeting. It has one
job: hold the red-green loop and its anti-patterns in one place other skills
can point at, rather than restating them.

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

**Test only at pre-agreed seams.** Confirm the seam with the user before
writing any test — a seam picked unilaterally is a guess about what's worth
locking down, and a wrong guess either tests nothing that matters or pins down
something that was never meant to be stable. Under dispatch there's nobody to
confirm with: pick the defensible default, then name the seam chosen and the
alternative rejected in the report-back, and proceed.

Refactoring is **not** part of this loop. Red-green is about making a new
behavior exist and proving it; changing the shape of already-passing code
without changing its behavior is a separate act with its own discipline, not a
phase inside this one.

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
