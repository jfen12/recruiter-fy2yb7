// External dependencies
// crypto - Built-in cryptographic functionality
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
// helmet v7.0.0 - HTTP security headers
import helmet from 'helmet';
// jsonwebtoken v9.0.0 - JWT handling
import jwt from 'jsonwebtoken';
// rate-limiter-flexible v3.0.0 - Advanced rate limiting
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';

// Internal dependencies
import { Logger } from '../../../shared/utils/logger';
import { MetricsService } from '../../../shared/utils/metrics';

// Types
interface EncryptionOptions {
  algorithm?: string;
  keySize?: number;
  ivSize?: number;
}

interface ValidationOptions {
  ignoreExpiration?: boolean;
  audience?: string | string[];
  issuer?: string;
  roles?: string[];
}

interface TokenValidationResult {
  valid: boolean;
  decoded?: any;
  error?: string;
  metadata?: {
    exp: number;
    iat: number;
    roles: string[];
  };
}

interface TokenCache {
  [key: string]: {
    result: TokenValidationResult;
    timestamp: number;
  };
}

// Constants and configurations
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_CACHE_TTL = 300000; // 5 minutes
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_TIMEOUT = 30000; // 30 seconds

// Security decorators
function validateInput(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = async function(...args: any[]) {
    if (!args[0] || typeof args[0] !== 'string') {
      throw new Error('Invalid input: Data must be a non-empty string');
    }
    return originalMethod.apply(this, args);
  };
  return descriptor;
}

function logSecurityEvent(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = async function(...args: any[]) {
    const startTime = Date.now();
    try {
      const result = await originalMethod.apply(this, args);
      this.logger?.info(`Security operation completed: ${propertyKey}`, {
        duration: Date.now() - startTime,
        success: true
      });
      return result;
    } catch (error) {
      this.logger?.error(`Security operation failed: ${propertyKey}`, error as Error);
      throw error;
    }
  };
  return descriptor;
}

// Main SecurityService class
export class SecurityService {
  private logger: Logger;
  private metrics: MetricsService;
  private rateLimiter: RateLimiterMemory;
  private tokenCache: TokenCache = {};
  private circuitBreaker = {
    failures: 0,
    lastFailure: 0,
    isOpen: false
  };

  constructor() {
    this.logger = new Logger('security-service');
    this.metrics = new MetricsService('security-service');
    this.rateLimiter = new RateLimiterMemory({
      points: 100,
      duration: 60,
      blockDuration: 600
    });

    // Clean token cache periodically
    setInterval(() => this.cleanTokenCache(), TOKEN_CACHE_TTL);
  }

  private cleanTokenCache(): void {
    const now = Date.now();
    Object.keys(this.tokenCache).forEach(key => {
      if (now - this.tokenCache[key].timestamp > TOKEN_CACHE_TTL) {
        delete this.tokenCache[key];
      }
    });
  }

  private resetCircuitBreaker(): void {
    setTimeout(() => {
      this.circuitBreaker.isOpen = false;
      this.circuitBreaker.failures = 0;
    }, CIRCUIT_BREAKER_RESET_TIMEOUT);
  }

  @validateInput
  @logSecurityEvent
  public async validateToken(
    token: string,
    options: ValidationOptions = {}
  ): Promise<TokenValidationResult> {
    // Check circuit breaker
    if (this.circuitBreaker.isOpen) {
      throw new Error('Circuit breaker is open');
    }

    // Check rate limiter
    try {
      await this.rateLimiter.consume(token);
    } catch (error) {
      this.metrics.incrementCounter('rate_limit_exceeded');
      throw new Error('Rate limit exceeded');
    }

    // Check token cache
    const cached = this.tokenCache[token];
    if (cached && Date.now() - cached.timestamp < TOKEN_CACHE_TTL) {
      this.metrics.incrementCounter('token_cache_hit');
      return cached.result;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET!, {
        ignoreExpiration: options.ignoreExpiration,
        audience: options.audience,
        issuer: options.issuer
      });

      // Validate roles if specified
      if (options.roles && options.roles.length > 0) {
        const userRoles = (decoded as any).roles || [];
        if (!options.roles.some(role => userRoles.includes(role))) {
          throw new Error('Insufficient role permissions');
        }
      }

      const result: TokenValidationResult = {
        valid: true,
        decoded,
        metadata: {
          exp: (decoded as any).exp,
          iat: (decoded as any).iat,
          roles: (decoded as any).roles || []
        }
      };

      // Cache the result
      this.tokenCache[token] = {
        result,
        timestamp: Date.now()
      };

      this.metrics.incrementCounter('token_validation_success');
      return result;
    } catch (error) {
      this.circuitBreaker.failures++;
      this.circuitBreaker.lastFailure = Date.now();

      if (this.circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
        this.circuitBreaker.isOpen = true;
        this.resetCircuitBreaker();
      }

      this.metrics.incrementCounter('token_validation_failure');
      return {
        valid: false,
        error: (error as Error).message
      };
    }
  }

  public getSecurityHeaders() {
    return helmet({
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
    });
  }
}

// Encryption utilities
@validateInput
@logSecurityEvent
export async function encryptData(
  data: string,
  options: EncryptionOptions = {}
): Promise<string> {
  const algorithm = options.algorithm || 'aes-256-cbc';
  const ivSize = options.ivSize || 16;

  const iv = randomBytes(ivSize);
  const cipher = createCipheriv(algorithm, Buffer.from(ENCRYPTION_KEY!, 'hex'), iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `${iv.toString('hex')}:${encrypted}`;
}

@validateInput
@logSecurityEvent
export async function decryptData(encryptedData: string): Promise<string> {
  const [ivHex, encryptedText] = encryptedData.split(':');
  
  if (!ivHex || !encryptedText) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const decipher = createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY!, 'hex'),
    iv
  );

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Export singleton instance
export const securityService = new SecurityService();