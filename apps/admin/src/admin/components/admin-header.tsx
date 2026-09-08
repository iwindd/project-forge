'use client'

import { setUser } from '@/admin/features/auth/auth-slice'
import { useAppDispatch } from '@/admin/hooks'
import { useAdminCacheInvalidation } from '@/admin/hooks/use-admin-cache-invalidation'
import type { AdminUser } from '@/session'
import {
  ActionIcon,
  Avatar,
  Box,
  Burger,
  Button,
  Group,
  Menu,
  Text,
  Tooltip
} from '@mantine/core'
import { IconLogout, IconSettings, IconUserCircle } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getPath } from '@/admin/routes'
import { AdminBrand } from './admin-brand'
import classes from './admin-header.module.css'

export function AdminHeader({
  user,
  mobileOpened,
  onToggleMobileAction,
  onOpenSettingsAction,
}: {
  user: AdminUser
  mobileOpened: boolean
  onToggleMobileAction: () => void
  onOpenSettingsAction: () => void
}) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { resetAllAdminApiCaches } = useAdminCacheInvalidation()
  const t = useTranslations('Navigation')
  const common = useTranslations('Common')
  const displayName = user.name || user.email || common('admin')

  const handleLogout = async () => {
    const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5050'
    await fetch(`${apiOrigin}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    })
    dispatch(setUser(null))
    resetAllAdminApiCaches()
    router.push('/admin/login')
  }

  return (
    <Group
      className={classes.headerInner}
      justify='space-between'
      wrap='nowrap'
    >
      <Group gap='sm' wrap='nowrap'>
        <Burger
          opened={mobileOpened}
          onClick={onToggleMobileAction}
          aria-expanded={mobileOpened}
          aria-label={mobileOpened ? t('closeMenu') : t('openMenu')}
          size='sm'
          hiddenFrom='sm'
        />
        <Box hiddenFrom='sm'>
          <AdminBrand />
        </Box>
      </Group>

      <Group gap='xs' wrap='nowrap'>
        <Tooltip label={t('settings')}>
          <ActionIcon
            variant='default-subtle'
            radius='lg'
            size='lg'
            aria-label={t('openSettings')}
            onClick={onOpenSettingsAction}
          >
            <IconSettings
              style={{ width: '70%', height: '70%' }}
              stroke={1.5}
            />
          </ActionIcon>
        </Tooltip>

        <Menu position='bottom-end' width={220}>
          <Menu.Target>
            <Button variant='default-subtle' px='xs' h={46}>
              <Group gap='xs' wrap='nowrap'>
                <Avatar color='brand' radius='xl' size={32}>
                  {displayName.charAt(0).toUpperCase()}
                </Avatar>
                <div className={classes.userDetails}>
                  <Text size='sm' fw={600} maw={130} truncate>
                    {displayName}
                  </Text>
                  <Text size='xs' c='dimmed' ta='left' maw={130} truncate>
                    {user.role === 'ADMIN' ? common('admin') : common('editor')}
                  </Text>
                </div>
              </Group>
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{user.email}</Menu.Label>
            <Menu.Item
              component={Link}
              href={getPath('account.settings')}
              leftSection={<IconUserCircle size={17} />}
            >
              {t('myAccount')}
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              color='red'
              leftSection={<IconLogout size={17} />}
              onClick={() => void handleLogout()}
            >
              {t('logout')}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  )
}
