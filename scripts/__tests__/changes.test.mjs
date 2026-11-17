import assert from 'node:assert/strict';
import { test } from 'node:test';

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
} from '../lib/changes.mjs';

const file = (front, body) => `---\n${front}\n---\n${body}\n`;
const change = (name, front, body) => parseChange(name, file(front, body));

test('reads the type, the summary and the detail', () => {
    const parsed = change(
        'a.md',
        'type: fixed',
        'Back went to the last filter\ninstead of the last page.\n\n- One\n- Two',
    );

    assert.deepEqual(parsed, {
        name: 'a.md',
        type: 'fixed',
        breaking: false,
        summary: 'Back went to the last filter instead of the last page.',
        detail: '- One\n- Two',
    });
});

test('rejects a file the changelog could not hold', () => {
    const bad = [
        ['no front matter', 'Just text.\n'],
        ['unknown type', file('type: tweak', 'Text.')],
        ['unknown key', file('type: fixed\ncommit: abc', 'Text.')],
        [
            'breaking typo',
            file('type: fixed\nbreaking: yes', 'Text.\n\nDo this.'),
        ],
        ['no text', file('type: fixed', '')],
        ['opens with a list', file('type: fixed', '- Text.')],
        ['heading in the detail', file('type: fixed', 'Text.\n\n## Oops')],
        [
            'breaking without steps',
            file('type: changed\nbreaking: true', 'Text.'),
        ],
    ];

    for (const [label, text] of bad) {
        assert.throws(
            () => parseChange('a.md', text),
            /\.changes\/a\.md/,
            label,
        );
    }
});

test('a # inside a code block is not a heading', () => {
    const parsed = change(
        'a.md',
        'type: changed\nbreaking: true',
        'Moved.\n\n```sh\n# back up first\nmake backup\n```',
    );

    assert.equal(parsed.breaking, true);
});

test('README.md is not a change file', () => {
    assert.equal(isChangeFile('README.md'), false);
    assert.equal(isChangeFile('notes.txt'), false);
    assert.equal(isChangeFile('back-goes-back.md'), true);
});

test('the largest change decides the version', () => {
    const fixed = change('a.md', 'type: fixed', 'A.');
    const security = change('b.md', 'type: security', 'B.');
    const added = change('c.md', 'type: added', 'C.');
    const breaking = change(
        'd.md',
        'type: fixed\nbreaking: true',
        'D.\n\nDo this.',
    );

    assert.equal(nextVersion('1.4.2', [fixed, security]), '1.4.3');
    assert.equal(nextVersion('1.4.2', [fixed, added]), '1.5.0');
    assert.equal(nextVersion('1.4.2', [added, breaking]), '2.0.0');
});

test('renders sections in a fixed order, entries by file name', () => {
    const section = renderSection('1.2.0', '2026-11-16', [
        change('z-fix.md', 'type: fixed', 'Z was wrong.'),
        change('b-new.md', 'type: added', 'B is new.'),
        change('a-new.md', 'type: added', 'A is new.'),
        change(
            'move.md',
            'type: changed\nbreaking: true',
            'Moved.\n\nRun the thing.',
        ),
    ]);

    assert.equal(
        section,
        [
            '## [1.2.0] - 2026-11-16',
            '',
            '### Upgrading',
            '',
            '- Moved.',
            '',
            '  Run the thing.',
            '',
            '### Added',
            '',
            '- A is new.',
            '- B is new.',
            '',
            '### Fixed',
            '',
            '- Z was wrong.',
        ].join('\n'),
    );
});

test('wraps prose at 100 columns and leaves code alone', () => {
    const long = Array.from({ length: 30 }, () => 'word').join(' ');
    const code = `    ${'x'.repeat(120)}`;
    const section = renderSection('1.2.0', '2026-11-16', [
        change(
            'a.md',
            'type: added',
            `${long}.\n\n- ${long}\n\n\`\`\`sh\n${code}\n\`\`\``,
        ),
    ]);
    const lines = section.split('\n');

    assert.ok(
        lines
            .filter((line) => !line.includes('xxx'))
            .every((line) => line.length <= 100),
    );
    assert.ok(lines.includes(`  ${code}`));
    // A wrapped line stays inside its bullet: 19 words fit, 11 carry over.
    const rest = Array.from({ length: 11 }, () => 'word').join(' ');
    assert.ok(lines.includes(`  ${rest}.`));
    assert.ok(lines.includes(`    ${rest}`));
});

