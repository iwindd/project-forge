import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function spawnProcess(command, args) {
  return spawn(command, args, {
    cwd: apiRoot,
    env: process.env,
    stdio: 'inherit',
  });
}

function runPackage(args) {
  if (process.platform === 'win32') {
    return spawnProcess(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `pnpm.cmd ${args.join(' ')}`]);
  }
  return spawnProcess('pnpm', args);
}

const initialBuild = runPackage(['exec', 'tsc', '-p', 'tsconfig.json', '--pretty', 'false']);
const initialExitCode = await new Promise((resolveExit) => {
  initialBuild.once('error', () => resolveExit(1));
  initialBuild.once('exit', (code) => resolveExit(code ?? 1));
});

if (initialExitCode !== 0) process.exit(initialExitCode);

const compiler = runPackage(['exec', 'tsc', '-p', 'tsconfig.json', '--watch', '--preserveWatchOutput']);
const server = spawnProcess(process.execPath, ['--watch', 'dist/src/main.js']);
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  compiler.kill();
  server.kill();
  setTimeout(() => process.exit(code), 100);
}

compiler.once('error', () => stop(1));
server.once('error', () => stop(1));
server.once('exit', (code) => stop(code ?? 1));
process.once('SIGINT', () => stop(0));
process.once('SIGTERM', () => stop(0));
