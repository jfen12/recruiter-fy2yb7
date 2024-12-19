/**
 * @fileoverview TypeScript interface definitions for candidate entities in the RefactorTrack ATS system.
 * Implements comprehensive type safety, GDPR compliance, and data validation for candidate profiles.
 * @version 1.0.0
 * @package RefactorTrack
 */

import { z } from 'zod'; // v3.21.4
import { BaseEntity } from '../../../shared/types/common.types';
import { ISkill, ICandidateSkill, SkillProficiency } from './skill.interface';

/**
 * Enumeration of possible candidate statuses in the system
 */
export enum CandidateStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PLACED = 'PLACED',
  BLACKLISTED = 'BLACKLISTED',
  GDPR_DELETED = 'GDPR_DELETED'
}

/**
 * Interface defining candidate work experience entries
 */
export interface IWorkExperience {
  company: string;
  title: string;
  start_date: Date;
  end_date: Date | null;
  description: string;
  technologies_used: string[];
  is_current: boolean;
  location: string;
  achievements: string[];
}

/**
 * Interface defining candidate education entries
 */
export interface IEducation {
  institution: string;
  degree: string;
  field_of_study: string;
  graduation_date: Date;
  gpa: number | null;
  honors: string[];
  certifications: string[];
  is_verified: boolean;
}

/**
 * Interface for salary expectations with currency support
 */
export interface ISalaryExpectation {
  minimum: number;
  maximum: number;
  currency: string;
  rate_type: 'HOURLY' | 'ANNUAL';
}

/**
 * Core candidate interface with comprehensive profile data and GDPR compliance
 */
export interface ICandidate extends BaseEntity {
  // Personal Information (GDPR-sensitive)
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  
  // Professional Details
  skills: ICandidateSkill[];
  experience: IWorkExperience[];
  education: IEducation[];
  status: CandidateStatus;
  
  // Documents and Media
  resume_url: string;
  profile_picture_url?: string;
  portfolio_url?: string;
  
  // Preferences and Availability
  preferred_location: string;
  willing_to_relocate: boolean;
  remote_work_preference: 'REMOTE' | 'HYBRID' | 'ONSITE';
  availability_date: Date;
  salary_expectations: ISalaryExpectation;
  
  // GDPR Compliance
  gdpr_consent: boolean;
  data_retention_date: Date;
  marketing_consent: boolean;
  last_consent_date: Date;
  
  // System Fields
  source: string;
  tags: string[];
  notes: string[];
  last_activity_date: Date;
}

/**
 * Zod validation schema for work experience
 */
export const workExperienceSchema = z.object({
  company: z.string().min(1).max(100),
  title: z.string().min(1).max(100),
  start_date: z.date(),
  end_date: z.date().nullable(),
  description: z.string().max(2000),
  technologies_used: z.array(z.string()),
  is_current: z.boolean(),
  location: z.string(),
  achievements: z.array(z.string())
});

/**
 * Zod validation schema for education
 */
export const educationSchema = z.object({
  institution: z.string().min(1).max(100),
  degree: z.string().min(1).max(100),
  field_of_study: z.string().min(1).max(100),
  graduation_date: z.date(),
  gpa: z.number().min(0).max(4).nullable(),
  honors: z.array(z.string()),
  certifications: z.array(z.string()),
  is_verified: z.boolean()
});

/**
 * Zod validation schema for salary expectations
 */
export const salaryExpectationSchema = z.object({
  minimum: z.number().positive(),
  maximum: z.number().positive(),
  currency: z.string().length(3),
  rate_type: z.enum(['HOURLY', 'ANNUAL'])
});

/**
 * Comprehensive Zod validation schema for candidate data
 */
export const candidateSchema = z.object({
  // Personal Information
  first_name: z.string().min(1).max(50),
  last_name: z.string().min(1).max(50),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  
  // Professional Details
  skills: z.array(z.object({
    skill_id: z.string().uuid(),
    years_of_experience: z.number().min(0),
    proficiency_level: z.nativeEnum(SkillProficiency)
  })),
  experience: z.array(workExperienceSchema),
  education: z.array(educationSchema),
  status: z.nativeEnum(CandidateStatus),
  
  // Documents and Media
  resume_url: z.string().url(),
  profile_picture_url: z.string().url().optional(),
  portfolio_url: z.string().url().optional(),
  
  // Preferences
  preferred_location: z.string(),
  willing_to_relocate: z.boolean(),
  remote_work_preference: z.enum(['REMOTE', 'HYBRID', 'ONSITE']),
  availability_date: z.date(),
  salary_expectations: salaryExpectationSchema,
  
  // GDPR Compliance
  gdpr_consent: z.boolean(),
  data_retention_date: z.date(),
  marketing_consent: z.boolean(),
  last_consent_date: z.date(),
  
  // System Fields
  source: z.string(),
  tags: z.array(z.string()),
  notes: z.array(z.string()),
  last_activity_date: z.date()
});

/**
 * Type guard to check if an object is a valid ICandidate
 */
export function isCandidate(value: unknown): value is ICandidate {
  return candidateSchema.safeParse(value).success;
}