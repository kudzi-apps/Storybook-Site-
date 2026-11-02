# Visual Storyteller

Premium editorial studio website prototype for Harare, Zimbabwe.

## Preview
Static front end. Quote builder is an interactive estimate only; it does not submit enquiries or book dates. Contact links are provisional pending confirmation.

## Deployment
Cloudflare Pages: framework preset **None**, build command empty, output directory `sites/visual-storyteller` from the monorepo root.

## Temporary assets
Portfolio images are stock placeholders and must be replaced with Visual Storyteller-owned work and the approved logo before public launch.

## Security notes
The Pages `_headers` file applies a restrictive Content Security Policy and browser security headers. This is a static portfolio: quote estimates are client-side only, no enquiry or booking data is submitted to a server, and no customer account or admin system is present in this site. Do not add secrets or private customer information to frontend files.

