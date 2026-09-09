const PERMISSIONS = {
  manageOrganization: "organization.manage",
  manageUsers: "users.manage",
  viewAuditLogs: "audit-logs.view",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
export type PermissionMode = "all" | "any";
export type GrantedPermission = (typeof PERMISSIONS)[PermissionKey] | "*";

export function getPermissionsForUser(
  platformRole: "ADMIN" | "EDITOR" | undefined,
  organizationPermissions: readonly string[] | null | undefined,
  organizationIsOwner = false,
): readonly GrantedPermission[] {
  if (platformRole === "ADMIN") {
    return ["*"];
  }

  if (organizationIsOwner || organizationPermissions?.includes(PERMISSIONS.manageOrganization)) {
    return [PERMISSIONS.manageOrganization];
  }

  return [];
}

export function hasPermission(
  granted: readonly string[],
  keys: PermissionKey | readonly PermissionKey[],
  mode: PermissionMode = "all",
) {
  if (granted.includes("*")) {
    return true;
  }

  const requiredKeys = typeof keys === "string" ? [keys] : keys;
  const checks = requiredKeys.map((key) => granted.includes(PERMISSIONS[key]));

  return mode === "all" ? checks.every(Boolean) : checks.some(Boolean);
}
