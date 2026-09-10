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
