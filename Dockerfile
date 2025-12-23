# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./
COPY vite.config.ts ./

# Install dependencies (including dev dependencies for building)
RUN npm ci --ignore-scripts

# Copy source code
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./

# Build the application
RUN npm run build

# Production stage
FROM nginx:1.24-alpine

# Install security updates, gettext for envsubst, and su-exec
RUN apk update && apk upgrade && apk add --no-cache \
    curl \
    gettext \
    su-exec \
    && rm -rf /var/cache/apk/*

# Note: nginx user already exists in the base image (UID 101)

# Copy nginx configuration templates
COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY nginx-root.conf /etc/nginx/nginx-root.conf
COPY nginx-subpath.conf /etc/nginx/nginx-subpath.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Also keep a backup copy for runtime volume mounting
COPY --from=builder /app/dist /app/dist

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh

# Copy health check script
COPY healthcheck.sh /usr/local/bin/health-check.sh

RUN chmod +x /usr/local/bin/health-check.sh && \
    chmod +x /docker-entrypoint.sh

# Set proper permissions - nginx needs write access for template processing
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    chown -R nginx:nginx /tmp && \
    chown nginx:nginx /etc/nginx/nginx.conf.template && \
    chmod 755 /docker-entrypoint.sh

# Create health endpoint (timestamp will be set at runtime)
RUN echo '{"status":"healthy","service":"pose-detection-motion-tracking"}' > /usr/share/nginx/html/health

# Set environment variable defaults
ENV BASE_PATH=/

# Switch to nginx user for security
USER nginx

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /usr/local/bin/health-check.sh

# Use entrypoint to process template and start nginx
ENTRYPOINT ["sh", "/docker-entrypoint.sh"]