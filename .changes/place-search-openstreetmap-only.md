---
type: changed
---

A moment's Location field always searches OpenStreetMap, and Ghar no longer uses Google Maps, so `GOOGLE_MAPS_API_KEY` does nothing and can be removed.

- Places picked through Google before this keep their name, address and coordinates.
- Google's terms don't let a place found through Google be stored for good or shown on another map, which a family history and the coming map view both need.
