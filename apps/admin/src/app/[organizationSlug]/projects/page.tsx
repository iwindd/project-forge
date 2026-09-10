'use client'

import { PageHeader } from '@/components/page-header'
import {
  useArchiveProjectMutation,
  useCreateProjectMutation,
  useGetProjectsQuery,
  useRestoreProjectMutation,
  useUpdateProjectMutation
} from '@/lib/features/project/project-api'
import { canManageProjects } from '@/lib/features/project/project-permissions'
import type { Project } from '@/lib/features/project/types'
import { useOrganizationContext } from '@/lib/features/organization/organization-provider'
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Menu,
  Modal,
  Paper,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput
} from '@mantine/core'
import { schemaResolver, useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import {
  IconAlertCircle,
  IconArchive,
  IconDots,
  IconFolders,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconRestore
} from '@tabler/icons-react'
import { useFormatter, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import {
  EMPTY_PROJECT_FORM_VALUES,
  createProjectFormSchema,
  toProjectFormValues,
  toProjectRequestBody,
  type ProjectFormValues
} from './project-form-schema'
import { failureMessageFor, getProjectsViewState } from './projects-view-state'
import classes from './projects-page.module.css'

export default function ProjectsPage() {
  const t = useTranslations('Projects')
  const format = useFormatter()
  const { activeOrganization, pending: organizationPending } =
    useOrganizationContext()
  const organizationId = activeOrganization?.id ?? ''
  const organizationLoading = organizationPending && !activeOrganization
  const canManage = canManageProjects(activeOrganization?.role)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null)

  const formatDate = (value: string) => {
    const date = new Date(value)

    return Number.isNaN(date.getTime()) ? '-' : format.dateTime(date, 'date')
  }

  const projectFormSchema = useMemo(
    () =>
      createProjectFormSchema({
        nameMax: t('nameMax'),
        githubUrlRequired: t('githubUrlRequired'),
        githubUrlInvalid: t('githubUrlInvalid'),
        sourceBranchRequired: t('sourceBranchRequired'),
        targetBranchRequired: t('targetBranchRequired'),
        branchMax: t('branchMax'),
        nodeVersionMax: t('nodeVersionMax')
      }),
    [t]
  )

  const projectForm = useForm<ProjectFormValues>({
    initialValues: EMPTY_PROJECT_FORM_VALUES,
    validate: schemaResolver(projectFormSchema),
    validateInputOnBlur: true
  })

  const {
    data: projects = [],
    isFetching: projectsFetching,
    isError: projectsError,
    refetch: refetchProjects
  } = useGetProjectsQuery({ organizationId }, { skip: !organizationId })

  const [createProject, { isLoading: createPending }] =
    useCreateProjectMutation()
  const [updateProject, { isLoading: updatePending }] =
    useUpdateProjectMutation()
  const [archiveProject, { isLoading: archivePending }] =
    useArchiveProjectMutation()
  const [restoreProject, { isLoading: restorePending }] =
    useRestoreProjectMutation()
  const savePending = createPending || updatePending
  const rowActionPending = archivePending || restorePending
  const viewState = getProjectsViewState({
    organizationLoading,
    projectsError,
    projectsFetching,
    projectCount: projects.length
  })

  const resetProjectForm = () => {
    setEditingProject(null)
    projectForm.setValues(EMPTY_PROJECT_FORM_VALUES)
    projectForm.setInitialValues(EMPTY_PROJECT_FORM_VALUES)
    projectForm.resetDirty()
  }

  const startEditing = (project: Project) => {
    const values = toProjectFormValues(project)
    setEditingProject(project)
    projectForm.setValues(values)
    projectForm.setInitialValues(values)
    projectForm.resetDirty()
  }

  const runProjectAction = async (
    action: () => Promise<unknown>,
    feedback: { success: string; failure: string }
  ) => {
    try {
      await action()
      notifications.show({ message: feedback.success, color: 'teal' })
      return true
    } catch (error) {
      notifications.show({
        message: failureMessageFor(error, feedback.failure, {
          conflict: t('conflictFailed'),
          forbidden: t('forbiddenFailed'),
          notFound: t('notFoundFailed')
        }),
        color: 'red'
      })
      return false
    }
  }

  const submitProject = async (values: ProjectFormValues) => {
    if (!organizationId || !canManage) return

    const body = toProjectRequestBody(values)
    const current = editingProject
    const succeeded = await runProjectAction(
      () =>
        current
          ? updateProject({
              organizationId,
              projectId: current.id,
              ...body
            }).unwrap()
          : createProject({ organizationId, ...body }).unwrap(),
      {
        success: current ? t('updateSuccess') : t('createSuccess'),
        failure: current ? t('updateFailed') : t('createFailed')
      }
    )

    if (succeeded) resetProjectForm()
  }

  const confirmArchive = async () => {
    if (!organizationId || !archiveTarget) return

    const target = archiveTarget
    const succeeded = await runProjectAction(
      () => archiveProject({ organizationId, projectId: target.id }).unwrap(),
      { success: t('archiveSuccess'), failure: t('archiveFailed') }
    )

    if (!succeeded) return

    setArchiveTarget(null)
    if (editingProject?.id === target.id) resetProjectForm()
  }

  const restore = async (project: Project) => {
    if (!organizationId) return

    await runProjectAction(
      () => restoreProject({ organizationId, projectId: project.id }).unwrap(),
      { success: t('restoreSuccess'), failure: t('restoreFailed') }
    )
  }

  return (
    <Box className={classes.page}>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {organizationLoading ? null : canManage ? (
        <Paper
          className={`${classes.card} ${classes.formCard}`}
          withBorder
          radius='md'
          p='lg'
        >
          <form onSubmit={projectForm.onSubmit(submitProject)}>
            <Stack gap='md'>
              <Stack gap={4}>
                <Text fw={700}>
                  {editingProject ? t('editTitle') : t('createTitle')}
                </Text>
                <Text size='sm' c='dimmed'>
                  {editingProject ? t('editSubtitle') : t('createSubtitle')}
                </Text>
              </Stack>

              <TextInput
                label={t('name')}
                placeholder={t('namePlaceholder')}
                {...projectForm.getInputProps('name')}
              />
              <TextInput
                label={t('githubUrl')}
                placeholder={t('githubUrlPlaceholder')}
                required
                {...projectForm.getInputProps('githubUrl')}
              />
              <Group grow align='flex-start'>
                <TextInput
                  label={t('sourceBranch')}
                  placeholder={t('branchPlaceholder')}
                  required
                  {...projectForm.getInputProps('sourceBranch')}
                />
                <TextInput
                  label={t('targetBranch')}
                  placeholder={t('branchPlaceholder')}
                  required
                  {...projectForm.getInputProps('targetBranch')}
                />
              </Group>
              <TextInput
                label={t('nodeVersion')}
                placeholder={t('nodeVersionPlaceholder')}
                {...projectForm.getInputProps('nodeVersion')}
              />
              <Textarea
                label={t('environmentMetadata')}
                description={t('environmentMetadataDescription')}
                placeholder={t('environmentMetadataPlaceholder')}
                autosize
                minRows={2}
                {...projectForm.getInputProps('environmentMetadata')}
              />

              <Group justify='flex-end'>
                {editingProject ? (
                  <Button
                    type='button'
                    variant='default'
                    onClick={resetProjectForm}
                  >
                    {t('cancelEdit')}
                  </Button>
                ) : null}
                <Button
                  type='submit'
                  loading={savePending}
                  leftSection={<IconPlus size={16} />}
                >
                  {editingProject ? t('saveChanges') : t('createSubmit')}
                </Button>
              </Group>
            </Stack>
          </form>
        </Paper>
      ) : (
        <Alert color='gray' icon={<IconAlertCircle size={18} />}>
          {t('permissionNotice')}
        </Alert>
      )}

      {viewState === 'error' ? (
        <Alert color='red' icon={<IconAlertCircle size={18} />}>
          <Group justify='space-between' gap='sm' wrap='nowrap'>
            <Text size='sm'>{t('loadFailed')}</Text>
            <Button
              size='compact-sm'
              variant='light'
              color='red'
              leftSection={<IconRefresh size={14} />}
              loading={projectsFetching}
              onClick={() => void refetchProjects()}
            >
              {t('retry')}
            </Button>
          </Group>
        </Alert>
      ) : (
        <Paper className={classes.card} withBorder radius='md'>
          {viewState === 'loading' ? (
            <Center className={classes.emptyState}>
              <Loader size='sm' />
            </Center>
          ) : viewState === 'list' ? (
            <Box className={classes.tableScroll}>
              <Table className={classes.table} verticalSpacing='sm'>
                <thead>
                  <tr>
                    <th>{t('project')}</th>
                    <th>{t('branches')}</th>
                    <th>{t('nodeVersion')}</th>
                    <th>{t('status')}</th>
                    <th>{t('updatedAt')}</th>
                    <th aria-label={t('actions')} />
                  </tr>
                </thead>
                <tbody>
                  {projects.map(project => (
                    <tr key={project.id}>
                      <td>
                        <Stack className={classes.projectIdentity} gap={0}>
                          <Text fw={600}>{project.name}</Text>
                          <Text className={classes.repository} size='sm'>
                            {project.githubOwner}/{project.githubRepo}
                          </Text>
                        </Stack>
                      </td>
                      <td>
                        <Text size='sm'>
                          {project.sourceBranch} → {project.targetBranch}
                        </Text>
                      </td>
                      <td>{project.nodeVersion ?? '-'}</td>
                      <td>
                        <Badge
                          color={project.status === 'ACTIVE' ? 'teal' : 'gray'}
                          variant='light'
                        >
                          {project.status === 'ACTIVE'
                            ? t('active')
                            : t('archived')}
                        </Badge>
                      </td>
                      <td>{formatDate(project.updatedAt)}</td>
                      <td>
                        {canManage ? (
                          <Menu shadow='md' position='bottom-end'>
                            <Menu.Target>
                              <ActionIcon
                                variant='subtle'
                                disabled={rowActionPending}
                                aria-label={`${t('actions')}: ${project.name}`}
                              >
                                <IconDots size={18} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              {project.status === 'ACTIVE' ? (
                                <>
                                  <Menu.Item
                                    leftSection={<IconPencil size={16} />}
                                    onClick={() => startEditing(project)}
                                  >
                                    {t('edit')}
                                  </Menu.Item>
                                  <Menu.Item
                                    color='red'
                                    leftSection={<IconArchive size={16} />}
                                    onClick={() => setArchiveTarget(project)}
                                  >
                                    {t('archive')}
                                  </Menu.Item>
                                </>
                              ) : (
                                <Menu.Item
                                  leftSection={<IconRestore size={16} />}
                                  onClick={() => void restore(project)}
                                >
                                  {t('restore')}
                                </Menu.Item>
                              )}
                            </Menu.Dropdown>
                          </Menu>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Box>
          ) : (
            <Stack
              className={classes.emptyState}
              align='center'
              justify='center'
              gap='xs'
            >
              <IconFolders size={28} stroke={1.5} />
              <Text c='dimmed'>{t('noProjects')}</Text>
            </Stack>
          )}
        </Paper>
      )}

      <Modal
        opened={archiveTarget !== null}
        onClose={() => setArchiveTarget(null)}
        title={t('archiveTitle')}
        centered
      >
        <Stack gap='md'>
          <Text size='sm'>
            {t('archiveConfirm', { name: archiveTarget?.name ?? '' })}
          </Text>
          <Group justify='flex-end'>
            <Button variant='default' onClick={() => setArchiveTarget(null)}>
              {t('cancel')}
            </Button>
            <Button
              color='red'
              loading={archivePending}
              onClick={() => void confirmArchive()}
            >
              {t('archive')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  )
}
