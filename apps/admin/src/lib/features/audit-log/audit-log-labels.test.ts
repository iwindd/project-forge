import { describe, expect, it } from 'vitest';
import { getAuditActionLabel, getAuditResourceTypeLabel } from './audit-log-labels';

describe('audit log labels', () => {
  it('maps actions emitted by the API', () => {
    expect(getAuditActionLabel('PROFILE_UPDATED')).toBe('อัปเดตโปรไฟล์');
    expect(getAuditResourceTypeLabel('ORGANIZATION_MEMBER')).toBe('สมาชิก Organization');
  });

  it('keeps unknown server values visible instead of rendering undefined', () => {
    expect(getAuditActionLabel('FUTURE_ACTION')).toBe('FUTURE_ACTION');
    expect(getAuditResourceTypeLabel('FUTURE_RESOURCE')).toBe('FUTURE_RESOURCE');
  });

  it('does not expose the removed access-request vocabulary as active labels', () => {
    expect(getAuditActionLabel('ACCESS_APPROVED')).toBe('ACCESS_APPROVED');
    expect(getAuditActionLabel('ACCESS_REJECTED')).toBe('ACCESS_REJECTED');
    expect(getAuditResourceTypeLabel('ACCESS_REQUEST')).toBe('ACCESS_REQUEST');
  });
});
