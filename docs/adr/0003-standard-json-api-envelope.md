# Standard JSON API envelope

**Status: accepted.** JSON application endpoints use `{ data, meta? }` for success and `{ error: { code, message, details, requestId } }` for failure. Mutations return the success envelope, including `{ data: null }` when no resource is needed, rather than introducing a separate `204` client path. Binary exports remain file responses, but failures use the same error contract so browser and server clients can handle API errors consistently.
