// External dependencies
import jwt from 'jsonwebtoken'; // v9.0.0
import bcrypt from 'bcrypt'; // v5.1.0
import { Request, Response } from 'express'; // v4.18.0
import { RateLimiterRedis } from 'rate-limiter-flexible'; // v2.4.1

// Internal dependencies
import { RedisConfig } from '../config/redis';
import { SecurityService } from '../utils/security';
import { Logger } from '../../../shared/utils/logger';

// Constants
const ACCESS_TOKEN_EXPIRY = 60 * 60; // 1 hour in seconds
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds
const SESSION_IDLE_TIMEOUT = 30 * 60; // 30 minutes in seconds
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_BLOCK_DURATION = 15 * 60; // 15 minutes in seconds
const TOKEN_BLACKLIST_EXPIRY = 24 * 60 * 60; // 24 hours in seconds

// Types
interface LoginCredentials {
  email: string;
  password: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthResponse extends TokenPair {
  userId: string;
  roles: string[];
  sessionId: string;
}

interface SessionData {
  userId: string;
  roles: string[];
  ipAddress: string;
  lastActivity: number;
  refreshToken: string;
}

export class AuthService {
  private redisClient: RedisConfig;
  private clusterClient: RedisConfig;
  private securityService: SecurityService;
  private logger: Logger;
  private loginRateLimiter: RateLimiterRedis;

  constructor() {
    this.logger = new Logger('auth-service', {
      enableConsole: true,
      enableFile: true
    });

    // Initialize Redis clients
    this.redisClient = new RedisConfig({
      keyPrefix: 'auth:',
      replicationEnabled: true
    });

    this.clusterClient = new RedisConfig({
      cluster: true,
      keyPrefix: 'auth:sessions:'
    });

    // Initialize security service
    this.securityService = new SecurityService();

    // Configure rate limiter
    this.initializeRateLimiter();

    this.logger.info('AuthService initialized successfully');
  }

  private async initializeRateLimiter(): Promise<void> {
    const client = await this.redisClient.getClient();
    
    this.loginRateLimiter = new RateLimiterRedis({
      storeClient: client,
      keyPrefix: 'login_attempts:',
      points: MAX_LOGIN_ATTEMPTS,
      duration: LOGIN_BLOCK_DURATION,
      blockDuration: LOGIN_BLOCK_DURATION
    });
  }

  private async generateTokenPair(userId: string, roles: string[]): Promise<TokenPair> {
    const accessToken = jwt.sign(
      { userId, roles },
      process.env.JWT_SECRET!,
      {
        expiresIn: ACCESS_TOKEN_EXPIRY,
        audience: process.env.JWT_AUDIENCE,
        issuer: process.env.JWT_ISSUER
      }
    );

    const refreshToken = await this.securityService.generateSecureToken();

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY
    };
  }

  private async storeSession(
    sessionId: string,
    sessionData: SessionData
  ): Promise<void> {
    const client = await this.clusterClient.getClient();
    await client.setex(
      `session:${sessionId}`,
      SESSION_IDLE_TIMEOUT,
      JSON.stringify(sessionData)
    );
  }

  private async invalidateSession(sessionId: string): Promise<void> {
    const client = await this.clusterClient.getClient();
    await client.del(`session:${sessionId}`);
  }

  private async addToBlacklist(token: string): Promise<void> {
    const client = await this.redisClient.getClient();
    await client.setex(
      `blacklist:${token}`,
      TOKEN_BLACKLIST_EXPIRY,
      '1'
    );
  }

  public async login(
    credentials: LoginCredentials,
    ipAddress: string
  ): Promise<AuthResponse> {
    try {
      // Check rate limiting
      await this.loginRateLimiter.consume(ipAddress);

      // Validate password strength
      await this.securityService.validatePasswordStrength(credentials.password);

      // Verify credentials (mock implementation - replace with actual DB check)
      const user = await this.verifyCredentials(credentials);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Generate tokens
      const { accessToken, refreshToken, expiresIn } = await this.generateTokenPair(
        user.id,
        user.roles
      );

      // Create session
      const sessionId = await this.securityService.generateSecureToken();
      const sessionData: SessionData = {
        userId: user.id,
        roles: user.roles,
        ipAddress,
        lastActivity: Date.now(),
        refreshToken
      };

      await this.storeSession(sessionId, sessionData);

      this.logger.info('User logged in successfully', {
        userId: user.id,
        ipAddress,
        sessionId
      });

      return {
        userId: user.id,
        roles: user.roles,
        sessionId,
        accessToken,
        refreshToken,
        expiresIn
      };
    } catch (error) {
      this.logger.error('Login failed', error as Error);
      throw error;
    }
  }

  public async logout(userId: string, sessionId: string): Promise<void> {
    try {
      // Invalidate session
      await this.invalidateSession(sessionId);

      // Get session data to blacklist tokens
      const client = await this.clusterClient.getClient();
      const sessionData = await client.get(`session:${sessionId}`);
      
      if (sessionData) {
        const { accessToken, refreshToken } = JSON.parse(sessionData);
        await Promise.all([
          this.addToBlacklist(accessToken),
          this.addToBlacklist(refreshToken)
        ]);
      }

      this.logger.info('User logged out successfully', { userId, sessionId });
    } catch (error) {
      this.logger.error('Logout failed', error as Error);
      throw error;
    }
  }

  public async refreshToken(
    refreshToken: string,
    ipAddress: string
  ): Promise<TokenPair> {
    try {
      // Validate refresh token
      const isValid = await this.securityService.validateToken(refreshToken, {
        ignoreExpiration: false
      });

      if (!isValid.valid) {
        throw new Error('Invalid refresh token');
      }

      const userId = isValid.decoded.userId;
      const roles = isValid.decoded.roles;

      // Generate new token pair
      const tokens = await this.generateTokenPair(userId, roles);

      // Update session
      const sessionId = await this.securityService.generateSecureToken();
      const sessionData: SessionData = {
        userId,
        roles,
        ipAddress,
        lastActivity: Date.now(),
        refreshToken: tokens.refreshToken
      };

      await this.storeSession(sessionId, sessionData);

      // Blacklist old refresh token
      await this.addToBlacklist(refreshToken);

      this.logger.info('Token refreshed successfully', { userId, sessionId });

      return tokens;
    } catch (error) {
      this.logger.error('Token refresh failed', error as Error);
      throw error;
    }
  }

  public async validateSession(
    userId: string,
    sessionId: string,
    ipAddress: string
  ): Promise<boolean> {
    try {
      const client = await this.clusterClient.getClient();
      const sessionData = await client.get(`session:${sessionId}`);

      if (!sessionData) {
        return false;
      }

      const session: SessionData = JSON.parse(sessionData);

      // Validate session
      if (
        session.userId !== userId ||
        session.ipAddress !== ipAddress ||
        Date.now() - session.lastActivity > SESSION_IDLE_TIMEOUT * 1000
      ) {
        await this.invalidateSession(sessionId);
        return false;
      }

      // Update last activity
      session.lastActivity = Date.now();
      await this.storeSession(sessionId, session);

      return true;
    } catch (error) {
      this.logger.error('Session validation failed', error as Error);
      return false;
    }
  }

  // Mock method - replace with actual DB implementation
  private async verifyCredentials(
    credentials: LoginCredentials
  ): Promise<{ id: string; roles: string[] } | null> {
    // This is a mock implementation
    return {
      id: '123',
      roles: ['user']
    };
  }
}

export default new AuthService();