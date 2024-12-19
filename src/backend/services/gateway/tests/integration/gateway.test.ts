// External dependencies
import supertest from 'supertest'; // v6.3.0
import { describe, beforeAll, afterAll, test, expect } from '@jest/globals'; // v29.0.0
import Redis from 'redis-mock'; // v0.56.3
import nock from 'nock'; // v13.3.0
import { Express } from 'express';

// Internal dependencies
import { GatewayRouter } from '../../src/routes/gateway.routes';
import { AuthService } from '../../src/services/authService';
import { SecurityService } from '../../src/utils/security';
import { Logger } from '../../../shared/utils/logger';
import { MetricsService } from '../../../shared/utils/metrics';

// Test constants
const TEST_USER = {
  email: 'test@example.com',
  password: 'Test123!',
  role: 'recruiter'
};

const TEST_JWT_SECRET = 'test-jwt-secret';
const TEST_RATE_LIMIT = { windowMs: 15 * 60 * 1000, max: 100 };
const TEST_SERVICES = {
  candidate: 'http://candidate-service',
  requisition: 'http://requisition-service'
};

describe('API Gateway Integration Tests', () => {
  let app: Express;
  let authService: AuthService;
  let securityService: SecurityService;
  let redisClient: Redis.RedisClient;
  let validToken: string;
  let logger: Logger;
  let metricsService: MetricsService;

  beforeAll(async () => {
    // Initialize logger with test configuration
    logger = new Logger('gateway-test', {
      enableConsole: true,
      enableFile: false
    });

    // Initialize metrics service
    metricsService = new MetricsService('gateway-test', {
      enablePrometheus: false,
      enableDatadog: false
    });

    // Initialize Redis mock
    redisClient = Redis.createClient();

    // Initialize security service
    securityService = new SecurityService();

    // Initialize auth service with test configuration
    authService = new AuthService();

    // Initialize gateway router
    const gatewayRouter = new GatewayRouter();
    app = gatewayRouter.getRouter();

    // Generate valid test token
    const loginResponse = await authService.login({
      email: TEST_USER.email,
      password: TEST_USER.password
    }, '127.0.0.1');
    validToken = loginResponse.accessToken;

    // Configure service mocks
    nock(TEST_SERVICES.candidate)
      .persist()
      .get('/health')
      .reply(200, { status: 'UP' });

    nock(TEST_SERVICES.requisition)
      .persist()
      .get('/health')
      .reply(200, { status: 'UP' });
  });

  afterAll(async () => {
    // Clean up mocks and connections
    nock.cleanAll();
    redisClient.quit();
    metricsService.cleanup();
  });

  describe('Authentication Flow Tests', () => {
    test('should successfully complete login flow', async () => {
      const response = await supertest(app)
        .post('/api/v1/auth/login')
        .send({
          email: TEST_USER.email,
          password: TEST_USER.password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
    });

    test('should reject invalid credentials', async () => {
      const response = await supertest(app)
        .post('/api/v1/auth/login')
        .send({
          email: TEST_USER.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should successfully refresh token', async () => {
      const loginResponse = await supertest(app)
        .post('/api/v1/auth/login')
        .send(TEST_USER);

      const response = await supertest(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: loginResponse.body.refreshToken
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    test('should successfully logout', async () => {
      const response = await supertest(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Security Control Tests', () => {
    test('should enforce rate limits', async () => {
      const requests = Array(TEST_RATE_LIMIT.max + 1).fill(null);
      
      for (const _ of requests) {
        await supertest(app)
          .get('/api/v1/health')
          .set('Authorization', `Bearer ${validToken}`);
      }

      const response = await supertest(app)
        .get('/api/v1/health')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('error');
    });

    test('should set security headers', async () => {
      const response = await supertest(app)
        .get('/api/v1/health')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('strict-transport-security');
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
    });

    test('should validate JWT tokens', async () => {
      const response = await supertest(app)
        .get('/api/v1/health')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Service Routing Tests', () => {
    test('should route requests to candidate service', async () => {
      const response = await supertest(app)
        .get('/api/v1/candidates')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    test('should handle service timeouts', async () => {
      nock(TEST_SERVICES.requisition)
        .get('/api/v1/requisitions')
        .delay(3000)
        .reply(200);

      const response = await supertest(app)
        .get('/api/v1/requisitions')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('error');
    });

    test('should trigger circuit breaker', async () => {
      nock(TEST_SERVICES.candidate)
        .get('/api/v1/candidates')
        .times(5)
        .reply(500);

      for (let i = 0; i < 5; i++) {
        await supertest(app)
          .get('/api/v1/candidates')
          .set('Authorization', `Bearer ${validToken}`);
      }

      const response = await supertest(app)
        .get('/api/v1/candidates')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(503);
      expect(response.body.error).toContain('Circuit breaker is open');
    });
  });

  describe('Monitoring Tests', () => {
    test('should expose health check endpoint', async () => {
      const response = await supertest(app)
        .get('/health')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'UP');
      expect(response.body).toHaveProperty('services');
    });

    test('should expose metrics endpoint', async () => {
      const response = await supertest(app)
        .get('/metrics')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('http_requests_total');
      expect(response.body).toHaveProperty('circuit_breaker_status');
    });

    test('should track request latency', async () => {
      const startTime = Date.now();
      
      await supertest(app)
        .get('/api/v1/candidates')
        .set('Authorization', `Bearer ${validToken}`);

      const metrics = await metricsService.getMetrics();
      expect(metrics).toHaveProperty('http_request_duration_seconds');
      expect(Date.now() - startTime).toBeGreaterThan(0);
    });
  });
});