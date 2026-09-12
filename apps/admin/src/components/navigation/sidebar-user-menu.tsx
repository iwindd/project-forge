'use client'

import { getPath } from '@/routes'
import { useAppDispatch } from '@/hooks'
import { useAdminCacheInvalidation } from '@/hooks/use-admin-cache-invalidation'
import { useLogoutMutation } from '@/lib/features/auth/auth-api'
import { setUser } from '@/lib/features/auth/auth-slice'
import type { AdminUser } from '@/session'
import { Avatar, Menu, Stack, Text, UnstyledButton } from '@mantine/core'
import { IconChevronUp, IconLogout, IconUserCircle } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import classes from './sidebar-user-menu.module.css'

export function SidebarUserMenu({ user }: { user: AdminUser }) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { resetAllAdminApiCaches } = useAdminCacheInvalidation()
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation()
  const t = useTranslations('Navigation')
  const common = useTranslations('Common')
  const displayName = user.name || user.email || common('admin')

  const handleLogout = async () => {
    try {
      await logout().unwrap()
    } catch {
      // Clear the local session even if the server session is already gone.
    } finally {
      dispatch(setUser(null))
      resetAllAdminApiCaches()
      router.push('/login')
    }
  }

  return (
    <Menu position='top-start' offset={8} width={260} shadow='md' withinPortal>
      <Menu.Target>
        <UnstyledButton className={classes.control} aria-label={displayName}>
          <Avatar radius='xl' size={34}>
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
          <Stack className={classes.details} gap={0}>
            <Text size='sm' fw={600} truncate>
              {displayName}
            </Text>
            <Text size='xs' c='dimmed' truncate>
              {user.role === 'ADMIN' ? common('admin') : common('editor')}
            </Text>
          </Stack>
          <IconChevronUp
            className={classes.chevron}
            size={17}
            stroke={1.8}
            aria-hidden='true'
          />
        </UnstyledButton>
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
          disabled={isLoggingOut}
          onClick={() => void handleLogout()}
        >
          {t('logout')}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
