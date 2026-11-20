---
name: Ghar
description: A private home on the web for one household; a fridge door where what needs you is held up by a magnet.
colors:
    enamel: 'oklch(0.966 0.008 75)'
    chrome: 'oklch(0.945 0.01 75)'
    paper: 'oklch(0.995 0.003 75)'
    hairline: 'oklch(0.905 0.012 70)'
    field-edge: 'oklch(0.66 0.02 60)'
    ink: 'oklch(0.29 0.01 60)'
    ink-muted: 'oklch(0.52 0.014 60)'
    coral: 'oklch(0.565 0.135 38)'
    coral-wash: 'oklch(0.91 0.045 40)'
    coral-deep: 'oklch(0.36 0.09 38)'
    destructive: 'oklch(0.5 0.16 25)'
    magnet-coral: 'oklch(0.7 0.12 38)'
    magnet-sage: 'oklch(0.72 0.07 160)'
    magnet-sand: 'oklch(0.78 0.1 75)'
    magnet-sky: 'oklch(0.74 0.07 240)'
    magnet-lilac: 'oklch(0.72 0.07 310)'
typography:
    date:
        fontFamily: 'Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif'
        fontSize: 'clamp(48px, 3vw + 38px, 64px)'
        fontWeight: 300
        lineHeight: 1
        letterSpacing: '-0.02em'
    display:
        fontFamily: 'Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif'
        fontSize: 'clamp(38px, 2.4vw + 28px, 48px)'
        fontWeight: 600
        letterSpacing: '-0.015em'
    headline:
        fontFamily: 'Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif'
        fontSize: 'clamp(30px, 1.4vw + 24px, 36px)'
        fontWeight: 600
        lineHeight: 1.15
        letterSpacing: '-0.015em'
    title:
        fontFamily: 'Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif'
        fontSize: 'clamp(24px, 0.5vw + 22px, 26px)'
        fontWeight: 600
        lineHeight: 1.2
        letterSpacing: '-0.015em'
    subhead:
        fontFamily: 'Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif'
        fontSize: '20px'
        fontWeight: 600
    body:
        fontFamily: 'Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif'
        fontSize: '16px'
        fontWeight: 400
        lineHeight: 1.3
    hand:
        fontFamily: 'Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif'
        fontSize: '19px'
        fontWeight: 400
    small:
        fontFamily: 'Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif'
        fontSize: '14px'
        fontWeight: 400
    meta:
        fontFamily: 'Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif'
        fontSize: '13px'
        fontWeight: 400
        fontFeature: "'tnum'"
rounded:
    slip: '4px'
    inner: '6px'
    field: '12px'
    pop: '14px'
    card: '16px'
    pill: '999px'
spacing:
    week-gap: '6px'
    row-gap: '10px'
    slip-gap: '22px 14px'
    gutter-phone: '16px'
    section: '32px'
    gutter-desktop: '32px'
components:
    button-primary:
        backgroundColor: '{colors.coral}'
        textColor: '{colors.paper}'
        rounded: '{rounded.pill}'
        padding: '0 24px'
        height: '44px'
    button-outline:
        backgroundColor: '{colors.paper}'
        textColor: '{colors.ink}'
        rounded: '{rounded.pill}'
        padding: '0 24px'
        height: '44px'
    slip-action:
        backgroundColor: '{colors.coral}'
        textColor: '{colors.paper}'
        typography: '{typography.small}'
        rounded: '{rounded.pill}'
        padding: '0 14px'
        height: '32px'
    input:
        backgroundColor: '{colors.paper}'
        textColor: '{colors.ink}'
        typography: '{typography.body}'
        rounded: '{rounded.field}'
        height: '44px'
    nav-item-current:
        backgroundColor: '{colors.coral-wash}'
        textColor: '{colors.coral-deep}'
        rounded: '{rounded.pill}'
        height: '44px'
    slip:
        backgroundColor: '{colors.paper}'
        textColor: '{colors.ink}'
        rounded: '{rounded.slip}'
        padding: '22px 14px 12px'
    week-cell:
        backgroundColor: '{colors.chrome}'
        rounded: '{rounded.inner}'
        height: '32px'
    feed-row:
        textColor: '{colors.ink}'
        typography: '{typography.body}'
        padding: '10px 0'
        height: '60px'
