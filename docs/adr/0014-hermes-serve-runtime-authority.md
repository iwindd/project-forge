# Hermes serve is the runtime authority behind Project Forge

**Status: accepted.**

## Context

Project Forge must become the primary browser interface for local Hermes use while adding Project, Feature, Spec, Ticket, Plan, and Implement governance. Reimplementing Hermes Sessions, agent loops, tool execution, profile configuration, interactive requests, or reconnect behavior would create two conflicting runtime authorities. The OpenAI-compatible API is intentionally a compatibility surface, and ACP is optimized for IDE clients.

## Decision

Project Forge connects server-side to `hermes serve` through the official TUI Gateway JSON-RPC/WebSocket protocol.

Hermes remains authoritative for Profiles, Sessions, transcript history, model execution, tools, skills, memory, tool approvals, clarify prompts, secret/vault prompts, reasoning events, and tool events. Project Forge is authoritative for User authentication, Platform Admin authorization for shared Agent mutations, Organization and Project access, local runtime lifecycle, Registered Workspaces, Feature/Spec/Ticket/Plan lifecycle, implementation authorization, notifications, and audit records.

The managed Hermes runtime and its Shared Local Agents are application-level resources of the local Project Forge installation, not User-owned or Organization-owned resources. Every authenticated User may discover and use the same ready Agent in Projects they can access. Only Platform Admins may create or configure shared Agents; Sessions and Runs remain scoped to their authenticated User or Project.

Project Forge supports two session modes:

- Personal Chat uses native Hermes behavior without Project workflow gates.
- Project Work links a native Hermes Session to a Project and Registered Workspace and applies explicit Product Confirmations before Tickets or implementation work advance.

The browser authenticates only to Project Forge. Hermes connection credentials remain server-side and encrypted at rest. Project Forge exposes a typed browser WebSocket that authorizes Session ownership and proxies ordered Hermes events and server requests. It never gives a reusable Hermes credential or arbitrary filesystem path to the browser.

Project Forge may start and monitor a local `hermes serve` process when Hermes is installed on the same host. Profile creation and configuration use the native `profiles.*` RPC methods instead of filesystem writes or arbitrary shell commands.

## Consequences

- The native Hermes protocol is a versioned external dependency and requires capability/version negotiation and contract tests.
- Reconnect must use Hermes event sequence and Session replay rather than a second transcript store.
- Project Forge stores Session references and domain metadata, not a competing copy of Hermes transcript authority.
- Tool permission and interaction semantics remain consistent with Hermes Desktop/TUI.
- Feature and Ticket confirmations remain separate from Hermes tool approvals.
- A remote-Gateway enrollment UX, per-User Agent namespaces, and multiple active Gateway hosts per local application remain deferred; shared local Agent discovery and use are part of the first release.
