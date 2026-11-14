# Changelog

Every release gets a section here before its tag is pushed; the release workflow publishes that
section as the GitHub release notes. Versions follow [semantic versioning](https://semver.org):
a major version can need you to do something when you upgrade, and says what under **Upgrading**.
Minor and patch versions don't.

Before any upgrade, back up the database and the media volume (DEPLOY.md, "Backups and restore").
Migrations only run forward.

## [1.0.0] - 2026-11-13

The first public release.

- Our History: a timeline, gallery and calendar of moments, with photos and videos.
- Our Corner: shared lists of songs, movies, places and things to do.
- Our Mailbox: notes and flowers to one or more people, challans and coupons.
- Invite-only accounts with an admin role, Web Push, a home-screen app (PWA) and short links for
  NFC tags.
- Photos stay on your own disk by default, behind signed links that expire. Any S3-compatible
  bucket works instead.
- Images for amd64 and arm64 at `ghcr.io/things-varun-codes/ghar`.
