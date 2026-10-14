# TypeScript and Next.js over Django

Showtakes is built as a single TypeScript application on Next.js with PostgreSQL, even though the developer's stronger background is Python and Django. Django would have supplied accounts, permissions, migrations, and an admin interface out of the box, but the site's success depends on an interface that is fun and engaging to use, and we judged that Django's templating would constrain discovering that interface more than building those pieces ourselves would cost.

## Consequences

- Admin screens, roles, and permissions are built by hand; there is no generated admin interface.
- Authentication comes from a self-hosted library that keeps Members in our own database. Third-party sign-in (Google, Apple) and hosted identity services are deliberately not used.
- The application is kept to standard Next.js features so that it can move off its first host without a rewrite.
