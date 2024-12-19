import React, { useState, useCallback, useEffect, memo } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom'; // v6.14.0
import { z } from 'zod'; // v3.21.4
import FingerprintJS from '@fingerprintjs/fingerprintjs'; // v3.4.0

// Internal imports
import { LoginCredentials, AuthResponse, MFAResponse } from '../../interfaces/auth.interface';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

// Validation schema with enhanced security requirements
const loginValidationSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  rememberMe: z.boolean().optional()
});

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const ATTEMPT_RESET_TIME = 300000; // 5 minutes
const FINGERPRINT_CACHE_TIME = 3600000; // 1 hour

// Props interface
interface LoginFormProps {
  onSuccess?: (response: AuthResponse) => void;
  onError?: (error: Error) => void;
  onMFARequired?: (response: MFAResponse) => void;
}

// Styled components with Material Design 3.0 and accessibility
const StyledLoginForm = styled.form`
  ${({ theme }) => `
    display: flex;
    flex-direction: column;
    max-width: 400px;
    margin: 2rem auto;
    padding: ${theme.spacing(4)}px;
    border-radius: ${theme.shape.borderRadius}px;
    background-color: ${theme.palette.background.paper};
    box-shadow: ${theme.shadows[2]};

    @media (prefers-reduced-motion: no-preference) {
      transition: box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    &:focus-within {
      box-shadow: ${theme.shadows[4]};
    }
  `}
`;

const FormTitle = styled.h1`
  ${({ theme }) => `
    font-size: 1.5rem;
    font-weight: 600;
    text-align: center;
    margin-bottom: ${theme.spacing(3)}px;
    color: ${theme.palette.text.primary};
  `}
`;

const FormField = styled.div`
  ${({ theme }) => `
    margin-bottom: ${theme.spacing(3)}px;
    position: relative;
  `}
`;

const Input = styled.input`
  ${({ theme }) => `
    width: 100%;
    padding: ${theme.spacing(2)}px;
    border: 1px solid ${theme.palette.divider};
    border-radius: ${theme.shape.borderRadius}px;
    font-size: 1rem;
    background-color: ${theme.palette.background.default};
    color: ${theme.palette.text.primary};
    transition: border-color 200ms ease;

    &:focus {
      outline: none;
      border-color: ${theme.palette.primary.main};
      box-shadow: 0 0 0 2px ${theme.palette.primary.light}40;
    }

    &:disabled {
      background-color: ${theme.palette.action.disabledBackground};
      color: ${theme.palette.text.disabled};
    }
  `}
`;

const Label = styled.label`
  ${({ theme }) => `
    display: block;
    margin-bottom: ${theme.spacing(1)}px;
    color: ${theme.palette.text.primary};
    font-size: 0.875rem;
    font-weight: 500;
  `}
`;

const ErrorMessage = styled.div`
  ${({ theme }) => `
    color: ${theme.palette.error.main};
    font-size: 0.875rem;
    margin-top: ${theme.spacing(0.5)}px;
    min-height: 1.25rem;
  `}
  role="alert";
`;

const SubmitButton = styled.button`
  ${({ theme }) => `
    padding: ${theme.spacing(2)}px;
    background-color: ${theme.palette.primary.main};
    color: ${theme.palette.primary.contrastText};
    border: none;
    border-radius: ${theme.shape.borderRadius}px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 200ms ease;
    min-height: 44px; // WCAG touch target size

    &:hover:not(:disabled) {
      background-color: ${theme.palette.primary.dark};
    }

    &:focus {
      outline: none;
      box-shadow: 0 0 0 2px ${theme.palette.primary.light}40;
    }

    &:disabled {
      background-color: ${theme.palette.action.disabled};
      cursor: not-allowed;
    }
  `}
`;

const LoginForm: React.FC<LoginFormProps> = memo(({ onSuccess, onError, onMFARequired }) => {
  const { login } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');

  // Initialize device fingerprinting
  useEffect(() => {
    const initializeFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setDeviceFingerprint(result.visitorId);
      } catch (error) {
        console.error('Fingerprint generation failed:', error);
      }
    };

    initializeFingerprint();
  }, []);

  // Handle form input changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  // Validate form data
  const validateForm = useCallback(async () => {
    try {
      await loginValidationSchema.parseAsync(formData);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked || isLoading) return;

    try {
      setIsLoading(true);
      const isValid = await validateForm();
      if (!isValid) return;

      const response = await login({
        ...formData,
        deviceFingerprint,
        timestamp: new Date().toISOString()
      });

      if (response.mfaRequired) {
        onMFARequired?.(response as MFAResponse);
      } else {
        onSuccess?.(response as AuthResponse);
        navigate('/dashboard');
      }

      // Reset attempts on successful login
      setLoginAttempts(0);

    } catch (error) {
      setLoginAttempts(prev => {
        const newAttempts = prev + 1;
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          setIsLocked(true);
          setTimeout(() => {
            setIsLocked(false);
            setLoginAttempts(0);
          }, ATTEMPT_RESET_TIME);
        }
        return newAttempts;
      });

      onError?.(error as Error);
      setErrors({ submit: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  }, [formData, deviceFingerprint, isLocked, isLoading, login, navigate, onSuccess, onError, onMFARequired, validateForm]);

  return (
    <StyledLoginForm onSubmit={handleSubmit} noValidate>
      <FormTitle>Sign In</FormTitle>

      <FormField>
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          disabled={isLoading || isLocked}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          autoComplete="email"
        />
        {errors.email && (
          <ErrorMessage id="email-error">{errors.email}</ErrorMessage>
        )}
      </FormField>

      <FormField>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          disabled={isLoading || isLocked}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          autoComplete="current-password"
        />
        {errors.password && (
          <ErrorMessage id="password-error">{errors.password}</ErrorMessage>
        )}
      </FormField>

      <FormField>
        <Label>
          <Input
            type="checkbox"
            name="rememberMe"
            checked={formData.rememberMe}
            onChange={handleChange}
            disabled={isLoading || isLocked}
          />
          Remember me
        </Label>
      </FormField>

      {errors.submit && (
        <ErrorMessage role="alert">{errors.submit}</ErrorMessage>
      )}

      <SubmitButton
        type="submit"
        disabled={isLoading || isLocked}
        aria-busy={isLoading}
      >
        {isLoading ? 'Signing In...' : isLocked ? `Locked (${Math.ceil(ATTEMPT_RESET_TIME/1000)}s)` : 'Sign In'}
      </SubmitButton>
    </StyledLoginForm>
  );
});

LoginForm.displayName = 'LoginForm';

export default LoginForm;