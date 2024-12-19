// External dependencies
// express v4.18.0 - Web framework
import express from 'express';
// cors v2.8.5 - CORS middleware
import cors from 'cors';
// helmet v7.0.0 - Security middleware
import helmet from 'helmet';
// http-proxy-middleware v2.0.6 - Proxy middleware
import { createProxyMiddleware, Options as ProxyOptions } from 'http-proxy-middleware';

// Internal dependencies
import { RedisConfig } from './redis';
import { Logger } from '../../../shared/utils/logger';
import { MetricsService } from '../../../shared/utils/metrics';

// Environment variables
const PORT = process.env.GATEWAY_PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const API_VERSION = 'v1';
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 1000;

// Types
interface ServiceRoute {
  path: string;
  target: string;
  healthCheck: string;
  rateLimit?: number;
  timeout?: number;
}

interface SecurityConfig {
  jwtSecret: string;
  corsOrigins: string[];
  rateLimitWindow: number;
  rateLimitMaxRequests: number;
  enableHSTS: boolean;
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitorInterval: number;
}

interface LoadBalancerConfig {
  algorithm: 'round-robin' | 'least-connections';
  healthCheckInterval: number;
  unhealthyThreshold: number;
}

interface GatewayConfigOptions {
  port?: number;
  environment?: string;
  security?: Partial<SecurityConfig>;
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  loadBalancer?: Partial<LoadBalancerConfig>;
}

// Gateway Configuration Class
export class GatewayConfig {
  private readonly port: number;
  private readonly environment: string;
  private readonly logger: Logger;
  private readonly metrics: MetricsService;
  private readonly redis: RedisConfig;
  private readonly routes: Map<string, ServiceRoute>;
  private readonly circuitBreakers: Map<string, { failures: number; lastFailure: number }>;

  constructor(options: GatewayConfigOptions = {}) {
    this.port = options.port || PORT;
    this.environment = options.environment || NODE_ENV;
    this.logger = new Logger('GatewayConfig');
    this.metrics = new MetricsService('gateway');
    this.redis = new RedisConfig();
    this.routes = new Map();
    this.circuitBreakers = new Map();

    this.initializeRoutes();
    this.setupCircuitBreakers(options.circuitBreaker);
  }

  private initializeRoutes(): void {
    // Candidate Service Routes
    this.routes.set('candidates', {
      path: `/api/${API_VERSION}/candidates`,
      target: 'http://candidate-service:3001',
      healthCheck: '/health',
      rateLimit: 1000,
      timeout: 30000
    });

    // Requisition Service Routes
    this.routes.set('requisitions', {
      path: `/api/${API_VERSION}/requisitions`,
      target: 'http://requisition-service:3002',
      healthCheck: '/health',
      rateLimit: 800,
      timeout: 30000
    });

    // CRM Service Routes
    this.routes.set('crm', {
      path: `/api/${API_VERSION}/clients`,
      target: 'http://crm-service:3003',
      healthCheck: '/health',
      rateLimit: 500,
      timeout: 30000
    });

    // Analytics Service Routes
    this.routes.set('analytics', {
      path: `/api/${API_VERSION}/analytics`,
      target: 'http://analytics-service:3004',
      healthCheck: '/health',
      rateLimit: 300,
      timeout: 60000
    });
  }

  private setupCircuitBreakers(config?: Partial<CircuitBreakerConfig>): void {
    const defaultConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 30000,
      monitorInterval: 10000,
      ...config
    };

    this.routes.forEach((route, serviceName) => {
      this.circuitBreakers.set(serviceName, { failures: 0, lastFailure: 0 });
    });

    // Monitor circuit breakers
    setInterval(() => {
      this.circuitBreakers.forEach((breaker, service) => {
        if (breaker.failures >= defaultConfig.failureThreshold) {
          if (Date.now() - breaker.lastFailure >= defaultConfig.resetTimeout) {
            this.logger.info(`Resetting circuit breaker for service: ${service}`);
            breaker.failures = 0;
          }
        }
      });
    }, defaultConfig.monitorInterval);
  }

  public createProxyMiddleware(route: ServiceRoute): express.RequestHandler {
    const proxyOptions: ProxyOptions = {
      target: route.target,
      changeOrigin: true,
      timeout: route.timeout,
      proxyTimeout: route.timeout,
      onProxyReq: (proxyReq, req) => {
        this.metrics.incrementCounter('proxy_requests_total', {
          path: req.path,
          method: req.method
        });
      },
      onProxyRes: (proxyRes, req) => {
        const responseTime = Date.now() - (req as any).startTime;
        this.metrics.recordResponseTime(responseTime, {
          path: req.path,
          status: proxyRes.statusCode.toString()
        });
      },
      onError: (err, req, res) => {
        const serviceName = this.getServiceNameFromPath(req.path);
        if (serviceName) {
          const breaker = this.circuitBreakers.get(serviceName);
          if (breaker) {
            breaker.failures++;
            breaker.lastFailure = Date.now();
          }
        }
        this.logger.error('Proxy error', err);
        res.status(502).json({ error: 'Bad Gateway' });
      }
    };

    return createProxyMiddleware(proxyOptions);
  }

  private getServiceNameFromPath(path: string): string | null {
    for (const [serviceName, route] of this.routes.entries()) {
      if (path.startsWith(route.path)) {
        return serviceName;
      }
    }
    return null;
  }

  public async validate(): Promise<boolean> {
    try {
      // Validate Redis connection
      await this.redis.validate();

      // Validate service health
      for (const [serviceName, route] of this.routes.entries()) {
        try {
          const healthCheckUrl = `${route.target}${route.healthCheck}`;
          const response = await fetch(healthCheckUrl);
          if (!response.ok) {
            this.logger.warn(`Health check failed for service: ${serviceName}`);
          }
        } catch (error) {
          this.logger.error(`Service validation error: ${serviceName}`, error as Error);
        }
      }

      return true;
    } catch (error) {
      this.logger.error('Gateway validation failed', error as Error);
      return false;
    }
  }

  public getRoutes(): Map<string, ServiceRoute> {
    return new Map(this.routes);
  }
}

// Factory function
export const createGatewayConfig = (options: GatewayConfigOptions = {}): GatewayConfig => {
  return new GatewayConfig(options);
};

// Service routes getter
export const getServiceRoutes = (): Map<string, ServiceRoute> => {
  const gateway = createGatewayConfig();
  return gateway.getRoutes();
};