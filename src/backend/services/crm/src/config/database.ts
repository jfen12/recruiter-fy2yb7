/**
 * @fileoverview Database configuration module for the CRM service
 * Implements PostgreSQL connection management with TypeORM, including enhanced
 * connection pooling, retry logic, monitoring, and secure SSL configuration.
 * @version 1.0.0
 * @package RefactorTrack/CRM
 */

import { DataSource, DataSourceOptions, QueryRunner } from 'typeorm'; // v0.3.17
import { Logger, createLogger, format, transports } from 'winston'; // v3.10.0
import { BaseEntity } from '../../../shared/types/common.types';
import { join } from 'path';

// Constants for database configuration
const DB_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 5000,
  POOL: {
    MIN: 2,
    MAX: 10,
    IDLE_TIMEOUT_MS: 10000
  },
  TIMEOUTS: {
    STATEMENT_MS: 30000,
    CONNECTION_MS: 5000,
    QUERY_EXECUTION_MS: 1000
  },
  PATHS: {
    ENTITIES: join(__dirname, '../models/*.model.{ts,js}'),
    MIGRATIONS: join(__dirname, '../migrations/*.{ts,js}'),
    SUBSCRIBERS: join(__dirname, '../subscribers/*.{ts,js}'),
    SSL_CERT: join(__dirname, '../certs/ca.crt')
  }
};

/**
 * Database logger configuration using Winston
 */
const dbLogger: Logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/database.log' })
  ]
});

/**
 * Retrieves and validates database connection options from environment variables
 * @returns {DataSourceOptions} Validated TypeORM connection configuration
 * @throws {Error} If required environment variables are missing
 */
export const getConnectionOptions = (): DataSourceOptions => {
  // Validate required environment variables
  const requiredEnvVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT!, 10),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    entities: [DB_CONFIG.PATHS.ENTITIES],
    migrations: [DB_CONFIG.PATHS.MIGRATIONS],
    subscribers: [DB_CONFIG.PATHS.SUBSCRIBERS],
    
    // Connection pool configuration
    poolSize: DB_CONFIG.POOL.MAX,
    extra: {
      min: DB_CONFIG.POOL.MIN,
      max: DB_CONFIG.POOL.MAX,
      idleTimeoutMillis: DB_CONFIG.POOL.IDLE_TIMEOUT_MS,
      statement_timeout: DB_CONFIG.TIMEOUTS.STATEMENT_MS,
      connectionTimeoutMillis: DB_CONFIG.TIMEOUTS.CONNECTION_MS
    },

    // SSL Configuration for secure connections
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: true,
      ca: require('fs').readFileSync(DB_CONFIG.PATHS.SSL_CERT)
    } : false,

    // Logging and monitoring configuration
    logging: true,
    logger: {
      log: (level: string, message: string) => {
        dbLogger.log(level, message);
      },
      logQuery: (query: string, parameters?: any[]) => {
        dbLogger.info('Query executed', { query, parameters });
      },
      logQueryError: (error: string, query: string, parameters?: any[]) => {
        dbLogger.error('Query error', { error, query, parameters });
      },
      logQuerySlow: (time: number, query: string, parameters?: any[]) => {
        dbLogger.warn('Slow query detected', { time, query, parameters });
      },
      logSchemaBuild: (message: string) => {
        dbLogger.info('Schema build', { message });
      },
      logMigration: (message: string) => {
        dbLogger.info('Migration', { message });
      }
    },

    // Performance monitoring
    maxQueryExecutionTime: DB_CONFIG.TIMEOUTS.QUERY_EXECUTION_MS,
    cache: {
      duration: 60000 // 1 minute cache duration
    }
  };
};

/**
 * Creates and initializes the database connection with retry logic
 * @returns {Promise<DataSource>} Initialized database connection
 */
export const createDatabaseConnection = async (): Promise<DataSource> => {
  let retryCount = 0;
  let lastError: Error;

  while (retryCount < DB_CONFIG.MAX_RETRIES) {
    try {
      const options = getConnectionOptions();
      const dataSource = new DataSource(options);

      // Initialize connection with event listeners
      dataSource.initialize()
        .then(() => {
          dbLogger.info('Database connection established successfully');
          
          // Set up connection event listeners
          dataSource.queryResultCache?.connect()
            .catch(err => dbLogger.error('Cache connection error', err));

          dataSource.manager.connection
            .on('query', (query: string) => {
              dbLogger.debug('Query executed', { query });
            })
            .on('error', (error: Error) => {
              dbLogger.error('Database error', error);
            });
        })
        .catch(err => {
          dbLogger.error('Database initialization error', err);
          throw err;
        });

      return dataSource;

    } catch (error) {
      lastError = error as Error;
      retryCount++;

      if (retryCount < DB_CONFIG.MAX_RETRIES) {
        dbLogger.warn(`Database connection attempt ${retryCount} failed, retrying...`, {
          error: lastError.message
        });

        // Exponential backoff delay
        await new Promise(resolve => 
          setTimeout(resolve, DB_CONFIG.RETRY_DELAY_MS * Math.pow(2, retryCount - 1))
        );
      }
    }
  }

  dbLogger.error('All database connection attempts failed', { 
    attempts: retryCount,
    lastError 
  });
  throw lastError!;
};

/**
 * Database configuration object with connection management functions
 */
export const databaseConfig = {
  createDatabaseConnection,
  getConnectionOptions,
  
  /**
   * Monitors query execution time and logs slow queries
   * @param queryRunner - TypeORM query runner instance
   */
  monitorQueryPerformance: (queryRunner: QueryRunner) => {
    const startTime = process.hrtime();

    queryRunner.afterQuery.subscribe(() => {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const executionTime = seconds * 1000 + nanoseconds / 1000000;

      if (executionTime > DB_CONFIG.TIMEOUTS.QUERY_EXECUTION_MS) {
        dbLogger.warn('Slow query detected', {
          executionTime,
          query: queryRunner.query
        });
      }
    });
  }
};

export default databaseConfig;