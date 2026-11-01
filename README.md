# Visual Storyteller + Storybook

Two independently deployable static front ends in one Git repository:

- `sites/visual-storyteller` — studio website and interactive quote estimate.
- `sites/storybook` — guest-facing wedding experience prototype.

Both are designed to deploy independently on Cloudflare Pages by setting the respective output directory. They currently use local sample data and stock photography. No live booking, RSVP, payment, notification, or organiser dashboard backend is connected yet.

The existing root-level preview is retained while the new site builds are developed in `sites/`.
