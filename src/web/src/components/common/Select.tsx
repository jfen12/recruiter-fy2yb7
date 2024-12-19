import React, { useMemo, useCallback } from 'react'; // v18.0.0
import { styled } from '@mui/material/styles'; // v5.0.0
import { Select as MuiSelect, SelectProps, SelectChangeEvent } from '@mui/material'; // v5.0.0
import MenuItem from '@mui/material/MenuItem'; // v5.0.0
import FormHelperText from '@mui/material/FormHelperText'; // v5.0.0
import { lightTheme, darkTheme } from '../../styles/theme';

// Interface for select options
interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

// Props interface extending MUI SelectProps with custom properties
interface CustomSelectProps extends Omit<SelectProps, 'onChange'> {
  options: SelectOption[];
  value: string | number | Array<string | number>;
  onChange: (value: string | number | Array<string | number>, event: SelectChangeEvent) => void;
  error?: boolean;
  helperText?: string;
  isMobile?: boolean;
}

// Styled Select component with enhanced theme integration
const StyledSelect = styled(MuiSelect)(({ theme, error, isMobile }) => ({
  // Base styles following Material Design 3.0
  '& .MuiSelect-select': {
    padding: theme.spacing(1.5, 2),
    minHeight: '44px', // WCAG 2.1 minimum touch target size
    fontSize: '1rem',
    lineHeight: 1.5,
    transition: theme.transitions.create(['border-color', 'box-shadow']),
  },

  // Border and outline styles
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: error ? theme.palette.error.main : theme.palette.border,
    borderRadius: theme.shape.borderRadius,
    transition: theme.transitions.create('border-color'),
  },

  // Hover state
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: error 
      ? theme.palette.error.dark 
      : theme.palette.primary.main,
  },

  // Focus state with enhanced accessibility
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: error 
      ? theme.palette.error.main 
      : theme.palette.primary.main,
    borderWidth: 2,
    boxShadow: `0 0 0 2px ${error 
      ? theme.palette.error.main + '40'
      : theme.palette.primary.main + '40'}`,
  },

  // Mobile-specific styles
  ...(isMobile && {
    '& .MuiSelect-select': {
      padding: theme.spacing(2),
      fontSize: '1.125rem',
    },
    '& .MuiMenuItem-root': {
      padding: theme.spacing(2),
      minHeight: '48px',
    },
  }),

  // Dark mode adjustments
  ...(theme.palette.mode === 'dark' && {
    '& .MuiSelect-select': {
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
    },
  }),

  // RTL support
  '& .MuiSelect-icon': {
    right: 'auto',
    left: theme.spacing(1),
    transform: theme.direction === 'rtl' ? 'rotate(180deg)' : 'none',
  },

  // Disabled state
  '&.Mui-disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
}));

// Memoized Select component
const Select = React.memo<CustomSelectProps>((props) => {
  const {
    options,
    value,
    onChange,
    error = false,
    helperText,
    isMobile = false,
    multiple = false,
    disabled = false,
    ...restProps
  } = props;

  // Memoize menu items to prevent unnecessary re-renders
  const menuItems = useMemo(() => 
    options.map((option) => (
      <MenuItem
        key={option.value}
        value={option.value}
        disabled={option.disabled}
        sx={{
          minHeight: '36px',
          padding: (theme) => theme.spacing(1, 2),
          '&.Mui-selected': {
            backgroundColor: (theme) => 
              theme.palette.mode === 'dark' 
                ? theme.palette.primary.dark + '40'
                : theme.palette.primary.light + '40',
          },
        }}
      >
        {option.label}
      </MenuItem>
    )),
    [options]
  );

  // Handle change with value transformation
  const handleChange = useCallback(
    (event: SelectChangeEvent<unknown>) => {
      onChange(event.target.value as string | number | Array<string | number>, event);
    },
    [onChange]
  );

  return (
    <div>
      <StyledSelect
        value={value}
        onChange={handleChange}
        error={error}
        disabled={disabled}
        isMobile={isMobile}
        multiple={multiple}
        // Accessibility attributes
        aria-invalid={error}
        aria-describedby={helperText ? 'select-helper-text' : undefined}
        // Enhanced keyboard navigation
        MenuProps={{
          PaperProps: {
            sx: {
              maxHeight: isMobile ? '75vh' : '40vh',
              marginTop: 1,
              boxShadow: (theme) => theme.shadows[8],
            },
          },
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'left',
          },
          transformOrigin: {
            vertical: 'top',
            horizontal: 'left',
          },
        }}
        {...restProps}
      >
        {menuItems}
      </StyledSelect>
      {helperText && (
        <FormHelperText
          id="select-helper-text"
          error={error}
          sx={{
            margin: (theme) => theme.spacing(0.5, 0, 0),
            fontSize: '0.875rem',
          }}
        >
          {helperText}
        </FormHelperText>
      )}
    </div>
  );
});

// Display name for debugging
Select.displayName = 'Select';

export default Select;