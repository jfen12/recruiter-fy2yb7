# RefactorTrack CRM Service

## Overview

The CRM (Client Relationship Management) service is a core microservice within RefactorTrack's cloud-native architecture, designed to manage client relationships and communications for technology recruiting and staffing agencies. This service implements enterprise-grade security measures and follows best practices for scalable, production-ready applications.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Security](#security)
- [API Documentation](#api-documentation)
- [Setup & Configuration](#setup--configuration)
- [Development Guidelines](#development-guidelines)
- [Monitoring & Maintenance](#monitoring--maintenance)

## Features

### Core Functionality
- Comprehensive client profile management
- Communication history tracking and analysis
- Secure document storage and handling
- Real-time client interaction logging
- Advanced search and filtering capabilities
- Integration with other RefactorTrack services

### Key Integrations
- PostgreSQL for structured data
- Redis for caching and rate limiting
- Elasticsearch for advanced search capabilities
- AWS S3 for document storage

## Architecture

The CRM service follows a microservices architecture pattern with:

- Node.js/Express backend
- RESTful API design
- Event-driven communication
- Horizontal scaling capability
- High availability configuration

### Service Dependencies
```mermaid
graph TD
    A[CRM Service] --> B[PostgreSQL]
    A --> C[Redis Cache]
    A --> D[Elasticsearch]
    A --> E[S3 Storage]
    A --> F[Auth Service]
    A --> G[Analytics Service]
```

## Security

### Data Classification

| Level | Data Types | Security Measures |
|-------|------------|-------------------|
| Highly Sensitive | Financial Data, Tax IDs | Field-level encryption, strict access controls |
| Sensitive | Contact Details, Communications | Data masking, role-based access |
| Internal | Client Preferences, Notes | Standard access controls |
| Public | Client Name, Industry | Basic validation |

### Security Implementation

- TLS 1.3 for data in transit
- AES-256 encryption for data at rest
- JWT authentication with MFA support
- RBAC with attribute-based policies
- 90-day encryption key rotation
- Redis-based session management (30-minute timeout)

## API Documentation

### Client Management Endpoints

#### Create Client
```http
POST /api/v1/clients
Authorization: Bearer {jwt_token}
Rate-Limit: 100/hour

{
  "name": "string",
  "industry": "string",
  "contactDetails": {
    "email": "string",
    "phone": "string",
    "address": "object"
  }
}
```

#### List Clients
```http
GET /api/v1/clients?page=1&limit=20
Authorization: Bearer {jwt_token}
Rate-Limit: 1000/hour
```

### Communication Endpoints

#### Record Communication
```http
POST /api/v1/communications
Authorization: Bearer {jwt_token}
Rate-Limit: 200/hour

{
  "clientId": "uuid",
  "type": "email|call|meeting",
  "content": "string",
  "attachments": ["urls"]
}
```

#### Get Client Communications
```http
GET /api/v1/communications/client/:clientId
Authorization: Bearer {jwt_token}
Rate-Limit: 500/hour
```

## Setup & Configuration

### Environment Variables

```bash
# Required Environment Variables
DATABASE_URL=postgresql://user:password@host:port/database?ssl=true
REDIS_URL=redis://user:password@host:port
JWT_SECRET=<min 32 characters>
ENCRYPTION_KEY=<base64 encoded 32 byte key>

# Optional Environment Variables
LOG_LEVEL=info
NODE_ENV=production
PORT=3000
```

### Installation

```bash
# Clone repository
git clone {repository_url}
cd src/backend/services/crm

# Install dependencies
npm install

# Run migrations
npm run migrate

# Start service
npm run start
```

### Docker Deployment

```bash
# Build container
docker build -t refactortrack/crm-service .

# Run container
docker run -d \
  --name crm-service \
  -p 3000:3000 \
  --env-file .env \
  refactortrack/crm-service
```

## Development Guidelines

### Code Style

- Follow TypeScript best practices
- Use ESLint with recommended configuration
- Implement comprehensive error handling
- Write detailed JSDoc comments
- Follow conventional commit messages

### Testing Requirements

```bash
# Run all tests
npm run test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

### Pull Request Process

1. Create feature branch from `develop`
2. Implement changes with tests
3. Ensure all tests pass
4. Update documentation
5. Submit PR with detailed description
6. Obtain two technical reviews
7. Pass automated checks

## Monitoring & Maintenance

### Health Checks

```http
GET /health
GET /health/db
GET /health/redis
GET /health/detailed
```

### Metrics

- Request rate and latency
- Error rates by endpoint
- Database connection pool status
- Cache hit/miss ratio
- Authentication success/failure rates

### Logging

```javascript
{
  "level": "info|warn|error",
  "timestamp": "ISO8601",
  "service": "crm",
  "traceId": "uuid",
  "message": "string",
  "context": {
    "endpoint": "string",
    "userId": "uuid",
    "clientId": "uuid"
  }
}
```

## Support

For technical support:
- Create issue in GitHub repository
- Contact DevOps team via Slack
- Email: devops@refactortrack.com

## License

Copyright © 2023 RefactorTrack. All rights reserved.