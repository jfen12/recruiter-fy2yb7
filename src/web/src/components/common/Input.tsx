/**
 * @fileoverview A comprehensive, accessible, and type-safe input component implementing
 * Material Design 3.0 principles. Features include robust validation, error handling,
 * theme integration, and WCAG 2.1 Level AA compliance.
 * @version 1.0.0
 */

import React, { memo, useCallback, useState, useRef, useEffect } from 'react'; // ^18.0.0
import { styled } from '@mui/material/styles'; // ^5.0.0
import { TextField } from '@mui/material'; // ^5.0.0
import { useForm } from '../../hooks/useForm';
import { validateRequiredField } from '../../utils/validation';
import { lightTheme } from '../../styles/theme';

/**
 * Interface for Input component props with comprehensive type safety
 */
interface InputProps {
  id: string;
  label: string;
  value: string | number;
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url';
  error?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  placeholder?: string;
  helperText?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  'aria-describedby'?: string;
  'aria-label'?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}

/**
 * Styled TextField component following Material Design 3.0 principles
 * Implements 8px grid system, elevation shadows, and proper spacing
 */
const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiInputBase-root': {
    borderRadius: theme.spacing(1),
    backgroundColor: theme.palette.background.paper,
    transition: theme.transitions.create([
      'border-color',
      'background-color',
      'box-shadow',
    ]),
    fontFamily: theme.typography.body1.fontFamily,
    fontSize: theme.typography.body1.fontSize,
    lineHeight: theme.typography.body1.lineHeight,
    
    '&.Mui-focused': {
      boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
    },
    
    '&.Mui-error': {
      boxShadow: `0 0 0 2px ${theme.palette.error.main}`,
    },
    
    '&.Mui-disabled': {
      backgroundColor: theme.palette.action.disabledBackground,
      opacity: theme.palette.action.disabledOpacity,
    },
  },
  
  '& .MuiInputBase-input': {
    padding: theme.spacing(1.5, 2),
    height: 'auto',
    
    '&::placeholder': {
      color: theme.palette.text.secondary,
      opacity: 1,
    },
  },
  
  '& .MuiFormHelperText-root': {
    marginLeft: theme.spacing(0.5),
    marginTop: theme.spacing(0.5),
    fontSize: '0.75rem',
    
    '&.Mui-error': {
      color: theme.palette.error.main,
    },
  },
  
  '& .MuiInputLabel-root': {
    transform: 'translate(16px, 14px) scale(1)',
    
    '&.Mui-focused, &.MuiFormLabel-filled': {
      transform: 'translate(16px, -9px) scale(0.75)',
    },
  },
}));

/**
 * Memoized Input component with comprehensive validation and accessibility
 * @param props - Input component props
 * @returns Rendered input component with proper accessibility attributes
 */
const Input = memo(({
  id,
  label,
  value,
  type = 'text',
  error,
  required = false,
  disabled = false,
  autoComplete,
  placeholder,
  helperText,
  maxLength,
  minLength,
  pattern,
  startAdornment,
  endAdornment,
  fullWidth = true,
  size = 'medium',
  onChange,
  onBlur,
  onFocus,
  'aria-describedby': ariaDescribedBy,
  'aria-label': ariaLabel,
  inputRef,
  ...rest
}: InputProps) => {
  // Local state for input validation and focus management
  const [isFocused, setIsFocused] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [localError, setLocalError] = useState(error);
  const inputIdRef = useRef(`${id}-input`);
  const helperTextId = `${id}-helper-text`;
  const errorId = `${id}-error`;

  // Effect to sync external error prop with local state
  useEffect(() => {
    setLocalError(error);
  }, [error]);

  // Validate input value on change
  const validateInput = useCallback((value: string | number) => {
    const validationResult = validateRequiredField(
      value,
      label,
      {
        required,
        minLength,
        maxLength,
        pattern: pattern ? new RegExp(pattern) : undefined,
      }
    );

    if (!validationResult.isValid) {
      setLocalError(validationResult.error);
    } else {
      setLocalError(undefined);
    }
  }, [label, required, minLength, maxLength, pattern]);

  // Handle input change with validation
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setIsDirty(true);
    validateInput(e.target.value);
    onChange(e);
  }, [onChange, validateInput]);

  // Handle input blur with validation
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (isDirty) {
      validateInput(e.target.value);
    }
    onBlur(e);
  }, [onBlur, validateInput, isDirty]);

  // Handle input focus
  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  }, [onFocus]);

  return (
    <StyledTextField
      id={inputIdRef.current}
      label={label}
      value={value}
      type={type}
      error={!!localError}
      required={required}
      disabled={disabled}
      autoComplete={autoComplete}
      placeholder={placeholder}
      helperText={localError || helperText}
      fullWidth={fullWidth}
      size={size}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      inputRef={inputRef}
      InputProps={{
        startAdornment,
        endAdornment,
        'aria-invalid': !!localError,
        'aria-required': required,
        'aria-describedby': [
          helperText && helperTextId,
          localError && errorId,
          ariaDescribedBy,
        ]
          .filter(Boolean)
          .join(' '),
      }}
      inputProps={{
        'aria-label': ariaLabel || label,
        maxLength,
        minLength,
        pattern,
      }}
      FormHelperTextProps={{
        id: localError ? errorId : helperTextId,
        role: localError ? 'alert' : undefined,
      }}
      {...rest}
    />
  );
});

Input.displayName = 'Input';

export default Input;