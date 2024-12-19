/**
 * @fileoverview Controller handling HTTP requests for job requisition management
 * Implements secure, monitored, and GDPR-compliant endpoints with comprehensive validation
 * @version 1.0.0
 * @package RefactorTrack
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { Logger } from 'winston'; // v3.8.0
import { Counter, Histogram } from 'prom-client'; // v14.2.0
import { injectable, inject } from 'inversify'; // v6.0.0
import { RateLimiterMemory } from 'rate-limiter-flexible'; // v2.4.1

import { RequisitionService } from '../services/requisitionService';
import { 
  validateCreateRequisition, 
  validateUpdateRequisition,
  ValidationError 
} from '../utils/validation';
import { 
  Requisition,
  CreateRequisitionDTO,
  UpdateRequisitionDTO,
  RequisitionStatus,
  RequisitionSearchParams
} from '../interfaces/requisition.interface';

/**
 * Rate limiting configuration
 */
const RATE_LIMITS = {
  CREATE: { points: 50, duration: 3600 }, // 50 creates per hour
  UPDATE: { points: 100, duration: 3600 }, // 100 updates per hour
  SEARCH: { points: 300, duration: 3600 }  // 300 searches per hour
};

/**
 * Performance monitoring thresholds (ms)
 */
const PERFORMANCE_THRESHOLDS = {
  WARNING: 1000,  // 1 second
  CRITICAL: 3000  // 3 seconds
};

/**
 * Controller handling requisition-related HTTP requests
 */
@injectable()
export class RequisitionController {
  private readonly requestCounter: Counter;
  private readonly responseTimeHistogram: Histogram;
  private readonly createRateLimiter: RateLimiterMemory;
  private readonly updateRateLimiter: RateLimiterMemory;
  private readonly searchRateLimiter: RateLimiterMemory;

  constructor(
    @inject('RequisitionService') private requisitionService: RequisitionService,
    @inject('Logger') private logger: Logger,
    @inject('MetricsRegistry') metricsRegistry: any
  ) {
    // Initialize metrics
    this.requestCounter = new Counter({
      name: 'requisition_requests_total',
      help: 'Total number of requisition requests',
      labelNames: ['method', 'endpoint', 'status']
    });

    this.responseTimeHistogram = new Histogram({
      name: 'requisition_response_time_seconds',
      help: 'Response time for requisition requests',
      labelNames: ['method', 'endpoint']
    });

    // Initialize rate limiters
    this.createRateLimiter = new RateLimiterMemory(RATE_LIMITS.CREATE);
    this.updateRateLimiter = new RateLimiterMemory(RATE_LIMITS.UPDATE);
    this.searchRateLimiter = new RateLimiterMemory(RATE_LIMITS.SEARCH);
  }

  /**
   * Creates a new job requisition
   * @param req - Express request object
   * @param res - Express response object
   */
  public async createRequisition(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || Date.now().toString();

    try {
      // Rate limiting check
      await this.createRateLimiter.consume(req.ip);

      // Validate request data
      const validatedData = await validateCreateRequisition(req.body);

      // Create requisition
      const requisition = await this.requisitionService.createRequisition(validatedData);

      // Record metrics
      this.recordMetrics('POST', '/requisitions', 201, startTime);

      // Log success
      this.logger.info('Requisition created successfully', {
        requestId,
        requisitionId: requisition.id,
        clientId: requisition.client_id
      });

      res.status(201).json({
        status: 'success',
        data: requisition,
        metadata: {
          created_at: new Date(),
          request_id: requestId
        }
      });
    } catch (error) {
      this.handleError(error, req, res, startTime);
    }
  }

  /**
   * Updates an existing requisition
   * @param req - Express request object
   * @param res - Express response object
   */
  public async updateRequisition(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || Date.now().toString();

    try {
      // Rate limiting check
      await this.updateRateLimiter.consume(req.ip);

      // Validate request data
      const validatedData = await validateUpdateRequisition({
        id: req.params.id,
        ...req.body
      });

      // Update requisition
      const requisition = await this.requisitionService.updateRequisition(validatedData);

      // Record metrics
      this.recordMetrics('PUT', '/requisitions/:id', 200, startTime);

      // Log success
      this.logger.info('Requisition updated successfully', {
        requestId,
        requisitionId: requisition.id,
        status: requisition.status
      });

      res.status(200).json({
        status: 'success',
        data: requisition,
        metadata: {
          updated_at: new Date(),
          request_id: requestId
        }
      });
    } catch (error) {
      this.handleError(error, req, res, startTime);
    }
  }

