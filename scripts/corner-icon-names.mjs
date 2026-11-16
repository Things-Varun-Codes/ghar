#!/usr/bin/env node
// Writes the lucide icon names a Corner list may use, for the server to validate against.
// Re-run after upgrading lucide-react; a unit test fails while the two disagree.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { default: imports } = await import('lucide-react/dynamicIconImports');
const names = Object.keys(imports).sort();

writeFileSync(
    path.join(root, 'app/MiniApps/Corner/Support/icon-names.json'),
    JSON.stringify(names, null, 4) + '\n',
);
console.log(`[corner-icon-names] ${names.length} names`);
