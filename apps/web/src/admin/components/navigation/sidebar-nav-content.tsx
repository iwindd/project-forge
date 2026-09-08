'use client';

import { Anchor, Box, Collapse, Stack, Text, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronRight } from '@tabler/icons-react';
import Link from 'next/link';
import {
  checkActiveChildren,
  getLinkHref,
  isLinkItem,
  isParentItem,
  useFilteredNavGroups,
  useIsRouteActive,
  type NavGroup,
  type NavItem,
} from './navigation-utils';
import classes from './sidebar-nav-content.module.css';

export default function SidebarNavContent({ onNavigateAction }: { onNavigateAction?: () => void }) {
  const groups = useFilteredNavGroups();
  const isActiveRoute = useIsRouteActive();

  return (
    <Stack className={classes.sidebarScrollContent} gap={0} pb='xl'>
      {groups.map((group) => (
        <SidebarGroup key={group.id} group={group} isActiveRoute={isActiveRoute} onNavigateAction={onNavigateAction} />
      ))}
    </Stack>
  );
}

function SidebarGroup({
  group,
  isActiveRoute,
  onNavigateAction,
}: {
  group: NavGroup;
  isActiveRoute: (href: string) => boolean;
  onNavigateAction?: () => void;
}) {
  const [opened, { toggle }] = useDisclosure(true);
  return (
    <Box>
      <UnstyledButton onClick={toggle} className={classes.groupHeadingButton} aria-expanded={opened}>
        <div className={classes.groupHeadingIconWrapper}>
          <IconChevronRight size={14} stroke={2.5} className={classes.groupHeadingChevron} data-expanded={opened} />
        </div>
        <Text className={classes.groupHeadingText} size='xs' fw='bold'>
          {group.label}
        </Text>
      </UnstyledButton>
      <Collapse expanded={opened}>
        <Stack gap={4}>
          {group.items.map((item, index) => (
            <SidebarItem
              key={item.id}
              item={item}
              isActiveRoute={isActiveRoute}
              level={1}
              isLast={index === group.items.length - 1}
              onNavigateAction={onNavigateAction}
            />
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}

function SidebarItem({
  item,
  isActiveRoute,
  level,
  isLast,
  onNavigateAction,
}: {
  item: NavItem;
  isActiveRoute: (href: string) => boolean;
  level: number;
  isLast?: boolean;
  onNavigateAction?: () => void;
}) {
  const IconComponent = item.icon;
  const hasChildren = isParentItem(item);
  const isSelfActive = isLinkItem(item) && isActiveRoute(item.href);
  const isChildActive = hasChildren && checkActiveChildren(item.items, isActiveRoute);
  const isActive = Boolean(isSelfActive || isChildActive);
  const [opened, { toggle }] = useDisclosure(isActive || Boolean(hasChildren && item.defaultOpened));
  const itemClass = level > 1 ? classes.nestedItem : classes.navbarItem;
  const wrapperClass =
    level > 1 ? `${classes.nestedItemWrapper} ${isLast ? classes.lastNestedItemWrapper : ''}` : classes.itemWrapper;

  if (hasChildren) {
    return (
      <div className={wrapperClass}>
        <UnstyledButton
          onClick={toggle}
          className={itemClass}
          data-active={level === 1 ? isActive : isActive && !opened}
          aria-expanded={opened}
        >
          {IconComponent && (
            <span className={classes.icon}>
              <IconComponent size={22} stroke={1.8} />
            </span>
          )}
          <Text size='sm' fw={600} style={{ flexGrow: 1 }}>
            {item.label}
          </Text>
          <IconChevronRight size={16} stroke={1.8} className={classes.chevron} data-opened={opened} />
        </UnstyledButton>
        <Collapse expanded={opened}>
          <div className={classes.nestedList}>
            {item.items.map((child, index) => (
              <SidebarItem
                key={child.id}
                item={child}
                isActiveRoute={isActiveRoute}
                level={level + 1}
                isLast={index === item.items.length - 1}
                onNavigateAction={onNavigateAction}
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
        <span className={classes.icon}>
          <IconComponent size={22} stroke={1.8} />
        </span>
      )}
      <Stack gap={0} style={{ flexGrow: 1, alignItems: 'flex-start' }}>
        <Text size='sm' fw={600}>
          {item.label}
        </Text>
        {item.info && (
          <Text size='xs' c='dimmed'>
            {item.info}
          </Text>
        )}
      </Stack>
    </>
  );
  if (!isLinkItem(item))
    return (
      <div className={wrapperClass}>
        <UnstyledButton className={itemClass} data-disabled disabled style={{ width: '100%' }}>
          {content}
        </UnstyledButton>
      </div>
    );
  return (
    <div className={wrapperClass}>
      <Anchor
        component={Link}
        href={getLinkHref(item)}
        className={itemClass}
        data-active={isSelfActive}
        aria-current={isSelfActive ? 'page' : undefined}
        onClick={onNavigateAction}
        underline='never'
      >
        {content}
      </Anchor>
    </div>
  );
}
