# Organization-owned projects and explicit organization scope

**Status: accepted.** Projects belong to exactly one organization, and organization scope is selected by the application context rather than by session state or an implicit local preference. Organization roles are the authority source for organization-level administration, and active members of that organization can access its projects. Each organization has exactly one Owner; the current scope has no ownership transfer or assignment of another member as Owner. Projects are not shared independently between members, so there is no project role, project owner, or `project_members` authority source; `projects.ownerId` is removed. The `manageProject` organization permission governs project mutations.

This keeps ownership and authorization inside the organization boundary and prevents a stale or client-controlled active organization from selecting the authority context.