---

# Design System: Ghar

## Overview

**Creative North Star: "The Fridge Door"**

Ghar is the door of a household's fridge. The ground is warm enamel white, the ink is a soft warm brown-black that is never pure black, and nothing on it is heavy. What needs you is held up by a small magnet in the colour of the person who left it; everything else sits quietly underneath on hairline rules. One coral marks what you can press and where you are.

One face, Atkinson Hyperlegible Next, carries every role at three weights: 300 for Home's date, 400 to read, 600 for titles. It was chosen to be read by anyone in the house, at any age, on a phone held at arm's length. Density is a single calm column (640px on Home) with 44px taps and nothing under 13px.

Home is the reference expression: the date set large and light, "Needs you" as slightly tilted paper slips each pinned by the sender's face on a ring in their colour, then "New this week" as plain rows. Rooms are reached from the phone's bottom bar and the laptop sidebar, not from Home. The room objects (notes, citations, coupons, stickers, the gallery) alias these tokens but have not had their own pass yet.

**Key Characteristics:**

- Warm enamel ground, soft warm ink, never black or cold grey.
- One coral for pressables and the current place; its pale wash for what is selected.
- Magnets in five soft colours mark people on Home's slips.
- One face at 300 / 400 / 600; nothing heavier.
- Paper slips carry a soft real shadow; everything else is flat with hairlines.
- Nothing under 13px; every tap at least 44px.

## Colors

Warm, low-chroma neutrals with one coral that does the pressing, and five soft magnet tones reserved for people.

### Primary

- **Door Coral** (`coral`): the only fill for things you can press (primary buttons, the pill on a slip, the FAB) and the colour of the current bottom-bar tab, the sidebar wordmark, focus rings and the "Needs you" count. White on it reads at 4.6:1, and as text on paper it reads at 4.5:1.
- **Coral Wash** (`coral-wash`): what is selected. Mixed at 35% into the chrome or paper, it backs the current sidebar item, the current bottom-bar icon and a highlighted menu option. It never fills a button.
- **Deep Coral** (`coral-deep`): text on the coral wash (the current sidebar item).

### Secondary

