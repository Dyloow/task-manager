---
status: done
---

# Instruction: Visual direction, responsive and a11y pass

## Architecture projection

```txt
.
├── app/assets/css/main.css      ✏️ @theme tokens (palette, font, radii) for the chosen direction
├── app/app.vue                  ✏️ html lang="fr", font loading if any, page title
├── app/components/*.vue         ✏️ final Tailwind styling
└── aidd_docs/memory/design.md   ✏️ record the chosen direction and tokens
```

## User Journey

```mermaid
flowchart TD
  A[Mobile 375px] --> B[Single column, form toggle, scrollable tabs]
  C[Desktop 1280px] --> D[Sticky form left, list right]
  B --> E[Keyboard: visible focus on every control]
  D --> E
```

## Test Scope

```mermaid
---
title: Test scope
---
journey
  section Setup
    npm run dev with seeded data => app reachable on localhost:3000: 5: system
  section Happy path
    open / at 375px => no horizontal scroll, all actions reachable: 5: browser
    open / at 1280px => two-column layout, form sticky: 5: browser
    tab through the page => every control shows a visible focus ring: 5: browser
  section Edge case - long content
    task with a 120-char title and long description => text wraps, layout intact: 1: browser
  section Teardown
    delete .data/tasks => seed restored: 5: system
```

## Tasks to do

### `1)` Direction

> A calm, precise product UI, not a template.

1. Load the `impeccable` skill (Operate mode) and `frontend-design`; pick a restrained direction with one accent color, a distinctive but readable type pairing, status and priority encoded by label + subtle color.
2. Declare tokens with `@theme` in `main.css`; Tailwind utilities only, no custom CSS beyond tokens.

### `2)` Responsive and a11y

> Works at 375px and 1280px, keyboard and screen reader friendly.

1. Apply the wireframe layouts; tabs scroll horizontally on mobile.
2. `lang="fr"`, labels on every control, focus-visible rings, AA contrast, `aria-live` for the banner.
3. Verify by rendering at 375px and 1280px (screenshots), fix what one look shows, then look again.

### `3)` Memory

> Keep `design.md` true.

1. Record direction, token location and component patterns.

## Test acceptance criteria

| Task | Acceptance criteria                                                       |
| ---- | ------------------------------------------------------------------------- |
| 1    | The UI has a coherent identity with tokens declared once in `main.css`     |
| 2    | No horizontal scroll at 375px; every control reachable and focus-visible  |
| 3    | `design.md` matches the shipped UI; typecheck, tests and build pass        |
