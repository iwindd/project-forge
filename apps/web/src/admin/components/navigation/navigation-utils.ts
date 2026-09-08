'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { useGetMeQuery } from '@/store/api';
import { adminNavigation, type AdminNavigationGroup, type AdminNavigationItem } from '../../navigation';

export type NavItem = AdminNavigationItem;
export type NavGroup = AdminNavigationGroup;

export function isParentItem(item: NavItem): item is NavItem & { items: NavItem[] } {
  return Boolean(item.items?.length);
}

export function isLinkItem(item: NavItem): item is NavItem & { href: string } {
  return Boolean(item.href);
}

export function getLinkHref(item: NavItem) {
  return item.href ?? '#';
}

export function checkActiveChildren(items: readonly NavItem[], isActive: (href: string) => boolean): boolean {
  return items.some(
    (item) =>
      (isLinkItem(item) && isActive(item.href)) || (isParentItem(item) && checkActiveChildren(item.items, isActive)),
  );
}

export function getNavItems(groups: readonly NavGroup[]) {
  return groups.flatMap((group) => group.items);
}

export function useIsRouteActive() {
  const pathname = usePathname();
  return useCallback(
    (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)),
    [pathname],
  );
}

export function useFilteredNavGroups() {
  const { data } = useGetMeQuery();
  const isAdmin = data?.user.role === 'ADMIN';

  return useMemo(
    () =>
      adminNavigation
        .filter((group) => !group.adminOnly || isAdmin)
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !item.adminOnly || isAdmin),
        }))
        .filter((group) => group.items.length > 0),
    [isAdmin],
  );
}

export function useNotifications() {
  return {} as Readonly<Record<string, number>>;
}

export function getNotificationCount(notifications: Readonly<Record<string, number>>, key?: string) {
  return key ? (notifications[key] ?? 0) : 0;
}

export function formatNotificationCount(count: number) {
  return count > 99 ? '99+' : String(count);
}
