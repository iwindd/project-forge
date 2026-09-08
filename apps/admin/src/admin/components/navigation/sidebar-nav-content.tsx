"use client";

import {
  Anchor,
  Badge,
  Box,
  Collapse,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  checkActiveChildren,
  formatNotificationCount,
  getLinkHref,
  getNotificationCount,
  isLinkItem,
  isParentItem,
  useNavigationGroups,
  useIsRouteActive,
  useNotifications,
  type SidebarNavigationMode,
  type NavGroup,
  type NavItem,
} from "./navigation-utils";
import classes from "./sidebar-nav-content.module.css";

type SidebarNavContentProps = {
  onNavigateAction?: () => void;
  navigationMode?: SidebarNavigationMode;
};

export default function SidebarNavContent({
  onNavigateAction,
  navigationMode = "admin",
}: SidebarNavContentProps) {
  const notifications = useNotifications();
  const groups = useNavigationGroups(navigationMode);
  const t = useTranslations("Navigation");
  const { organizationSlug } = useParams<{ organizationSlug?: string }>();
  const routeParams = organizationSlug ? { organizationSlug } : {};

  return (
    <Stack
      className={classes.sidebarScrollContent}
      data-sidebar-content
      gap={0}
      pb="xl"
    >
      {groups.map((group) => (
        <SidebarGroup
          key={group.id}
          group={group}
          translate={t}
          notifications={notifications}
          onNavigateAction={onNavigateAction}
          routeParams={routeParams}
        />
      ))}
    </Stack>
  );
}

