/**
 * @fileoverview Client entity schema definitions with comprehensive validation rules
 * @version 1.0.0
 * @package RefactorTrack
 */

import { z } from 'zod'; // v3.21.4
import { BaseEntity } from '../types/common.types';

/**
 * Enumeration of possible client statuses
 */
export enum ClientStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_HOLD = 'ON_HOLD'
}

/**
 * Schema for validating client contact information
 * Implements strict validation rules for contact details
 */
export const ClientContactSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Contact name is required')
    .max(100, 'Contact name must not exceed 100 characters'),
  
  title: z.string()
    .trim()
    .min(1, 'Contact title is required')
    .max(100, 'Contact title must not exceed 100 characters'),
  
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  
  phone: z.string()
    .regex(
      /^\+?[1-9]\d{1,14}$/, 
      'Phone number must be in E.164 format'
    )
    .trim(),
  
  is_primary: z.boolean()
    .default(false),
  
  department: z.string()
    .min(1, 'Department name is required')
    .max(100, 'Department name must not exceed 100 characters')
    .optional(),
  
  preferences: z.object({
    communication_method: z.enum(['email', 'phone', 'both'])
  })
});

/**
 * Comprehensive schema for client entities
 * Implements all required validations and type safety measures
 */
export const ClientSchema = z.object({
  id: z.string().uuid('Invalid client ID format'),
  
  company_name: z.string()
    .trim()
    .min(1, 'Company name is required')
    .max(200, 'Company name must not exceed 200 characters'),
  
  industry: z.string()
    .trim()
    .min(1, 'Industry is required')
    .max(100, 'Industry must not exceed 100 characters'),
  
  contacts: z.array(ClientContactSchema)
    .min(1, 'At least one contact is required')
    .max(10, 'Maximum of 10 contacts allowed'),
  
  status: z.nativeEnum(ClientStatusEnum),
  
  billing_address: z.string()
    .trim()
    .min(1, 'Billing address is required')
    .max(500, 'Billing address must not exceed 500 characters'),
  
  notes: z.string()
    .max(2000, 'Notes must not exceed 2000 characters')
    .optional(),
  
  preferences: z.object({
    billing_cycle: z.enum(['monthly', 'quarterly', 'annual'])
  }),
  
  created_at: z.date(),
  updated_at: z.date()
});

/**
 * Schema for client creation requests
 * Implements validation rules specific to client creation
 */
export const CreateClientSchema = z.object({
  company_name: z.string()
    .trim()
    .min(1, 'Company name is required')
    .max(200, 'Company name must not exceed 200 characters'),
  
  industry: z.string()
    .trim()
    .min(1, 'Industry is required')
    .max(100, 'Industry must not exceed 100 characters'),
  
  contacts: z.array(ClientContactSchema)
    .min(1, 'At least one contact is required')
    .max(10, 'Maximum of 10 contacts allowed')
    .refine(
      contacts => contacts.filter(c => c.is_primary).length === 1,
      'Exactly one primary contact must be designated'
    ),
  
  billing_address: z.string()
    .trim()
    .min(1, 'Billing address is required')
    .max(500, 'Billing address must not exceed 500 characters'),
  
  notes: z.string()
    .max(2000, 'Notes must not exceed 2000 characters')
    .optional(),
  
  preferences: z.object({
    billing_cycle: z.enum(['monthly', 'quarterly', 'annual'])
  })
});

/**
 * Schema for client update requests
 * Implements validation rules for partial updates
 */
export const UpdateClientSchema = z.object({
  id: z.string().uuid('Invalid client ID format'),
  
  company_name: z.string()
    .trim()
    .min(1, 'Company name is required')
    .max(200, 'Company name must not exceed 200 characters')
    .optional(),
  
  industry: z.string()
    .trim()
    .min(1, 'Industry is required')
    .max(100, 'Industry must not exceed 100 characters')
    .optional(),
  
  contacts: z.array(ClientContactSchema)
    .min(1, 'At least one contact is required')
    .max(10, 'Maximum of 10 contacts allowed')
    .refine(
      contacts => !contacts || contacts.filter(c => c.is_primary).length === 1,
      'Exactly one primary contact must be designated'
    )
    .optional(),
  
  status: z.nativeEnum(ClientStatusEnum)
    .optional(),
  
  billing_address: z.string()
    .trim()
    .min(1, 'Billing address is required')
    .max(500, 'Billing address must not exceed 500 characters')
    .optional(),
  
  notes: z.string()
    .max(2000, 'Notes must not exceed 2000 characters')
    .optional(),
  
  preferences: z.object({
    billing_cycle: z.enum(['monthly', 'quarterly', 'annual'])
  }).optional()
});

/**
 * Type definitions derived from schemas
 */
export type Client = z.infer<typeof ClientSchema>;
export type ClientContact = z.infer<typeof ClientContactSchema>;
export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;