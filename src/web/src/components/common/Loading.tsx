import React from 'react'; // v18.0.0
import styled, { keyframes } from 'styled-components'; // v5.3.0
import { CircularProgress } from '@mui/material'; // v5.0.0
import { fadeIn } from '../../styles/animations';
import { palette } from '../../styles/colors';

// Props interface for the Loading component
interface LoadingProps {
  /**
   * Size of the loading indicator
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large' | number;
  /**
   * Whether to show a full-screen overlay
   * @default false
   */
  overlay?: boolean;
  /**
   * Custom color for the loading indicator
   * @default theme primary color
   */
  color?: string;
  /**
   * Optional loading message
   */
  message?: string;
  /**
   * Custom aria-label for screen readers
   * @default 'Loading content'
   */
  ariaLabel?: string;
}

// Size mappings for predefined sizes
const SIZE_MAP = {
  small: 24,
  medium: 40,
  large: 56
} as const;

// Styled container component with overlay support
const LoadingContainer = styled.div<{ $overlay?: boolean; $isDarkMode: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  ${({ $overlay }) => $overlay && `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${({ $isDarkMode }) => 
      $isDarkMode 
        ? 'rgba(18, 18, 18, 0.7)' 
        : 'rgba(255, 255, 255, 0.7)'};
    z-index: 1300;
  `}
  
  animation: ${fadeIn} 0.3s ease-in-out;
  will-change: opacity;
  
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

// Styled message component with proper typography and accessibility
const LoadingMessage = styled.p<{ $isDarkMode: boolean }>`
  margin-top: 16px;
  color: ${({ $isDarkMode }) => 
    $isDarkMode 
      ? palette.dark.text.primary 
      : palette.light.text.primary};
  font-size: 16px;
  font-weight: 500;
  line-height: 1.5;
  text-align: center;
  
  /* Ensure proper contrast ratio for WCAG compliance */
  @media (prefers-contrast: more) {
    color: ${({ $isDarkMode }) => 
      $isDarkMode 
        ? palette.dark.text.primary 
        : palette.light.text.primary};
  }
`;

/**
 * Loading component that displays a loading indicator with optional overlay and message
 * Follows Material Design 3.0 principles and ensures WCAG 2.1 Level AA compliance
 */
const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  overlay = false,
  color,
  message,
  ariaLabel = 'Loading content'
}) => {
  // Determine if dark mode is active
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Calculate spinner size
  const spinnerSize = typeof size === 'number' ? size : SIZE_MAP[size];
  
  // Determine spinner color based on theme and custom color
  const spinnerColor = color || (isDarkMode ? palette.dark.primary.main : palette.light.primary.main);

  return (
    <LoadingContainer 
      $overlay={overlay} 
      $isDarkMode={isDarkMode}
      role="alert"
      aria-busy="true"
      aria-live="polite"
    >
      <CircularProgress
        size={spinnerSize}
        color="primary"
        sx={{ 
          color: spinnerColor,
          // Ensure proper contrast for accessibility
          '& .MuiCircularProgress-svg': {
            filter: isDarkMode ? 'brightness(1.2)' : 'none'
          }
        }}
        aria-label={ariaLabel}
      />
      {message && (
        <LoadingMessage 
          $isDarkMode={isDarkMode}
          aria-live="polite"
        >
          {message}
        </LoadingMessage>
      )}
    </LoadingContainer>
  );
};

export default Loading;