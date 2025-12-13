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
