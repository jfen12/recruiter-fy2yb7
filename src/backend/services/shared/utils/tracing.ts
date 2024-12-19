// External dependencies
// @opentelemetry/api v1.4.0 - OpenTelemetry API for standardized tracing
import { 
  Tracer, 
  Span, 
  SpanContext, 
  SpanKind,
  Context,
  trace,
  propagation,
  TraceFlags
} from '@opentelemetry/api';

// jaeger-client v3.19.0 - Jaeger client for secure trace reporting
import { initTracer, JaegerTracer, TracingConfig } from 'jaeger-client';

// express-opentracing v0.1.1 - Express middleware integration
import { Middleware } from 'express-opentracing';

// Internal dependencies
import { Logger } from './logger';
import { MetricsService } from './metrics';

// Environment variables with secure defaults
const JAEGER_ENDPOINT = process.env.JAEGER_ENDPOINT || 'http://jaeger:14268/api/traces';
const JAEGER_AGENT_HOST = process.env.JAEGER_AGENT_HOST || 'localhost';
const JAEGER_AGENT_PORT = Number(process.env.JAEGER_AGENT_PORT) || 6832;
const SAMPLING_RATE = Number(process.env.TRACING_SAMPLING_RATE) || 1;
const TRACE_BATCH_SIZE = Number(process.env.TRACE_BATCH_SIZE) || 100;
const MAX_TRACE_RETENTION = process.env.MAX_TRACE_RETENTION || '30d';

// Types for enhanced type safety
interface TracerOptions {
  tags?: Record<string, string>;
  samplingRate?: number;
  maxBatchSize?: number;
  securityOptions?: {
    encryptTags?: boolean;
    sensitiveKeys?: string[];
    allowedDomains?: string[];
  };
  performanceOptions?: {
    enableMetrics?: boolean;
    slowSpanThreshold?: number;
  };
}

interface TraceBatcher {
  spans: Span[];
  lastFlush: number;
  flushInterval: number;
}

interface TraceFilter {
  allowedOperations: Set<string>;
  blockedDomains: Set<string>;
  sensitiveKeys: Set<string>;
}

// Utility functions for secure trace handling
const sanitizeSpanTags = (
  tags: Record<string, string>, 
  sensitiveKeys: Set<string>
): Record<string, string> => {
  const sanitized: Record<string, string> = {};
  Object.entries(tags).forEach(([key, value]) => {
    if (sensitiveKeys.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = String(value).slice(0, 1000); // Limit value length
    }
  });
  return sanitized;
};

const validateSpanContext = (context: SpanContext): boolean => {
  return !!(
    context &&
    context.traceId &&
    context.spanId &&
    typeof context.traceFlags === 'number'
  );
};

// Main TracingService class implementation
export class TracingService {
  private tracer: Tracer;
  private logger: Logger;
  private metricsService: MetricsService;
  private serviceName: string;
  private options: TracerOptions;
  private batcher: TraceBatcher;
  private filter: TraceFilter;

  constructor(serviceName: string, options: TracerOptions = {}) {
    this.serviceName = serviceName;
    this.options = {
      samplingRate: SAMPLING_RATE,
      maxBatchSize: TRACE_BATCH_SIZE,
      ...options
    };

    this.logger = new Logger(`${serviceName}_tracing`);
    this.metricsService = new MetricsService(`${serviceName}_tracing`);

    this.batcher = {
      spans: [],
      lastFlush: Date.now(),
      flushInterval: 5000 // 5 seconds
    };

    this.filter = {
      allowedOperations: new Set(['http', 'grpc', 'db', 'cache']),
      blockedDomains: new Set(['internal', 'private']),
      sensitiveKeys: new Set(['password', 'token', 'key', 'secret', 'auth'])
    };

    this.tracer = this.initializeTracer();
    this.startSpanProcessor();
  }

