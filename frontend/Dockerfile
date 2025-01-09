# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy source code and config
COPY . .
COPY ../config.yaml ./config.yaml

# Build for production
RUN npm run build

# Serve stage
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy config for runtime access (optional, since it's bundled)
COPY ../config.yaml /usr/share/nginx/html/config.yaml

# Use default nginx config
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 