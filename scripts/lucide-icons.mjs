#!/usr/bin/env node
// Writes the lucide data Ghar draws icons from, for the installed lucide-react:
//
// - resources/js/Shell/linkables/lucide-paths.json  every icon's drawing, and its aliases
// - resources/js/Shell/linkables/lucide-index.json  categories and search tags, for the picker
// - app/MiniApps/Corner/Support/icon-names.json      every name a list may use (the server checks)
//
// Drawings come from lucide-react itself. Tags and categories are not in that package, so they
// are read from the lucide repository at the same version (a one-off download). Re-run after
// upgrading lucide-react; a unit test fails while the files and the package disagree.
//
// Usage: node scripts/lucide-icons.mjs <version>, the installed lucide-react version, e.g.
//   node scripts/lucide-icons.mjs 1.72.0
// The version to download is the one given here. The installed package is only checked against
// it, so a mismatch stops the script instead of writing data for the wrong icons.
import { execFileSync } from 'node:child_process';
import {
    mkdtempSync,
    readFileSync,
    readdirSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = process.argv[2] ?? '';

if (!/^\d+\.\d+\.\d+$/.test(version)) {
    console.error(
        '[lucide-icons] Give the lucide-react version, e.g. node scripts/lucide-icons.mjs 1.72.0',
    );
    process.exit(1);
}

const installed = JSON.parse(
    readFileSync(
        path.join(root, 'node_modules/lucide-react/package.json'),
        'utf8',
    ),
).version;

if (installed !== version) {
    console.error(
        `[lucide-icons] lucide-react ${installed} is installed, not ${version}.`,
    );
    process.exit(1);
}

// JSON with one entry of each top-level collection per line. On a single line, any text search
// that matched one icon returned the whole half-megabyte file.
function perLine(data) {
    const body = Object.entries(data).map(([key, value]) => {
        if (value === null || typeof value !== 'object') {
            return `${JSON.stringify(key)}:${JSON.stringify(value)}`;
        }

        const entries = Array.isArray(value)
            ? value.map((item) => JSON.stringify(item))
            : Object.entries(value).map(
                  ([name, item]) =>
                      `${JSON.stringify(name)}:${JSON.stringify(item)}`,
              );
        const [open, close] = Array.isArray(value) ? '[]' : '{}';

        return `${JSON.stringify(key)}:${open}\n${entries.join(',\n')}\n${close}`;
    });

    return `{\n${body.join(',\n')}\n}\n`;
}

const { default: imports } = await import('lucide-react/dynamicIconImports');
const names = Object.keys(imports).sort();

const paths = {};
const aliases = {};

for (const name of names) {
    const module = await imports[name]();
    const { name: canonical, node } = module.__iconData;

    if (canonical !== name) {
        aliases[name] = canonical;
    }

    // React keys are dropped to keep the file small; iconNode() in lucide.ts adds them back.
    paths[canonical] ??= node.map(([tag, attrs]) => {
        const { key, ...rest } = attrs;
        void key;

        return [tag, rest];
    });
}

const work = mkdtempSync(path.join(tmpdir(), 'lucide-'));

try {
    const archive = path.join(work, 'lucide.tgz');
    execFileSync('curl', [
        '-sSfL',
        '-o',
        archive,
        `https://codeload.github.com/lucide-icons/lucide/tar.gz/refs/tags/${version}`,
    ]);
    execFileSync('tar', [
        'xzf',
        archive,
        '-C',
        work,
        '--wildcards',
        '*/icons/*.json',
        '*/categories/*.json',
    ]);

    const repo = path.join(work, `lucide-${version}`);
    const meta = (dir, file) =>
        JSON.parse(readFileSync(path.join(repo, dir, file), 'utf8'));

    const tags = {};
    const members = {};

    for (const file of readdirSync(path.join(repo, 'icons'))) {
        const name = file.replace(/\.json$/, '');

        if (!paths[name]) {
            continue;
        }

        const icon = meta('icons', file);

        if (icon.tags?.length) {
            tags[name] = icon.tags;
        }

        for (const category of icon.categories ?? []) {
            (members[category] ??= []).push(name);
        }
    }

    const categories = readdirSync(path.join(repo, 'categories'))
        .map((file) => {
            const key = file.replace(/\.json$/, '');

            return {
                key,
                title: meta('categories', file).title,
                icons: (members[key] ?? []).sort(),
            };
        })
        .filter((category) => category.icons.length > 0)
        .sort((a, b) => a.title.localeCompare(b.title));

    const linkables = path.join(root, 'resources/js/Shell/linkables');
    writeFileSync(
        path.join(linkables, 'lucide-paths.json'),
        perLine({ version, paths, aliases }),
    );
    writeFileSync(
        path.join(linkables, 'lucide-index.json'),
        perLine({ version, categories, tags }),
    );
    writeFileSync(
        path.join(root, 'app/MiniApps/Corner/Support/icon-names.json'),
        JSON.stringify(names, null, 4) + '\n',
    );

    console.log(
        `[lucide-icons] ${version}: ${Object.keys(paths).length} icons, ${Object.keys(aliases).length} aliases, ${categories.length} categories`,
    );
} finally {
    rmSync(work, { recursive: true, force: true });
}
