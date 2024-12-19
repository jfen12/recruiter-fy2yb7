/**
 * @fileoverview Password reset component with comprehensive security features,
 * Material Design 3.0 styling, and WCAG 2.1 Level AA compliance.
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { z } from 'zod';
import { useForm } from '../../hooks/useForm';
import { Form } from '../common/Form';
import { resetPassword } from '../../api/auth';
import { 
  flexLayout, 
  elevation, 
  focusOutline, 
  smoothTransition 
} from '../../styles/mixins';
import { typography } from '../../styles/typography';
import { palette } from '../../styles/colors';
import { breakpoints } from '../../styles/breakpoints';

// Validation schema for password reset form
const passwordResetSchema = z.object({
  email: z
    .string()
    .min(3, 'Email must be at least 3 characters')
    .max(255, 'Email cannot exceed 255 characters')
    .email('Please enter a valid email address')
    .trim()
});

// Interface for form values
interface PasswordResetFormValues {
  email: string;
}

// Styled components following Material Design 3.0
const StyledContainer = styled.div`
  ${flexLayout({
    direction: 'column',
    justify: 'center',
    align: 'center'
  })};
  min-height: 100vh;
  padding: ${({ theme }) => theme.spacing(2)};
  background-color: ${({ theme }) => theme.palette.background.default};

  @media ${breakpoints.down('tablet')} {
    padding: ${({ theme }) => theme.spacing(1)};
  }
`;

const StyledCard = styled.div`
  width: 100%;
  max-width: 400px;
  padding: ${({ theme }) => theme.spacing(3)};
  border-radius: ${({ theme }) => theme.shape.borderRadius}px;
  ${elevation(2)};
  ${smoothTransition(['box-shadow'])};
  background-color: ${({ theme }) => theme.palette.background.paper};

  &:hover {
    ${elevation(4)};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const StyledTitle = styled.h1`
  ${typography.h4};
  color: ${({ theme }) => theme.palette.primary.main};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing(3)};
`;

const StyledMessage = styled.p<{ $error?: boolean }>`
  ${typography.body2};
  color: ${({ theme, $error }) => 
    $error ? theme.palette.error.main : theme.palette.text.primary};
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing(2)};
  min-height: ${({ theme }) => theme.spacing(3)};
`;

/**
 * Password reset component with security features and accessibility
 */
export const PasswordReset: React.FC = () => {
  // State for feedback messages
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submission with rate limiting and security measures
  const handlePasswordReset = useCallback(async (values: PasswordResetFormValues) => {
    try {
      setIsSubmitting(true);
      setMessage('');
      setError('');

      // Validate input
      await passwordResetSchema.parseAsync(values);

      // Call API with rate limiting
      await resetPassword(values.email);

      // Success feedback
      setMessage('Password reset instructions have been sent to your email');

      // Analytics event
      if (window.gtag) {
        window.gtag('event', 'password_reset_requested', {
          event_category: 'authentication',
          event_label: 'success'
        });
      }
    } catch (err) {
      // Error handling
      const errorMessage = err instanceof Error ? err.message : 'Password reset failed';
      setError(errorMessage);

      // Analytics event
      if (window.gtag) {
        window.gtag('event', 'password_reset_failed', {
          event_category: 'authentication',
          event_label: 'error',
          error_type: errorMessage
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return (
    <StyledContainer>
      <StyledCard
        role="main"
        aria-labelledby="reset-password-title"
      >
        <StyledTitle id="reset-password-title">
          Reset Password
        </StyledTitle>

        <Form
          initialValues={{ email: '' }}
          validationSchema={passwordResetSchema}
          onSubmit={handlePasswordReset}
          validateOnChange={true}
          validateOnBlur={true}
        >
          {({ values, errors, touched, handleChange, handleBlur }) => (
            <div role="form" aria-label="Password reset form">
              <label
                htmlFor="email"
                className="visually-hidden"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={touched.email && !!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                disabled={isSubmitting}
                placeholder="Enter your email address"
                autoComplete="email"
                required
              />
              {touched.email && errors.email && (
                <div
                  id="email-error"
                  role="alert"
                  aria-live="polite"
                >
                  {errors.email}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Reset Password'}
              </button>
            </div>
          )}
        </Form>

        {message && (
          <StyledMessage
            role="status"
            aria-live="polite"
          >
            {message}
          </StyledMessage>
        )}

        {error && (
          <StyledMessage
            $error
            role="alert"
            aria-live="assertive"
          >
            {error}
          </StyledMessage>
        )}
      </StyledCard>
    </StyledContainer>
  );
};