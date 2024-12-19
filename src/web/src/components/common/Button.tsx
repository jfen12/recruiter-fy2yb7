import React from 'react'; // v18.0.0
import styled from '@mui/material/styles/styled'; // v5.0.0
import ButtonBase from '@mui/material/ButtonBase'; // v5.0.0
import { useTheme } from '@mui/material/styles'; // v5.0.0
import CircularProgress from '@mui/material/CircularProgress'; // v5.0.0
import { lightTheme, darkTheme } from '../../styles/theme';

// Button size configurations following 8px grid system
const BUTTON_SIZES = {
  small: {
    padding: '6px 16px',
    fontSize: '0.875rem',
    height: '32px',
    iconSize: '20px',
    gap: '8px'
  },
  medium: {
    padding: '8px 22px',
    fontSize: '1rem',
    height: '40px',
    iconSize: '24px',
    gap: '8px'
  },
  large: {
    padding: '10px 28px',
    fontSize: '1.125rem',
    height: '48px',
    iconSize: '28px',
    gap: '12px'
  }
} as const;

// Interface for button props with accessibility and loading states
export interface ButtonProps {
  variant?: 'contained' | 'outlined' | 'text';
  size?: keyof typeof BUTTON_SIZES;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel?: string;
  disableRipple?: boolean;
}

// Styled button component with theme-aware styling
const StyledButton = styled(ButtonBase, {
  shouldForwardProp: (prop) => !['loading', 'fullWidth'].includes(prop as string)
})<ButtonProps>`
  ${({ theme, variant = 'contained', color = 'primary', size = 'medium', fullWidth, disabled, loading }) => `
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: ${BUTTON_SIZES[size].gap};
    min-width: ${fullWidth ? '100%' : '64px'};
    height: ${BUTTON_SIZES[size].height};
    padding: ${BUTTON_SIZES[size].padding};
    font-size: ${BUTTON_SIZES[size].fontSize};
    font-family: ${theme.typography.button.fontFamily};
    font-weight: ${theme.typography.button.fontWeight};
    letter-spacing: ${theme.typography.button.letterSpacing}px;
    line-height: 1.75;
    border-radius: ${theme.shape.borderRadius}px;
    transition: ${theme.transitions.create(
      ['background-color', 'box-shadow', 'border-color', 'color'],
      { duration: theme.transitions.duration.short }
    )};
    
    // Variant-specific styles
    ${variant === 'contained' && `
      color: ${theme.palette[color].contrastText};
      background-color: ${theme.palette[color].main};
      box-shadow: ${theme.shadows[2]};
      
      &:hover:not(:disabled) {
        background-color: ${theme.palette[color].dark};
        box-shadow: ${theme.shadows[4]};
      }
      
      &:active:not(:disabled) {
        box-shadow: ${theme.shadows[8]};
      }
    `}
    
    ${variant === 'outlined' && `
      color: ${theme.palette[color].main};
      border: 1px solid ${theme.palette[color].main};
      background-color: transparent;
      
      &:hover:not(:disabled) {
        background-color: ${theme.palette[color].main}14;
      }
    `}
    
    ${variant === 'text' && `
      color: ${theme.palette[color].main};
      background-color: transparent;
      
      &:hover:not(:disabled) {
        background-color: ${theme.palette[color].main}14;
      }
    `}
    
    // Disabled state
    ${disabled && `
      opacity: 0.6;
      cursor: not-allowed;
      pointer-events: none;
      ${variant === 'contained' && `
        background-color: ${theme.palette.action.disabledBackground};
        color: ${theme.palette.action.disabled};
        box-shadow: none;
      `}
    `}
    
    // Loading state
    ${loading && `
      color: transparent;
      pointer-events: none;
    `}
    
    // Focus styles for accessibility
    &:focus-visible {
      outline: 2px solid ${theme.palette[color].main};
      outline-offset: 2px;
    }
    
    // Reduced motion preference
    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

// Loading spinner component
const LoadingSpinner = styled(CircularProgress)`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
`;

// Icon wrapper for consistent sizing
const IconWrapper = styled('span')<{ size: keyof typeof BUTTON_SIZES }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ size }) => BUTTON_SIZES[size].iconSize};
  height: ${({ size }) => BUTTON_SIZES[size].iconSize};
`;

// Memoized button component for performance
export const Button = React.memo<ButtonProps>(({
  variant = 'contained',
  size = 'medium',
  color = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  startIcon,
  endIcon,
  children,
  onClick,
  ariaLabel,
  disableRipple = false,
  ...props
}) => {
  const theme = useTheme();

  return (
    <StyledButton
      variant={variant}
      size={size}
      color={color}
      disabled={disabled || loading}
      loading={loading}
      fullWidth={fullWidth}
      onClick={onClick}
      disableRipple={disableRipple}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      role="button"
      {...props}
    >
      {startIcon && <IconWrapper size={size}>{startIcon}</IconWrapper>}
      {children}
      {endIcon && <IconWrapper size={size}>{endIcon}</IconWrapper>}
      {loading && (
        <LoadingSpinner
          size={BUTTON_SIZES[size].iconSize}
          color={variant === 'contained' ? 'inherit' : color}
        />
      )}
    </StyledButton>
  );
});

Button.displayName = 'Button';

export default Button;