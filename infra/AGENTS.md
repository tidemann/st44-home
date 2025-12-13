# Infrastructure - Agent Context

## Overview

Docker Compose-based infrastructure for development and production deployment. Orchestrates PostgreSQL database, Fastify backend, and Angular frontend with Nginx reverse proxy. Supports both local development (individual services) and full containerized deployment.

## Architecture

```
┌─────────────────────┐
│  Nginx (Port 80)    │  Frontend container
│  - Serves Angular   │  - Production build
│  - Reverse proxy    │  - Static file serving
└──────────┬──────────┘
           │ HTTP
           ├─→ / (frontend)
           ├─→ /api/* (proxy to backend)
           └─→ /health (proxy to backend)
           ↓
┌─────────────────────┐
│ Backend (Port 3000) │  Fastify API container
│  - REST API         │  - Node.js runtime
│  - Business logic   │  - TypeScript compiled
└──────────┬──────────┘
           │ PostgreSQL Protocol
           ↓
┌─────────────────────┐
│ Database (Port 5432)│  PostgreSQL container
│  - PostgreSQL 17    │  - Persistent volume
│  - Initialized DB   │  - Health checks
└─────────────────────┘
```

## Docker Compose Services

### Database (`db`)
**Image**: Custom (`docker/postgres/Dockerfile`)
**Purpose**: PostgreSQL 17 database with initialization script
**Configuration**:
```yaml
environment:
  POSTGRES_DB: st44
  POSTGRES_USER: postgres
  POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
ports:
  - "5432:5432"
volumes:
  - postgres_data:/var/lib/postgresql/data
healthcheck:
  test: pg_isready -U postgres
  interval: 10s
  timeout: 5s
  retries: 5
```

**Initialization**: `docker/postgres/init.sql` runs on first start
**Data Persistence**: `postgres_data` Docker volume

### Backend (`backend`)
**Image**: Custom (`apps/backend/Dockerfile`)
**Purpose**: Fastify API server
**Configuration**:
```yaml
environment:
  PORT: 3000
  HOST: 0.0.0.0
  DB_HOST: db  # Docker service name
  DB_PORT: 5432
  DB_NAME: st44
  DB_USER: postgres
  DB_PASSWORD: ${DB_PASSWORD:-postgres}
  CORS_ORIGIN: ${CORS_ORIGIN:-*}
ports:
  - "3000:3000"
depends_on:
  db:
    condition: service_healthy
```

**Build**: TypeScript → JavaScript, runs with Node.js
**Network**: Can access database via `db` hostname (Docker network)

### Frontend (`frontend`)
**Image**: Custom (`infra/nginx/Dockerfile.frontend`)
**Purpose**: Nginx serving Angular production build + reverse proxy
**Configuration**:
```yaml
ports:
  - "80:80"
depends_on:
  - backend
```

**Build**: Angular production build → Nginx static files
**Reverse Proxy**: Configured in `nginx/nginx.conf`

## Nginx Configuration

### Location Blocks

