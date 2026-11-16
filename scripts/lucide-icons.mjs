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
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(
    readFileSync(path.join(root, 'node_modules/lucide-react/package.json'), 'utf8'),
).version;

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

    // React keys are only for lucide's own rendering; Icon adds its own.
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
    execFileSync('tar', ['xzf', archive, '-C', work, '--wildcards', '*/icons/*.json', '*/categories/*.json']);

    const repo = path.join(work, `lucide-${version}`);
    const meta = (dir, file) => JSON.parse(readFileSync(path.join(repo, dir, file), 'utf8'));

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

            return { key, title: meta('categories', file).title, icons: (members[key] ?? []).sort() };
        })
        .filter((category) => category.icons.length > 0)
        .sort((a, b) => a.title.localeCompare(b.title));

    const linkables = path.join(root, 'resources/js/Shell/linkables');
    writeFileSync(path.join(linkables, 'lucide-paths.json'), JSON.stringify({ version, paths, aliases }) + '\n');
    writeFileSync(path.join(linkables, 'lucide-index.json'), JSON.stringify({ version, categories, tags }) + '\n');
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
