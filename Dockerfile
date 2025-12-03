# -----------------------------------------------------------
#  Build Stage
# -----------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build --omit=dev

# -----------------------------------------------------------
#  Runtime Stage (Nginx)
# -----------------------------------------------------------
FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html

# Remove default nginx content
RUN rm -rf ./*

# Copy built Angular app
COPY --from=build /app/dist/home/browser ./

# Provide custom nginx config (optional but recommended)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
