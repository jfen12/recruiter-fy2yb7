/**
 * @fileoverview Zod schema definitions for candidate data validation in RefactorTrack ATS
 * Implements comprehensive validation rules with enhanced security measures
 * @version 1.0.0
 * @package RefactorTrack
 */

import { z } from 'zod'; // v3.21.4
import { BaseEntity } from '../types/common.types';

/**
 * Enumeration for candidate status in the system
 */
export enum CandidateStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PLACED = 'PLACED',
  BLACKLISTED = 'BLACKLISTED'
}

/**
 * Enumeration for skill proficiency levels
 */
export enum SkillProficiency {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT'
}

/**
 * Schema for candidate skills with enhanced validation
 */
export const SkillSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Skill name is required')
    .max(50, 'Skill name is too long')
    .regex(/^[a-zA-Z0-9\s\-\+\#\.]+$/, 'Skill name contains invalid characters'),
  
  years_of_experience: z.number()
    .min(0, 'Years must be non-negative')
    .max(50, 'Maximum 50 years allowed')
    .transform(Math.round), // Round to nearest integer
  
  proficiency_level: z.nativeEnum(SkillProficiency)
}).strict();

/**
 * Schema for work experience validation with enhanced security
 */
export const ExperienceSchema = z.object({
  company: z.string()
    .trim()
    .min(1, 'Company name is required')
    .max(100, 'Company name is too long')
    .regex(/^[a-zA-Z0-9\s\-\&\.]+$/, 'Company name contains invalid characters'),
  
  title: z.string()
    .trim()
    .min(1, 'Job title is required')
    .max(100, 'Job title is too long')
    .regex(/^[a-zA-Z0-9\s\-\.]+$/, 'Job title contains invalid characters'),
  
  start_date: z.date()
    .max(new Date(), 'Start date cannot be in the future'),
  
  end_date: z.date()
    .nullable()
    .refine(
      (date) => !date || date > new Date(this.start_date),
      'End date must be after start date'
    ),
  
  description: z.string()
    .max(1000, 'Description is too long')
    .regex(/^[a-zA-Z0-9\s\-\.,\(\)\&\'\"]+$/, 'Description contains invalid characters')
    .optional()
}).strict();

/**
 * Schema for education validation with enhanced institution validation
 */
export const EducationSchema = z.object({
  institution: z.string()
    .trim()
    .min(1, 'Institution name is required')
    .max(100, 'Institution name is too long')
    .regex(/^[a-zA-Z0-9\s\-\&\.]+$/, 'Institution name contains invalid characters'),
  
  degree: z.string()
    .trim()
    .min(1, 'Degree is required')
    .max(100, 'Degree name is too long')
    .regex(/^[a-zA-Z0-9\s\-\.]+$/, 'Degree contains invalid characters'),
  
  field_of_study: z.string()
    .trim()
    .min(1, 'Field of study is required')
    .max(100, 'Field of study is too long')
    .regex(/^[a-zA-Z0-9\s\-\.]+$/, 'Field of study contains invalid characters'),
  
  graduation_date: z.date()
    .max(new Date(), 'Graduation date cannot be in the future')
}).strict();

/**
 * Main schema for candidate validation with comprehensive security measures
 * Extends BaseEntity for common fields
 */
export const CandidateSchema = z.object({
  ...BaseEntity,
  
  first_name: z.string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name is too long')
    .regex(/^[a-zA-Z\s\-\']+$/, 'First name contains invalid characters'),
  
  last_name: z.string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name is too long')
    .regex(/^[a-zA-Z\s\-\']+$/, 'Last name contains invalid characters'),
  
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .max(255, 'Email is too long')
    .regex(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      'Email format is invalid'
    ),
  
  phone: z.string()
    .regex(
      /^\+?[1-9]\d{1,14}$/,
      'Invalid phone number format. Must be E.164 format'
    ),
  
  skills: z.array(SkillSchema)
    .min(1, 'At least one skill is required')
    .max(50, 'Maximum 50 skills allowed'),
  
  experience: z.array(ExperienceSchema)
    .max(20, 'Maximum 20 experiences allowed')
    .default([]),
  
  education: z.array(EducationSchema)
    .max(10, 'Maximum 10 education entries allowed')
    .default([]),
  
  status: z.nativeEnum(CandidateStatus)
    .default(CandidateStatus.ACTIVE),
  
  created_at: z.date(),
  updated_at: z.date()
}).strict();

/**
 * Type inference from the Candidate schema
 */
export type Candidate = z.infer<typeof CandidateSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Education = z.infer<typeof EducationSchema>;