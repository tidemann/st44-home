# ST44 Home

A monorepo containing the frontend (Angular) and backend (Fastify) applications for ST44 Home, with PostgreSQL database support.

## Project Structure

```
/
├─ apps/
│  ├─ frontend/            # Angular app
│  └─ backend/             # Fastify API
│
├─ docker/
│  └─ postgres/
│     └─ init.sql          # Database initialization
│
├─ infra/
│  ├─ nginx/
│  │  ├─ Dockerfile.frontend
│  │  └─ nginx.conf
│  ├─ docker-compose.yml
│  └─ .env.example
│
├─ .github/
│  └─ workflows/
│     ├─ ci.yml            # CI workflow
│     └─ deploy.yml        # Deployment workflow
│
├─ package.json            # Workspace root
└─ README.md
```

## Getting Started

### Prerequisites

- Node.js 24+
- npm 11.6.2+
- Docker & Docker Compose

### Installation

```bash
# Install all dependencies
npm install

# Copy environment file
cp infra/.env.example infra/.env
```

### Development

Run services individually:

```bash
# Frontend (Angular)
npm run dev:frontend

# Backend (Fastify)
npm run dev:backend
```

Or use Docker Compose for full stack:

```bash
# Start all services (frontend, backend, database)
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

Access the services:
- Frontend: http://localhost
- Backend API: http://localhost:3000
- Database: localhost:5432

### Building

```bash
# Build frontend
npm run build:frontend

# Build backend
npm run build:backend
```

### Testing & Linting

```bash
# Run frontend tests
npm run test:frontend

# Lint frontend
npm run lint:frontend

# Format check all workspaces
npm run format:check

# Format all workspaces
npm run format
```

## CI/CD

The project uses GitHub Actions for CI/CD:

- **CI Workflow** (`.github/workflows/ci.yml`): Runs on PRs and pushes to main
  - Tests, lints, and builds both frontend and backend
  
- **Deploy Workflow** (`.github/workflows/deploy.yml`): Runs on pushes to main
  - Builds Docker images for frontend and backend
  - Pushes images to GitHub Container Registry
  - Deploys to server via SSH
  - Purges Cloudflare cache

## Docker

The application is containerized with three services:

- **frontend**: Angular app served by Nginx
- **backend**: Fastify API server
- **db**: PostgreSQL database

See [infra/docker-compose.yml](infra/docker-compose.yml) for configuration.

## Environment Variables

See [infra/.env.example](infra/.env.example) for required environment variables.

## License

Private repository for ST44 Home projects.
