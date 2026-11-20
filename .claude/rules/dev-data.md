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
(past the 50-row page; Songs is the per-person list: "Kitchen Radio" is loved by Asha, Meera and Kabir,
"Sunday Morning Chai" by Ravi and Meera, the rest by one person each), Corner lists as an upgraded install has them (Songs, Movies, Places and
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
birthday is today, Asha's and Ravi's are set, Kabir has none and morning memories off. Two moments
fall on today's date in earlier years: Meera's "Chai on the new balcony" (a year ago, id 26) and
Ravi's "Birthday picnic in Cubbon Park" (four years ago, id 27, linked to Meera's birthday). Ravi's
"Monsoon drive to the coast" (id 5, `/apps/our-history?moment=5`) holds the conversation:
comments 1 (Meera), 2 (Kabir) and 3 (Ravi), and reactions ❤️ and 😂 from Meera, ❤️ and 🎉 from Asha.
The seed's "today" is the household's (`Region::today()`). Row ids are stable after a reset. Ravi and
Meera have synthetic push subscriptions that can't deliver; test real push by subscribing a browser.
