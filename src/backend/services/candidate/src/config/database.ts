/**
 * @fileoverview Database configuration module for the candidate service
 * Implements PostgreSQL connection management with TypeORM, including advanced
 * connection pooling, monitoring, retry logic, and secure connection handling.
 * @version 1.0.0
 * @package RefactorTrack/CandidateService
 */

import { DataSource } from 'typeorm'; // v0.3.17
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions'; // v0.3.17
import { config } from 'dotenv'; // v16.3.1
import { BaseEntity } from '../../shared/types/common.types';
import { createMetricsCollector } from './metrics';
import { logger } from './logger';

// Initialize environment configuration
config();

// Database connection constants
const DB_CONNECTION_RETRIES = 3;
const DB_CONNECTION_TIMEOUT = 5000;
const DB_POOL_MIN = 2;
const DB_POOL_MAX = 10;
const DB_QUERY_TIMEOUT = 30000;
const DB_STATEMENT_TIMEOUT = 60000;
const DB_IDLE_TIMEOUT = 10000;
const DB_HEALTH_CHECK_INTERVAL = 60000;

/**
 * Decorator for implementing retry logic with exponential backoff
 * @param retries - Number of retry attempts
 */
function retryable(retries: number) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            let lastError: Error;
            for (let attempt = 0; attempt < retries; attempt++) {
                try {
                    return await originalMethod.apply(this, args);
                } catch (error) {
                    lastError = error as Error;
                    const backoffTime = Math.pow(2, attempt) * 1000;
                    logger.warn(`Database connection attempt ${attempt + 1} failed. Retrying in ${backoffTime}ms`);
                    await new Promise(resolve => setTimeout(resolve, backoffTime));
                }
            }
            throw lastError!;
        };
        return descriptor;
    };
}

/**
 * Decorator for adding performance monitoring
 */
function monitored(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
        const startTime = process.hrtime();
        try {
            const result = await originalMethod.apply(this, args);
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const duration = seconds * 1000 + nanoseconds / 1000000;
            createMetricsCollector().recordDbOperation('connection', duration);
            return result;
        } catch (error) {
            createMetricsCollector().incrementDbErrors();
            throw error;
        }
    };
    return descriptor;
}

/**
 * Retrieves and validates database connection options from environment variables
 * @returns PostgreSQL connection configuration with secure defaults
 */
export function getConnectionOptions(): PostgresConnectionOptions {
    const sslConfig = process.env.NODE_ENV === 'production' ? {
        ssl: {
            rejectUnauthorized: true,
            ca: process.env.DB_SSL_CA,
            cert: process.env.DB_SSL_CERT,
            key: process.env.DB_SSL_KEY
        }
    } : {};

    return {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        schema: process.env.DB_SCHEMA || 'public',
        
        // Connection pool configuration
        poolSize: parseInt(process.env.DB_POOL_SIZE || String(DB_POOL_MAX), 10),
        minimumPoolSize: parseInt(process.env.DB_POOL_MIN || String(DB_POOL_MIN), 10),
        maxPoolSize: parseInt(process.env.DB_POOL_MAX || String(DB_POOL_MAX), 10),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || String(DB_IDLE_TIMEOUT), 10),
        
        // Query configuration
        queryTimeoutMillis: parseInt(process.env.DB_QUERY_TIMEOUT || String(DB_QUERY_TIMEOUT), 10),
        statementTimeoutMillis: parseInt(process.env.DB_STATEMENT_TIMEOUT || String(DB_STATEMENT_TIMEOUT), 10),
        
        // Entity configuration
        entities: [BaseEntity],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV !== 'production',
        
        // Health check configuration
        healthCheckInterval: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || String(DB_HEALTH_CHECK_INTERVAL), 10),
        
        // Extra configuration
        extra: {
            max: parseInt(process.env.DB_POOL_MAX || String(DB_POOL_MAX), 10),
            connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || String(DB_CONNECTION_TIMEOUT), 10),
            ...sslConfig
        }
    };
}

/**
 * Creates and initializes the database connection with TypeORM
 * Implements retry logic, connection monitoring, and health checks
 * @returns Promise resolving to initialized DataSource instance
 */
@retryable(DB_CONNECTION_RETRIES)
@monitored
export async function createDatabaseConnection(): Promise<DataSource> {
    const options = getConnectionOptions();
    const dataSource = new DataSource(options);

    // Set up connection event listeners
    dataSource.driver.afterConnect(() => {
        logger.info('Database connection established successfully');
        createMetricsCollector().incrementDbConnections();
    });

    dataSource.driver.beforeDisconnect(() => {
        logger.info('Database connection closing');
        createMetricsCollector().decrementDbConnections();
    });

    dataSource.driver.afterDisconnect(() => {
        logger.warn('Database connection closed');
    });

    // Initialize connection
    try {
        await dataSource.initialize();
        
        // Set up periodic health checks
        setInterval(async () => {
            try {
                await dataSource.query('SELECT 1');
                createMetricsCollector().recordDbHealthCheck(true);
            } catch (error) {
                createMetricsCollector().recordDbHealthCheck(false);
                logger.error('Database health check failed:', error);
            }
        }, options.healthCheckInterval);

        return dataSource;
    } catch (error) {
        logger.error('Failed to initialize database connection:', error);
        throw error;
    }
}

export default createDatabaseConnection;