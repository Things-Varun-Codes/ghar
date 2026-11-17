#!/usr/bin/env node
// Turns the change files in .changes/ into a release.
//
//   check [--pr]   every change file parses; with --pr, the pull request in PR_TITLE,
//                  BASE_SHA and HEAD_SHA also has the change file its title calls for
//   notes          print the next version and its changelog section, change nothing
//   section <version>
//                  print that version's changelog section, for the release workflow
//   check-tag <version> [commit]
//                  fail unless the commit (HEAD by default) is on main and is the one that
//                  added that version's section; the release workflow runs it on every tag
//   prepare        write the section into CHANGELOG.md, delete the change files and open
//                  the release pull request (--version 2.0.0 overrides the version;
//                  --no-pr edits the files in place and stops)
//   tag            after that pull request is merged: tag its commit and push the tag,
//                  which starts .github/workflows/release.yml
//
// Node built-ins only, so `check` runs in CI without npm install.

import { execFileSync } from 'node:child_process';
import {
    existsSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    insertSection,
    isChangeFile,
    latestVersion,
    nextVersion,
    parseChange,
    pullRequestProblems,
    releaseCommitProblem,
    renderSection,
    sectionFor,
} from './lib/changes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHANGES_DIR = path.join(ROOT, '.changes');
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md');

const [command, ...flags] = process.argv.slice(2);

function flag(name) {
    return flags.includes(name);
}

function option(name) {
    const at = flags.indexOf(name);

    return at === -1 ? undefined : flags[at + 1];
}

