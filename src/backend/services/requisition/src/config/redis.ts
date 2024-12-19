// External dependencies
// ioredis v5.3.2 - Redis client with TypeScript support
import Redis from 'ioredis';
import { Logger } from '../../../shared/utils/logger';

// Initialize logger for Redis configuration
const logger = new Logger('RedisConfig', {
  additionalMeta: { component: 'redis-config' }
});

// Environment variables with secure defaults
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_DB = parseInt(process.env.REDIS_DB || '0');
const REDIS_KEY_PREFIX = 'requisition:';
const REDIS_TLS_ENABLED = process.env.REDIS_TLS_ENABLED === 'true';
const REDIS_MAX_RETRIES = parseInt(process.env.REDIS_MAX_RETRIES || '3');
const REDIS_RETRY_INTERVAL = parseInt(process.env.REDIS_RETRY_INTERVAL || '1000');
const REDIS_CONNECTION_TIMEOUT = parseInt(process.env.REDIS_CONNECTION_TIMEOUT || '5000');

// Interface definitions
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  tls?: boolean;
  connectTimeout: number;
  maxRetriesPerRequest: number;
  retryStrategy: (times: number) => number | void;
  enableReadyCheck: boolean;
  enableOfflineQueue: boolean;
  connectionName: string;
  lazyConnect: boolean;
}

export interface RedisHealthCheck {
  status: string;
  latency: number;
  connectedClients: number;
  usedMemory: number;
}

/**
 * Retrieves Redis configuration from environment variables with security and performance options
 */
const getRedisConfig = (): RedisConfig => {
  const config: RedisConfig = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    db: REDIS_DB,
    keyPrefix: REDIS_KEY_PREFIX,
    connectTimeout: REDIS_CONNECTION_TIMEOUT,
    maxRetriesPerRequest: REDIS_MAX_RETRIES,
    enableReadyCheck: true,
    enableOfflineQueue: true,
    connectionName: 'requisition-service',
    lazyConnect: true,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * REDIS_RETRY_INTERVAL, 5000);
      logger.info(`Retrying Redis connection attempt ${times}`, { delay });
      return delay;
    }
  };

  // Add password only if provided
  if (REDIS_PASSWORD) {
    config.password = REDIS_PASSWORD;
  }

  // Configure TLS if enabled
  if (REDIS_TLS_ENABLED) {
    config.tls = true;
  }

  return config;
};

/**
 * Creates and configures a new Redis client instance with enhanced error handling and monitoring
 */
const createRedisClient = (config: RedisConfig): Redis => {
  const client = new Redis(config);

  // Connection event handlers
  client.on('connect', () => {
    logger.info('Redis client connected successfully');
  });

  client.on('ready', () => {
    logger.info('Redis client ready for operations');
  });

  client.on('error', (error) => {
    logger.error('Redis client encountered an error', error);
  });

  client.on('close', () => {
    logger.warn('Redis connection closed');
  });

  client.on('reconnecting', (delay: number) => {
    logger.info(`Redis client reconnecting in ${delay}ms`);
  });

  // Monitor client events for performance metrics
  client.on('monitor', (time: string, args: any[]) => {
    logger.debug('Redis command executed', {
      time,
      command: args[0],
      arguments: args.slice(1)
    });
  });

  return client;
};

/**
 * Performs health check on Redis connection with detailed metrics
 */
export const checkRedisHealth = async (client: Redis): Promise<RedisHealthCheck> => {
  try {
    const startTime = Date.now();
    await client.ping();
    const latency = Date.now() - startTime;

    const info = await client.info();
    const infoLines = info.split('\n');
    const connectedClients = parseInt(infoLines.find(line => line.startsWith('connected_clients'))?.split(':')[1] || '0');
    const usedMemory = parseInt(infoLines.find(line => line.startsWith('used_memory'))?.split(':')[1] || '0');

    return {
      status: 'healthy',
      latency,
      connectedClients,
      usedMemory
    };
  } catch (error) {
    logger.error('Redis health check failed', error as Error);
    return {
      status: 'unhealthy',
      latency: -1,
      connectedClients: 0,
      usedMemory: 0
    };
  }
};

// Initialize Redis client with configuration
const config = getRedisConfig();
export const redisClient = createRedisClient(config);

// Handle process termination
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing Redis connection');
  await redisClient.quit();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing Redis connection');
  await redisClient.quit();
});