  private initializeTracer(): Tracer {
    const config: TracingConfig = {
      serviceName: this.serviceName,
      sampler: {
        type: 'probabilistic',
        param: this.options.samplingRate
      },
      reporter: {
        agentHost: JAEGER_AGENT_HOST,
        agentPort: JAEGER_AGENT_PORT,
        collectorEndpoint: JAEGER_ENDPOINT,
        logSpans: true,
        flushInterval: 5000,
        maxPacketSize: this.options.maxBatchSize
      },
      tags: {
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0',
        ...this.options.tags
      }
    };

    return initTracer(config) as JaegerTracer;
  }

  private startSpanProcessor(): void {
    setInterval(() => {
      if (this.batcher.spans.length > 0) {
        this.flushSpans();
      }
    }, this.batcher.flushInterval);
  }

  private flushSpans(): void {
    const now = Date.now();
    const validSpans = this.batcher.spans.filter(
      span => now - (span as any).startTime < this.batcher.flushInterval
    );

    validSpans.forEach(span => {
      try {
        span.end();
        if (this.options.performanceOptions?.enableMetrics) {
          const duration = now - (span as any).startTime;
          this.metricsService.incrementCounter('span_completed', {
            operation: (span as any).name,
            status: (span as any).status
          });
        }
      } catch (error) {
        this.logger.error('Error flushing span', error as Error);
      }
    });

    this.batcher.spans = [];
    this.batcher.lastFlush = now;
  }

  public startSpan(
    operationName: string,
    parentContext?: SpanContext,
    tags: Record<string, string> = {}
  ): Span {
    try {
      const startTime = Date.now();
      const spanContext = parentContext && validateSpanContext(parentContext) 
        ? trace.setSpanContext(Context.active(), parentContext)
        : undefined;

      const span = this.tracer.startSpan(operationName, {
        kind: SpanKind.INTERNAL,
        attributes: sanitizeSpanTags(tags, this.filter.sensitiveKeys)
      }, spanContext);

      (span as any).startTime = startTime;

      if (this.options.performanceOptions?.enableMetrics) {
        this.metricsService.incrementCounter('span_started', {
          operation: operationName
        });
      }

      this.batcher.spans.push(span);
      return span;

    } catch (error) {
      this.logger.error('Error starting span', error as Error);
      throw error;
    }
  }

  public finishSpan(span: Span, finishTime?: number): void {
    try {
      const endTime = finishTime || Date.now();
      const duration = endTime - (span as any).startTime;

      if (
        this.options.performanceOptions?.slowSpanThreshold &&
        duration > this.options.performanceOptions.slowSpanThreshold
      ) {
        this.logger.warn('Slow span detected', {
          operation: (span as any).name,
          duration
        });
      }

      span.end(finishTime);

      if (this.options.performanceOptions?.enableMetrics) {
        this.metricsService.incrementCounter('span_finished', {
          operation: (span as any).name,
          duration: duration.toString()
        });
      }

    } catch (error) {
      this.logger.error('Error finishing span', error as Error);
    }
  }

  public injectTraceContext(span: Span, carrier: object): void {
    try {
      const context = trace.setSpanContext(Context.active(), span.spanContext());
      propagation.inject(context, carrier);
    } catch (error) {
      this.logger.error('Error injecting trace context', error as Error);
    }
  }

  public extractTraceContext(carrier: object): SpanContext | undefined {
    try {
      const context = propagation.extract(Context.active(), carrier);
      const spanContext = trace.getSpanContext(context);
      
      if (spanContext && validateSpanContext(spanContext)) {
        return spanContext;
      }
      return undefined;
    } catch (error) {
      this.logger.error('Error extracting trace context', error as Error);
      return undefined;
    }
  }
}

// Factory function for creating tracer instances
export const initializeTracer = (
  serviceName: string,
  options: TracerOptions = {}
): Tracer => {
  if (!serviceName) {
    throw new Error('Service name is required for tracer initialization');
  }

  const tracingService = new TracingService(serviceName, options);
  return tracingService['tracer'];
};