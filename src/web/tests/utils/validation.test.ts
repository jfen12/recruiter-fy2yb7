/**
 * @fileoverview Comprehensive test suite for validation utility functions
 * Ensures robust input validation, data integrity, and security compliance
 * @version 1.0.0
 */

import { describe, test, expect } from '@jest/globals'; // ^29.0.0
import {
  validateEmail,
  validatePhone,
  validateCandidateProfile,
  validateRequisition,
  validateRequiredField
} from '../../src/utils/validation';
import { CandidateStatus } from '../../src/interfaces/candidate.interface';
import { RequisitionStatus, SkillLevel } from '../../src/interfaces/requisition.interface';

describe('validateEmail', () => {
  test('should validate correct email formats', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.com',
      'user+label@domain.co.uk',
      'valid@subdomain.example.com'
    ];

    validEmails.forEach(email => {
      expect(validateEmail(email)).toBe(true);
    });
  });

  test('should reject invalid email formats', () => {
    const invalidEmails = [
      '',
      'invalid',
      '@domain.com',
      'user@',
      'user@.com',
      'user@domain.',
      'user name@domain.com',
      'user@domain..com',
      `${'a'.repeat(255)}@domain.com` // Exceeds max length
    ];

    invalidEmails.forEach(email => {
      expect(validateEmail(email)).toBe(false);
    });
  });

  test('should handle edge cases', () => {
    expect(validateEmail(null as any)).toBe(false);
    expect(validateEmail(undefined as any)).toBe(false);
    expect(validateEmail(123 as any)).toBe(false);
    expect(validateEmail({} as any)).toBe(false);
  });
});

describe('validatePhone', () => {
  test('should validate correct phone formats', () => {
    const validPhones = [
      '+1234567890',
      '1234567890',
      '+1-234-567-8900',
      '(123) 456-7890'
    ];

    validPhones.forEach(phone => {
      expect(validatePhone(phone)).toBe(true);
    });
  });

  test('should validate region-specific phone formats', () => {
    expect(validatePhone('+14155552671', 'US')).toBe(true);
    expect(validatePhone('+442071838750', 'GB')).toBe(true);
    expect(validatePhone('+61261626162', 'AU')).toBe(true);
  });

  test('should reject invalid phone formats', () => {
    const invalidPhones = [
      '',
      'abc',
      '123',
      '+1',
      '+1234', // Too short
      '+123456789012345678', // Too long
      'invalid-phone'
    ];

    invalidPhones.forEach(phone => {
      expect(validatePhone(phone)).toBe(false);
    });
  });

  test('should handle edge cases', () => {
    expect(validatePhone(null as any)).toBe(false);
    expect(validatePhone(undefined as any)).toBe(false);
    expect(validatePhone(123 as any)).toBe(false);
    expect(validatePhone({} as any)).toBe(false);
  });
});

describe('validateRequiredField', () => {
  test('should validate required fields correctly', () => {
    expect(validateRequiredField('value', 'field', { required: true })).toEqual({
      isValid: true
    });
    expect(validateRequiredField('', 'field', { required: true })).toEqual({
      isValid: false,
      error: 'field is required'
    });
  });

  test('should validate string length constraints', () => {
    expect(validateRequiredField('test', 'field', { minLength: 3 })).toEqual({
      isValid: true
    });
    expect(validateRequiredField('test', 'field', { maxLength: 5 })).toEqual({
      isValid: true
    });
    expect(validateRequiredField('test', 'field', { minLength: 5 })).toEqual({
      isValid: false,
      error: 'field must be at least 5 characters'
    });
    expect(validateRequiredField('test', 'field', { maxLength: 3 })).toEqual({
      isValid: false,
      error: 'field cannot exceed 3 characters'
    });
  });

  test('should validate against patterns', () => {
    const alphanumericPattern = /^[a-zA-Z0-9]+$/;
    expect(validateRequiredField('Test123', 'field', { pattern: alphanumericPattern })).toEqual({
      isValid: true
    });
    expect(validateRequiredField('Test@123', 'field', { pattern: alphanumericPattern })).toEqual({
      isValid: false,
      error: 'field format is invalid'
    });
  });

  test('should support custom validators', () => {
    const evenNumberValidator = (value: number) => value % 2 === 0;
    expect(validateRequiredField(4, 'field', { customValidator: evenNumberValidator })).toEqual({
      isValid: true
    });
    expect(validateRequiredField(3, 'field', { customValidator: evenNumberValidator })).toEqual({
      isValid: false,
      error: 'field validation failed'
    });
  });
});

