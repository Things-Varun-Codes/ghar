# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Installed to the phone's home screen as a PWA and used there most of the time. Design phone-first;
the laptop layout is secondary.

## Users

One family or household per install, anywhere in the world, of any size and any mix of ages: parents,
partners, children, grandparents. Not aimed at any one culture. Everyone is invited by an admin; nobody signs up. They open Ghar in small moments of
the day: to add photos from something that just happened, to drop a song onto a list, to leave a
note for someone, to answer a push ("Ravi sent you a citation").

## Product Purpose

A private home on the web for one household: a shared memory of what happened, lists of what the
family wants to get to, and small affectionate exchanges between its members. Success is that the
family keeps coming back to it because it feels like theirs, not like a tool.

## Positioning

Self-hosted and private by construction: photos stay on the family's own disk, there are no
analytics, no outside accounts, no ads and no feed. It is not a social network, a family organiser
or a photo backup. Each "room" is a small self-contained app with its own character inside one
shared house.

## Operating Context

- Rooms installed today: **Our History** (moments with photos and video, as timeline, calendar and
  gallery; reactions, comments, an "on this day" morning push), **Our Shelf** (lists the household
  defines, each with its own icon and its own word for done: loved, watched, visited, read) and
  **Our Exchange** (notes and bouquets to one or more people, coupons to redeem, citations: joke
  traffic tickets with a penalty to pay).
- The admin chooses which rooms a home has; a fresh install starts with none on.
- Web Push, short links written to NFC tags, profile pictures and birthdays.
- Who sees what: moments and lists are shared by everyone; notes, flowers, coupons and citations are
  seen only by sender and recipients, not by admins.

## Capabilities and Constraints

- Laravel + Inertia + React, Tailwind 4, shadcn on Base UI. One household per install.
- New rooms must be addable without touching the shell or other rooms: the shell provides chrome,
  each room owns its own look inside it.
- Runs on small hardware (a Raspberry Pi); fonts are self-hosted, nothing loads from outside.
- Interface is English only.

## Brand Commitments

- Name: **Ghar** (Hindi and Urdu for home), always written in Latin letters. No Devanagari or other
  culture-specific framing in the UI; it must not read as made for one country. Rooms are named "Our …".
- Voice: warm, a little funny, plain. Cute copy is welcome but must never read as AI-written and
  must never assume a couple.
- No visual commitment is binding for the redesign (palette, mark, icon and room objects are all
  open), as of 2026-11-20.

## Evidence on Hand

- Sample household from `DevDataSeeder` (Asha, Ravi, Meera, Kabir) with moments, lists, notes,
  bouquets, coupons and citations. Screenshots in `docs/screenshots/`.
- No real family photos or testimonials to use; do not fabricate any.

## Product Principles

1. It belongs to the family: private, personal, never selling or nudging.
2. Easy before clever: a grandparent or a child should manage every daily action.
3. One house, many rooms: shared chrome stays consistent; character lives in each room.
4. Small moments first: the common action from a phone takes seconds.
5. Things done are treasures, not tasks crossed off.

## Accessibility & Inclusion

Mixed ages in one household: readable text sizes, generous tap targets, reduced-motion respected,
and nothing said only by colour or only in a tooltip.
