---
objective: "The task list is persisted in a JSON file and fully manageable through validated Nuxt server routes under /api/tasks."
status: in-progress
---

# Plan: Tasks server API

## Overview

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| **Goal**   | Shared task contract, JSON-file repository and CRUD routes with tests |
| **Source** | Text: step 1/4 of the technical test (server API)                     |

## Phases

| #   | Phase                                 | File                         |
| --- | ------------------------------------- | ---------------------------- |
| 1   | Shared contract and task repository   | [`phase-1.md`](./phase-1.md) |
| 2   | CRUD server routes and API tests      | [`phase-2.md`](./phase-2.md) |

## Resources

| Source                                              | Verified                                                         |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| https://nuxt.com/docs/guide/directory-structure/shared | `shared/` is importable from app and server through `#shared` |
| https://nitro.build/guide/storage                   | `nitro.storage` mounts an unstorage driver read with `useStorage` |
| `node_modules/h3/dist/index.d.mts`                  | `readValidatedBody` / `getRouterParam` signatures                |

## Decisions

| Decision                                                                 | Why                                                                                   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Repository built by a factory taking an unstorage `Storage`              | Unit tests inject an in-memory storage; routes inject `useStorage('tasks')`           |
| Whole list stored under one key, writes chained on a single promise queue | Read-modify-write stays atomic within the process, so concurrent requests never lose a write |
| Zod schemas in `shared/` are the single contract                         | Client and server validate with the same rules, no drift                              |
