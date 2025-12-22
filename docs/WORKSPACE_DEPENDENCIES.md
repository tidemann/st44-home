# Workspace Dependencies Guide

## Overview

This project uses npm workspaces to manage shared packages. When adding dependencies between workspaces (e.g., frontend/backend depending on shared packages), specific steps are required to ensure both local development and Docker builds work correctly.

## Critical Requirements

### .dockerignore File (MANDATORY)

**The project MUST have a `.dockerignore` file at the repository root** to prevent copying `node_modules/` from the host machine into Docker builds. This is critical because:

1. **Platform-specific native bindings**: Packages like `lightningcss`, `esbuild`, and other tools with native code have different binaries for each platform (Windows, macOS, Linux)
2. **Alpine Linux uses musl**: Our Docker images use `node:24-alpine` which requires `musl` bindings, not `glibc`
3. **Lock file mismatch**: Installing from a lock file generated on Windows/macOS will download wrong binaries if node_modules is copied

**Without `.dockerignore`**:
```bash
# Host machine (Windows/macOS)
node_modules/lightningcss/lightningcss.win32-x64-msvc.node

# Docker COPY copies this ↑
# Docker container tries to use Windows binary on Linux → ERROR!
Error: Cannot find module '../lightningcss.linux-x64-musl.node'
```

**With `.dockerignore`**:
```bash
# node_modules/ is excluded from Docker build context
# npm ci runs fresh in container → downloads correct Linux musl binaries ✅
```

**Required `.dockerignore` contents**:
```gitignore
node_modules/
**/node_modules/
dist/
**/dist/
```

### package-lock.json and Platform-Specific Binaries (CRITICAL)

**CRITICAL ISSUE**: Using `npm ci` with a `package-lock.json` generated on Windows/macOS can cause native binding failures in Alpine Linux Docker containers, even with `.dockerignore` configured correctly.

**Problem**: The lock file contains metadata about optional platform-specific dependencies that npm tries to honor, leading to incorrect binary downloads for nested workspace node_modules.

**Solution**: Use `npm install` instead of `npm ci` in Docker builds:

```dockerfile
# Copy workspace root package files
COPY package*.json ./

# Copy shared types package
COPY packages/types ./packages/types

# Copy frontend package files
COPY apps/frontend/package*.json ./apps/frontend/

# Delete package-lock.json to force fresh install with correct platform binaries
RUN rm -f package-lock.json

# Install dependencies fresh (without lock file constraints)
RUN npm install
```

**Why This Works**:
- Removes lock file constraints that may reference wrong platform binaries
- Forces npm to resolve dependencies fresh in Alpine Linux environment
- Downloads correct `lightningcss.linux-x64-musl.node` and other musl binaries
- npm detects the platform automatically and installs correct optional dependencies

**Trade-offs**:
- ✅ Correct platform binaries guaranteed
- ✅ No native module errors
- ❌ Slower builds (no lock file caching)
- ❌ Non-deterministic versions (minor/patch updates possible)
- ❌ Build reproducibility reduced

**When to Use**:
- **Docker builds**: Always use `npm install` without lock file
- **Local development**: Use `npm install` or `npm ci` with lock file (platform matches)
- **CI/CD tests**: Use `npm ci` with lock file (faster, reproducible)

**Alternative** (if you need reproducible builds):
```dockerfile
# Keep lock file but force platform detection
RUN npm ci --force
RUN npm rebuild --workspace=apps/frontend
```
This is slower and may still have issues, so `npm install` is recommended.

## Current Workspace Structure

```
home/
├── package.json (workspace root)
├── package-lock.json (workspace lockfile)
├── packages/
│   └── types/ (shared TypeScript schemas)
├── apps/
│   ├── frontend/ (Angular app)
│   └── backend/ (Fastify API)
```

## Adding a Workspace Dependency

### Step 1: Add Dependency to package.json

**Frontend Example:**
```json
{
  "dependencies": {
    "@st44/types": "workspace:*"
  }
}
```

**Backend Example:**
```json
{
  "dependencies": {
    "@st44/types": "file:../../packages/types"
  }
}
```

### Step 2: Install Dependencies

```bash
# From project root
npm install

# This updates package-lock.json with workspace links
```

### Step 3: Update Dockerfile (CRITICAL!)

When adding a new workspace dependency, **you MUST update the Dockerfile** to:
1. Copy workspace root `package.json` and `package-lock.json`
2. Copy the shared package folder
3. Install dependencies at workspace root
4. Build shared package before building the app

