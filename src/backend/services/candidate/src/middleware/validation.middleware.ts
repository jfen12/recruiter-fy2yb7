/**
 * @fileoverview Express middleware for validating candidate-related requests with enhanced security and GDPR compliance.
 * Implements comprehensive request validation using Zod schemas and custom validation rules.
 * @version 1.0.0
 * @package RefactorTrack
 */

import { Request, Response, NextFunction, RequestHandler } from 'express'; // v4.18.2
import { z } from 'zod'; // v3.22.0
import { validateCandidateData, validateSkillData, skillSchema } from '../utils/validation';
import { ICandidate } from '../interfaces/candidate.interface';
import { ApiResponse } from '../../../shared/types/common.types';
import { ISkill } from '../interfaces/skill.interface';

// Validation Constants
const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB limit
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIN_RETENTION_PERIOD = 365; // 1 year minimum
const MAX_RETENTION_PERIOD = 1825; // 5 years maximum

/**
 * Interface for structured validation errors
 */
interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Middleware to validate candidate creation and update requests
 * Implements comprehensive validation with GDPR compliance checks
 */
export const validateCandidateRequest: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check request size
    if (req.headers['content-length'] && parseInt(req.headers['content-length']) > MAX_REQUEST_SIZE) {
      const response: ApiResponse<null> = {
        data: null,
        status: 413,
        message: 'Request entity too large',
        errors: ['Request size exceeds maximum allowed limit'],
        metadata: {},
        pagination: null
      };
      res.status(413).json(response);
      return;
    }

    // Sanitize and validate candidate data
    const candidateData = req.body as Partial<ICandidate>;
    const errors: ValidationError[] = [];

    // Validate GDPR compliance
    if (candidateData.gdpr_consent === false) {
      errors.push({
        field: 'gdpr_consent',
        message: 'GDPR consent is required to process candidate data',
        code: 'GDPR_CONSENT_REQUIRED'
      });
    }

    if (candidateData.data_retention_period) {
      if (candidateData.data_retention_period < MIN_RETENTION_PERIOD || 
          candidateData.data_retention_period > MAX_RETENTION_PERIOD) {
        errors.push({
          field: 'data_retention_period',
          message: `Retention period must be between ${MIN_RETENTION_PERIOD} and ${MAX_RETENTION_PERIOD} days`,
          code: 'INVALID_RETENTION_PERIOD'
        });
      }
    }

    // Validate candidate data
    try {
      await validateCandidateData(candidateData);
    } catch (error) {
      if (error instanceof Error) {
        errors.push({
          field: 'candidate',
          message: error.message,
          code: 'VALIDATION_ERROR'
        });
      }
    }

    if (errors.length > 0) {
      const response: ApiResponse<null> = {
        data: null,
        status: 400,
        message: 'Validation failed',
        errors: errors.map(e => e.message),
        metadata: { validationErrors: errors },
        pagination: null
      };
      res.status(400).json(response);
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to validate candidate skills updates
 * Implements comprehensive skill validation with experience verification
 */
export const validateCandidateSkillsRequest: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const skillsData = req.body as Partial<ISkill>[];
    const errors: ValidationError[] = [];

    // Validate each skill entry
    for (const [index, skill] of skillsData.entries()) {
      try {
        await validateSkillData(skill);
      } catch (error) {
        if (error instanceof Error) {
          errors.push({
            field: `skills[${index}]`,
            message: error.message,
            code: 'SKILL_VALIDATION_ERROR'
          });
        }
      }
    }

    if (errors.length > 0) {
      const response: ApiResponse<null> = {
        data: null,
        status: 400,
        message: 'Skills validation failed',
        errors: errors.map(e => e.message),
        metadata: { validationErrors: errors },
        pagination: null
      };
      res.status(400).json(response);
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to validate candidate ID parameter
 * Implements strict UUID validation with enhanced security checks
 */
export const validateCandidateIdParam: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const candidateId = req.params.id;

  // Validate UUID format
  if (!candidateId || !UUID_REGEX.test(candidateId)) {
    const response: ApiResponse<null> = {
      data: null,
      status: 400,
      message: 'Invalid candidate ID format',
      errors: ['Candidate ID must be a valid UUID'],
      metadata: {},
      pagination: null
    };
    res.status(400).json(response);
    return;
  }

  next();
};

/**
 * Zod schema for candidate ID validation
 */
const candidateIdSchema = z.string().uuid({
  message: 'Invalid UUID format for candidate ID'
});

/**
 * Type guard to validate candidate ID
 */
export function isValidCandidateId(id: unknown): id is string {
  return candidateIdSchema.safeParse(id).success;
}