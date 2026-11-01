# Testing

## Strategy

- Unit: server repository, Zod schemas, pure helpers, in plain Node.
- Nuxt runtime: Pinia store actions (optimistic update and rollback) and key components, with `$fetch` mocked.
- No e2e suite; the browser journey is checked manually.

## Tools

- Vitest, split into two projects in `vitest.config.ts`: `unit` (node) and `nuxt` (Nuxt environment via `@nuxt/test-utils`).
- `@vue/test-utils` and `mountSuspended` for components, `registerEndpoint` or `vi.fn` to mock routes.

## Conventions

- Files end in `.test.ts`, placed under `test/unit/` or `test/nuxt/` mirroring the source path.
- Test behavior and error paths (invalid payload, unknown id, failed request), not markup details.

## Run

- `npm test` runs both projects; `npx vitest run --project unit` for one.

## Browser QA

- Entry: `npm run dev`, then `http://localhost:3000`.
- Auth: none.
- State: delete the data file under `.data/` to reseed from `server/data/`.
