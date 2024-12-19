// @mui/material version ^5.0.0
import type { ThemeOptions } from '@mui/material';

// Interfaces for type safety
interface Breakpoints {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

interface GridSystem {
  SPACING_UNIT: string;
  COLUMNS: Record<string, string>;
  GUTTER: Record<string, string>;
}

interface ApiConstants {
  TIMEOUT_DURATION: number;
  RETRY_ATTEMPTS: number;
  CACHE_DURATION: number;
  RATE_LIMITS: Record<string, number>;
}

interface AccessibilityConstants {
  MINIMUM_CONTRAST: number;
  FOCUS_VISIBLE: boolean;
  INTERACTION_TIMEOUT: number;
}

// UI Constants following Material Design 3.0 specifications
export const UI_CONSTANTS = {
  BREAKPOINTS: {
    xs: '320px',
    sm: '768px',
    md: '1024px',
    lg: '1440px',
    xl: '1920px'
  } as Breakpoints,

  GRID_SYSTEM: {
    SPACING_UNIT: '8px',
    COLUMNS: {
      xs: '4',
      sm: '8',
      md: '12',
      lg: '12',
      xl: '12'
    },
    GUTTER: {
      xs: '16px',
      sm: '24px',
      md: '24px',
      lg: '32px',
      xl: '32px'
    }
  } as GridSystem,

  SPACING: {
    UNIT: 8,
    SMALL: 8,
    MEDIUM: 16,
    LARGE: 24,
    XLARGE: 32,
    XXLARGE: 48
  },

  ELEVATION: {
    NONE: 0,
    LOW: 2,
    MEDIUM: 4,
    HIGH: 8,
    MODAL: 16
  },

  ACCESSIBILITY: {
    MINIMUM_CONTRAST: 4.5,
    FOCUS_VISIBLE: true,
    INTERACTION_TIMEOUT: 5000, // 5 seconds
    MOTION_REDUCE: true,
    TAB_SIZE: 48, // Minimum touch target size
    KEYBOARD_FOCUS_WIDTH: 2
  } as AccessibilityConstants
};

// API integration constants
export const API_CONSTANTS = {
  TIMEOUT_DURATION: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  CACHE_DURATION: 300000, // 5 minutes
  RATE_LIMITS: {
    DEFAULT: 1000, // requests per minute
    SEARCH: 100,
    UPLOAD: 50
  }
} as ApiConstants;

// Authentication constants
export const AUTH_CONSTANTS = {
  TOKEN_EXPIRY: 3600, // 1 hour in seconds
  REFRESH_TOKEN_EXPIRY: 604800, // 7 days in seconds
  SECURITY_POLICIES: {
    PASSWORD_MIN_LENGTH: 12,
    REQUIRE_SPECIAL_CHARS: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_UPPERCASE: true,
    MFA_ENABLED: true,
    SESSION_TIMEOUT: 1800 // 30 minutes
  }
};

// Theme constants following Material Design 3.0
export const THEME_CONSTANTS: Record<string, ThemeOptions> = {
  LIGHT_THEME: {
    palette: {
      mode: 'light',
      primary: {
        main: '#1976d2',
        light: '#42a5f5',
        dark: '#1565c0'
      },
      secondary: {
        main: '#9c27b0',
        light: '#ba68c8',
        dark: '#7b1fa2'
      },
      error: {
        main: '#d32f2f',
        light: '#ef5350',
        dark: '#c62828'
      },
      background: {
        default: '#ffffff',
        paper: '#f5f5f5'
      }
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      fontSize: 14,
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 700
    }
  },
  DARK_THEME: {
    palette: {
      mode: 'dark',
      primary: {
        main: '#90caf9',
        light: '#e3f2fd',
        dark: '#42a5f5'
      },
      secondary: {
        main: '#ce93d8',
        light: '#f3e5f5',
        dark: '#ab47bc'
      },
      error: {
        main: '#f44336',
        light: '#e57373',
        dark: '#d32f2f'
      },
      background: {
        default: '#121212',
        paper: '#1e1e1e'
      }
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      fontSize: 14,
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 700
    }
  }
};

// Environment-specific constants
export const ENV_CONSTANTS = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_URL: process.env.API_URL || 'http://localhost:3000',
  API_VERSION: process.env.API_VERSION || 'v1',
  ENVIRONMENT: (process.env.ENVIRONMENT || 'development') as 'development' | 'staging' | 'production'
};