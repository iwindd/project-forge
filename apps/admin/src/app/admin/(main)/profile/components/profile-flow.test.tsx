import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  profile: {
    id: 'profile-id',
    name: 'Ada',
    email: null,
    role: 'EDITOR' as const,
    createdAt: '2026-09-10T00:00:00.000Z',
    updatedAt: '2026-09-10T00:00:00.000Z',
    connections: [] as Array<Record<string, string>>
  },
  useProfile: vi.fn(),
  disconnect: vi.fn()
}))

vi.mock('@mantine/core', () => {
  const element = (tag: string) => {
    const Component = (props: Record<string, unknown>) =>
      createElement(tag, props, props.children as never)
    Component.displayName = tag
    return Component
  }
  return { Alert: element('div'), Badge: element('span'), Button: element('button'), Card: element('section'), Group: element('div'), Stack: element('div'), Text: element('p') }
})
vi.mock('./profile-context', () => ({ useProfile: mocks.useProfile }))
vi.mock('@/lib/features/profile/profile-api', () => ({ useDisconnectConnectionMutation: () => [mocks.disconnect] }))

import { ConnectionsCard } from './connections-card'

describe('connection view states', () => {
  it('renders the empty state when canonical connections are empty', () => {
    mocks.useProfile.mockReturnValue({ profile: mocks.profile, updateProfile: vi.fn() })
    const html = renderToStaticMarkup(createElement(ConnectionsCard))

    expect(html).toContain('ยังไม่มีบัญชี GitHub ที่เชื่อมต่อ')
    expect(html).not.toContain('ยกเลิกการเชื่อมต่อ')
  })
})
