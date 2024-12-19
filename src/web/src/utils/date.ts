/**
 * @fileoverview Date utility functions for RefactorTrack web application
 * Provides consistent date handling, formatting, and timezone support
 * @version 1.0.0
 */

import { format, parseISO, differenceInDays, isValid } from 'date-fns'; // v2.30.0
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz'; // v2.0.0
import { ApiResponse } from '../interfaces/common.interface';

/**
 * Supported North American timezone identifiers
 */
const SUPPORTED_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'America/Toronto',
  'America/Vancouver',
  'America/Montreal'
] as const;

type SupportedTimezone = typeof SUPPORTED_TIMEZONES[number];

/**
 * Common date format patterns
 */
export const DATE_FORMATS = {
  DISPLAY: 'MMM d, yyyy',
  DISPLAY_WITH_TIME: 'MMM d, yyyy h:mm a',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  SHORT: 'MM/dd/yyyy',
  TIME: 'h:mm a',
  WEEKDAY: 'EEEE',
  MONTH_YEAR: 'MMMM yyyy'
} as const;

/**
 * Formats a date into a standardized string representation with timezone support
 * @param date - Date to format (Date object or ISO string)
 * @param formatString - Format pattern to apply (from DATE_FORMATS or custom)
 * @param timezone - Target timezone (defaults to local timezone)
 * @returns Formatted date string in specified timezone
 * @throws Error if date is invalid or timezone is unsupported
 */
export const formatDate = (
  date: Date | string,
  formatString: string = DATE_FORMATS.DISPLAY,
  timezone: string = getLocalTimezone()
): string => {
  try {
    if (!validateTimezone(timezone)) {
      throw new Error(`Unsupported timezone: ${timezone}`);
    }

    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      throw new Error('Invalid date provided');
    }

    const zonedDate = utcToZonedTime(dateObj, timezone);
    return format(zonedDate, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Returns a human-readable relative time string with timezone awareness
 * @param date - Date to compare (Date object or ISO string)
 * @param timezone - Target timezone (defaults to local timezone)
 * @returns Relative time string (e.g., "2 days ago", "in 3 hours")
 */
export const getRelativeTime = (
  date: Date | string,
  timezone: string = getLocalTimezone()
): string => {
  try {
    if (!validateTimezone(timezone)) {
      throw new Error(`Unsupported timezone: ${timezone}`);
    }

    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      throw new Error('Invalid date provided');
    }

    const now = new Date();
    const zonedDate = utcToZonedTime(dateObj, timezone);
    const zonedNow = utcToZonedTime(now, timezone);
    
    const diffDays = differenceInDays(zonedDate, zonedNow);

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays === -1) {
      return 'Yesterday';
    } else if (diffDays > 0) {
      return `in ${diffDays} days`;
    } else {
      return `${Math.abs(diffDays)} days ago`;
    }
  } catch (error) {
    console.error('Error calculating relative time:', error);
    return 'Invalid Date';
  }
};

/**
 * Parses a date string with timezone information
 * @param dateString - Date string to parse
 * @param timezone - Source timezone of the date string
 * @returns Parsed Date object in specified timezone
 * @throws Error if date string is invalid or timezone is unsupported
 */
export const parseWithTimezone = (
  dateString: string,
  timezone: string = getLocalTimezone()
): Date => {
  if (!validateTimezone(timezone)) {
    throw new Error(`Unsupported timezone: ${timezone}`);
  }

  try {
    const parsedDate = parseISO(dateString);
    if (!isValid(parsedDate)) {
      throw new Error('Invalid date string format');
    }

    return zonedTimeToUtc(parsedDate, timezone);
  } catch (error) {
    throw new Error(`Error parsing date: ${error.message}`);
  }
};

/**
 * Validates if a timezone string is valid for North America
 * @param timezone - Timezone string to validate
 * @returns boolean indicating if timezone is supported
 */
export const validateTimezone = (timezone: string): timezone is SupportedTimezone => {
  return SUPPORTED_TIMEZONES.includes(timezone as SupportedTimezone);
};

/**
 * Gets the user's local timezone
 * @returns IANA timezone string
 * @throws Error if local timezone cannot be determined
 */
export const getLocalTimezone = (): string => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!validateTimezone(timezone)) {
      // Fall back to EST if local timezone is not supported
      return 'America/New_York';
    }
    return timezone;
  } catch (error) {
    console.error('Error detecting local timezone:', error);
    return 'America/New_York';
  }
};

/**
 * Type guard to check if a value is a valid Date
 * @param value - Value to check
 * @returns boolean indicating if value is a valid Date
 */
export const isValidDate = (value: unknown): value is Date => {
  return value instanceof Date && !isNaN(value.getTime());
};

/**
 * Converts an API response timestamp to local timezone
 * @param response - API response object containing a timestamp
 * @returns Date object in local timezone
 */
export const convertApiTimestamp = <T>(response: ApiResponse<T>): Date => {
  const localTimezone = getLocalTimezone();
  return utcToZonedTime(response.timestamp, localTimezone);
};