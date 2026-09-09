'use client'

import { PageHeader } from '@/components/page-header'
import {
  useCreateInvitationMutation,
  useGetInvitationsQuery,
  useGetMembersQuery,
  useGetRolesQuery,
  useRemoveMemberMutation,
  useUpdateMemberRoleMutation,
  useUpdateMemberStatusMutation,
  type OrganizationMember,
  type OrganizationRole
} from '@/lib/features/organization/organization-members-api'
import { useOrganizationContext } from '@/lib/features/organization/organization-provider'
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Checkbox,
  Group,
  Loader,
  Menu,
  Paper,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconAlertCircle,
  IconCalendar,
  IconCheck,
  IconDots,
  IconExternalLink,
  IconPlus,
  IconSearch,
  IconUserPlus
} from '@tabler/icons-react'
import { useFormatter, useTranslations } from 'next-intl'
import { useMemo, useRef, useState } from 'react'
import classes from './members-page.module.css'

type MembersTab = 'members' | 'invitations'
type MemberRoleFilter = 'all' | string
type MemberStatusFilter = 'all' | 'active' | 'inactive'

type InviteRow = {
  id: string
  email: string
  roleId: string
}

const INITIAL_INVITE_ROW: InviteRow = {
  id: 'invite-0',
  email: '',
  roleId: ''
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'U'
}

