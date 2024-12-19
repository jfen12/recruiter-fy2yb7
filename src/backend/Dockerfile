# Stage 1: Builder
FROM node:18-alpine AS builder

# Build arguments
ARG NODE_ENV=development
ARG NPM_CONFIG_LOGLEVEL=warn
ARG NPM_CONFIG_AUDIT=false

# Set environment variables
ENV NODE_ENV=${NODE_ENV} \
    NPM_CONFIG_LOGLEVEL=${NPM_CONFIG_LOGLEVEL} \
    NPM_CONFIG_AUDIT=${NPM_CONFIG_AUDIT}

# Set working directory
WORKDIR /usr/src/app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files with correct ownership
COPY --chown=node:node package*.json lerna.json ./
COPY --chown=node:node services/*/package*.json ./services/

# Install dependencies using npm ci for exact versions
RUN npm ci --prefer-offline --no-audit

# Copy source code and configs
COPY --chown=node:node . .

# Build TypeScript code with production optimizations
RUN npm run build \
    && npm prune --production

# Stage 2: Production
FROM node:18-alpine

# Build arguments
ARG NODE_ENV=production
ARG PORT=3000
ARG BUILD_VERSION=latest

# Set environment variables
ENV NODE_ENV=${NODE_ENV} \
    PORT=${PORT} \
    AWS_XRAY_DAEMON_ADDRESS=localhost:2000 \
    ECS_ENABLE_CONTAINER_METADATA=true

# Set working directory
WORKDIR /usr/src/app

# Create non-root user and secure directories
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    mkdir -p /usr/src/app/node_modules /usr/src/app/dist /tmp && \
    chown -R nodejs:nodejs /usr/src/app /tmp

# Copy built artifacts from builder stage
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/package*.json ./

# Configure security limits and policies
RUN apk add --no-cache curl tini && \
    echo "nodejs soft nofile 65536" >> /etc/security/limits.conf && \
    echo "nodejs hard nofile 65536" >> /etc/security/limits.conf

# Set up container labels
LABEL maintainer="RefactorTrack DevOps Team" \
    com.refactortrack.version="${BUILD_VERSION}" \
    com.refactortrack.service="backend" \
    com.datadoghq.tags.service="refactortrack-backend" \
    com.datadoghq.tags.env="${NODE_ENV}"

# Expose ports
EXPOSE 3000/tcp
EXPOSE 2000/udp

# Configure volumes
VOLUME ["/usr/src/app/node_modules", "/usr/src/app/dist", "/tmp"]

# Set up healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Switch to non-root user
USER nodejs

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Set the default command
CMD ["node", "dist/server.js"]

# Security configurations
SECURITY_OPT ["no-new-privileges:true"]
RUN echo "fs.file-max = 65536" >> /etc/sysctl.conf

# Drop all capabilities except what's needed
CAPABILITIES DROP=ALL
CAPABILITIES ADD=NET_BIND_SERVICE

# Enable read-only root filesystem
READONLY_ROOTFS true