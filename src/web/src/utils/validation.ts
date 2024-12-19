/**
 * @fileoverview Comprehensive validation utility module for RefactorTrack web application.
 * Implements secure, type-safe, and performant validation logic with detailed error reporting.
 * @version 1.0.0
 */

import { isEmail, isMobilePhone } from 'validator'; // v13.9.0
import { ICandidate, ISkill, IExperience, CandidateStatus } from '../interfaces/candidate.interface';
import { Requisition, RequisitionStatus, SkillLevel, RequiredSkill } from '../interfaces/requisition.interface';

/**
 * Interface for validation result with detailed error reporting
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  validationContext?: Record<string, unknown>;
}

/**
 * Interface for field validation options
 */
interface ValidationOptions {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => boolean;
}

/**
 * Constants for validation rules
 */
const VALIDATION_CONSTANTS = {
  EMAIL_MAX_LENGTH: 254,
  PHONE_MIN_LENGTH: 10,
  PHONE_MAX_LENGTH: 15,
  TITLE_MIN_LENGTH: 5,
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MIN_LENGTH: 50,
  DESCRIPTION_MAX_LENGTH: 5000,
  MIN_RATE: 0,
  MAX_RATE: 1000,
  MIN_SKILLS: 1,
  MAX_SKILLS: 20
} as const;

/**
 * Validates email format using RFC-compliant validation
 * @param email - Email address to validate
 * @returns boolean indicating if email is valid
 */
export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  
  const trimmedEmail = email.trim().toLowerCase();
  if (trimmedEmail.length > VALIDATION_CONSTANTS.EMAIL_MAX_LENGTH) return false;
  
  return isEmail(trimmedEmail, {
    allow_utf8_local_part: false,
    require_tld: true,
    allow_ip_domain: false
  });
};

/**
 * Validates international phone numbers with region support
 * @param phone - Phone number to validate
 * @param region - Optional region code for specific validation
 * @returns boolean indicating if phone number is valid
 */
export const validatePhone = (phone: string, region?: string): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  
  const normalizedPhone = phone.replace(/\D/g, '');
  if (normalizedPhone.length < VALIDATION_CONSTANTS.PHONE_MIN_LENGTH || 
      normalizedPhone.length > VALIDATION_CONSTANTS.PHONE_MAX_LENGTH) {
    return false;
  }
  
  return isMobilePhone(normalizedPhone, region ? [region] : 'any', {
    strictMode: true
  });
};

/**
 * Validates required fields with type-specific validation
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @param options - Optional validation configuration
 * @returns Validation result with context
 */
export const validateRequiredField = (
  value: any,
  fieldName: string,
  options: ValidationOptions = {}
): { isValid: boolean; error?: string; context?: object } => {
  if (options.required && (value === null || value === undefined || value === '')) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (typeof value === 'string') {
    if (options.minLength && value.length < options.minLength) {
      return { 
        isValid: false, 
        error: `${fieldName} must be at least ${options.minLength} characters` 
      };
    }
    
    if (options.maxLength && value.length > options.maxLength) {
      return { 
        isValid: false, 
        error: `${fieldName} cannot exceed ${options.maxLength} characters` 
      };
    }
    
    if (options.pattern && !options.pattern.test(value)) {
      return { 
        isValid: false, 
        error: `${fieldName} format is invalid` 
      };
    }
  }

  if (options.customValidator && !options.customValidator(value)) {
    return { 
      isValid: false, 
      error: `${fieldName} validation failed` 
    };
  }

  return { isValid: true };
};

/**
 * Validates skill entries for required competencies
 * @param skills - Array of skill entries to validate
 * @returns Validation result with context
 */
