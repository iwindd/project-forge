import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getOrganizations: vi.fn(),
  redirect: vi.fn((target: string): never => {
    throw new Error(`redirect:${target}`)
  })
}))

vi.mock('@/auth', () => ({ auth: mocks.auth }))
vi.mock('@/servers/organization/queries/get-organizations', () => ({
  getOrganizations: mocks.getOrganizations
}))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))

import HomePage from './page'

describe('organization app entry route', () => {
  beforeEach(() => {
    mocks.auth.mockReset()
    mocks.getOrganizations.mockReset()
    mocks.redirect.mockClear()
  })

  it('sends unauthenticated users to the canonical login route', async () => {
    mocks.auth.mockResolvedValue(null)

    await expect(HomePage()).rejects.toThrow('redirect:/login')

    expect(mocks.redirect).toHaveBeenCalledWith('/login')
    expect(mocks.getOrganizations).not.toHaveBeenCalled()
  })

  it('enters the first available organization for an authenticated user', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-id' } })
    mocks.getOrganizations.mockResolvedValue([
      { id: 'organization-id', slug: 'acme' }
    ])

    await expect(HomePage()).rejects.toThrow('redirect:/acme')

    expect(mocks.redirect).toHaveBeenCalledWith('/acme')
  })

  it('keeps authenticated users without an organization on account', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-id' } })
    mocks.getOrganizations.mockResolvedValue([])

    await expect(HomePage()).rejects.toThrow('redirect:/account')

    expect(mocks.redirect).toHaveBeenCalledWith('/account')
  })
})
