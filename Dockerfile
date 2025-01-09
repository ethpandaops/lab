# Build stage
FROM node:20-alpine as builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./
COPY frontend/tsconfig*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend for production
RUN npm run build

# Copy config into dist for runtime access
COPY config.yaml dist/config.yaml

# Serve stage
FROM nginx:alpine

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built frontend assets
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy data directory
COPY data /usr/share/nginx/html/data

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 