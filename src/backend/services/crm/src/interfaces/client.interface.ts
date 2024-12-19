/**
 * @fileoverview Client entity interface definitions and validation schemas for the CRM service
 * @version 1.0.0
 * @package RefactorTrack
 */

import { z } from 'zod'; // v3.21.4
import { BaseEntity } from '../../../shared/types/common.types';

/**
 * Enumeration of supported industry types
 */
export enum IndustryType {
  TECHNOLOGY = 'TECHNOLOGY',
  FINANCE = 'FINANCE',
  HEALTHCARE = 'HEALTHCARE',
  OTHER = 'OTHER'
}

/**
 * Enumeration of possible client statuses
 */
export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_HOLD = 'ON_HOLD'
}

/**
 * Interface for client contact information
 */
export interface IClientContact {
  name: string;
  title: string;
  email: string;
  phone: string;
  is_primary: boolean;
}

/**
 * Interface for client status history entries
 */
interface IStatusHistoryEntry {
  status: ClientStatus;
  timestamp: Date;
  reason?: string;
}

/**
 * Enhanced interface for client entities with comprehensive tracking
 */
export interface IClient extends BaseEntity {
  company_name: string;
  industry: IndustryType;
  contacts: IClientContact[];
  status: ClientStatus;
  status_history: IStatusHistoryEntry[];
  billing_address: string;
  notes?: string;
}

/**
 * Zod validation schema for client contacts
 */
export const ClientContactSchema = z.object({
  name: z.string().min(1).max(100),
  title: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  is_primary: z.boolean()
});

/**
 * Zod validation schema for status history entries
 */
const StatusHistoryEntrySchema = z.object({
  status: z.nativeEnum(ClientStatus),
  timestamp: z.date(),
  reason: z.string().optional()
});

/**
 * Comprehensive Zod validation schema for client entities
 */
export const ClientSchema = z.object({
  id: z.string().uuid(),
  company_name: z.string().min(1).max(200),
  industry: z.nativeEnum(IndustryType),
  contacts: z.array(ClientContactSchema).min(1),
  status: z.nativeEnum(ClientStatus),
  status_history: z.array(StatusHistoryEntrySchema),
  billing_address: z.string().min(1).max(500),
  notes: z.string().max(2000).optional(),
  created_at: z.date(),
  updated_at: z.date()
});

/**
 * Schema for client creation - omits auto-generated fields
 */
export const CreateClientSchema = ClientSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  status_history: true
}).extend({
  status: z.nativeEnum(ClientStatus).default(ClientStatus.ACTIVE)
});

/**
 * Schema for client updates - makes all fields optional except id
 */
export const UpdateClientSchema = ClientSchema.partial().pick({
  id: true
}).extend({
  company_name: z.string().min(1).max(200).optional(),
  industry: z.nativeEnum(IndustryType).optional(),
  contacts: z.array(ClientContactSchema).min(1).optional(),
  status: z.nativeEnum(ClientStatus).optional(),
  billing_address: z.string().min(1).max(500).optional(),
  notes: z.string().max(2000).optional()
});

/**
 * Type guard function for client contacts
 * @param value - Value to check
 */
export function isClientContact(value: unknown): value is IClientContact {
  return ClientContactSchema.safeParse(value).success;
}

/**
 * Type guard function for client entities
 * @param value - Value to check
 */
export function isClient(value: unknown): value is IClient {
  return ClientSchema.safeParse(value).success;
}

/**
 * Type for client creation payload
 */
export type CreateClientPayload = z.infer<typeof CreateClientSchema>;

/**
 * Type for client update payload
 */
export type UpdateClientPayload = z.infer<typeof UpdateClientSchema>;