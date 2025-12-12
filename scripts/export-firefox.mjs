#!/usr/bin/env node

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(join(rootDir, 'package.json'), 'utf-8')
);
const version = packageJson.version;

const zipName = `tuvix-tricorder-firefox-v${version}.zip`;

console.log(`Creating Firefox export: ${zipName}`);
execSync(`cd dist && zip -r ../${zipName} . -x '*.DS_Store' && cd ..`, {
  cwd: rootDir,
  stdio: 'inherit'
});
console.log(`✓ Created ${zipName}`);
