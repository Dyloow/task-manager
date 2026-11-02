# Database

## Setup

- No database by brief. Tasks persist in a JSON file through Nitro storage (`fs` driver), configured in `nuxt.config.ts`.
- Access only through the task repository in `server/utils/`.

## Conventions

- On first read, an absent data file is seeded from `server/data/`.
- Every write goes through one serialized queue: read, mutate, write, so concurrent requests never overwrite each other.
- The data file lives under `.data/` (git-ignored); deleting it resets the app to the seed.
- Each task carries `position`: an integer rank scoped to its status column, renumbered `0..n-1` on every create, status change, delete or move in that column. The column is the unit of ordering; there is no cross-column rank.
- A task stored before `position` existed is not corrupted data: on read, any column holding such a task is ranked by `createdAt` instead, and every task leaves the repository with a `position` set.