describe('validateCandidateProfile', () => {
  const validCandidate = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    skills: [
      {
        name: 'JavaScript',
        years_of_experience: 5,
        proficiency_level: SkillLevel.ADVANCED,
        last_used_date: new Date()
      }
    ],
    experience: [
      {
        company: 'Tech Corp',
        title: 'Senior Developer',
        start_date: new Date('2020-01-01'),
        end_date: new Date('2023-01-01'),
        description: 'Led development team'
      }
    ],
    education: [],
    status: CandidateStatus.ACTIVE,
    created_at: new Date(),
    updated_at: new Date()
  };

  test('should validate correct candidate profile', () => {
    const result = validateCandidateProfile(validCandidate);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should validate required fields', () => {
    const invalidCandidate = { ...validCandidate, first_name: '' };
    const result = validateCandidateProfile(invalidCandidate);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('First name is required');
  });

  test('should validate skills requirements', () => {
    const invalidSkillsCandidate = {
      ...validCandidate,
      skills: []
    };
    const result = validateCandidateProfile(invalidSkillsCandidate);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('At least 1 skill is required');
  });

  test('should validate experience dates', () => {
    const invalidExperienceCandidate = {
      ...validCandidate,
      experience: [{
        ...validCandidate.experience[0],
        end_date: new Date('2019-01-01') // End date before start date
      }]
    };
    const result = validateCandidateProfile(invalidExperienceCandidate);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('End date cannot be before start date for experience at index 0');
  });
});

describe('validateRequisition', () => {
  const validRequisition = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Senior Software Engineer',
    client_id: '123e4567-e89b-12d3-a456-426614174001',
    description: 'We are looking for an experienced software engineer with strong technical skills...',
    required_skills: [
      {
        skill_id: '123e4567-e89b-12d3-a456-426614174002',
        minimum_years: 5,
        required_level: SkillLevel.ADVANCED,
        is_mandatory: true
      }
    ],
    status: RequisitionStatus.OPEN,
    rate: 100,
    deadline: new Date(Date.now() + 86400000), // Tomorrow
    createdAt: new Date(),
    updatedAt: new Date()
  };

  test('should validate correct requisition', () => {
    const result = validateRequisition(validRequisition);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should validate title requirements', () => {
    const invalidTitleRequisition = { ...validRequisition, title: 'Job' }; // Too short
    const result = validateRequisition(invalidTitleRequisition);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Title must be at least 5 characters');
  });

  test('should validate rate range', () => {
    const invalidRateRequisition = { ...validRequisition, rate: 1001 }; // Exceeds max rate
    const result = validateRequisition(invalidRateRequisition);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Rate must be between 0 and 1000');
  });

  test('should validate deadline is in future', () => {
    const invalidDeadlineRequisition = {
      ...validRequisition,
      deadline: new Date(Date.now() - 86400000) // Yesterday
    };
    const result = validateRequisition(invalidDeadlineRequisition);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Deadline must be in the future');
  });

  test('should validate required skills', () => {
    const invalidSkillsRequisition = {
      ...validRequisition,
      required_skills: []
    };
    const result = validateRequisition(invalidSkillsRequisition);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('At least 1 required skill is needed');
  });
});