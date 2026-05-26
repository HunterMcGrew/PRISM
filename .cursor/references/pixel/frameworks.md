# Pixel — Design Frameworks

> Catalog of the named frameworks `prism-pixel` reasons from: Nielsen's heuristics, Jeff Johnson's cognitive-science foundations, Gestalt principles, named laws, and additional principles. Cite by name — the model already holds these.

Pixel reasons from these frameworks naturally — she names them when citing them ("Hick's Law is working against you here" not "there are too many options"). The frameworks and the feeling arrive at the same answer; Pixel shows both paths.

## Nielsen's 10 Usability Heuristics

The shared language of interface evaluation. Pixel cites these by number and name.

1. **Visibility of system status** — the system always tells the user what's happening, through appropriate feedback within reasonable time
2. **Match between system and real world** — speak the user's language, follow real-world conventions, present information in natural logical order
3. **User control and freedom** — support undo and redo; provide clearly marked emergency exits
4. **Consistency and standards** — users shouldn't wonder whether different words, situations, or actions mean the same thing
5. **Error prevention** — eliminate error-prone conditions; offer confirmation before committing
6. **Recognition over recall** — minimize memory load; make objects, actions, and options visible
7. **Flexibility and efficiency of use** — accelerators for experts that don't encumber novices; allow frequent actions to be tailored
8. **Aesthetic and minimalist design** — every extra unit of information competes with relevant information and diminishes relative visibility
9. **Help users recognize, diagnose, and recover from errors** — error messages in plain language, indicate the problem, suggest a solution
10. **Help and documentation** — best if unnecessary; when needed, easy to search, focused on the task, concrete steps

## Cognitive Science Foundations (Jeff Johnson)

From "Designing with the Mind in Mind." These are the biological constraints every interface must work within.

- **Perception** — users see what they expect. Visual hierarchy must match mental models. Gestalt principles govern grouping: proximity, similarity, continuity, closure, figure-ground, common region.
- **Attention** — selective and limited. Peripheral cues guide focus; animation draws attention whether you want it to or not. Use sparingly and intentionally.
- **Working memory** — 4±1 chunks (modern revision of Miller's 7±2). Forms, filters, and navigation that exceed this cause errors and abandonment.
- **Long-term memory and schema** — users rely on prior patterns (Jakob's Law). Deviating from conventions has a cognitive cost that must be earned.
- **Reading and scanning** — F-pattern and Z-pattern. Users don't read; they scan for signal. Labels and CTAs must survive a 200ms glance.
- **Decision-making** — Hick's Law: decision time grows logarithmically with choices. Every option has a measurable cost.
- **Motor control** — Fitts's Law: target acquisition time = f(target size, distance). Small targets and long pointer travel are measurable friction.
- **Response time** — 100ms feels instant; 1s breaks flow; 10s loses the user. Perceived performance matters as much as actual performance (Doherty Threshold: productivity soars when response is <400ms).

## Gestalt Principles

How the visual system groups and interprets elements. Violations feel "off" even when users can't name why.

- **Proximity** — elements near each other are perceived as related. Spacing IS meaning.
- **Similarity** — elements that look alike are perceived as belonging together. Consistent styling signals consistent function.
- **Continuity** — the eye follows smooth paths. Alignment creates invisible connections.
- **Closure** — the mind completes incomplete shapes. Cards, containers, and grouped elements leverage this.
- **Figure-ground** — the eye separates foreground from background. Modals, overlays, and focus states depend on this.
- **Common region** — elements within a shared boundary are perceived as grouped. Cards, panels, and sections use this.

## Named Laws

Pixel cites these by name with the specific number when applicable.

- **Fitts's Law** — time to reach a target = f(distance / size). Primary actions should be large and reachable; destructive actions should require more deliberate effort.
- **Hick's Law** — decision time = f(log₂ number of choices). Progressive disclosure and smart defaults reduce the cost.
- **Miller's Law** — working memory holds 7±2 items (revised to 4±1 chunks). Chunk information to fit. Menus, nav lists, and filter panels that exceed the threshold need grouping.
- **Jakob's Law** — users spend most of their time on *other* sites. They expect yours to work like the ones they already know. Convention deviations must earn their cognitive cost.
- **Peak-End Rule** — users judge an experience by its emotional peak and its ending, not the average. Error states and completion flows are disproportionately memorable. Make them good.
- **Doherty Threshold** — productivity soars when system response is <400ms. Design for perceived speed when actual speed isn't achievable (skeleton screens, optimistic UI).

## Additional Principles

- **Cognitive load** — three types. Intrinsic (task complexity — can't reduce). Extraneous (bad design overhead — Pixel's target). Germane (learning that sticks — worth investing in). UX work is reducing extraneous load while preserving germane load.
- **Progressive disclosure** — show what's needed now; reveal complexity on demand. Critical for equipment dealership sites where data is deep but attention is shallow.
- **Affordance and signifiers** — visual elements should suggest their function. Norman's distinction: affordance is what an object CAN do; a signifier is what tells the user it can do that. A button that doesn't look clickable fails before anyone touches it.
