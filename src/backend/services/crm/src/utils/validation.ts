/**
 * @fileoverview Comprehensive validation utilities for CRM service entities
 * @version 1.0.0
 * @package RefactorTrack
 */

import { z } from 'zod'; // v3.21.4
import { IClient } from '../interfaces/client.interface';
import { ICommunication, CommunicationType, CommunicationDirection } from '../interfaces/communication.interface';
import { logger } from '../../../shared/utils/logger';

// Constants for validation rules
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;
const MAX_STRING_LENGTH = 1000;
const MAX_ARRAY_LENGTH = 100;
const MIN_COMPANY_NAME_LENGTH = 2;

/**
 * Interface for validation result
 */
interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Enhanced client contact validation schema with strict rules
 */
const clientContactValidationSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s-']+$/, 'Name contains invalid characters'),
  
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title must not exceed 100 characters'),
  
  email: z.string()
    .email('Invalid email format')
    .regex(EMAIL_REGEX, 'Invalid email format')
    .max(254, 'Email must not exceed 254 characters'),
  
  phone: z.string()
    .regex(PHONE_REGEX, 'Invalid phone number format')
    .max(15, 'Phone number must not exceed 15 characters'),
  
  is_primary: z.boolean()
});

/**
 * Enhanced client validation schema with strict rules and security controls
 */
export const clientValidationSchema = z.object({
  company_name: z.string()
    .min(MIN_COMPANY_NAME_LENGTH, 'Company name is too short')
    .max(200, 'Company name must not exceed 200 characters')
    .regex(/^[a-zA-Z0-9\s&.,'-]+$/, 'Company name contains invalid characters'),
  
  industry: z.string()
    .min(1, 'Industry is required')
    .max(50, 'Industry must not exceed 50 characters'),
  
  contacts: z.array(clientContactValidationSchema)
    .min(1, 'At least one contact is required')
    .max(MAX_ARRAY_LENGTH, 'Too many contacts')
    .refine(contacts => {
      const primaryContacts = contacts.filter(c => c.is_primary);
      return primaryContacts.length === 1;
    }, 'Exactly one primary contact is required'),
  
  notes: z.string()
    .max(MAX_STRING_LENGTH, 'Notes must not exceed 1000 characters')
    .optional()
}).strict();

/**
 * Enhanced communication validation schema with strict rules and security controls
 */
export const communicationValidationSchema = z.object({
  type: z.nativeEnum(CommunicationType, {
    errorMap: () => ({ message: 'Invalid communication type' })
  }),
  
  direction: z.nativeEnum(CommunicationDirection, {
    errorMap: () => ({ message: 'Invalid communication direction' })
  }),
  
  subject: z.string()
    .min(1, 'Subject is required')
    .max(200, 'Subject must not exceed 200 characters')
    .regex(/^[a-zA-Z0-9\s.,!?'-]+$/, 'Subject contains invalid characters'),
  
  content: z.string()
    .min(1, 'Content is required')
    .max(5000, 'Content must not exceed 5000 characters'),
  
  contact_name: z.string()
    .min(1, 'Contact name is required')
    .max(100, 'Contact name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s-']+$/, 'Contact name contains invalid characters'),
  
  contact_email: z.string()
    .email('Invalid email format')
    .regex(EMAIL_REGEX, 'Invalid email format')
    .max(254, 'Email must not exceed 254 characters')
    .optional(),
  
  contact_phone: z.string()
    .regex(PHONE_REGEX, 'Invalid phone number format')
    .max(15, 'Phone number must not exceed 15 characters')
    .optional(),
  
  scheduled_at: z.date()
    .refine(date => date > new Date(), 'Scheduled date must be in the future')
    .optional()
}).strict();

/**
 * Sanitizes input string to prevent XSS
 * @param input - String to sanitize
 */
const sanitizeInput = (input: string): string => {
  return input.replace(/[<>]/g, '');
};

/**
 * Validates client data with enhanced security controls
 * @param clientData - Client data to validate
 */
export const validateClient = async (clientData: unknown): Promise<ValidationResult<IClient>> => {
  try {
    // Sanitize string inputs
    if (typeof clientData === 'object' && clientData !== null) {
      Object.entries(clientData as Record<string, unknown>).forEach(([key, value]) => {
        if (typeof value === 'string') {
          (clientData as Record<string, unknown>)[key] = sanitizeInput(value);
        }
      });
    }

    const validatedData = await clientValidationSchema.parseAsync(clientData);
    
    return {
      success: true,
      data: validatedData as IClient
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Client validation failed', {
        errors: error.errors,
        data: clientData
      });
      
      return {
        success: false,
        errors: error.errors.map(err => err.message)
      };
    }
    
    logger.error('Unexpected validation error', { error });
    throw error;
  }
};

/**
 * Validates communication data with enhanced security controls
 * @param communicationData - Communication data to validate
 */
export const validateCommunication = async (communicationData: unknown): Promise<ValidationResult<ICommunication>> => {
  try {
    // Sanitize string inputs
    if (typeof communicationData === 'object' && communicationData !== null) {
      Object.entries(communicationData as Record<string, unknown>).forEach(([key, value]) => {
        if (typeof value === 'string') {
          (communicationData as Record<string, unknown>)[key] = sanitizeInput(value);
        }
      });
    }

    const validatedData = await communicationValidationSchema.parseAsync(communicationData);
    
    return {
      success: true,
      data: validatedData as ICommunication
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Communication validation failed', {
        errors: error.errors,
        data: communicationData
      });
      
      return {
        success: false,
        errors: error.errors.map(err => err.message)
      };
    }
    
    logger.error('Unexpected validation error', { error });
    throw error;
  }
};

/**
 * Type guard to check if a validation result is successful
 * @param result - Validation result to check
 */
export const isValidationSuccess = <T>(result: ValidationResult<T>): result is ValidationResult<T> & { data: T } => {
  return result.success && result.data !== undefined;
};