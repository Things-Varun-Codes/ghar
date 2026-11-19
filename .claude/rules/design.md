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
- **One radius family**, as tokens in `app.css`: `--radius-pill`, `--radius-field`,
  `--radius-pop`, `--radius-card`, `--radius-inner`. A button steps up 1px on hover and presses on click
  (`.shell-press`); a field takes `.shell-field`; a card that opens something lifts 2px
  (`.shell-lift`); a small control gets its 44px tap area from `.shell-hit-44`; a fill darkens
  toward the ink, never lightens. Use these classes instead of re-declaring the recipe in a room's
  stylesheet. Write the two layout thresholds as `@variant md` / `@variant lg` in CSS and
  `useIsPhone()` / `useHasSidebar()` in TSX, and stacking layers as the `--z-*` tokens. Cards carry no resting shadow.
- **Motion is soft and has a reason.** One easing, `--ease-ui`, and one set of durations:
  `--dur-press`, `--dur-out`, `--dur-in`, `--dur-card`, `--dur-sheet`, `--dur-sheet-out`,
  `--dur-media`, `--dur-stagger`. Leaving is quicker than arriving. Nothing bounces, overshoots or
  loops, and there are no page transitions.
    - A sheet slides, a dialog rises, a menu grows from its button: Base UI's own CSS
      animations in `components/ui`. Don't add Motion to them.
    - Everything else uses the presets in `components/motion` (`Fade`, `Rise`, `Pop`, `Reveal`,
      `Settle`, `Slide`) and never imports `motion/react` directly.
    - A page's first rows settle in once when it opens. Rows that arrive later (load more, a
      filter, a sort, a search, a refresh, going back) appear in place.
    - Small things that change scale in: a count, a tick, a stamp. Things that open push their
      neighbours smoothly.
    - Put Motion on a wrapper, never on an element that has `.shell-press`, `.shell-lift` or its
      own tilt, and never on anything above a `Fab` (a transform there moves the button).
    - Reduced motion is handled in `MotionConfig` and one block in `app.css`. Don't write a new
      media query for it.
- **Two jobs for colour.** `--shell-action` is the only action colour. `--shell-accent` only marks
  what is selected or tints a surface; it never fills a button. Destructive stays outlined until the
  final confirm.
- **A card that opens somewhere opens from anywhere on it.** Put `.shell-card-stretch` on the card and
  `.shell-card-link` on its link; other links and buttons in the card stay on top and keep their own clicks.
- **Dialogs for one or two fields, sheets for composing.** No small tracked label above a title.
- **Controls come from `components/ui`** (shadcn on Base UI). Don't hand-roll a tab, radio,
  toggle, tooltip, menu, switch, field or skeleton; restyle the primitive with the room's classes.
  A room's objects (a sticker, a note, a coupon, a form) stay its own. A tooltip is a pointer
  extra, never the only place something is said.
- **A person has a face.** Wherever someone is named, `PersonAvatar` sits before the name: their
  picture, or their initials on the accent wash. It is decoration beside a printed name, never a
  link, and never the only way to tell who. Not on a citation's or coupon's form, which name
  people in ink.
- **`HeartMark`** (`Shell/Components/HeartMark.tsx`) is the one drawn mark. No emoji in the UI,
  with one exception: History's reactions are the fixed set in `EventReaction::EMOJI`
  (❤️ 😂 😮 😢 🙏 🎉), drawn as the glyphs the server sends. Nowhere else, not even as decoration
  beside them.
- **Home** is a door per app (`DesktopIcon`) showing a glimpse supplied by that app (step 8 in `new-mini-app.md`).
- **Done is never crossed out.** A loved song or visited place is a treasure: it gets a sticker and
  keeps its full colour.

The shipped theme CSS and components are the design source of truth.
