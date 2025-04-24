# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.json* ./

# Install dependencies using pnpm
RUN pnpm install

# Copy source code (excluding node_modules)
COPY . .
# Ensure node_modules are preserved from install step
RUN rm -rf node_modules && pnpm install

# Build for production - Skip prebuild scripts
RUN SKIP_PREBUILD=true pnpm vite build

# Serve stage
FROM nginx:alpine

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create entrypoint script
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'if [ -n "$BOOTSTRAP_CONFIG" ]; then' >> /docker-entrypoint.sh && \
    echo '    echo "Using provided bootstrap config"' >> /docker-entrypoint.sh && \
    echo '    echo $BOOTSTRAP_CONFIG > /usr/share/nginx/html/bootstrap.json' >> /docker-entrypoint.sh && \
    echo 'else' >> /docker-entrypoint.sh && \
    echo '    echo "No bootstrap config provided, using default"' >> /docker-entrypoint.sh && \
    echo '    echo '"'"'{"backend":{"url":""}}'"'"' > /usr/share/nginx/html/bootstrap.json' >> /docker-entrypoint.sh && \
    echo 'fi' >> /docker-entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"] 