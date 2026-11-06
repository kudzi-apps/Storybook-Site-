# Visual Storyteller Website Engine

Portable source code for the Visual Storyteller studio website, Site Studio admin interface, Cloudflare Worker API and the separate Storybook front-end prototype.

## Start here

- [Engine overview and setup](ENGINE-README.md)
- [Portable PC / Google Drive backup guide](PORTABLE-BACKUP-GUIDE.md)
- [Current features and limitations](ENGINE-SCOPE.md)

## Project structure

- `sites/visual-storyteller` — public studio website, quote estimate interface, Site Studio admin and Cloudflare Worker.
- `sites/storybook` — separate guest-facing wedding experience prototype.
- `.github/workflows` — deployment workflows.

## Important limitations

This is a portable snapshot of the current codebase, not yet a generic multi-tenant website builder. The quote builder is an estimate only; it does not submit enquiries or book dates. Storybook is a front-end prototype and its RSVP / organiser backend is not connected. Portfolio images include stock placeholders that must be replaced before public commercial launch.

Live customer media in R2, D1 database records, secrets and Cloudflare credentials are not included in the source package. See the backup guide before relying on this ZIP as a full production backup.
