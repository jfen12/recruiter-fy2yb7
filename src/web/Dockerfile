# Stage 1: Build environment
# node:18-alpine v3.18
FROM node:18-alpine@sha256:3482a20c97e401b56ac50ba8920cc7b5b2022bfc6aa7d4e4c231755770cf892f AS builder

# Set build arguments and environment variables
ENV NODE_ENV=production
ENV CI=true

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ git \
    && yarn global add typescript@5.1.6

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies with frozen lockfile for deterministic builds
RUN yarn install --frozen-lockfile --production=false

# Copy source code and configuration files
COPY . .

# Type check and build application
RUN yarn typecheck \
    && yarn build \
    && yarn test --watchAll=false --ci --coverage

# Stage 2: Production environment
# nginx:1.25-alpine
FROM nginx:1.25-alpine@sha256:6a2f8b28a9826a1e952bf25d76e3a4dd8c9203a8e08c4f3f9a04744d766b829 AS production

# Set environment variables
ENV NGINX_USER=nginx
ENV APP_HOME=/usr/share/nginx/html

# Install additional security packages
RUN apk add --no-cache curl tzdata

# Create nginx user if it doesn't exist
RUN adduser -D -H -u 101 -s /sbin/nologin ${NGINX_USER}

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-security-headers.conf /etc/nginx/conf.d/security-headers.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist ${APP_HOME}

# Set correct permissions
RUN chown -R ${NGINX_USER}:${NGINX_USER} ${APP_HOME} \
    && chmod -R 755 ${APP_HOME} \
    && chown -R ${NGINX_USER}:${NGINX_USER} /var/cache/nginx \
    && chown -R ${NGINX_USER}:${NGINX_USER} /var/log/nginx \
    && chown -R ${NGINX_USER}:${NGINX_USER} /etc/nginx/conf.d \
    && touch /var/run/nginx.pid \
    && chown -R ${NGINX_USER}:${NGINX_USER} /var/run/nginx.pid

# Switch to non-root user
USER ${NGINX_USER}

# Configure healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Build-time metadata
LABEL maintainer="RefactorTrack Engineering <engineering@refactortrack.com>" \
    org.opencontainers.image.title="RefactorTrack Web Frontend" \
    org.opencontainers.image.description="RefactorTrack ATS web application frontend" \
    org.opencontainers.image.version="1.0.0" \
    org.opencontainers.image.vendor="RefactorTrack" \
    org.opencontainers.image.url="https://refactortrack.com" \
    org.opencontainers.image.source="https://github.com/refactortrack/web" \
    org.opencontainers.image.licenses="Proprietary" \
    security.root-access="disabled" \
    security.non-root-user="nginx"