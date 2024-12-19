// External dependencies
import express, { Router, Request, Response, NextFunction } from 'express'; // v4.18.0
import helmet from 'helmet'; // v7.0.0
import { trace, context, SpanStatusCode } from '@opentelemetry/api'; // v1.4.0
import rateLimit from 'express-rate-limit'; // v6.7.0
import CircuitBreaker from 'opossum'; // v7.1.0

// Internal dependencies
import { AuthMiddleware } from '../middleware/auth.middleware';
import { Logger } from '../../../shared/utils/logger';
import { MetricsService } from '../../../shared/utils/metrics';
import { SecurityService } from '../utils/security';

// Constants
const API_VERSION = '/api/v1';
const PUBLIC_ROUTES = ['/auth/login', '/auth/register', '/auth/forgot-password'];
const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
};

// Types
interface ServiceConfig {
  name: string;
  url: string;
  timeout: number;
  circuitBreaker: {
    timeout: number;
    resetTimeout: number;
    errorThreshold: number;
  };
}

export class GatewayRouter {
  private router: Router;
  private logger: Logger;
  private metrics: MetricsService;
  private authMiddleware: AuthMiddleware;
  private securityService: SecurityService;
  private serviceBreakers: Map<string, CircuitBreaker>;
  private tracer: any;

  constructor() {
    this.router = express.Router();
    this.logger = new Logger('gateway-router');
    this.metrics = new MetricsService('gateway-router');
    this.authMiddleware = new AuthMiddleware();
    this.securityService = new SecurityService();
    this.serviceBreakers = new Map();
    this.tracer = trace.getTracer('gateway-service');

    this.initializeMiddleware();
    this.setupRoutes();
    this.setupCircuitBreakers();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.router.use(helmet({
      contentSecurityPolicy: true,
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: true,
      dnsPrefetchControl: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: true,
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: true,
      referrerPolicy: true,
      xssFilter: true
    }));

    // Rate limiting
    this.router.use(rateLimit(RATE_LIMIT_CONFIG));

    // Request logging and metrics
    this.router.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      res.on('finish', () => {
        this.metrics.incrementCounter('http_requests_total', {
          method: req.method,
          path: req.path,
          status: res.statusCode.toString()
        });
        this.metrics.incrementCounter('http_request_duration_seconds', {
          method: req.method,
          path: req.path
        });
      });
      next();
    });
  }

  private setupCircuitBreakers(): void {
    const services: ServiceConfig[] = [
      {
        name: 'candidate-service',
        url: process.env.CANDIDATE_SERVICE_URL || 'http://localhost:3001',
        timeout: 5000,
        circuitBreaker: {
          timeout: 3000,
          resetTimeout: 30000,
          errorThreshold: 50
        }
      },
      {
        name: 'requisition-service',
        url: process.env.REQUISITION_SERVICE_URL || 'http://localhost:3002',
        timeout: 5000,
        circuitBreaker: {
          timeout: 3000,
          resetTimeout: 30000,
          errorThreshold: 50
        }
      }
    ];

    services.forEach(service => {
      const breaker = new CircuitBreaker(this.handleServiceRequest.bind(this), {
        timeout: service.circuitBreaker.timeout,
        resetTimeout: service.circuitBreaker.resetTimeout,
        errorThresholdPercentage: service.circuitBreaker.errorThreshold,
        name: service.name
      });

      breaker.on('open', () => {
        this.logger.warn(`Circuit breaker opened for ${service.name}`);
        this.metrics.incrementCounter('circuit_breaker_open', { service: service.name });
      });

      breaker.on('close', () => {
        this.logger.info(`Circuit breaker closed for ${service.name}`);
        this.metrics.incrementCounter('circuit_breaker_close', { service: service.name });
      });

      this.serviceBreakers.set(service.name, breaker);
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.router.get('/health', this.handleHealthCheck.bind(this));

    // Metrics endpoint
    this.router.get('/metrics', this.handleMetrics.bind(this));

    // API routes
    this.router.use(`${API_VERSION}/candidates`, this.handleServiceProxy('candidate-service'));
    this.router.use(`${API_VERSION}/requisitions`, this.handleServiceProxy('requisition-service'));

    // Error handling
    this.router.use(this.errorHandler.bind(this));
  }

  private handleServiceProxy(serviceName: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const breaker = this.serviceBreakers.get(serviceName);
      if (!breaker) {
        return next(new Error(`Service ${serviceName} not configured`));
      }

      const span = this.tracer.startSpan(`${serviceName}_request`);
      context.with(trace.setSpan(context.active(), span), async () => {
        try {
          const result = await breaker.fire({ req, res });
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message
          });
          next(error);
        } finally {
          span.end();
        }
      });
    };
  }

  private async handleServiceRequest({ req, res }: { req: Request; res: Response }): Promise<void> {
    // Implementation of actual service request forwarding
    // This would typically use a HTTP client like axios to forward the request
    // For brevity, this implementation is omitted
  }

  private async handleHealthCheck(req: Request, res: Response): Promise<void> {
    const health = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      services: Object.fromEntries(
        Array.from(this.serviceBreakers.entries()).map(([name, breaker]) => [
          name,
          { status: breaker.opened ? 'DOWN' : 'UP' }
        ])
      )
    };

    res.json(health);
  }

  private async handleMetrics(req: Request, res: Response): Promise<void> {
    const metrics = await this.metrics.getMetrics();
    res.json(metrics);
  }

  private errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
    this.logger.error('Gateway error', err);
    this.metrics.incrementCounter('gateway_errors_total', {
      path: req.path,
      error: err.name
    });

    res.status(500).json({
      error: 'Internal Server Error',
      requestId: req.headers['x-request-id']
    });
  }

  public getRouter(): Router {
    return this.router;
  }
}

// Export singleton instance
export const gatewayRouter = new GatewayRouter();
export default gatewayRouter.getRouter();