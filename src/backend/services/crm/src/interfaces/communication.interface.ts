/**
 * @fileoverview Communication entity interface definitions and validation schemas for the CRM service
 * @version 1.0.0
 * @package RefactorTrack
 */

import { z } from 'zod'; // v3.21.4
import { BaseEntity } from '../../../shared/types/common.types';
import { IClient } from './client.interface';

/**
 * Enumeration of supported communication types
 */
export enum CommunicationType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  MEETING = 'MEETING',
  NOTE = 'NOTE'
}

/**
 * Enumeration of communication directions for tracking
 */
export enum CommunicationDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND'
}

/**
 * Enhanced interface for communication entities with comprehensive tracking
 */
export interface ICommunication extends BaseEntity {
  client_id: string;
  type: CommunicationType;
  direction: CommunicationDirection;
  subject: string;
  content: string;
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  scheduled_at?: Date;
}

/**
 * Interface for creating new communications
 */
export interface ICreateCommunicationDTO {
  client_id: string;
  type: CommunicationType;
  direction: CommunicationDirection;
  subject: string;
  content: string;
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  scheduled_at?: Date;
}

/**
 * Interface for updating existing communications
 */
export interface IUpdateCommunicationDTO {
  type?: CommunicationType;
  direction?: CommunicationDirection;
  subject?: string;
  content?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  scheduled_at?: Date;
}

/**
 * Zod validation schema for communication type
 */
export const CommunicationTypeSchema = z.nativeEnum(CommunicationType);

/**
 * Zod validation schema for communication direction
 */
export const CommunicationDirectionSchema = z.nativeEnum(CommunicationDirection);

/**
 * Zod validation schema for communication entities
 */
export const CommunicationSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid(),
  type: CommunicationTypeSchema,
  direction: CommunicationDirectionSchema,
  subject: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  contact_name: z.string().min(1).max(100),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
  scheduled_at: z.date().optional(),
  created_at: z.date(),
  updated_at: z.date()
});

/**
 * Zod validation schema for creating communications
 */
export const CreateCommunicationSchema = CommunicationSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

/**
 * Zod validation schema for updating communications
 */
export const UpdateCommunicationSchema = CommunicationSchema.partial().omit({
  id: true,
  client_id: true,
  created_at: true,
  updated_at: true
});

/**
 * Type guard function to check if a value is a valid communication
 * @param value - Value to check
 */
export function isCommunication(value: unknown): value is ICommunication {
  return CommunicationSchema.safeParse(value).success;
}

/**
 * Type guard function to check if a value is a valid communication type
 * @param value - Value to check
 */
export function isCommunicationType(value: unknown): value is CommunicationType {
  return CommunicationTypeSchema.safeParse(value).success;
}

/**
 * Type guard function to check if a value is a valid communication direction
 * @param value - Value to check
 */
export function isCommunicationDirection(value: unknown): value is CommunicationDirection {
  return CommunicationDirectionSchema.safeParse(value).success;
}

/**
 * Type for communication creation payload
 */
export type CreateCommunicationPayload = z.infer<typeof CreateCommunicationSchema>;

/**
 * Type for communication update payload
 */
export type UpdateCommunicationPayload = z.infer<typeof UpdateCommunicationSchema>;