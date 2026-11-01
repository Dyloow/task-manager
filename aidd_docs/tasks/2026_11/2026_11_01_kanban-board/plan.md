---
objective: "Tasks are managed on a Trello-like board: one column per status, drag and drop between and within columns with a persisted order, and a modal to create and edit a task."
status: implemented
---

# Plan: Kanban board

## Overview

| Field      | Value                                                                      |
| ---------- | -------------------------------------------------------------------------- |
| **Goal**   | Replace the list with a status board, persisted ordering, DnD and an edit modal |
| **Source** | Text: user request after step 4 (board, DnD with ordering, edit modal), answers: ordering persisted, status filter shows/hides columns, mobile horizontal snap scroll |

## Phases

| #   | Phase                                  | File                         |
| --- | -------------------------------------- | ---------------------------- |
| 1   | Persisted position and move endpoint   | [`phase-1.md`](./phase-1.md) |
| 2   | Board, drag and drop, store moves      | [`phase-2.md`](./phase-2.md) |
| 3   | Task modal, docs and memory            | [`phase-3.md`](./phase-3.md) |

## Resources

| Source                                       | Verified                                                          |
| -------------------------------------------- | ----------------------------------------------------------------- |
| https://vue-draggable-plus.pages.dev         | Vue 3 wrapper over SortableJS, touch support, groups between lists |
| https://developer.mozilla.org/docs/Web/HTML/Element/dialog | Native modal: focus containment, Esc to close, `::backdrop` |

## Decisions

| Decision | Why |
| --- | --- |
| Dedicated `POST /api/tasks/:id/move` with `{ status, beforeId }` | Ordering is computed once, on the server, inside the write queue; `beforeId` (null = end of column) stays correct when the priority filter hides cards or another move landed meanwhile, unlike a raw index |
| `position` is a per-column rank renumbered `0..n-1` after each move | Simple, readable, no float drift; the column is the unit of ordering |
| Stored tasks without `position` are normalized on read (rank by `createdAt` within each status) | Data written before this change still loads instead of being reported as corrupted |
| A failed move resynchronizes the board from the server (`fetchTasks`) | A move rewrites ranks of two columns; rebuilding a targeted inverse is error-prone, the server is the source of truth |
| SortableJS via `vue-draggable-plus` | Native HTML5 DnD has no touch support; the library is small and handles cross-list moves |
| Native `<dialog>` for the modal | Built-in focus management, Esc and backdrop, no extra dependency |
| Status filter keeps its single `status` query param and selects the visible column(s) | The brief's status filter stays visible and URLs from the list version keep working |