**Frontend** (`location /`):
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```
- Serves Angular static files from `/usr/share/nginx/html`
- Falls back to `index.html` for client-side routing

**API Proxy** (`location /api/`):
```nginx
location /api/ {
  proxy_pass http://backend:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection 'upgrade';
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_cache_bypass $http_upgrade;
}
```
- Proxies `/api/*` to `backend:3000`
- Preserves client information in headers
- Supports WebSocket upgrades

**Health Check Proxy** (`location /health`):
```nginx
location /health {
  proxy_pass http://backend:3000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  # ... (same headers as /api/)
}
```
- Proxies `/health` to backend health endpoint

## Development Modes

### Mode 1: Local Development (Recommended)
Run services separately for fastest iteration:

```bash
# Terminal 1: Database only
cd infra && docker compose up -d db

# Terminal 2: Backend (watch mode)
cd apps/backend
npm run dev

# Terminal 3: Frontend (with proxy)
cd apps/frontend
npm start
```

**Access**:
- Frontend: http://localhost:4200
- Backend: http://localhost:3000
- Database: localhost:5432

**API Routing**: `apps/frontend/proxy.conf.json` proxies to `localhost:3000`

### Mode 2: Full Docker Stack
Run all services in containers:

```bash
npm run docker:up
```

**Access**:
- Frontend: http://localhost:80
- Backend: http://localhost:3000 (also available)
- Database: localhost:5432 (also available)

**API Routing**: Nginx proxies to `backend:3000` container

### Mode 3: Hybrid (Database only)
Useful for backend/frontend dev without DB management:

```bash
cd infra && docker compose up -d db
# Then run backend and frontend locally
```

## Docker Commands

### Start Services
```bash
docker compose up -d              # All services in background
docker compose up -d db           # Database only
docker compose up frontend        # Frontend with logs
```

### Stop Services
```bash
docker compose down               # Stop all services
docker compose down -v            # Stop and remove volumes (data loss!)
docker compose stop backend       # Stop specific service
```

### View Logs
```bash
docker compose logs               # All services
docker compose logs -f backend    # Follow backend logs
docker compose logs --tail=100 db # Last 100 lines from database
```

### Restart Services
```bash
docker compose restart            # Restart all
docker compose restart backend    # Restart specific service
```

### Rebuild Images
```bash
docker compose build              # Rebuild all images
docker compose build --no-cache   # Clean rebuild
docker compose up -d --build      # Rebuild and start
```

## Persistent Data

### PostgreSQL Data
**Volume**: `postgres_data`
**Location**: Docker managed volume
**Preservation**: Data persists across container restarts

**To reset database**:
```bash
docker compose down -v            # Remove volumes
docker compose up -d db           # Recreate with init.sql
```

**To backup**:
```bash
docker exec st44-db pg_dump -U postgres st44 > backup.sql
```

**To restore**:
```bash
docker exec -i st44-db psql -U postgres st44 < backup.sql
```

## Environment Variables

### Docker Compose (`.env` file or shell)
```bash
DB_PASSWORD=secure_password
CORS_ORIGIN=https://example.com
GITHUB_REPOSITORY_OWNER=username
GITHUB_REPOSITORY_NAME=repo-name
```

### Service-Specific
See individual service sections above and:
- `apps/backend/AGENTS.md` - Backend env vars
- `apps/frontend/AGENTS.md` - Frontend env config

## Health Checks

### Database Health
```bash
docker exec st44-db pg_isready -U postgres
```
Or: http://localhost:3000/health (checks DB connection)

### Backend Health
```bash
curl http://localhost:3000/health
```

### Frontend Health
```bash
curl http://localhost:80/
# Should return index.html
```

## Adding a New Service

### 1. Create Dockerfile
```dockerfile
# docker/newservice/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
CMD ["node", "index.js"]
```

### 2. Add to Docker Compose
```yaml
newservice:
  build:
    context: ../docker/newservice
    dockerfile: Dockerfile
  container_name: st44-newservice
  restart: unless-stopped
  environment:
    VAR: value
  ports:
    - "PORT:PORT"
  depends_on:
    - db
```

### 3. Update Nginx (if public-facing)
```nginx
location /newservice/ {
  proxy_pass http://newservice:PORT;
  # ... proxy headers
}
```

## Production Deployment Considerations

### Security
- [ ] Change default passwords (DB_PASSWORD)
- [ ] Restrict CORS_ORIGIN to actual domain
- [ ] Use secrets management (not .env files)
- [ ] Enable HTTPS (add SSL certificates to Nginx)
- [ ] Firewall rules (only expose port 80/443)
- [ ] Regular security updates

### Performance
- [ ] Nginx caching for static files
- [ ] Database connection pooling (already configured)
- [ ] CDN for static assets
- [ ] Nginx compression (gzip)
- [ ] Database indexes

### Monitoring
- [ ] Container health checks (already configured for DB)
- [ ] Application logs (use Docker logging driver)
- [ ] Database metrics
- [ ] Nginx access/error logs
- [ ] Uptime monitoring

### Scaling
- [ ] Multiple backend instances (load balancer)
- [ ] Database replication (read replicas)
- [ ] Redis for caching
- [ ] Message queue for async tasks

## Troubleshooting

### Cannot connect to database from backend
**Check**:
1. Database is healthy: `docker compose ps`
2. Network connectivity: `docker exec st44-backend ping db`
3. Credentials match in both services
4. Database finished initializing (check logs)

**Solution**: Ensure `depends_on` with `service_healthy` is set

### Frontend shows 502 Bad Gateway
**Check**:
1. Backend is running: `docker compose ps backend`
2. Backend logs: `docker compose logs backend`
3. Nginx config syntax: `docker exec st44-frontend nginx -t`

**Solution**: Usually backend not ready or crashed

### Changes not reflected in container
**Issue**: Old image cached

**Solution**:
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Port already in use
**Issue**: Another service using port 80, 3000, or 5432

**Solution**:
```bash
# Find process
lsof -i :PORT  # Mac/Linux
netstat -ano | findstr :PORT  # Windows

# Kill process or change port in docker-compose.yml
```

### Database won't start (volume issue)
**Issue**: Corrupted volume or wrong permissions

**Solution**:
```bash
docker compose down -v
docker volume rm st44_postgres_data
docker compose up -d db
```

## Files Structure

```
infra/
├── docker-compose.yml          # Service orchestration
├── docker-compose.override.yml.example  # Local overrides template
└── nginx/
    ├── Dockerfile.frontend     # Frontend container image
    └── nginx.conf              # Nginx configuration

docker/
└── postgres/
    ├── Dockerfile              # Database container image
    └── init.sql                # Database initialization
```

## Common Workflows

### Fresh Start
```bash
docker compose down -v
docker compose up -d --build
```

### View All Logs
```bash
docker compose logs -f
```

### Enter Container Shell
```bash
docker exec -it st44-backend sh
docker exec -it st44-db psql -U postgres st44
```

### Check Container Status
```bash
docker compose ps
docker compose top
```

## Related Files

- `../docker/postgres/init.sql` - Database schema
- `../apps/backend/Dockerfile` - Backend image
- `../apps/frontend/proxy.conf.json` - Dev proxy config
- `../README.md` - Project setup instructions

---

**Last Updated**: 2025-12-13
**Update This File**: When adding services, changing ports, or updating deployment configuration
