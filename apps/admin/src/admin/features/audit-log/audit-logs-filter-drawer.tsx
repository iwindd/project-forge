'use client'

import type { AuditLogListQuery } from '@/servers/audit-log/types'
import {
  Accordion,
  Badge,
  Button,
  Checkbox,
  Drawer,
  Group,
  Radio,
  ScrollArea,
  Stack,
  Text,
  TextInput
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import {
  IconArrowsLeftRight,
  IconCalendar,
  IconDatabase,
  IconListDetails,
  IconSearch,
  IconShield
} from '@tabler/icons-react'
import { useState, type MouseEvent } from 'react'
import {
  AUDIT_ACTION_GROUPS,
  AUDIT_ACTOR_ROLE_LABELS,
  AUDIT_RESOURCE_TYPE_OPTIONS
} from './audit-log-labels'
import classes from './audit-logs-filter-drawer.module.css'

export const RELATIONSHIP_LABELS = {
  all: 'ทั้งหมด',
  actor: 'เป็นผู้กระทำ',
  target: 'ถูกกระทำ'
} as const

const ACTOR_ROLE_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'ADMIN', label: AUDIT_ACTOR_ROLE_LABELS.ADMIN },
  { value: 'EDITOR', label: AUDIT_ACTOR_ROLE_LABELS.EDITOR }
] as const

const RELATIONSHIP_OPTIONS = Object.entries(RELATIONSHIP_LABELS).map(
  ([value, label]) => ({ value, label })
)

type MultiFilterGroup = {
  group?: string
  items: { value: string; label: string }[]
}

type FilterQueryUpdates = Record<
  string,
  string | number | readonly string[] | undefined
>

type AuditLogsFilterDrawerProps = {
  opened: boolean
  onCloseAction: () => void
  query: AuditLogListQuery
  isPersonalTimeline: boolean
  activeFilterCount: number
  updateQueryAction: (updates: FilterQueryUpdates) => void
  clearFiltersAction: () => void
}

function activateOptionOnRowClick(event: MouseEvent<HTMLDivElement>) {
  const target = event.target

  if (target instanceof Element && target.closest('input, label')) {
    return
  }

  event.currentTarget.querySelector<HTMLInputElement>('input')?.click()
}

