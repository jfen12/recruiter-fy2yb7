/**
 * @fileoverview A reusable date picker component implementing Material Design 3.0 principles
 * with enhanced accessibility features and timezone support for North American users.
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react'; // ^18.0.0
import { styled } from 'styled-components'; // ^5.3.0
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers'; // ^6.0.0
import { Input } from './Input';
import { formatDate, isValidDate, validateTimezone } from '../../utils/date';
import { elevation, flexLayout, focusOutline } from '../../styles/mixins';
import { breakpoints } from '../../styles/breakpoints';

/**
 * Props interface for the DatePicker component with comprehensive configuration options
 */
interface DatePickerProps {
  /** Input field name */
  name: string;
  /** Input label text */
  label: string;
  /** Selected date value */
  value: Date | null;
  /** Change handler for date selection */
  onChange: (date: Date | null, timezone?: string) => void;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Disabled state */
  disabled?: boolean;
  /** Required field indicator */
  required?: boolean;
  /** Error message */
  error?: string;
  /** Timezone for date handling */
  timezone?: string;
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** Custom validation callback */
  validationCallback?: (date: Date) => boolean;
  /** Date format options */
  formatOptions?: Intl.DateTimeFormatOptions;
}

/**
 * Styled container component following Material Design 3.0 principles
 */
const DatePickerContainer = styled.div`
  ${flexLayout({
    direction: 'column',
    gap: '8px'
  })}
  position: relative;
  width: 100%;
  margin-bottom: ${({ theme }) => theme.spacing(2)};

  @media ${breakpoints.down('tablet')} {
    margin-bottom: ${({ theme }) => theme.spacing(1.5)};
  }
`;

/**
 * Styled DatePicker component with enhanced accessibility and Material Design styling
 */
const StyledDatePicker = styled(MuiDatePicker)`
  width: 100%;
  
  .MuiInputBase-root {
    ${elevation(1)}
    border-radius: ${({ theme }) => theme.shape.borderRadius}px;
    transition: box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      ${elevation(2)}
    }

    &.Mui-focused {
      ${focusOutline}
    }
  }

  .MuiInputBase-input {
    padding: ${({ theme }) => theme.spacing(1.5, 2)};
    height: auto;
    font-family: ${({ theme }) => theme.typography.body1.fontFamily};
    font-size: ${({ theme }) => theme.typography.body1.fontSize};
    line-height: ${({ theme }) => theme.typography.body1.lineHeight};
  }

  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
    }
  }
`;

/**
 * Enhanced DatePicker component with timezone support and accessibility features
 */
const DatePicker: React.FC<DatePickerProps> = ({
  name,
  label,
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  required = false,
  error,
  timezone = 'America/New_York',
  ariaLabel,
  validationCallback,
  formatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
}) => {
  // Local state for internal date handling
  const [localDate, setLocalDate] = useState<Date | null>(value);
  const [localError, setLocalError] = useState<string | undefined>(error);

  // Validate timezone on mount and when changed
  useEffect(() => {
    if (!validateTimezone(timezone)) {
      console.error(`Invalid timezone: ${timezone}. Defaulting to America/New_York`);
    }
  }, [timezone]);

  // Update local date when external value changes
  useEffect(() => {
    setLocalDate(value);
  }, [value]);

  // Update local error when external error changes
  useEffect(() => {
    setLocalError(error);
  }, [error]);

  /**
   * Validates the selected date against all constraints
   */
  const validateDate = useCallback((date: Date | null): boolean => {
    if (!date) return !required;
    if (!isValidDate(date)) return false;

    if (minDate && date < minDate) {
      setLocalError('Date cannot be before minimum date');
      return false;
    }

    if (maxDate && date > maxDate) {
      setLocalError('Date cannot be after maximum date');
      return false;
    }

    if (validationCallback && !validationCallback(date)) {
      setLocalError('Date failed custom validation');
      return false;
    }

    setLocalError(undefined);
    return true;
  }, [minDate, maxDate, required, validationCallback]);

  /**
   * Handles date selection with validation and timezone conversion
   */
  const handleDateChange = useCallback((selectedDate: Date | null) => {
    if (!selectedDate) {
      setLocalDate(null);
      onChange(null, timezone);
      return;
    }

    if (validateDate(selectedDate)) {
      setLocalDate(selectedDate);
      onChange(selectedDate, timezone);
    }
  }, [onChange, timezone, validateDate]);

  /**
   * Memoized date format configuration
   */
  const dateFormat = useMemo(() => ({
    ...formatOptions,
    timeZone: timezone
  }), [formatOptions, timezone]);

  return (
    <DatePickerContainer>
      <StyledDatePicker
        value={localDate}
        onChange={handleDateChange}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        renderInput={(params) => (
          <Input
            {...params}
            id={`date-picker-${name}`}
            name={name}
            label={label}
            required={required}
            error={localError}
            aria-label={ariaLabel || label}
            aria-required={required}
            aria-invalid={!!localError}
            aria-describedby={localError ? `${name}-error` : undefined}
            inputProps={{
              ...params.inputProps,
              'aria-label': ariaLabel || label,
              placeholder: formatDate(new Date(), dateFormat.timeZone)
            }}
          />
        )}
        PopperProps={{
          placement: 'bottom-start',
          modifiers: [{
            name: 'offset',
            options: {
              offset: [0, 8]
            }
          }]
        }}
        componentsProps={{
          actionBar: {
            actions: ['clear', 'today', 'accept']
          }
        }}
      />
      {localError && (
        <span
          id={`${name}-error`}
          role="alert"
          aria-live="polite"
          style={{ color: 'error', marginTop: '4px' }}
        >
          {localError}
        </span>
      )}
    </DatePickerContainer>
  );
};

export default DatePicker;
export type { DatePickerProps };