  /**
   * Retrieves matching candidates for a requisition
   * @param req - Express request object
   * @param res - Express response object
   */
  public async findMatchingCandidates(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || Date.now().toString();

    try {
      // Rate limiting check
      await this.searchRateLimiter.consume(req.ip);

      const requisitionId = req.params.id;
      const options = this.parseMatchOptions(req.query);

      // Find matches
      const matches = await this.requisitionService.findMatchingCandidates(
        requisitionId,
        options
      );

      // Record metrics
      this.recordMetrics('GET', '/requisitions/:id/matches', 200, startTime);

      // Log success
      this.logger.info('Matching candidates found', {
        requestId,
        requisitionId,
        matchCount: matches.length
      });

      res.status(200).json({
        status: 'success',
        data: matches,
        metadata: {
          timestamp: new Date(),
          request_id: requestId,
          match_count: matches.length
        }
      });
    } catch (error) {
      this.handleError(error, req, res, startTime);
    }
  }

  /**
   * Updates requisition status
   * @param req - Express request object
   * @param res - Express response object
   */
  public async updateStatus(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || Date.now().toString();

    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      if (!Object.values(RequisitionStatus).includes(status)) {
        throw new ValidationError(
          'Invalid status',
          { status: ['Invalid status value'] },
          { status: ['E_INVALID_STATUS'] }
        );
      }

      // Update status
      const requisition = await this.requisitionService.updateStatus(id, status);

      // Record metrics
      this.recordMetrics('PATCH', '/requisitions/:id/status', 200, startTime);

      // Log success
      this.logger.info('Requisition status updated', {
        requestId,
        requisitionId: id,
        oldStatus: requisition.status,
        newStatus: status
      });

      res.status(200).json({
        status: 'success',
        data: requisition,
        metadata: {
          updated_at: new Date(),
          request_id: requestId
        }
      });
    } catch (error) {
      this.handleError(error, req, res, startTime);
    }
  }

  /**
   * Records request metrics
   * @param method - HTTP method
   * @param endpoint - API endpoint
   * @param statusCode - Response status code
   * @param startTime - Request start timestamp
   */
  private recordMetrics(
    method: string,
    endpoint: string,
    statusCode: number,
    startTime: number
  ): void {
    const duration = (Date.now() - startTime) / 1000;

    this.requestCounter.inc({
      method,
      endpoint,
      status: statusCode
    });

    this.responseTimeHistogram.observe(
      { method, endpoint },
      duration
    );

    // Log performance warnings
    if (duration * 1000 > PERFORMANCE_THRESHOLDS.CRITICAL) {
      this.logger.error('Critical performance threshold exceeded', {
        method,
        endpoint,
        duration
      });
    } else if (duration * 1000 > PERFORMANCE_THRESHOLDS.WARNING) {
      this.logger.warn('Performance threshold exceeded', {
        method,
        endpoint,
        duration
      });
    }
  }

  /**
   * Handles and formats error responses
   * @param error - Error object
   * @param req - Express request object
   * @param res - Express response object
   * @param startTime - Request start timestamp
   */
  private handleError(
    error: any,
    req: Request,
    res: Response,
    startTime: number
  ): void {
    let statusCode = 500;
    let errorResponse: any = {
      status: 'error',
      message: 'Internal server error'
    };

    if (error instanceof ValidationError) {
      statusCode = 400;
      errorResponse = {
        status: 'error',
        message: 'Validation failed',
        errors: error.errors,
        error_codes: error.errorCodes
      };
    } else if (error.name === 'RateLimiterError') {
      statusCode = 429;
      errorResponse = {
        status: 'error',
        message: 'Too many requests',
        retry_after: error.msBeforeNext / 1000
      };
    }

    // Record error metrics
    this.recordMetrics(
      req.method,
      req.path,
      statusCode,
      startTime
    );

    // Log error
    this.logger.error('Request failed', {
      error: error.message,
      method: req.method,
      path: req.path,
      statusCode,
      duration: Date.now() - startTime
    });

    res.status(statusCode).json(errorResponse);
  }

  /**
   * Parses match options from request query parameters
   * @param query - Request query parameters
   * @returns Parsed match options
   */
  private parseMatchOptions(query: any): any {
    return {
      minimumScore: parseFloat(query.minimum_score) || 0.6,
      maxResults: parseInt(query.max_results) || 100,
      includeInactive: query.include_inactive === 'true',
      sortBy: query.sort_by?.split(',') || ['score'],
      fuzzyMatching: query.fuzzy_matching !== 'false',
      cacheResults: query.cache_results !== 'false',
      timeout: parseInt(query.timeout) || 30000
    };
  }
}