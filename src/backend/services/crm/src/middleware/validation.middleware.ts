/**
 * @fileoverview Express middleware for validating CRM service requests with enhanced security features
 * @version 1.0.0
 * @package RefactorTrack
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit'; // v6.7.0
import { validationResult, body, ValidationChain } from 'express-validator'; // v7.0.0
import helmet from 'helmet'; // v7.0.0
import { ApiResponse } from '../../../shared/types/common.types';
import { ValidationUtils } from '../utils/validation';
import { logger } from '../../../shared/utils/logger';

// Constants for request validation
const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB
const MAX_FIELD_SIZE = 100 * 1024; // 100KB

/**
 * Rate limiting configuration for client validation
 */
const clientRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 100, // Max 100 requests per window
  message: 'Too many client validation requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiting configuration for communication validation
 */
const communicationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 200, // Max 200 requests per window
  message: 'Too many communication validation requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Security headers middleware using helmet
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  xssFilter: true,
  noSniff: true,
  hidePoweredBy: true,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'same-origin' },
});

/**
 * Enhanced middleware for validating client request data
 * Implements comprehensive validation, sanitization, and security checks
 */
export const validateClientMiddleware = [
  clientRateLimiter,
  securityHeaders,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check request size
      if (req.headers['content-length'] && 
          parseInt(req.headers['content-length']) > MAX_REQUEST_SIZE) {
        const response: ApiResponse<null> = {
          status: 413,
          message: 'Request entity too large',
          data: null,
          errors: ['Request size exceeds maximum allowed size'],
        };
        res.status(413).json(response);
        return;
      }

      // Deep clone request body to prevent mutation
      const clientData = JSON.parse(JSON.stringify(req.body));

      // Validate and sanitize client data
      const validationResult = await ValidationUtils.validateClientData(clientData);
      
      if (!validationResult.success || !validationResult.data) {
        const response: ApiResponse<null> = {
          status: 400,
          message: 'Validation failed',
          data: null,
          errors: validationResult.errors || ['Invalid client data'],
        };
        res.status(400).json(response);
        return;
      }

      // Sanitize validated data
      const sanitizedData = ValidationUtils.sanitizeClientInput(validationResult.data);

      // Attach sanitized data to request
      req.body = sanitizedData;

      // Log successful validation
      logger.info('Client data validation successful', {
        clientId: sanitizedData.id,
        companyName: sanitizedData.company_name,
      });

      next();
    } catch (error) {
      logger.error('Client validation middleware error', { error });
      const response: ApiResponse<null> = {
        status: 500,
        message: 'Internal server error during validation',
        data: null,
        errors: ['An unexpected error occurred during validation'],
      };
      res.status(500).json(response);
    }
  }
];

/**
 * Enhanced middleware for validating communication request data
 * Implements comprehensive validation, sanitization, and security checks
 */
export const validateCommunicationMiddleware = [
  communicationRateLimiter,
  securityHeaders,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check request size
      if (req.headers['content-length'] && 
          parseInt(req.headers['content-length']) > MAX_REQUEST_SIZE) {
        const response: ApiResponse<null> = {
          status: 413,
          message: 'Request entity too large',
          data: null,
          errors: ['Request size exceeds maximum allowed size'],
        };
        res.status(413).json(response);
        return;
      }

      // Deep clone request body to prevent mutation
      const communicationData = JSON.parse(JSON.stringify(req.body));

      // Validate and sanitize communication data
      const validationResult = await ValidationUtils.validateCommunicationData(communicationData);
      
      if (!validationResult.success || !validationResult.data) {
        const response: ApiResponse<null> = {
          status: 400,
          message: 'Validation failed',
          data: null,
          errors: validationResult.errors || ['Invalid communication data'],
        };
        res.status(400).json(response);
        return;
      }

      // Sanitize validated data
      const sanitizedData = ValidationUtils.sanitizeCommunicationInput(validationResult.data);

      // Attach sanitized data to request
      req.body = sanitizedData;

      // Log successful validation
      logger.info('Communication data validation successful', {
        type: sanitizedData.type,
        direction: sanitizedData.direction,
        clientId: sanitizedData.client_id,
      });

      next();
    } catch (error) {
      logger.error('Communication validation middleware error', { error });
      const response: ApiResponse<null> = {
        status: 500,
        message: 'Internal server error during validation',
        data: null,
        errors: ['An unexpected error occurred during validation'],
      };
      res.status(500).json(response);
    }
  }
];