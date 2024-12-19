/**
 * @fileoverview Enhanced authentication middleware for the requisition service
 * @version 1.0.0
 * @package RefactorTrack
 */

import { Request, Response, NextFunction, RequestHandler } from 'express'; // v4.18.0
import jwt from 'jsonwebtoken'; // v9.0.0
import { RateLimiterRedis } from 'rate-limiter-flexible'; // v2.4.1
import { createClient } from 'redis'; // v4.0.0
import { ApiResponse } from '../../../shared/types/common.types';
import { Logger } from '../../../shared/utils/logger';

// Initialize logger
const logger = new Logger('requisition-auth-middleware', {
  enableConsole: true,
  enableFile: true,
  additionalMeta: { component: 'auth' }
});

// Initialize Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries: number) => Math.min(retries * 100, 3000)
  }
});

redisClient.on('error', (err) => logger.error('Redis client error', err));

// Configure rate limiter
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'ratelimit_auth',
  points: 10, // Number of requests
  duration: 1, // Per second
  blockDuration: 60 // Block for 1 minute if exceeded
});

// Type definitions
interface DecodedToken {
  userId: string;
  role: string;
  exp: number;
  iat: number;
}

interface AuthOptions {
  requireAuth?: boolean;
  checkBlacklist?: boolean;
}

// Role hierarchy configuration
const ROLE_HIERARCHY: Record<string, string[]> = {
  admin: ['sales_rep', 'recruiter'],
  sales_rep: ['recruiter']
};

/**
 * Validates JWT token with caching and blacklist checking
 * @param token - JWT token to validate
 * @param checkBlacklist - Whether to check token blacklist
 * @returns Decoded token payload or null if invalid
 */
export async function validateToken(
  token: string,
  checkBlacklist: boolean = true
): Promise<DecodedToken | null> {
  try {
    // Check token cache
    const cachedToken = await redisClient.get(`token:${token}`);
    if (cachedToken) {
      return JSON.parse(cachedToken);
    }

    // Check blacklist if required
    if (checkBlacklist) {
      const isBlacklisted = await redisClient.get(`blacklist:${token}`);
      if (isBlacklisted) {
        logger.warn('Attempt to use blacklisted token', { token: token.substring(0, 10) });
        return null;
      }
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    
    // Cache valid token
    await redisClient.setEx(
      `token:${token}`,
      60 * 5, // Cache for 5 minutes
      JSON.stringify(decoded)
    );

    return decoded;
  } catch (error) {
    logger.error('Token validation failed', error as Error);
    return null;
  }
}

/**
 * Checks if user role has required permissions
 * @param allowedRoles - Array of roles that have access
 * @param userRole - User's current role
 * @returns Whether user has required role
 */
export function checkRole(allowedRoles: string[], userRole: string): boolean {
  // Direct role match
  if (allowedRoles.includes(userRole)) {
    return true;
  }

  // Check inherited roles
  return allowedRoles.some(role => 
    ROLE_HIERARCHY[userRole]?.includes(role)
  );
}

/**
 * Enhanced authentication middleware
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Next middleware function
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Apply rate limiting
    await rateLimiter.consume(req.ip);

    // Extract token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      const response: ApiResponse<null> = {
        status: 401,
        message: 'No authentication token provided',
        data: null,
        errors: ['Authentication required'],
        metadata: {},
        pagination: null
      };
      res.status(401).json(response);
      return;
    }

    // Validate token
    const decoded = await validateToken(token);
    if (!decoded) {
      const response: ApiResponse<null> = {
        status: 401,
        message: 'Invalid or expired token',
        data: null,
        errors: ['Token validation failed'],
        metadata: {},
        pagination: null
      };
      res.status(401).json(response);
      return;
    }

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      role: decoded.role
    };

    logger.info('Authentication successful', {
      userId: decoded.userId,
      role: decoded.role
    });

    next();
  } catch (error) {
    if (error.name === 'RateLimiterError') {
      const response: ApiResponse<null> = {
        status: 429,
        message: 'Too many authentication attempts',
        data: null,
        errors: ['Rate limit exceeded'],
        metadata: {},
        pagination: null
      };
      res.status(429).json(response);
      return;
    }

    logger.error('Authentication error', error as Error);
    const response: ApiResponse<null> = {
      status: 500,
      message: 'Internal server error during authentication',
      data: null,
      errors: ['Authentication failed'],
      metadata: {},
      pagination: null
    };
    res.status(500).json(response);
  }
}

/**
 * Role-based access control middleware factory
 * @param roles - Array of allowed roles
 * @param options - Additional options for role checking
 * @returns Express middleware function
 */
export function requireRole(
  roles: string[],
  options: AuthOptions = {}
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        const response: ApiResponse<null> = {
          status: 401,
          message: 'Authentication required',
          data: null,
          errors: ['User not authenticated'],
          metadata: {},
          pagination: null
        };
        res.status(401).json(response);
        return;
      }

      // Check role permissions
      if (!checkRole(roles, req.user.role)) {
        logger.warn('Unauthorized access attempt', {
          userId: req.user.id,
          role: req.user.role,
          requiredRoles: roles
        });

        const response: ApiResponse<null> = {
          status: 403,
          message: 'Insufficient permissions',
          data: null,
          errors: ['Role validation failed'],
          metadata: {},
          pagination: null
        };
        res.status(403).json(response);
        return;
      }

      logger.info('Role validation successful', {
        userId: req.user.id,
        role: req.user.role,
        access: 'granted'
      });

      next();
    } catch (error) {
      logger.error('Role validation error', error as Error);
      const response: ApiResponse<null> = {
        status: 500,
        message: 'Internal server error during role validation',
        data: null,
        errors: ['Role checking failed'],
        metadata: {},
        pagination: null
      };
      res.status(500).json(response);
    }
  };
}

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}
```

This implementation provides a robust authentication middleware with the following features:

1. JWT token validation with Redis caching for performance optimization
2. Role-based access control with role hierarchy support
3. Rate limiting to prevent brute force attacks
4. Comprehensive security logging
5. Token blacklist checking
6. Type-safe implementation using TypeScript
7. Standardized API responses using shared types
8. Redis-based session management
9. Detailed error handling and logging
10. Performance optimizations through caching

The middleware can be used in routes like this:

```typescript
// Protect route with authentication
router.get('/requisitions', authMiddleware, requireRole(['admin', 'sales_rep']), ...);

// Protect route with specific role
router.post('/requisitions', authMiddleware, requireRole(['admin']), ...);