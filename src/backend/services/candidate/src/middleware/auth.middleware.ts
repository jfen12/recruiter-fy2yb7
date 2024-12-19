// External dependencies
import { Request, Response, NextFunction } from 'express'; // v4.18.0
import jwt from 'jsonwebtoken'; // v9.0.0
import { RateLimiterMemory } from 'rate-limiter-flexible'; // v2.4.1
import helmet from 'helmet'; // v4.6.0

// Internal dependencies
import { Logger } from '../../../shared/utils/logger';
import { MetricsService } from '../../../shared/utils/metrics';

// Environment variables with secure defaults
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '1h';
const MAX_AUTH_ATTEMPTS = Number(process.env.MAX_AUTH_ATTEMPTS) || 5;
const RATE_LIMIT_WINDOW = Number(process.env.RATE_LIMIT_WINDOW) || 900; // 15 minutes

// Types and interfaces
interface UserPayload {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  version: number;
  iat: number;
  exp: number;
}

interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

interface TokenValidationError extends Error {
  code?: string;
}

// Enhanced token validation function
const validateToken = async (token: string): Promise<UserPayload> => {
  try {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    // Verify token structure and signature
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      complete: true
    }) as jwt.JwtPayload;

    // Validate token payload structure
    const payload = decoded.payload as UserPayload;
    if (!payload.id || !payload.role || !payload.permissions) {
      throw new Error('Invalid token payload structure');
    }

    // Additional security validations
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      const error = new Error('Token has expired') as TokenValidationError;
      error.code = 'TOKEN_EXPIRED';
      throw error;
    }

    return payload;
  } catch (error) {
    const tokenError = error as TokenValidationError;
    tokenError.code = tokenError.code || 'TOKEN_INVALID';
    throw tokenError;
  }
};

// Main AuthMiddleware class
export class AuthMiddleware {
  private logger: Logger;
  private metricsService: MetricsService;
  private rateLimiter: RateLimiterMemory;

  constructor() {
    // Initialize logger and metrics
    this.logger = new Logger('auth_middleware', {
      additionalMeta: { component: 'authentication' }
    });

    this.metricsService = new MetricsService('auth_middleware', {
      defaultLabels: { service: 'candidate' }
    });

    // Initialize rate limiter
    this.rateLimiter = new RateLimiterMemory({
      points: MAX_AUTH_ATTEMPTS,
      duration: RATE_LIMIT_WINDOW,
      blockDuration: RATE_LIMIT_WINDOW
    });

    // Validate required environment variables
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
  }

  /**
   * Authentication middleware for validating JWT tokens
   */
  public authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      // Apply security headers
      helmet()(req, res, () => {});

      // Rate limiting check
      const clientIp = req.ip;
      await this.rateLimiter.consume(clientIp);

      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        throw new Error('Missing or invalid Authorization header');
      }

      const token = authHeader.split(' ')[1];
      
      // Validate token
      const userPayload = await validateToken(token);
      
      // Attach user payload to request
      req.user = userPayload;

      // Record metrics
      this.metricsService.incrementCounter('auth_success', {
        role: userPayload.role
      });

      // Log successful authentication
      this.logger.info('Authentication successful', {
        userId: userPayload.id,
        role: userPayload.role,
        duration: Date.now() - startTime
      });

      next();
    } catch (error) {
      // Handle rate limiting errors
      if (error.name === 'RateLimiterError') {
        this.logger.warn('Rate limit exceeded', { clientIp: req.ip });
        res.status(429).json({
          error: 'Too many authentication attempts',
          retryAfter: error.msBeforeNext / 1000
        });
        return;
      }

      // Handle token validation errors
      const tokenError = error as TokenValidationError;
      this.logger.error('Authentication failed', error, {
        code: tokenError.code,
        duration: Date.now() - startTime
      });

      this.metricsService.incrementCounter('auth_failure', {
        error: tokenError.code || 'UNKNOWN'
      });

      switch (tokenError.code) {
        case 'TOKEN_EXPIRED':
          res.status(401).json({ error: 'Token has expired' });
          break;
        case 'TOKEN_INVALID':
          res.status(401).json({ error: 'Invalid token' });
          break;
        default:
          res.status(401).json({ error: 'Authentication failed' });
      }
    }
  };

  /**
   * Authorization middleware for role-based access control
   */
  public authorize = (allowedRoles: string[]): RequestHandler => {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const startTime = Date.now();

        if (!req.user) {
          throw new Error('User not authenticated');
        }

        if (!allowedRoles.includes(req.user.role)) {
          throw new Error('Insufficient permissions');
        }

        // Record authorization metrics
        this.metricsService.incrementCounter('authorization_success', {
          role: req.user.role
        });

        // Log successful authorization
        this.logger.info('Authorization successful', {
          userId: req.user.id,
          role: req.user.role,
          allowedRoles,
          duration: Date.now() - startTime
        });

        next();
      } catch (error) {
        this.logger.error('Authorization failed', error, {
          userId: req.user?.id,
          role: req.user?.role,
          allowedRoles
        });

        this.metricsService.incrementCounter('authorization_failure', {
          role: req.user?.role || 'unknown'
        });

        res.status(403).json({ error: 'Insufficient permissions' });
      }
    };
  };
}
```

This implementation provides a robust authentication middleware with the following key features:

1. Comprehensive JWT token validation with security checks
2. Rate limiting to prevent brute force attacks
3. Security headers using helmet
4. Detailed logging and metrics collection
5. Role-based authorization
6. Proper error handling with specific status codes
7. Type safety with TypeScript
8. Environment variable validation
9. Performance monitoring
10. Secure token extraction and validation

The code follows best practices for security and maintainability while addressing all requirements from the technical specification. It integrates with the provided Logger and MetricsService utilities for comprehensive monitoring and debugging capabilities.

The middleware can be used in the candidate service routes like this:

```typescript
const authMiddleware = new AuthMiddleware();

// Protect routes with authentication
router.use(authMiddleware.authenticate);

// Protect specific routes with role-based authorization
router.get('/sensitive-data', 
  authMiddleware.authorize(['admin', 'recruiter']), 
  sensitiveDataController
);