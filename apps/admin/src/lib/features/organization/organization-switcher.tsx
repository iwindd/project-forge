'use client'

import { getBrowserApiErrorMessage } from '@/lib/api/api'
import { getPath } from '@/routes'
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Button,
  Divider,
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
  IconPlus,
  IconSearch,
  IconSelector,
  IconUsers
} from '@tabler/icons-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import {
  useCreateInvitationMutation,
  useGetRolesQuery
} from './organization-members-api'
import { useCreateOrganizationMutation } from './organization-api'
import { useOrganizationContext } from './organization-provider'
import { databaseUuidSchema } from './organization-schemas'
import type { Organization } from './types'
import classes from './organization-switcher.module.css'

export const createOrganizationFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'กรุณาระบุชื่อ Organization')
    .max(120, 'ชื่อ Organization ต้องไม่เกิน 120 ตัวอักษร')
})

export const inviteMemberFormSchema = z.object({
  email: z
    .string()
    .trim()
    .email('กรุณาระบุอีเมลให้ถูกต้อง')
    .or(z.literal('')),
  roleId: databaseUuidSchema
})

type CreateOrganizationFormValues = z.infer<
  typeof createOrganizationFormSchema
>
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
  const {
    organizations,
    activeId,
    activeOrganization,
    pending: switchPending,
    loadOrganizations,
    switchOrganization
  } = useOrganizationContext()
  const router = useRouter()
  const [createOrganizationMutation, { isLoading: organizationCreating }] =
    useCreateOrganizationMutation()
  const [createInvitationMutation, { isLoading: invitationCreating }] =
    useCreateInvitationMutation()
  const { data: rolesResult } = useGetRolesQuery(
    { organizationId: activeOrganization?.id ?? '' },
    { skip: !activeOrganization || !canInviteMembers(activeOrganization) }
  )
  const [createOpened, setCreateOpened] = useState(false)
  const [inviteOpened, setInviteOpened] = useState(false)
  const [search, setSearch] = useState('')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const pending = switchPending || organizationCreating || invitationCreating
  const createForm = useForm<CreateOrganizationFormValues>({
    initialValues: { name: '' },
    validate: schemaResolver(createOrganizationFormSchema),
    validateInputOnBlur: true
  })
  const inviteForm = useForm<InviteMemberFormValues>({
    initialValues: { email: '', roleId: '' },
    validate: schemaResolver(inviteMemberFormSchema),
    validateInputOnBlur: true
  })
  const inviteRoles = useMemo(
    () =>
      (rolesResult?.data ?? []).filter(
        role => Boolean(role.id) && !role.isOwner
      ),
    [rolesResult?.data]
  )
  const selectedInviteRoleId = inviteForm.values.roleId || inviteRoles[0]?.id || ''

  const createOrganization = async (values: CreateOrganizationFormValues) => {
    setCreateError(null)
    try {
      const result = await createOrganizationMutation(values).unwrap()
      createForm.reset()
      setCreateOpened(false)
      await loadOrganizations()
      router.push(`/${encodeURIComponent(result.organization.slug)}`)
    } catch (error) {
      setCreateError(
        getBrowserApiErrorMessage(error, 'ไม่สามารถสร้าง Organization ได้')
      )
    }
  }

  const createInvitation = async (values: InviteMemberFormValues) => {
    if (!activeOrganization) return

    setInviteError(null)
    try {
      const result = await createInvitationMutation({
        organizationId: activeOrganization.id,
        email: values.email || null,
        roleId: values.roleId
      }).unwrap()
      setInviteLink(
        `${window.location.origin}/admin/invitations/${result.token}`
      )
      inviteForm.setFieldValue('email', '')
    } catch (error) {
      setInviteError(
        getBrowserApiErrorMessage(error, 'ไม่สามารถสร้างลิงก์เชิญได้')
      )
    }
  }

  const openCreateOrganization = () => {
    setCreateError(null)
    createForm.reset()
    setCreateOpened(true)
  }

  const openInviteMembers = () => {
    setInviteError(null)
    if (!inviteForm.values.roleId && inviteRoles[0]?.id) {
      inviteForm.setFieldValue('roleId', inviteRoles[0].id)
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

          <Divider my='sm' />

          <Menu.Item
            leftSection={<IconPlus size={18} />}
            onClick={openCreateOrganization}
          >
            <Stack gap={0}>
              <Text size='sm' fw={600}>
                สร้าง Organization
              </Text>
              <Text size='xs' c='dimmed'>
                สร้าง workspace สำหรับทีมของคุณ
              </Text>
            </Stack>
          </Menu.Item>

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
        opened={createOpened}
        onClose={() => {
          setCreateOpened(false)
          setCreateError(null)
        }}
        title='สร้าง Organization'
      >
        <form onSubmit={createForm.onSubmit(createOrganization)}>
          <Stack>
            <TextInput
              label='ชื่อ Organization'
              {...createForm.getInputProps('name')}
            />
            <Button
              type='submit'
              loading={organizationCreating || createForm.submitting}
            >
              สร้าง
            </Button>
            {createError ? <Alert color='red'>{createError}</Alert> : null}
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={inviteOpened}
        onClose={() => {
          setInviteOpened(false)
          setInviteError(null)
        }}
        title='เชิญสมาชิกเข้า Organization'
      >
        <form onSubmit={inviteForm.onSubmit(createInvitation)}>
          <Stack>
            <TextInput
              label='อีเมลสำหรับตรวจสอบสิทธิ์ (ไม่บังคับ)'
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
              <Text size='sm' style={{ wordBreak: 'break-all' }}>
                {inviteLink}
              </Text>
            ) : null}
            {inviteError ? <Alert color='red'>{inviteError}</Alert> : null}
          </Stack>
        </form>
      </Modal>
    </>
  )
}