- **Magnets** (`magnet-coral`, `magnet-sage`, `magnet-sand`, `magnet-sky`, `magnet-lilac`): one per person, picked as the person's id modulo five, drawn as the 2px ring around the sender's 32px avatar that pins a slip (36px across, half off the paper's top edge).

### Neutral

- **Enamel** (`enamel`): the page ground.
- **Chrome** (`chrome`): the sidebar, the frame, empty week cells, image placeholders, hover fills.
- **Paper** (`paper`): slips, cards, fields, popovers, the bottom bar.
- **Hairline** (`hairline`): every rule and card border.
- **Field Edge** (`field-edge`): input borders and the neutral feed dot; 3:1 on paper.
- **Ink** (`ink`): text.
- **Muted Ink** (`ink-muted`): details, section headings on Home, ages, labels.
- **Destructive** (`destructive`): the final destructive confirm and invalid fields only.

### Named Rules

**The One Coral Rule.** Coral marks only what you can press or where you are. If it is not a control, the current place or the count of what needs you, it is not coral.

**The Magnets Are People Rule.** A magnet colour stands for a person. It is never a room colour, a category, data or decoration.

**The Warm Ink Rule.** Text is the warm ink, never pure black and never a cold grey.

## Typography

**Display Font:** Atkinson Hyperlegible Next (with ui-sans-serif, system-ui)
**Body Font:** Atkinson Hyperlegible Next
**Label/Mono Font:** Atkinson Hyperlegible Next with tabular figures

**Character:** A plain, open, highly legible sans that reads friendly rather than technical. Hierarchy is size first and a single step of weight; the italic is kept for what someone filled in or wrote by hand.

### Hierarchy

- **Date** (300, clamp 48–64px, 1, -0.02em): the weekday and day at the top of Home. Light, large and calm; one per page.
- **Display** (600, clamp 38–48px): the Home greeting when the home has no rooms yet.
- **Headline** (600, clamp 30–36px, 1.15): page titles.
- **Title** (600, clamp 24–26px, 1.2): section, dialog and sheet titles.
- **Subhead** (600, 20px): card titles.
- **Body** (400, 16px, 1.3 in rows): reading text, row and slip titles, input values. 16px also stops iOS zooming on focus.
- **Hand** (400 italic, 19px): a note's body and a coupon's title in Our Exchange.
- **Small** (14px): details under a title, helpers, captions, Home section headings (600, muted), the slip pill label (600).
- **Meta** (13px, tabular figures): ages ("now", "12m", "3h", "2d"), week labels, bottom-bar labels, birthday dates.

### Named Rules

**The Three Weights Rule.** Only 300, 400 and 600 are loaded. 300 is the date alone; 600 is titles and the one step of emphasis; everything else is 400.

**The Last Day Rule.** In "New this week" a row from the last 24 hours is 600 and anything older is 400. Weight on Home means recency, never decoration.

**The 13px Floor Rule.** No text is set below 13px.

## Layout

A single reading column. Home is 640px wide and centred, 32px from the top on a laptop and 8px under the phone top bar. Phones get a 16px gutter (32px from md), a 56px top bar and a 60px bottom tab bar, both grown by the safe-area insets. From lg the 240px sidebar replaces both bars. Home sections are 32px apart. Slips sit in an auto-fill grid of columns at least 152px wide (two on a phone), 22px between rows and 14px between columns, top-aligned so each slip keeps its own height. Feed rows reserve a 32px leading column (avatar or dot), 10px gaps, and a right column for the coral pill, or an age with an optional 44px photo.

## Elevation & Depth

Mostly flat: surfaces sit on the enamel with hairline borders, and the chrome tint carries the frame. The exception is the fridge itself: a paper slip carries a soft, real two-layer shadow and its magnet a small one, because they are physical things on the door. Otherwise shadows appear only on layers floating over content.

### Shadow Vocabulary

- **Slip** (`box-shadow: 0 1px 2px color-mix(in oklab, ink 10%, transparent), 0 4px 12px color-mix(in oklab, ink 6%, transparent)`): a paper slip on Home.
- **Magnet** (`box-shadow: inset 0 -2px 0 color-mix(in oklab, ink 14%, transparent), 0 2px 3px color-mix(in oklab, ink 18%, transparent)`): the round magnet holding a slip.
- **Toast** (`box-shadow: 0 2px 8px color-mix(in oklab, ink 6%, transparent)`): a hairline card at the bottom edge.
- **Popover list** (`box-shadow: 0 6px 24px color-mix(in oklab, ink 8%, transparent)`): autocomplete and menus over content.
- **FAB** (`box-shadow: 0 8px 20px color-mix(in oklab, coral 28%, transparent)`): the floating add button.

### Named Rules

**The Only Paper Casts a Shadow Rule.** Cards, rows and sections never carry a shadow at rest. A slip may, because it is paper on a door; a layer over content may use one of the floating shadows above.

## Shapes

Soft and consistent. Buttons, chips, nav items and the slip pill are full pills (999px). Fields are 12px, popovers and menus 14px, cards 16px; anything inset in a card, plus week cells, bottom-bar items and thumbnails, is 6px. Slips are paper: 4px corners, tilted a little (-1.2°, 0.9°, -0.4° in turn), straightening and lifting 2px under a pointer. Magnets, feed dots and avatars are circles. Rules are 1px hairlines; today's week cell takes a 1.5px ink outline offset 2px.

## Components

### Buttons

Calm pills that step up 1px under a pointer and press down on click.

- **Shape:** full pill (999px); 44px tall (36px small, 48px large, 44px square icon).
- **Primary:** coral fill, white label, 24px side padding. Hover mixes 14% ink into the coral; a fill darkens, never lightens.
- **Outline / Secondary:** paper fill, field-edge border, ink label.
- **Ghost:** no fill until hover, then the chrome wash.
- **Destructive:** stays outlined until the final confirm, which is the destructive fill.
- **Focus:** a 2px coral outline, offset 2px.

### Inputs / Fields

- **Style:** paper fill, 1px field-edge border, 12px radius, 16px text.
- **Hover:** border deepens to 48% ink.
- **Focus:** coral border plus a 1px coral ring and a 4px 20% coral halo, drawn at once.
- **Error:** destructive border with a 1px destructive ring.

### Navigation

- **Sidebar (lg and up):** 240px on the chrome; the coral wordmark at 28px/600, then Home, every room that is on, Settings and Admin as 44px pills in 74% ink at 16px. Hover adds a 5% ink wash. The current item is coral wash over chrome with deep-coral text.
- **Phone:** a paper bottom bar with a hairline top listing Home and each room; 13px labels in muted ink. The current tab turns coral and its icon sits in a 56×28px coral-wash pill.

### Slip (signature)

Something that needs you, held up by a magnet in the sender's colour. Paper, 4px corners, at least 120px tall, padded 22px 14px 12px, with the slip shadow. Each slip is pinned a little differently: a tilt between -1.8 and 1.8deg, a drop of 0 to 9px and the magnet anywhere from 35% to 65% across, all from a stable hash of the item so it never moves between visits. The pin is the sender's avatar (picture or initials) inside a 2px ring of their magnet colour, 36px across, half off the top edge. Inside: the title (16px, 600; the sender by first name), up to two lines of muted 14px detail (italic when it is what the sender filled in: a citation's offence, a coupon's title; a bouquet shows its flowers; a note says only "Not opened yet"), then a foot with the coral pill (32px, 14px at 600) on the left and the age (13px, muted) on the right. The whole slip is one link to the thing.

### Feed Row

A 60px-minimum row on a hairline: a 32px avatar (or a 10px field-edge dot), the title at 16px weighted by the Last Day Rule with a muted 14px detail that truncates, and on the right an age and an optional 44px photo at 6px radius. Linked rows take the 5% ink hover wash.

### Room objects (pending)

Our History, Our Shelf and Our Exchange alias the shell tokens and the face through their own `--history-*`, `--corner-*` and `--mailbox-*` variables. A note's body and a coupon's title use the italic. Their objects (notes, citations, coupons, stickers, the gallery) were not redesigned in this pass; treat them as inheriting the palette and face, and record their rules after a room pass rather than copying what they do today.

## Do's and Don'ts

### Do:

- **Do** set every piece of text in Atkinson Hyperlegible Next at 300, 400 or 600.
- **Do** keep coral to pressables, the current place and the count of what needs you.
- **Do** give each person their magnet by id modulo five, and use a magnet only to mark that person.
- **Do** set a "New this week" row at 600 when it is under a day old and 400 otherwise.
- **Do** divide lists with 1px hairlines and keep cards flat.
- **Do** make every tap at least 44px and every line of text at least 13px.
- **Do** keep sample content neutral and true for any household: a shared list, a note left on the counter, a birthday.

### Don't:

- **Don't** set any weight above 600 or bring in a second family.
- **Don't** fill a button with the coral wash, or use a magnet colour for a room or a category.
- **Don't** put a shadow on a card, row or section at rest; only slips and floating layers carry one.
- **Don't** use pure black text or a cold grey.
- **Don't** put a small tracked label above a title, or set text in tracked capitals.
- **Don't** list the rooms on Home; the bottom bar and the sidebar do that.
- **Don't** cross out something that is done.

### The face's zero

Atkinson Hyperlegible Next draws zero with a slash, and the shipped file has no plain-zero alternate (its only features are ccmp, frac, locl, pnum and tnum). It is the face's legibility trait, not a bug; it shows most in Home's date and in display numerals.
