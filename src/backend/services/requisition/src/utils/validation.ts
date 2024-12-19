/**
 * @fileoverview Utility functions for validating requisition-related data using Zod schemas
 * Implements comprehensive validation with enhanced security features and business rule validation
 * @version 1.0.0
 * @package RefactorTrack
 */

import { z } from 'zod'; // v3.21.4
import sanitizeHtml from 'sanitize-html'; // v2.11.0
import {
  RequisitionSchema,
  CreateRequisitionSchema,
  UpdateRequisitionSchema,
  RequisitionStatusEnum
} from '../../shared/schemas/requisition.schema';
import {
  Requisition,
  CreateRequisitionDTO,
  UpdateRequisitionDTO,
  RequisitionStatus
} from '../interfaces/requisition.interface';

/**
 * Custom error class for validation failures
 */
export class ValidationError extends Error {
  public readonly errors: Record<string, string[]>;
  public readonly errorCodes: Record<string, string[]>;

  constructor(message: string, errors: Record<string, string[]>, errorCodes: Record<string, string[]>) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
    this.errorCodes = errorCodes;
  }
}

/**
 * Configuration for HTML sanitization
 */
const SANITIZE_OPTIONS = {
  allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'li'],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
  parseStyleAttributes: false
} as const;

/**
 * Maximum allowed size for input objects in bytes
 */
const MAX_INPUT_SIZE = 1024 * 1024; // 1MB

/**
 * Sanitizes input data to prevent XSS and injection attacks
 * @param data - Input data to sanitize
 * @returns Sanitized data object
 */
function sanitizeInput<T>(data: T): T {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = Array.isArray(data) ? [] : {} as T;

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      (sanitized as any)[key] = sanitizeHtml(value, SANITIZE_OPTIONS);
    } else if (typeof value === 'object' && value !== null) {
      (sanitized as any)[key] = sanitizeInput(value);
    } else {
      (sanitized as any)[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validates input size to prevent DoS attacks
 * @param data - Input data to validate
 * @throws ValidationError if input size exceeds limit
 */
function validateInputSize(data: unknown): void {
  const size = new TextEncoder().encode(JSON.stringify(data)).length;
  if (size > MAX_INPUT_SIZE) {
    throw new ValidationError(
      'Input size exceeds maximum allowed limit',
      { _global: ['Input payload too large'] },
      { _global: ['E_PAYLOAD_TOO_LARGE'] }
    );
  }
}

/**
 * Validates business rules for requisitions
 * @param data - Requisition data to validate
 * @param operation - Operation type ('create' | 'update')
 * @throws ValidationError if business rules are violated
 */
async function validateBusinessRules(
  data: Partial<Requisition>,
  operation: 'create' | 'update'
): Promise<void> {
  const errors: Record<string, string[]> = {};
  const errorCodes: Record<string, string[]> = {};

  // Validate deadline
  if (data.deadline) {
    const minDate = new Date();
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 2);

    if (data.deadline < minDate) {
      errors.deadline = ['Deadline must be in the future'];
      errorCodes.deadline = ['E_INVALID_DEADLINE'];
    }
    if (data.deadline > maxDate) {
      errors.deadline = [...(errors.deadline || []), 'Deadline cannot be more than 2 years in the future'];
      errorCodes.deadline = [...(errorCodes.deadline || []), 'E_DEADLINE_TOO_FAR'];
    }
  }

  // Validate rate ranges
  if (data.rate !== undefined) {
    const minRate = 10;
    const maxRate = 1000000;

    if (data.rate < minRate || data.rate > maxRate) {
      errors.rate = [`Rate must be between ${minRate} and ${maxRate}`];
      errorCodes.rate = ['E_INVALID_RATE_RANGE'];
    }
  }

  // Validate required skills
  if (data.required_skills?.length) {
    if (data.required_skills.length > 15) {
      errors.required_skills = ['Cannot specify more than 15 required skills'];
      errorCodes.required_skills = ['E_TOO_MANY_SKILLS'];
    }

    const mandatorySkills = data.required_skills.filter(skill => skill.is_mandatory);
    if (mandatorySkills.length === 0) {
      errors.required_skills = [...(errors.required_skills || []), 'At least one mandatory skill is required'];
      errorCodes.required_skills = [...(errorCodes.required_skills || []), 'E_NO_MANDATORY_SKILLS'];
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(
      'Business rule validation failed',
      errors,
      errorCodes
    );
  }
}

/**
 * Formats Zod validation errors into a structured format
 * @param error - Zod validation error
 * @returns Formatted validation error
 */
export function formatValidationError(error: z.ZodError): ValidationError {
  const errors: Record<string, string[]> = {};
  const errorCodes: Record<string, string[]> = {};

  error.errors.forEach(err => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
      errorCodes[path] = [];
    }
    errors[path].push(err.message);
    errorCodes[path].push(`E_INVALID_${path.toUpperCase()}`);
  });

  return new ValidationError(
    'Validation failed',
    errors,
    errorCodes
  );
}

/**
 * Validates a complete requisition object
 * @param data - Requisition data to validate
 * @returns Validated and sanitized requisition data
 * @throws ValidationError if validation fails
 */
export async function validateRequisition(data: Requisition): Promise<Requisition> {
  try {
    validateInputSize(data);
    const sanitizedData = sanitizeInput(data);
    const validated = RequisitionSchema.parse(sanitizedData);
    await validateBusinessRules(validated, 'update');
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw formatValidationError(error);
    }
    throw error;
  }
}

/**
 * Validates data for creating a new requisition
 * @param data - Creation data to validate
 * @returns Validated and sanitized creation data
 * @throws ValidationError if validation fails
 */
export async function validateCreateRequisition(data: CreateRequisitionDTO): Promise<CreateRequisitionDTO> {
  try {
    validateInputSize(data);
    const sanitizedData = sanitizeInput(data);
    const validated = CreateRequisitionSchema.parse(sanitizedData);
    await validateBusinessRules(validated, 'create');
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw formatValidationError(error);
    }
    throw error;
  }
}

/**
 * Validates data for updating a requisition
 * @param data - Update data to validate
 * @returns Validated and sanitized update data
 * @throws ValidationError if validation fails
 */
export async function validateUpdateRequisition(data: UpdateRequisitionDTO): Promise<UpdateRequisitionDTO> {
  try {
    validateInputSize(data);
    const sanitizedData = sanitizeInput(data);
    const validated = UpdateRequisitionSchema.parse(sanitizedData);
    await validateBusinessRules(validated, 'update');
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw formatValidationError(error);
    }
    throw error;
  }
}