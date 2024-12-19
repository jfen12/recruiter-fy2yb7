/**
 * @fileoverview User profile page component with enhanced security, accessibility,
 * and theme support following Material Design 3.0 principles and WCAG 2.1 Level AA compliance.
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { useErrorBoundary } from 'react-error-boundary';
import { User, UserRole } from '../interfaces/auth.interface';
import Card from '../components/common/Card';
import useAuth from '../hooks/useAuth';
import useTheme from '../hooks/useTheme';

// Styled components with theme awareness and accessibility features
const ProfileContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing(3)}px;
  background-color: ${({ theme }) => theme.palette.background.default};
  color: ${({ theme }) => theme.palette.text.primary};

  @media (max-width: ${({ theme }) => theme.breakpoints.values.sm}px) {
    padding: ${({ theme }) => theme.spacing(2)}px;
  }
`;

const ProfileSection = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing(3)}px;
  width: 100%;
`;

const ProfileHeader = styled.h1`
  ${({ theme }) => theme.typography.h4};
  color: ${({ theme }) => theme.palette.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing(2)}px;
`;

const ProfileField = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing(2)}px;
`;

const FieldLabel = styled.label`
  ${({ theme }) => theme.typography.body2};
  color: ${({ theme }) => theme.palette.text.secondary};
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing(1)}px;
`;

const FieldValue = styled.div`
  ${({ theme }) => theme.typography.body1};
  color: ${({ theme }) => theme.palette.text.primary};
  min-height: 24px;
  padding: ${({ theme }) => theme.spacing(1)}px 0;
`;

const ThemeToggle = styled.button`
  ${({ theme }) => theme.typography.button};
  background-color: ${({ theme }) => theme.palette.primary.main};
  color: ${({ theme }) => theme.palette.primary.contrastText};
  padding: ${({ theme }) => theme.spacing(1, 2)};
  border: none;
  border-radius: ${({ theme }) => theme.shape.borderRadius}px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${({ theme }) => theme.palette.primary.dark};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.palette.primary.main};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// Interface definitions
interface ProfileProps {
  className?: string;
  testId?: string;
}

/**
 * Formats the last login date with proper localization
 * @param date - Date to format
 * @param options - Optional Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
const formatLastLogin = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...options
    }).format(new Date(date));
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid date';
  }
};

/**
 * Profile page component with security and accessibility features
 */
const Profile: React.FC<ProfileProps> = ({ className, testId = 'profile-page' }) => {
  const { user, validateSession, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showBoundary } = useErrorBoundary();
  const [isLoading, setIsLoading] = useState(true);

  // Session validation effect
  useEffect(() => {
    const validateUserSession = async () => {
      try {
        setIsLoading(true);
        const isValid = await validateSession();
        if (!isValid) {
          await logout();
        }
      } catch (error) {
        showBoundary(error);
      } finally {
        setIsLoading(false);
      }
    };

    validateUserSession();
  }, [validateSession, logout, showBoundary]);

  // Role-based content access handler
  const canViewSensitiveInfo = useCallback((userRole: UserRole): boolean => {
    return [UserRole.ADMIN, UserRole.MANAGER].includes(userRole);
  }, []);

  if (isLoading) {
    return (
      <ProfileContainer 
        className={className}
        data-testid={`${testId}-loading`}
        role="status"
        aria-busy="true"
      >
        Loading profile...
      </ProfileContainer>
    );
  }

  if (!user) {
    return (
      <ProfileContainer 
        className={className}
        data-testid={`${testId}-unauthorized`}
        role="alert"
      >
        Please log in to view your profile.
      </ProfileContainer>
    );
  }

  return (
    <ProfileContainer 
      className={className}
      data-testid={testId}
      role="main"
      aria-labelledby="profile-title"
    >
      <ProfileHeader id="profile-title">User Profile</ProfileHeader>

      <ProfileSection 
        elevation={2}
        padding={24}
        ariaLabel="Basic Information"
      >
        <ProfileField>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <FieldValue id="email">{user.email}</FieldValue>
        </ProfileField>

        <ProfileField>
          <FieldLabel htmlFor="role">Role</FieldLabel>
          <FieldValue id="role">{user.role}</FieldValue>
        </ProfileField>

        {canViewSensitiveInfo(user.role) && (
          <ProfileField>
            <FieldLabel htmlFor="lastLogin">Last Login</FieldLabel>
            <FieldValue id="lastLogin">
              {formatLastLogin(user.lastLogin)}
            </FieldValue>
          </ProfileField>
        )}

        <ProfileField>
          <FieldLabel htmlFor="mfaStatus">MFA Status</FieldLabel>
          <FieldValue id="mfaStatus">
            {user.mfaEnabled ? 'Enabled' : 'Disabled'}
          </FieldValue>
        </ProfileField>
      </ProfileSection>

      <ProfileSection 
        elevation={2}
        padding={24}
        ariaLabel="Preferences"
      >
        <ProfileField>
          <FieldLabel htmlFor="theme">Theme Preference</FieldLabel>
          <ThemeToggle
            onClick={toggleTheme}
            aria-pressed={theme.palette.mode === 'dark'}
            id="theme"
          >
            Toggle {theme.palette.mode === 'light' ? 'Dark' : 'Light'} Mode
          </ThemeToggle>
        </ProfileField>
      </ProfileSection>
    </ProfileContainer>
  );
};

export default Profile;