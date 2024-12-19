/**
 * @fileoverview TypeScript interfaces and validation schemas for client management
 * Provides type-safe data structures and runtime validation for client-related features
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.21.4
import { PaginatedResponse } from './common.interface';

/**
 * Enum defining possible client status values
 * Used for consistent status management across the application
 */
export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_HOLD = 'ON_HOLD'
}

/**
 * Interface defining the structure for client contact information
 */
export interface IClientContact {
  /** Full name of the contact person */
  name: string;
  
  /** Job title or position of the contact */
  title: string;
  
  /** Business email address */
  email: string;
  
  /** Contact phone number */
  phone: string;
  
  /** Indicates if this is the primary contact */
  is_primary: boolean;
}

/**
 * Zod schema for validating client contact data
 * Implements strict validation rules for contact information
 */
export const ClientContactSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  title: z.string()
    .min(2, 'Title must be at least 2 characters')
    .max(100, 'Title cannot exceed 100 characters'),
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email cannot exceed 255 characters'),
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  is_primary: z.boolean()
});

/**
 * Main interface for client entities
 * Provides comprehensive structure for client data
 */
export interface IClient {
  /** Unique identifier for the client */
  id: string;
  
  /** Official company name */
  company_name: string;
  
  /** Industry sector or category */
  industry: string;
  
  /** Array of contact persons */
  contacts: IClientContact[];
  
  /** Current client status */
  status: ClientStatus;
  
  /** Complete billing address */
  billing_address: string;
  
  /** Optional notes or comments */
  notes?: string;
  
  /** Creation timestamp */
  created_at: Date;
  
  /** Last update timestamp */
  updated_at: Date;
}

/**
 * Zod schema for validating complete client data
 * Implements comprehensive validation rules for client entities
 */
export const ClientSchema = z.object({
  id: z.string().uuid('Invalid client ID format'),
  company_name: z.string()
    .min(2, 'Company name must be at least 2 characters')
    .max(200, 'Company name cannot exceed 200 characters'),
  industry: z.string()
    .min(2, 'Industry must be at least 2 characters')
    .max(100, 'Industry cannot exceed 100 characters'),
  contacts: z.array(ClientContactSchema)
    .min(1, 'At least one contact is required')
    .max(10, 'Cannot exceed 10 contacts'),
  status: z.nativeEnum(ClientStatus),
  billing_address: z.string()
    .min(10, 'Billing address must be at least 10 characters')
    .max(500, 'Billing address cannot exceed 500 characters'),
  notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional(),
  created_at: z.date(),
  updated_at: z.date()
});

/**
 * Interface for client creation data transfer object
 * Defines required fields for creating new clients
 */
export interface ICreateClientDTO {
  company_name: string;
  industry: string;
  contacts: IClientContact[];
  billing_address: string;
  notes?: string;
}

/**
 * Zod schema for validating client creation data
 * Implements validation rules for new client creation
 */
export const CreateClientSchema = z.object({
  company_name: z.string()
    .min(2, 'Company name must be at least 2 characters')
    .max(200, 'Company name cannot exceed 200 characters'),
  industry: z.string()
    .min(2, 'Industry must be at least 2 characters')
    .max(100, 'Industry cannot exceed 100 characters'),
  contacts: z.array(ClientContactSchema)
    .min(1, 'At least one contact is required')
    .max(10, 'Cannot exceed 10 contacts'),
  billing_address: z.string()
    .min(10, 'Billing address must be at least 10 characters')
    .max(500, 'Billing address cannot exceed 500 characters'),
  notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional()
});

/**
 * Interface for client update data transfer object
 * Defines optional fields for updating existing clients
 */
export interface IUpdateClientDTO {
  company_name?: string;
  industry?: string;
  contacts?: IClientContact[];
  status?: ClientStatus;
  billing_address?: string;
  notes?: string;
}

/**
 * Zod schema for validating client update data
 * Implements validation rules for partial client updates
 */
export const UpdateClientSchema = z.object({
  company_name: z.string()
    .min(2, 'Company name must be at least 2 characters')
    .max(200, 'Company name cannot exceed 200 characters')
    .optional(),
  industry: z.string()
    .min(2, 'Industry must be at least 2 characters')
    .max(100, 'Industry cannot exceed 100 characters')
    .optional(),
  contacts: z.array(ClientContactSchema)
    .min(1, 'At least one contact is required')
    .max(10, 'Cannot exceed 10 contacts')
    .optional(),
  status: z.nativeEnum(ClientStatus).optional(),
  billing_address: z.string()
    .min(10, 'Billing address must be at least 10 characters')
    .max(500, 'Billing address cannot exceed 500 characters')
    .optional(),
  notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional()
});

/**
 * Type definition for paginated client response
 * Provides type-safe pagination for client lists
 */
export type PaginatedClientResponse = PaginatedResponse<IClient>;