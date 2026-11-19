---
paths:
    - 'database/seeders/**'
    - 'database/factories/**'
    - 'scripts/smoke.mjs'
    - 'scripts/loadmore-smoke.mjs'
    - 'scripts/smoke-mcp.mjs'
    - 'scripts/lib/**'
---

## The seeded household

The seed has every state: moments by all four people (photos on the local media disk, Corner links, more
than one Timeline and Gallery page), Corner items done and not done by different people, 62 Songs
(past the 50-row page), Corner lists as an upgraded install has them (Songs, Movies, Places and
Activities: no maker, old ids in `legacy_id`, so `/apps/our-shelf/songs/1` and the old-style pills
on "Diwali on the terrace" resolve) plus Ravi's Books (only his items: he may delete it), Meera's
long-named restaurants list (Kabir added to it: she may edit it, only an admin may delete it),
Kabir's empty Board games with notifications off, and Meera's Weekend ideas (an icon from the full
set). Between them the items cover a name alone, notes, links with and without pictures, a pasted
picture, coordinates only, a map link only, a typed place, and link, picture and place together;
pictures are https addresses primed into the picture cache, single and multi-recipient notes and flowers read and unread, coupons
issued/requested/part-fulfilled/depleted/expired, citations issued/paid, short links `pantry23`,
`garage23` and the disabled `bench789`, and a pending invite at
`/invitations/dev-invite-token-for-local-testing-only`. Ravi and Meera have profile pictures (drawn into `dev-seed/`), Asha and Kabir show initials; Meera's
birthday is today, Asha's and Ravi's are set, Kabir has none and morning memories off. Row ids are stable after a reset. Ravi and
Meera have synthetic push subscriptions that can't deliver; test real push by subscribing a browser.
