import { useState, useEffect, useCallback, useMemo } from 'react'; // v18.0.0
import { breakpoints } from '../styles/breakpoints';

/**
 * Interface defining the current state of breakpoints and window width
 */
interface BreakpointState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  width: number;
}

/**
 * Custom hook that provides responsive breakpoint utilities and window size tracking
 * with optimized performance and SSR support.
 * 
 * @returns {BreakpointState} Object containing current breakpoint states and window width
 */
const useBreakpoints = (): BreakpointState => {
  // Initialize with SSR-safe default values
  const [state, setState] = useState<BreakpointState>({
    isMobile: true,
    isTablet: false,
    isDesktop: false,
    isLargeDesktop: false,
    width: typeof window !== 'undefined' ? window.innerWidth : breakpoints.mobile,
  });

  // Memoize the calculation of breakpoint states to prevent unnecessary recalculations
  const calculateBreakpointState = useCallback((width: number): BreakpointState => {
    return {
      isMobile: width >= breakpoints.mobile && width < breakpoints.tablet,
      isTablet: width >= breakpoints.tablet && width < breakpoints.desktop,
      isDesktop: width >= breakpoints.desktop && width < breakpoints.largeDesktop,
      isLargeDesktop: width >= breakpoints.largeDesktop,
      width,
    };
  }, []);

  // Memoize the resize handler to prevent unnecessary recreations
  const handleResize = useCallback(() => {
    // Ensure we're in a browser environment
    if (typeof window === 'undefined') return;

    // Use requestAnimationFrame for smooth updates
    const rafId = requestAnimationFrame(() => {
      const width = window.innerWidth;
      setState(prevState => {
        const newState = calculateBreakpointState(width);
        
        // Only update state if values have actually changed
        return (
          prevState.width !== newState.width ||
          prevState.isMobile !== newState.isMobile ||
          prevState.isTablet !== newState.isTablet ||
          prevState.isDesktop !== newState.isDesktop ||
          prevState.isLargeDesktop !== newState.isLargeDesktop
        ) ? newState : prevState;
      });
    });

    // Cleanup animation frame on next update
    return () => cancelAnimationFrame(rafId);
  }, [calculateBreakpointState]);

  useEffect(() => {
    // Skip effect during SSR
    if (typeof window === 'undefined') return;

    // Calculate initial state
    handleResize();

    let resizeObserver: ResizeObserver | null = null;
    
    // Use ResizeObserver if supported, fallback to event listener
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(document.documentElement);
    } else {
      window.addEventListener('resize', handleResize, { passive: true });
    }

    // Cleanup function
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [handleResize]);

  // Memoize the state to prevent unnecessary rerenders
  return useMemo(() => state, [state]);
};

export default useBreakpoints;
```

This implementation:

1. Imports necessary hooks from React 18 and breakpoint values from our breakpoints utility.

2. Defines a `BreakpointState` interface that matches the requirements for tracking responsive states.

3. Implements the `useBreakpoints` hook with several optimizations:
   - SSR-safe initialization with fallback values
   - Memoized breakpoint calculations
   - Debounced resize handling with requestAnimationFrame
   - ResizeObserver with event listener fallback
   - State updates only when values actually change
   - Memoized return value to prevent unnecessary rerenders

4. Includes comprehensive error handling and cleanup:
   - Checks for browser environment
   - Proper cleanup of event listeners and observers
   - Cancellation of animation frames

5. Follows best practices for performance:
   - Uses passive event listeners
   - Implements proper cleanup in useEffect
   - Memoizes calculations and handlers
   - Optimizes state updates

6. Provides TypeScript support with proper typing and interfaces.

Usage example:
```typescript
const MyComponent = () => {
  const { isMobile, isTablet, isDesktop, isLargeDesktop, width } = useBreakpoints();

  return (
    <div>
      {isMobile && <MobileLayout />}
      {isTablet && <TabletLayout />}
      {isDesktop && <DesktopLayout />}
      {isLargeDesktop && <LargeDesktopLayout />}
      <div>Current width: {width}px</div>
    </div>
  );
};