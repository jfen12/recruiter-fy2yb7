// External dependencies
import { Request, Response, NextFunction } from 'express'; // v4.18.0
import jwt from 'jsonwebtoken'; // v9.0.0
import { CircuitBreaker } from 'circuit-breaker-ts'; // v1.0.0

// Internal dependencies
import { AuthService } from '../services/authService';
import { SecurityService } from '../utils/security';
import { RedisConfig } from '../config/redis';
import { Logger } from '../../../shared/utils/logger';

// Constants
const PUBLIC_ROUTES = ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/forgot-password'];
const TOKEN_HEADER = process.env.TOKEN_HEADER || 'Authorization';
const TOKEN_PREFIX = process.env.TOKEN_PREFIX || 'Bearer';
const RATE_LIMIT_WINDOW = process.env.RATE_LIMIT_WINDOW || 60000;
const RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS || 1000;

// Types
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    roles: string[];
    sessionId: string;
  };
}

/**
 * Enhanced token extraction with validation and sanitization
 */
const extractToken = (req: Request): string | null => {
  const authHeader = req.header(TOKEN_HEADER);
  if (!authHeader || !authHeader.startsWith(TOKEN_PREFIX)) {
    return null;
  }

  // Extract and sanitize token
  const token = authHeader.slice(TOKEN_PREFIX.length + 1).trim();
  if (!token || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) {
    return null;
  }

  return token;
};

/**
 * Enhanced middleware class handling request authentication, session validation,
 * and security controls with circuit breaker pattern
 */
export class AuthMiddleware {
  private authService: AuthService;
  private securityService: SecurityService;
  private redisConfig: RedisConfig;
  private logger: Logger;
  private circuitBreaker: CircuitBreaker;

  constructor() {
    this.logger = new Logger('auth-middleware', {
      enableConsole: true,
      enableFile: true
    });

    this.authService = new AuthService();
    this.securityService = new SecurityService();
    this.redisConfig = new RedisConfig({
      cluster: true,
      keyPrefix: 'auth:sessions:'
    });

    // Initialize circuit breaker for token validation
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 30000,
      onOpen: () => this.logger.warn('Circuit breaker opened for token validation'),
      onClose: () => this.logger.info('Circuit breaker closed for token validation')
    });

    this.logger.info('AuthMiddleware initialized successfully');
  }

  /**
   * Enhanced Express middleware function with comprehensive security controls
   */
  public authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Skip authentication for public routes
      if (PUBLIC_ROUTES.includes(req.path)) {
        return next();
      }

      // Apply rate limiting
      await this.securityService.applyRateLimiting(req.ip, {
        points: Number(RATE_LIMIT_MAX_REQUESTS),
        duration: Number(RATE_LIMIT_WINDOW)
      });

      // Sanitize request
      await this.securityService.sanitizeRequest(req);

      // Extract and validate token
      const token = extractToken(req);
      if (!token) {
        res.status(401).json({ error: 'No authentication token provided' });
        return;
      }

      // Validate token using circuit breaker
      const tokenValidation = await this.circuitBreaker.execute(async () => {
        return await this.authService.validateTokenWithCache(token);
      });

      if (!tokenValidation.valid) {
        res.status(401).json({ error: tokenValidation.error || 'Invalid token' });
        return;
      }

      const { userId, roles, sessionId } = tokenValidation.decoded;

      // Validate session in Redis cluster
      const sessionValid = await this.authService.validateSession(
        userId,
        sessionId,
        req.ip
      );

      if (!sessionValid) {
        res.status(401).json({ error: 'Session expired or invalid' });
        return;
      }

      // Check for force logout flag
      const forceLogout = await this.authService.handleForceLogout(userId, sessionId);
      if (forceLogout) {
        res.status(401).json({ error: 'Session terminated by administrator' });
        return;
      }

      // Attach user information to request
      req.user = {
        id: userId,
        roles,
        sessionId
      };

      // Apply security headers
      res.set(this.securityService.getSecurityHeaders());

      // Log security event
      this.logger.info('Authentication successful', {
        userId,
        sessionId,
        path: req.path,
        method: req.method
      });

      next();
    } catch (error) {
      this.logger.error('Authentication failed', error as Error);
      res.status(500).json({ error: 'Authentication service error' });
    }
  };

  /**
   * Enhanced token refresh handling with validation and rotation
   */
  public handleTokenRefresh = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const refreshToken = req.body.refreshToken;
      if (!refreshToken) {
        res.status(400).json({ error: 'No refresh token provided' });
        return;
      }

      const newTokens = await this.authService.refreshToken(refreshToken, req.ip);

      // Apply security headers
      res.set(this.securityService.getSecurityHeaders());

      res.json({
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresIn: newTokens.expiresIn
      });
    } catch (error) {
      this.logger.error('Token refresh failed', error as Error);
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  };
}

// Export singleton instance
export const authMiddleware = new AuthMiddleware();