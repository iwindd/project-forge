import { describe, expect, it, vi } from 'vitest';
import { CancelOrganizationInvitationUseCase } from './cancel-organization-invitation-use-case.js';

describe('CancelOrganizationInvitationUseCase', () => {
  it('delegates invitation cancellation to the organization application service', async () => {
    const organizations = {
      cancelInvitation: vi.fn().mockResolvedValue({ ok: true }),
    };
    const useCase = new CancelOrganizationInvitationUseCase(organizations as never);

    await expect(
      useCase.execute('actor-id', 'organization-id', 'invitation-id', { requestId: 'request-id' }),
    ).resolves.toEqual({ ok: true });
    expect(organizations.cancelInvitation).toHaveBeenCalledWith(
      'actor-id',
      'organization-id',
      'invitation-id',
      { requestId: 'request-id' },
    );
  });
});
