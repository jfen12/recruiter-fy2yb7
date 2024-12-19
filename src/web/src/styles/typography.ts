import { css } from 'styled-components'; // v5.3.0
import { breakpoints } from './breakpoints';
import { responsiveFont } from './mixins';

/**
 * Font family definitions following Material Design 3.0 principles
 * Includes fallback fonts for cross-platform consistency
 */
export const fontFamily = {
  primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  secondary: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  monospace: "'Fira Code', 'Consolas', monospace"
} as const;

/**
 * Font weight definitions following Material Design 3.0 principles
 */
const FONT_WEIGHT = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700
} as const;

/**
 * Font size scale with min/max values for fluid typography
 * Following WCAG 2.1 Level AA guidelines for readable text sizes
 */
const FONT_SIZE = {
  h1: { min: 32, max: 48 },
  h2: { min: 28, max: 40 },
  h3: { min: 24, max: 32 },
  h4: { min: 20, max: 24 },
  h5: { min: 16, max: 20 },
  h6: { min: 14, max: 16 },
  body1: { min: 16, max: 16 },
  body2: { min: 14, max: 14 },
  caption: { min: 12, max: 12 },
  button: { min: 14, max: 16 }
} as const;

/**
 * Line height scale following Material Design 3.0 principles
 * Ensures proper readability and WCAG compliance
 */
const LINE_HEIGHT = {
  h1: 1.2,
  h2: 1.25,
  h3: 1.3,
  h4: 1.35,
  h5: 1.4,
  h6: 1.45,
  body1: 1.5,
  body2: 1.5,
  caption: 1.4,
  button: 1.75
} as const;

/**
 * Letter spacing (tracking) values in pixels
 * Optimized for readability at different sizes
 */
const LETTER_SPACING = {
  h1: -0.5,
  h2: -0.25,
  h3: 0,
  h4: 0.25,
  h5: 0,
  h6: 0.15,
  body1: 0,
  body2: 0,
  caption: 0.4,
  button: 0.5
} as const;

/**
 * Interface for typography variant options
 */
interface TypographyVariantOptions {
  minFontSize: number;
  maxFontSize: number;
  lineHeight: number;
  fontWeight: number;
  fontFamily: string;
  textTransform?: string;
  letterSpacing: number;
}

/**
 * Creates a typography variant with responsive font sizing and proper metrics
 * @param options Typography variant configuration
 * @returns Styled-components CSS for the typography variant
 */
const createTypographyVariant = (options: TypographyVariantOptions) => css`
  ${responsiveFont({
    minSize: options.minFontSize,
    maxSize: options.maxFontSize,
    minWidth: breakpoints.mobile,
    maxWidth: breakpoints.desktop
  })}
  line-height: ${options.lineHeight};
  font-weight: ${options.fontWeight};
  font-family: ${options.fontFamily};
  ${options.textTransform && `text-transform: ${options.textTransform};`}
  letter-spacing: ${options.letterSpacing}px;
  margin: 0; /* Reset margin for consistent spacing */
`;

/**
 * Typography variants following Material Design 3.0 principles
 * Each variant is optimized for readability and WCAG 2.1 Level AA compliance
 */
export const typography = {
  h1: createTypographyVariant({
    minFontSize: FONT_SIZE.h1.min,
    maxFontSize: FONT_SIZE.h1.max,
    lineHeight: LINE_HEIGHT.h1,
    fontWeight: FONT_WEIGHT.bold,
    fontFamily: fontFamily.secondary,
    letterSpacing: LETTER_SPACING.h1
  }),

  h2: createTypographyVariant({
    minFontSize: FONT_SIZE.h2.min,
    maxFontSize: FONT_SIZE.h2.max,
    lineHeight: LINE_HEIGHT.h2,
    fontWeight: FONT_WEIGHT.bold,
    fontFamily: fontFamily.secondary,
    letterSpacing: LETTER_SPACING.h2
  }),

  h3: createTypographyVariant({
    minFontSize: FONT_SIZE.h3.min,
    maxFontSize: FONT_SIZE.h3.max,
    lineHeight: LINE_HEIGHT.h3,
    fontWeight: FONT_WEIGHT.semibold,
    fontFamily: fontFamily.secondary,
    letterSpacing: LETTER_SPACING.h3
  }),

  h4: createTypographyVariant({
    minFontSize: FONT_SIZE.h4.min,
    maxFontSize: FONT_SIZE.h4.max,
    lineHeight: LINE_HEIGHT.h4,
    fontWeight: FONT_WEIGHT.semibold,
    fontFamily: fontFamily.secondary,
    letterSpacing: LETTER_SPACING.h4
  }),

  h5: createTypographyVariant({
    minFontSize: FONT_SIZE.h5.min,
    maxFontSize: FONT_SIZE.h5.max,
    lineHeight: LINE_HEIGHT.h5,
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: fontFamily.secondary,
    letterSpacing: LETTER_SPACING.h5
  }),

  h6: createTypographyVariant({
    minFontSize: FONT_SIZE.h6.min,
    maxFontSize: FONT_SIZE.h6.max,
    lineHeight: LINE_HEIGHT.h6,
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: fontFamily.secondary,
    letterSpacing: LETTER_SPACING.h6
  }),

  body1: createTypographyVariant({
    minFontSize: FONT_SIZE.body1.min,
    maxFontSize: FONT_SIZE.body1.max,
    lineHeight: LINE_HEIGHT.body1,
    fontWeight: FONT_WEIGHT.regular,
    fontFamily: fontFamily.primary,
    letterSpacing: LETTER_SPACING.body1
  }),

  body2: createTypographyVariant({
    minFontSize: FONT_SIZE.body2.min,
    maxFontSize: FONT_SIZE.body2.max,
    lineHeight: LINE_HEIGHT.body2,
    fontWeight: FONT_WEIGHT.regular,
    fontFamily: fontFamily.primary,
    letterSpacing: LETTER_SPACING.body2
  }),

  caption: createTypographyVariant({
    minFontSize: FONT_SIZE.caption.min,
    maxFontSize: FONT_SIZE.caption.max,
    lineHeight: LINE_HEIGHT.caption,
    fontWeight: FONT_WEIGHT.regular,
    fontFamily: fontFamily.primary,
    letterSpacing: LETTER_SPACING.caption
  }),

  button: createTypographyVariant({
    minFontSize: FONT_SIZE.button.min,
    maxFontSize: FONT_SIZE.button.max,
    lineHeight: LINE_HEIGHT.button,
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: fontFamily.primary,
    textTransform: 'uppercase',
    letterSpacing: LETTER_SPACING.button
  })
} as const;