# Portable backup and restore guide

## Keep three copies

1. **PC working copy:** keep the extracted project folder somewhere predictable, e.g. `Documents/Visual-Storyteller-Engine`.
2. **Google Drive backup:** copy or sync the complete project folder to a dedicated Drive folder.
3. **GitHub source copy:** use the repository for version history and controlled updates.

Do not treat Google Drive sync as the only backup. Keep at least one dated ZIP snapshot as well.

## What this ZIP does and does not contain

Included: source files, setup notes, database migration SQL, Cloudflare Worker code, deployment workflows and the small logo / terms assets stored in the repository.

Not included: customer photographs/videos uploaded to Cloudflare R2, live D1 database records, API tokens, admin secrets, Cloudflare account credentials, Node modules or browser caches.

A source-code ZIP is not a complete backup of the running service. Back up R2 and D1 separately if you need to preserve client media and live project records.

## Restore on a PC

1. Extract the ZIP.
2. Install Node.js 22 LTS.
3. Open the extracted folder in Visual Studio Code.
4. Read `ENGINE-README.md` and `sites/visual-storyteller/worker/SETUP.md`.
5. For a static preview, serve `sites/visual-storyteller` with a local static server.
6. For local Worker development, open a terminal in `sites/visual-storyteller/worker`, run `npm install`, then `npx wrangler dev` after configuring the required Cloudflare bindings and secrets.

## Google Drive

Upload the extracted folder or the ZIP to Google Drive. For day-to-day work, sync the folder with Drive for desktop if available. Keep a dated ZIP before major changes.

## Security

Never store `.env` files containing secrets, Cloudflare API tokens, ADMIN_TOKEN values, passwords or private client media in a shared/public repository or ordinary source ZIP. Store secrets in Cloudflare/GitHub secret settings and keep a separate secure offline credential record.
