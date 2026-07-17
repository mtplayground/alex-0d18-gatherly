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
export DATABASE_URL=$(cat /workspace/.database_url)
npm run dev:api
```
