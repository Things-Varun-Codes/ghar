# Change files

Each change that someone using or running Ghar can notice gets one file here, in the same pull
request as the change. `npm run release` folds them into `CHANGELOG.md` and deletes them, so the
release notes are written while the change is fresh.

```markdown
---
type: fixed
---

After filtering a list, back went to the previous filter instead of the previous page.

- Going back from a song returns to the list as you had filtered it.
```

Name the file after the change (`back-leaves-the-page.md`). The first paragraph becomes the entry.
Anything after it is optional detail and sits under the entry: a short list, a paragraph or a code
block. Line length doesn't matter; the release rewraps it.

| `type`     | For                                     | Next release |
| ---------- | --------------------------------------- | ------------ |
| `added`    | Something new                           | minor        |
| `changed`  | Something that works or looks different | minor        |
| `fixed`    | Something that was wrong                | patch        |
| `security` | A closed hole or a tightened default    | patch        |

Add `breaking: true` under `type` when someone has to do something after they upgrade. The entry
moves to **Upgrading**, the next release is a major version, and the detail must say what to do.

## Wording

- Write for the person using the app or running the install. Name the page, button or setting, not
  the class or the file.
- One or two full sentences, plain and in the app's own words (a _moment_, a _note_, a _citation_).
- `added` and `changed` say how it is now. `fixed` says what was wrong, in the past tense.
- No pull request numbers, no names, and nothing about how the code changed.
- For a security fix, say what is safer now, not how to exploit what came before.

Tests, docs, refactors, CI and dependency updates need no file. A pull request titled `feat:` or
`fix:` does, and the "Change file" check fails without one. Edit an unreleased file when a later
change touches the same thing, so each release says it once.

`npm run release:notes` prints the next version and its section without changing anything.
