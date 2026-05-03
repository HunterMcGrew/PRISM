# Documentation Callouts

GitHub alert syntax for callout boxes in `docs/` pages. The Nextra site renders these as styled boxes with colored borders and icons. They're supported because `remark-github-alerts` is configured in `docs/next.config.mjs` and the CSS is imported in `docs/app/layout.jsx`.

## Syntax

```markdown
> [!NOTE]
> Content here. Can span multiple lines.
> Each line must start with `> `.
```

Five types are available, ordered from least to most urgent:

---

## NOTE (blue)

**Use for:** Background context the reader should know, even when skimming. Supplementary information that isn't part of the main flow.

**When to use:**
- Credentials or secrets the reader needs to get from someone else
- Context about why something works a certain way
- Scope limitations ("this only applies to X")
- Grandfathered behavior or historical context

**Examples from the codebase:**

From `local-setup-mac.md` — secrets the reader can't find on their own:
```markdown
> [!NOTE]
> Ask another developer for the Space Station API key and the storage account key. These are not committed to the repository.
```

From `code-standards.md` — grandfathered behavior:
```markdown
> [!NOTE]
> Existing camelCase functions and methods in the PHP codebase are grandfathered. New code and code being modified should use snake_case.
```

From `recaptcha-setup.md` — credential source:
```markdown
> [!NOTE]
> Contact the team lead for the Secret Key value.
```

---

## TIP (green)

**Use for:** Helpful shortcuts, best practices, or "you could also do this" suggestions. The reader can skip these and still succeed — they just make life easier.

**When to use:**
- Alternative approaches that save time
- Editor shortcuts or tools that help
- "Pro tip" style advice for experienced users

**Examples from the codebase:**

From `tailwind-snippets.md` — a tool that helps:
```markdown
> [!TIP]
> Use [Tailwind Play](https://play.tailwindcss.com/) to preview and edit snippets before pasting them into WordPress.
```

From `scrolling-images-embed.md` — tuning advice:
```markdown
> [!TIP]
> The right animation speed depends on how many images you have. Start with `20s` and adjust up or down. Always use seconds (e.g. 4 minutes = `240s`).
```

---

## IMPORTANT (purple)

**Use for:** Key information the reader must know to achieve their goal. Not dangerous if missed, but the feature won't work correctly without it.

**When to use:**
- Steps that are easy to forget but required
- Configuration that must happen in a specific order
- Requirements that aren't obvious from the UI

**Examples from the codebase:**

From `colophon.md` — required follow-up step:
```markdown
> [!IMPORTANT]
> After saving the template, clear the cache so the changes appear on every page.
```

From `local-setup-mac.md` — SSL cert requirement:
```markdown
> [!IMPORTANT]
> When prompted to install the OrbStack SSL certificate to your keyring, make sure to do this. Local HTTPS won't work without it.
```

From `scrolling-images-embed.md` — accessibility requirement:
```markdown
> [!IMPORTANT]
> The embed includes a `prefers-reduced-motion` media query. Do not remove it — it pauses the animation for users who have motion reduction enabled in their OS settings.
```

---

## WARNING (yellow)

**Use for:** Something that could cause unexpected results or wasted effort if the reader isn't careful. The action itself isn't destructive, but the outcome might not be what they expect.

**When to use:**
- Data that might look wrong if a prerequisite is missed
- Settings that interact in non-obvious ways
- Conditions where the feature behaves differently than expected

**Examples from the codebase:**

From `update-option-prices.md` — pricing interaction:
```markdown
> [!WARNING]
> If discounts are applied to the composite or bundle products, keep them in mind when updating individual option prices. The final price the customer sees will reflect both the option price and any active discount.
```

From `tailwind-snippets.md` — class not rendering:
```markdown
> [!WARNING]
> If a Tailwind class doesn't render on the frontend, it may need to be safelisted. Open a feature request and the team will add it.
```

---

## CAUTION (red)

**Use for:** Actions that are destructive, irreversible, or could break something. The reader needs to stop and think before proceeding.

**When to use:**
- Data loss risk (overwriting, deleting, replacing)
- Actions that affect live/production sites
- Import operations that can't be undone
- Breaking changes in dev docs

**Examples from the codebase:**

From `import-products.md` (hypothetical — warranted for this content):
```markdown
> [!CAUTION]
> Importing products with existing IDs will overwrite the current product data. Export a backup before importing if you're updating existing products.
```

For dev docs — server/client boundary violation:
```markdown
> [!CAUTION]
> Never import `ServiceFactory`, `@apollo/client`, or other server-only modules in `"use client"` files. This pulls heavy server dependencies into the browser bundle and will break the build.
```

---

## Decision guide

| Ask yourself... | Use |
|----------------|-----|
| "Nice to know, but not critical" | NOTE |
| "This makes it easier" | TIP |
| "They need this or it won't work" | IMPORTANT |
| "They might get unexpected results" | WARNING |
| "They could break something or lose data" | CAUTION |

## Rules

- **One callout per concern.** Don't stack multiple callouts back-to-back — it creates visual noise and the reader stops reading them.
- **Keep callouts short.** 1-3 sentences. If you need a paragraph, it's probably body content, not a callout.
- **Most pages should have 1-3 callouts.** Beyond 3, each additional callout must earn its place — ask whether the information could live in the body text instead. A page with 5+ callouts is a signal the page is covering too much ground and may need splitting.
- **Callouts are not a substitute for good writing.** If the main text is clear, you don't need a callout to repeat it louder.
- **WARNING and CAUTION should be rare.** If everything feels urgent, nothing is. Reserve these for genuine risk.
