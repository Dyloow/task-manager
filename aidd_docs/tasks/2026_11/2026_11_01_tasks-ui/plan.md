---
objective: "A user can view, create, change the status of, delete and filter tasks in a clean, responsive, accessible French interface built with Tailwind only."
status: implemented
---

# Plan: Tasks user interface

## Overview

| Field      | Value                                                                    |
| ---------- | ------------------------------------------------------------------------ |
| **Goal**   | Full task UI on top of the store: create form, task cards, filters, feedback |
| **Source** | Text: step 3/4 of the technical test (interface), builds on `feat/tasks-store` |

## Phases

| #   | Phase                                     | File                         |
| --- | ----------------------------------------- | ---------------------------- |
| 1   | Components and interactions               | [`phase-1.md`](./phase-1.md) |
| 2   | Visual direction, responsive and a11y pass | [`phase-2.md`](./phase-2.md) |

## Decisions

| Decision                                                            | Why                                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| UI copy in French, code and API values in English                   | The brief and the audience are French; enum values stay stable identifiers           |
| Filter ↔ URL sync moved into one `useTaskFilters` composable with a single immediate `route.query` watcher | Removes the anti-loop flag and the setup-time branch flagged in step 2 review; one direction of truth: URL → store |
| Presentational components (props + emits), only the page talks to the store | Components stay testable and reusable, as stated in `design.md`                       |
| Delete asks for a second click on the same button instead of a modal | Prevents accidental deletes without extra UI weight                                   |
