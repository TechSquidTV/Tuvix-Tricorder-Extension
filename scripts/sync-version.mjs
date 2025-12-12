#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(join(rootDir, 'package.json'), 'utf-8')
);
const version = packageJson.version;

console.log(`Syncing version to ${version}...`);

// Update manifest.json
const manifestPath = join(rootDir, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
manifest.version = version;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`✓ Updated manifest.json`);

// Update manifest.firefox.json
const manifestFirefoxPath = join(rootDir, 'manifest.firefox.json');
const manifestFirefox = JSON.parse(readFileSync(manifestFirefoxPath, 'utf-8'));
manifestFirefox.version = version;
writeFileSync(manifestFirefoxPath, JSON.stringify(manifestFirefox, null, 2) + '\n');
console.log(`✓ Updated manifest.firefox.json`);

console.log(`\nAll versions synced to ${version}`);
