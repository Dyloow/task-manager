# Architecture

## Stack

- TypeScript everywhere, Nuxt full-stack: Vue app in `app/`, Nitro server routes in `server/`.
- Pinia (`@pinia/nuxt`) for client state, Tailwind CSS (Vite plugin) for every style.
- Zod validates every payload entering a server route.

## How it fits together

```mermaid
flowchart LR
    Page[app/pages] --> Store[Pinia task store]
    Store -- "$fetch /api/tasks" --> Routes[server/api/tasks]
    Routes --> Repo[server/utils task repository]
    Repo --> File[(JSON file)]
    Shared[shared/ types + schemas] -.-> Store
    Shared -.-> Routes
```

## Key decisions

- Initial load runs on the server via `useAsyncData` calling the store action, so the store is hydrated in the SSR payload, not refetched on the client.
- Types and Zod schemas live once in `shared/` and are imported by both app and server: one contract, no drift.
- The server is the source of truth: the store applies a mutation optimistically and rolls back if the route fails.
- Writes to the JSON file are serialized through a single queue to keep the file consistent under concurrent requests.
- No separate backend nor database, by brief.

## Gotchas

- Code under `server/` never imports from `app/`, and `app/` never imports from `server/`; share through `shared/`.
- A store must not hold state at module level: on the server it would leak between requests. Use `defineStore` state only.
- `$fetch` inside SSR calls the route in-process; relative URLs work on both sides.
