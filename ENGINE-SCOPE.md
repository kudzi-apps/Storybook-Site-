# Engine scope and known limitations

This first portable release captures the existing Visual Storyteller implementation without changing the live site.

## Present

- Responsive public studio site
- Interactive quote estimate UI
- Projects / media / settings / publishing admin interface
- Cloudflare Worker API
- R2 media object storage integration
- D1 project and settings schema
- GitHub Actions deployment workflows
- Separate Storybook front-end prototype

## Not yet implemented / not to be assumed

- Real quote enquiry submission or booking calendar
- Payment processing
- Connected Storybook RSVP / organiser dashboard backend
- Multi-tenant client/site management
- Automated provisioning of a new Cloudflare account, R2 bucket and D1 database
- A complete backup/restore of production media and database records
- Security hardening of public/private media visibility beyond the existing implementation

## Reuse rule

For a new brand, create a separate deployment and replace site-specific assets, copy, service/pricing data, API origins, Cloudflare resource identifiers and allowed origins. Do not reuse production credentials or customer records. Test the new site independently before launch.
