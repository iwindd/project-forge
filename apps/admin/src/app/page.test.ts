import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn((target: string): never => {
    throw new Error(`redirect:${target}`)
  })
}))

vi.mock('@/auth', () => ({ auth: mocks.auth }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))

import HomePage from './page'

describe('home route', () => {
  beforeEach(() => {
    mocks.auth.mockReset()
    mocks.redirect.mockClear()
  })

  it('redirects authenticated users to the account surface', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-id' } })

    await expect(HomePage()).rejects.toThrow('redirect:/account')

    expect(mocks.redirect).toHaveBeenCalledWith('/account')
  })

  it('redirects unauthenticated users to login', async () => {
    mocks.auth.mockResolvedValue(null)

    await expect(HomePage()).rejects.toThrow('redirect:/admin/login')

    expect(mocks.redirect).toHaveBeenCalledWith('/admin/login')
  })
})
