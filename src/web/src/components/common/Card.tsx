import React from 'react';
import styled, { css } from 'styled-components'; // v5.3.0
import { elevation } from '../../styles/mixins';
import { palette } from '../../styles/colors';

// Interface for component props with comprehensive documentation
interface CardProps {
  /** Material Design elevation level (0-16) */
  elevation?: number;
  /** Card padding in pixels or CSS units */
  padding?: string | number;
  /** Card content */
  children: React.ReactNode;
  /** Optional click handler for interactive cards */
  onClick?: () => void;
  /** Optional CSS class name */
  className?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
  /** Force high contrast mode */
  highContrastMode?: boolean;
  /** Optional test ID for automated testing */
  'data-testid'?: string;
}

// Helper function to determine background color based on theme and contrast mode
const getThemeBackground = (props: {
  theme: { mode: 'light' | 'dark' };
  highContrastMode?: boolean;
}) => {
  const { mode } = props.theme;
  const { light, dark } = palette;

  if (props.highContrastMode) {
    return mode === 'dark' ? '#000000' : '#FFFFFF';
  }

  return mode === 'dark' ? dark.background.paper : light.background.paper;
};

// Styled component with Material Design principles and accessibility features
const StyledCard = styled.div<CardProps>`
  position: relative;
  background-color: ${getThemeBackground};
  border-radius: 8px;
  padding: ${props => 
    typeof props.padding === 'number' 
      ? `${props.padding}px` 
      : props.padding || '16px'
  };
  
  ${props => elevation(props.elevation || 1, props.theme.mode === 'dark')}
  
  // Interactive states
  ${props => props.onClick && css`
    cursor: pointer;
    
    &:hover {
      ${elevation(Math.min((props.elevation || 1) + 1, 16), props.theme.mode === 'dark')}
    }
    
    &:active {
      ${elevation(Math.max((props.elevation || 1) - 1, 0), props.theme.mode === 'dark')}
    }
  `}
  
  // Accessibility focus styles
  &:focus-visible {
    outline: 2px solid ${props => 
      props.theme.mode === 'dark' 
        ? palette.dark.primary.main 
        : palette.light.primary.main
    };
    outline-offset: 2px;
  }
  
  // High contrast mode support
  @media (prefers-contrast: more) {
    border: 2px solid ${props =>
      props.theme.mode === 'dark'
        ? palette.dark.text.primary
        : palette.light.text.primary
    };
  }
  
  // Reduced motion support
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/**
 * A Material Design 3.0 card component with accessibility support
 * and theme awareness.
 *
 * @component
 * @example
 * ```tsx
 * <Card elevation={2} padding={16} onClick={() => console.log('clicked')}>
 *   <h2>Card Title</h2>
 *   <p>Card content</p>
 * </Card>
 * ```
 */
export const Card = React.memo<CardProps>(({
  elevation = 1,
  padding = 16,
  children,
  onClick,
  className,
  ariaLabel,
  highContrastMode = false,
  'data-testid': testId,
  ...rest
}) => {
  // Validate elevation range
  const validElevation = Math.max(0, Math.min(elevation, 16));

  // Determine if card is interactive
  const isInteractive = Boolean(onClick);

  return (
    <StyledCard
      elevation={validElevation}
      padding={padding}
      onClick={onClick}
      className={className}
      highContrastMode={highContrastMode}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={ariaLabel}
      data-testid={testId}
      {...rest}
    >
      {children}
    </StyledCard>
  );
});

// Display name for debugging
Card.displayName = 'Card';

export default Card;