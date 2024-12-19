// External dependencies
// winston v3.10.0 - Core logging framework
import winston from 'winston';
// winston-daily-rotate-file v4.7.1 - Log rotation
import DailyRotateFile from 'winston-daily-rotate-file';
// winston-elasticsearch v0.17.4 - Elasticsearch transport
import { ElasticsearchTransport } from 'winston-elasticsearch';

// Environment variables with secure defaults
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL;
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || 'logs';
const MAX_LOG_SIZE = process.env.MAX_LOG_SIZE || '100m';
const LOG_RETENTION_DAYS = process.env.LOG_RETENTION_DAYS || '30';

// Types for enhanced type safety
interface LoggerOptions {
  enableConsole?: boolean;
  enableFile?: boolean;
  enableElasticsearch?: boolean;
  correlationId?: string;
  additionalMeta?: Record<string, any>;
  customFormat?: winston.Logform.Format;
}

interface MetricsCollector {
  logCounts: Record<string, number>;
  errorCounts: number;
  lastError: Date | null;
  performance: {
    averageLogTime: number;
    totalLogs: number;
  };
}

// Secure log sanitization utility
const sanitizeLogMessage = (message: any): string => {
  if (typeof message === 'string') {
    // Remove potential sensitive data patterns
    return message.replace(/password=[\w\d]+/gi, 'password=[REDACTED]')
                 .replace(/token=[\w\d-_.]+/gi, 'token=[REDACTED]')
                 .replace(/key=[\w\d-_.]+/gi, 'key=[REDACTED]');
  }
  return JSON.stringify(message);
};

// Secure metadata sanitization
const sanitizeMetadata = (meta: Record<string, any>): Record<string, any> => {
  const sanitized = { ...meta };
  const sensitiveKeys = ['password', 'token', 'key', 'secret', 'credential'];
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

// Enhanced secure log format
const createSecureFormat = (serviceName: string): winston.Logform.Format => {
  return winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const sanitizedMessage = sanitizeLogMessage(message);
      const sanitizedMeta = sanitizeMetadata(meta);
      
      return JSON.stringify({
        timestamp,
        service: serviceName,
        level,
        message: sanitizedMessage,
        ...sanitizedMeta,
        environment: process.env.NODE_ENV,
        version: process.env.APP_VERSION || '1.0.0'
      });
    })
  );
};

// Logger class implementation
export class Logger {
  private winston: winston.Logger;
  private serviceName: string;
  private metrics: MetricsCollector;
  private options: LoggerOptions;

  constructor(serviceName: string, options: LoggerOptions = {}) {
    this.serviceName = serviceName;
    this.options = options;
    this.metrics = {
      logCounts: {},
      errorCounts: 0,
      lastError: null,
      performance: {
        averageLogTime: 0,
        totalLogs: 0
      }
    };

    this.winston = this.initializeLogger();
  }

  private initializeLogger(): winston.Logger {
    const transports: winston.transport[] = [];
    const secureFormat = this.options.customFormat || createSecureFormat(this.serviceName);

    // Console transport
    if (this.options.enableConsole !== false) {
      transports.push(new winston.transports.Console({
        level: LOG_LEVEL,
        format: secureFormat
      }));
    }

    // File transport with rotation
    if (this.options.enableFile !== false) {
      transports.push(new DailyRotateFile({
        level: LOG_LEVEL,
        dirname: LOG_FILE_PATH,
        filename: `%DATE%-${this.serviceName}.log`,
        maxSize: MAX_LOG_SIZE,
        maxFiles: `${LOG_RETENTION_DAYS}d`,
        format: secureFormat,
        zippedArchive: true,
        auditFile: `${LOG_FILE_PATH}/audit.json`
      }));
    }

    // Elasticsearch transport
    if (ELASTICSEARCH_URL && this.options.enableElasticsearch !== false) {
      const elasticsearchOptions = {
        level: LOG_LEVEL,
        clientOpts: { node: ELASTICSEARCH_URL },
        bufferLimit: 100,
        flushInterval: 2000,
        format: secureFormat
      };
      transports.push(new ElasticsearchTransport(elasticsearchOptions));
    }

    return winston.createLogger({
      level: LOG_LEVEL,
      format: secureFormat,
      defaultMeta: {
        correlationId: this.options.correlationId,
        ...this.options.additionalMeta
      },
      transports,
      exitOnError: false
    });
  }

  private updateMetrics(level: string, startTime: number): void {
    this.metrics.logCounts[level] = (this.metrics.logCounts[level] || 0) + 1;
    this.metrics.performance.totalLogs++;
    
    const logTime = Date.now() - startTime;
    this.metrics.performance.averageLogTime = 
      (this.metrics.performance.averageLogTime * (this.metrics.performance.totalLogs - 1) + logTime) 
      / this.metrics.performance.totalLogs;
  }

  public info(message: string, meta: Record<string, any> = {}): void {
    const startTime = Date.now();
    this.winston.info(message, sanitizeMetadata(meta));
    this.updateMetrics('info', startTime);
  }

  public error(message: string, error?: Error, meta: Record<string, any> = {}): void {
    const startTime = Date.now();
    this.metrics.errorCounts++;
    this.metrics.lastError = new Date();

    const errorMeta = {
      ...sanitizeMetadata(meta),
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };

    this.winston.error(message, errorMeta);
    this.updateMetrics('error', startTime);
  }

  public warn(message: string, meta: Record<string, any> = {}): void {
    const startTime = Date.now();
    this.winston.warn(message, sanitizeMetadata(meta));
    this.updateMetrics('warn', startTime);
  }

  public debug(message: string, meta: Record<string, any> = {}): void {
    const startTime = Date.now();
    this.winston.debug(message, sanitizeMetadata(meta));
    this.updateMetrics('debug', startTime);
  }

  public getMetrics(): MetricsCollector {
    return { ...this.metrics };
  }
}

// Factory function for creating logger instances
export const createLogger = (
  serviceName: string,
  options: LoggerOptions = {}
): Logger => {
  if (!serviceName) {
    throw new Error('Service name is required for logger initialization');
  }
  
  return new Logger(serviceName, options);
};