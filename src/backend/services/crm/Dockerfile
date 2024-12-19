# Stage 1: Builder
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Install build dependencies and security updates
RUN apk update && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/cache/apk/*

# Set build environment
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=2048"

# Copy package files with build cache optimization
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies with yarn cache
RUN yarn install --frozen-lockfile --production=false

# Copy source code and config files
COPY tsconfig.json ./
COPY src ./src

# Run security audit
RUN yarn security:audit || true

# Build TypeScript application
RUN yarn build

# Prune dev dependencies
RUN yarn install --frozen-lockfile --production=true

# Stage 2: Production
FROM node:18-alpine

# Install Tini
ENV TINI_VERSION v0.19.0
RUN apk add --no-cache tini

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -u 1001 -G nodejs -s /bin/sh -D nodejs

# Set working directory
WORKDIR /usr/src/app

# Set production environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_OPTIONS="--max-old-space-size=1024"

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/package.json ./

# Set strict permissions
RUN chmod -R 550 ./dist && \
    chmod -R 550 ./node_modules && \
    chmod 550 package.json

# Security configurations
RUN echo "nodejs soft nofile 1024" >> /etc/security/limits.conf && \
    echo "nodejs hard nofile 4096" >> /etc/security/limits.conf

# Switch to non-root user
USER nodejs

# Set container metadata
LABEL maintainer="RefactorTrack Team" \
      version="${BUILD_VERSION:-latest}" \
      build_date="${BUILD_DATE:-unknown}" \
      vcs_ref="${VCS_REF:-unknown}" \
      service="crm"

# Expose API port
EXPOSE 3000

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node dist/healthcheck.js || exit 1

# Use Tini as init process
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "dist/index.js"]