---
version: 1
slug: 'resources-js-shell-pages-dashboard-tsx'
primary_target: 'resources/js/Shell/Pages/Dashboard.tsx'
related_targets: ['resources/css/app.css']
---

# Home (/dashboard) and the shell world

Scope: the shared shell (tokens, faces, chrome: bottom bar, top bar, sidebar, page header, auth,
error) and the Home page. Visitor mode: Operate. Phone PWA first, laptop second.

Audience and job: any member of one household, any age, opening Ghar for a few seconds. Home must
answer "does anything need me?" and "what's new at home?" before it offers the rooms.

Constraints: rooms register Home content from their own providers (the shell imports no room);
private Exchange items appear only to their sender and recipients; Pay/Answer/Read are links to the
item, not inline mutations; text never under 13px, taps 44px; every page keeps a visible h1.

Rooms are not listed on Home: the phone reaches them from the bottom bar and the laptop from the
sidebar (user decision, 2026-11-20).

## Direction contract

THESIS: Home is the family fridge door: what needs you is pinned up by the sender's face,
ringed in their colour, and the rest of the week sits quietly below. Refuses both a grid of app cards and a loud
dashboard; nothing is heavy.

OWN-WORLD: Warm enamel white ground, soft warm ink (never black), coral as the one colour for
what you can press and where you are, five magnet colours (coral, sage, sand, sky, lilac) that only
mark people. One face, Atkinson Hyperlegible Next, at 300 / 400 / 600 only. Paper slips get a
soft real shadow; everything else is flat with hairline rules.

STORY: Meera opens Ghar, sees the date and six slips pinned up for her, taps Pay on Ravi's
citation, comes back, scans what the family added this week, and reaches any room from the bottom
bar (phone) or the sidebar (laptop).

FIRST VIEWPORT: Phone: top bar with wordmark and avatar; the date large and light; "November · 6
things for you, Meera"; "Needs you" as two columns of slightly tilted paper slips, each pinned by
the sender's face on a ring in their colour, with title, detail, a coral pill and its age; bottom tab bar.
Desktop: the same column beside a sidebar that lists Home and every room.

FORM: Fridge Door, my own grounded pick, chosen by the user in round 3 after rejecting Living Type
("too heavy/chunky, too quirky; too cold, too stark"); seed:1e2b83f2b3743597. Signature move: the
magnet slips.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
