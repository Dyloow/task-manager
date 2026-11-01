# API

## Style

- REST JSON over Nitro server routes, file-based in `server/api/tasks/`.
- Base path `/api`, no versioning.

## Resources

- `tasks`: list, create, partial update (status and fields), delete.

## Contracts

- Bodies are validated with the Zod schemas from `shared/`; an invalid body returns `400` with the issues in `data`.
- Unknown id returns `404`; unexpected failures return `500`. Errors are thrown with `createError` so the client receives `{ statusCode, statusMessage, data }`.
- Create returns `201` with the created task; delete returns `204`.
- Server generates `id`, `createdAt`, `updatedAt`; the client never sends them.