test('a new section goes above the last release', () => {
    const changelog =
        '# Changelog\n\nIntro.\n\n## [1.1.0] - 2026-11-14\n\n- Old.\n';
    const next = insertSection(changelog, '## [1.2.0] - 2026-11-16\n\n- New.');

    assert.equal(
        next,
        '# Changelog\n\nIntro.\n\n## [1.2.0] - 2026-11-16\n\n- New.\n\n## [1.1.0] - 2026-11-14\n\n- Old.\n',
    );
    assert.equal(latestVersion(next), '1.2.0');
});

test('a feat or fix pull request needs a change file', () => {
    const fixed = change('a.md', 'type: fixed', 'A.');
    const breaking = change(
        'd.md',
        'type: changed\nbreaking: true',
        'D.\n\nDo this.',
    );

    assert.equal(
        pullRequestProblems('fix(corner): keep the filter', []).length,
        1,
    );
    assert.equal(pullRequestProblems('feat: phone bar', []).length, 1);
    assert.deepEqual(pullRequestProblems('fix: keep the filter', [fixed]), []);
    assert.deepEqual(
        pullRequestProblems('chore(deps): bump the minor-and-patch group', []),
        [],
    );
    assert.deepEqual(pullRequestProblems('chore: release 1.2.0', []), []);
    assert.equal(pullRequestProblems('Fix the filter', []).length, 1);
    assert.equal(pullRequestProblems('feat!: drop themes', [fixed]).length, 1);
    assert.deepEqual(pullRequestProblems('feat!: drop themes', [breaking]), []);
});

const LOG =
    '# Changelog\n\n## [1.3.0] - 2026-02-01\n\n### Added\n\n- New.\n\n## [1.2.0] - 2026-01-01\n\n### Fixed\n\n- Old.\n';

test('sectionFor returns the body under the version heading', () => {
    assert.equal(sectionFor(LOG, '1.3.0'), '\n### Added\n\n- New.\n\n');
    assert.equal(sectionFor(LOG, '1.2.0'), '\n### Fixed\n\n- Old.\n');
});

test('sectionFor gives a pre-release the section it leads up to', () => {
    assert.equal(sectionFor(LOG, '1.3.0-rc.1'), sectionFor(LOG, '1.3.0'));
});

test('sectionFor returns null for a missing version', () => {
    assert.equal(sectionFor(LOG, '2.0.0'), null);
    assert.equal(sectionFor(LOG, '2.0.0-rc.1'), null);
});

const BEFORE = '# Changelog\n\n## [1.2.0] - 2026-01-01\n\n- Old.\n';

test('the release commit is the one that adds the dated section', () => {
    assert.equal(releaseCommitProblem('1.3.0', LOG, BEFORE), null);
    assert.equal(releaseCommitProblem('1.3.0-rc.1', LOG, BEFORE), null);
    assert.equal(releaseCommitProblem('1.2.0', BEFORE, ''), null);
});

test('a commit after the release is not the release commit', () => {
    assert.match(releaseCommitProblem('1.3.0', LOG, LOG), /one commit earlier/);
});

test('a draft heading or a missing one is not a release', () => {
    const draft = LOG.replace('2026-02-01', 'Unreleased');

    assert.match(
        releaseCommitProblem('1.3.0', draft, BEFORE),
        /no dated section/,
    );
    assert.match(
        releaseCommitProblem('2.0.0', LOG, BEFORE),
        /no dated section/,
    );
    // The commit that turns a draft into a dated section is the release.
    assert.equal(releaseCommitProblem('1.3.0', LOG, draft), null);
});
