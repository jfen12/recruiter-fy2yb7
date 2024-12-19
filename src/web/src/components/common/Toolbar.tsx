import React from 'react'; // v18.0.0
import styled from '@mui/material/styles/styled'; // v5.0.0
import { AppBar, Toolbar as MuiToolbar } from '@mui/material'; // v5.0.0
import Button from './Button';
import { lightTheme, darkTheme } from '../../styles/theme';

// Constants for toolbar dimensions following Material Design 3.0 specs
const TOOLBAR_HEIGHTS = {
  regular: '64px',
  dense: '48px'
} as const;

const TOOLBAR_PADDING = {
  xs: '8px',
  sm: '16px',
  md: '24px',
  lg: '32px'
} as const;

const BREAKPOINTS = {
  xs: '320px',
  sm: '768px',
  md: '1024px',
  lg: '1440px'
} as const;

// Interface for Toolbar component props
export interface ToolbarProps {
  variant?: 'regular' | 'dense';
  position?: 'static' | 'sticky' | 'fixed';
  elevation?: number;
  startContent?: React.ReactNode;
  centerContent?: React.ReactNode;
  endContent?: React.ReactNode;
  className?: string;
  role?: string;
  ariaLabel?: string;
  tabIndex?: number;
}

// Styled components with Material Design 3.0 principles
const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => !['elevation', 'variant'].includes(prop as string)
})<{ elevation?: number; variant?: 'regular' | 'dense' }>`
  ${({ theme, elevation = 0, variant = 'regular' }) => `
    background-color: ${theme.palette.background.paper};
    color: ${theme.palette.text.primary};
    height: ${TOOLBAR_HEIGHTS[variant]};
    box-shadow: ${elevation ? theme.shadows[elevation] : 'none'};
    transition: ${theme.transitions.create(['box-shadow', 'height'], {
      duration: theme.transitions.duration.short
    })};

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

const StyledToolbar = styled(MuiToolbar)<{ variant?: 'regular' | 'dense' }>`
  ${({ theme, variant = 'regular' }) => `
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: ${TOOLBAR_HEIGHTS[variant]};
    padding: 0 ${TOOLBAR_PADDING.xs};
    gap: ${theme.spacing(2)};

    @media (min-width: ${BREAKPOINTS.sm}) {
      padding: 0 ${TOOLBAR_PADDING.sm};
    }

    @media (min-width: ${BREAKPOINTS.md}) {
      padding: 0 ${TOOLBAR_PADDING.md};
    }

    @media (min-width: ${BREAKPOINTS.lg}) {
      padding: 0 ${TOOLBAR_PADDING.lg};
    }
  `}
`;

const ContentSection = styled('div')`
  ${({ theme }) => `
    display: flex;
    align-items: center;
    gap: ${theme.spacing(2)};
    
    &:empty {
      display: none;
    }
  `}
`;

// Memoized Toolbar component for performance
export const Toolbar = React.memo<ToolbarProps>(({
  variant = 'regular',
  position = 'static',
  elevation = 0,
  startContent,
  centerContent,
  endContent,
  className,
  role = 'toolbar',
  ariaLabel,
  tabIndex = 0,
  ...props
}) => {
  // Error boundary for content sections
  const renderContent = (content: React.ReactNode) => {
    if (!content) return null;
    
    try {
      return <ContentSection>{content}</ContentSection>;
    } catch (error) {
      console.error('Error rendering toolbar content:', error);
      return null;
    }
  };

  return (
    <StyledAppBar
      position={position}
      elevation={elevation}
      variant={variant}
      className={className}
      {...props}
    >
      <StyledToolbar
        variant={variant}
        role={role}
        aria-label={ariaLabel}
        tabIndex={tabIndex}
      >
        {renderContent(startContent)}
        {renderContent(centerContent)}
        {renderContent(endContent)}
      </StyledToolbar>
    </StyledAppBar>
  );
});

// Display name for debugging
Toolbar.displayName = 'Toolbar';

export default Toolbar;