export default function OrganizationMembersPage() {
  const t = useTranslations('OrganizationMembers')
  const format = useFormatter()
  const { activeOrganization } = useOrganizationContext()
  const organizationId = activeOrganization?.id ?? ''
  const canManage = Boolean(
    activeOrganization?.type === 'SHARED' &&
    (activeOrganization.role.isOwner ||
      activeOrganization.role.permissions.includes('organization.manage'))
  )

  const [activeTab, setActiveTab] = useState<MembersTab>('members')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<MemberRoleFilter>('all')
  const [status, setStatus] = useState<MemberStatusFilter>('all')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [inviteRows, setInviteRows] = useState<InviteRow[]>([
    INITIAL_INVITE_ROW
  ])
  const [inviteLinks, setInviteLinks] = useState<
    Array<{ email: string | null; url: string }>
  >([])
  const [memberActionId, setMemberActionId] = useState<string | null>(null)
  const nextInviteRowId = useRef(1)

  const legacyRoleFilter = ['OWNER', 'ADMIN', 'MEMBER'].includes(roleFilter)
    ? roleFilter
    : null

  const memberQuery = useMemo(
    () => ({
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(roleFilter !== 'all'
        ? legacyRoleFilter
          ? { role: legacyRoleFilter as 'OWNER' | 'ADMIN' | 'MEMBER' }
          : { roleId: roleFilter }
        : {}),
      ...(status !== 'all' ? { status } : {}),
      page: 1,
      pageSize: 100,
      sortBy: 'createdAt' as const,
      sortDirection
    }),
    [legacyRoleFilter, roleFilter, search, sortDirection, status]
  )

  const {
    data: membersResult,
    isError: membersError,
    isFetching: membersFetching
  } = useGetMembersQuery(
    { organizationId, query: memberQuery },
    { skip: !organizationId }
  )
  const { data: rolesResult } = useGetRolesQuery(
    { organizationId },
    { skip: !organizationId || !canManage }
  )
  const {
    data: invitationsResult,
    isError: invitationsError,
    isFetching: invitationsFetching
  } = useGetInvitationsQuery(
    { organizationId },
    { skip: !organizationId || !canManage || activeTab !== 'invitations' }
  )
  const [createInvitation, { isLoading: invitePending }] =
    useCreateInvitationMutation()
  const [updateMemberRole, { isLoading: rolePending }] =
    useUpdateMemberRoleMutation()
  const [updateMemberStatus, { isLoading: statusPending }] =
    useUpdateMemberStatusMutation()
  const [removeMember, { isLoading: removePending }] = useRemoveMemberMutation()
  const memberMutationPending = rolePending || statusPending || removePending

  const members = membersResult?.data ?? []
  const roles = useMemo(() => rolesResult?.data ?? [], [rolesResult?.data])
  const assignableRoles = useMemo(
    () =>
      roles.filter(
        (candidate): candidate is OrganizationRole & { id: string } =>
          Boolean(candidate.id) && !candidate.isOwner
      ),
    [roles]
  )
  const invitations = invitationsResult ?? []
  const allVisibleSelected =
    members.length > 0 &&
    members.every(member => selectedIds.includes(member.id))
  const someVisibleSelected = members.some(member =>
    selectedIds.includes(member.id)
  )

  const updateInviteRow = (id: string, changes: Partial<InviteRow>) => {
    setInviteRows(rows =>
      rows.map(row => (row.id === id ? { ...row, ...changes } : row))
    )
  }

  const addInviteRow = () => {
    const id = `invite-${nextInviteRowId.current}`
    nextInviteRowId.current += 1
    setInviteRows(rows => [
      ...rows,
      { id, email: '', roleId: assignableRoles[0]?.id ?? '' }
    ])
  }

  const submitInvitations = async () => {
    if (!organizationId || !canManage) return
    if (!assignableRoles.length) return

    const rows = inviteRows.filter(
      row => row.email.trim() || inviteRows.length === 1
    )
    if (!rows.length) return

    try {
      const results = await Promise.all(
        rows.map(row =>
          createInvitation({
            organizationId,
            email: row.email.trim() || null,
            roleId: row.roleId || assignableRoles[0].id
          }).unwrap()
        )
      )

      setInviteLinks(
        results.map((result, index) => ({
          email: rows[index]?.email.trim() || result.invitation.email,
          url: `${window.location.origin}/admin/invitations/${result.token}`
        }))
      )
      setInviteRows([{ ...INITIAL_INVITE_ROW, id: 'invite-0' }])
      notifications.show({ message: t('inviteSuccess'), color: 'teal' })
    } catch {
      notifications.show({ message: t('inviteFailed'), color: 'red' })
    }
  }

  const runMemberAction = async (
    member: OrganizationMember,
    action: () => Promise<unknown>
  ) => {
    setMemberActionId(member.id)
    try {
      await action()
      notifications.show({ message: t('actionSuccess'), color: 'teal' })
    } catch {
      notifications.show({ message: t('actionFailed'), color: 'red' })
    } finally {
      setMemberActionId(null)
    }
  }

  const changeRole = (member: OrganizationMember, roleId: string) => {
    if (!organizationId || member.role.isOwner) return
    void runMemberAction(member, () =>
      updateMemberRole({
        organizationId,
        userId: member.id,
        roleId
      }).unwrap()
    )
  }

  const changeStatus = (member: OrganizationMember) => {
    if (!organizationId) return
    void runMemberAction(member, () =>
      updateMemberStatus({
        organizationId,
        userId: member.id,
        active: !member.isActive
      }).unwrap()
    )
  }

  const remove = (member: OrganizationMember) => {
    if (
      !organizationId ||
      !window.confirm(t('removeConfirm', { name: member.name }))
    ) {
      return
    }
    void runMemberAction(member, () =>
      removeMember({ organizationId, userId: member.id }).unwrap()
    )
  }

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(ids =>
        ids.filter(id => !members.some(member => member.id === id))
      )
      return
    }
    setSelectedIds(ids =>
      Array.from(new Set([...ids, ...members.map(member => member.id)]))
    )
  }

  const toggleSelected = (id: string) => {
    setSelectedIds(ids =>
      ids.includes(id)
        ? ids.filter(selectedId => selectedId !== id)
        : [...ids, id]
    )
  }

  return (
    <Box className={classes.page}>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Paper className={classes.inviteCard} withBorder radius='md'>
        <Stack className={classes.inviteContent} gap='md'>
          <Stack gap={4}>
            <Text className={classes.inviteHeading} fw={700}>
              {t('inviteTitle')}
            </Text>
            <Text className={classes.inviteDescription} size='sm'>
              {t('inviteDescription')}
            </Text>
          </Stack>

          {canManage ? (
            <>
              <Box className={classes.inviteRows}>
                {inviteRows.map(row => (
                  <Box className={classes.inviteRow} key={row.id}>
                    <TextInput
                      label={t('emailAddress')}
                      placeholder={t('emailPlaceholder')}
                      type='email'
                      value={row.email}
                      onChange={event =>
                        updateInviteRow(row.id, {
                          email: event.currentTarget.value
                        })
                      }
                    />
                    <Select
                      label={t('role')}
                      value={row.roleId || assignableRoles[0]?.id || null}
                      data={assignableRoles.map(role => ({
                        value: role.id,
                        label: role.name
                      }))}
                      onChange={value =>
                        value && updateInviteRow(row.id, { roleId: value })
                      }
                    />
                  </Box>
                ))}
              </Box>
              <Group className={classes.inviteActions} justify='space-between'>
                <Button
                  variant='default'
                  leftSection={<IconPlus size={16} />}
                  onClick={addInviteRow}
                >
                  {t('addMore')}
                </Button>
                <Button
                  leftSection={<IconUserPlus size={16} />}
                  loading={invitePending}
                  onClick={() => void submitInvitations()}
                >
                  {t('invite')}
                </Button>
              </Group>
              {inviteLinks.length > 0 ? (
                <Stack className={classes.inviteLinks} gap='xs'>
                  <Text size='sm' fw={600}>
                    {t('inviteLink')}
                  </Text>
                  {inviteLinks.map(link => (
                    <Group
                      key={link.url}
                      gap='xs'
                      wrap='nowrap'
                      align='flex-start'
                    >
                      <IconExternalLink size={16} />
                      <Text className={classes.inviteLink} size='sm'>
                        {link.email ? `${link.email}: ` : ''}
                        {link.url}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              ) : null}
            </>
          ) : (
            <Alert
              color='gray'
              icon={<IconAlertCircle size={18} />}
              variant='light'
            >
              {activeOrganization?.type === 'PERSONAL'
                ? t('personalWorkspaceNotice')
                : t('invitePermissionNotice')}
            </Alert>
          )}
        </Stack>
        <Group className={classes.inviteFooter} justify='space-between'>
          <Text size='sm' c='dimmed'>
            คำเชิญจะหมดอายุภายใน 7 วัน
          </Text>
        </Group>
      </Paper>

      <Tabs
        className={classes.tabs}
        value={activeTab}
        onChange={value => value && setActiveTab(value as MembersTab)}
      >
        <Tabs.List className={classes.tabsList}>
          <Tabs.Tab className={classes.tab} value='members'>
            {t('teamMembers')}
          </Tabs.Tab>
          <Tabs.Tab
            className={classes.tab}
            value='invitations'
            disabled={!canManage}
          >
            {t('pendingInvitations')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel className={classes.tabPanel} value='members'>
          <Stack gap='sm'>
            <Box className={classes.toolbar}>
              <TextInput
                placeholder={t('filterPlaceholder')}
                value={search}
                onChange={event => setSearch(event.currentTarget.value)}
                leftSection={<IconSearch size={16} />}
                aria-label={t('filterPlaceholder')}
              />
              <Select
                value={roleFilter}
                data={[
                  { value: 'all', label: t('allRoles') },
                  ...roles.map(role => ({
                    value: role.id ?? role.legacyRole ?? role.name,
                    label: role.name
                  }))
                ]}
                onChange={value =>
                  setRoleFilter((value as MemberRoleFilter) ?? 'all')
                }
                aria-label={t('allRoles')}
              />
              <Select
                value={status}
                data={[
                  { value: 'all', label: t('allStatuses') },
                  { value: 'active', label: t('active') },
                  { value: 'inactive', label: t('inactive') }
                ]}
                onChange={value =>
                  setStatus((value as MemberStatusFilter) ?? 'all')
                }
                aria-label={t('allStatuses')}
              />
              <Select
                value={sortDirection}
                data={[
                  { value: 'desc', label: `${t('date')} ↓` },
                  { value: 'asc', label: `${t('date')} ↑` }
                ]}
                onChange={value =>
                  setSortDirection((value as 'asc' | 'desc') ?? 'desc')
                }
                leftSection={<IconCalendar size={16} />}
                aria-label={t('date')}
              />
            </Box>

            {membersError ? (
              <Alert color='red' icon={<IconAlertCircle size={18} />}>
                {t('loadFailed')}
              </Alert>
            ) : null}

            <Paper className={classes.membersCard} withBorder radius='md'>
              {membersFetching ? (
                <Center className={classes.emptyState}>
                  <Loader size='sm' />
                </Center>
              ) : members.length ? (
                <>
                  <Box className={classes.tableScroll}>
                    <Table className={classes.table} verticalSpacing='xs'>
                      <thead>
                        <tr>
                          <th>
                            <Checkbox
                              checked={allVisibleSelected}
                              indeterminate={
                                !allVisibleSelected && someVisibleSelected
                              }
                              onChange={toggleAll}
                              aria-label='เลือกสมาชิกทั้งหมด'
                            />
                          </th>
                          <th>{t('name')}</th>
                          <th>{t('role')}</th>
                          <th>{t('status')}</th>
                          <th>{t('date')}</th>
                          <th aria-label={t('actions')} />
                        </tr>
                      </thead>
                      <tbody>
                        {members.map(member => {
                          const rowPending =
                            memberActionId === member.id &&
                            memberMutationPending
                          return (
                            <tr key={member.id}>
                              <td>
                                <Checkbox
                                  checked={selectedIds.includes(member.id)}
                                  onChange={() => toggleSelected(member.id)}
                                  aria-label={`เลือก ${member.name}`}
                                />
                              </td>
                              <td>
                                <Group
                                  className={classes.memberIdentity}
                                  gap='sm'
                                  wrap='nowrap'
                                >
                                  <Avatar radius='xl' size={34}>
                                    {getInitial(member.name)}
                                  </Avatar>
                                  <Stack gap={0}>
                                    <Text fw={600}>{member.name}</Text>
                                    <Text
                                      className={classes.memberEmail}
                                      size='sm'
                                    >
                                      {member.email ?? '-'}
                                    </Text>
                                  </Stack>
                                </Group>
                              </td>
                              <td>
                                <Badge variant='light'>
                                  {member.role.name}
                                </Badge>
                              </td>
                              <td>
                                <Badge
                                  color={member.isActive ? 'teal' : 'gray'}
                                  variant='light'
                                  leftSection={
                                    member.isActive ? (
                                      <IconCheck size={12} />
                                    ) : undefined
                                  }
                                >
                                  {member.isActive
                                    ? t('active')
                                    : t('inactive')}
                                </Badge>
                              </td>
                              <td>
                                {format.dateTime(
                                  new Date(member.createdAt),
                                  'date'
                                )}
                              </td>
                              <td>
                                {canManage ? (
                                  <Menu shadow='md' position='bottom-end'>
                                    <Menu.Target>
                                      <ActionIcon
                                        variant='subtle'
                                        loading={rowPending}
                                        aria-label={`${t('actions')}: ${member.name}`}
                                      >
                                        <IconDots size={18} />
                                      </ActionIcon>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                      {!member.role.isOwner
                                        ? assignableRoles.map(roleOption => (
                                            <Menu.Item
                                              key={roleOption.id}
                                              disabled={
                                                member.role.id === roleOption.id
                                              }
                                              onClick={() =>
                                                changeRole(
                                                  member,
                                                  roleOption.id
                                                )
                                              }
                                            >
                                              {roleOption.name}
                                            </Menu.Item>
                                          ))
                                        : null}
                                      <Menu.Item
                                        onClick={() => changeStatus(member)}
                                      >
                                        {member.isActive
                                          ? t('suspend')
                                          : t('activate')}
                                      </Menu.Item>
                                      {!member.role.isOwner ? (
                                        <Menu.Item
                                          color='red'
                                          onClick={() => remove(member)}
                                        >
                                          {t('remove')}
                                        </Menu.Item>
                                      ) : null}
                                    </Menu.Dropdown>
                                  </Menu>
                                ) : null}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </Table>
                  </Box>
                  <Group
                    className={classes.tableFooter}
                    justify='space-between'
                  >
                    <Text size='sm' c='dimmed'>
                      {membersResult?.total ?? members.length} รายการ
                    </Text>
                    {selectedIds.length > 0 ? (
                      <Text size='sm' c='dimmed'>
                        เลือกแล้ว {selectedIds.length} รายการ
                      </Text>
                    ) : null}
                  </Group>
                </>
              ) : (
                <Stack
                  className={classes.emptyState}
                  align='center'
                  justify='center'
                  gap='xs'
                >
                  <IconUserPlus size={28} stroke={1.5} />
                  <Text c='dimmed'>{t('noMembers')}</Text>
                </Stack>
              )}
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel className={classes.tabPanel} value='invitations'>
          {invitationsError ? (
            <Alert color='red' icon={<IconAlertCircle size={18} />}>
              {t('invitationsLoadFailed')}
            </Alert>
          ) : (
            <Paper className={classes.membersCard} withBorder radius='md'>
              {invitationsFetching ? (
                <Center className={classes.emptyState}>
                  <Loader size='sm' />
                </Center>
              ) : invitations.length ? (
                invitations.map(invitation => (
                  <Box className={classes.invitationRow} key={invitation.id}>
                    <Stack className={classes.invitationEmail} gap={2}>
                      <Text fw={600}>{invitation.email ?? 'ลิงก์ทั่วไป'}</Text>
                      <Text size='sm' c='dimmed'>
                        {t('inviteLink')} ·{' '}
                        {format.dateTime(
                          new Date(invitation.createdAt),
                          'date'
                        )}
                      </Text>
                    </Stack>
                    <Badge variant='light'>{invitation.role.name}</Badge>
                    <Text size='sm' c='dimmed'>
                      {t('expiresAt')}{' '}
                      {format.dateTime(new Date(invitation.expiresAt), 'date')}
                    </Text>
                  </Box>
                ))
              ) : (
                <Stack
                  className={classes.emptyState}
                  align='center'
                  justify='center'
                  gap='xs'
                >
                  <IconUserPlus size={28} stroke={1.5} />
                  <Text c='dimmed'>{t('noInvitations')}</Text>
                </Stack>
              )}
            </Paper>
          )}
        </Tabs.Panel>
      </Tabs>
    </Box>
  )
}
