# Stage 1: Builder
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies including dev dependencies
RUN npm ci

# Copy source code and config files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript application
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Add tini for proper signal handling
RUN apk add --no-cache tini

# Create non-root user and group
RUN addgroup -g 1001 nodeapp && \
    adduser -u 1001 -G nodeapp -s /bin/sh -D nodeapp

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Copy package files and install production dependencies
COPY package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

# Set proper ownership
RUN chown -R nodeapp:nodeapp .

# Create directory for logs with proper permissions
RUN mkdir -p /var/log/requisition-service && \
    chown -R nodeapp:nodeapp /var/log/requisition-service

# Expose application port
EXPOSE 3000

# Set up health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Switch to non-root user
USER nodeapp

# Use tini as entrypoint
ENTRYPOINT ["/sbin/tini", "--"]

# Set the default command
CMD ["node", "dist/server.js"]

# Labels for container metadata
LABEL maintainer="RefactorTrack DevOps Team" \
      description="Requisition service for RefactorTrack ATS" \
      version="1.0.0" \
      org.opencontainers.image.source="https://github.com/refactortrack/requisition-service" \
      org.opencontainers.image.licenses="Private"

# Security scanning during build (commented out - uncomment and configure in CI/CD)
#RUN trivy filesystem --no-progress --exit-code 1 --severity HIGH,CRITICAL .