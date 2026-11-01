# Design

## System

- Tailwind utility classes only, no other CSS framework nor component library.
- Visual direction is decided with the `impeccable` and `frontend-design` skills before building UI.

## Tokens

- Theme tokens (colors, fonts) declared with `@theme` in `app/assets/css/main.css`.

## Components

- Small presentational components (task card, badges, filters, form) driven by props and emits; only pages and containers talk to the store.
- Every async surface has loading, empty and error states.

## Accessibility

- Semantic HTML (labels on inputs, buttons for actions), visible focus rings, WCAG AA contrast.
- Status and priority never conveyed by color alone: always a text label.
