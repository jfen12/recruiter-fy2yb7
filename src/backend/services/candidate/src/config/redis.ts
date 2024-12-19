// External dependencies
// ioredis v5.3.0 - Redis client with cluster support
import Redis, { RedisOptions, ClusterOptions } from 'ioredis';

// Internal dependencies
import { Logger } from '../../shared/utils/logger';
import { MetricsService } from '../../shared/utils/metrics';

// Environment variables with secure defaults
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_DB = Number(process.env.REDIS_DB) || 0;
const REDIS_CLUSTER_ENABLED = process.env.REDIS_CLUSTER_ENABLED === 'true';
const REDIS_CLUSTER_NODES = process.env.REDIS_CLUSTER_NODES?.split(',') || [];
const REDIS_SSL_ENABLED = process.env.REDIS_SSL_ENABLED === 'true';
const REDIS_MAX_RETRIES = Number(process.env.REDIS_MAX_RETRIES) || 3;
const REDIS_RETRY_DELAY = Number(process.env.REDIS_RETRY_DELAY) || 1000;
const REDIS_POOL_SIZE = Number(process.env.REDIS_POOL_SIZE) || 10;
const DEFAULT_TTL = 15 * 60; // 15 minutes in seconds

// Types for enhanced type safety
interface ConnectionPool {
  size: number;
  available: number;
  busy: number;
}

interface CircuitBreaker {
  failures: number;
  lastFailure: Date | null;
  isOpen: boolean;
  resetTimeout: number;
}

interface HealthCheck {
  lastCheck: Date | null;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
}

// Redis configuration class
export class RedisConfig {
  private client: Redis;
  private logger: Logger;
  private metrics: MetricsService;
  private options: RedisOptions | ClusterOptions;
  private pool: ConnectionPool;
  private circuitBreaker: CircuitBreaker;
  private healthCheck: HealthCheck;

  constructor(options?: RedisOptions | ClusterOptions) {
    this.logger = new Logger('redis_config');
    this.metrics = new MetricsService('redis_cache');
    
    this.options = this.buildRedisOptions(options);
    
    this.pool = {
      size: REDIS_POOL_SIZE,
      available: REDIS_POOL_SIZE,
      busy: 0
    };

    this.circuitBreaker = {
      failures: 0,
      lastFailure: null,
      isOpen: false,
      resetTimeout: 30000 // 30 seconds
    };

    this.healthCheck = {
      lastCheck: null,
      status: 'healthy',
      latency: 0
    };
  }

  private buildRedisOptions(options?: RedisOptions | ClusterOptions): RedisOptions | ClusterOptions {
    const baseOptions = {
      password: REDIS_PASSWORD,
      db: REDIS_DB,
      retryStrategy: (times: number) => {
        if (times > REDIS_MAX_RETRIES) {
          this.handleConnectionFailure();
          return null;
        }
        return Math.min(times * REDIS_RETRY_DELAY, 5000);
      },
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      ...options
    };

    if (REDIS_SSL_ENABLED) {
      baseOptions.tls = {
        rejectUnauthorized: true
      };
    }

    if (REDIS_CLUSTER_ENABLED) {
      return {
        ...baseOptions,
        clusters: REDIS_CLUSTER_NODES.map(node => {
          const [host, port] = node.split(':');
          return { host, port: Number(port) };
        }),
        scaleReads: 'slave',
        clusterRetryStrategy: baseOptions.retryStrategy
      } as ClusterOptions;
    }

    return {
      ...baseOptions,
      host: REDIS_HOST,
      port: REDIS_PORT,
      connectTimeout: 10000,
      lazyConnect: true
    } as RedisOptions;
  }

  private handleConnectionFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailure = new Date();
    
    if (this.circuitBreaker.failures >= 3) {
      this.circuitBreaker.isOpen = true;
      this.healthCheck.status = 'unhealthy';
      this.logger.error('Redis circuit breaker opened due to multiple failures');
      
      setTimeout(() => {
        this.circuitBreaker.isOpen = false;
        this.circuitBreaker.failures = 0;
        this.logger.info('Redis circuit breaker reset');
      }, this.circuitBreaker.resetTimeout);
    }
  }

  private async performHealthCheck(): Promise<void> {
    const start = Date.now();
    try {
      await this.client.ping();
      this.healthCheck.latency = Date.now() - start;
      this.healthCheck.status = 'healthy';
      this.healthCheck.lastCheck = new Date();
      
      this.metrics.setGauge('redis_health_check_latency', this.healthCheck.latency);
      this.metrics.incrementCounter('redis_health_check_success');
    } catch (error) {
      this.healthCheck.status = 'degraded';
      this.logger.error('Redis health check failed', error as Error);
      this.metrics.incrementCounter('redis_health_check_failure');
    }
  }

  public async connect(): Promise<void> {
    try {
      this.client = REDIS_CLUSTER_ENABLED
        ? new Redis.Cluster(REDIS_CLUSTER_NODES, this.options as ClusterOptions)
        : new Redis(this.options as RedisOptions);

      // Set up event handlers
      this.client.on('connect', () => {
        this.logger.info('Redis connection established');
        this.metrics.incrementCounter('redis_connection_success');
      });

      this.client.on('error', (error) => {
        this.logger.error('Redis connection error', error);
        this.metrics.incrementCounter('redis_connection_error');
      });

      this.client.on('ready', () => {
        this.logger.info('Redis client ready');
        this.metrics.incrementCounter('redis_client_ready');
      });

      // Start health checks
      setInterval(() => this.performHealthCheck(), 30000);

      await this.client.ping();
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error as Error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      this.logger.info('Redis connection closed');
      this.metrics.incrementCounter('redis_connection_closed');
    } catch (error) {
      this.logger.error('Error disconnecting from Redis', error as Error);
      throw error;
    }
  }
}

// Factory function for creating Redis client
export const createRedisClient = async (options?: RedisOptions): Promise<Redis> => {
  const config = new RedisConfig(options);
  await config.connect();
  return config['client'];
};

// Initialize cache with monitoring
export const initializeCache = async (options?: RedisOptions): Promise<Redis> => {
  const config = new RedisConfig(options);
  await config.connect();
  return config['client'];
};