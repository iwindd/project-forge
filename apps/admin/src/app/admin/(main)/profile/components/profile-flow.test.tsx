import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type StateSetter = (value: unknown) => void

const mocks = vi.hoisted(() => ({
  profile: {
    id: 'profile-id',
    name: 'Ada',
    email: null,
    role: 'EDITOR' as const,
    createdAt: '2026-09-10T00:00:00.000Z',
    updatedAt: '2026-09-10T00:00:00.000Z',
    bio: 'Old bio',
    timezone: 'UTC',
    connections: [
      { id: 'github-1', provider: 'GITHUB', username: 'ada' },
      { id: 'github-2', provider: 'GITHUB', username: 'ada-work' }
    ]
  },
  useProfile: vi.fn(),
  updateProfile: vi.fn(),
  updateProfileRequest: vi.fn(),
  updateProfileState: { isLoading: false },
  disconnect: vi.fn(),
  disconnectState: { isLoading: false },
  stateValues: [] as unknown[],
  stateIndex: 0,
  form: null as null | {
    onSubmit: (handler: (values: Record<string, string>) => Promise<void>) => typeof handler
    getInputProps: (field: string) => Record<string, string>
    isDirty: () => boolean
    submitting: boolean
    setValues: ReturnType<typeof vi.fn>
    setInitialValues: ReturnType<typeof vi.fn>
    resetDirty: ReturnType<typeof vi.fn>
  },
  buttonProps: [] as Array<Record<string, unknown>>
}))

vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useState: (initial: unknown): [unknown, StateSetter] => {
      const index = mocks.stateIndex++
      if (mocks.stateValues[index] === undefined) mocks.stateValues[index] = initial
      return [mocks.stateValues[index], value => { mocks.stateValues[index] = value }]
    }
  }
})

vi.mock('@mantine/core', () => {
  const element = (tag: string) => {
    const Component = (props: Record<string, unknown>) => {
      if (tag === 'button') mocks.buttonProps.push(props)
      return createElement(tag, null, props.children as never)
    }
    Component.displayName = tag
    return Component
  }
  return {
    Alert: element('div'),
    Badge: element('span'),
    Button: element('button'),
    Card: element('section'),
    Group: element('div'),
    Stack: element('div'),
    Text: element('p'),
    Textarea: element('textarea'),
    TextInput: element('input')
  }
})

vi.mock('@mantine/form', () => ({
  schemaResolver: () => undefined,
  useForm: (options: { initialValues: Record<string, string> }) => {
    mocks.form = {
      onSubmit: handler => handler,
      getInputProps: field => ({ name: field, value: options.initialValues[field] }),
      isDirty: () => true,
      submitting: false,
      setValues: vi.fn(),
      setInitialValues: vi.fn(),
      resetDirty: vi.fn()
    }
    return mocks.form
  }
}))
vi.mock('./profile-context', () => ({ useProfile: mocks.useProfile }))
vi.mock('./profile-edit-card', () => ({
  ProfileEditCard: ({ children }: { children: ReactElement }) => createElement('div', null, children)
}))
vi.mock('@/hooks/use-admin-cache-invalidation', () => ({
  useAdminCacheInvalidation: () => ({ invalidateAdminCaches: vi.fn() })
}))
vi.mock('@/lib/features/profile/profile-api', () => ({
  useUpdateProfileMutation: () => [mocks.updateProfileRequest, mocks.updateProfileState],
  useDisconnectConnectionMutation: () => [mocks.disconnect, mocks.disconnectState]
}))

import { ConnectionsCard } from './connections-card'
import { ProfileDetailsForm } from './profile-details-form'
import { ProfileNameForm } from './profile-name-form'

function resetHarness() {
  mocks.profile = {
    ...mocks.profile,
    updatedAt: '2026-09-10T00:00:00.000Z',
    connections: [
      { id: 'github-1', provider: 'GITHUB', username: 'ada' },
      { id: 'github-2', provider: 'GITHUB', username: 'ada-work' }
    ]
  }
  mocks.useProfile.mockReturnValue({ profile: mocks.profile, updateProfile: mocks.updateProfile })
  mocks.updateProfile.mockReset()
  mocks.updateProfileRequest.mockReset()
  mocks.disconnect.mockReset()
  mocks.updateProfileState.isLoading = false
  mocks.disconnectState.isLoading = false
  mocks.stateValues.length = 0
  mocks.stateIndex = 0
  mocks.form = null
  mocks.buttonProps = []
}

function renderComponent(component: () => ReactElement) {
  mocks.stateIndex = 0
  mocks.buttonProps = []
  const tree = component()
  renderToStaticMarkup(tree)
  return tree
}

function getHostElement(node: unknown, tag: string): { props: Record<string, unknown> } | null {
  if (!node || typeof node !== 'object') return null
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = getHostElement(child, tag)
      if (found) return found
    }
    return null
  }
  const element = node as { type?: unknown; props?: Record<string, unknown> }
  if (element.type === tag) return { props: element.props ?? {} }
  if (typeof element.type === 'function') return getHostElement(element.type(element.props ?? {}), tag)
  return getHostElement(element.props?.children, tag)
}

