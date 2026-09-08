'use client'

import { ActionIcon, Button, Group, Menu } from '@mantine/core'
import { IconDotsVertical } from '@tabler/icons-react'
import Link from 'next/link'

type TableActionItem = {
  label: string
  action: string | (() => void)
  icon?: React.ComponentType<{ size?: number }>
}

type TableActionMenuProps = {
  label?: string
  displayType?: 'menu' | 'icon' | 'button'
  variant?: 'default' | 'default-subtle'
  actions: TableActionItem[]
}

function TableActionMenu({
  label = 'Actions',
  displayType = 'menu',
  variant = 'default-subtle',
  actions
}: TableActionMenuProps) {
  if (displayType === 'button') {
    return (
      <Group gap='xs' justify='flex-end' wrap='nowrap'>
        {actions.map(action => {
          const Icon = action.icon

          return typeof action.action === 'string' ? (
            <Button
              key={action.label}
              component={Link}
              href={action.action}
              size='xs'
              variant='default'
              leftSection={Icon ? <Icon size={16} /> : undefined}
            >
              {action.label}
            </Button>
          ) : (
            <Button
              key={action.label}
              variant='default'
              size='xs'
              leftSection={Icon ? <Icon size={16} /> : undefined}
              onClick={action.action}
            >
              {action.label}
            </Button>
          )
        })}
      </Group>
    )
  }

  if (displayType === 'icon') {
    return (
      <Group gap='xs' justify='flex-end' wrap='nowrap'>
        {actions.map(action => {
          if (!action.icon) return null
          const Icon = action.icon

          return typeof action.action === 'string' ? (
            <ActionIcon
              key={action.label}
              component={Link}
              href={action.action}
              variant='light'
              aria-label={action.label}
            >
              <Icon size={16} />
            </ActionIcon>
          ) : (
            <ActionIcon
              key={action.label}
              variant='light'
              aria-label={action.label}
              onClick={action.action}
            >
              <Icon size={16} />
            </ActionIcon>
          )
        })}
      </Group>
    )
  }

  return (
    <Menu shadow='md' position='bottom-end'>
      <Menu.Target>
        <ActionIcon variant={variant} aria-label={label}>
          <IconDotsVertical size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {actions.map(action => {
          const Icon = action.icon

          return typeof action.action === 'string' ? (
            <Menu.Item
              key={action.label}
              component={Link}
              href={action.action}
              leftSection={Icon ? <Icon size={16} /> : undefined}
            >
              {action.label}
            </Menu.Item>
          ) : (
            <Menu.Item
              key={action.label}
              onClick={action.action}
              leftSection={Icon ? <Icon size={16} /> : undefined}
            >
              {action.label}
            </Menu.Item>
          )
        })}
      </Menu.Dropdown>
    </Menu>
  )
}

export default TableActionMenu
