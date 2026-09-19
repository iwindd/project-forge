import { execFile as execFileCallback, spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import type {
  HermesInstallation,
  HermesProcessManagerPort,
  HermesRuntimeConfig,
  ManagedHermesProcess,
} from '../domain/hermes-runtime.types.js';

const execFile = promisify(execFileCallback);

export class HermesNotInstalledError extends Error {
  constructor() {
    super('Hermes CLI is not installed or is not available on PATH');
    this.name = 'HermesNotInstalledError';
  }
}

export class HermesProcessManager implements HermesProcessManagerPort {
  private child: ChildProcess | null = null;
  private token: string | null = null;

  constructor(private readonly config: HermesRuntimeConfig) {}

  async detect(): Promise<HermesInstallation> {
    try {
      const result = await execFile(this.config.command, ['--version'], {
        timeout: Math.min(this.config.startTimeoutMs, 10_000),
        windowsHide: true,
        shell: false,
      });
      const output = `${result.stdout}\n${result.stderr}`;
      const version = output.match(/(?:v|version\s+)(\d+\.\d+\.\d+)/i)?.[1] ?? null;
      return {
        installed: true,
        compatible: version !== null,
        version,
      };
    } catch (error) {
      const errorCode = isRecord(error) && typeof error.code === 'string' ? error.code : undefined;
      if (errorCode === 'ENOENT') {
        return { installed: false, compatible: false, version: null };
      }
      return { installed: true, compatible: false, version: null };
    }
  }

  async start(): Promise<ManagedHermesProcess> {
    if (this.child && this.child.exitCode === null && !this.child.killed && this.token) {
      return { child: this.child, token: this.token };
    }

    const installation = await this.detect();
    if (!installation.installed) throw new HermesNotInstalledError();
    if (!installation.compatible) throw new Error('Hermes CLI version could not be verified');

    const token = this.config.token ?? randomBytes(32).toString('base64url');
    const args = [
      'serve',
      '--host',
      this.config.host,
      '--port',
      String(this.config.port),
      '--skip-build',
      ...(this.config.isolated ? ['--isolated'] : []),
    ];
    const child = spawn(this.config.command, args, {
      env: {
        ...process.env,
        HERMES_DASHBOARD_SESSION_TOKEN: token,
      },
      stdio: ['ignore', 'ignore', 'ignore'],
      shell: false,
      windowsHide: true,
    });
    child.once('exit', () => {
      if (this.child === child) {
        this.child = null;
        this.token = null;
      }
    });
    this.child = child;
    this.token = token;

    await new Promise<void>((resolve, reject) => {
      const onSpawn = () => {
        cleanup();
        resolve();
      };
      const onError = (error: Error) => {
        cleanup();
        this.child = null;
        this.token = null;
        reject(error);
      };
      const cleanup = () => {
        child.off('spawn', onSpawn);
        child.off('error', onError);
      };
      child.once('spawn', onSpawn);
      child.once('error', onError);
    });

    return { child, token };
  }

  async stop(): Promise<void> {
    const child = this.child;
    this.child = null;
    this.token = null;
    if (!child || child.exitCode !== null) return;

    await new Promise<void>((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(finish, 3_000);
      child.once('exit', finish);
      child.kill();
    });
  }

  isRunning(): boolean {
    return this.child !== null && this.child.exitCode === null && !this.child.killed;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
