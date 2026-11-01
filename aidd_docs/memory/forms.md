# Forms

## Approach

- Native `v-model` forms, validated with the shared Zod schema before submit; the server validates again.

## Conventions

- Errors displayed inline under each field, submit disabled while pending.
- A failed request keeps the user input and shows the server message.
