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

- Small presentational components (task card, badges, filters, form) driven by props and emits; only pages and containers talk to the store.
- Every async surface has loading, empty and error states.
- Status filter is a `role="group"` of `aria-pressed` toggle buttons (not `tablist`/`tab`: there is no tabpanel or roving tabindex), scrollable on mobile; priority uses a native `<select>`. Priority on a card is a small dot + text label (`TaskCard`), never color alone.
- A done task's title is struck through and muted (`text-ink-soft line-through`), its card on a slightly muted surface (`bg-canvas`) — still text-labelled by its status select, color is never the only signal.
- Delete asks for a second click on the same button (label flips to "Confirmer ?"), auto-cancelled after 4s or on blur — no modal.

## Accessibility

- Semantic HTML (labels on inputs, buttons for actions), visible focus rings, WCAG AA contrast.
- Status and priority never conveyed by color alone: always a text label.
