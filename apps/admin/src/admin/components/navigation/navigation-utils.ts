import {
  useActiveRouteTrail,
  useNotifications,
  usePermissions,
} from "../../hooks";
import {
  accountNavigation,
  adminNavigation,
  type AdminNavigationGroup,
  type AdminNavigationItem,
} from "../../navigation";
import type { PermissionKey, PermissionMode } from "../../permissions";
import { getPath } from "../../routes";
import type { RouteParams } from "../../routing";

export type NavItem = AdminNavigationItem;
export type NavGroup = AdminNavigationGroup;
export type NavLinkHref = string;
export type SidebarNavigationMode = "admin" | "account";

type PermissionCheck = (
  keys: PermissionKey | readonly PermissionKey[],
  mode?: PermissionMode,
) => boolean;

function filterNavItems(
  items: NavItem[],
  can: PermissionCheck,
): NavItem[] {
  return items.flatMap((item) => {
    if (
      item.permissionKey &&
      !can(item.permissionKey, item.permissionMode)
    ) {
      return [];
    }

    if (!item.items) {
      return [item];
    }

    const visibleChildren = filterNavItems(item.items, can);

    if (visibleChildren.length === 0) {
      return [];
    }

    return [{ ...item, items: visibleChildren }];
  });
}

function filterNavGroups(
  groups: readonly NavGroup[],
  can: PermissionCheck,
): NavGroup[] {
  return groups.flatMap((group) => {
    // A group remains visible when at least one child is permitted.
    const items = filterNavItems(group.items, can);
    return items.length > 0 ? [{ ...group, items }] : [];
  });
}

function useFilteredNavGroups(): NavGroup[] {
  const { can } = usePermissions();

  return filterNavGroups(adminNavigation, can);
}

export function useNavigationGroups(
  mode: SidebarNavigationMode = "admin",
): NavGroup[] {
  const adminGroups = useFilteredNavGroups();

  return mode === "account" ? accountNavigation : adminGroups;
}

export function getNavItems(groups: NavGroup[]) {
  return groups.flatMap((group) => group.items);
}

export function isParentItem(
  item: NavItem,
): item is NavItem & { items: NavItem[] } {
  return Array.isArray(item.items) && item.items.length > 0;
}

export function isLinkItem(
  item: NavItem,
): item is NavItem & { href: string } {
  return typeof item.href === "string" && !item.disabled;
}

export function getLinkHref(
  item: NavItem,
  params: RouteParams = {},
): NavLinkHref {
  if (!item.href) {
    throw new Error(`Navigation item has no link: ${item.id}`);
  }

  return item.routeName ? getPath(item.routeName, params) : item.href;
}

export function useIsRouteActive() {
  const activeRouteTrail = useActiveRouteTrail();

  return (routeName?: string) =>
    Boolean(
      routeName && activeRouteTrail.some((route) => route.name === routeName),
    );
}

export { useNotifications };

export function getNotificationCount(
  notifications: Readonly<Record<string, number>> | undefined,
  notificationKey?: string,
) {
  if (!notifications || !notificationKey) {
    return 0;
  }

  return notifications[notificationKey] ?? 0;
}

export function formatNotificationCount(count: number) {
  return count.toLocaleString("th-TH");
}

export function checkActiveChildren(
  children: NavItem[],
  isActiveRoute: (routeName?: string) => boolean,
): boolean {
  return children.some(
    (child) =>
      (isLinkItem(child) && isActiveRoute(child.routeName)) ||
      (isParentItem(child) &&
        checkActiveChildren(child.items, isActiveRoute)),
  );
}
