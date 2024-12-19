/**
 * @fileoverview Core TypeScript interfaces and types for the RefactorTrack web application.
 * Provides foundational data structures, pagination utilities, and API response formats
 * with strict type safety and validation patterns.
 * @version 1.0.0
 */

/**
 * Base interface providing common fields for all entity types in the application.
 * Ensures consistent entity structure and tracking capabilities across the system.
 */
export interface BaseEntity {
  /** Unique identifier for the entity (UUID format) */
  id: string;
  
  /** Timestamp indicating when the entity was created */
  createdAt: Date;
  
  /** Timestamp indicating when the entity was last modified */
  updatedAt: Date;
}

/**
 * Generic interface for handling paginated API responses.
 * Provides type-safe data arrays with comprehensive pagination metadata.
 * @template T The type of items contained in the paginated response
 */
export interface PaginatedResponse<T> {
  /** Array of typed items for the current page */
  data: T[];
  
  /** Total count of items across all pages */
  total: number;
  
  /** Current page number (1-based indexing) */
  page: number;
  
  /** Number of items per page */
  pageSize: number;
  
  /** Total number of available pages */
  totalPages: number;
}

/**
 * Generic interface for standardized API responses.
 * Ensures consistent response structure with type-safe payloads.
 * @template T The type of data contained in the response
 */
export interface ApiResponse<T> {
  /** Type-safe response payload */
  data: T;
  
  /** Indicates if the request was successful */
  success: boolean;
  
  /** Optional message providing additional context or error details */
  message: string;
  
  /** Response timestamp for auditing and tracking */
  timestamp: Date;
}

/**
 * Type definition for sort direction options.
 * Ensures consistent sorting behavior across the application.
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Type definition for comprehensive filter comparison operators.
 * Enables advanced data filtering capabilities with type safety.
 */
export type FilterOperator =
  | 'eq'        // Equal
  | 'neq'       // Not Equal
  | 'gt'        // Greater Than
  | 'gte'       // Greater Than or Equal
  | 'lt'        // Less Than
  | 'lte'       // Less Than or Equal
  | 'contains'  // Contains substring
  | 'startsWith'// Starts with substring
  | 'endsWith'; // Ends with substring

/**
 * Type guard to check if a value is a valid SortOrder
 * @param value The value to check
 * @returns boolean indicating if the value is a valid SortOrder
 */
export const isSortOrder = (value: unknown): value is SortOrder => {
  return typeof value === 'string' && ['asc', 'desc'].includes(value);
};

/**
 * Type guard to check if a value is a valid FilterOperator
 * @param value The value to check
 * @returns boolean indicating if the value is a valid FilterOperator
 */
export const isFilterOperator = (value: unknown): value is FilterOperator => {
  const validOperators = [
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'contains', 'startsWith', 'endsWith'
  ];
  return typeof value === 'string' && validOperators.includes(value);
};