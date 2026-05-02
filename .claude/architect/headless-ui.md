# Headless UI Patterns

Traps and conventions for `@headlessui/react` components used in this codebase. Scope-gated — if the file you're touching doesn't import from `@headlessui/react`, nothing here applies.

The file exists because Headless UI's managed-container primitives share failure modes that aren't obvious from the library docs. Today there's one worked case; new gotchas land here as we hit them.

---

## Managed list containers only accept their declared item components

Headless UI's list containers — `<ComboboxOptions>`, `<MenuItems>`, `<ListboxOptions>` — are keyboard and focus state machines. Their only legitimate children are the library's matching item components (`<ComboboxOption>`, `<MenuItem>`, `<ListboxOption>`). Putting a non-item element inside — a filter row, an action button, a "view more" link — lets clicks pass through the container's managed event flow without participating in its selection semantics, and state meant to clean up on option-select can end up dangling.

**Why:** THR-1422 followup spent multiple debug sessions on a wheel and Tab lock on `/search` that only reproduced when navigating via a "View all Results" `<button>` rendered inside `<ComboboxOptions static>`. The click fired the handler, but Combobox state stayed in a condition that blocked scroll and Tab on the destination page until any click anywhere released it. Moving the button out of `<ComboboxOptions>` — still inside the visible dropdown panel, just as a sibling of the options container — fixed it.

**How to apply:**

- Inside a Headless UI managed list container, use only its matching item component as a child. `<ComboboxOptions>` → `<ComboboxOption>`, `<MenuItems>` → `<MenuItem>`, `<ListboxOptions>` → `<ListboxOption>`.
- Utility content — filter rows, action buttons, view-all links, headings, dividers — goes outside the managed container. If it belongs in the visible panel, make it a sibling of the options container inside the same panel wrapper, not a child.
- This applies even if the specific case seems to work. The failure mode is latent and reproduces only under specific navigation or focus conditions, which is what makes it expensive to debug.

### Anti-pattern

```tsx
<Combobox>
	<ComboboxInput />
	<ComboboxOptions static>
		<div>{filters}</div>
		{hits.map((h) => (
			<ComboboxOption key={h.id} value={h}>
				...
			</ComboboxOption>
		))}
		<button onClick={handleViewAll}>View all</button>
	</ComboboxOptions>
</Combobox>
```

### Preferred

```tsx
<Combobox>
	<ComboboxInput />
	<div className="panel">
		<div>{filters}</div>
		<ComboboxOptions static>
			{hits.map((h) => (
				<ComboboxOption key={h.id} value={h}>
					...
				</ComboboxOption>
			))}
		</ComboboxOptions>
		<button onClick={handleViewAll}>View all</button>
	</div>
</Combobox>
```

Visible layout is identical — but non-item content no longer sits inside the options state machine.

---

## Gotcha log

| Date | Container | Symptom | Fix |
| ---- | --------- | ------- | --- |
| 2026-04-22 | `ComboboxOptions` | Wheel/Tab lock on destination page after click on non-option child `<button>` | Move non-option children outside `ComboboxOptions`, keep them inside the visible panel wrapper. See `frontend/components/site-search/Autocomplete.tsx`. |
