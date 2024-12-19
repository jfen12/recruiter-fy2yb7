/**
 * @fileoverview Comprehensive test suite for CandidateForm component
 * Verifies form validation, accessibility compliance, state management,
 * and user interactions with extensive coverage of edge cases.
 * @version 1.0.0
 */

import React from 'react'; // ^18.0.0
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // ^14.0.0
import userEvent from '@testing-library/user-event'; // ^14.0.0
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'; // ^0.34.0
import { axe, toHaveNoViolations } from 'jest-axe'; // ^4.7.0
import { ThemeProvider } from 'styled-components'; // ^5.3.0
import { CandidateForm } from '../../../../src/components/candidates/CandidateForm';
import { validateCandidateProfile } from '../../../../src/utils/validation';
import { lightTheme } from '../../../../src/styles/theme';
import { CandidateStatus, SkillProficiency } from '../../../../src/interfaces/candidate.interface';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock validation utility
vi.mock('../../../../src/utils/validation', () => ({
  validateCandidateProfile: vi.fn()
}));

// Test data
const validCandidateData = {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1-555-555-5555',
  skills: [
    {
      name: 'JavaScript',
      years_of_experience: 5,
      proficiency_level: SkillProficiency.ADVANCED
    }
  ],
  status: CandidateStatus.ACTIVE
};

const invalidCandidateData = {
  first_name: '',
  last_name: '',
  email: 'invalid-email',
  phone: 'invalid-phone',
  skills: [],
  status: CandidateStatus.ACTIVE
};

// Test utilities
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={lightTheme}>
      {ui}
    </ThemeProvider>
  );
};

describe('CandidateForm', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const mockSubmit = vi.fn();

  beforeEach(() => {
    user = userEvent.setup();
    mockSubmit.mockClear();
    vi.clearAllMocks();
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(
        <CandidateForm onSubmit={mockSubmit} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels and roles', () => {
      renderWithProviders(<CandidateForm onSubmit={mockSubmit} />);
      
      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/last name/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-required', 'true');
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<CandidateForm onSubmit={mockSubmit} />);
      
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      
      await user.tab();
      expect(firstNameInput).toHaveFocus();
      
      await user.tab();
      expect(lastNameInput).toHaveFocus();
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields on submit', async () => {
      renderWithProviders(<CandidateForm onSubmit={mockSubmit} />);
      
      await user.click(screen.getByRole('button', { name: /save/i }));
      
      expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/last name is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      renderWithProviders(<CandidateForm onSubmit={mockSubmit} />);
      
      await user.type(screen.getByLabelText(/email/i), 'invalid-email');
      await user.tab();
      
      expect(await screen.findByText(/invalid email format/i)).toBeInTheDocument();
    });

    it('should validate phone number format', async () => {
      renderWithProviders(<CandidateForm onSubmit={mockSubmit} />);
      
      await user.type(screen.getByLabelText(/phone/i), 'invalid-phone');
      await user.tab();
      
      expect(await screen.findByText(/invalid phone number format/i)).toBeInTheDocument();
    });

    it('should require at least one skill', async () => {
      renderWithProviders(<CandidateForm onSubmit={mockSubmit} />);
      
      await user.click(screen.getByRole('button', { name: /remove/i }));
      await user.click(screen.getByRole('button', { name: /save/i }));
      
      expect(await screen.findByText(/at least one skill is required/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should submit valid form data', async () => {
      validateCandidateProfile.mockReturnValue({ isValid: true, errors: [] });
      
      renderWithProviders(<CandidateForm onSubmit={mockSubmit} initialValues={validCandidateData} />);
      
      await user.click(screen.getByRole('button', { name: /save/i }));
      
      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining(validCandidateData));
      });
    });

    it('should show loading state during submission', async () => {
      const slowSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      renderWithProviders(<CandidateForm onSubmit={slowSubmit} initialValues={validCandidateData} />);
      
      await user.click(screen.getByRole('button', { name: /save/i }));
      
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    });

    it('should handle submission errors', async () => {
      const errorSubmit = vi.fn().mockRejectedValue(new Error('Submission failed'));
      
      renderWithProviders(<CandidateForm onSubmit={errorSubmit} initialValues={validCandidateData} />);
      
      await user.click(screen.getByRole('button', { name: /save/i }));
      
      expect(await screen.findByText(/submission failed/i)).toBeInTheDocument();
    });
  });

  describe('Skill Management', () => {
    it('should add new skill fields', async () => {
      renderWithProviders(<CandidateForm onSubmit={mockSubmit} />);
      
      const addButton = screen.getByRole('button', { name: /add skill/i });
      await user.click(addButton);
      
      const skillFields = screen.getAllByLabelText(/skill name/i);
      expect(skillFields).toHaveLength(2);
    });

    it('should remove skill fields', async () => {
      renderWithProviders(<CandidateForm onSubmit={mockSubmit} initialValues={validCandidateData} />);
      
      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);
      
      const skillFields = screen.queryAllByLabelText(/skill name/i);
      expect(skillFields).toHaveLength(0);
    });

    it('should prevent removing last skill field', async () => {
      renderWithProviders(<CandidateForm onSubmit={mockSubmit} />);
      
      const removeButton = screen.getByRole('button', { name: /remove/i });
      expect(removeButton).toBeDisabled();
    });
  });

  describe('Auto-save Functionality', () => {
    it('should auto-save when enabled', async () => {
      vi.useFakeTimers();
      
      renderWithProviders(
        <CandidateForm 
          onSubmit={mockSubmit} 
          initialValues={validCandidateData}
          autoSave={true}
        />
      );
      
      await user.type(screen.getByLabelText(/first name/i), 'Jane');
      
      vi.advanceTimersByTime(1000);
      
      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalled();
      });
      
      vi.useRealTimers();
    });
  });
});