# Project Forge

Project Forge is an organization-scoped administration system. This context defines the domain language used by the admin application and API.

## Identity and access

**User**:
A person who can authenticate and participate in one or more organizations.
_Avoid_: Account, member (when referring to the person globally)

**User Profile**:
The personal information associated with a User and managed by that User; Organization Member administration does not grant authority to edit it.
_Avoid_: Member profile (when referring to User-owned personal information)

**Connection**:
A user's linked external identity through which the system can recognize or authenticate that user.
_Avoid_: OAuth account, external account

**Organization Role**:
The named authority a user holds over an organization and its organization-level administration; the initial built-in roles are Owner, Admin, and Member, represented by stable codes and seeded with the Thai labels เจ้าของ, แอดมิน, and สมาชิก. Each organization has exactly one Owner, and ownership is not assigned to another member in the current scope.
_Avoid_: Project role

**Organization Member**:
A user who belongs to an organization with an organization role.
_Avoid_: Organization user

**Organization Invitation**:
An offer for a user to join an organization with a selected organization role; invitations cannot grant Owner authority.
_Avoid_: Project invitation

## Organization and project

**Organization**:
The ownership and access boundary for projects, members, roles, and invitations. Only an Active organization is available to its members; Archived and Suspended organizations deny normal access.
_Avoid_: Workspace, tenant (unless the distinction is explicitly discussed)

**Organization Scope**:
The organization under which a user is currently viewing or operating on data.
_Avoid_: Active organization, session organization

**Project**:
A unit of work owned by exactly one organization.
_Avoid_: Personal project, global project

**Project Access**:
Access to a project granted by active membership in the organization that owns the project; projects are not shared independently between organization members.
_Avoid_: Project sharing, project member

**Manage Project**:
The organization permission governing project mutations such as creating, updating, archiving, and deleting projects.
_Avoid_: Project role, project ownership

**Manage Organization**:
The organization permission governing membership, invitations, and organization-role administration.
_Avoid_: Manage project

## Hermes runtime and project work

**Hermes Local Runtime**:
The managed local Hermes runtime used by the Project Forge installation. It provides shared Profiles and User-scoped Sessions for the local application; runtime credentials and filesystem details remain server-side.
_Avoid_: User-owned Gateway Connection, Organization gateway, Agent connection

**Shared Local Agent**:
A shared Agent backed by a real Hermes Profile on the Hermes Local Runtime. Every authenticated User can discover, select, and use the same Agent across Organizations and Projects. Only a Platform Admin may create, configure, enable, disable, or delete the Agent.
_Avoid_: Personal Agent, Organization Agent, Project Agent

**Hermes Session**:
A conversation and execution context owned by Hermes and scoped in Project Forge to the authenticated User; it may use a Shared Local Agent and may be associated with a Project, Feature, or Project Ticket.
_Avoid_: Shared Chat Session, Project Forge transcript

**Personal Chat**:
A Hermes Session used as a User normal conversation with a Shared Local Agent without Feature, Ticket, or Project confirmation gates.
_Avoid_: Unmanaged Project work

**Registered Workspace**:
A Project's approved local repository location, resolved server-side from an opaque identifier before Project Work can inspect or mutate files.
_Avoid_: Browser path, arbitrary workspace

**Project Work**:
Agent activity associated with a Project and Registered Workspace and governed by Project Forge's Feature, Spec, Ticket, Plan, and implementation confirmations.
_Avoid_: Personal Chat

**Feature**:
A proposed Project outcome that moves through requirements discovery and Spec review before it can produce Project Tickets.
_Avoid_: Workflow

**Project Ticket**:
An approved, verifiable slice of Project Work produced from a confirmed Spec and Ticket Draft.
_Avoid_: Draft issue, Workflow task

**Agent Run**:
One durable execution of a Shared Local Agent associated with an authenticated User, a Hermes Session, and optionally a Project, Feature, or Project Ticket.
_Avoid_: Workflow

**Interactive Request**:
A question or permission request raised by Hermes during a Session and answered through a typed Project Forge interface while preserving the originating request identity.
_Avoid_: Chat message (when the interaction expects a structured response)

**Product Confirmation**:
An explicit User decision that advances Project Forge state, such as Confirm Spec, Confirm Tickets, Confirm Plan, or Implement. It is distinct from a Hermes tool approval.
_Avoid_: Tool approval
