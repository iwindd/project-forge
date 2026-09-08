'use client'

import {
  FilterResult,
  type FilterResultGroup,
  type FilterResultRemoveEvent
} from '@/admin/components/filter-result'
import TableSearchInput from '@/admin/components/table-search-input'
import { useAdminCacheInvalidation } from '@/admin/hooks/use-admin-cache-invalidation'
import useDatatable from '@/hooks/use-datatable'
import { parseListAuditLogsQuery } from '@/servers/audit-log/queries/get-audit-log-list-schema'
import type {
  AuditLogListItem,
  AuditLogListQuery
} from '@/servers/audit-log/types'
import { formatDateTime, formatThaiShortDate } from '@/utils/format'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Menu,
  Paper,
  Stack,
  Text
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconDotsVertical, IconFileCode, IconFilter } from '@tabler/icons-react'
import { DataTable, type DataTableColumn } from 'mantine-datatable'
import { useMemo, useState } from 'react'
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTOR_ROLE_LABELS,
  AUDIT_RESOURCE_TYPE_LABELS
} from './audit-log-labels'
import {
  getAuditLogExportUrl,
  useGetAuditLogsQuery,
  type AuditLogScopeArg
} from './audit-logs-api'
import {
  AuditLogsFilterDrawer,
  RELATIONSHIP_LABELS
} from './audit-logs-filter-drawer'
import classes from './audit-logs-table.module.css'

const SORTABLE_FIELDS = ['createdAt'] as const
const WIDE_SCREEN_QUERY = '(min-width: 75em)'

type AuditLogsTableProps = {
  /** `user` and `own` narrow the timeline to a single person. */
  scope: AuditLogScopeArg['kind']
  /** Required when `scope` is `user`. */
  userId?: string
}

function formatPeriodFilterLabel(from?: string, to?: string) {
  if (from && to) {
    return `ตั้งแต่ ${formatThaiShortDate(from)} - ${formatThaiShortDate(to)}`
  }

  if (from) {
    return `ตั้งแต่วันที่ ${formatThaiShortDate(from)} เป็นต้นไป`
  }

  if (to) {
    return `สิ้นสุดที่ ${formatThaiShortDate(to)}`
  }

  return ''
}

function UserCell({
  user,
  fallback
}: {
  user: AuditLogListItem['actor']
  fallback: string
}) {
  if (!user) {
    return (
      <Text size='sm' c='dimmed'>
        {fallback}
      </Text>
    )
  }

  return (
    <Stack gap={0}>
      <Text size='sm'>{user.name}</Text>
      <Text size='xs' c='dimmed'>
        {user.email}
      </Text>
    </Stack>
  )
}

