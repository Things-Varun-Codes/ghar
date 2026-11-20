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
- **One face, Atkinson Hyperlegible Next**, registered through `fonts:` in `vite.config.ts`, never
  `@import`. Weights 300 (Home's date only), 400 (reading) and 600 (`--weight-display`, titles);
  nothing heavier, no second face. Italic means "filled in or handwritten". No text under 13px, no
  tracked capitals, no small label above a title; sizes come from the `--text-*` scale.
- **Colour has jobs.** Warm ink on warm white, never pure black or cold grey. Coral
  (`--shell-action`) is the only colour for what you press and where you are; `--shell-accent` is
  its pale wash for what is selected and never fills a button. `--magnet-*` marks people on Home
  and nothing else. Destructive stays outlined until the final confirm. No side stripes.
- **Shapes and depth:** the `--radius-*` tokens only. Cards are flat at rest; only Home's paper
  slips and floating layers cast a shadow. A fill darkens toward the ink on hover, never lightens.
- **Shared recipes, not copies:** `.shell-press` (buttons), `.shell-field`, `.shell-lift` (a card
  that opens something), `.shell-hit-44` (every tap is at least 44px), `.shell-card-stretch` +
  `.shell-card-link` (a card opens from anywhere on it). Breakpoints are `@variant md` / `lg` in CSS
  and `useIsPhone()` / `useHasSidebar()` in TSX; layers are the `--z-*` tokens.
- **A person has a face.** `PersonAvatar` sits before every name, as decoration beside a printed
  first name. The one exception is a History timeline card, where the face on the rail is the only
  "who". The Exchange's forms name people in ink, with no faces.
- **No emoji in the UI**, except History's fixed reaction set. `HeartMark` is the one drawn mark.
- **Home does work:** today's date, "Needs you" as slips pinned by the sender's face, "New this
  week", birthdays coming up. Rooms are in the bottom bar (phone) and sidebar (from 1024px), never
  on Home.

## Theme layers

1. `--shell-*`: the one palette, defined only on `:root` in `app.css`. Rooms never define them.
2. `--<room>-*`: a room's identity (radii, textures, font roles). Colours here only alias or mix
   `--shell-*`, never a literal, and never another room's tokens.
3. `.<room>-*` classes scoped under `[data-app='<slug>']` (a portaled root that carries `data-app`
   itself uses `[data-app='<slug>'].<class>`). Keep `style={{…}}` for values computed at runtime.

A room wraps its pages in `RoomScope`. Shared components take a room's look through variables it
sets in its scope (`--list-nav-*`, `--form-sheet-*`) or classes the caller passes, never by forking.

## Controls and overlays

- Controls are shadcn on Base UI in `components/ui`. Don't hand-roll a tab, radio, toggle, tooltip,
  menu, switch, field or skeleton; restyle the primitive. Compose with `render`, never `asChild`. A
  link that looks like a button is a `Link` with `buttonVariants()`, not a `Button`.
- Use the `components/ui` overlays, not raw Base UI parts: they carry the room's `data-app` into the
  portal. A tooltip is never the only place something is said.
- One or two fields: a dialog. Composing: `FormSheet` (bottom on a phone, right from `md`). A yes/no
  question: `ConfirmDialog`.

## Motion

Soft and with a reason. One easing (`--ease-ui`) and the `--dur-*` durations; leaving is quicker
than arriving; nothing bounces, overshoots or loops, and there are no page transitions. Overlays
use Base UI's own CSS animations. Everything else uses the presets in `components/motion`, on a
wrapper, never on an element with `.shell-press` or `.shell-lift`, or above a `Fab`. A page's first
rows settle in once; later rows appear in place. Small things that change (a tick, a stamp) scale
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
  for what you press.
