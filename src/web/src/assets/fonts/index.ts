/**
 * @fileoverview Font assets and configurations for RefactorTrack application
 * Implements Material Design 3.0 typography scale with WCAG 2.1 Level AA compliance
 * @version 1.0.0
 */

/**
 * Type definition for font file paths structure
 */
interface FontPaths {
  inter: {
    regular: string;
    medium: string;
    semibold: string;
  };
  poppins: {
    regular: string;
    medium: string;
  };
  firaCode: {
    regular: string;
  };
}

/**
 * Font file paths configuration
 * Using WOFF2 format for optimal compression and modern browser support
 */
const FONT_PATHS: FontPaths = {
  inter: {
    regular: './files/Inter-Regular.woff2',
    medium: './files/Inter-Medium.woff2',
    semibold: './files/Inter-SemiBold.woff2',
  },
  poppins: {
    regular: './files/Poppins-Regular.woff2',
    medium: './files/Poppins-Medium.woff2',
  },
  firaCode: {
    regular: './files/FiraCode-Regular.woff2',
  },
};

/**
 * Primary font for body text (Inter)
 * Optimized for readability and accessibility
 * Meets WCAG 2.1 Level AA contrast requirements
 */
export const InterRegular = new URL(FONT_PATHS.inter.regular, import.meta.url).href;

/**
 * Medium weight variant of Inter
 * Used for emphasis and subheadings
 */
export const InterMedium = new URL(FONT_PATHS.inter.medium, import.meta.url).href;

/**
 * Semi-bold weight of Inter
 * Used for headings and important UI elements
 */
export const InterSemiBold = new URL(FONT_PATHS.inter.semibold, import.meta.url).href;

/**
 * Secondary font (Poppins)
 * Used for complementary text elements
 * Provides visual hierarchy while maintaining readability
 */
export const PoppinsRegular = new URL(FONT_PATHS.poppins.regular, import.meta.url).href;

/**
 * Medium weight of Poppins
 * Used for emphasis in complementary elements
 */
export const PoppinsMedium = new URL(FONT_PATHS.poppins.medium, import.meta.url).href;

/**
 * Monospace font (Fira Code)
 * Used for code snippets and technical content
 * Features programming ligatures for improved readability
 */
export const FiraCodeRegular = new URL(FONT_PATHS.firaCode.regular, import.meta.url).href;

/**
 * Default export of all font paths for bulk imports
 */
export default FONT_PATHS;