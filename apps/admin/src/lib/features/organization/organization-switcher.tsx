'use client'

import { getBrowserApiErrorMessage } from '@/lib/api/api'
import { getPath } from '@/routes'
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Button,
  Menu,
  Modal,
  Select,
  Stack,
  Text,
  TextInput
} from '@mantine/core'
import { schemaResolver, useForm } from '@mantine/form'
import {
  IconBuilding,
  IconCheck,
  IconCopy,
  IconSearch,
  IconSelector,
  IconUsers
} from '@tabler/icons-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import {
  useCreateInvitationMutation,
  useGetRolesQuery
} from './organization-members-api'
import { useOrganizationContext } from './organization-provider'
import { databaseUuidSchema } from './organization-schemas'
import {
  getDefaultInvitationRoleId,
  getInvitationRoleOptions
} from './invitation-role-options'
import type { Organization } from './types'
import classes from './organization-switcher.module.css'

export const inviteMemberFormSchema = z.object({
  email: z.string().trim().email('กรุณาระบุอีเมลให้ถูกต้อง'),
  roleId: databaseUuidSchema
})

type InviteMemberFormValues = z.infer<typeof inviteMemberFormSchema>

function getOrganizationInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'O'
}

function getOrganizationTypeLabel(type: Organization['type']) {
  return type === 'PERSONAL' ? 'ส่วนตัว' : 'ทีม'
}

function canInviteMembers(organization: Organization | undefined) {
  return Boolean(
    organization &&
    organization.type === 'SHARED' &&
    (organization.role.isOwner ||
      organization.role.permissions.includes('organization.manage'))
  )
}

