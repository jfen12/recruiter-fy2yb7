// External dependencies
// ioredis v5.3.2 - Redis client library with cluster and sentinel support
import Redis, { RedisOptions } from 'ioredis';

// Internal dependencies
import { Logger } from '../../../shared/utils/logger';

// Environment variables with secure defaults
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_DB = parseInt(process.env.REDIS_DB || '0');
const REDIS_KEY_PREFIX = process.env.REDIS_KEY_PREFIX || 'refactortrack:gateway:';
const REDIS_SENTINEL_NODES = process.env.REDIS_SENTINEL_NODES?.split(',') || [];
const REDIS_CLUSTER_NODES = process.env.REDIS_CLUSTER_NODES?.split(',') || [];
const REDIS_TLS_ENABLED = process.env.REDIS_TLS_ENABLED === 'true';

// Types for configuration options
interface SessionOptions {
  ttl: number;
  prefix: string;
  replicationEnabled: boolean;
}

interface RateLimitOptions {
  points: number;
  duration: number;
  blockDuration: number;
  prefix: string;
}

interface HealthMetrics {
  lastPing: number;
  connectionErrors: number;
  operationLatency: number[];
  memoryUsage: number;
}

// RedisConfig class implementation
export class RedisConfig {
  private client: Redis;
  private logger: Logger;
  private options: RedisOptions;
  private rateLimiters: Map<string, number>;
  private cacheConfig: Map<string, any>;
  private healthMetrics: HealthMetrics;

  constructor(options: RedisOptions = {}) {
    this.logger = new Logger('RedisConfig', {
      enableConsole: true,
      enableFile: true
    });

    this.options = this.mergeOptions(options);
    this.rateLimiters = new Map();
    this.cacheConfig = new Map();
    this.healthMetrics = {
      lastPing: Date.now(),
      connectionErrors: 0,
      operationLatency: [],
      memoryUsage: 0
    };

    this.client = this.initializeClient();
    this.setupEventHandlers();
    this.startHealthChecks();
  }

  private mergeOptions(options: RedisOptions): RedisOptions {
    const baseOptions: RedisOptions = {
      host: REDIS_HOST,
      port: REDIS_PORT,
      db: REDIS_DB,
      keyPrefix: REDIS_KEY_PREFIX,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(`Redis connection retry attempt ${times} with delay ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      autoResendUnfulfilledCommands: true,
      connectionName: 'refactortrack-gateway',
      lazyConnect: true
    };

    if (REDIS_PASSWORD) {
      baseOptions.password = REDIS_PASSWORD;
    }

    if (REDIS_TLS_ENABLED) {
      baseOptions.tls = {
        rejectUnauthorized: true
      };
    }

    if (REDIS_SENTINEL_NODES.length > 0) {
      baseOptions.sentinels = REDIS_SENTINEL_NODES.map(node => {
        const [host, port] = node.split(':');
        return { host, port: parseInt(port) };
      });
      baseOptions.name = 'mymaster';
    }

    if (REDIS_CLUSTER_NODES.length > 0) {
      baseOptions.cluster = true;
      baseOptions.clusterNodes = REDIS_CLUSTER_NODES.map(node => {
        const [host, port] = node.split(':');
        return { host, port: parseInt(port) };
      });
    }

    return { ...baseOptions, ...options };
  }

  private initializeClient(): Redis {
    const client = new Redis(this.options);
    
    client.on('connect', () => {
      this.logger.info('Redis client connected successfully');
    });

    client.on('error', (error) => {
      this.healthMetrics.connectionErrors++;
      this.logger.error('Redis client error', error);
    });

    client.on('ready', () => {
      this.logger.info('Redis client ready for operations');
    });

    return client;
  }

  private setupEventHandlers(): void {
    this.client.on('node error', (error: Error, node: { host: string; port: number }) => {
      this.logger.error(`Redis node error at ${node.host}:${node.port}`, error);
    });

    this.client.on('reconnecting', () => {
      this.logger.warn('Redis client reconnecting');
    });
  }

  private startHealthChecks(): void {
    setInterval(async () => {
      try {
        const start = Date.now();
        await this.client.ping();
        const latency = Date.now() - start;

        this.healthMetrics.lastPing = Date.now();
        this.healthMetrics.operationLatency.push(latency);
        if (this.healthMetrics.operationLatency.length > 100) {
          this.healthMetrics.operationLatency.shift();
        }

        const info = await this.client.info('memory');
        this.healthMetrics.memoryUsage = parseInt(
          info.match(/used_memory:(\d+)/)?.[1] || '0'
        );
      } catch (error) {
        this.logger.error('Redis health check failed', error as Error);
      }
    }, 30000);
  }

  public async getClient(): Promise<Redis> {
    if (!this.client.status || this.client.status === 'end') {
      throw new Error('Redis client is not connected');
    }
    return this.client;
  }

  public async disconnect(): Promise<void> {
    this.logger.info('Initiating Redis client disconnect');
    try {
      await this.client.quit();
      this.logger.info('Redis client disconnected successfully');
    } catch (error) {
      this.logger.error('Error during Redis client disconnect', error as Error);
      throw error;
    }
  }

  public configureSession(options: SessionOptions): void {
    this.logger.info('Configuring Redis session management', { options });
    
    this.client.config('SET', 'maxmemory-policy', 'volatile-lru');
    
    if (options.replicationEnabled) {
      this.client.config('SET', 'repl-backlog-size', '10mb');
    }

    // Setup session cleanup job
    setInterval(async () => {
      try {
        const pattern = `${options.prefix}:*`;
        const keys = await this.client.keys(pattern);
        for (const key of keys) {
          const ttl = await this.client.ttl(key);
          if (ttl <= 0) {
            await this.client.del(key);
          }
        }
      } catch (error) {
        this.logger.error('Session cleanup job failed', error as Error);
      }
    }, options.ttl * 1000);
  }

  public configureRateLimiting(options: RateLimitOptions): void {
    this.logger.info('Configuring Redis rate limiting', { options });
    
    const scriptLoad = `
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local window = tonumber(ARGV[2])
      local current = tonumber(redis.call('get', key) or '0')
      
      if current > limit then
        return 0
      end
      
      redis.call('incr', key)
      redis.call('expire', key, window)
      
      return limit - current
    `;

    this.client.defineCommand('rateLimit', {
      numberOfKeys: 1,
      lua: scriptLoad
    });

    // Configure adaptive rate limiting based on server load
    setInterval(async () => {
      const avgLatency = this.healthMetrics.operationLatency.reduce(
        (a, b) => a + b, 0
      ) / this.healthMetrics.operationLatency.length;

      if (avgLatency > 100) {
        options.points = Math.floor(options.points * 0.8);
      } else {
        options.points = Math.min(
          options.points * 1.2,
          1000
        );
      }
    }, 60000);
  }

  public getHealthMetrics(): HealthMetrics {
    return { ...this.healthMetrics };
  }
}

// Factory function for creating Redis clients
export const createRedisClient = (options: RedisOptions = {}): Redis => {
  const config = new RedisConfig(options);
  return config.getClient();
};