# Testing

## Strategy

- Unit: server repository, Zod schemas, pure helpers, in plain Node.
- Nuxt runtime: Pinia store actions (optimistic update and rollback) and key components, with `$fetch` mocked.
- e2e: the tasks API over real HTTP against a built Nuxt server with in-memory storage — happy paths, validation errors (field and root issues), unknown-id 404s, and 20-parallel-request concurrency.

## Tools

- Vitest, split into three projects in `vitest.config.ts`: `unit` (node), `nuxt` (Nuxt environment via `@nuxt/test-utils`), and `e2e` (node, longer timeouts, real server via `@nuxt/test-utils/e2e`).
- `@vue/test-utils` and `mountSuspended` for components, `registerEndpoint` or `vi.fn` to mock routes.
- e2e starts with `setup({ server: true, nuxtConfig: { nitro: { storage: { tasks: { driver: 'memory' } } } } })` and issues real HTTP calls with `fetch` from `@nuxt/test-utils/e2e`.

## Conventions

- Files end in `.test.ts`, placed under `test/unit/`, `test/nuxt/` or `test/e2e/` mirroring the source path.
- Test behavior and error paths (invalid payload, unknown id, failed request), not markup details.

## Run

- `npm test` runs all three projects; `npx vitest run --project unit` (or `nuxt`, `e2e`) for one.

## Browser QA

- Entry: `npm run dev`, then `http://localhost:3000`.
- Auth: none.
- State: delete the data file under `.data/` to reseed from `server/data/`.