function git(...args) {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function run(file, ...args) {
    execFileSync(file, args, { cwd: ROOT, stdio: 'inherit' });
}

function readChange(name) {
    return parseChange(
        name,
        readFileSync(path.join(CHANGES_DIR, name), 'utf8'),
    );
}

function readChanges() {
    if (!existsSync(CHANGES_DIR)) {
        return [];
    }

    return readdirSync(CHANGES_DIR).filter(isChangeFile).map(readChange);
}

function plan() {
    const changes = readChanges();

    if (!changes.length) {
        throw new Error(
            '.changes/ has no change files, so there is nothing to release.',
        );
    }

    const changelog = readFileSync(CHANGELOG, 'utf8');
    const version =
        option('--version') ?? nextVersion(latestVersion(changelog), changes);

    if (!/^\d+\.\d+\.\d+$/.test(version)) {
        throw new Error(`"${version}" is not a version like 1.2.3.`);
    }

    if (changelog.includes(`## [${version}]`)) {
        throw new Error(`CHANGELOG.md already has a section for ${version}.`);
    }

    const section = renderSection(
        version,
        new Date().toISOString().slice(0, 10),
        changes,
    );

    return { changes, changelog, version, section };
}

function tagExists(tag) {
    try {
        git('rev-parse', '--quiet', '--verify', `refs/tags/${tag}`);

        return true;
    } catch {
        return false;
    }
}

function check() {
    const changes = readChanges();

    if (!flag('--pr')) {
        console.log(`${changes.length} change file(s) read.`);

        return;
    }

    const { PR_TITLE, BASE_SHA, HEAD_SHA } = process.env;

    if (!PR_TITLE || !BASE_SHA || !HEAD_SHA) {
        throw new Error('check --pr needs PR_TITLE, BASE_SHA and HEAD_SHA.');
    }

    const touched = git(
        'diff',
        '--name-only',
        '--diff-filter=AM',
        `${BASE_SHA}...${HEAD_SHA}`,
        '--',
        '.changes',
    )
        .split('\n')
        .map((file) => path.basename(file))
        .filter(
            (name) =>
                isChangeFile(name) && existsSync(path.join(CHANGES_DIR, name)),
        )
        .map(readChange);

    const problems = pullRequestProblems(PR_TITLE, touched);

    if (problems.length) {
        throw new Error(problems.join('\n'));
    }

    console.log(
        `Title and change files agree (${touched.length} in this pull request).`,
    );
}

function prepare() {
    const openPr = !flag('--no-pr');

    if (openPr) {
        if (git('status', '--porcelain')) {
            throw new Error(
                'Commit or stash your changes first; the release starts from main.',
            );
        }

        git('fetch', '--quiet', '--tags', 'origin', 'main');
        git('switch', '--quiet', '--detach', 'origin/main');
    }

    let planned;

    try {
        planned = plan();

        if (openPr && tagExists(`v${planned.version}`)) {
            throw new Error(`v${planned.version} is already tagged.`);
        }
    } catch (error) {
        if (openPr) {
            git('switch', '--quiet', '-');
        }

        throw error;
    }

    const { changes, changelog, version, section } = planned;
    const tag = `v${version}`;

    writeFileSync(CHANGELOG, insertSection(changelog, section));

    for (const change of changes) {
        rmSync(path.join(CHANGES_DIR, change.name));
    }

    run('npx', 'prettier', '--write', '--log-level', 'warn', 'CHANGELOG.md');
    console.log(`\n${section}\n`);

    if (!openPr) {
        console.log(`CHANGELOG.md has ${version}. Nothing was committed.`);

        return;
    }

    const branch = `release/${tag}`;
    const title = `chore: release ${version}`;
    git('switch', '--quiet', '-c', branch);
    git('add', '--all', 'CHANGELOG.md', '.changes');
    run('git', 'commit', '--quiet', '-m', title);
    run('git', 'push', '--set-upstream', 'origin', branch);

    const body = [
        '## What this changes and why',
        '',
        `Releases ${version}. Once this is merged, run \`npm run release:tag\` to publish it.`,
        '',
        section.split('\n').slice(2).join('\n'),
    ].join('\n');

    try {
        run(
            'gh',
            'pr',
            'create',
            '--base',
            'main',
            '--title',
            title,
            '--body',
            body,
        );
    } catch {
        console.log(
            `\nCouldn't open the pull request. Open one from ${branch} titled "${title}".`,
        );
    }

    console.log(
        `\nNext: merge that pull request, then run \`npm run release:tag\`.`,
    );
}

// Throws unless `commit` is the release of `version`: on main, and the commit that added the
// dated section. Shared by `tag`, before it pushes, and by the workflow, before it builds.
function assertReleaseCommit(version, commit) {
    const show = (rev) => {
        try {
            return git('show', `${rev}:CHANGELOG.md`);
        } catch {
            return '';
        }
    };
    const sha = git('rev-parse', '--verify', `${commit}^{commit}`);
    const where = `${sha.slice(0, 7)} (${git('log', '-1', '--format=%s', sha)})`;

    try {
        git('merge-base', '--is-ancestor', sha, 'origin/main');
    } catch {
        throw new Error(`${where} is not on main, so it can't be v${version}.`);
    }

    const problem = releaseCommitProblem(version, show(sha), show(`${sha}^`));

    if (problem) {
        throw new Error(
            `${where} is not the release of ${version}: ${problem}.`,
        );
    }

    return where;
}

function tag() {
    git('fetch', '--quiet', '--tags', 'origin', 'main');
    const version = latestVersion(git('show', 'origin/main:CHANGELOG.md'));
    const name = `v${version}`;

    if (tagExists(name)) {
        throw new Error(
            `${name} is the newest version in CHANGELOG.md on main and is already tagged. Merge a release pull request first (npm run release).`,
        );
    }

    // The commit that added the section, not the tip of main: anything merged after the
    // release pull request belongs to the next version. The newest such commit: an older
    // one may have carried the same heading as a draft that was later removed.
    const commit = git(
        'log',
        'origin/main',
        '-1',
        '--format=%H',
        `-S## [${version}]`,
        '--',
        'CHANGELOG.md',
    );

    if (!commit) {
        throw new Error(
            `Couldn't find the commit that added ${version} to CHANGELOG.md.`,
        );
    }

    const where = assertReleaseCommit(version, commit);

    console.log(`Tagging ${where} as ${name} and pushing it.`);
    git('tag', name, commit);
    run('git', 'push', 'origin', name);
    console.log(
        `\n${name} is pushed. The Release workflow builds and publishes it.`,
    );
}

const commands = {
    check,
    notes: () => {
        const { version, section } = plan();
        console.log(`Next version: ${version}\n\n${section}`);
    },
    section: () => {
        const version = flags[0]?.replace(/^v/, '');
        const section = version
            ? sectionFor(readFileSync(CHANGELOG, 'utf8'), version)
            : null;

        if (section === null) {
            throw new Error(`CHANGELOG.md has no section for [${version}]`);
        }

        process.stdout.write(section);
    },
    'check-tag': () => {
        const version = flags[0]?.replace(/^v/, '');
        const commit = flags[1] ?? 'HEAD';

        if (!version) {
            throw new Error('Usage: release.mjs check-tag <version> [commit]');
        }

        console.log(
            `${assertReleaseCommit(version, commit)} is the release of ${version}.`,
        );
    },
    prepare,
    tag,
};

if (!Object.hasOwn(commands, command ?? '')) {
    console.error(
        `Usage: node scripts/release.mjs ${Object.keys(commands).join(' | ')}`,
    );
    process.exit(2);
}

try {
    commands[command]();
} catch (error) {
    console.error(`release: ${error.message}`);
    process.exit(1);
}
