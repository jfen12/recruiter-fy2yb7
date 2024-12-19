// External dependencies
// prom-client v14.2.0 - Prometheus metrics collection
import * as promClient from 'prom-client';
// hot-shots v9.3.0 - DataDog StatsD client
import { StatsD } from 'hot-shots';

// Internal dependencies
import { Logger } from './logger';

// Environment variables with secure defaults
const PROMETHEUS_PORT = process.env.PROMETHEUS_PORT || 9090;
const DATADOG_AGENT_HOST = process.env.DD_AGENT_HOST || 'localhost';
const DATADOG_AGENT_PORT = process.env.DD_AGENT_PORT || 8125;
const DEFAULT_METRICS_PREFIX = 'refactortrack';
const METRIC_BATCH_SIZE = Number(process.env.METRIC_BATCH_SIZE) || 100;
const METRIC_FLUSH_INTERVAL = Number(process.env.METRIC_FLUSH_INTERVAL) || 5000;
const MAX_LABEL_CARDINALITY = Number(process.env.MAX_LABEL_CARDINALITY) || 1000;

// Types for enhanced type safety
interface MetricsOptions {
  enablePrometheus?: boolean;
  enableDatadog?: boolean;
  prefix?: string;
  defaultLabels?: Record<string, string>;
  customBuckets?: number[];
  securityOptions?: {
    maxLabelCardinality?: number;
    allowedLabelNames?: string[];
    metricNameValidation?: RegExp;
  };
}

interface PendingMetric {
  type: 'counter' | 'gauge' | 'histogram';
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

interface CircuitBreaker {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
  resetTimeout: number;
}

// Utility functions for metric security and validation
const sanitizeMetricName = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9_:]/g, '_').toLowerCase();
};

const validateLabels = (
  labels: Record<string, string>,
  allowedLabels?: string[]
): Record<string, string> => {
  const sanitized: Record<string, string> = {};
  Object.entries(labels).forEach(([key, value]) => {
    if (!allowedLabels || allowedLabels.includes(key)) {
      sanitized[sanitizeMetricName(key)] = String(value).slice(0, 100);
    }
  });
  return sanitized;
};

// Main MetricsService class
export class MetricsService {
  private prometheusRegistry: promClient.Registry;
  private statsdClient?: StatsD;
  private logger: Logger;
  private serviceName: string;
  private options: MetricsOptions;
  private labelCardinality: Map<string, Set<string>>;
  private metricBuffer: PendingMetric[];
  private collectionBreaker: CircuitBreaker;
  private metrics: Map<string, promClient.Counter | promClient.Gauge | promClient.Histogram>;

  constructor(serviceName: string, options: MetricsOptions = {}) {
    this.serviceName = sanitizeMetricName(serviceName);
    this.options = {
      enablePrometheus: true,
      enableDatadog: true,
      prefix: DEFAULT_METRICS_PREFIX,
      ...options
    };
    
    this.logger = new Logger(`${this.serviceName}_metrics`);
    this.labelCardinality = new Map();
    this.metricBuffer = [];
    this.metrics = new Map();
    
    this.collectionBreaker = {
      failures: 0,
      lastFailure: 0,
      isOpen: false,
      resetTimeout: 30000 // 30 seconds
    };

    this.initializeCollectors();
  }

  private initializeCollectors(): void {
    // Initialize Prometheus
    if (this.options.enablePrometheus) {
      this.prometheusRegistry = new promClient.Registry();
      promClient.collectDefaultMetrics({
        prefix: `${this.options.prefix}_`,
        register: this.prometheusRegistry,
        labels: this.options.defaultLabels
      });
    }

    // Initialize DataDog
    if (this.options.enableDatadog) {
      this.statsdClient = new StatsD({
        host: DATADOG_AGENT_HOST,
        port: Number(DATADOG_AGENT_PORT),
        prefix: `${this.options.prefix}.`,
        errorHandler: (error) => {
          this.handleCollectionError(error);
        },
        bufferFlushInterval: METRIC_FLUSH_INTERVAL,
        maxBufferSize: METRIC_BATCH_SIZE
      });
    }

    // Start metric buffer processing
    setInterval(() => this.processMetricBuffer(), METRIC_FLUSH_INTERVAL);
  }

  private handleCollectionError(error: Error): void {
    this.logger.error('Metric collection error', error);
    this.collectionBreaker.failures++;
    this.collectionBreaker.lastFailure = Date.now();
    
    if (this.collectionBreaker.failures >= 3) {
      this.collectionBreaker.isOpen = true;
      setTimeout(() => {
        this.collectionBreaker.isOpen = false;
        this.collectionBreaker.failures = 0;
      }, this.collectionBreaker.resetTimeout);
    }
  }

  private checkLabelCardinality(metricName: string, labels: Record<string, string>): boolean {
    if (!this.labelCardinality.has(metricName)) {
      this.labelCardinality.set(metricName, new Set());
    }
    
    const cardinalitySet = this.labelCardinality.get(metricName)!;
    const labelKey = JSON.stringify(labels);
    
    if (cardinalitySet.size >= MAX_LABEL_CARDINALITY) {
      this.logger.warn(`Label cardinality limit exceeded for metric: ${metricName}`);
      return false;
    }
    
    cardinalitySet.add(labelKey);
    return true;
  }

  private processMetricBuffer(): void {
    if (this.collectionBreaker.isOpen) {
      return;
    }

    const now = Date.now();
    const validMetrics = this.metricBuffer.filter(
      metric => now - metric.timestamp < METRIC_FLUSH_INTERVAL
    );

    validMetrics.forEach(metric => {
      try {
        if (this.statsdClient && this.options.enableDatadog) {
          switch (metric.type) {
            case 'counter':
              this.statsdClient.increment(metric.name, metric.value, metric.labels);
              break;
            case 'gauge':
              this.statsdClient.gauge(metric.name, metric.value, metric.labels);
              break;
            case 'histogram':
              this.statsdClient.histogram(metric.name, metric.value, metric.labels);
              break;
          }
        }
      } catch (error) {
        this.handleCollectionError(error as Error);
      }
    });

    this.metricBuffer = [];
  }

  public incrementCounter(name: string, labels: Record<string, string> = {}): void {
    const metricName = sanitizeMetricName(`${this.serviceName}_${name}`);
    const sanitizedLabels = validateLabels(
      labels,
      this.options.securityOptions?.allowedLabelNames
    );

    if (!this.checkLabelCardinality(metricName, sanitizedLabels)) {
      return;
    }

    try {
      if (this.options.enablePrometheus) {
        let counter = this.metrics.get(metricName) as promClient.Counter;
        if (!counter) {
          counter = new promClient.Counter({
            name: metricName,
            help: `Counter for ${name}`,
            labelNames: Object.keys(sanitizedLabels),
            registers: [this.prometheusRegistry]
          });
          this.metrics.set(metricName, counter);
        }
        counter.inc(sanitizedLabels);
      }

      this.metricBuffer.push({
        type: 'counter',
        name: metricName,
        value: 1,
        labels: sanitizedLabels,
        timestamp: Date.now()
      });
    } catch (error) {
      this.handleCollectionError(error as Error);
    }
  }

  public cleanup(): void {
    this.labelCardinality.clear();
    this.metricBuffer = [];
    if (this.statsdClient) {
      this.statsdClient.close();
    }
  }
}

// Factory function for creating metrics service instances
export const initializeMetrics = (
  serviceName: string,
  options: MetricsOptions = {}
): MetricsService => {
  if (!serviceName) {
    throw new Error('Service name is required for metrics initialization');
  }
  
  return new MetricsService(serviceName, options);
};