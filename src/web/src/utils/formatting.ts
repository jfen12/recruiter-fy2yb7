/**
 * @fileoverview Utility functions for data formatting and text manipulation
 * Provides consistent formatting for currency, numbers, text, and other data types
 * with a focus on North American regional standards.
 * @version 1.0.0
 */

import numeral from 'numeral'; // v2.0.6
import { ApiResponse } from '../interfaces/common.interface';
import { formatDate } from './date';

/**
 * Formats a number as USD currency with validation and proper decimal places
 * @param amount - Number to format as currency
 * @returns Formatted currency string with $ symbol and exactly 2 decimal places
 */
export const formatCurrency = (amount: number | null | undefined): string => {
  try {
    if (amount === null || amount === undefined || isNaN(Number(amount))) {
      return '$0.00';
    }

    const numericAmount = Number(amount);
    if (!isFinite(numericAmount)) {
      return '$0.00';
    }

    // Format with numeral ensuring exactly 2 decimal places
    return numeral(numericAmount).format('$0,0.00');
  } catch (error) {
    console.error('Error formatting currency:', error);
    return '$0.00';
  }
};

/**
 * Formats a number with configurable decimal places and thousand separators
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string with proper separators
 */
export const formatNumber = (
  value: number | null | undefined,
  decimals: number = 0
): string => {
  try {
    if (value === null || value === undefined || isNaN(Number(value))) {
      return '0';
    }

    const numericValue = Number(value);
    if (!isFinite(numericValue)) {
      return '0';
    }

    // Validate decimals parameter
    const decimalPlaces = Math.max(0, Math.min(20, Math.floor(decimals)));
    const formatString = `0,0.${Array(decimalPlaces).fill('0').join('')}`;

    return numeral(numericValue).format(formatString);
  } catch (error) {
    console.error('Error formatting number:', error);
    return '0';
  }
};

/**
 * Formats a decimal number as a percentage with validation
 * @param value - Number to format as percentage (0.15 = 15%)
 * @returns Formatted percentage string with % symbol and one decimal place
 */
export const formatPercentage = (value: number | null | undefined): string => {
  try {
    if (value === null || value === undefined || isNaN(Number(value))) {
      return '0%';
    }

    const numericValue = Number(value);
    if (!isFinite(numericValue)) {
      return '0%';
    }

    // Convert to percentage and format with one decimal place
    const percentage = numericValue * 100;
    return numeral(percentage).format('0.0') + '%';
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return '0%';
  }
};

/**
 * Truncates text to specified length with ellipsis and proper word boundaries
 * @param text - Text to truncate
 * @param maxLength - Maximum length including ellipsis
 * @returns Truncated text with ellipsis if exceeding maxLength
 */
export const truncateText = (
  text: string | null | undefined,
  maxLength: number
): string => {
  try {
    if (!text || typeof text !== 'string') {
      return '';
    }

    if (maxLength < 4) {
      throw new Error('maxLength must be at least 4 characters');
    }

    if (text.length <= maxLength) {
      return text;
    }

    // Find the last space within the limit
    const truncated = text.slice(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > maxLength / 2) {
      // If we can find a good word boundary, use it
      return truncated.slice(0, lastSpace) + '...';
    }

    // Otherwise truncate at maxLength
    return truncated + '...';
  } catch (error) {
    console.error('Error truncating text:', error);
    return text?.slice(0, maxLength) || '';
  }
};

/**
 * Formats a phone number string to North American (XXX) XXX-XXXX format
 * @param phoneNumber - Phone number string to format
 * @returns Formatted phone number string or empty string for invalid input
 */
export const formatPhoneNumber = (phoneNumber: string | null | undefined): string => {
  try {
    if (!phoneNumber) {
      return '';
    }

    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Validate length for North American numbers
    if (cleaned.length !== 10) {
      return '';
    }

    // Validate area code (can't start with 0 or 1)
    const areaCode = cleaned.slice(0, 3);
    if (areaCode.startsWith('0') || areaCode.startsWith('1')) {
      return '';
    }

    // Format as (XXX) XXX-XXXX
    const formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    return formatted;
  } catch (error) {
    console.error('Error formatting phone number:', error);
    return '';
  }
};

/**
 * Type guard to check if a value can be safely converted to a number
 * @param value - Value to check
 * @returns boolean indicating if value can be converted to number
 */
const isConvertibleToNumber = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }
  const num = Number(value);
  return !isNaN(num) && isFinite(num);
};