function MultiFilterList({
  groups,
  selected,
  onChangeAction
}: {
  groups: MultiFilterGroup[]
  selected: string[]
  onChangeAction: (values: string[]) => void
}) {
  const toggleValue = (value: string) => {
    onChangeAction(
      selected.includes(value)
        ? selected.filter(item => item !== value)
        : [...selected, value]
    )
  }

  return (
    <Stack gap='md'>
      {groups.map(group => (
        <Stack key={group.group ?? 'options'} gap={4}>
          {group.group ? (
            <Text size='xs' fw={700} c='dimmed' tt='uppercase'>
              {group.group}
            </Text>
          ) : null}
          <Stack gap={2}>
            {group.items.map(item => (
              <Checkbox
                key={item.value}
                size='sm'
                checked={selected.includes(item.value)}
                label={item.label}
                className={classes.filterOption}
                wrapperProps={{ onClick: activateOptionOnRowClick }}
                onChange={() => toggleValue(item.value)}
              />
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  )
}

function ActionFilterList({
  groups,
  selected,
  onChangeAction
}: {
  groups: MultiFilterGroup[]
  selected: string[]
  onChangeAction: (values: string[]) => void
}) {
  const [search, setSearch] = useState('')
  const keyword = search.trim().toLowerCase()
  const visibleGroups = groups
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        item.label.toLowerCase().includes(keyword)
      )
    }))
    .filter(group => group.items.length > 0)

  return (
    <Stack gap='sm'>
      <TextInput
        value={search}
        onChange={event => setSearch(event.currentTarget.value)}
        placeholder='ค้นหาเหตุการณ์'
        aria-label='ค้นหาเหตุการณ์'
        leftSection={<IconSearch size={16} />}
      />
      <ScrollArea.Autosize mah={360} type='scroll'>
        {visibleGroups.length > 0 ? (
          <MultiFilterList
            groups={visibleGroups}
            selected={selected}
            onChangeAction={onChangeAction}
          />
        ) : (
          <Text size='sm' c='dimmed' ta='center' py='md'>
            ไม่พบเหตุการณ์
          </Text>
        )}
      </ScrollArea.Autosize>
    </Stack>
  )
}

function SingleFilterList({
  value,
  options,
  onChangeAction
}: {
  value: string
  options: readonly { value: string; label: string }[]
  onChangeAction: (value: string) => void
}) {
  return (
    <Radio.Group value={value} onChange={onChangeAction}>
      <Stack gap={2}>
        {options.map(option => (
          <Radio
            key={option.value}
            value={option.value}
            label={option.label}
            size='sm'
            className={classes.filterOption}
            wrapperProps={{ onClick: activateOptionOnRowClick }}
          />
        ))}
      </Stack>
    </Radio.Group>
  )
}

function FilterSectionLabel({
  label,
  count
}: {
  label: string
  count: number
}) {
  return (
    <Group component='span' gap='xs' wrap='nowrap'>
      <Text component='span' size='sm' fw={600}>
        {label}
      </Text>
      {count > 0 ? (
        <Badge size='sm' variant='light' color='brand'>
          {count}
        </Badge>
      ) : null}
    </Group>
  )
}

export function AuditLogsFilterDrawer({
  opened,
  onCloseAction,
  query,
  isPersonalTimeline,
  activeFilterCount,
  updateQueryAction,
  clearFiltersAction
}: AuditLogsFilterDrawerProps) {
  const selectedActions = query.actions ?? []
  const selectedResourceTypes = query.resourceTypes ?? []

  return (
    <Drawer
      id='audit-log-filter-drawer'
      opened={opened}
      onClose={onCloseAction}
      position='right'
      size='min(380px, 100vw)'
      title='ตัวกรองประวัติ'
      overlayProps={{ backgroundOpacity: 0.45, blur: 2 }}
    >
      <ScrollArea className={classes.filterDrawerScroll} type='scroll'>
        <Stack className={classes.filterDrawerContent} gap='0'>
          <Accordion
            variant='filled'
            radius='md'
            classNames={{
              item: classes.filterAccordionItem,
              control: classes.filterAccordionControl,
              panel: classes.filterAccordionPanel,
              content: classes.filterAccordionContent
            }}
          >
            <Accordion.Item value='actions'>
              <Accordion.Control icon={<IconListDetails size={18} />}>
                <FilterSectionLabel
                  label='เหตุการณ์'
                  count={selectedActions.length}
                />
              </Accordion.Control>
              <Accordion.Panel>
                <ActionFilterList
                  groups={AUDIT_ACTION_GROUPS}
                  selected={selectedActions}
                  onChangeAction={values =>
                    updateQueryAction({
                      actions: values.length ? values.join(',') : undefined,
                      page: 1
                    })
                  }
                />
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value='resourceTypes'>
              <Accordion.Control icon={<IconDatabase size={18} />}>
                <FilterSectionLabel
                  label='ประเภทข้อมูล'
                  count={selectedResourceTypes.length}
                />
              </Accordion.Control>
              <Accordion.Panel>
                <ScrollArea.Autosize mah={320} type='scroll'>
                  <MultiFilterList
                    groups={[{ items: AUDIT_RESOURCE_TYPE_OPTIONS }]}
                    selected={selectedResourceTypes}
                    onChangeAction={values =>
                      updateQueryAction({
                        resourceTypes: values.length
                          ? values.join(',')
                          : undefined,
                        page: 1
                      })
                    }
                  />
                </ScrollArea.Autosize>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value='actorRole'>
              <Accordion.Control icon={<IconShield size={18} />}>
                <FilterSectionLabel
                  label='บทบาทผู้กระทำ'
                  count={query.actorRole ? 1 : 0}
                />
              </Accordion.Control>
              <Accordion.Panel>
                <SingleFilterList
                  value={query.actorRole ?? 'all'}
                  options={ACTOR_ROLE_OPTIONS}
                  onChangeAction={value =>
                    updateQueryAction({
                      actorRole: value === 'all' ? undefined : value,
                      page: 1
                    })
                  }
                />
              </Accordion.Panel>
            </Accordion.Item>

            {isPersonalTimeline ? (
              <Accordion.Item value='relationship'>
                <Accordion.Control icon={<IconArrowsLeftRight size={18} />}>
                  <FilterSectionLabel
                    label='ความเกี่ยวข้อง'
                    count={query.relationship !== 'all' ? 1 : 0}
                  />
                </Accordion.Control>
                <Accordion.Panel>
                  <SingleFilterList
                    value={query.relationship}
                    options={RELATIONSHIP_OPTIONS}
                    onChangeAction={value =>
                      updateQueryAction({ relationship: value, page: 1 })
                    }
                  />
                </Accordion.Panel>
              </Accordion.Item>
            ) : null}

            <Accordion.Item value='period'>
              <Accordion.Control icon={<IconCalendar size={18} />}>
                <FilterSectionLabel
                  label='ช่วงวันที่'
                  count={query.from || query.to ? 1 : 0}
                />
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap='sm'>
                  <DatePickerInput
                    className={classes.dateFilter}
                    label='วันเริ่มต้น'
                    type='default'
                    clearable
                    valueFormat='D MMM BB'
                    monthLabelFormat='MMMM BBBB'
                    yearLabelFormat='BBBB'
                    decadeLabelFormat='BBBB'
                    monthsListFormat='MMM'
                    yearsListFormat='BBBB'
                    maxDate={query.to ?? undefined}
                    value={query.from ?? null}
                    placeholder='เลือกวันเริ่มต้น'
                    aria-label='วันเริ่มต้น'
                    onChange={value =>
                      updateQueryAction({
                        from: value ?? undefined,
                        page: 1
                      })
                    }
                  />
                  <DatePickerInput
                    className={classes.dateFilter}
                    label='วันสิ้นสุด'
                    type='default'
                    clearable
                    valueFormat='D MMM BB'
                    monthLabelFormat='MMMM BBBB'
                    yearLabelFormat='BBBB'
                    decadeLabelFormat='BBBB'
                    monthsListFormat='MMM'
                    yearsListFormat='BBBB'
                    minDate={query.from ?? undefined}
                    value={query.to ?? null}
                    placeholder='เลือกวันสิ้นสุด'
                    aria-label='วันสิ้นสุด'
                    onChange={value =>
                      updateQueryAction({
                        to: value ?? undefined,
                        page: 1
                      })
                    }
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          <Button
            type='button'
            variant='subtle'
            color='danger'
            mt='md'
            disabled={
              activeFilterCount === 0 &&
              !query.search &&
              !query.from &&
              !query.to
            }
            onClick={clearFiltersAction}
          >
            ล้างตัวกรองทั้งหมด
          </Button>
        </Stack>
      </ScrollArea>
    </Drawer>
  )
}
