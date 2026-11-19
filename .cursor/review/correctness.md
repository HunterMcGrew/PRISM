# Correctness

Does the changed code do what it claims, on real inputs? Trigger: always.

Its enumeration unit, severity, finding shape, and coverage line are in `REVIEW.md`.

## Checklist

- **Run it.** Run the code against real inputs wherever it's runnable, instead of reading it and reasoning about what it would do.
- **External-system claims.** Check each one at its source: the vendor's documentation, the library's own code, or the live system. Where the source doesn't answer, write the limit down rather than guessing past it.
- **Logic.** Logic errors and edge cases: empty, null, boundary, and the input nobody planned for.
- **Type safety.** Where the language is typed, no `any`-style escapes, no unsafe casts, no missing types. Sweep the diff for value assertions. Two shapes are an automatic finding, test code included:
  - a **no-op cast**, where the value already satisfies the target type
  - a **silencing cast**, where a value the compiler rejects is cast so it compiles, instead of fixing the type or passing the real value

  Exempt: a constant assertion, narrowing untyped external data at a trust boundary, and a runtime-validation pattern that checks the value before it narrows.
- **Silent fallbacks.** A branch that quietly defaults, on `undefined` or `unknown` for example, to avoid confronting an unclear contract. Ask whether the boundary should be made explicit with a typed model or shared contract instead.
- **Dead code.** Unreachable branches, stray debug output, and debug artifacts.

## Focus by code type

| Code type             | Focus on                                                                           |
| --------------------- | ---------------------------------------------------------------------------------- |
| **Components**        | One reason to change, prop interface design, state management, accessibility       |
| **Utility functions** | Edge cases (empty, null, boundary), error handling, naming accuracy                |
| **Type definitions**  | Completeness, consistency with existing types, no unsafe escapes                   |
| **Tests**             | Behavior-not-implementation, assertion quality, edge case coverage, test isolation |
| **Configuration**     | Correctness, no secrets, safe defaults                                             |

Stack checks for this pass, when the repo has them: `.prism/review/stack/correctness.md`.
