// External dependencies
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { CircuitBreaker } from 'circuit-breaker-ts';

// Internal dependencies
import { RedisConfig } from '../config/redis';
import { GatewayConfig } from '../config/gateway';
import { Logger } from '../../../shared/utils/logger';
import { MetricsCollector } from '../../../shared/utils/metrics';

// Constants
const RATE_LIMIT_PREFIX = 'refactortrack:ratelimit:';
const DEFAULT_WINDOW_MS = 60000; // 1 minute
const DEFAULT_MAX_REQUESTS = 1000;
const BURST_ALLOWANCE = 100;
const CIRCUIT_BREAKER_OPTIONS = { failureThreshold: 5, resetTimeout: 60000 };

// Types
interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
  skipFailedRequests?: boolean;
  requestPropertyName?: string;
}

interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: number;
}

interface Context {
  ip: string;
  path: string;
  method: string;
  userId?: string;
}

// Utility Functions
const getRateLimitKey = (identifier: string, context: Context): string => {
  const sanitizedIdentifier = identifier.replace(/[^a-zA-Z0-9]/g, '_');
  const hash = require('crypto')
    .createHash('sha256')
    .update(`${context.ip}:${context.path}:${context.method}:${context.userId || 'anonymous'}`)
    .digest('hex');
  
  return `${RATE_LIMIT_PREFIX}${sanitizedIdentifier}:${hash}`;
};

// RateLimiter Class
class RateLimiter {
  private redisClient: Redis;
  private circuitBreaker: CircuitBreaker;
  private logger: Logger;
  private metrics: MetricsCollector;
  private windowMs: number;
  private maxRequests: number;
  private burstAllowance: number;

  constructor(options: RateLimitOptions = {}) {
    this.windowMs = options.windowMs || DEFAULT_WINDOW_MS;
    this.maxRequests = options.maxRequests || DEFAULT_MAX_REQUESTS;
    this.burstAllowance = BURST_ALLOWANCE;
    
    this.logger = new Logger('RateLimiter', {
      enableConsole: true,
      enableFile: true
    });

    this.metrics = new MetricsCollector('rate_limiter');
    this.initializeRedis();
    this.setupCircuitBreaker();
  }

  private async initializeRedis(): Promise<void> {
    try {
      const redisConfig = new RedisConfig();
      this.redisClient = await redisConfig.getClient();
    } catch (error) {
      this.logger.error('Failed to initialize Redis client', error as Error);
      throw error;
    }
  }

  private setupCircuitBreaker(): void {
    this.circuitBreaker = new CircuitBreaker({
      ...CIRCUIT_BREAKER_OPTIONS,
      onOpen: () => {
        this.logger.warn('Circuit breaker opened for rate limiter');
        this.metrics.incrementCounter('rate_limit_circuit_breaker_open');
      },
      onClose: () => {
        this.logger.info('Circuit breaker closed for rate limiter');
        this.metrics.incrementCounter('rate_limit_circuit_breaker_close');
      }
    });
  }

  public async checkRateLimit(identifier: string, context: Context): Promise<RateLimitInfo> {
    const key = getRateLimitKey(identifier, context);
    
    try {
      return await this.circuitBreaker.fire(async () => {
        const multi = this.redisClient.multi();
        const now = Date.now();
        const windowStart = now - this.windowMs;

        // Clean old requests
        multi.zremrangebyscore(key, 0, windowStart);
        // Add current request
        multi.zadd(key, now, `${now}`);
        // Count requests in window
        multi.zcard(key);
        // Set key expiration
        multi.pexpire(key, this.windowMs);

        const [, , requestCount] = await multi.exec();
        const current = requestCount?.[1] as number || 0;
        const remaining = Math.max(this.maxRequests - current, 0);
        
        this.metrics.incrementCounter('rate_limit_check', {
          exceeded: (current > this.maxRequests).toString(),
          identifier
        });

        return {
          limit: this.maxRequests,
          current,
          remaining,
          resetTime: now + this.windowMs
        };
      });
    } catch (error) {
      this.logger.error('Rate limit check failed', error as Error);
      // Fail open with burst allowance in case of Redis failure
      return {
        limit: this.maxRequests + this.burstAllowance,
        current: 0,
        remaining: this.burstAllowance,
        resetTime: Date.now() + this.windowMs
      };
    }
  }

  public async resetLimit(identifier: string, context: Context): Promise<void> {
    const key = getRateLimitKey(identifier, context);
    try {
      await this.circuitBreaker.fire(async () => {
        await this.redisClient.del(key);
        this.logger.info(`Rate limit reset for ${identifier}`);
      });
    } catch (error) {
      this.logger.error('Failed to reset rate limit', error as Error);
      throw error;
    }
  }
}

// Middleware Factory
export const rateLimitMiddleware = (options: RateLimitOptions = {}) => {
  const rateLimiter = new RateLimiter(options);
  const logger = new Logger('RateLimitMiddleware');

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const context: Context = {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userId: (req as any).user?.id
    };

    const identifier = options.keyGenerator?.(req) || req.ip;

    try {
      const rateLimitInfo = await rateLimiter.checkRateLimit(identifier, context);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', rateLimitInfo.limit);
      res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining);
      res.setHeader('X-RateLimit-Reset', rateLimitInfo.resetTime);

      if (rateLimitInfo.remaining <= 0) {
        logger.warn('Rate limit exceeded', {
          identifier,
          context,
          rateLimitInfo
        });

        if (options.handler) {
          options.handler(req, res);
        } else {
          res.status(429).json({
            error: 'Too Many Requests',
            retryAfter: Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000)
          });
        }
        return;
      }

      next();
    } catch (error) {
      logger.error('Rate limit middleware error', error as Error);
      // Fail open in case of errors
      next();
    }
  };
};

// Export RateLimiter class for custom implementations
export { RateLimiter, type RateLimitOptions, type RateLimitInfo, type Context };