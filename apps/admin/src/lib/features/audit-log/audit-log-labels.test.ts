import { describe, expect, it } from 'vitest'
import {
  getAuditActionLabel,
  getAuditResourceTypeLabel
} from './audit-log-labels'

describe('audit log labels', () => {
  it('maps actions emitted by the API', () => {
    expect(getAuditActionLabel('PROFILE_UPDATED')).toBe('อัปเดตโปรไฟล์')
    expect(getAuditResourceTypeLabel('ORGANIZATION_MEMBER')).toBe(
      'สมาชิก Organization'
    )
  })

  it('keeps unknown server values visible instead of rendering undefined', () => {
    expect(getAuditActionLabel('FUTURE_ACTION')).toBe('FUTURE_ACTION')
    expect(getAuditResourceTypeLabel('FUTURE_RESOURCE')).toBe('FUTURE_RESOURCE')
  })
})
