# Development Workflow Guide

## Starting Development Servers

### Quick Start
```bash
# From project root
npm run dev:all      # Start both backend and frontend in separate windows
```

### Individual Servers
```bash
# Start backend only (opens new PowerShell window)
npm run dev:backend

# Start frontend only (opens new PowerShell window)
npm run dev:frontend
```

### Stopping Servers
```bash
# Stop all node processes (both backend and frontend)
npm run dev:stop
```

## How It Works

**Default Terminal**: This project uses **Git Bash 5.2.37** as the default terminal in VS Code.

The `npm run dev:*` scripts use PowerShell's `Start-Process` to launch dev servers in **separate, detached PowerShell windows**. This means:

✅ **Your working terminal stays free** for running commands  
✅ **Server output visible** in separate windows  
✅ **Easy to manage** - close window to stop server or use `npm run dev:stop`  
✅ **Agent-friendly** - agents can test endpoints without terminal conflicts  

## For AI Agents

**CRITICAL**: When testing endpoints or the application:

### ✅ DO THIS
```bash
# Start servers detached
npm run dev:backend

# Wait for startup
Start-Sleep -Seconds 3

# Now run your tests in the same terminal
curl http://localhost:3000/api/...
```

### ❌ NEVER DO THIS
```bash
# WRONG - blocks your terminal
cd apps/backend && npm run dev

# WRONG - can't run test commands after this
npm start
```

## Database

```bash
# Start PostgreSQL in Docker
cd infra && docker compose up -d db

# Stop database
cd infra && docker compose down db
```

## Full Docker Stack

```bash
# Start everything (frontend, backend, database, nginx)
npm run docker:up

# View logs
npm run docker:logs

# Stop everything
npm run docker:down
```

## Testing Workflow

1. **Start database** (if not running):
   ```bash
   cd infra && docker compose up -d db
   ```

2. **Start dev servers** (detached):
   ```bash
   npm run dev:all
   ```

3. **Wait for startup** (3-5 seconds):
   ```bash
   Start-Sleep -Seconds 3
   ```

4. **Run your tests** (terminal is free):
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:4200
   ```

5. **Stop servers when done**:
   ```bash
   npm run dev:stop
   ```

## Troubleshooting

### Port Already in Use
```bash
# Stop all node processes
npm run dev:stop

# Or manually find and kill
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```

### Server Not Starting
Check the detached PowerShell window that opened - server errors will be visible there.

### Can't Connect to Server
1. Verify server is running: `Test-NetConnection -ComputerName localhost -Port 3000`
2. Check if port is listening: `Get-NetTCPConnection -LocalPort 3000`
3. Review server logs in the detached window

## Access URLs

- **Frontend (dev)**: http://localhost:4200
- **Backend (dev)**: http://localhost:3000
- **Backend health**: http://localhost:3000/health
- **Frontend (Docker)**: http://localhost:8080
- **Backend (Docker)**: http://localhost:8080/api (proxied by nginx)
- **Database**: localhost:5432

## Environment Files

### Backend
No `.env` file needed - uses defaults:
- `DB_HOST=localhost`
- `DB_PORT=5432`
- `DB_NAME=st44`
- `DB_USER=postgres`
- `DB_PASSWORD=postgres`
- `PORT=3000`
- `HOST=0.0.0.0`
- `CORS_ORIGIN=*`

### Frontend
Uses environment files in `apps/frontend/src/environments/`:
- `environment.development.ts` - Dev config (proxy)
- `environment.ts` - Prod config (relative URLs)

## Git Workflow

**CRITICAL**: Always work on feature branches!

```bash
# Create feature branch
git checkout -b feature/descriptive-name

# Make changes, commit
git add -A
git commit -m "feat: description"

# Push and create PR
git push -u origin feature/descriptive-name
gh pr create --title "..." --body "..." --base main

# After PR merged
git checkout main
git pull
```

**NEVER commit directly to main!**

## Formatting Code

**Format BEFORE every commit**:

```bash
# Format both frontend and backend
cd apps/frontend && npm run format && cd ../backend && npm run format

# Or from root (if working on both)
cd c:\code\st44\home
cd apps/frontend && npm run format
cd ../backend && npm run format
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run dev:backend` | Start backend in new window |
| `npm run dev:frontend` | Start frontend in new window |
| `npm run dev:all` | Start both in new windows |
| `npm run dev:stop` | Stop all dev servers |
| `npm run docker:up` | Start full Docker stack |
| `npm run docker:down` | Stop Docker stack |
| `cd infra && docker compose up -d db` | Start database only |

---

**Last Updated**: 2025-12-13
