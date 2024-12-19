import { css } from 'styled-components'; // v5.3.0
import { palette } from './colors';
import { breakpoints } from './breakpoints';

// Constants for Material Design elevation shadows
const ELEVATION_SHADOWS = {
  0: 'none',
  1: '0 2px 1px -1px rgba(0,0,0,0.2), 0 1px 1px 0 rgba(0,0,0,0.14), 0 1px 3px 0 rgba(0,0,0,0.12)',
  2: '0 3px 1px -2px rgba(0,0,0,0.2), 0 2px 2px 0 rgba(0,0,0,0.14), 0 1px 5px 0 rgba(0,0,0,0.12)',
  4: '0 2px 4px -1px rgba(0,0,0,0.2), 0 4px 5px 0 rgba(0,0,0,0.14), 0 1px 10px 0 rgba(0,0,0,0.12)',
  8: '0 5px 5px -3px rgba(0,0,0,0.2), 0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12)',
  16: '0 8px 10px -5px rgba(0,0,0,0.2), 0 16px 24px 2px rgba(0,0,0,0.14), 0 6px 30px 5px rgba(0,0,0,0.12)'
} as const;

// Grid system constants based on 8px units
const GRID_UNITS = {
  base: '8px',
  half: '4px',
  double: '16px',
  quad: '32px'
} as const;

// Interface definitions
interface FlexOptions {
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justify?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around';
  align?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: string;
}

interface GridOptions {
  columns?: number | string;
  rows?: number | string;
  areas?: string[];
  gap?: string;
  autoFlow?: 'row' | 'column' | 'row dense' | 'column dense';
}

interface ResponsiveOptions {
  minSize: number;
  maxSize: number;
  minWidth?: number;
  maxWidth?: number;
  unit?: 'px' | 'rem';
}

/**
 * Creates Material Design elevation shadow with theme awareness
 * @param level - Elevation level (0, 1, 2, 4, 8, or 16)
 * @param isDark - Whether dark theme is active
 */
export const elevation = (level: keyof typeof ELEVATION_SHADOWS, isDark = false) => css`
  box-shadow: ${ELEVATION_SHADOWS[level]};
  transition: box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
  background-color: ${isDark ? palette.dark.background.paper : palette.light.background.paper};
`;

/**
 * Creates fluid responsive typography
 * @param options - Configuration for responsive scaling
 */
export const responsiveFont = (options: ResponsiveOptions) => {
  const {
    minSize,
    maxSize,
    minWidth = breakpoints.mobile,
    maxWidth = breakpoints.desktop,
    unit = 'px'
  } = options;

  const slope = (maxSize - minSize) / (maxWidth - minWidth);
  const yAxisIntersection = -minWidth * slope + minSize;

  return css`
    font-size: ${minSize}${unit};
    
    @media (min-width: ${minWidth}px) and (max-width: ${maxWidth}px) {
      font-size: clamp(
        ${minSize}${unit},
        ${yAxisIntersection}${unit} + ${slope * 100}vw,
        ${maxSize}${unit}
      );
    }
    
    @media (min-width: ${maxWidth}px) {
      font-size: ${maxSize}${unit};
    }
  `;
};

/**
 * Creates flexbox layout with common patterns
 * @param options - Flexbox configuration options
 */
export const flexLayout = (options: FlexOptions = {}) => {
  const {
    direction = 'row',
    justify = 'flex-start',
    align = 'stretch',
    wrap = 'nowrap',
    gap = '0'
  } = options;

  return css`
    display: flex;
    flex-direction: ${direction};
    justify-content: ${justify};
    align-items: ${align};
    flex-wrap: ${wrap};
    gap: ${gap};
  `;
};

/**
 * Creates grid layout following 8px grid system
 * @param options - Grid configuration options
 */
export const gridLayout = (options: GridOptions = {}) => {
  const {
    columns = 'auto',
    rows = 'auto',
    areas,
    gap = GRID_UNITS.base,
    autoFlow = 'row'
  } = options;

  return css`
    display: grid;
    grid-template-columns: ${typeof columns === 'number' ? `repeat(${columns}, 1fr)` : columns};
    grid-template-rows: ${typeof rows === 'number' ? `repeat(${rows}, 1fr)` : rows};
    ${areas ? `grid-template-areas: ${areas.map(area => `"${area}"`).join(' ')};` : ''}
    gap: ${gap};
    grid-auto-flow: ${autoFlow};
  `;
};

/**
 * Creates focus outline for accessibility
 * Ensures WCAG 2.1 Level AA compliance
 */
export const focusOutline = css`
  outline: none;
  box-shadow: 0 0 0 2px ${palette.light.primary.main};
  transition: box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/**
 * Creates truncated text with ellipsis
 * @param lines - Number of lines before truncation
 */
export const truncateText = (lines: number = 1) => css`
  overflow: hidden;
  text-overflow: ellipsis;
  ${lines === 1
    ? 'white-space: nowrap;'
    : css`
        display: -webkit-box;
        -webkit-line-clamp: ${lines};
        -webkit-box-orient: vertical;
        white-space: normal;
      `}
`;

/**
 * Creates smooth transition for interactive elements
 * @param properties - CSS properties to transition
 */
export const smoothTransition = (properties: string[] = ['all']) => css`
  transition: ${properties.map(prop => `${prop} 200ms cubic-bezier(0.4, 0, 0.2, 1)`).join(', ')};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/**
 * Creates visually hidden element that remains accessible to screen readers
 */
export const visuallyHidden = css`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;