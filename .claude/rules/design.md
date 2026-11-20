---
paths:
    - 'resources/js/**'
    - 'resources/css/**'
    - 'resources/views/**'
---

## Design language

For any household, anywhere: warm, calm and personal without costing ease of use. The world is the
**Fridge Door** (PRODUCT.md, DESIGN.md): warm enamel white, soft ink, one coral for actions, and
what needs you pinned up by a magnet in the sender's colour.
**The house is one; each room has its own objects.** Chrome is the same everywhere and character
lives on the things themselves.

- **Always the same:** the tinted frame and page sheet (`.shell-frame` / `.shell-sheet`), page titles
  (`.page-h1`), pill buttons, 12px-radius fields, 16px-radius cards, list order (tabs, then count +
  search + sort), add surfaces and vocabulary (a _moment_, a _note_, a _citation_).
- **One face, Atkinson Hyperlegible Next, for everything** (`--font-sans`; `--font-display` and
  `--font-hand` point at it), registered through the Vite `fonts:` array. Three weights only: 300
  for Home's date, 400 to read, 600 (`--weight-display`) for titles. Its italic is for what was
  filled in or handwritten (a note's body, a coupon's title). Nothing heavier, never a second
  face, no tracked capitals, no text under 13px; sizes come from the `--text-*` scale.
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
- **Colour has jobs.** Soft warm ink on warm white, never pure black or a cold grey. Coral
  `--shell-action` is the only action colour and marks where you are. `--shell-accent` is its pale
  wash for what is selected and never fills a button. The `--magnet-*` colours mark people on
  Home's slips, nothing else. Destructive stays outlined until the final confirm. No side stripes.
- **A card that opens somewhere opens from anywhere on it.** Put `.shell-card-stretch` on the card and
  `.shell-card-link` on its link; other links and buttons in the card stay on top and keep their own clicks.
- **Dialogs for one or two fields, sheets for composing.** No small tracked label above a title.
- **Controls come from `components/ui`** (shadcn on Base UI). Don't hand-roll a tab, radio,
  toggle, tooltip, menu, switch, field or skeleton; restyle the primitive with the room's classes.
  A room's objects (a sticker, a note, a coupon, a form) stay its own. A tooltip is a pointer
  extra, never the only place something is said.
- **A person has a face.** Wherever someone is named, `PersonAvatar` sits before the name: their
  picture, or their initials on the accent wash. It is decoration beside a printed name, never a
  link, and never the only way to tell who, with one exception: a History timeline card, where the
  poster's face on the rail is the only "who" (named to screen readers and on hover). Home and
  History say people by first name (`Household::shortName`), the full name only when two members
  share one. Not on a citation's or coupon's form, which name
  people in ink.
- **`HeartMark`** (`Shell/Components/HeartMark.tsx`) is the one drawn mark for now. No emoji in the UI,
  with one exception: History's reactions are the fixed set in `EventReaction::EMOJI`
  (❤️ 😂 😮 😢 🙏 🎉), drawn as the glyphs the server sends. Nowhere else, not even as decoration
  beside them.
- **Home does work.** Today's date, "Needs you" as paper slips pinned by the sender's face
  on a ring in their colour (each a link straight to the thing), "New this week" (others' additions,
  the last day a step stronger), and birthdays coming up. Rooms are not on Home: the phone's
  bottom bar and the laptop sidebar list them. Rooms feed it from their providers
  through `DashboardSummaries::registerFeed`; private Exchange items reach only their parties.
- **Done is never crossed out.** A loved song or visited place is a treasure: it gets a sticker and
  keeps its full colour.

The shipped theme CSS and components are the design source of truth.
