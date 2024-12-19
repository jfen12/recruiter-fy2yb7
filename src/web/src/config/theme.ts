import { createTheme, ThemeOptions } from '@mui/material'; // v5.0.0
import { palette } from '../styles/colors';
import { fontFamily } from '../styles/typography';
import { breakpoints } from '../styles/breakpoints';
import { elevation } from '../styles/mixins';

// Constants following Material Design 3.0 principles
const SPACING_UNIT = 8;
const BORDER_RADIUS = {
  small: 4,
  medium: 8,
  large: 12
} as const;

const Z_INDEX = {
  modal: 1000,
  dropdown: 100,
  header: 50,
  content: 1
} as const;

const ELEVATION_LEVELS = {
  low: 1,
  medium: 2,
  high: 3,
  modal: 4
} as const;

const TRANSITION_DURATION = {
  short: 200,
  medium: 300,
  long: 500
} as const;

/**
 * Creates a complete theme configuration with Material Design 3.0 principles
 * and accessibility compliance
 */
const createAppTheme = (options: ThemeOptions) => {
  return createTheme({
    // Spacing using 8px grid system
    spacing: (factor: number) => `${SPACING_UNIT * factor}px`,

    // Breakpoints for responsive design
    breakpoints: {
      values: {
        xs: breakpoints.mobile,
        sm: breakpoints.tablet,
        md: breakpoints.desktop,
        lg: breakpoints.largeDesktop,
        xl: 1920
      }
    },

    // Typography with fluid scaling and accessibility
    typography: {
      fontFamily: fontFamily.primary,
      h1: {
        fontFamily: fontFamily.secondary,
        fontWeight: 700,
        letterSpacing: '-0.5px'
      },
      h2: {
        fontFamily: fontFamily.secondary,
        fontWeight: 700,
        letterSpacing: '-0.25px'
      },
      h3: {
        fontFamily: fontFamily.secondary,
        fontWeight: 600,
        letterSpacing: 0
      },
      h4: {
        fontFamily: fontFamily.secondary,
        fontWeight: 600,
        letterSpacing: '0.25px'
      },
      h5: {
        fontFamily: fontFamily.secondary,
        fontWeight: 500,
        letterSpacing: 0
      },
      h6: {
        fontFamily: fontFamily.secondary,
        fontWeight: 500,
        letterSpacing: '0.15px'
      },
      body1: {
        fontFamily: fontFamily.primary,
        fontWeight: 400,
        letterSpacing: '0.15px'
      },
      body2: {
        fontFamily: fontFamily.primary,
        fontWeight: 400,
        letterSpacing: '0.15px'
      },
      button: {
        fontFamily: fontFamily.primary,
        fontWeight: 500,
        letterSpacing: '0.5px',
        textTransform: 'uppercase'
      },
      caption: {
        fontFamily: fontFamily.primary,
        fontWeight: 400,
        letterSpacing: '0.4px'
      }
    },

    // Shape configurations
    shape: {
      borderRadius: BORDER_RADIUS.medium
    },

    // Z-index management
    zIndex: Z_INDEX,

    // Component overrides for consistent styling
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '@media (prefers-reduced-motion: reduce)': {
            '*': {
              animationDuration: '0.01ms !important',
              animationIterationCount: '1 !important',
              transitionDuration: '0.01ms !important',
              scrollBehavior: 'auto !important'
            }
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: BORDER_RADIUS.medium,
            textTransform: 'none',
            transition: `all ${TRANSITION_DURATION.short}ms cubic-bezier(0.4, 0, 0.2, 1)`
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: BORDER_RADIUS.medium,
            transition: `box-shadow ${TRANSITION_DURATION.short}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            ...elevation(ELEVATION_LEVELS.low, theme.palette.mode === 'dark')
          })
        }
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            borderRadius: BORDER_RADIUS.small
          }
        }
      },
      MuiFocusVisible: {
        styleOverrides: {
          root: ({ theme }) => ({
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: '2px'
          })
        }
      }
    },

    ...options
  });
};

// Light theme configuration
export const lightTheme = createAppTheme({
  palette: {
    mode: 'light',
    ...palette.light
  }
});

// Dark theme configuration
export const darkTheme = createAppTheme({
  palette: {
    mode: 'dark',
    ...palette.dark
  }
});

// Type exports for theme customization
export type AppTheme = typeof lightTheme;
export interface CustomThemeOptions extends ThemeOptions {
  mode?: 'light' | 'dark';
}