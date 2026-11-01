# Project Brief

## What it is

- A small task manager built as a technical interview test: list, create, update status, delete and filter tasks.
- Judged on readability, structure and maintainability more than feature count (3 to 4 hours budget).

## Why it exists

- Show mastery of the imposed stack: Nuxt SSR, server routes, Pinia state, Tailwind styling.
- Show care for data consistency and error handling between client and server routes.

## Domain language

| Term | Meaning |
| ---- | ------- |
| Task | A unit of work with a title, a description, a status and a priority |
| Status | `todo` (à faire), `in_progress` (en cours), `done` (terminée) |
| Priority | `low` (faible), `medium` (moyenne), `high` (élevée) |
| Filter | A client-side narrowing of the list by status and/or priority |

## Key features

- Tasks loaded server-side on first render (SSR) through a Nuxt server route.
- Create a task, change its status, delete it.
- Filter by status and priority.
- Responsive UI, mobile and desktop, styled with Tailwind only.
- Explicit error feedback when a server route call fails.
