# Accessibility pass

Can everyone use what the diff changes? Trigger: the diff changes UI. Touch targets and contrast are findings, not polish.

Its enumeration unit, severity, finding shape, and coverage line are in `REVIEW.md`.

`.prism/rules/accessibility.md` owns the rule detail. This file is the list you confirm item by item, and each item cites the rule rather than restating it, so a rule change has one home to update. A manifest-matched architect doc on UX patterns adds to this list, and where it states a stricter value, that value wins.

## Checklist

- [ ] Semantic HTML used for its intended purpose (landmarks, headings, lists, tables) — see `.prism/rules/accessibility.md` § `Semantic HTML`
- [ ] All interactive elements are keyboard-operable — see `.prism/rules/accessibility.md` § `Keyboard Navigation`
- [ ] ARIA roles carry their required properties — see `.prism/rules/accessibility.md` § `ARIA`
- [ ] Modal focus is trapped on open and restored to the trigger on close — see `.prism/rules/accessibility.md` § `Keyboard Navigation`
- [ ] Loading, empty, error, and success states are all handled, not only the populated one
- [ ] Interactive targets are at least 24×24 CSS pixels, icon-only and close buttons included — see `.prism/rules/accessibility.md` § `Keyboard Navigation`
- [ ] No hover-only interactions (tap and focus equivalents exist) — see `.prism/rules/accessibility.md` § `Touch device pitfalls`
- [ ] `prefers-reduced-motion` respected for any animation — see `.prism/rules/accessibility.md` § `Color and Contrast`
- [ ] Color contrast meets the stated ratios, including at `:hover` and `:focus` — see `.prism/rules/accessibility.md` § `Color and Contrast`
- [ ] Color is not the sole information carrier — see `.prism/rules/accessibility.md` § `Color and Contrast`
- [ ] Focus indicators visible on all interactive elements — see `.prism/rules/accessibility.md` § `Keyboard Navigation`
- [ ] Drag interactions have a keyboard or single-pointer alternative — see `.prism/rules/accessibility.md` § `Keyboard Navigation`
- [ ] Error messages are specific and actionable, not "Something went wrong" — see `.prism/rules/accessibility.md` § `Forms`
- [ ] Status messages and live regions carry the correct ARIA role and exist from first render — see `.prism/rules/accessibility.md` § `ARIA`
- [ ] No dark patterns present (confirmshaming, false scarcity, hidden costs, bait-and-switch, misdirection)

Stack checks for this pass, when the repo has them: `.prism/review/stack/accessibility.md`.
