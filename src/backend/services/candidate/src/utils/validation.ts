/**
 * @fileoverview Validation utility module for the candidate service providing Zod schemas
 * and validation functions for candidate-related data structures with GDPR compliance.
 * @version 1.0.0
 * @package RefactorTrack
 */

import { z } from 'zod'; // v3.22.0
import { ICandidate } from '../interfaces/candidate.interface';
import { ISkill } from '../interfaces/skill.interface';

// Validation Constants
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;
export const MAX_STRING_LENGTH = 255;
export const MAX_DESCRIPTION_LENGTH = 2000;
export const MIN_RETENTION_PERIOD = 365; // 1 year minimum retention
export const MAX_RETENTION_PERIOD = 1825; // 5 years maximum retention

/**
 * Enhanced Zod schema for candidate data validation with GDPR compliance
 */
export const candidateSchema = z.object({
  first_name: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s-']+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),

  last_name: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s-']+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),

  email: z.string()
    .email('Invalid email format')
    .regex(EMAIL_REGEX, 'Email format is invalid')
    .max(MAX_STRING_LENGTH, 'Email cannot exceed 255 characters'),

  phone: z.string()
    .regex(PHONE_REGEX, 'Phone number must be in international format (e.g., +1234567890)')
    .max(20, 'Phone number cannot exceed 20 characters'),

  status: z.enum(['ACTIVE', 'INACTIVE', 'PLACED', 'BLACKLISTED', 'GDPR_DELETED'], {
    errorMap: () => ({ message: 'Invalid candidate status' })
  }),

  gdpr_consent: z.boolean({
    required_error: 'GDPR consent is required',
    invalid_type_error: 'GDPR consent must be a boolean'
  }),

  data_retention_period: z.number()
    .int('Retention period must be a whole number')
    .min(MIN_RETENTION_PERIOD, 'Minimum retention period is 1 year')
    .max(MAX_RETENTION_PERIOD, 'Maximum retention period is 5 years')
});

/**
 * Enhanced Zod schema for skill validation with experience tracking
 */
export const skillSchema = z.object({
  name: z.string()
    .min(1, 'Skill name is required')
    .max(100, 'Skill name cannot exceed 100 characters'),

  category: z.enum(['PROGRAMMING_LANGUAGE', 'FRAMEWORK', 'DATABASE', 'CLOUD', 'DEVOPS', 'SOFT_SKILL', 'OTHER'], {
    errorMap: () => ({ message: 'Invalid skill category' })
  }),

  proficiency_level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'], {
    errorMap: () => ({ message: 'Invalid proficiency level' })
  }),

  years_of_experience: z.number()
    .min(0, 'Years of experience cannot be negative')
    .max(50, 'Years of experience cannot exceed 50'),

  last_used_date: z.date({
    required_error: 'Last used date is required',
    invalid_type_error: 'Last used date must be a valid date'
  }).refine((date) => date <= new Date(), {
    message: 'Last used date cannot be in the future'
  })
});

/**
 * Enhanced Zod schema for education validation
 */
export const educationSchema = z.object({
  institution: z.string()
    .min(1, 'Institution name is required')
    .max(100, 'Institution name cannot exceed 100 characters'),

  degree: z.string()
    .min(1, 'Degree is required')
    .max(100, 'Degree cannot exceed 100 characters'),

  field_of_study: z.string()
    .min(1, 'Field of study is required')
    .max(100, 'Field of study cannot exceed 100 characters'),

  graduation_date: z.date()
    .refine((date) => date <= new Date(), {
      message: 'Graduation date cannot be in the future'
    })
});

/**
 * Validates candidate data against defined schema with enhanced GDPR compliance checks
 * @param candidateData - The candidate data to validate
 * @returns Promise<boolean> - Returns true if validation passes, throws ZodError with detailed messages if validation fails
 */
export async function validateCandidateData(candidateData: Partial<ICandidate>): Promise<boolean> {
  try {
    await candidateSchema.parseAsync(candidateData);
    
    // Additional GDPR compliance checks
    if (candidateData.gdpr_consent === false) {
      throw new Error('GDPR consent is required to process candidate data');
    }

    if (candidateData.data_retention_period) {
      const retentionEndDate = new Date();
      retentionEndDate.setDate(retentionEndDate.getDate() + candidateData.data_retention_period);
      
      if (retentionEndDate < new Date()) {
        throw new Error('Data retention period has expired');
      }
    }

    return true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

/**
 * Validates skill data including proficiency and detailed experience tracking
 * @param skillData - The skill data to validate
 * @returns Promise<boolean> - Returns true if validation passes, throws ZodError with detailed messages if validation fails
 */
export async function validateSkillData(skillData: Partial<ISkill>): Promise<boolean> {
  try {
    await skillSchema.parseAsync(skillData);

    // Additional validation for experience correlation
    if (skillData.proficiency_level === 'EXPERT' && (skillData.years_of_experience || 0) < 5) {
      throw new Error('Expert level requires minimum 5 years of experience');
    }

    if (skillData.last_used_date) {
      const yearsInactive = (new Date().getTime() - skillData.last_used_date.getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (yearsInactive > 2) {
        throw new Error('Skill not actively used in the past 2 years - requires reassessment');
      }
    }

    return true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Skill validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

/**
 * Validates education history data with comprehensive checks
 * @param educationData - The education data to validate
 * @returns Promise<boolean> - Returns true if validation passes, throws ZodError with detailed messages if validation fails
 */
export async function validateEducationData(educationData: any): Promise<boolean> {
  try {
    await educationSchema.parseAsync(educationData);

    // Additional validation for dates
    if (educationData.graduation_date) {
      const minEducationDate = new Date();
      minEducationDate.setFullYear(minEducationDate.getFullYear() - 100);
      
      if (educationData.graduation_date < minEducationDate) {
        throw new Error('Graduation date is too far in the past');
      }
    }

    return true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Education validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}