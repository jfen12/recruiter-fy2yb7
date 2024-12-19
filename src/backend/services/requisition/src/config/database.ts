/**
 * @fileoverview Database configuration module for the requisition service
 * Implements secure PostgreSQL connections with TypeORM, including enhanced
 * connection pooling, retry logic, monitoring, and security measures.
 * @version 1.0.0
 * @package RefactorTrack
 */

import { DataSource, DataSourceOptions } from 'typeorm'; // ^0.3.17
import { config } from 'dotenv'; // ^16.3.1
import { Logger } from 'winston'; // ^3.8.2
import { BaseEntity } from '../../../shared/types/common.types';
import { parse as parseUrl } from 'url';

// Load environment variables
config();

// Initialize Winston logger
const logger = new Logger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

/**
 * Database configuration constants with fallback values
 */
const DB_CONFIG = {
  POOL: {
    MIN: parseInt(process.env.DATABASE_POOL_MIN ?? '2', 10),
    MAX: parseInt(process.env.DATABASE_POOL_MAX ?? '10', 10),
    IDLE_TIMEOUT: 10000,
    ACQUIRE_TIMEOUT: 20000
  },
  RETRY: {
    MAX_ATTEMPTS: parseInt(process.env.DATABASE_RETRY_ATTEMPTS ?? '5', 10),
    INITIAL_DELAY: 1000,
    MAX_DELAY: 30000,
    MULTIPLIER: 1.5
  },
  MONITORING: {
    HEALTH_CHECK_INTERVAL: 30000,
    CONNECTION_TIMEOUT: 15000,
    QUERY_TIMEOUT: 10000
  }
};

/**
 * Parse database connection URL and validate required parameters
 * @throws {Error} If required database configuration is missing
 */
function parseDatabaseUrl(): Record<string, string> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const dbUrl = parseUrl(process.env.DATABASE_URL);
  if (!dbUrl.hostname || !dbUrl.pathname) {
    throw new Error('Invalid DATABASE_URL format');
  }

  return {
    host: dbUrl.hostname,
    port: dbUrl.port || '5432',
    database: dbUrl.pathname.slice(1),
    username: dbUrl.auth?.split(':')[0] || '',
    password: dbUrl.auth?.split(':')[1] || ''
  };
}

/**
 * Configure enhanced SSL options with certificate validation
 */
function getSslConfig(): Record<string, any> {
  const sslEnabled = process.env.DATABASE_SSL === 'true';
  if (!sslEnabled) return false;

  return {
    rejectUnauthorized: true,
    ca: process.env.DATABASE_CA_CERT,
    checkServerIdentity: true,
    minVersion: 'TLSv1.2'
  };
}

/**
 * Get comprehensive TypeORM connection options with security and performance configurations
 * @returns {DataSourceOptions} Configured database connection options
 */
function getConnectionOptions(): DataSourceOptions {
  const dbConfig = parseDatabaseUrl();
  const sslConfig = getSslConfig();

  return {
    type: 'postgres',
    host: dbConfig.host,
    port: parseInt(dbConfig.port, 10),
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    ssl: sslConfig,

    // Connection pool configuration
    poolSize: DB_CONFIG.POOL.MAX,
    extra: {
      min: DB_CONFIG.POOL.MIN,
      max: DB_CONFIG.POOL.MAX,
      idleTimeoutMillis: DB_CONFIG.POOL.IDLE_TIMEOUT,
      connectionTimeoutMillis: DB_CONFIG.POOL.ACQUIRE_TIMEOUT,
      statement_timeout: DB_CONFIG.MONITORING.QUERY_TIMEOUT
    },

    // Entity configuration
    entities: ['src/models/*.ts'],
    migrations: ['src/migrations/*.ts'],
    subscribers: ['src/subscribers/*.ts'],

    // Performance optimizations
    cache: {
      duration: 60000, // 1 minute cache
      type: 'redis',
      options: {
        url: process.env.REDIS_URL
      }
    },

    // Logging configuration
    logging: process.env.NODE_ENV !== 'production',
    logger: 'advanced-console',

    // Synchronization settings (disabled in production)
    synchronize: process.env.NODE_ENV !== 'production',
    migrationsRun: true,
    
    // Base entity configuration
    entitySkipConstructor: true,
    baseEntityTarget: BaseEntity
  };
}

/**
 * Creates and initializes the TypeORM database connection with enhanced retry logic
 * and monitoring capabilities
 * @returns {Promise<DataSource>} Initialized database connection
 */
async function createDatabaseConnection(): Promise<DataSource> {
  const options = getConnectionOptions();
  const dataSource = new DataSource(options);

  let retryCount = 0;
  let delay = DB_CONFIG.RETRY.INITIAL_DELAY;

  while (retryCount < DB_CONFIG.RETRY.MAX_ATTEMPTS) {
    try {
      await dataSource.initialize();
      
      // Set up connection monitoring
      dataSource.manager.connection.driver.afterConnect(() => {
        logger.info('Database connection established successfully');
      });

      // Configure health checks
      setInterval(() => {
        dataSource.manager.query('SELECT 1')
          .catch(error => {
            logger.error('Database health check failed:', error);
          });
      }, DB_CONFIG.MONITORING.HEALTH_CHECK_INTERVAL);

      return dataSource;

    } catch (error) {
      retryCount++;
      logger.error(`Database connection attempt ${retryCount} failed:`, error);

      if (retryCount === DB_CONFIG.RETRY.MAX_ATTEMPTS) {
        throw new Error('Maximum database connection retry attempts reached');
      }

      // Exponential backoff
      delay = Math.min(delay * DB_CONFIG.RETRY.MULTIPLIER, DB_CONFIG.RETRY.MAX_DELAY);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Failed to establish database connection');
}

// Initialize the data source
const dataSource = new DataSource(getConnectionOptions());

// Export configured database connection instance
export default dataSource;

// Export connection factory for manual initialization
export { createDatabaseConnection };