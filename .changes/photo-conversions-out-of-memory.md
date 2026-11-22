---
type: fixed
---

On an install that didn't set `QUEUE_CONNECTION`, a large photo could run out of memory while its sizes were made, and upgrading to 1.4.0 could stop partway: Settings → Appearance then said "Couldn't update that" for every choice.

- Photo sizes are now always made in the background, where large photos have the memory they need. Restarting after the upgrade finishes the update.
