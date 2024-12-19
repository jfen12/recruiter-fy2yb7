/**
 * @fileoverview TypeScript interface definitions for candidate-related data structures
 * in the RefactorTrack web application. Provides comprehensive type safety and validation
 * for candidate management features.
 * @version 1.0.0
 */

import { PaginatedResponse } from './common.interface';

/**
 * Enum defining possible candidate statuses in the system.
 * Used for tracking candidate availability and placement status.
 */
export enum CandidateStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PLACED = 'PLACED',
  BLACKLISTED = 'BLACKLISTED'
}

/**
 * Enum defining standardized skill proficiency levels.
 * Ensures consistent skill assessment across the platform.
 */
export enum SkillProficiency {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT'
}

/**
 * Interface for detailed candidate skill information.
 * Tracks technical skills with experience levels and proficiency.
 */
export interface ISkill {
  /** Name of the technical skill */
  name: string;

  /** Years of experience with the skill */
  years_of_experience: number;

  /** Current proficiency level using standardized enum */
  proficiency_level: SkillProficiency;

  /** Most recent date the skill was actively used */
  last_used_date: Date;
}

/**
 * Interface for comprehensive work experience data.
 * Captures detailed employment history and responsibilities.
 */
export interface IExperience {
  /** Name of the employer company */
  company: string;

  /** Job title held at the company */
  title: string;

  /** Start date of employment period */
  start_date: Date;

  /** End date of employment or null if current position */
  end_date: Date | null;

  /** Detailed job description and responsibilities */
  description: string;
}

/**
 * Interface for educational background information.
 * Tracks academic achievements and certifications.
 */
export interface IEducation {
  /** Name of educational institution */
  institution: string;

  /** Degree or certification earned */
  degree: string;

  /** Field or major of study */
  field_of_study: string;

  /** Date of graduation or completion */
  graduation_date: Date;
}

/**
 * Comprehensive interface for candidate profile data with strict typing.
 * Central data structure for candidate management features.
 */
export interface ICandidate {
  /** Unique identifier for the candidate */
  id: string;

  /** Candidate's first name */
  first_name: string;

  /** Candidate's last name */
  last_name: string;

  /** Candidate's email address with validation requirements */
  email: string;

  /** Candidate's phone number with format validation */
  phone: string;

  /** Array of candidate's technical skills with proficiency levels */
  skills: ISkill[];

  /** Array of work experience entries with detailed information */
  experience: IExperience[];

  /** Array of education entries with institution details */
  education: IEducation[];

  /** Current status in the system using predefined enum */
  status: CandidateStatus;

  /** Timestamp of profile creation for audit trails */
  created_at: Date;

  /** Timestamp of last profile update for tracking */
  updated_at: Date;
}

/**
 * Type definition for paginated candidate response.
 * Ensures type safety when handling paginated candidate lists.
 */
export type PaginatedCandidateResponse = PaginatedResponse<ICandidate>;

/**
 * Type definition for candidate search parameters.
 * Provides type safety for candidate search operations.
 */
export interface ICandidateSearchParams {
  /** Search query string */
  query?: string;

  /** Filter by candidate status */
  status?: CandidateStatus;

  /** Filter by specific skills */
  skills?: string[];

  /** Minimum years of experience */
  minExperience?: number;

  /** Maximum years of experience */
  maxExperience?: number;
}