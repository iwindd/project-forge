import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const pnpmCommand = isWindows ? 'pnpm.cmd' : 'pnpm';
const cloudflaredFallback = isWindows
  ? 'C:/Users/freew/AppData/Local/Microsoft/WinGet/Links/cloudflared.exe'
  : 'cloudflared';
const cloudflaredCommand = process.env.CLOUDFLARED_COMMAND ||
  (existsSync(cloudflaredFallback) ? cloudflaredFallback : 'cloudflared');
const projectForgeTunnelId = 'd64d4f65-0c68-4f23-9a41-a0360a2e898c';
const cloudflaredConfig = resolve(
  root,
  process.env.CLOUDFLARED_CONFIG || 'infra/cloudflared/config.yml',
);
const cloudflaredCredentials = resolve(
  process.env.CLOUDFLARED_CREDENTIALS_FILE ||
    resolve(process.env.USERPROFILE || process.env.HOME || root, '.cloudflared', `${projectForgeTunnelId}.json`),
);

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        const key = line.slice(0, separator).trim();
        const rawValue = line.slice(separator + 1).trim();
        const value = rawValue.replace(/^(['"])(.*)\1$/, '$2');
        return [key, value];
      }),
  );
}

if (!existsSync(cloudflaredConfig)) {
  throw new Error(`Cloudflare config not found: ${cloudflaredConfig}`);
}
if (!existsSync(cloudflaredCredentials)) {
  throw new Error(
    `Cloudflare tunnel credentials not found: ${cloudflaredCredentials}. ` +
      'Keep the credentials JSON outside the repository and set CLOUDFLARED_CREDENTIALS_FILE when needed.',
  );
}

function assertAddressAvailable(port, host) {
  return new Promise((resolveAddress, rejectAddress) => {
    const server = createServer();
    const onError = (error) => {
      server.close();
      if (error.code === 'EADDRINUSE') {
        rejectAddress(
          new Error(
            `[preflight] Port ${port} is already in use. Stop the existing Project Forge process before running pnpm dev:all.`,
          ),
        );
        return;
      }
      if (host === '::' && error.code === 'EADDRNOTAVAIL') {
        resolveAddress();
        return;
      }
      rejectAddress(error);
    };
    server.once('error', onError);
    server.listen({ host, port }, () => {
      server.close(resolveAddress);
    });
  });
}

async function assertPortAvailable(port) {
  await assertAddressAvailable(port, '0.0.0.0');
  await assertAddressAvailable(port, '::');
}

async function preflight() {
  await Promise.all([assertPortAvailable(5050), assertPortAvailable(5051)]);
}

const apiEnv = { ...readEnvFile(resolve(root, '.env')), ...process.env };
for (const key of ['SESSION_SECRET', 'AUTH_SECRET']) {
  const value = apiEnv[key]?.trim();
  if (!value || value.startsWith('replace-with-') || value === 'local-preview-session-secret') {
    apiEnv[key] = randomBytes(32).toString('hex');
  }
}

const children = new Map();
let shuttingDown = false;

function quoteCmdArg(value) {
  const text = String(value);
  if (!/[\s"&|<>^]/.test(text)) return text;
  return `"${text.replace(/["^]/g, '^$&')}"`;
}

function spawnProcess(command, args, options) {
  if (isWindows && /\.(cmd|bat)$/i.test(command)) {
    const commandLine = [command, ...args].map(quoteCmdArg).join(' ');
    return spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', commandLine], options);
  }
  return spawn(command, args, options);
}

function start(name, command, args, env = process.env) {
  console.log(`[${name}] starting`);
  const child = spawnProcess(command, args, {
    cwd: root,
    env,
    stdio: 'inherit',
    windowsHide: false,
  });
  children.set(name, child);
  child.once('error', (error) => {
    console.error(`[${name}] failed to start: ${error.message}`);
    void shutdown(1);
  });
  child.once('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`[${name}] exited unexpectedly (code=${code ?? 'null'}, signal=${signal ?? 'none'})`);
    void shutdown(code && code > 0 ? code : 1);
  });
  return child;
}

async function killChild(child) {
  if (!child.pid || child.exitCode !== null) return;
  if (isWindows) {
    await new Promise((resolveExit) => {
      const killer = spawn('taskkill.exe', ['/pid', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.once('error', resolveExit);
      killer.once('exit', resolveExit);
    });
    return;
  }
  child.kill('SIGTERM');
}

async function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  await Promise.all([...children.values()].map(killChild));
  process.exit(code);
}

process.once('SIGINT', () => void shutdown(0));
process.once('SIGTERM', () => void shutdown(0));

await preflight();

start('api', pnpmCommand, ['--filter', '@project-forge/api', 'dev'], apiEnv);
start('admin', pnpmCommand, [
  '--filter',
  '@project-forge/admin',
  'dev',
], process.env);
start(
  'cloudflared',
  cloudflaredCommand,
  [
    '--config',
    cloudflaredConfig,
    'tunnel',
    'run',
    '--credentials-file',
    cloudflaredCredentials,
    'project-forge',
  ],
  process.env,
);

console.log('Project Forge is starting:');
console.log('  Web:    https://forge.iwindd.dev/login');
console.log('  API:    https://forge.iwindd.dev/api/v1/health');
console.log('  Stop:   Ctrl+C');
