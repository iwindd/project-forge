import { mkdir, open, readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export class HermesGatewayTokenStore {
  constructor(private readonly path = defaultTokenPath()) {}

  async resolve(explicitToken?: string): Promise<string> {
    const configuredToken = explicitToken?.trim();
    if (configuredToken) return configuredToken;

    const storedToken = await readStoredToken(this.path);
    if (storedToken) return storedToken;

    const token = randomBytes(32).toString('base64url');
    await mkdir(dirname(this.path), { recursive: true });

    try {
      const handle = await open(this.path, 'wx', 0o600);
      try {
        await handle.writeFile(`${token}\n`, 'utf8');
      } finally {
        await handle.close();
      }
      return token;
    } catch (error) {
      if (!isFileExistsError(error)) throw error;
      const concurrentToken = await readStoredToken(this.path);
      if (concurrentToken) return concurrentToken;
      throw new Error('Hermes gateway token file is empty');
    }
  }
}

function defaultTokenPath(): string {
  const hermesHome = process.env.HERMES_HOME?.trim() || join(homedir(), '.hermes');
  return join(hermesHome, 'project-forge-gateway.token');
}

async function readStoredToken(path: string): Promise<string | null> {
  try {
    const token = (await readFile(path, 'utf8')).trim();
    return token || null;
  } catch (error) {
    if (isFileMissingError(error)) return null;
    throw error;
  }
}

function isFileMissingError(error: unknown): boolean {
  return isNodeError(error) && error.code === 'ENOENT';
}

function isFileExistsError(error: unknown): boolean {
  return isNodeError(error) && error.code === 'EEXIST';
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
