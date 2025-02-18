# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build for production
RUN npm run build

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