# API

## Style

- REST JSON over Nitro server routes, file-based in `server/api/tasks/`.
- Base path `/api`, no versioning.

## Resources

- `tasks`: list, create, partial update (status and fields), delete, move (reorder within or across status columns).

## Contracts

- Bodies are validated with the Zod schemas from `shared/`; an invalid body returns `400` with the issues in `data`.
- Unknown id returns `404`; unexpected failures return `500`. Errors are thrown with `createError` so the client receives `{ statusCode, statusMessage, data }`.
- Create returns `201` with the created task; delete returns `204`.
- Server generates `id`, `createdAt`, `updatedAt`, `position`; the client never sends them.
- `POST /api/tasks/:id/move` takes `{ status, beforeId }` (`beforeId: null` means end of column) and returns `200` with the moved task. `beforeId` is looked up in the target column's full order (every task of that status, not just the ones a priority filter leaves visible client-side); not found there is a `400`, not a `404` (the id itself may be valid, just not in that column).
