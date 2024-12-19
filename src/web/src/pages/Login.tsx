/**
 * @fileoverview Enterprise-grade login page component implementing secure authentication
 * with MFA support, Material Design 3.0 principles, and WCAG 2.1 Level AA compliance.
 * @version 1.0.0
 */

import React, { useEffect, useCallback, memo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom'; // v6.14.0
import styled from 'styled-components'; // v5.3.0
import { useTheme } from '@mui/material'; // v5.14.0

// Internal imports
import { LoginForm, handleMFAChallenge, validateCredentials } from '../components/auth/LoginForm';
import { useAuth } from '../hooks/useAuth';
import { AuthResponse, MFAResponse } from '../interfaces/auth.interface';
import { setLocalStorage } from '../utils/storage';
import { responsiveFont, flexLayout, elevation } from '../styles/mixins';
import { breakpoints } from '../styles/breakpoints';

// Styled components with Material Design 3.0 principles
const LoginContainer = styled.div`
  ${flexLayout({
    direction: 'column',
    justify: 'center',
    align: 'center',
  })}
  min-height: 100vh;
  padding: ${({ theme }) => theme.spacing(3)}px;
  background-color: ${({ theme }) => theme.palette.background.default};
`;

const LoginCard = styled.div`
  ${({ theme }) => css`
    width: 100%;
    max-width: 400px;
    padding: ${theme.spacing(4)}px;
    border-radius: ${theme.shape.borderRadius}px;
    background-color: ${theme.palette.background.paper};
    ${elevation(2, theme.palette.mode === 'dark')}

    @media ${breakpoints.up('tablet')} {
      padding: ${theme.spacing(6)}px;
    }
  `}
`;

const LoginHeader = styled.div`
  ${({ theme }) => css`
    text-align: center;
    margin-bottom: ${theme.spacing(4)}px;

    h1 {
      ${responsiveFont({
        minSize: 24,
        maxSize: 32,
        minWidth: breakpoints.mobile,
        maxWidth: breakpoints.desktop
      })}
      color: ${theme.palette.text.primary};
      margin-bottom: ${theme.spacing(2)}px;
    }

    p {
      color: ${theme.palette.text.secondary};
      ${responsiveFont({
        minSize: 14,
        maxSize: 16,
        minWidth: breakpoints.mobile,
        maxWidth: breakpoints.desktop
      })}
    }
  `}
`;

const ErrorMessage = styled.div`
  ${({ theme }) => css`
    color: ${theme.palette.error.main};
    padding: ${theme.spacing(2)}px;
    margin-bottom: ${theme.spacing(2)}px;
    border-radius: ${theme.shape.borderRadius}px;
    background-color: ${theme.palette.error.light}10;
    text-align: center;
  `}
  role="alert";
`;

/**
 * Login page component with secure authentication and MFA support
 */
const Login: React.FC = memo(() => {
  const navigate = useNavigate();
  const { isAuthenticated, login, validateSession, securityStatus } = useAuth();
  const theme = useTheme();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  /**
   * Handles successful login with security monitoring
   * @param response - Authentication response from server
   */
  const handleLoginSuccess = useCallback(async (response: AuthResponse) => {
    try {
      // Store last successful login timestamp
      setLocalStorage('last_login', new Date().toISOString(), true);

      // Initialize security monitoring
      await validateSession();

      // Navigate to dashboard or MFA challenge
      if (response.mfaRequired) {
        navigate('/mfa-challenge', { 
          state: { mfaToken: response.tokens.accessToken }
        });
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login success handling failed:', error);
    }
  }, [navigate, validateSession]);

  /**
   * Handles login errors with security monitoring
   * @param error - Error from login attempt
   */
  const handleLoginError = useCallback((error: Error) => {
    // Log security event
    console.error('Login failed:', {
      timestamp: new Date().toISOString(),
      error: error.message,
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      }
    });
  }, []);

  /**
   * Handles MFA challenge response
   * @param response - MFA challenge response
   */
  const handleMFAResponse = useCallback(async (response: MFAResponse) => {
    try {
      const mfaResult = await handleMFAChallenge(response);
      if (mfaResult.success) {
        await handleLoginSuccess(mfaResult.data);
      }
    } catch (error) {
      handleLoginError(error as Error);
    }
  }, [handleLoginSuccess, handleLoginError]);

  // Set up security monitoring on mount
  useEffect(() => {
    const setupSecurityMonitoring = async () => {
      try {
        // Check for existing session
        const isValid = await validateSession();
        if (isValid) {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Security monitoring setup failed:', error);
      }
    };

    setupSecurityMonitoring();
  }, [navigate, validateSession]);

  return (
    <LoginContainer>
      <LoginCard>
        <LoginHeader>
          <h1>Welcome to RefactorTrack</h1>
          <p>Sign in to continue to your dashboard</p>
        </LoginHeader>

        {securityStatus?.lastLoginAttempt && (
          <ErrorMessage>
            Last failed attempt: {new Date(securityStatus.lastLoginAttempt).toLocaleString()}
          </ErrorMessage>
        )}

        <LoginForm
          onSuccess={handleLoginSuccess}
          onError={handleLoginError}
          onMFARequired={handleMFAResponse}
          aria-label="Login form"
        />
      </LoginCard>
    </LoginContainer>
  );
});

Login.displayName = 'Login';

export default Login;