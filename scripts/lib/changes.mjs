// Change files: one Markdown file in .changes/ per change a household can notice, folded into
// CHANGELOG.md by scripts/release.mjs. Everything here is pure, so it is tested without a repo.

const WIDTH = 100;

const TYPES = {
    added: 'minor',
    changed: 'minor',
    fixed: 'patch',
    security: 'patch',
};

// The order the sections appear in a release. A breaking change of any type goes under
// Upgrading, because that is where DEPLOY.md sends someone before they pull a major version.
const SECTIONS = [
    ['upgrading', 'Upgrading'],
    ['added', 'Added'],
    ['changed', 'Changed'],
    ['fixed', 'Fixed'],
    ['security', 'Security'],
];

const TITLE =
    /^(feat|fix|perf|refactor|docs|test|chore|ci|build|style|revert)(\([\w./-]+\))?(!)?: \S/;

const LIST_ITEM = /^(\s*)([-*]|\d+\.) +(.*)$/;

export function isChangeFile(name) {
    return name.endsWith('.md') && name !== 'README.md';
}

export function parseChange(name, text) {
    const fail = (message) => {
        throw new Error(`.changes/${name}: ${message}`);
    };

    const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(
        text.replace(/\r\n/g, '\n'),
    );

    if (!match) {
        fail('must start with a block between two --- lines that sets type');
    }

    const meta = {};

    for (const line of match[1].split('\n')) {
        if (!line.trim()) {
            continue;
        }

        const pair = /^([a-z]+):\s*(.*?)\s*$/.exec(line);

        if (!pair) {
            fail(`can't read the line "${line}"`);
        }

        meta[pair[1]] = pair[2];
    }

    const unknown = Object.keys(meta).filter(
        (key) => key !== 'type' && key !== 'breaking',
    );

    if (unknown.length) {
        fail(`unknown key "${unknown[0]}"; only type and breaking are read`);
    }

    if (!Object.hasOwn(TYPES, meta.type ?? '')) {
        fail(`type must be one of ${Object.keys(TYPES).join(', ')}`);
    }

    if (meta.breaking !== undefined && !/^(true|false)$/.test(meta.breaking)) {
        fail('breaking must be true or false');
    }

    const body = match[2].trim();

    if (!body) {
        fail('has no text');
    }

    const cut = body.search(/\n[ \t]*\n/);
    const first = cut === -1 ? body : body.slice(0, cut);
    const detail = cut === -1 ? '' : body.slice(cut).trim();

    if (/^([-*#>]|\d+\.|```)/.test(first)) {
        fail('must open with a sentence, not a list, heading or code block');
    }

    // A heading would end the release's section in CHANGELOG.md, and the notes with it.
    if (outsideFences(detail).some((line) => /^#{1,6} /.test(line))) {
        fail('must not contain headings');
    }

    const breaking = meta.breaking === 'true';

    if (breaking && !detail) {
        fail('a breaking change needs a second paragraph saying what to do');
    }

    return {
        name,
        type: meta.type,
        breaking,
        summary: first
            .split('\n')
            .map((line) => line.trim())
            .join(' '),
        detail,
    };
}

function outsideFences(text) {
    const lines = [];
    let fenced = false;

    for (const line of text.split('\n')) {
        if (line.trimStart().startsWith('```')) {
            fenced = !fenced;
        } else if (!fenced) {
            lines.push(line);
        }
    }

    return lines;
}

function wrap(text, width) {
    const lines = [];
    let line = '';

    for (const word of text.split(/\s+/).filter(Boolean)) {
        if (line && line.length + 1 + word.length > width) {
            lines.push(line);
            line = word;
        } else {
            line = line ? `${line} ${word}` : word;
        }
    }

    if (line) {
        lines.push(line);
    }

    return lines;
}

// Rewraps paragraphs and list items to the changelog's width, so an author never has to count
// columns. Code blocks pass through untouched.
function reflow(text, width) {
    const out = [];
    let block = null;
    let fenced = false;

    const flush = () => {
        if (!block) {
            return;
        }

        const hang = ' '.repeat(block.first.length);
        wrap(block.text, width - hang.length).forEach((line, index) => {
            out.push((index ? hang : block.first) + line);
        });
        block = null;
    };

    for (const line of text.split('\n')) {
        if (line.trimStart().startsWith('```')) {
            flush();
            fenced = !fenced;
            out.push(line);
        } else if (fenced) {
            out.push(line);
        } else if (!line.trim()) {
            flush();
            out.push('');
        } else {
            const item = LIST_ITEM.exec(line);

            if (item) {
                flush();
                block = { first: `${item[1]}${item[2]} `, text: item[3] };
            } else if (block) {
                block.text += ` ${line.trim()}`;
            } else {
                block = { first: '', text: line.trim() };
            }
        }
    }

    flush();

    return out;
}

function renderEntry({ summary, detail }) {
    const lines = wrap(summary, WIDTH - 2).map(
        (line, index) => (index ? '  ' : '- ') + line,
    );

    if (detail) {
        // A list sits straight under its bullet; a paragraph or code block needs the gap.
        if (!LIST_ITEM.test(detail.split('\n')[0])) {
            lines.push('');
        }

        for (const line of reflow(detail, WIDTH - 2)) {
            lines.push(line ? `  ${line}` : '');
        }
    }

    return lines.join('\n');
}

export function renderSection(version, date, changes) {
    const sorted = [...changes].sort((a, b) => a.name.localeCompare(b.name));
    const parts = [`## [${version}] - ${date}`];

    for (const [key, heading] of SECTIONS) {
        const entries = sorted
            .filter(
                (change) =>
                    (change.breaking ? 'upgrading' : change.type) === key,
            )
            .map(renderEntry);

        if (!entries.length) {
            continue;
        }

        let list = '';
        entries.forEach((entry, index) => {
            // Markdown reads a bullet with a blank line inside as a loose item, and a loose
            // item is followed by a blank line.
            const loose = index > 0 && entries[index - 1].includes('\n\n');
            list += (index ? (loose ? '\n\n' : '\n') : '') + entry;
        });
        parts.push(`### ${heading}`, list);
    }

    return parts.join('\n\n');
}

export function latestVersion(changelog) {
    const match = /^## \[(\d+\.\d+\.\d+)\]/m.exec(changelog);

    if (!match) {
        throw new Error('CHANGELOG.md has no released version yet');
    }

    return match[1];
}

// The body of the `## [version]` section, without its heading, or null when there is none. A
// pre-release (1.2.0-rc.1) without a section of its own uses the one it leads up to.
export function sectionFor(changelog, version) {
    const find = (wanted) => {
        const lines = changelog.split('\n');
        const start = lines.findIndex((line) =>
            line.startsWith(`## [${wanted}]`),
        );

        if (start === -1) {
            return null;
        }

        const end = lines.findIndex(
            (line, at) => at > start && line.startsWith('## ['),
        );
        const body = lines.slice(start + 1, end === -1 ? undefined : end);

        // A final newline leaves an empty last element that is not a line of the section.
        if (end === -1 && body.at(-1) === '') {
            body.pop();
        }

        return /\S/.test(body.join('\n')) ? `${body.join('\n')}\n` : null;
    };

    return find(version) ?? find(version.split('-')[0]);
}

// Why `changelog` (CHANGELOG.md at a commit, with `parentChangelog` the same file one commit
// earlier) does not make that commit the release of `version`, or null when it does. The
// release is the one commit that adds the dated heading: an earlier commit may carry a draft
// of it, and every later commit on main still has it.
export function releaseCommitProblem(version, changelog, parentChangelog) {
    const base = version.split('-')[0];
    const dated = (text) =>
        text
            .split('\n')
            .some(
                (line) =>
                    line.startsWith(`## [${base}] - `) &&
                    /^\d{4}-\d{2}-\d{2}$/.test(
                        line.slice(`## [${base}] - `.length).trim(),
                    ),
            );

    if (!dated(changelog)) {
        return `CHANGELOG.md there has no dated section for [${base}]`;
    }

    if (dated(parentChangelog)) {
        return `the section for [${base}] was already there one commit earlier, so a later commit than the release was picked`;
    }

    return null;
}

export function nextVersion(current, changes) {
    const [major, minor, patch] = current.split('.').map(Number);

    if (changes.some((change) => change.breaking)) {
        return `${major + 1}.0.0`;
    }

    if (changes.some((change) => TYPES[change.type] === 'minor')) {
        return `${major}.${minor + 1}.0`;
    }

    return `${major}.${minor}.${patch + 1}`;
}

export function insertSection(changelog, section) {
    const at = changelog.search(/^## \[/m);

    if (at === -1) {
        return `${changelog.trimEnd()}\n\n${section}\n`;
    }

    return `${changelog.slice(0, at)}${section}\n\n${changelog.slice(at)}`;
}

// `changes` are the parsed change files the pull request adds or edits. Returns what is wrong
// with it, as sentences; an empty list passes.
export function pullRequestProblems(title, changes) {
    const match = TITLE.exec(title);

    if (!match) {
        return [
            `The title "${title}" is not a Conventional Commits title such as "fix: …" or "feat(corner): …". It becomes the commit on main when the pull request is squash-merged.`,
        ];
    }

    const [, type, , bang] = match;
    const problems = [];

    if ((type === 'feat' || type === 'fix') && !changes.length) {
        problems.push(
            `A ${type} pull request changes something people notice, so it needs a change file in .changes/ (see .changes/README.md). If nobody using Ghar would notice, the title is a refactor, chore, test, docs or ci.`,
        );
    }

    if (bang && !changes.some((change) => change.breaking)) {
        problems.push(
            'The "!" in the title marks a breaking change, so one of its change files needs "breaking: true" and a paragraph saying what to do on upgrade.',
        );
    }

    return problems;
}
