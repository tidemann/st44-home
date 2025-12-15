# Diddit - Household Chores Management App

**A multi-tenant, mobile-first application that helps families manage and automate household chores for children.**

## Product Overview

Diddit reduces the need for manual reminders by automatically assigning responsibility, sending notifications, and tracking completion of household tasks. The app supports multiple independent households (multi-tenant), where each household manages its own children, tasks, rules, and settings.

### Key Features

- **Multi-Tenant Architecture**: Multiple households, fully isolated data
- **Smart Task Assignment**: Rule-based automation (weekly rotation, repeating tasks)
- **Push Notifications**: Proactive reminders reduce parent intervention
- **Gamification**: Points and rewards system for motivation
- **Parent Dashboard**: Overview, reporting, and task management
- **Child Interface**: Simple task view and completion

### Core Concepts

**Households (Tenants)**
- Each household is a separate, isolated tenant
- All data (children, tasks, assignments) belongs to one household
- Users can belong to multiple households with different roles

**Roles**
- **Admin**: Manages household, invites users
- **Parent**: Creates tasks, assigns responsibilities, approves completion
- **Child**: Views and completes assigned tasks

**Task Types**
- Weekly rotation (odd/even weeks)
- Repeating tasks (multiple times per week)
- Daily tasks (optional)

**Motivation System**
- Earn points by completing tasks
- Bonus points for completing without reminders
- Rewards tied to point thresholds

---

## Technical Stack

A monorepo containing the frontend (Angular) and backend (Fastify) applications with PostgreSQL database support.

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

**Quick Start:**
```bash
# Start both frontend and backend (opens separate windows)
npm run dev:all

# Or start individually
npm run dev:frontend   # Opens new window for frontend
npm run dev:backend    # Opens new window for backend

# Stop all dev servers
npm run dev:stop
```

**See [DEV_WORKFLOW.md](DEV_WORKFLOW.md) for complete development guide.**

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

# Run E2E tests (requires backend + database running)
cd apps/frontend
npm run test:e2e

# Lint frontend
npm run lint:frontend

# Format check all workspaces
npm run format:check

# Format all workspaces
npm run format
```

**E2E Testing**: See [docs/E2E_TESTING.md](docs/E2E_TESTING.md) for complete E2E testing guide including:
- Setup and installation
- Running tests locally and in CI
- Writing new tests with page objects

**Local E2E Testing Environment**: For running E2E tests locally during development:

```bash
# RECOMMENDED: Full automated test run (starts services, waits, runs tests, stops)
cd apps/frontend
npm run test:e2e:local

# OR use individual scripts for more control:

# Start isolated test environment (PostgreSQL, backend, frontend on different ports)
npm run test:e2e:start

# Wait for services to become healthy
npm run test:e2e:wait

# Run tests (services must be running)
npm run test:e2e

# Stop test environment
npm run test:e2e:stop

# Other useful commands:
npm run test:e2e:restart        # Restart services
npm run test:e2e:logs           # View service logs
npm run test:e2e:reset          # Reset test database to clean state
npm run test:e2e:local:watch    # Start services and open Playwright UI for interactive testing
```

**Test environment ports** (avoid conflicts with dev):
- Frontend: http://localhost:4201
- Backend: http://localhost:3001
- Database: localhost:5433

See `.env.e2e-local` for configuration details.

### Database Schema

**Comprehensive schema documentation**: [docker/postgres/SCHEMA.md](docker/postgres/SCHEMA.md)

The database implements a multi-tenant architecture with full data isolation between households. Key features:
- **ERD Diagram**: Visual representation of all tables and relationships
- **Tables Reference**: Detailed documentation for all 6 tenant-scoped tables
- **Common Queries**: 10+ example queries with index usage
- **Security**: Row-Level Security (RLS) policies for defense-in-depth
- **Performance**: Composite indexes optimized for query patterns
- **Data Dictionary**: Complete column reference

**Quick links**:
- [Entity Relationship Diagram](docker/postgres/SCHEMA.md#entity-relationship-diagram)
- [Common Queries](docker/postgres/SCHEMA.md#common-queries)
- [Security Model](docker/postgres/SCHEMA.md#security)
- [Migration History](docker/postgres/SCHEMA.md#migration-history)
- Debugging and troubleshooting
- Best practices

## CI/CD

The project uses GitHub Actions for CI/CD:

- **CI Workflow** (`.github/workflows/ci.yml`): Runs on PRs and pushes to main
  - Tests, lints, and builds both frontend and backend
  
- **E2E Workflow** (`.github/workflows/e2e.yml`): Optional workflow for E2E testing
  - Manual trigger via Actions tab
  - Scheduled daily at 2 AM UTC
  - Runs Playwright E2E tests with PostgreSQL service
  - See [docs/E2E_TESTING.md](docs/E2E_TESTING.md) for details
  
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
