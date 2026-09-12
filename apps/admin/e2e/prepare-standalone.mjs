import fs from 'node:fs';
import path from 'node:path';

const appRoot = process.cwd();
const standaloneRoot = path.join(appRoot, '.next', 'standalone', 'apps', 'admin');

fs.cpSync(path.join(appRoot, '.next', 'static'), path.join(standaloneRoot, '.next', 'static'), {
  recursive: true,
  force: true,
});

const publicRoot = path.join(appRoot, 'public');
if (fs.existsSync(publicRoot)) {
  fs.cpSync(publicRoot, path.join(standaloneRoot, 'public'), { recursive: true, force: true });
}
