---
paths:
    - 'resources/css/**'
    - 'resources/js/MiniApps/**'
    - 'vite.config.ts'
---

## Mini-app theme architecture

Three layers. **Layer 1** `--shell-*` OS tokens — one palette (soft ink and coral on warm white), defined only in
`resources/css/app.css` on `:root`; mini apps never define them. **Layer 2** `--<app>-*` motif tokens — identity (fonts, radii, easing, textures); colours
here only alias or mix `--shell-*`, never a literal. **Layer 3** `.<app>-*` composition classes scoped under `[data-app='<slug>']`; a class on a portaled root that carries `data-app` itself needs the compound form `[data-app='<slug>'].<class>`. Static styles belong here or in Tailwind; keep `style={{…}}` for values computed at runtime.

> Mini apps consume `--shell-*` for colour, define `--<app>-*` for identity, and never reference
> another app's tokens.

- The one face is Atkinson Hyperlegible Next, registered through the Vite plugin `fonts:` array, never
  `@import url(…)`. A room varies weight and italic, not the face.
- Exemplars: `themes/history.css` (full three-layer), `themes/mailbox.css` (notebook + citation
  motif), `themes/corner.css` (objects on shared chrome).
- Shared list band (`ListNavBand` / `ChoiceMenu`, used by Corner and Mailbox) takes app
  identity via `--list-nav-font` and `--list-nav-radius` declared in the app's `[data-app]` scope —
  never by editing the shared component. History's own "Sort:" and "Year:" menus are `ChoiceMenu`
  with History's classes passed in `classNames`.
- A room's layout wraps its pages in `RoomScope` (`slug` + the room's page classes), which sets
  `data-app` and the portal context once; its landing cards are `RoomDoor` with room classes.
- The shell's form sheet (`FormSheet`, `.shell-form-sheet-*` in `app.css`) takes its colours and
  title face from `--form-sheet-paper`, `-ink`, `-ink-soft`, `-border` and `-font-display`, which
  each room aliases to its own tokens in its `[data-app]` block.