function SidebarGroup({
  group,
  notifications,
  translate,
  onNavigateAction,
  routeParams,
}: {
  group: NavGroup;
  notifications: Readonly<Record<string, number>>;
  translate: ReturnType<typeof useTranslations>;
  onNavigateAction?: () => void;
  routeParams: { organizationSlug?: string };
}) {
  const [opened, { toggle }] = useDisclosure(true);

  return (
    <Box>
      <UnstyledButton
        onClick={toggle}
        className={classes.groupHeadingButton}
        data-sidebar-group-heading
        aria-expanded={opened}
      >
        <div
          className={classes.groupHeadingIconWrapper}
          data-sidebar-group-icon
        >
          <IconChevronRight
            size={14}
            stroke={2.5}
            className={classes.groupHeadingChevron}
            data-sidebar-group-chevron
            data-expanded={opened}
          />
        </div>
        <Text
          className={classes.groupHeadingText}
          data-sidebar-group-label
          size="xs"
          fw="bold"
        >
          {translate(
            group.id === "overview"
              ? "overview"
              : group.id === "content"
                ? "content"
                : group.id === "settings"
                  ? "settings"
                  : group.id === "profile"
                    ? "profile"
                  : "system",
          )}
        </Text>
      </UnstyledButton>
      <Collapse expanded={opened}>
        <Stack gap={4}>
          {group.items.map((item, index) => (
            <SidebarItem
              key={item.id}
              item={item}
              notifications={notifications}
              level={1}
              isLast={index === group.items.length - 1}
              onNavigateAction={onNavigateAction}
              translate={translate}
              routeParams={routeParams}
            />
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}

function SidebarItem({
  item,
  notifications,
  level,
  isLast = false,
  onNavigateAction,
  translate,
  routeParams,
}: {
  item: NavItem;
  notifications: Readonly<Record<string, number>>;
  level: number;
  isLast?: boolean;
  onNavigateAction?: () => void;
  translate: ReturnType<typeof useTranslations>;
  routeParams: { organizationSlug?: string };
}) {
  const IconComponent = item.icon;
  const hasChildren = isParentItem(item);
  const isActiveRoute = useIsRouteActive();
  const isSelfActive = isLinkItem(item)
    ? isActiveRoute(item.routeName)
    : false;
  const isChildActive = hasChildren
    ? checkActiveChildren(item.items, isActiveRoute)
    : false;
  const isActive = isSelfActive || isChildActive;
  const [opened, { toggle }] = useDisclosure(
    isActive || Boolean(hasChildren && item.defaultOpened),
  );
  const notificationCount = getNotificationCount(
    notifications,
    item.notification,
  );
  const itemClass = level > 1 ? classes.nestedItem : classes.navbarItem;
  const wrapperClass =
    level > 1
      ? `${classes.nestedItemWrapper} ${isLast ? classes.lastNestedItemWrapper : ""}`
      : classes.itemWrapper;
  const sidebarLevel = level > 1 ? "nested" : "root";
  const sidebarLast = isLast ? "true" : undefined;

  if (hasChildren) {
    return (
      <div
        className={wrapperClass}
        data-sidebar-item-wrapper
        data-sidebar-last={sidebarLast}
        data-sidebar-level={sidebarLevel}
      >
        <UnstyledButton
          onClick={toggle}
          className={itemClass}
          data-sidebar-item
          data-sidebar-level={sidebarLevel}
          data-active={level === 1 ? isActive : isActive && !opened}
          data-disabled={item.disabled || undefined}
          disabled={item.disabled}
          aria-expanded={opened}
        >
          {IconComponent && (
            <span className={classes.icon} data-sidebar-icon>
              <IconComponent size={22} stroke={1.8} />
            </span>
          )}
          <Text size="sm" fw={600} style={{ flexGrow: 1 }}>
            {translate(
              item.routeName === "dashboard"
                ? "dashboard"
                : item.routeName === "system.users"
                  ? "users"
                  : item.routeName === "system.auditLogs"
                    ? "auditLogs"
                : item.routeName === "settings.members"
                  ? "members"
                  : item.routeName === "admin.users"
                    ? "users"
                    : item.routeName === "admin.activities"
                      ? "auditLogs"
                  : item.routeName === "account.settings"
                    ? "account"
                  : item.routeName === "account.activity"
                    ? "activity"
                  : item.label,
            )}
          </Text>
          <IconChevronRight
            size={16}
            stroke={1.8}
            className={classes.chevron}
            data-sidebar-chevron
            data-opened={opened}
          />
        </UnstyledButton>
        <Collapse expanded={opened}>
          <div className={classes.nestedList}>
            {item.items.map((child, index) => (
              <SidebarItem
                key={child.id}
                item={child}
                notifications={notifications}
                level={level + 1}
                isLast={index === item.items.length - 1}
                onNavigateAction={onNavigateAction}
                translate={translate}
                routeParams={routeParams}
              />
            ))}
          </div>
        </Collapse>
      </div>
    );
  }

  const content = (
    <>
      {IconComponent && (
        <span className={classes.icon} data-sidebar-icon>
          <IconComponent size={22} stroke={1.8} />
        </span>
      )}
      <Stack gap={0} style={{ flexGrow: 1, alignItems: "flex-start" }}>
        <Text size="sm" fw={600}>
          {translate(
            item.routeName === "dashboard"
              ? "dashboard"
              : item.routeName === "system.users"
                ? "users"
                : item.routeName === "system.auditLogs"
                  ? "auditLogs"
              : item.routeName === "settings.members"
                ? "members"
                : item.routeName === "admin.users"
                  ? "users"
                  : item.routeName === "admin.activities"
                    ? "auditLogs"
                : item.routeName === "account.settings"
                  ? "account"
                : item.routeName === "account.activity"
                  ? "activity"
                : item.label,
          )}
        </Text>
        {item.info && (
          <Text className={classes.itemInfo} data-sidebar-item-info>
            {item.info}
          </Text>
        )}
      </Stack>
      {notificationCount > 0 && (
        <Badge variant="light" size="sm" circle>
          {formatNotificationCount(notificationCount)}
        </Badge>
      )}
      {item.badge && (
        <Badge
          color={item.badge.color ?? "cyan"}
          variant="light"
          size="xs"
          className={classes.badge}
          data-sidebar-badge
        >
          {item.badge.label}
        </Badge>
      )}
    </>
  );

  if (!isLinkItem(item)) {
    return (
      <div
        className={wrapperClass}
        data-sidebar-item-wrapper
        data-sidebar-last={sidebarLast}
        data-sidebar-level={sidebarLevel}
      >
        <UnstyledButton
          className={itemClass}
          data-sidebar-item
          data-sidebar-level={sidebarLevel}
          data-disabled
          disabled
          style={{ width: "100%" }}
          aria-label={`${item.label} ยังไม่เปิดใช้งาน`}
        >
          {content}
        </UnstyledButton>
      </div>
    );
  }

  return (
    <div
      className={wrapperClass}
      data-sidebar-item-wrapper
      data-sidebar-last={sidebarLast}
      data-sidebar-level={sidebarLevel}
    >
      <Anchor
        component={Link}
        href={getLinkHref(item, routeParams)}
        className={itemClass}
        data-sidebar-item
        data-sidebar-level={sidebarLevel}
        data-active={isSelfActive}
        aria-current={isSelfActive ? "page" : undefined}
        onClick={onNavigateAction}
        underline="never"
      >
        {content}
      </Anchor>
    </div>
  );
}