const validateSkills = (skills: ISkill[]): ValidationResult => {
  const errors: string[] = [];
  
  if (!Array.isArray(skills)) {
    return { isValid: false, errors: ['Skills must be an array'] };
  }

  if (skills.length < VALIDATION_CONSTANTS.MIN_SKILLS) {
    errors.push(`At least ${VALIDATION_CONSTANTS.MIN_SKILLS} skill is required`);
  }

  if (skills.length > VALIDATION_CONSTANTS.MAX_SKILLS) {
    errors.push(`Cannot exceed ${VALIDATION_CONSTANTS.MAX_SKILLS} skills`);
  }

  skills.forEach((skill, index) => {
    if (!skill.name || typeof skill.name !== 'string') {
      errors.push(`Skill name is required at index ${index}`);
    }
    
    if (typeof skill.years_of_experience !== 'number' || skill.years_of_experience < 0) {
      errors.push(`Invalid years of experience for skill at index ${index}`);
    }
    
    if (!Object.values(SkillLevel).includes(skill.proficiency_level)) {
      errors.push(`Invalid proficiency level for skill at index ${index}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    validationContext: { totalSkills: skills.length }
  };
};

/**
 * Validates experience entries with date consistency
 * @param experience - Array of experience entries to validate
 * @returns Validation result with context
 */
const validateExperience = (experience: IExperience[]): ValidationResult => {
  const errors: string[] = [];
  
  if (!Array.isArray(experience)) {
    return { isValid: false, errors: ['Experience must be an array'] };
  }

  experience.forEach((exp, index) => {
    if (!exp.company || typeof exp.company !== 'string') {
      errors.push(`Company name is required for experience at index ${index}`);
    }

    if (!exp.title || typeof exp.title !== 'string') {
      errors.push(`Job title is required for experience at index ${index}`);
    }

    const startDate = new Date(exp.start_date);
    if (isNaN(startDate.getTime())) {
      errors.push(`Invalid start date for experience at index ${index}`);
    }

    if (exp.end_date) {
      const endDate = new Date(exp.end_date);
      if (isNaN(endDate.getTime())) {
        errors.push(`Invalid end date for experience at index ${index}`);
      }
      
      if (endDate < startDate) {
        errors.push(`End date cannot be before start date for experience at index ${index}`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    validationContext: { totalExperience: experience.length }
  };
};

/**
 * Comprehensive validation of candidate profile data
 * @param candidate - Candidate profile to validate
 * @returns Detailed validation result with context
 */
export const validateCandidateProfile = (candidate: ICandidate): ValidationResult => {
  const errors: string[] = [];
  const context: Record<string, unknown> = {};

  // Required field validations
  const nameValidation = validateRequiredField(candidate.first_name, 'First name', {
    required: true,
    minLength: 2,
    maxLength: 50
  });
  if (!nameValidation.isValid) errors.push(nameValidation.error!);

  const lastNameValidation = validateRequiredField(candidate.last_name, 'Last name', {
    required: true,
    minLength: 2,
    maxLength: 50
  });
  if (!lastNameValidation.isValid) errors.push(lastNameValidation.error!);

  // Email validation
  if (!validateEmail(candidate.email)) {
    errors.push('Invalid email address format');
  }

  // Phone validation
  if (!validatePhone(candidate.phone)) {
    errors.push('Invalid phone number format');
  }

  // Skills validation
  const skillsValidation = validateSkills(candidate.skills);
  if (!skillsValidation.isValid) {
    errors.push(...skillsValidation.errors);
  }
  context.skills = skillsValidation.validationContext;

  // Experience validation
  const experienceValidation = validateExperience(candidate.experience);
  if (!experienceValidation.isValid) {
    errors.push(...experienceValidation.errors);
  }
  context.experience = experienceValidation.validationContext;

  // Status validation
  if (!Object.values(CandidateStatus).includes(candidate.status)) {
    errors.push('Invalid candidate status');
  }

  return {
    isValid: errors.length === 0,
    errors,
    validationContext: context
  };
};

/**
 * Validates required skills for requisitions
 * @param skills - Array of required skills to validate
 * @returns Validation result with context
 */
const validateRequiredSkills = (skills: RequiredSkill[]): ValidationResult => {
  const errors: string[] = [];
  
  if (!Array.isArray(skills)) {
    return { isValid: false, errors: ['Required skills must be an array'] };
  }

  if (skills.length < VALIDATION_CONSTANTS.MIN_SKILLS) {
    errors.push(`At least ${VALIDATION_CONSTANTS.MIN_SKILLS} required skill is needed`);
  }

  skills.forEach((skill, index) => {
    if (!skill.skill_id || typeof skill.skill_id !== 'string') {
      errors.push(`Invalid skill ID at index ${index}`);
    }

    if (typeof skill.minimum_years !== 'number' || skill.minimum_years < 0) {
      errors.push(`Invalid minimum years for skill at index ${index}`);
    }

    if (!Object.values(SkillLevel).includes(skill.required_level)) {
      errors.push(`Invalid required level for skill at index ${index}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    validationContext: { totalRequiredSkills: skills.length }
  };
};

/**
 * Enhanced validation for job requisitions
 * @param requisition - Requisition to validate
 * @returns Detailed validation result with context
 */
export const validateRequisition = (requisition: Requisition): ValidationResult => {
  const errors: string[] = [];
  const context: Record<string, unknown> = {};

  // Title validation
  const titleValidation = validateRequiredField(requisition.title, 'Title', {
    required: true,
    minLength: VALIDATION_CONSTANTS.TITLE_MIN_LENGTH,
    maxLength: VALIDATION_CONSTANTS.TITLE_MAX_LENGTH
  });
  if (!titleValidation.isValid) errors.push(titleValidation.error!);

  // Description validation
  const descriptionValidation = validateRequiredField(requisition.description, 'Description', {
    required: true,
    minLength: VALIDATION_CONSTANTS.DESCRIPTION_MIN_LENGTH,
    maxLength: VALIDATION_CONSTANTS.DESCRIPTION_MAX_LENGTH
  });
  if (!descriptionValidation.isValid) errors.push(descriptionValidation.error!);

  // Rate validation
  if (typeof requisition.rate !== 'number' || 
      requisition.rate < VALIDATION_CONSTANTS.MIN_RATE || 
      requisition.rate > VALIDATION_CONSTANTS.MAX_RATE) {
    errors.push(`Rate must be between ${VALIDATION_CONSTANTS.MIN_RATE} and ${VALIDATION_CONSTANTS.MAX_RATE}`);
  }

  // Deadline validation
  const deadline = new Date(requisition.deadline);
  if (isNaN(deadline.getTime())) {
    errors.push('Invalid deadline date');
  } else if (deadline < new Date()) {
    errors.push('Deadline must be in the future');
  }

  // Required skills validation
  const skillsValidation = validateRequiredSkills(requisition.required_skills);
  if (!skillsValidation.isValid) {
    errors.push(...skillsValidation.errors);
  }
  context.requiredSkills = skillsValidation.validationContext;

  // Status validation
  if (!Object.values(RequisitionStatus).includes(requisition.status)) {
    errors.push('Invalid requisition status');
  }

  return {
    isValid: errors.length === 0,
    errors,
    validationContext: context
  };
};