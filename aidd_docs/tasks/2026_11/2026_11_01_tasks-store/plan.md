---
objective: "A Pinia store owns the task list, hydrated by SSR on first render, with optimistic mutations that roll back on server errors."
status: implemented
---

# Plan: Tasks store and SSR load

## Overview

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| **Goal**   | Pinia task store, typed API error handling, SSR initial load on `/`   |
| **Source** | Text: step 2/4 of the technical test (state + SSR), builds on `feat/tasks-api` |

## Phases

| #   | Phase                                   | File                         |
| --- | --------------------------------------- | ---------------------------- |
| 1   | Task store with optimistic mutations    | [`phase-1.md`](./phase-1.md) |
| 2   | SSR initial load on the home page       | [`phase-2.md`](./phase-2.md) |

## Resources

| Source                                                   | Verified                                                              |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| https://pinia.vuejs.org/ssr/nuxt.html                    | `@pinia/nuxt` serializes store state into the SSR payload             |
| https://nuxt.com/docs/api/composables/use-async-data     | `useAsyncData` runs on the server, does not refetch on hydration      |
| `node_modules/@nuxt/test-utils/dist/runtime-utils/index.d.mts` | `registerEndpoint`, `mountSuspended` available in the nuxt project |

## Decisions

| Decision                                                              | Why                                                                                  |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Status update and delete are optimistic with rollback; create waits for the server | The UI feels instant where the outcome is predictable; create needs the server id |
| Filters live in the store as state, the page syncs them with the URL query | One place computes the visible list; the URL stays shareable                        |
| API errors normalized into one `ApiError` shape (`message`, `fieldErrors`, `formErrors`, `statusCode`) | Components display errors without knowing fetch internals            |