function AuditLogExportMenuItem({
  scope,
  auditLogId
}: {
  scope: AuditLogScopeArg
  auditLogId: string
}) {
  const { invalidateAdminCaches } = useAdminCacheInvalidation()
  const [downloading, setDownloading] = useState(false)

  const downloadExport = async () => {
    setDownloading(true)
    try {
      const response = await fetch(getAuditLogExportUrl(scope, auditLogId), {
        cache: 'no-store'
      })
      if (!response.ok) throw new Error('audit export failed')

      const objectUrl = URL.createObjectURL(await response.blob())
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `audit-log-${auditLogId}.json`
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(objectUrl)
      invalidateAdminCaches()
    } catch {
      notifications.show({
        title: 'ดาวน์โหลดไม่สำเร็จ',
        message: 'ไม่สามารถส่งออกบันทึกกิจกรรมได้ กรุณาลองใหม่อีกครั้ง',
        color: 'red'
      })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Menu.Item
      leftSection={<IconFileCode size={16} />}
      disabled={downloading}
      onClick={() => void downloadExport()}
    >
      ดาวน์โหลด JSON
    </Menu.Item>
  )
}

export function AuditLogsTable({ scope, userId }: AuditLogsTableProps) {
  const scopeArg = useMemo<AuditLogScopeArg>(
    () =>
      scope === 'user'
        ? { kind: 'user', userId: userId ?? '' }
        : { kind: scope },
    [scope, userId]
  )
  const isPersonalTimeline = scope !== 'all'

  const columns = useMemo<DataTableColumn<AuditLogListItem>[]>(
    () => [
      {
        accessor: 'action',
        title: 'เหตุการณ์',
        render: record => (
          <Stack gap={4}>
            <Text size='sm' fw={500}>
              {AUDIT_ACTION_LABELS[record.action]}
            </Text>
            <Text size='xs' c='dimmed'>
              {formatDateTime(record.createdAt)}
            </Text>
          </Stack>
        )
      },
      {
        accessor: 'resourceType',
        title: 'ประเภท',
        render: record => (
          <Text size='sm' c='dimmed'>
            {AUDIT_RESOURCE_TYPE_LABELS[record.resourceType]}
          </Text>
        )
      },
      {
        accessor: 'actor',
        title: 'ผู้กระทำ',
        render: record => (
          <Stack gap={4}>
            <UserCell user={record.actor} fallback='ระบบ' />
          </Stack>
        )
      },
      {
        accessor: 'reason',
        title: 'หมายเหตุ/เหตุผล',
        visibleMediaQuery: WIDE_SCREEN_QUERY,
        render: record => (
          <Text
            size='sm'
            c={record.reason ? undefined : 'dimmed'}
            lineClamp={2}
          >
            {record.reason ?? '-'}
          </Text>
        )
      },
      {
        accessor: 'actions',
        title: '',
        width: '60px',
        textAlign: 'right' as const,
        render: record => {
          return (
            <Group gap='xs' justify='flex-end' wrap='nowrap'>
              <Menu shadow='md' position='bottom-end'>
                <Menu.Target>
                  <ActionIcon
                    variant='default-subtle'
                    aria-label={`เมนูของรายการ ${AUDIT_ACTION_LABELS[record.action]}`}
                  >
                    <IconDotsVertical size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <AuditLogExportMenuItem
                    scope={scopeArg}
                    auditLogId={record.id}
                  />
                </Menu.Dropdown>
              </Menu>
            </Group>
          )
        }
      }
    ],
    [scopeArg]
  )

  const datatable = useDatatable<AuditLogListItem, AuditLogListQuery>({
    parseQueryAction: parseListAuditLogsQuery,
    columns,
    sortableFields: SORTABLE_FIELDS,
    recordsPerPageOptions: [25, 50, 100]
  })
  const { query, setSearchValue, updateQuery } = datatable
  const { data, isFetching, isError } = useGetAuditLogsQuery(
    { scope: scopeArg, query },
    { skip: scope === 'user' && !userId }
  )
  const [filtersOpened, { close: closeFilters, open: openFilters }] =
    useDisclosure(false)

  const selectedActions = query.actions ?? []
  const selectedResourceTypes = query.resourceTypes ?? []
  const periodFilterLabel = formatPeriodFilterLabel(query.from, query.to)

  const filterGroups: FilterResultGroup[] = [
    {
      id: 'search',
      label: 'ค้นหา',
      filters: query.search
        ? [{ id: 'query', label: query.search, removeLabel: 'ลบคำค้นหา' }]
        : []
    },
    {
      id: 'actions',
      label: 'เหตุการณ์',
      filters: selectedActions.map(action => ({
        id: action,
        label: AUDIT_ACTION_LABELS[action],
        removeLabel: `ลบเหตุการณ์ ${AUDIT_ACTION_LABELS[action]}`
      }))
    },
    {
      id: 'resourceTypes',
      label: 'ประเภทข้อมูล',
      filters: selectedResourceTypes.map(resourceType => ({
        id: resourceType,
        label: AUDIT_RESOURCE_TYPE_LABELS[resourceType],
        removeLabel: `ลบประเภทข้อมูล ${AUDIT_RESOURCE_TYPE_LABELS[resourceType]}`
      }))
    },
    {
      id: 'actorRole',
      label: 'บทบาทผู้กระทำ',
      filters: query.actorRole
        ? [
            {
              id: query.actorRole,
              label: AUDIT_ACTOR_ROLE_LABELS[query.actorRole],
              removeLabel: 'ลบบทบาทผู้กระทำ'
            }
          ]
        : []
    },
    {
      id: 'relationship',
      label: 'ความเกี่ยวข้อง',
      filters:
        isPersonalTimeline && query.relationship !== 'all'
          ? [
              {
                id: query.relationship,
                label: RELATIONSHIP_LABELS[query.relationship],
                removeLabel: 'ลบความเกี่ยวข้อง'
              }
            ]
          : []
    },
    {
      id: 'period',
      label: 'ช่วงวันที่',
      filters: periodFilterLabel
        ? [
            {
              id: 'range',
              label: periodFilterLabel,
              removeLabel: 'ลบช่วงวันที่'
            }
          ]
        : []
    }
  ]

  const removeFilter = ({ groupId, filterId }: FilterResultRemoveEvent) => {
    if (groupId === 'search') {
      setSearchValue.cancel()
      updateQuery({ search: undefined, page: 1 })
    } else if (groupId === 'actions') {
      const nextActions = selectedActions.filter(action => action !== filterId)
      updateQuery({
        actions: nextActions.length ? nextActions.join(',') : undefined,
        page: 1
      })
    } else if (groupId === 'resourceTypes') {
      const nextResourceTypes = selectedResourceTypes.filter(
        resourceType => resourceType !== filterId
      )
      updateQuery({
        resourceTypes: nextResourceTypes.length
          ? nextResourceTypes.join(',')
          : undefined,
        page: 1
      })
    } else if (groupId === 'actorRole') {
      updateQuery({ actorRole: undefined, page: 1 })
    } else if (groupId === 'relationship') {
      updateQuery({ relationship: 'all', page: 1 })
    } else if (groupId === 'period') {
      updateQuery({ from: undefined, to: undefined, page: 1 })
    }
  }

  const clearFilters = () => {
    setSearchValue.cancel()
    updateQuery({
      search: undefined,
      actions: undefined,
      resourceTypes: undefined,
      actorRole: undefined,
      relationship: 'all',
      from: undefined,
      to: undefined,
      page: 1
    })
  }

  const activeFilterCount = filterGroups
    .filter(group => group.id !== 'search')
    .reduce((count, group) => count + group.filters.length, 0)

  return (
    <Stack gap='lg'>
      <Stack gap='sm'>
        <Group gap='sm' justify='space-between' align='flex-end' wrap='wrap'>
          <TableSearchInput
            className={classes.search}
            placeholder='ค้นหาจากผู้ใช้งาน เหตุผล หรือรหัสข้อมูล'
            key={query.search ?? ''}
            defaultValue={query.search ?? ''}
            onSearch={setSearchValue}
          />
          <Button
            type='button'
            variant='default-subtle'
            leftSection={<IconFilter size={18} />}
            rightSection={
              activeFilterCount > 0 ? (
                <Badge size='sm' variant='default'>
                  {activeFilterCount}
                </Badge>
              ) : null
            }
            onClick={openFilters}
            aria-controls='audit-log-filter-drawer'
            aria-expanded={filtersOpened}
            aria-label='เปิดตัวกรอง'
          >
            ตัวกรอง
          </Button>
        </Group>
      </Stack>

      <AuditLogsFilterDrawer
        opened={filtersOpened}
        onCloseAction={closeFilters}
        query={query}
        isPersonalTimeline={isPersonalTimeline}
        activeFilterCount={activeFilterCount}
        updateQueryAction={updateQuery}
        clearFiltersAction={clearFilters}
      />

      <FilterResult
        filters={filterGroups}
        onRemoveAction={removeFilter}
        onClearAllAction={clearFilters}
      />

      {isError ? (
        <Alert color='red'>ไม่สามารถโหลดประวัติการทำรายการได้</Alert>
      ) : null}

      <Paper p={0}>
        <DataTable<AuditLogListItem>
          {...datatable.props}
          fetching={isFetching}
          records={data?.data ?? []}
          columns={columns}
          totalRecords={data?.total ?? 0}
          noRecordsText='ไม่พบประวัติการทำรายการ'
        />
      </Paper>
    </Stack>
  )
}
