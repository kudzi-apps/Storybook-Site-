# Visual Storyteller media API

This Worker is the private API between Site Studio, R2 and D1. It is not live until deployed and configured in the Cloudflare account.

## Cloudflare resources

- R2 bucket: `visual-storyteller-media` (Standard; keep public development URL disabled).
- D1 database: `visual-storyteller-db`.
- Worker: `visual-storyteller-media-api`.

## Deploy preparation

1. In Cloudflare, create a D1 database named `visual-storyteller-db`.
2. Copy its database ID into `wrangler.toml` in place of `REPLACE_WITH_D1_DATABASE_ID`.
3. Confirm the R2 bucket name in `wrangler.toml`.
4. From this directory, run `npx wrangler d1 migrations apply visual-storyteller-db --remote`.
5. Set a long, random admin secret with `npx wrangler secret put ADMIN_TOKEN`. Do not put the value in source code, GitHub, browser JavaScript or ChatGPT.
6. Deploy with `npx wrangler deploy`.
7. Add the deployed Worker URL to the Studio configuration only after the deployment URL is known.

## Current API

All media endpoints require `Authorization: Bearer <ADMIN_TOKEN>`.

- `GET /api/health` — service/binding status; no secret required.
- `GET /api/media` — list stored objects.
- `POST /api/media` JSON `{ "filename": "photo.jpg", "folder": "originals" }` — allocate a unique object key.
- `PUT /api/media/{key}` — upload raw file bytes; private by default; maximum 100 MB per request.
- `GET /api/media/{key}` — retrieve a private object through the authenticated API.
- `DELETE /api/media/{key}` — delete an object.

## Security and limitations

- R2 remains private. Do not enable the bucket's public development URL.
- CORS is restricted by `ALLOWED_ORIGINS`; update it only with the exact production/admin origins.
- The first upload implementation has a 100 MB request limit. Larger video masters need multipart upload support before they are enabled in the dashboard.
- The Worker currently provides the storage API foundation. D1 project CRUD, login/session handling, upload UI, public published-media delivery and revision publishing are subsequent implementation steps; the dashboard must not be treated as production-ready until those are implemented and tested.

## Cloudflare Git deployment

The Cloudflare Worker Git integration should use this directory as its root: `sites/visual-storyteller/worker`.

- Build command: leave blank.
- Deploy command: `npm run deploy`.
- Production branch: `main`.

The deploy script applies the remote D1 migrations before deploying the Worker. Configure the `ADMIN_TOKEN` Worker secret separately in Cloudflare before using authenticated Studio features.
