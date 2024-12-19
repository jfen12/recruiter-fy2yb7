import { css } from 'styled-components'; // v5.3.0

// Type for valid breakpoint keys
type BreakpointKey = 'mobile' | 'tablet' | 'desktop' | 'largeDesktop';

// Interface defining breakpoint values
interface Breakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
  largeDesktop: number;
}

// Breakpoint values in pixels following Material Design 3.0 principles
const BREAKPOINTS: Breakpoints = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
  largeDesktop: 1440,
};

/**
 * Creates a min-width media query for specified breakpoint
 * @param breakpoint - The breakpoint key to create media query for
 * @throws Error if invalid breakpoint key provided
 * @returns Styled-components CSS template literal
 */
const up = (breakpoint: BreakpointKey) => {
  if (!(breakpoint in BREAKPOINTS)) {
    throw new Error(`Invalid breakpoint key: ${breakpoint}`);
  }
  return css`
    @media (min-width: ${BREAKPOINTS[breakpoint]}px) {
      ${css`
        ${({ theme }) => theme}
      `}
    }
  `;
};

/**
 * Creates a max-width media query for specified breakpoint
 * @param breakpoint - The breakpoint key to create media query for
 * @throws Error if invalid breakpoint key provided
 * @returns Styled-components CSS template literal
 */
const down = (breakpoint: BreakpointKey) => {
  if (!(breakpoint in BREAKPOINTS)) {
    throw new Error(`Invalid breakpoint key: ${breakpoint}`);
  }
  return css`
    @media (max-width: ${BREAKPOINTS[breakpoint] - 0.02}px) {
      ${css`
        ${({ theme }) => theme}
      `}
    }
  `;
};

/**
 * Creates a media query for viewport widths between two breakpoints
 * @param start - Starting breakpoint key
 * @param end - Ending breakpoint key
 * @throws Error if invalid breakpoint keys provided or if start is greater than end
 * @returns Styled-components CSS template literal
 */
const between = (start: BreakpointKey, end: BreakpointKey) => {
  if (!(start in BREAKPOINTS) || !(end in BREAKPOINTS)) {
    throw new Error('Invalid breakpoint key provided');
  }
  
  if (BREAKPOINTS[start] >= BREAKPOINTS[end]) {
    throw new Error('Start breakpoint must be less than end breakpoint');
  }

  return css`
    @media (min-width: ${BREAKPOINTS[start]}px) and (max-width: ${BREAKPOINTS[end] - 0.02}px) {
      ${css`
        ${({ theme }) => theme}
      `}
    }
  `;
};

// Export breakpoint values and media query utilities
export const breakpoints = {
  ...BREAKPOINTS,
  up,
  down,
  between,
} as const;

// Type exports for consuming components
export type { BreakpointKey, Breakpoints };
```

This implementation:

1. Imports the `css` helper from styled-components v5.3.0 for creating dynamic media queries.

2. Defines TypeScript types and interfaces for type safety:
   - `BreakpointKey` type for valid breakpoint names
   - `Breakpoints` interface for breakpoint value structure

3. Implements the specified breakpoints (320px, 768px, 1024px, 1440px) following Material Design 3.0 principles.

4. Provides three utility functions:
   - `up()` for min-width queries
   - `down()` for max-width queries
   - `between()` for range queries

5. Includes comprehensive error handling and type safety.

6. Exports:
   - `breakpoints` object with values and utilities
   - TypeScript types for consuming components

Usage example:
```typescript
import { breakpoints } from './styles/breakpoints';

const ResponsiveComponent = styled.div`
  // Mobile-first base styles
  padding: 1rem;
  
  // Tablet and up
  ${breakpoints.up('tablet')} {
    padding: 2rem;
  }
  
  // Between tablet and desktop
  ${breakpoints.between('tablet', 'desktop')} {
    margin: 1.5rem;
  }
  
  // Desktop and down
  ${breakpoints.down('desktop')} {
    font-size: 14px;
  }
`;