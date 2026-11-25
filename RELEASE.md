# Releasing

How a change gets from a pull request into a published version. Written for the maintainer and for
an AI agent working in the repo; both follow the same steps.

## Between releases

Nothing is released when a pull request merges. Its changelog entry waits on `main`:

1. A pull request that changes something a household can notice adds a change file to `.changes/`
   ([`.changes/README.md`](./.changes/README.md) has the format and the wording). The "Change file"
   check fails a `feat:` or `fix:` pull request without one.
2. The pull request merges. Its change file is now on `main`, next to the files from every other
   pull request merged since the last release.
3. The next release takes every file that is in `.changes/` on `main` at that moment, so anything
   merged before you run `npm run release` is included, and anything merged after it waits for the
   release after that.

To see what is waiting, and which version it adds up to:

```sh
git switch main && git pull
npm run release:notes
```

If something merged without an entry, or an entry reads badly, open a pull request that adds or
edits the file in `.changes/` (title it `docs: …`). Don't edit `CHANGELOG.md`.

## Cut a release

You need a clean working tree, `gh` signed in, and a checkout that has had `npm run dev-setup`.

1. **Preview.** `npm run release:notes` prints the next version and its section. The types decide
   the version: only `fixed` or `security` is a patch, any `added` or `changed` is a minor, and any
   `breaking: true` is a major.
2. **Prepare.** `npm run release` starts from the latest `main`, writes the section into
   `CHANGELOG.md`, deletes the change files, pushes a `release/v1.2.3` branch and opens a pull
   request titled `chore: release 1.2.3`. To choose the version yourself:
   `npm run release -- --version 2.0.0`. A new major (`2.0.0`) also gets a first **Upgrading**
   step to set `GHAR_VERSION=2`, because an install on `1` never receives it otherwise, and the
   same commit points `.env.selfhost.example` at `2` so new installs start there.
3. **Merge** that pull request once its checks pass. Read the section in it first; this is the last
   point where the wording can change.
4. **Publish.** `npm run release:tag` tags the commit that added the section as `v1.2.3` and pushes
   the tag. Pull requests merged after step 3 are not in the release, even if they are already on
   `main`. It prints the commit it is about to tag; that must be `chore: release 1.2.3`.

The tag starts `.github/workflows/release.yml`. It runs CI again, builds the image for amd64 and
arm64, publishes `ghcr.io/<owner>/ghar:1.2.3`, `:1.2`, `:1` and `:latest`, and creates the GitHub
release with the changelog section as its notes. Follow it with `gh run watch`.

An install on the default `GHAR_VERSION=1` gets the new version the next time it runs `pull` and
`up -d` ([`DEPLOY.md`](./DEPLOY.md#upgrading)).

## By hand

The script only saves typing. Without it:

1. On a branch from `main`, add `## [1.2.3] - YYYY-MM-DD` above the previous version in
   `CHANGELOG.md`, with the text of each change file under `### Upgrading`, `### Added`,
   `### Changed`, `### Fixed` or `### Security`. Delete those files from `.changes/`.
2. Open a pull request titled `chore: release 1.2.3` and merge it.
3. Tag the merged commit and push the tag:

    ```sh
    git fetch origin main
    git tag v1.2.3 <the merged commit>
    git push origin v1.2.3
    ```

Before you push, check the commit: `node scripts/release.mjs check-tag 1.2.3 <the merged commit>`.
The workflow runs the same check in its first job and publishes nothing unless the tag is on
`main`, on the one commit that added the dated `## [1.2.3]` section.

## Rehearse one

After step 3, push a pre-release tag by hand: `git tag v1.2.3-rc.1 <the merged commit>` and
`git push origin v1.2.3-rc.1`. It publishes only `:1.2.3-rc.1`, leaves `:1`, `:1.2` and `:latest`
alone, uses the `1.2.3` changelog section and marks the GitHub release as a pre-release.

## When something goes wrong

- **`npm run release` says there is nothing to release.** No change files are on `main`. Add one
  through a pull request first.
- **It couldn't open the pull request.** The branch is pushed. Open the pull request from
  `release/v1.2.3` yourself, with the title it printed.
- **The tag is on the wrong commit.** The workflow's first job fails and nothing is published, but
  the tag stays, because release tags can't be moved or deleted. Don't re-run that workflow run.
  If nothing was ever published under the tag, the repository owner can turn off the "release
  tags: never moved or deleted" ruleset in the repository settings, delete the tag, turn the
  ruleset back on and run `npm run release:tag` again. Otherwise release the next patch version.
- **The workflow failed after the tag was pushed.** Release tags can't be moved or deleted. If the
  failure was a passing problem, re-run the failed jobs (`gh run rerun --failed`). If the code is
  wrong, fix it on `main` with a `fix:` pull request and release the next patch version.
- **A release is bad.** Release a fix as the next patch. Someone who needs to go back pins the
  older `GHAR_VERSION` and restores their backup, because migrations only run forward.
