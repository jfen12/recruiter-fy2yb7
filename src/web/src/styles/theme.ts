import { createTheme, ThemeOptions } from '@mui/material'; // v5.0.0
import { palette } from './colors';
import { typography } from './typography';
import { breakpoints } from './breakpoints';

/**
 * Extended theme interface with custom properties
 * Ensures type safety for custom theme properties
 */
interface CustomTheme extends ThemeOptions {
  spacing: Record<string, number>;
  zIndex: Record<string, number>;
  transitions: Record<string, unknown>;
  shadows: string[];
  accessibility: {
    focusOutlineWidth: number;
    focusOutlineStyle: string;
    focusOutlineOffset: number;
    minimumTouchTarget: number;
    reducedMotion: boolean;
  };
  motion: {
    duration: Record<string, number>;
    easing: Record<string, string>;
  };
  elevation: Record<string, number>;
}

// Base spacing unit following Material Design 3.0 8px grid system
const SPACING_UNIT = 8;

// Z-index hierarchy for layered components
const Z_INDEX = {
  drawer: 1200,
  modal: 1300,
  snackbar: 1400,
  tooltip: 1500,
  popover: 1600,
  notification: 1700
} as const;

// Motion and animation configurations
const TRANSITIONS = {
  duration: {
    shortest: 150,
    shorter: 200,
    short: 250,
    standard: 300,
    complex: 375,
    enteringScreen: 225,
    leavingScreen: 195,
    elevation: 280
  },
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)'
  }
} as const;

// Elevation levels for Material Design shadow system
const ELEVATION_LEVELS = {
  resting: 0,
  raised: 2,
  floating: 8,
  modal: 16,
  overlay: 24
} as const;

/**
 * Creates a custom theme with all required configurations and accessibility features
 * @param options - Theme configuration options
 * @returns Complete theme object with all configurations
 */
const createCustomTheme = (options: ThemeOptions) => {
  const { mode = 'light' } = options;
  const colors = mode === 'light' ? palette.light : palette.dark;

  return createTheme({
    palette: {
      mode,
      ...colors,
    },
    typography,
    breakpoints: {
      values: {
        xs: breakpoints.mobile,
        sm: breakpoints.tablet,
        md: breakpoints.desktop,
        lg: breakpoints.largeDesktop,
        xl: breakpoints.largeDesktop * 1.5
      }
    },
    spacing: (factor: number) => `${SPACING_UNIT * factor}px`,
    zIndex: Z_INDEX,
    transitions: TRANSITIONS,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '@global': {
            // Ensure smooth scrolling with reduced motion preference
            html: {
              scrollBehavior: 'smooth',
              '@media (prefers-reduced-motion: reduce)': {
                scrollBehavior: 'auto'
              }
            },
            // Minimum touch target size for accessibility
            'button, [role="button"], [role="link"]': {
              minWidth: '44px',
              minHeight: '44px'
            }
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: SPACING_UNIT
          }
        }
      },
      MuiFocusVisible: {
        defaultProps: {
          style: {
            outline: `2px solid ${colors.primary.main}`,
            outlineOffset: '2px'
          }
        }
      }
    },
    shape: {
      borderRadius: SPACING_UNIT
    },
    accessibility: {
      focusOutlineWidth: 2,
      focusOutlineStyle: 'solid',
      focusOutlineOffset: 2,
      minimumTouchTarget: 44,
      reducedMotion: false
    },
    motion: TRANSITIONS,
    elevation: ELEVATION_LEVELS
  } as CustomTheme);
};

// Create light and dark themes
export const lightTheme = createCustomTheme({ mode: 'light' });
export const darkTheme = createCustomTheme({ mode: 'dark' });

// Shadow animation keyframes for elevation transitions
export const SHADOW_KEYFRAMES = `
  @keyframes elevationTransition {
    from { box-shadow: var(--shadow-start) }
    to { box-shadow: var(--shadow-end) }
  }
`;

// Reduced motion media query for accessibility
export const MOTION_PREFERENCES = `
  @media (prefers-reduced-motion: reduce) {
    * {
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
    }
  }
`;