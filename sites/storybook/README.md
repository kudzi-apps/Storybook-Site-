# Storybook

Responsive guest-facing wedding experience prototype. Built as a static front end with no live RSVP, payment, notification, or organiser backend connected yet.

## Local preview
Open `index.html` in a local static server, or deploy this directory as the Cloudflare Pages root.

## Deployment
Cloudflare Pages: framework preset **None**, build command empty, output directory `sites/storybook` when deploying from the monorepo root. For a dedicated project rooted at this directory, use `.` as output directory.

## Planned data integration
The current sample content is local demo data. Future organiser and studio dashboards will connect to shared event, guest, RSVP, role, programme, gallery, and access-pass records. Do not treat preview submissions or sample gatepasses as live records.