function profileMutationResult(displayName: string, bio: string, timezone: string) {
  return {
    profile: {
      displayName,
      bio,
      timezone,
      updatedAt: '2026-09-12T00:00:00.000Z'
    }
  }
}

describe('admin profile mutation flows', () => {
  beforeEach(resetHarness)

  it.each([
    ['name', ProfileNameForm, { name: 'Grace' }, profileMutationResult('Grace', 'Old bio', 'UTC'), 'บันทึกชื่อสำเร็จ'],
    ['details', ProfileDetailsForm, { bio: 'New bio', timezone: 'Asia/Bangkok' }, profileMutationResult('Ada', 'New bio', 'Asia/Bangkok'), 'บันทึกข้อมูลโปรไฟล์สำเร็จ']
  ])('shows success and updates profile state for a successful %s mutation', async (_label, component, values, result, success) => {
    mocks.updateProfileRequest.mockReturnValue({ unwrap: () => Promise.resolve(result) })
    mocks.updateProfileState.isLoading = true
    const tree = renderComponent(component)
    expect(mocks.buttonProps[0]?.loading).toBe(true)

    await (getHostElement(tree, 'form')?.props.onSubmit as (values: Record<string, string>) => Promise<void>)(values)

    expect(mocks.updateProfile).toHaveBeenCalledWith(expect.objectContaining({
      name: result.profile.displayName,
      bio: result.profile.bio,
      timezone: result.profile.timezone,
      updatedAt: result.profile.updatedAt
    }))
    const updatedTree = renderComponent(component)
    expect(renderToStaticMarkup(updatedTree)).toContain(success)
  })

  it.each([
    ['name', ProfileNameForm, { name: 'Grace' }, 'ชื่อซ้ำ'],
    ['details', ProfileDetailsForm, { bio: 'New bio', timezone: 'Asia/Bangkok' }, 'บันทึกไม่ได้']
  ])('shows error and preserves profile state for a failed %s mutation', async (_label, component, values, message) => {
    mocks.updateProfileRequest.mockReturnValue({ unwrap: () => Promise.reject(new Error(message)) })
    const tree = renderComponent(component)

    await (getHostElement(tree, 'form')?.props.onSubmit as (values: Record<string, string>) => Promise<void>)(values)

    expect(mocks.updateProfile).not.toHaveBeenCalled()
    const updatedTree = renderComponent(component)
    expect(renderToStaticMarkup(updatedTree)).toContain(message)
  })
})

describe('admin connection mutation flows', () => {
  beforeEach(resetHarness)

  it('shows pending feedback, then success, and removes the disconnected connection', async () => {
    let resolve: (value: null) => void = () => undefined
    mocks.disconnect.mockReturnValue({ unwrap: () => new Promise<null>(res => { resolve = res }) })
    renderComponent(ConnectionsCard)
    const initialButton = mocks.buttonProps[0]

    const onClick = initialButton?.onClick as () => void
    const pendingPromise = onClick()
    renderComponent(ConnectionsCard)
    expect(mocks.buttonProps[0]?.loading).toBe(true)
    expect(mocks.buttonProps[0]?.disabled).toBe(true)

    resolve(null)
    await pendingPromise
    expect(mocks.updateProfile).toHaveBeenCalledWith(expect.objectContaining({
      connections: [expect.objectContaining({ id: 'github-2' })]
    }))
    const updatedTree = renderComponent(ConnectionsCard)
    expect(renderToStaticMarkup(updatedTree)).toContain('ยกเลิกการเชื่อมต่อสำเร็จ')
  })

  it('shows error and keeps the connection after a failed disconnect', async () => {
    mocks.disconnect.mockReturnValue({ unwrap: () => Promise.reject(new Error('ยกเลิกไม่ได้')) })
    const tree = renderComponent(ConnectionsCard)
    const onClick = mocks.buttonProps[0]?.onClick as () => void

    await onClick()

    expect(mocks.updateProfile).not.toHaveBeenCalled()
    const updatedTree = renderComponent(ConnectionsCard)
    expect(renderToStaticMarkup(updatedTree)).toContain('ยกเลิกไม่ได้')
    expect(getHostElement(tree, 'button')).not.toBeNull()
  })

  it('keeps the last connection protected from disconnect', () => {
    mocks.profile.connections = [mocks.profile.connections[0]]
    renderComponent(ConnectionsCard)
    expect(mocks.buttonProps[0]?.disabled).toBe(true)
  })
})

describe('connection view states', () => {
  beforeEach(resetHarness)

  it('renders the empty state when canonical connections are empty', () => {
    mocks.profile.connections = []
    mocks.useProfile.mockReturnValue({ profile: mocks.profile, updateProfile: vi.fn() })
    const html = renderToStaticMarkup(createElement(ConnectionsCard))

    expect(html).toContain('ยังไม่มีบัญชี GitHub ที่เชื่อมต่อ')
    expect(html).not.toContain('ยกเลิกการเชื่อมต่อ')
  })
})
