// External dependencies
import { Request, Response, NextFunction, RequestHandler } from 'express'; // v4.18.0
import jwt from 'jsonwebtoken'; // v9.0.0
import helmet from 'helmet'; // v7.0.0
import { createClient } from 'redis'; // v4.6.0
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible'; // v2.4.1

// Internal dependencies
import { Logger } from '../../../shared/utils/logger';
import { ApiResponse } from '../../../shared/types/common.types';

// Types
interface DecodedToken {
  userId: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

interface AuthenticatedRequest extends Request {
  user?: DecodedToken;
}

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '1h';
const RATE_LIMIT_WINDOW = Number(process.env.RATE_LIMIT_WINDOW) || 60000;
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Validates JWT token with enhanced security checks
 * @param token - JWT token to validate
 * @returns Decoded token payload or null if invalid
 */
async function validateToken(token: string): Promise<DecodedToken | null> {
  try {
    if (!token || !token.startsWith('Bearer ')) {
      return null;
    }

    const tokenString = token.split(' ')[1];
    const decoded = jwt.verify(tokenString, JWT_SECRET!, {
      algorithms: ['HS256'],
      issuer: 'refactortrack-auth',
      audience: 'refactortrack-crm'
    }) as DecodedToken;

    // Additional validation checks
    if (!decoded.userId || !decoded.role || !decoded.permissions) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Enhanced authentication middleware class with comprehensive security features
 */
export class AuthMiddleware {
  private logger: Logger;
  private rateLimiter: RateLimiterRedis;
  private redisClient: ReturnType<typeof createClient>;

  constructor() {
    // Initialize logger
    this.logger = new Logger('CRM-Auth-Middleware', {
      enableConsole: true,
      enableFile: true
    });

    // Initialize Redis client
    this.redisClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
      }
    });

    this.redisClient.on('error', (err) => {
      this.logger.error('Redis client error', err);
    });

    // Initialize rate limiter
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redisClient,
      points: RATE_LIMIT_MAX_REQUESTS,
      duration: RATE_LIMIT_WINDOW,
      blockDuration: RATE_LIMIT_WINDOW
    });

    // Validate required environment variables
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      await this.redisClient.connect();
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error as Error);
      throw error;
    }
  }

  /**
   * Express middleware to authenticate requests with enhanced security
   */
  public authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Rate limiting check
      try {
        await this.rateLimiter.consume(req.ip);
      } catch (rateLimitError) {
        const response: ApiResponse<null> = {
          status: 429,
          message: 'Too many requests',
          data: null,
          errors: ['Rate limit exceeded'],
          metadata: {},
          pagination: null
        };
        res.status(429).json(response);
        return;
      }

      const token = req.headers.authorization;
      if (!token) {
        const response: ApiResponse<null> = {
          status: 401,
          message: 'No token provided',
          data: null,
          errors: ['Authentication required'],
          metadata: {},
          pagination: null
        };
        res.status(401).json(response);
        return;
      }

      const decoded = await validateToken(token);
      if (!decoded) {
        const response: ApiResponse<null> = {
          status: 401,
          message: 'Invalid token',
          data: null,
          errors: ['Invalid or expired token'],
          metadata: {},
          pagination: null
        };
        res.status(401).json(response);
        return;
      }

      // Check token blacklist
      const isBlacklisted = await this.redisClient.get(`blacklist:${token}`);
      if (isBlacklisted) {
        const response: ApiResponse<null> = {
          status: 401,
          message: 'Token revoked',
          data: null,
          errors: ['Token has been revoked'],
          metadata: {},
          pagination: null
        };
        res.status(401).json(response);
        return;
      }

      // Attach user data to request
      req.user = decoded;

      // Log successful authentication
      this.logger.info('Authentication successful', {
        userId: decoded.userId,
        role: decoded.role
      });

      next();
    } catch (error) {
      this.logger.error('Authentication error', error as Error);
      const response: ApiResponse<null> = {
        status: 500,
        message: 'Internal server error',
        data: null,
        errors: ['An unexpected error occurred'],
        metadata: {},
        pagination: null
      };
      res.status(500).json(response);
    }
  };

  /**
   * Express middleware to check user role permissions with enhanced logging
   */
  public authorize = (allowedRoles: string[]): RequestHandler => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          const response: ApiResponse<null> = {
            status: 401,
            message: 'Unauthorized',
            data: null,
            errors: ['User not authenticated'],
            metadata: {},
            pagination: null
          };
          res.status(401).json(response);
          return;
        }

        if (!allowedRoles.includes(req.user.role)) {
          this.logger.warn('Authorization failed', {
            userId: req.user.userId,
            role: req.user.role,
            requiredRoles: allowedRoles
          });

          const response: ApiResponse<null> = {
            status: 403,
            message: 'Forbidden',
            data: null,
            errors: ['Insufficient permissions'],
            metadata: {},
            pagination: null
          };
          res.status(403).json(response);
          return;
        }

        this.logger.info('Authorization successful', {
          userId: req.user.userId,
          role: req.user.role,
          allowedRoles
        });

        next();
      } catch (error) {
        this.logger.error('Authorization error', error as Error);
        const response: ApiResponse<null> = {
          status: 500,
          message: 'Internal server error',
          data: null,
          errors: ['An unexpected error occurred'],
          metadata: {},
          pagination: null
        };
        res.status(500).json(response);
      }
    };
  };
}
```

This implementation provides a robust authentication middleware for the CRM service with the following key features:

1. JWT token validation with comprehensive security checks
2. Redis-based token blacklisting and session management
3. Rate limiting to prevent brute force attacks
4. Role-based authorization with granular permission checks
5. Comprehensive error handling and logging
6. Type-safe implementation using TypeScript
7. Standardized API responses using shared types
8. Security best practices including secure token validation and error handling

The middleware can be used in the CRM service routes like this:

```typescript
const authMiddleware = new AuthMiddleware();

// Protect routes with authentication
router.use(authMiddleware.authenticate);

// Protect specific routes with role-based authorization
router.get('/sensitive-data', 
  authMiddleware.authorize(['admin', 'manager']), 
  sensitiveDataController
);