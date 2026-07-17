# alex-0d18-gatherly

Managed Creator playground.

## Development

Install dependencies:

```bash
npm install
```

Run database migrations against the managed PostgreSQL database:

```bash
export DATABASE_URL=$(cat /workspace/.database_url)
npm run db:migrate
```

Start the API server:

```bash
set -a
. /workspace/.env.production
set +a
npm run dev:api
```

Use `.env.example` as the reference for runtime variables. The API requires database
and object storage configuration at startup. Auth and email configuration are loaded
when the platform-provisioned variables are present, and partial configuration fails
fast.

## Deployment

Build the production assets and API:

```bash
npm run deploy:check
```

Verify a deployment environment before starting the app:

```bash
set -a
. ./.env.production
set +a
npm run env:check
```

Run migrations before booting a new release:

```bash
npm run db:migrate
```

Start the self-hosted server on `0.0.0.0:8080`:

```bash
npm run start --workspace @app/api
```

The Dockerfile builds the shared package, API, and web client, then runs the API
server. At runtime provide the variables from `.env.example`; do not bake secrets
into the image. Database and object storage variables are required for startup.
Set the auth and email variable groups for the complete hosted product flow; if
one variable in either group is present, the full group must be present.
