# Design

Ghar is a private home on the web for one household, of any size, age mix or culture. It's used
mostly as a phone PWA, in moments of a few seconds: design phone first. It's warm, calm and plain,
never a tool, a feed or a social network. Copy is warm and a little funny, never assumes a couple,
and is English only. Things that are done are treasures, never tasks crossed off.

The values (colours, sizes, durations) live in `resources/css/app.css`; this file says how to use
them. The shipped CSS and components are the source of truth.

## The look: a fridge door

- **One house, many rooms.** Chrome is the same everywhere: the frame and sheet (`.shell-frame`,
  `.shell-sheet`), page titles (`.page-h1`), pill buttons, 12px fields, 16px cards, list order
  (tabs, then count, search and sort). Character lives on each room's own objects.
- **Three faces**, registered through `fonts:` in `vite.config.ts`, never `@import`. Atkinson
  Hyperlegible Next for reading: 300 (Home's date only) and 400; dates and years stay in it.
  Fraunces 600 (`--font-display`, `--weight-display`) for the wordmark and titles, upright only.
  Kalam (`--font-hand`) for what someone wrote in Our Exchange: notes, coupons, citations; it has
  no italic, so it is never slanted. Elsewhere, italic means "filled in". No fourth face, no text
  under 13px, no tracked capitals, no small label above a title; sizes come from the `--text-*`
  scale.
- **Colour has jobs.** Warm ink on warm white by day, warm light on warm dark by night (each
  person picks Light, Dark or their device's setting in Settings → Appearance); never pure black or
  cold grey. Coral
  (`--shell-action`) is the only colour for what you press and where you are; `--shell-accent` is
  its pale wash for what is selected and never fills a button. `--magnet-*` marks people on Home
  and nothing else. Destructive stays outlined until the final confirm. No side stripes.
- **Shapes and depth:** the `--radius-*` tokens only. Cards are flat at rest; only Home's paper
  slips and floating layers cast a shadow. A fill moves toward the ink on hover (darker by day, lighter by night), never away from it.
- **Shared recipes, not copies:** `.shell-press` (buttons), `.shell-field`, `.shell-lift` (a card
  that opens something), `.shell-hit-44` (every tap is at least 44px), `.shell-card-stretch` +
  `.shell-card-link` (a card opens from anywhere on it). Breakpoints are `@variant md` / `lg` in CSS
  and `useIsPhone()` / `useHasSidebar()` in TSX; layers are the `--z-*` tokens.
- **A person has a face.** `PersonAvatar` sits before every name, as decoration beside a printed
  first name. The one exception is a History timeline card, where the face on the rail is the only
  "who". The Exchange's forms name people in ink, with no faces.
- **No emoji in the UI**, except History's fixed reaction set. `HeartMark` is the one drawn mark.
- **Ghar's own mark** (the roof over a heart) is `public/favicon.svg` and nothing else: the tab,
  `AppMark` beside the name in the header, sidebar and sign-in page, and the loading screen all
  show that file (in-app as a mask, so it takes the coral of the current theme), and
  `npm run icons` draws the app icons from it.
- **Home does work:** today's date, "Needs you" as slips pinned by the sender's face, "New this
  week", birthdays coming up. Rooms are in the bottom bar (phone) and sidebar (from 1024px), never
  on Home.

## Colors

Every colour is a `--shell-*` token in `app.css`, an OKLCH `light-dark(day, night)` pair with a
warm hue (60–75 for neutrals, 38–40 for coral). Use the token by its role; never copy its value.

| Role                          | Token                                                       |
| ----------------------------- | ----------------------------------------------------------- |
| Page ground                   | `--shell-bg`                                                |
| Top bar, sidebar, bottom bar  | `--shell-chrome` (Tailwind `--sidebar`)                     |
| Card, sheet, field            | `--shell-surface`                                           |
| Hairline, field edge          | `--shell-border`, `--shell-border-input`                    |
| Reading text, quiet text      | `--shell-text`, `--shell-text-muted`                        |
| What you press, where you are | `--shell-action` on `--shell-action-fg`                     |
| Selected (never a button)     | `--shell-accent` wash with `--shell-accent-fg`              |
| Destructive                   | `--shell-destructive`, outlined until the final confirm     |
| Over a photo (never flips)    | `--shell-ink-fixed`, `--shell-paper-fixed`                  |
| People on Home only           | `--magnet-1` … `--magnet-5` (coral, sage, sand, sky, lilac) |
| Money in / money out          | `--shell-money-in` (sage), `--shell-money-out` (amber)      |

## Typography

Sizes are the `--text-*` scale; weights stop at 600 (`--weight-display`); titles take
`--tracking-display` (-0.015em).

| Use                              | Face     | Token                    |
| -------------------------------- | -------- | ------------------------ |
| Page title (`.page-h1`)          | Fraunces | `--text-page` (30–36px)  |
| Section, dialog and sheet titles | Fraunces | `--text-title` (24–26px) |
| Card titles, the top bar's title | Fraunces | `--text-subhead` (20px)  |
| Reading text and input values    | Atkinson | `--text-body` (16px)     |
| Helper, caption, error           | Atkinson | `--text-small` (14px)    |
| Label, meta (the floor)          | Atkinson | `--text-meta` (13px)     |
| A note body, a coupon title      | Kalam    | `--text-hand` (19px)     |

## Theme layers

1. `--shell-*`: the one palette, defined only on `:root` in `app.css`. Rooms never define them.
   Each colour is a `light-dark(day, night)` pair. `color-scheme` is set only on `:root` and
   `:root[data-theme=…]`: the build turns `light-dark()` into variables it toggles on exactly those
   rules, so a subtree can't stay light. What must not flip uses `--shell-ink-fixed` /
   `--shell-paper-fixed` (type and scrims over a photo); shadows use `--shell-shadow-ink`.
2. `--<room>-*`: a room's identity (radii, textures, font roles). Colours here only alias or mix
   `--shell-*`, never a literal, and never another room's tokens.
3. `.<room>-*` classes scoped under `[data-app='<slug>']` (a portaled root that carries `data-app`
   itself uses `[data-app='<slug>'].<class>`). Keep `style={{…}}` for values computed at runtime.

A room wraps its pages in `RoomScope`. Shared components take a room's look through variables it
sets in its scope (`--list-nav-*`, `--form-sheet-*`) or classes the caller passes, never by forking.

## Components

- **Page chrome** is `Page` (title, actions, tabs, FAB). Below `lg` the shell's top bar carries the
  page title and the way back, so the page's own `h1` is read only by screen readers there; a page
  whose title may not fit the top bar keeps it visible. Desktop shows the `h1`.
- **Adding** the page's main thing is a `Fab` (round coral +, bottom corner), not a header button.
- **States:** a slow, empty or failing surface uses `LoadingState`, `EmptyState`, `ErrorState`.
- **Lists** follow one order: `SegmentedTabs`, then `ListNavBand` (count, search, sort), then rows.
- Controls are shadcn on Base UI in `resources/js/components/ui`. Don't hand-roll a tab, radio, toggle, tooltip,
  menu, switch, field or skeleton; restyle the primitive. Compose with `render`, never `asChild`. A
  link that looks like a button is a `Link` with `buttonVariants()`, not a `Button`.
- Use the `resources/js/components/ui` overlays, not raw Base UI parts: they carry the room's `data-app` into the
  portal. A tooltip is never the only place something is said.
- One or two fields: a dialog. Composing: `FormSheet` (bottom on a phone, right from `md`). A yes/no
  question: `ConfirmDialog`.

## Motion

Soft and with a reason. One easing (`--ease-ui`) and the `--dur-*` durations; leaving is quicker
than arriving; nothing bounces, overshoots or loops, and there are no page transitions. Overlays
use Base UI's own CSS animations. Everything else uses the presets in `resources/js/components/motion`, on a
wrapper, never on an element with `.shell-press` or `.shell-lift`, or above a `Fab`. A page's first
rows settle in once; later rows appear in place. The History timeline is the one exception: its
rows rise in as they scroll into view (`SettleItem`'s `reveal`) and its rail fills with the scroll
(`ScrollFill`). Small things that change (a tick, a stamp) scale
in. Reduced motion is already handled; don't add a media query for it.

## Rooms

- **Our History:** a tender journal. Dates, years and counts are ink, never coral. A moment's photo
  is a small print with a paper border. A timeline card is a quiet reading surface: the whole card
  opens the moment, and editing lives in the sheet.
- **Our Shelf:** a shelf of loved things, one look for every list. A done thing gets a sticker and
  keeps its full colour. A card's edge has two controls, done and "⋯". Icons are ink, never coral;
  with no picture, the list's icon sits on the accent wash.
- **Our Exchange:** paper. Ruled notes with a red margin, the citation as an official form, the
  coupon as a voucher, all in the house ink. The stamp is the only thing in capitals. Coral only
  for what you press. Expenses read as a ledger: a date, the expense's icon in ink, and on the
  right what it means for you, in words over the amount. Only amounts and their words take the
  money colours, and never without the words.
