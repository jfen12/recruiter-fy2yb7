# Requisition Service

## Overview

The Requisition Service is a core microservice within the RefactorTrack ATS system responsible for managing job requisitions throughout their lifecycle. It provides comprehensive functionality for creating, updating, and managing job requisitions with advanced features including intelligent candidate matching, caching strategies, and GDPR compliance.

Version: 1.0.0
Node.js Version: 18 LTS

## Key Features

- **Comprehensive Requisition Management**
  - Full CRUD operations with validation
  - Status lifecycle management
  - Optimistic locking for concurrent updates
  - GDPR-compliant data handling

- **Advanced Candidate Matching**
  - Elasticsearch-based intelligent matching
  - Configurable matching algorithms
  - Skill-based scoring system
  - Caching of match results

- **Security & Compliance**
  - Role-based access control
  - Input validation and sanitization
  - Rate limiting protection
  - GDPR data retention policies

- **Performance Optimization**
  - Redis caching layer
  - Query optimization
  - Connection pooling
  - Response time monitoring

## Technical Architecture

### Dependencies

```json
{
  "dependencies": {
    "@elastic/elasticsearch": "^8.0.0",
    "@nestjs/common": "^9.0.0",
    "@nestjs/typeorm": "^9.0.0",
    "express": "^4.18.2",
    "ioredis": "^5.3.0",
    "inversify": "^6.0.0",
    "prom-client": "^14.2.0",
    "rate-limiter-flexible": "^2.4.1",
    "sanitize-html": "^2.11.0",
    "typeorm": "^0.3.17",
    "winston": "^3.8.0",
    "zod": "^3.21.4"
  }
}
```

### Core Components

```mermaid
graph TD
    A[API Layer] --> B[Controller Layer]
    B --> C[Service Layer]
    C --> D[Data Access Layer]
    D --> E[(PostgreSQL)]
    D --> F[(Redis Cache)]
    D --> G[(Elasticsearch)]
```

## API Endpoints

### Requisition Management

#### Create Requisition
```typescript
POST /api/v1/requisitions
Content-Type: application/json
Authorization: Bearer {token}

{
  "title": "Senior Software Engineer",
  "client_id": "uuid",
  "description": "...",
  "required_skills": [...],
  "rate": 150000,
  "deadline": "2024-12-31"
}
```

#### Update Requisition
```typescript
PUT /api/v1/requisitions/:id
Content-Type: application/json
Authorization: Bearer {token}

{
  "title": "Updated Title",
  "status": "IN_PROGRESS",
  ...
}
```

#### Find Matching Candidates
```typescript
GET /api/v1/requisitions/:id/matches
Authorization: Bearer {token}

Query Parameters:
- minimum_score: number (default: 0.6)
- max_results: number (default: 100)
- include_inactive: boolean
- fuzzy_matching: boolean
```

## Security Implementation

### Authentication & Authorization
- JWT-based authentication
- Role-based access control
- Token validation middleware

### Rate Limiting
```typescript
const RATE_LIMITS = {
  CREATE: { points: 50, duration: 3600 },  // 50 creates/hour
  UPDATE: { points: 100, duration: 3600 }, // 100 updates/hour
  SEARCH: { points: 300, duration: 3600 }  // 300 searches/hour
};
```

### Data Protection
- Input sanitization
- Field-level encryption for sensitive data
- GDPR compliance features
- Audit logging

## Performance Optimization

### Caching Strategy
```typescript
const CACHE_CONFIG = {
  REQUISITION_TTL: 3600,  // 1 hour
  LIST_TTL: 300,         // 5 minutes
  MATCH_TTL: 1800       // 30 minutes
};
```

### Query Optimization
- Indexed fields
- Query result caching
- Connection pooling
- Batch processing

## Monitoring & Observability

### Metrics
- Request count
- Response time
- Error rate
- Cache hit ratio

### Logging
```typescript
// Structured logging format
{
  timestamp: ISO8601,
  level: 'info|warn|error',
  service: 'requisition-service',
  requestId: uuid,
  message: string,
  metadata: {...}
}
```

## Error Handling

### HTTP Status Codes
- 200: Success
- 201: Created
- 400: Validation Error
- 401: Unauthorized
- 403: Forbidden
- 429: Rate Limit Exceeded
- 500: Internal Server Error

### Error Response Format
```typescript
{
  status: 'error',
  message: string,
  errors?: Record<string, string[]>,
  error_codes?: Record<string, string[]>,
  metadata: {
    timestamp: Date,
    request_id: string
  }
}
```

## Development Guidelines

### Code Style
- ESLint configuration
- Prettier formatting
- TypeScript strict mode
- Conventional commits

### Testing Requirements
- Unit test coverage > 80%
- Integration test suite
- Performance benchmarks
- Security scanning

## Deployment

### Environment Variables
```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
ELASTICSEARCH_URL=http://host:9200

# Optional
LOG_LEVEL=info
CACHE_TTL=3600
RATE_LIMIT_WINDOW=3600
```

### Health Checks
```typescript
GET /health
Response:
{
  status: 'ok|degraded|down',
  checks: {
    database: 'ok|error',
    redis: 'ok|error',
    elasticsearch: 'ok|error'
  },
  version: string,
  timestamp: ISO8601
}
```

## Operations

### Backup & Recovery
- Daily automated backups
- Point-in-time recovery
- Backup retention: 30 days
- Recovery time objective: 1 hour

### Scaling Guidelines
- Horizontal scaling via containerization
- Auto-scaling based on CPU/Memory
- Connection pool management
- Cache distribution

## Support & Troubleshooting

### Common Issues
1. Rate limiting exceeded
2. Cache invalidation
3. Match quality degradation
4. Performance bottlenecks

### Monitoring Alerts
- Response time > 3 seconds
- Error rate > 1%
- Cache hit ratio < 80%
- CPU usage > 80%

## License
Copyright © 2023 RefactorTrack. All rights reserved.