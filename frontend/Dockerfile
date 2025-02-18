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

# Create script to replace bootstrap config
RUN echo '#!/bin/sh\n\
if [ -n "$BOOTSTRAP_CONFIG" ]; then\n\
  echo "Using provided bootstrap config"\n\
  export BOOTSTRAP_CONFIG=$(echo $BOOTSTRAP_CONFIG | sed "s/\"/\\\\\"/g")\n\
else\n\
  echo "No bootstrap config provided, using default"\n\
  export BOOTSTRAP_CONFIG="{\"backend\":{\"url\":\"\"}"\n\
fi\n\
exec nginx -g "daemon off;"' > /docker-entrypoint.sh && \
chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"] 