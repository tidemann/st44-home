FROM node:24-alpine AS build

WORKDIR /app

# Copy workspace root package files
COPY package*.json ./

# Copy packages/types (dependency)
COPY packages/types ./packages/types

# Copy backend app
COPY apps/backend ./apps/backend

# Install all dependencies (including @st44/types)
RUN npm ci

# Build types package
RUN npm run build --workspace=packages/types

# Build backend
RUN npm run build --workspace=apps/backend

# Production stage
FROM node:24-alpine

WORKDIR /app

# Copy workspace root package files
COPY package*.json ./

# Copy packages/types source and build it
COPY packages/types/package.json ./packages/types/
COPY packages/types/tsconfig.json ./packages/types/
COPY packages/types/src ./packages/types/src

# Copy backend package files
COPY apps/backend/package.json ./apps/backend/

# Install production dependencies for entire workspace
RUN npm ci --omit=dev

# Build types package (TypeScript needed from dev dependencies of types package)
WORKDIR /app/packages/types
RUN npm install --save-dev typescript
RUN npm run build

# Back to root
WORKDIR /app

# Copy built backend files from build stage
COPY --from=build /app/apps/backend/dist ./apps/backend/dist

# Set working directory to backend
WORKDIR /app/apps/backend

EXPOSE 3000

CMD ["npm", "start"]
