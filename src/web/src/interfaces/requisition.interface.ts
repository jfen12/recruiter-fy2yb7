/**
 * @fileoverview TypeScript interfaces and types for job requisitions in the RefactorTrack web application.
 * Provides comprehensive data structures for requisition management with strict validation and type safety.
 * @version 1.0.0
 */

import { BaseEntity } from './common.interface';
import {
  IsUUID,
  IsPositive,
  IsEnum,
  IsDate,
  MinLength,
  MaxLength,
  ValidateNested,
  Max,
  MinDate
} from 'class-validator'; // ^0.14.0

/**
 * Enum defining all possible requisition statuses with strict transition rules.
 * Ensures consistent status tracking across the application.
 */
export enum RequisitionStatus {
  /** Initial draft state for new requisitions */
  DRAFT = 'DRAFT',
  /** Requisition is open and actively accepting candidates */
  OPEN = 'OPEN',
  /** Requisition is being worked on with candidates in pipeline */
  IN_PROGRESS = 'IN_PROGRESS',
  /** Requisition is temporarily paused */
  ON_HOLD = 'ON_HOLD',
  /** Requisition has been successfully filled */
  CLOSED = 'CLOSED',
  /** Requisition has been cancelled before completion */
  CANCELLED = 'CANCELLED'
}

/**
 * Enum defining standardized skill proficiency levels.
 * Used for matching candidate skills with requisition requirements.
 */
export enum SkillLevel {
  /** 0-2 years of experience */
  BEGINNER = 'BEGINNER',
  /** 2-5 years of experience */
  INTERMEDIATE = 'INTERMEDIATE',
  /** 5-8 years of experience */
  ADVANCED = 'ADVANCED',
  /** 8+ years of experience */
  EXPERT = 'EXPERT'
}

/**
 * Interface defining a required skill for a job requisition.
 * Includes validation rules for skill requirements.
 */
export interface RequiredSkill {
  /** UUID reference to the skill in the skills database */
  @IsUUID('4')
  skill_id: string;

  /** Minimum years of experience required for the skill */
  @IsPositive()
  minimum_years: number;

  /** Required proficiency level for the skill */
  @IsEnum(SkillLevel)
  required_level: SkillLevel;

  /** Indicates if the skill is mandatory for the position */
  is_mandatory: boolean;
}

/**
 * Comprehensive interface for job requisition data with enhanced validation.
 * Extends BaseEntity to inherit common fields (id, createdAt, updatedAt).
 */
export interface Requisition extends BaseEntity {
  /** Title of the job requisition */
  @MinLength(5, { message: 'Title must be at least 5 characters long' })
  title: string;

  /** UUID reference to the client creating the requisition */
  @IsUUID('4', { message: 'Invalid client ID format' })
  client_id: string;

  /** Detailed description of the job requirements and responsibilities */
  @MinLength(50, { message: 'Description must be at least 50 characters long' })
  @MaxLength(5000, { message: 'Description cannot exceed 5000 characters' })
  description: string;

  /** Array of required skills with their respective requirements */
  @ValidateNested({ each: true })
  required_skills: RequiredSkill[];

  /** Current status of the requisition */
  @IsEnum(RequisitionStatus, { message: 'Invalid requisition status' })
  status: RequisitionStatus;

  /** Hourly rate or salary for the position */
  @IsPositive({ message: 'Rate must be a positive number' })
  @Max(1000, { message: 'Rate cannot exceed 1000' })
  rate: number;

  /** Deadline for filling the position */
  @IsDate({ message: 'Invalid date format' })
  @MinDate(new Date(), { message: 'Deadline must be in the future' })
  deadline: Date;
}

/**
 * Type guard to check if a value is a valid RequisitionStatus
 * @param value The value to check
 * @returns boolean indicating if the value is a valid RequisitionStatus
 */
export const isRequisitionStatus = (value: unknown): value is RequisitionStatus => {
  return typeof value === 'string' && Object.values(RequisitionStatus).includes(value as RequisitionStatus);
};

/**
 * Type guard to check if a value is a valid SkillLevel
 * @param value The value to check
 * @returns boolean indicating if the value is a valid SkillLevel
 */
export const isSkillLevel = (value: unknown): value is SkillLevel => {
  return typeof value === 'string' && Object.values(SkillLevel).includes(value as SkillLevel);
};

/**
 * Type for creating a new requisition, omitting BaseEntity fields
 */
export type CreateRequisitionDTO = Omit<Requisition, keyof BaseEntity>;

/**
 * Type for updating an existing requisition, making all fields optional
 */
export type UpdateRequisitionDTO = Partial<CreateRequisitionDTO>;

/**
 * Interface for requisition search parameters
 */
export interface RequisitionSearchParams {
  title?: string;
  client_id?: string;
  status?: RequisitionStatus;
  min_rate?: number;
  max_rate?: number;
  skills?: string[];
  deadline_before?: Date;
  deadline_after?: Date;
}