/**
 * @fileoverview TypeScript interfaces for job requisition entities and operations in RefactorTrack ATS.
 * Provides comprehensive type definitions with enhanced validation and tracking capabilities.
 * @version 1.0.0
 * @package RefactorTrack
 */

import { BaseEntity, UUID } from '../../shared/types/common.types';

/**
 * Enumeration of possible requisition statuses
 * Tracks the complete lifecycle of a job requisition
 */
export enum RequisitionStatus {
  DRAFT = 'DRAFT',           // Initial creation state
  OPEN = 'OPEN',            // Actively sourcing candidates
  IN_PROGRESS = 'IN_PROGRESS', // Candidates being evaluated
  ON_HOLD = 'ON_HOLD',      // Temporarily paused
  CLOSED = 'CLOSED',        // Successfully filled
  CANCELLED = 'CANCELLED'   // No longer active
}

/**
 * Enumeration of requisition priority levels
 * Used for sorting and filtering requisitions
 */
export enum RequisitionPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

/**
 * Enumeration of skill proficiency levels
 * Used for matching candidates to requirements
 */
export enum SkillLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT'
}

/**
 * Interface defining required skill specifications
 * Enhanced with validation and weighting capabilities
 */
export interface RequiredSkill {
  skill_id: UUID;
  minimum_years: number;
  required_level: SkillLevel;
  is_mandatory: boolean;
  weight: number;  // For candidate matching algorithms
}

/**
 * Interface defining location requirements
 * Supports both on-site and remote work arrangements
 */
export interface Location {
  city: string;
  state: string;
  country: string;
  remote_allowed: boolean;
}

/**
 * Main interface for requisition entities
 * Extends BaseEntity for standard fields and versioning
 */
export interface Requisition extends BaseEntity {
  title: string;
  client_id: UUID;
  hiring_manager_id: UUID;
  description: string;
  required_skills: RequiredSkill[];
  status: RequisitionStatus;
  priority: RequisitionPriority;
  location: Location;
  rate: number;           // Minimum rate/salary
  max_rate: number;       // Maximum rate/salary
  deadline: Date;         // Target fill date
}

/**
 * Interface for requisition creation
 * Omits auto-generated fields and enforces required data
 */
export interface CreateRequisitionDTO {
  title: string;
  client_id: UUID;
  hiring_manager_id: UUID;
  description: string;
  required_skills: RequiredSkill[];
  priority: RequisitionPriority;
  location: Location;
  rate: number;
  max_rate: number;
  deadline: Date;
}

/**
 * Interface for requisition updates
 * Makes all fields optional except ID for partial updates
 */
export interface UpdateRequisitionDTO {
  id: UUID;
  title?: string;
  description?: string;
  hiring_manager_id?: UUID;
  required_skills?: RequiredSkill[];
  status?: RequisitionStatus;
  priority?: RequisitionPriority;
  location?: Location;
  rate?: number;
  max_rate?: number;
  deadline?: Date;
}

/**
 * Interface for requisition search parameters
 * Supports advanced filtering and matching
 */
export interface RequisitionSearchParams {
  status?: RequisitionStatus[];
  priority?: RequisitionPriority[];
  client_id?: UUID;
  hiring_manager_id?: UUID;
  required_skills?: UUID[];
  location?: Partial<Location>;
  rate_range?: {
    min?: number;
    max?: number;
  };
  deadline_range?: {
    start: Date;
    end: Date;
  };
}

/**
 * Interface for requisition statistics
 * Used for analytics and reporting
 */
export interface RequisitionStats {
  total_open: number;
  total_filled: number;
  average_time_to_fill: number;
  by_status: Record<RequisitionStatus, number>;
  by_priority: Record<RequisitionPriority, number>;
  by_client: Record<string, number>;
}