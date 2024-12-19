/**
 * @fileoverview Enhanced controller for managing client communications with security, caching and audit logging
 * @version 1.0.0
 * @package RefactorTrack
 */

import { Request, Response } from 'express'; // v4.18.2
import { Controller, UseInterceptors } from 'typedi'; // v0.10.0
import helmet from 'helmet'; // v7.0.0
import rateLimit from 'express-rate-limit'; // v6.7.0
import { CacheInterceptor } from '@nestjs/common'; // v9.0.0
import { Logger } from 'winston'; // v3.8.0

import { CommunicationService } from '../services/communicationService';
import { validateCommunicationMiddleware } from '../middleware/validation.middleware';
import { 
  ICommunication, 
  ICreateCommunicationDTO,
  CommunicationType,
  CommunicationDirection 
} from '../interfaces/communication.interface';
import { ApiResponse, UUID, PaginationParams } from '../../../shared/types/common.types';

// Constants for rate limiting and security
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // Max 100 requests per minute
const CACHE_TTL = 300; // 5 minutes cache TTL

/**
 * Rate limiter configuration for communication endpoints
 */
const communicationRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_MAX,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Enhanced controller for handling communication-related HTTP requests
 * Implements comprehensive security, caching, and audit logging
 */
@Controller()
@UseInterceptors(CacheInterceptor)
export class CommunicationController {
  constructor(
    private readonly communicationService: CommunicationService,
    private readonly logger: Logger
  ) {}

  /**
   * Creates a new communication record with enhanced security and validation
   * @param req - Express request object containing communication data
   * @param res - Express response object
   */
  async createCommunication(
    req: Request,
    res: Response
  ): Promise<Response<ApiResponse<ICommunication>>> {
    try {
      const userId = req.user?.id as UUID;
      const createDto: ICreateCommunicationDTO = req.body;

      // Log attempt with sanitized data
      this.logger.info('Attempting to create communication', {
        userId,
        type: createDto.type,
        clientId: createDto.client_id,
      });

      const result = await this.communicationService.createCommunication(
        createDto,
        userId
      );

      // Log success
      this.logger.info('Communication created successfully', {
        id: result.data?.id,
        userId,
        clientId: createDto.client_id,
      });

      return res.status(result.status).json(result);
    } catch (error) {
      // Log error with sanitized details
      this.logger.error('Error creating communication', {
        error: error.message,
        userId: req.user?.id,
        type: req.body?.type,
      });

      return res.status(500).json({
        status: 500,
        message: 'Internal server error',
        data: null,
        errors: ['An unexpected error occurred while creating communication'],
        metadata: {},
        pagination: null,
      });
    }
  }

  /**
   * Retrieves paginated communications for a client with caching
   * @param req - Express request object containing query parameters
   * @param res - Express response object
   */
  async getClientCommunications(
    req: Request,
    res: Response
  ): Promise<Response<ApiResponse<ICommunication[]>>> {
    try {
      const userId = req.user?.id as UUID;
      const clientId = req.params.clientId as UUID;
      const paginationParams: PaginationParams = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sort_by: req.query.sort_by as string,
        sort_order: (req.query.sort_order as 'asc' | 'desc') || 'desc',
        search_query: req.query.search_query as string,
        filters: req.query.filters as Record<string, unknown> || {},
      };

      // Log attempt
      this.logger.info('Retrieving client communications', {
        userId,
        clientId,
        pagination: paginationParams,
      });

      const result = await this.communicationService.getClientCommunications(
        clientId,
        paginationParams,
        userId
      );

      // Log success
      this.logger.info('Client communications retrieved successfully', {
        userId,
        clientId,
        count: result.data?.length || 0,
      });

      return res.status(result.status).json(result);
    } catch (error) {
      // Log error
      this.logger.error('Error retrieving client communications', {
        error: error.message,
        userId: req.user?.id,
        clientId: req.params.clientId,
      });

      return res.status(500).json({
        status: 500,
        message: 'Internal server error',
        data: null,
        errors: ['An unexpected error occurred while retrieving communications'],
        metadata: {},
        pagination: null,
      });
    }
  }

  /**
   * Updates an existing communication record with validation
   * @param req - Express request object containing updated data
   * @param res - Express response object
   */
  async updateCommunication(
    req: Request,
    res: Response
  ): Promise<Response<ApiResponse<ICommunication>>> {
    try {
      const userId = req.user?.id as UUID;
      const communicationId = req.params.id as UUID;
      const updateData = req.body;

      // Log attempt
      this.logger.info('Attempting to update communication', {
        userId,
        communicationId,
        type: updateData.type,
      });

      const result = await this.communicationService.updateCommunication(
        communicationId,
        updateData,
        userId
      );

      // Log success
      this.logger.info('Communication updated successfully', {
        id: result.data?.id,
        userId,
        type: updateData.type,
      });

      return res.status(result.status).json(result);
    } catch (error) {
      // Log error
      this.logger.error('Error updating communication', {
        error: error.message,
        userId: req.user?.id,
        communicationId: req.params.id,
      });

      return res.status(500).json({
        status: 500,
        message: 'Internal server error',
        data: null,
        errors: ['An unexpected error occurred while updating communication'],
        metadata: {},
        pagination: null,
      });
    }
  }

  /**
   * Retrieves a specific communication record by ID with caching
   * @param req - Express request object containing communication ID
   * @param res - Express response object
   */
  async getCommunicationById(
    req: Request,
    res: Response
  ): Promise<Response<ApiResponse<ICommunication>>> {
    try {
      const userId = req.user?.id as UUID;
      const communicationId = req.params.id as UUID;

      // Log attempt
      this.logger.info('Retrieving communication by ID', {
        userId,
        communicationId,
      });

      const result = await this.communicationService.getCommunicationById(
        communicationId,
        userId
      );

      // Log success
      this.logger.info('Communication retrieved successfully', {
        userId,
        communicationId,
        found: !!result.data,
      });

      return res.status(result.status).json(result);
    } catch (error) {
      // Log error
      this.logger.error('Error retrieving communication', {
        error: error.message,
        userId: req.user?.id,
        communicationId: req.params.id,
      });

      return res.status(500).json({
        status: 500,
        message: 'Internal server error',
        data: null,
        errors: ['An unexpected error occurred while retrieving communication'],
        metadata: {},
        pagination: null,
      });
    }
  }
}

export { CommunicationController };