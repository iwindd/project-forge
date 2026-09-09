'use client'

import {
  Anchor,
  Badge,
  Box,
  Collapse,
  Stack,
  Text,
  UnstyledButton
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconChevronRight } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  checkActiveChildren,
  formatNotificationCount,
  getLinkHref,
  getNotificationCount,
  isLinkItem,
  isParentItem,
  useIsRouteActive,
  useNavigationGroups,
  useNotifications,
  type NavGroup,
  type NavItem,
  type SidebarNavigationMode
} from './navigation-utils'
import classes from './sidebar-nav-content.module.css'

type SidebarNavContentProps = {
  onNavigateAction?: () => void
  navigationMode?: SidebarNavigationMode
}

function getNavigationLabel(
  item: { label: string; labelKey?: string },
  translate: ReturnType<typeof useTranslations>
) {
  return item.labelKey ? translate(item.labelKey) : item.label
}

export default function SidebarNavContent({
  onNavigateAction,
  navigationMode = 'admin'
}: SidebarNavContentProps) {
  const notifications = useNotifications()
  const groups = useNavigationGroups(navigationMode)
  const t = useTranslations('Navigation')
  const { organizationSlug } = useParams<{ organizationSlug?: string }>()
  const routeParams = organizationSlug ? { organizationSlug } : {}

  return (
    <Stack className={classes.sidebarScrollContent} gap={0} pb='xl'>
      {groups.map(group => (
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
  )
}

function SidebarGroup({
  group,
  notifications,
  translate,
  onNavigateAction,
  routeParams
}: {
  group: NavGroup
  notifications: Readonly<Record<string, number>>
  translate: ReturnType<typeof useTranslations>
  onNavigateAction?: () => void
  routeParams: { organizationSlug?: string }
}) {
  const [opened, { toggle }] = useDisclosure(true)

  return (
    <Box>
      {!group.hideHeading && (
        <UnstyledButton
          onClick={toggle}
          className={classes.groupHeadingButton}
          aria-expanded={opened}
        >
          <div className={classes.groupHeadingIconWrapper}>
            <IconChevronRight
              size={14}
              stroke={2.5}
              className={classes.groupHeadingChevron}
              data-expanded={opened}
            />
          </div>
          <Text className={classes.groupHeadingText} size='xs' fw='bold'>
            {getNavigationLabel(group, translate)}
          </Text>
        </UnstyledButton>
      )}
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
  )
}

function SidebarItem({
  item,
  notifications,
  level,
  isLast = false,
  onNavigateAction,
  translate,
  routeParams
}: {
  item: NavItem
  notifications: Readonly<Record<string, number>>
  level: number
  isLast?: boolean
  onNavigateAction?: () => void
  translate: ReturnType<typeof useTranslations>
  routeParams: { organizationSlug?: string }
}) {
  const IconComponent = item.icon
  const hasChildren = isParentItem(item)
  const isActiveRoute = useIsRouteActive()
  const isSelfActive = isLinkItem(item) ? isActiveRoute(item.routeName) : false
  const isChildActive = hasChildren
    ? checkActiveChildren(item.items, isActiveRoute)
    : false
  const isActive = isSelfActive || isChildActive
  const [opened, { toggle }] = useDisclosure(
    isActive || Boolean(hasChildren && item.defaultOpened)
  )
  const notificationCount = getNotificationCount(
    notifications,
    item.notification
  )
  const itemClass = level > 1 ? classes.nestedItem : classes.navbarItem
  const wrapperClass =
    level > 1
      ? `${classes.nestedItemWrapper} ${isLast ? classes.lastNestedItemWrapper : ''}`
      : classes.itemWrapper

  if (hasChildren) {
    return (
      <div className={wrapperClass}>
        <UnstyledButton
          onClick={toggle}
          className={itemClass}
          data-active={level === 1 ? isActive : isActive && !opened}
          data-disabled={item.disabled || undefined}
          disabled={item.disabled}
          aria-expanded={opened}
        >
          {IconComponent && (
            <span className={classes.icon}>
              <IconComponent size={22} stroke={1.8} />
            </span>
          )}
          <Text size='sm' fw={600} style={{ flexGrow: 1 }}>
            {getNavigationLabel(item, translate)}
          </Text>
          <IconChevronRight
            size={16}
            stroke={1.8}
            className={classes.chevron}
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
    )
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
          {getNavigationLabel(item, translate)}
        </Text>
        {item.info && <Text className={classes.itemInfo}>{item.info}</Text>}
      </Stack>
      {notificationCount > 0 && (
        <Badge variant='light' size='sm' circle>
          {formatNotificationCount(notificationCount)}
        </Badge>
      )}
      {item.badge && (
        <Badge
          color={item.badge.color ?? 'cyan'}
          variant='light'
          size='xs'
          className={classes.badge}
        >
          {item.badge.label}
        </Badge>
      )}
    </>
  )

  if (!isLinkItem(item)) {
    return (
      <div className={wrapperClass}>
        <UnstyledButton
          className={itemClass}
          data-disabled
          disabled
          style={{ width: '100%' }}
          aria-label={`${item.label} ยังไม่เปิดใช้งาน`}
        >
          {content}
        </UnstyledButton>
      </div>
    )
  }

  return (
    <div className={wrapperClass}>
      <Anchor
        component={Link}
        href={getLinkHref(item, routeParams)}
        className={itemClass}
        data-active={isSelfActive}
        aria-current={isSelfActive ? 'page' : undefined}
        onClick={onNavigateAction}
        underline='never'
      >
        {content}
      </Anchor>
    </div>
  )
}
