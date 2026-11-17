---
paths:
    - 'resources/js/**'
    - 'resources/css/**'
    - 'resources/views/**'
---

## Design language

For a household, so it should feel thoughtful, cute, soft and warm without costing ease of use.
**The house is one; each room has its own objects.** Chrome is the same everywhere and character
lives on the things themselves.

- **Always the same:** the tinted frame and page sheet (`.shell-frame` / `.shell-sheet`), page titles
  (`.page-h1`), pill buttons, 14px-radius fields, 22px-radius cards, list order (tabs, then count +
  search + sort), add surfaces and vocabulary (a _moment_, a _note_, a _citation_).
- **Two faces with fixed jobs, in every room.** Newsreader (`--font-display`, weight 400) sets page
  titles, section and sheet titles, dates and the title of a moment; its italic is for what was
  filled in or attributed. Hanken Grotesk (`--font-sans`, 400 and 500 only) sets everything else.
  Patrick Hand (`--font-hand`) is the one exception: the body of a note and a coupon's title, and
  nowhere else. Never add a face, a 600+ weight, tracked capitals or text under 13px; sizes come
  from the `--text-*` scale in `app.css`.
- **One radius family and one motion vocabulary**, as tokens in `app.css`: `--radius-pill`,
  `--radius-field`, `--radius-pop`, `--radius-card`, `--radius-inner`; `--ease-ui` with `--dur-in`,
  `--dur-out`, `--dur-press`, `--dur-card`. A button steps up 1px on hover and presses on click
  (`.shell-press`); a field takes `.shell-field`; a card that opens something lifts 2px
  (`.shell-lift`); a small control gets its 44px tap area from `.shell-hit-44`; a fill darkens
  toward the ink, never lightens. Use these classes instead of re-declaring the recipe in a room's
  stylesheet. Write the two layout thresholds as `@variant md` / `@variant lg` in CSS and
  `useIsPhone()` / `useHasSidebar()` in TSX, and stacking layers as the `--z-*` tokens. Nothing bounces, and nothing fades in as a list loads. Cards carry no resting shadow.
- **Two jobs for colour.** `--shell-action` is the only action colour. `--shell-accent` only marks
  what is selected or tints a surface; it never fills a button. Destructive stays outlined until the
  final confirm.
- **A card that opens somewhere opens from anywhere on it.** Put `.shell-card-stretch` on the card and
  `.shell-card-link` on its link; other links and buttons in the card stay on top and keep their own clicks.
- **Dialogs for one or two fields, sheets for composing.** No small tracked label above a title.
- **`HeartMark`** (`Shell/Components/HeartMark.tsx`) is the one drawn mark. No emoji in the UI.
- **Home** is a door per app (`DesktopIcon`) showing a glimpse supplied by that app (step 8 in `new-mini-app.md`).
- **Done is never crossed out.** A loved song or visited place is a treasure: it gets a sticker and
  keeps its full colour.

The shipped theme CSS and components are the design source of truth.