export function OrganizationSwitcher() {
  const t = useTranslations('OrganizationMembers')
  const {
    organizations,
    activeId,
    activeOrganization,
    pending: switchPending,
    switchOrganization
  } = useOrganizationContext()
  const [createInvitationMutation, { isLoading: invitationCreating }] =
    useCreateInvitationMutation()
  const { data: rolesResult } = useGetRolesQuery(
    { organizationId: activeOrganization?.id ?? '' },
    { skip: !activeOrganization || !canInviteMembers(activeOrganization) }
  )
  const [inviteOpened, setInviteOpened] = useState(false)
  const [search, setSearch] = useState('')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copiedInviteLink, setCopiedInviteLink] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const pending = switchPending || invitationCreating
  const inviteForm = useForm<InviteMemberFormValues>({
    initialValues: { email: '', roleId: '' },
    validate: schemaResolver(inviteMemberFormSchema),
    validateInputOnBlur: true
  })
  const inviteRoles = useMemo(
    () => getInvitationRoleOptions(rolesResult?.data ?? []),
    [rolesResult?.data]
  )
  const defaultInviteRoleId = getDefaultInvitationRoleId(inviteRoles)
  const selectedInviteRoleId = inviteForm.values.roleId || defaultInviteRoleId

  const createInvitation = async (values: InviteMemberFormValues) => {
    if (!activeOrganization) return

    setInviteError(null)
    try {
      const result = await createInvitationMutation({
        organizationId: activeOrganization.id,
        email: values.email,
        roleId: values.roleId
      }).unwrap()
      setInviteLink(
        `${window.location.origin}/admin/invitations/${result.token}`
      )
      setCopiedInviteLink(false)
      inviteForm.setFieldValue('email', '')
    } catch (error) {
      setInviteError(
        getBrowserApiErrorMessage(error, 'ไม่สามารถสร้างลิงก์เชิญได้')
      )
    }
  }

  const copyInviteLink = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopiedInviteLink(true)
    } catch {
      setInviteError(t('copyInviteFailed'))
    }
  }

  const openInviteMembers = () => {
    setInviteError(null)
    if (!inviteForm.values.roleId && defaultInviteRoleId) {
      inviteForm.setFieldValue('roleId', defaultInviteRoleId)
    }
    setInviteOpened(true)
  }

  const filteredOrganizations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) return organizations

    return organizations.filter(organization =>
      `${organization.name} ${organization.slug}`
        .toLowerCase()
        .includes(normalizedSearch)
    )
  }, [organizations, search])

  if (!organizations.length || !activeOrganization) return null

  const selectedOrganization = activeOrganization
  const showInviteAction = canInviteMembers(activeOrganization)

  return (
    <>
      <Menu
        position='right-start'
        offset={8}
        width={340}
        shadow='md'
        withinPortal
        onChange={opened => {
          if (!opened) setSearch('')
        }}
      >
        <div className={classes.control}>
          <Link
            href={getPath('overview', {
              organizationSlug: selectedOrganization.slug
            })}
            className={classes.projectLink}
          >
            <Avatar radius='xl' size={32} className={classes.controlAvatar}>
              {getOrganizationInitial(selectedOrganization.name)}
            </Avatar>
            <Stack className={classes.controlCopy} gap={0}>
              <Text className={classes.controlName} size='sm' fw={700} truncate>
                {selectedOrganization.name}
              </Text>
            </Stack>
          </Link>
          <Menu.Target>
            <ActionIcon
              className={classes.toggle}
              disabled={pending}
              variant='subtle'
              size={32}
              radius='md'
              aria-label='เปลี่ยน Organization'
            >
              <IconSelector size={18} stroke={2} />
            </ActionIcon>
          </Menu.Target>
        </div>

        <Menu.Dropdown className={classes.dropdown}>
          <TextInput
            value={search}
            onChange={event => setSearch(event.currentTarget.value)}
            onKeyDown={event => event.stopPropagation()}
            placeholder='ค้นหา Organization...'
            leftSection={<IconSearch size={16} />}
            aria-label='ค้นหา Organization'
            size='sm'
            autoFocus
          />

          <Stack gap={4} mt='xs'>
            {filteredOrganizations.map(organization => {
              const selected = organization.id === activeId

              return (
                <Menu.Item
                  key={organization.id}
                  className={classes.organizationItem}
                  leftSection={
                    <Avatar radius='xl' size={28}>
                      {getOrganizationInitial(organization.name)}
                    </Avatar>
                  }
                  rightSection={
                    selected ? <IconCheck size={17} stroke={2.2} /> : null
                  }
                  onClick={() => void switchOrganization(organization.id)}
                >
                  <Stack gap={0}>
                    <Text size='sm' fw={600} truncate>
                      {organization.name}
                    </Text>
                    <Badge variant='light' size='xs' w='fit-content'>
                      {getOrganizationTypeLabel(organization.type)}
                    </Badge>
                  </Stack>
                </Menu.Item>
              )
            })}
          </Stack>

          {!filteredOrganizations.length && (
            <Stack
              className={classes.emptyState}
              align='center'
              gap={4}
              py='lg'
            >
              <IconBuilding size={22} stroke={1.5} />
              <Text size='sm' c='dimmed' ta='center'>
                ไม่พบ Organization
              </Text>
            </Stack>
          )}

          {showInviteAction && (
            <Menu.Item
              leftSection={<IconUsers size={18} />}
              onClick={openInviteMembers}
            >
              <Stack gap={0}>
                <Text size='sm' fw={600}>
                  เชิญสมาชิก
                </Text>
                <Text size='xs' c='dimmed'>
                  แชร์ Organization ให้กับทีม
                </Text>
              </Stack>
            </Menu.Item>
          )}
        </Menu.Dropdown>
      </Menu>

      <Modal
        opened={inviteOpened}
        onClose={() => {
          setInviteOpened(false)
          setInviteError(null)
          setCopiedInviteLink(false)
        }}
        title='เชิญสมาชิกเข้า Organization'
      >
        <form onSubmit={inviteForm.onSubmit(createInvitation)}>
          <Stack>
            <TextInput
              label='อีเมลสำหรับตรวจสอบสิทธิ์'
              required
              {...inviteForm.getInputProps('email')}
            />
            <Select
              label='บทบาท'
              value={selectedInviteRoleId || null}
              onChange={value =>
                inviteForm.setFieldValue('roleId', value ?? '')
              }
              error={inviteForm.errors.roleId}
              data={inviteRoles.map(role => ({
                value: role.id as string,
                label: role.name
              }))}
            />
            <Button
              type='submit'
              loading={invitationCreating || inviteForm.submitting}
              disabled={!inviteForm.values.roleId}
            >
              สร้างลิงก์เชิญ
            </Button>
            {inviteLink ? (
              <Stack gap='xs'>
                <Text size='sm' style={{ wordBreak: 'break-all' }}>
                  {inviteLink}
                </Text>
                <Button
                  type='button'
                  variant='subtle'
                  size='xs'
                  leftSection={
                    copiedInviteLink ? (
                      <IconCheck size={14} />
                    ) : (
                      <IconCopy size={14} />
                    )
                  }
                  onClick={() => void copyInviteLink()}
                >
                  {copiedInviteLink
                    ? t('copiedInviteLink')
                    : t('copyInviteLink')}
                </Button>
              </Stack>
            ) : null}
            {inviteError ? <Alert color='red'>{inviteError}</Alert> : null}
          </Stack>
        </form>
      </Modal>
    </>
  )
}
