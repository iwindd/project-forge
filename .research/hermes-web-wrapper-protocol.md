# Hermes web-wrapper protocol research

## Question

Which official Hermes integration surface should Project Forge use to replace the normal Hermes chat application while preserving realtime responses, reasoning, tool activity, interactive questions, approvals, sessions, reconnects, and profile management?

## Finding

Use the TUI Gateway JSON-RPC protocol over WebSocket, hosted by `hermes serve`, behind a Project Forge server-side adapter.

The official integration guide identifies three supported protocols:

- ACP over stdio for IDE clients.
- TUI Gateway JSON-RPC over stdio or WebSocket for custom hosts that need fine-grained sessions, slash commands, approvals, questions, and streaming events.
- OpenAI-compatible HTTP/SSE for generic clients.

The same guide explicitly recommends TUI Gateway JSON-RPC for a custom desktop, web, or TUI host that needs every Hermes feature. Project Forge is that kind of host.

Source: [Hermes Programmatic Integration](https://hermes-agent.nousresearch.com/docs/developer-guide/programmatic-integration)

## Why not the OpenAI-compatible API

The HTTP API provides standard chat completions, Responses, asynchronous runs, lifecycle SSE, approval resolution, steer, stop, capabilities, and model inventory. It is appropriate for generic language-agnostic clients, but it does not expose the complete native host interface used by Hermes Desktop/TUI.

Project Forge requires the complete bidirectional interaction surface, including slash commands, session branching, queued input, all open interactive requests, profile management, reconnect replay, and native tool/reasoning events. Building those separately on top of the compatibility API would duplicate Hermes behavior and drift from the native client contract.

Source: [Hermes Programmatic Integration — OpenAI-Compatible API Server](https://hermes-agent.nousresearch.com/docs/developer-guide/programmatic-integration#openai-compatible-api-server)

## Why not ACP

ACP exposes sessions, prompt streaming, tool calls, permissions, cancellation, and forking, but it is a stdio protocol designed for IDE clients. The Hermes ACP bridge currently ignores non-text prompt blocks when extracting request text, and its rendering contract targets editor content blocks.

Project Forge is a persistent browser host and needs WebSocket reconnect/replay and native Hermes request types. ACP would add an unnecessary IDE-oriented translation layer.

Source: [Hermes ACP Internals](https://hermes-agent.nousresearch.com/docs/developer-guide/acp-internals)

## Native capabilities Project Forge can reuse

The TUI Gateway provides native methods for:

- Creating, listing, resuming, activating, closing, interrupting, compressing, branching, and inspecting sessions.
- Submitting prompts, queueing prompts, steering active work, and stopping work.
- Discovering and dispatching slash commands.
- Listing, creating, describing, configuring, and setting assets for Hermes profiles.
- Reading model options, usage, context, skills, tools, and active subagents.

It publishes realtime events such as:

- `message.delta`, `message.interim`, and `message.complete`.
- `reasoning.delta`, `reasoning.available`, and legacy thinking deltas.
- `tool.start`, `tool.generating`, and `tool.complete`.
- Session, usage, status, notification, delegation, and lifecycle events.

It also sends server-to-client JSON-RPC requests for `approval`, `clarify`, `sudo`, `secret`, `vault.code`, `vault.unlock_prompt`, connection management, and desktop read/act bridges. The client responds using the same request ID. Cancelled questions produce `request.cancel`.

Source: [Hermes Programmatic Integration — TUI Gateway JSON-RPC](https://hermes-agent.nousresearch.com/docs/developer-guide/programmatic-integration#tui-gateway-json-rpc)

## Reconnect behavior

The native shared client tracks the last event sequence for each Session, detects backend process epochs, and calls `session.events.since` after reconnect. Resume/activate results include in-flight assistant output and still-open server requests, allowing a browser host to reconstruct a running turn and pending questions without guessing.

Source: [NousResearch/hermes-agent `apps/shared/src/json-rpc-gateway.ts`](https://github.com/NousResearch/hermes-agent/blob/main/apps/shared/src/json-rpc-gateway.ts)

## Authentication and secret handling

`hermes serve` is the headless JSON-RPC/WebSocket backend used by Hermes Desktop and remote clients. A network-exposed backend requires an authentication provider. Hermes supports session-token or OAuth-based remote connections and mints one-time WebSocket tickets where required.

Project Forge should hold the Hermes credential only in the API process, encrypted at rest. The browser should authenticate to Project Forge and receive a Project Forge WebSocket, never a reusable Hermes credential.

Sources:

- [Hermes Desktop native sign-in](https://hermes-agent.nousresearch.com/docs/guides/desktop-native-signin)
- [Connecting Desktop to many Hermes instances](https://hermes-agent.nousresearch.com/docs/user-guide/multi-connection-desktop)

## Recommended topology

```text
Browser
  -> Project Forge REST (domain commands and reads)
  -> Project Forge WebSocket (chat events and interactive responses)
       -> server-side Hermes Runtime adapter
            -> authenticated TUI Gateway JSON-RPC/WebSocket
                 -> hermes serve
                      -> Hermes Profiles, Sessions, Tools, Skills, Memory
```

The Project Forge adapter authenticates and authorizes the User, maps browser connections to owned Hermes Sessions, redacts server-only connection metadata, and preserves Hermes event ordering. It does not reimplement the agent loop or rewrite transcript history.

## Chat modes

- **Personal Chat:** create a native Hermes Session with the selected Personal Agent and Hermes' default working directory behavior. Project Forge does not apply Feature/Ticket gates.
- **Project Work:** create or resume a native Hermes Session bound server-side to a Registered Workspace and Project domain record. Project Forge applies Feature, Spec, Ticket, Plan, and Implement confirmation gates around native Hermes execution.

## DeepSeek Harness design reference

DeepSeek Harness is MIT-licensed and its official Web UI demonstrates useful interaction patterns: streamed assistant and reasoning nodes, tool-call trees, ask-user cards, approvals, plan review, deliverables, side previews, context meters, and session navigation. Project Forge should adopt these interaction patterns and visual density, not its runtime architecture or branding.

Sources:

- [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
- [DeepSeek Harness architecture](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)
- [DeepSeek Harness chat UI packages](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/client)

## Decision

Project Forge will use `hermes serve` and the TUI Gateway JSON-RPC/WebSocket protocol through one server-side Hermes Runtime adapter. REST remains the domain-management transport; Project Forge WebSocket carries native Chat events and bidirectional interactions. ACP and the OpenAI-compatible API remain outside the primary integration path.
