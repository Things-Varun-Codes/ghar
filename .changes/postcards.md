---
type: changed
breaking: true
---

Flowers in Our Exchange are now Postcards: describe any picture, have it made and send it with a note. Start from one of the built-in prompts or write your own, and save the prompts you want to use again; saved prompts are yours alone. Bouquets already sent are kept as postcards, without the line that said what each flower meant.

- The picture can come from any image model, not only Cloudflare. If you used AI flower pictures, replace `BOUQUET_IMAGE_PROVIDER`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_WORKERS_AI_TOKEN` and `CLOUDFLARE_AI_IMAGE_MODEL` with `IMAGE_AI_PROVIDER`, `IMAGE_AI_URL`, `IMAGE_AI_KEY` and `IMAGE_AI_MODEL` before you upgrade. For Cloudflare that is `IMAGE_AI_PROVIDER=cloudflare`, `IMAGE_AI_URL=https://api.cloudflare.com/client/v4/accounts/<account id>/ai/run`, your token in `IMAGE_AI_KEY` and `IMAGE_AI_MODEL=@cf/black-forest-labs/flux-1-schnell`. DEPLOY.md lists the rest.
- Until those are set, Postcards is switched off in Admin → Rooms, and the line under the switch says which setting is missing.
- On Home, a waiting postcard no longer says what is in it.
