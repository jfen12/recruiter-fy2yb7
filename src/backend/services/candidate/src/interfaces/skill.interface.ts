/**
 * @fileoverview TypeScript interface definitions for candidate skills in the RefactorTrack ATS system.
 * Provides comprehensive type definitions for skill management, proficiency tracking, and matching capabilities.
 * @version 1.0.0
 * @package RefactorTrack
 */

import { BaseEntity } from '../../../shared/types/common.types';

/**
 * Enum defining standardized skill proficiency levels
 * Used for consistent skill assessment across the platform
 */
export enum SkillProficiency {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT'
}

/**
 * Enum defining comprehensive skill categories for better organization
 * Enables structured skill classification and improved searchability
 */
export enum SkillCategory {
  PROGRAMMING_LANGUAGE = 'PROGRAMMING_LANGUAGE',
  FRAMEWORK = 'FRAMEWORK',
  DATABASE = 'DATABASE',
  CLOUD = 'CLOUD',
  DEVOPS = 'DEVOPS',
  SOFT_SKILL = 'SOFT_SKILL',
  OTHER = 'OTHER'
}

/**
 * Comprehensive interface for candidate skill data with enhanced tracking capabilities
 * Extends BaseEntity to inherit standard fields (id, created_at, updated_at, etc.)
 */
export interface ISkill extends BaseEntity {
  /**
   * Name of the skill (e.g., Java, Python, AWS)
   */
  name: string;

  /**
   * Category classification of the skill
   */
  category: SkillCategory;

  /**
   * Total years of experience with the skill
   * @minimum 0
   */
  years_of_experience: number;

  /**
   * Current assessed proficiency level
   */
  proficiency_level: SkillProficiency;

  /**
   * Most recent date the skill was actively used
   */
  last_used_date: Date;

  /**
   * Indicates if this is a primary/core skill for the candidate
   */
  is_primary: boolean;

  /**
   * Array of related certifications validating this skill
   */
  certifications: string[];
}

/**
 * Enhanced interface for detailed skill matching results
 * Used for candidate-requisition skill comparison and scoring
 */
export interface ISkillMatch {
  /**
   * Unique identifier of the skill being matched
   */
  skill_id: string;

  /**
   * Calculated matching score between 0 and 1
   * @minimum 0
   * @maximum 1
   */
  match_score: number;

  /**
   * Years of experience required by the position
   * @minimum 0
   */
  required_years: number;

  /**
   * Candidate's actual years of experience
   * @minimum 0
   */
  actual_years: number;

  /**
   * Proficiency level required by the position
   */
  required_level: SkillProficiency;

  /**
   * Candidate's actual proficiency level
   */
  actual_level: SkillProficiency;
}