# Stage 1: Builder
FROM node:18-alpine AS builder

# Add labels for builder stage
LABEL stage=builder

# Set working directory
WORKDIR /usr/src/app

# Install build dependencies and security updates
RUN apk update && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies including devDependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Remove devDependencies
RUN npm prune --production

# Stage 2: Production
FROM node:18-alpine

# Add metadata labels
LABEL maintainer="RefactorTrack Team" \
    com.refactortrack.service="candidate" \
    com.refactortrack.version="${VERSION}" \
    org.opencontainers.image.source="https://github.com/refactortrack/candidate-service" \
    org.opencontainers.image.description="Candidate service for RefactorTrack ATS" \
    org.opencontainers.image.licenses="MIT"

# Set working directory
WORKDIR /usr/src/app

# Create non-root user and set permissions
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /usr/src/app

# Install production dependencies
RUN apk update && \
    apk add --no-cache \
    tini \
    && rm -rf /var/cache/apk/*

# Copy package files and install production dependencies
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=nodejs:nodejs --from=builder /usr/src/app/dist ./dist

# Set secure environment defaults
ENV NODE_ENV=production \
    PORT=3000 \
    METRICS_PORT=9090 \
    NODE_OPTIONS="--max-old-space-size=2048" \
    NPM_CONFIG_LOGLEVEL=warn \
    TZ=UTC

# Switch to non-root user
USER nodejs

# Expose ports for HTTP, gRPC, and metrics
EXPOSE 3000 9090

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Set security options
SECURITY_OPTS --security-opt=no-new-privileges:true \
    --cap-drop=ALL \
    --security-opt=seccomp=unconfined

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/index.js"]