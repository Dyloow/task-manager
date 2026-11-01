---
status: pending
---

# Instruction: CRUD server routes and API tests

## Architecture projection

```txt
.
├── server/
│   ├── api/tasks/
│   │   ├── index.get.ts        ✅ list tasks
│   │   ├── index.post.ts       ✅ validate body, create, 201
│   │   ├── [id].patch.ts       ✅ validate body, update, 404 if unknown
│   │   └── [id].delete.ts      ✅ remove, 204, 404 if unknown
│   └── utils/validation.ts     ✅ parseBody(event, schema): throws 400 with flattened Zod issues in data
├── vitest.config.ts            ✏️ add `e2e` project
└── test/e2e/tasks-api.test.ts  ✅ real HTTP calls against a built Nuxt server with in-memory storage
```

## User Journey

```mermaid
flowchart TD
  A[HTTP request /api/tasks] --> B{Body valid?}
  B -- no --> C[400 + issues]
  B -- yes --> D[Repository call]
  D -- unknown id --> E[404]
  D -- ok --> F[200 / 201 / 204]
  D -- throws --> G[500]
```

## Test Scope

```mermaid
---
title: Test scope
---
journey
  section Setup
    start Nuxt test server with memory storage => seeded API reachable: 5: system
  section Happy path
    GET /api/tasks => 200 with seeded list: 5: api
    POST valid task => 201 with created task: 5: api
    PATCH status of created task => 200 with new status: 5: api
    DELETE created task => 204 then absent from GET: 5: api
  section Edge case - invalid body
    empty title => POST /api/tasks => 400 with field issues: 1: api
  section Edge case - unknown id
    random id => PATCH or DELETE => 404: 1: api
  section Teardown
    stop test server => memory storage discarded: 5: system
```

## Tasks to do

### `1)` Validation helper

> One way to turn a bad body into a 400.

1. `parseBody` reads the body, `safeParse`s it, throws `createError({ statusCode: 400, statusMessage, data: { issues } })`.

### `2)` Routes

> Thin handlers: parse, call repository, map result to status.

1. GET returns the list.
2. POST sets 201 and returns the created task.
3. PATCH and DELETE read `id` via `getRouterParam`, 404 when the repository returns null; DELETE sets 204.
4. Unexpected errors bubble to Nitro as 500 without leaking internals.

### `3)` API tests

> Exercise real HTTP contracts.

1. Add `e2e` Vitest project (node env, longer timeout).
2. `setup()` from `@nuxt/test-utils/e2e` with `nitro.storage.tasks` overridden to the memory driver.
3. Cover the Test Scope journey.

## Test acceptance criteria

| Task | Acceptance criteria                                                        |
| ---- | -------------------------------------------------------------------------- |
| 1    | Invalid body returns 400 whose `data.issues` names the offending field      |
| 2    | Each route answers with the documented status code and body                 |
| 3    | `npm test` runs unit and e2e projects green; typecheck and build pass       |
