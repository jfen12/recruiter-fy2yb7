/**
 * @fileoverview Schema definitions for job requisitions using Zod validation
 * Provides comprehensive validation and type safety for requisition-related data structures
 * @version 1.0.0
 * @package RefactorTrack
 */

import { z } from 'zod'; // v3.21.4
import { BaseEntity } from '../types/common.types';

/**
 * Enumeration of all possible requisition statuses
 * Represents the complete lifecycle of a job requisition
 */
export enum RequisitionStatusEnum {
  DRAFT = 'DRAFT',                   // Initial creation state
  PENDING_APPROVAL = 'PENDING_APPROVAL', // Awaiting management approval
  OPEN = 'OPEN',                     // Approved and actively sourcing
  IN_PROGRESS = 'IN_PROGRESS',       // Candidates being evaluated
  ON_HOLD = 'ON_HOLD',              // Temporarily paused
  FILLED = 'FILLED',                // Position has been filled
  CLOSED = 'CLOSED',                // Requisition completed
  CANCELLED = 'CANCELLED'           // Requisition cancelled
}

/**
 * Schema for required skills with comprehensive validation rules
 * Enforces strict typing and business rules for skill requirements
 */
export const RequiredSkillSchema = z.object({
  skill_id: z.string().uuid({
    message: 'Invalid skill ID format'
  }),
  minimum_years: z.number().int().min(0, {
    message: 'Minimum years cannot be negative'
  }).max(20, {
    message: 'Maximum years of experience cannot exceed 20'
  }),
  preferred_years: z.number().int().min(0, {
    message: 'Preferred years cannot be negative'
  }).max(25, {
    message: 'Preferred years cannot exceed 25'
  }).optional(),
  required_level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'], {
    errorMap: () => ({ message: 'Invalid skill level specified' })
  }),
  skill_category: z.enum(['TECHNICAL', 'SOFT', 'DOMAIN', 'TOOL'], {
    errorMap: () => ({ message: 'Invalid skill category specified' })
  }),
  is_mandatory: z.boolean()
}).strict();

/**
 * Comprehensive schema for job requisitions
 * Implements complete validation rules and type safety
 */
export const RequisitionSchema = z.object({
  id: z.string().uuid({
    message: 'Invalid requisition ID format'
  }),
  title: z.string().min(1, {
    message: 'Title is required'
  }).max(200, {
    message: 'Title cannot exceed 200 characters'
  }),
  client_id: z.string().uuid({
    message: 'Invalid client ID format'
  }),
  description: z.string().min(1, {
    message: 'Description is required'
  }).max(2000, {
    message: 'Description cannot exceed 2000 characters'
  }),
  required_skills: z.array(RequiredSkillSchema).min(1, {
    message: 'At least one required skill must be specified'
  }).max(15, {
    message: 'Cannot exceed 15 required skills'
  }),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW'], {
    errorMap: () => ({ message: 'Invalid priority level specified' })
  }),
  location_type: z.enum(['REMOTE', 'ONSITE', 'HYBRID'], {
    errorMap: () => ({ message: 'Invalid location type specified' })
  }),
  max_submissions: z.number().int().min(1, {
    message: 'Minimum submissions must be at least 1'
  }).max(100, {
    message: 'Maximum submissions cannot exceed 100'
  }).optional(),
  status: z.nativeEnum(RequisitionStatusEnum, {
    errorMap: () => ({ message: 'Invalid requisition status' })
  }),
  rate: z.number().positive({
    message: 'Rate must be a positive number'
  }).max(1000000, {
    message: 'Rate cannot exceed 1,000,000'
  }),
  deadline: z.date({
    required_error: 'Deadline is required',
    invalid_type_error: 'Invalid deadline date format'
  }),
  created_at: z.date(),
  updated_at: z.date()
}).strict();

/**
 * Schema for requisition creation requests
 * Omits system-generated fields and enforces creation-specific validations
 */
export const CreateRequisitionSchema = z.object({
  title: z.string().min(1, {
    message: 'Title is required'
  }).max(200, {
    message: 'Title cannot exceed 200 characters'
  }),
  client_id: z.string().uuid({
    message: 'Invalid client ID format'
  }),
  description: z.string().min(1, {
    message: 'Description is required'
  }).max(2000, {
    message: 'Description cannot exceed 2000 characters'
  }),
  required_skills: z.array(RequiredSkillSchema).min(1, {
    message: 'At least one required skill must be specified'
  }).max(15, {
    message: 'Cannot exceed 15 required skills'
  }),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW'], {
    errorMap: () => ({ message: 'Invalid priority level specified' })
  }),
  location_type: z.enum(['REMOTE', 'ONSITE', 'HYBRID'], {
    errorMap: () => ({ message: 'Invalid location type specified' })
  }),
  rate: z.number().positive({
    message: 'Rate must be a positive number'
  }).max(1000000, {
    message: 'Rate cannot exceed 1,000,000'
  }),
  deadline: z.date().min(new Date(), {
    message: 'Deadline must be in the future'
  })
}).strict();

/**
 * Schema for requisition update requests
 * Supports partial updates and enforces update-specific validations
 */
export const UpdateRequisitionSchema = z.object({
  id: z.string().uuid({
    message: 'Invalid requisition ID format'
  }),
  title: z.string().min(1, {
    message: 'Title is required'
  }).max(200, {
    message: 'Title cannot exceed 200 characters'
  }).optional(),
  description: z.string().min(1, {
    message: 'Description is required'
  }).max(2000, {
    message: 'Description cannot exceed 2000 characters'
  }).optional(),
  required_skills: z.array(RequiredSkillSchema).min(1, {
    message: 'At least one required skill must be specified'
  }).max(15, {
    message: 'Cannot exceed 15 required skills'
  }).optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW'], {
    errorMap: () => ({ message: 'Invalid priority level specified' })
  }).optional(),
  location_type: z.enum(['REMOTE', 'ONSITE', 'HYBRID'], {
    errorMap: () => ({ message: 'Invalid location type specified' })
  }).optional(),
  status: z.nativeEnum(RequisitionStatusEnum, {
    errorMap: () => ({ message: 'Invalid requisition status' })
  }).optional(),
  rate: z.number().positive({
    message: 'Rate must be a positive number'
  }).max(1000000, {
    message: 'Rate cannot exceed 1,000,000'
  }).optional(),
  deadline: z.date().min(new Date(), {
    message: 'Deadline must be in the future'
  }).optional()
}).strict();

// Type inference for runtime type safety
export type Requisition = z.infer<typeof RequisitionSchema>;
export type CreateRequisition = z.infer<typeof CreateRequisitionSchema>;
export type UpdateRequisition = z.infer<typeof UpdateRequisitionSchema>;
export type RequiredSkill = z.infer<typeof RequiredSkillSchema>;