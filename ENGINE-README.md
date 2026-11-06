# Visual Storyteller Website Engine

Version 1.0 — source package

This is the portable source-code package for the Visual Storyteller website and its Site Studio administration interface.

## What is included

- Public Visual Storyteller website (HTML, CSS and JavaScript)
- Site Studio admin interface
- Cloudflare Worker API
- Cloudflare R2 media storage integration
- Cloudflare D1 project/settings database schema
- Deployment workflows and configuration
- Storybook front-end prototype (in `sites/storybook`)

## Important scope notes

This is a working website codebase and reusable starting point, not yet a fully generic multi-tenant website builder. The Visual Storyteller site still contains brand-specific copy, logo, sample portfolio imagery and deployment settings. The Storybook folder is a separate front-end prototype.

The quote builder is an estimate interface; it does not submit enquiries or create bookings. The Storybook backend is not connected. Replace stock photography and verify contact details before public commercial launch.

## Requirements

- Windows 10/11, macOS or Linux
- Node.js 22 LTS
- Git (recommended)
- A code editor such as Visual Studio Code
- Cloudflare account only if deploying the live Worker / Pages site

## Local preview

The public front end is static. Open `sites/visual-storyteller/index.html` in a browser for a basic preview, or serve the folder with a local static server for more reliable routing and fetch behaviour.

For the Worker:

```bash
cd sites/visual-storyteller/worker
npm install
npx wrangler dev
```

Cloudflare bindings and secrets must be configured before the API will work locally or in production. Never put API tokens, ADMIN_TOKEN values, or customer data in this source package.

## Deployment

Cloudflare Pages output directory: `sites/visual-storyteller`.

Worker directory: `sites/visual-storyteller/worker`.

Read `sites/visual-storyteller/worker/SETUP.md` before deploying. The checked-in Wrangler file contains the current project resource identifiers; review these before reusing the engine for another site.

## Portability

The source package contains code and small project assets. It deliberately excludes uploaded client media, R2 contents, database contents, credentials, local dependencies, and build caches. Those are separate data and infrastructure backups.

## Suggested next step

To turn this into a truly reusable starter for multiple brands, extract shared components and move all brand-specific text, colours, logos, pricing and service configuration into a per-site configuration layer. Do that as a separate, tested phase so the current live site is not disrupted.
