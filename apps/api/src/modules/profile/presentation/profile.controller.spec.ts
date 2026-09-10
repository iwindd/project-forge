import { describe, expect, it } from 'vitest';
import { ProfileController } from './profile.controller.js';

describe('ProfileController HTTP boundaries', () => {
  it('rejects invalid connection route parameters before querying persistence', async () => {
    const controller = new ProfileController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      controller.disconnect({ id: 'user-1' } as never, { id: 'not-a-uuid' }),
    ).rejects.toThrow();
  });
});
