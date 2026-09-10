# Separate authentication from organization context

**Status: accepted.** `/auth/me` returns identity, profile, and session state only. `/organizations` returns the user's organizations, memberships, stable role codes, display labels, and permissions. The server session has no active organization, and the selected organization is resolved from the application route/request context.
