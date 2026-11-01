# Database

## Setup

- No database by brief. Tasks persist in a JSON file through Nitro storage (`fs` driver), configured in `nuxt.config.ts`.
- Access only through the task repository in `server/utils/`.

## Conventions

- On first read, an absent data file is seeded from `server/data/`.
- Every write goes through one serialized queue: read, mutate, write, so concurrent requests never overwrite each other.
- The data file lives under `.data/` (git-ignored); deleting it resets the app to the seed.
