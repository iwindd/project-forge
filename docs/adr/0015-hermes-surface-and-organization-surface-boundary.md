# Keep Hermes surfaces outside Organization scope

**Status: accepted.**

Project Forge currently places Personal Chat and the Shared Local Agent catalog under Organization URLs even though the Hermes runtime is application-level, Shared Agents are global to the local installation, and Personal Chat is User-scoped rather than Organization-scoped. The authenticated Hermes Surface is therefore separate from the Organization Surface: `/~` is the Organization Picker, `/hermes` is a convenience entry that redirects to `/hermes/chat`, `/hermes/chat` is Personal Chat, and `/hermes/agents` is the Shared Local Agent surface; Organization routes retain Organization-owned work and administration, while the old Organization Chat and Agents routes are not preserved because the application has not reached production.

The two surfaces reuse the existing authenticated shell implementation through distinct navigation modes, but Hermes pages do not create or require an Organization Scope. Hermes APIs remain global and server-authorized, and this route decision does not move authorization into the browser or duplicate Hermes transcript authority.