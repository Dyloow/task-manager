# Coding Assertions

## Before commit

| Order | Command             | Checks          |
| ----- | ------------------- | --------------- |
| 1     | `npm run typecheck` | vue-tsc types   |
| 2     | `npm test`          | Vitest projects |

## Before push

| Order | Command         | Checks                   |
| ----- | --------------- | ------------------------ |
| 1     | `npm run build` | Nuxt production build    |

## Behavior

I fix is needed, spawn 1 agent per assertion to fix (e.g typechecking / tests / rules violated on category UI = 3 agents).
