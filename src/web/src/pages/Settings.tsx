/**
 * @fileoverview Settings page component providing user preference management
 * with theme settings, notification preferences, and account settings.
 * Implements WCAG 2.1 Level AA compliance and Material Design 3.0 principles.
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components'; // v5.3.0
import { z } from 'zod'; // v3.21.4
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { Form } from '../components/common/Form';
import { useNotification } from '../hooks/useNotification';
import { flexLayout, elevation, focusOutline } from '../styles/mixins';

// Styled components with accessibility and responsive design
const SettingsContainer = styled.main`
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;
  ${flexLayout({
    direction: 'column',
    gap: '2rem'
  })};

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const SettingsSection = styled.section`
  ${elevation(1)};
  background: ${({ theme }) => theme.palette.background.paper};
  border-radius: 8px;
  padding: 2rem;
  transition: all 0.3s ease;

  &:focus-within {
    ${elevation(2)};
    ${focusOutline};
  }

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const SectionTitle = styled.h2`
  color: ${({ theme }) => theme.palette.text.primary};
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  line-height: 1.4;
`;

const FormField = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: ${({ theme }) => theme.palette.text.primary};
  font-weight: 500;
`;

const Toggle = styled.button<{ isActive: boolean }>`
  position: relative;
  width: 60px;
  height: 34px;
  background: ${({ isActive, theme }) =>
    isActive ? theme.palette.primary.main : theme.palette.grey[300]};
  border-radius: 17px;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s ease;
  ${focusOutline};

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${({ isActive }) => (isActive ? '28px' : '2px')};
    width: 30px;
    height: 30px;
    background: white;
    border-radius: 50%;
    transition: left 0.3s ease;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Validation schema for settings form
const settingsSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  soundEnabled: z.boolean(),
  autoSave: z.boolean(),
  sessionTimeout: z.number().min(5).max(60)
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

/**
 * Settings page component providing user preference management
 * with WCAG 2.1 Level AA compliance
 */
const Settings: React.FC = () => {
  const { user, updateUserPreferences } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { showNotification } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with user preferences
  const initialValues: SettingsFormValues = {
    emailNotifications: user?.preferences?.emailNotifications ?? true,
    pushNotifications: user?.preferences?.pushNotifications ?? true,
    soundEnabled: user?.preferences?.soundEnabled ?? true,
    autoSave: user?.preferences?.autoSave ?? true,
    sessionTimeout: user?.preferences?.sessionTimeout ?? 30
  };

  /**
   * Handles settings form submission with error handling
   */
  const handleSettingsSubmit = useCallback(async (values: SettingsFormValues) => {
    try {
      setIsSubmitting(true);
      await updateUserPreferences(values);
      showNotification({
        message: 'Settings updated successfully',
        type: 'success'
      });
    } catch (error) {
      showNotification({
        message: 'Failed to update settings',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [updateUserPreferences, showNotification]);

  /**
   * Handles theme toggle with accessibility announcement
   */
  const handleThemeToggle = useCallback(() => {
    toggleTheme();
    showNotification({
      message: `Switched to ${isDarkMode ? 'light' : 'dark'} theme`,
      type: 'info',
      duration: 2000
    });
  }, [toggleTheme, isDarkMode, showNotification]);

  // Ensure proper focus management on mount
  useEffect(() => {
    document.title = 'Settings - RefactorTrack';
  }, []);

  return (
    <SettingsContainer>
      <h1 className="visually-hidden">User Settings</h1>

      <SettingsSection>
        <SectionTitle>Theme Settings</SectionTitle>
        <FormField>
          <Label htmlFor="themeToggle">
            Dark Mode
            <span className="visually-hidden">
              {isDarkMode ? 'Enabled' : 'Disabled'}
            </span>
          </Label>
          <Toggle
            id="themeToggle"
            onClick={handleThemeToggle}
            isActive={isDarkMode}
            aria-pressed={isDarkMode}
            disabled={isSubmitting}
          />
        </FormField>
      </SettingsSection>

      <SettingsSection>
        <SectionTitle>Notification Preferences</SectionTitle>
        <Form
          initialValues={initialValues}
          validationSchema={settingsSchema}
          onSubmit={handleSettingsSubmit}
        >
          {({ values, handleChange }) => (
            <>
              <FormField>
                <Label htmlFor="emailNotifications">
                  Email Notifications
                </Label>
                <Toggle
                  id="emailNotifications"
                  onClick={() =>
                    handleChange({
                      target: {
                        name: 'emailNotifications',
                        value: !values.emailNotifications
                      }
                    } as any)
                  }
                  isActive={values.emailNotifications}
                  aria-pressed={values.emailNotifications}
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField>
                <Label htmlFor="pushNotifications">
                  Push Notifications
                </Label>
                <Toggle
                  id="pushNotifications"
                  onClick={() =>
                    handleChange({
                      target: {
                        name: 'pushNotifications',
                        value: !values.pushNotifications
                      }
                    } as any)
                  }
                  isActive={values.pushNotifications}
                  aria-pressed={values.pushNotifications}
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField>
                <Label htmlFor="soundEnabled">
                  Sound Effects
                </Label>
                <Toggle
                  id="soundEnabled"
                  onClick={() =>
                    handleChange({
                      target: {
                        name: 'soundEnabled',
                        value: !values.soundEnabled
                      }
                    } as any)
                  }
                  isActive={values.soundEnabled}
                  aria-pressed={values.soundEnabled}
                  disabled={isSubmitting}
                />
              </FormField>

              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Preferences'}
              </button>
            </>
          )}
        </Form>
      </SettingsSection>
    </SettingsContainer>
  );
};

export default Settings;