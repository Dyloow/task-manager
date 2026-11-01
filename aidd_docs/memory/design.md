# Design

## System

- Tailwind utility classes only, no other CSS framework nor component library.
- Visual direction is decided with the `impeccable` and `frontend-design` skills before building UI.

## Direction

- Operate mode: a precision instrument, not a generic SaaS template. Flat surfaces (hairline `border-border`, no card shadows), one deliberate accent (`--color-accent`, a deep ink-teal) reserved for primary actions and the active filter, semantic `danger`/`amber` tokens for priority/error signaling.
- Type pairing: IBM Plex Sans for all UI text, IBM Plex Mono reserved for counts and numeric data (task counts, filter tab counts) — never decoration. Loaded via a Google Fonts `<link>` in `app/app.vue`; `font-sans`/`font-mono` utilities come from the `--font-*` tokens.
- `html lang="fr"`, page title "Tâches", set in `app/app.vue`.

## Tokens

- Theme tokens (colors, fonts, radii) declared with `@theme` in `app/assets/css/main.css`: `--color-canvas/surface/border(-strong)`, `--color-ink/-soft/-faint`, `--color-accent(-strong/-soft)`, `--color-danger(-strong/-soft)`, `--color-amber(-soft)`, `--font-sans`, `--font-mono`, `--radius-control`, `--radius-card`.
- `ink-faint` is for decorative or genuinely disabled use only (WCAG exempts disabled controls); any readable, non-disabled secondary text uses `ink-soft`, which holds ~6.7:1 contrast on white.

## Components

- Small presentational components (board, column, card, filters, form) driven by props and emits; only pages and containers talk to the store.
- Every async surface has loading, empty and error states.
- Status filter is a `role="group"` of `aria-pressed` toggle buttons (not `tablist`/`tab`: there is no tabpanel or roving tabindex), scrollable on mobile; priority uses a native `<select>`. On the board, the status filter selects which column(s) `TaskBoard` renders (not a row filter); priority narrows the cards inside each rendered column. Priority on a card is a small dot + text label (`TaskCard`), never color alone.
- A done task's title is struck through and muted (`text-ink-soft line-through`), its card on a slightly muted surface (`bg-canvas`) — still text-labelled in the edit modal's status select, color is never the only signal.
- `TaskBoard` lays out one `TaskColumn` per visible status: a flex row, `snap-x`/`snap-mandatory` with cards ~85vw wide on mobile (next column peeking), equal-width flex columns from `lg:`.
- Drag and drop: `vue-draggable-plus` (SortableJS) on a per-column local copy, never the store directly. `ghostClass`/`chosenClass` go straight to `classList.add`/`remove`, so each must be a single token — no space-separated utility pairs (e.g. not `"ring-2 ring-accent"`); an arbitrary-value utility works (`shadow-[0_0_0_2px_var(--color-accent)]`).
- Task creation and editing share one `TaskModal` (native `<dialog>`, `showModal()`/`close()`) and one `TaskForm` instance, reset (`resetForCreate`/`loadForEdit`) rather than remounted on each open. Delete asks for a second click on the same button (label flips to "Confirmer ?"), auto-cancelled after 4s or on blur, inside the modal rather than a nested confirmation dialog.

## Accessibility

- Semantic HTML (labels on inputs, buttons for actions), visible focus rings, WCAG AA contrast.
- Status and priority never conveyed by color alone: always a text label.
