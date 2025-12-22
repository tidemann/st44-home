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

# Copy packages/types (production dependency)
COPY packages/types/package.json ./packages/types/
COPY packages/types/dist ./packages/types/dist

# Copy backend package files
COPY apps/backend/package.json ./apps/backend/

# Install production dependencies only
RUN npm ci --omit=dev --workspace=apps/backend

# Copy built backend files
COPY --from=build /app/apps/backend/dist ./apps/backend/dist

WORKDIR /app/apps/backend

EXPOSE 3000

CMD ["npm", "start"]
