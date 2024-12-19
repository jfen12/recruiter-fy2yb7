// External dependencies
// ioredis v5.3.2 - Enterprise-grade Redis client
import Redis, { RedisOptions, ClusterOptions } from 'ioredis';

// Internal dependencies
import { Logger } from '../../../shared/utils/logger';

// Environment configuration with secure defaults
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_DB = parseInt(process.env.REDIS_DB || '0');
const REDIS_KEY_PREFIX = 'crm:';
const REDIS_TLS_ENABLED = process.env.REDIS_TLS_ENABLED === 'true';
const REDIS_SENTINEL_ENABLED = process.env.REDIS_SENTINEL_ENABLED === 'true';
const REDIS_CLUSTER_ENABLED = process.env.REDIS_CLUSTER_ENABLED === 'true';

// Constants for configuration
const CONNECTION_TIMEOUT = 5000; // 5 seconds
const MAX_RETRIES = 10;
const RETRY_DELAY = 1000; // 1 second
const KEEP_ALIVE = 30000; // 30 seconds
const MAX_RECONNECT_ATTEMPTS = 20;
const COMMAND_TIMEOUT = 3000; // 3 seconds

/**
 * Returns enhanced Redis configuration options with performance optimizations and security settings
 */
export function getRedisConfig(): RedisOptions {
  const baseConfig: RedisOptions = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    db: REDIS_DB,
    keyPrefix: REDIS_KEY_PREFIX,
    connectionTimeout: CONNECTION_TIMEOUT,
    commandTimeout: COMMAND_TIMEOUT,
    keepAlive: KEEP_ALIVE,
    retryStrategy: (times: number) => {
      if (times > MAX_RETRIES) {
        return null; // Stop retrying
      }
      return Math.min(times * RETRY_DELAY, 5000);
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    disconnectTimeout: 2000,
    lazyConnect: true,
    showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
  };

  // Configure TLS if enabled
  if (REDIS_TLS_ENABLED) {
    baseConfig.tls = {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    };
  }

  // Configure Sentinel if enabled
  if (REDIS_SENTINEL_ENABLED) {
    baseConfig.sentinels = [
      { host: REDIS_HOST, port: REDIS_PORT }
    ];
    baseConfig.name = 'mymaster';
    baseConfig.sentinelRetryStrategy = (times: number) => {
      if (times > MAX_RETRIES) return null;
      return Math.min(times * 100, 3000);
    };
  }

  // Configure Cluster if enabled
  if (REDIS_CLUSTER_ENABLED) {
    return {
      ...baseConfig,
      clusterRetryStrategy: (times: number) => {
        if (times > MAX_RETRIES) return null;
        return Math.min(times * 100, 3000);
      },
      scaleReads: 'slave',
      maxRedirections: 16,
      natMap: process.env.REDIS_NAT_MAP ? JSON.parse(process.env.REDIS_NAT_MAP) : undefined
    } as ClusterOptions;
  }

  return baseConfig;
}

/**
 * Creates and configures a new Redis client instance with advanced error handling and monitoring
 */
export function createRedisClient(options: RedisOptions = getRedisConfig()): Redis {
  const client = new Redis(options);
  const logger = new Logger('RedisClient');

  // Configure event handlers
  client.on('connect', () => {
    logger.info('Redis client connected successfully');
  });

  client.on('ready', () => {
    logger.info('Redis client ready to accept commands');
  });

  client.on('error', (error) => {
    logger.error('Redis client encountered an error', error);
  });

  client.on('close', () => {
    logger.warn('Redis client connection closed');
  });

  client.on('reconnecting', (delay: number) => {
    logger.info(`Redis client reconnecting in ${delay}ms`);
  });

  client.on('end', () => {
    logger.info('Redis client connection ended');
  });

  return client;
}

/**
 * Enhanced service class for managing Redis operations with advanced features and monitoring
 */
export class RedisService {
  private client: Redis;
  private logger: Logger;
  private connectionRetries: number = 0;
  private isConnected: boolean = false;
  private metrics: Map<string, any> = new Map();

  constructor(options: RedisOptions = getRedisConfig()) {
    this.logger = new Logger('RedisService');
    this.client = createRedisClient(options);
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.metrics.set('operations', 0);
    this.metrics.set('errors', 0);
    this.metrics.set('lastError', null);
    this.metrics.set('connectionAttempts', 0);
    this.metrics.set('lastConnected', null);
  }

  /**
   * Establishes connection to Redis with advanced error handling and monitoring
   */
  public async connect(): Promise<void> {
    try {
      this.metrics.set('connectionAttempts', this.connectionRetries + 1);

      if (this.isConnected) {
        this.logger.warn('Redis connection already established');
        return;
      }

      await this.client.connect();
      this.isConnected = true;
      this.connectionRetries = 0;
      this.metrics.set('lastConnected', new Date());
      this.logger.info('Successfully connected to Redis');

    } catch (error) {
      this.connectionRetries++;
      this.metrics.set('errors', this.metrics.get('errors') + 1);
      this.metrics.set('lastError', new Date());
      
      this.logger.error('Failed to connect to Redis', error as Error);

      if (this.connectionRetries > MAX_RECONNECT_ATTEMPTS) {
        throw new Error('Maximum Redis connection attempts exceeded');
      }

      // Implement exponential backoff
      const delay = Math.min(1000 * Math.pow(2, this.connectionRetries), 30000);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.connect();
    }
  }

  /**
   * Gracefully closes Redis connection with proper cleanup
   */
  public async disconnect(): Promise<void> {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis connection already closed');
        return;
      }

      await this.client.quit();
      this.isConnected = false;
      this.logger.info('Successfully disconnected from Redis');

    } catch (error) {
      this.logger.error('Error disconnecting from Redis', error as Error);
      throw error;
    } finally {
      this.metrics.clear();
      this.connectionRetries = 0;
    }
  }

  /**
   * Returns the Redis client instance for direct operations
   */
  public getClient(): Redis {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }
    return this.client;
  }

  /**
   * Returns current metrics for monitoring
   */
  public getMetrics(): Map<string, any> {
    return new Map(this.metrics);
  }
}