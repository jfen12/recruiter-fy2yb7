/**
 * @fileoverview Core TypeScript type definitions and interfaces shared across RefactorTrack ATS backend services.
 * @version 1.0.0
 * @package RefactorTrack
 */

import { z } from 'zod'; // v3.21.4 - Runtime type validation

/**
 * UUID type with branded type safety
 * Ensures UUID format validation at compile time
 */
export type UUID = string & { readonly _brand: 'UUID' };

/**
 * Timestamp type with branded type safety
 * Ensures ISO timestamp format validation at compile time
 */
export type Timestamp = number & { readonly _brand: 'Timestamp' };

/**
 * Enumeration of supported HTTP methods
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD'
}

/**
 * Base interface for all database entities
 * Implements standard fields for versioning and soft delete functionality
 */
export interface BaseEntity {
  id: UUID;
  created_at: Date;
  updated_at: Date;
  version: number;
  deleted_at: Date | null;
}

/**
 * Interface for date range queries
 * Used for filtering and reporting functionality
 */
export interface DateRange {
  start_date: Date;
  end_date: Date;
}

/**
 * Enhanced interface for pagination parameters
 * Supports sorting, searching, and filtering capabilities
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  search_query?: string;
  filters: Record<string, unknown>;
}

/**
 * Generic type for standardized API responses
 * Includes support for metadata, pagination, and error handling
 * @template T - The type of data being returned
 */
export interface ApiResponse<T> {
  data: T | null;
  status: number;
  message: string;
  errors: string[] | null;
  metadata: Record<string, unknown>;
  pagination: {
    total: number;
    page: number;
    limit: number;
  } | null;
}

/**
 * Zod schema for UUID validation
 */
export const UUIDSchema = z.string().uuid();

/**
 * Zod schema for base entity validation
 */
export const BaseEntitySchema = z.object({
  id: UUIDSchema,
  created_at: z.date(),
  updated_at: z.date(),
  version: z.number().int().positive(),
  deleted_at: z.date().nullable()
});

/**
 * Zod schema for pagination parameters validation
 */
export const PaginationParamsSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive().max(100),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  search_query: z.string().optional(),
  filters: z.record(z.unknown())
});

/**
 * Type guard to check if a value is a valid UUID
 * @param value - Value to check
 */
export function isUUID(value: unknown): value is UUID {
  return UUIDSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is a valid timestamp
 * @param value - Value to check
 */
export function isTimestamp(value: unknown): value is Timestamp {
  return z.number().positive().safeParse(value).success;
}

/**
 * Utility type for making all properties in T required and non-nullable
 */
export type Required<T> = {
  [P in keyof T]-?: NonNullable<T[P]>;
};

/**
 * Utility type for making all properties in T optional
 */
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

/**
 * Utility type for picking specific properties from T
 */
export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

/**
 * Utility type for omitting specific properties from T
 */
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * Utility type for creating a readonly version of T
 */
export type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};