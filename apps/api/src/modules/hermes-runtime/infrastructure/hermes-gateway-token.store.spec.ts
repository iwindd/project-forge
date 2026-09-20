import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HermesGatewayTokenStore } from './hermes-gateway-token.store.js';

describe('HermesGatewayTokenStore', () => {
  it('persists and reuses the managed gateway token across process instances', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'project-forge-hermes-token-'));
    const path = join(directory, 'gateway.token');

    try {
      const first = new HermesGatewayTokenStore(path);
      const firstToken = await first.resolve();
      const secondToken = await new HermesGatewayTokenStore(path).resolve();

      expect(firstToken).toHaveLength(43);
      expect(secondToken).toBe(firstToken);
      expect((await readFile(path, 'utf8')).trim()).toBe(firstToken);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('uses an explicitly configured server-only token without replacing it', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'project-forge-hermes-token-'));
    const path = join(directory, 'gateway.token');

    try {
      const token = await new HermesGatewayTokenStore(path).resolve('configured-token');

      expect(token).toBe('configured-token');
      await expect(readFile(path, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
