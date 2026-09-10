import { describe, expect, it } from 'vitest'
import { isApiSuccessResponse } from './contracts'

describe('API response contracts', () => {
  it('recognizes a standard success envelope', () => {
    expect(isApiSuccessResponse({ data: { id: 'resource-id' } })).toBe(true)
    expect(
      isApiSuccessResponse({ data: ['item'], meta: { total: 1 } })
    ).toBe(true)
  })

  it('does not reinterpret legacy pagination payloads as envelopes', () => {
    expect(
      isApiSuccessResponse({ data: ['item'], total: 1, page: 1 })
    ).toBe(false)
  })
})
