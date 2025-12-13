# Backend API

Fastify-based REST API for the ST44 application.

## Development

```bash
npm install
npm run dev
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_NAME` - Database name (default: st44)
- `DB_USER` - Database user (default: postgres)
- `DB_PASSWORD` - Database password (default: postgres)
- `CORS_ORIGIN` - CORS origin (default: \*)
- `JWT_SECRET` - JWT signing secret (default: dev-secret-change-in-production)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (required for Google Sign-In)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret (optional, not used in current implementation)