**Frontend Dockerfile Pattern:**
```dockerfile
FROM node:24-alpine AS build
WORKDIR /app

# Copy workspace root package files
COPY package*.json ./

# Copy shared packages (add new packages here!)
COPY packages/types ./packages/types

# Copy app package files
COPY apps/frontend/package*.json ./apps/frontend/

# Install workspace dependencies
RUN npm ci

# Build shared packages (add new packages here!)
RUN npm run build --workspace=packages/types

# Copy app source
COPY apps/frontend ./apps/frontend

# Build app
RUN npm run build --workspace=apps/frontend
```

**Backend Dockerfile Pattern:**
```dockerfile
FROM node:24-alpine AS build
WORKDIR /app

# Copy workspace root package files
COPY package*.json ./

# Copy shared packages (add new packages here!)
COPY packages/types ./packages/types

# Copy backend app
COPY apps/backend ./apps/backend

# Install all dependencies
RUN npm ci

# Build shared packages (add new packages here!)
RUN npm run build --workspace=packages/types

# Build backend
RUN npm run build --workspace=apps/backend
```

### Step 4: Test Docker Build Locally

```bash
# Test frontend build
docker build -f infra/nginx/Dockerfile.frontend -t st44-frontend:test .

# Test backend build
docker build -f apps/backend/Dockerfile -t st44-backend:test .
```

### Step 5: Run CI Check

The `docker-build-test.yml` workflow will automatically test Docker builds on PRs that change:
- App source code (`apps/frontend/**`, `apps/backend/**`)
- Shared packages (`packages/**`)
- Dockerfiles
- Workspace configuration (`package.json`, `package-lock.json`)

## Common Mistakes

### ❌ Forgetting to Update Dockerfile
**Error:**
```
npm error Missing: @st44/types@ from lock file
```

**Solution:** Update Dockerfile to copy and build the shared package (see Step 3).

### ❌ Wrong Build Context
**Error:**
```
COPY failed: file not found in build context
```

**Solution:** Ensure docker-compose.yml uses correct build context:
```yaml
frontend:
  build:
    context: .. # Root directory for workspace access
    dockerfile: infra/nginx/Dockerfile.frontend
```

### ❌ Not Building Shared Package First
**Error:**
```
Cannot find module '@st44/types'
```

**Solution:** Add build step for shared package before building app:
```dockerfile
RUN npm run build --workspace=packages/types
```

### ❌ Incorrect Artifact Path
**Error:**
```
COPY failed: no files found matching /app/dist/
```

**Solution:** Update path to include workspace structure:
```dockerfile
COPY --from=build /app/apps/frontend/dist/home/browser ./
```

## Checklist for Adding Workspace Dependencies

When adding a new workspace dependency, use this checklist:

- [ ] Add dependency to `apps/*/package.json`
- [ ] Run `npm install` at root
- [ ] Verify `package-lock.json` updated
- [ ] Update Dockerfile to copy new package
- [ ] Update Dockerfile to build new package
- [ ] Test Docker build locally
- [ ] Update this documentation if adding new shared package
- [ ] Commit all changes (including `package-lock.json`)
- [ ] Verify CI Docker build test passes

## CI Protection

The `docker-build-test.yml` workflow provides automatic protection:

1. **Triggered on**: PRs and pushes to main
2. **Tests**: Both frontend and backend Docker builds
3. **Caching**: Uses GitHub Actions cache for faster builds
4. **Prevents**: Deployment failures from missing dependencies

If CI fails with Docker build errors, review this guide and ensure all steps were followed.

## Creating New Shared Packages

When creating a new shared package (e.g., `packages/utils`):

1. Create package directory and `package.json`
2. Add to workspace root `package.json`:
   ```json
   {
     "workspaces": [
       "apps/frontend",
       "apps/backend",
       "packages/types",
       "packages/utils"
     ]
   }
   ```
3. Add build script to new package
4. **Update ALL Dockerfiles** that might use it
5. Add to Docker build test workflow if needed
6. Document in this file

## Troubleshooting

### Local Development Works, Docker Fails

This is the most common issue. It means your Dockerfile doesn't match your local workspace setup.

**Debug steps:**
1. Check `package.json` dependencies
2. Check Dockerfile COPY commands
3. Verify all workspace packages are copied before `npm ci`
4. Ensure shared packages are built before consuming apps
5. Test Docker build locally (don't wait for CI)

### Docker Build is Slow

Use layer caching:
```dockerfile
# Copy package files first (changes rarely)
COPY package*.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/frontend/package.json ./apps/frontend/

# Install dependencies (cached layer)
RUN npm ci

# Copy source (changes frequently)
COPY packages/types/src ./packages/types/src
COPY apps/frontend ./apps/frontend
```

## References

- [npm workspaces documentation](https://docs.npmjs.com/cli/v10/using-npm/workspaces)
- [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [GitHub Actions cache](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
