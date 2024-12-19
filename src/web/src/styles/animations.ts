import { keyframes, css } from 'styled-components'; // v5.3.0
import { TRANSITIONS } from './theme';

// Animation duration constants following Material Design timing
export const ANIMATION_DURATION = {
  shortest: '150ms',
  shorter: '200ms',
  short: '250ms',
  standard: '300ms',
  complex: '375ms',
  enteringScreen: '225ms',
  leavingScreen: '195ms'
} as const;

// Easing functions following Material Design motion principles
export const ANIMATION_EASING = {
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)', // Standard
  easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',   // Deceleration
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',      // Acceleration
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)'      // Standard with emphasis
} as const;

// Properties that benefit from hardware acceleration
export const ANIMATION_PROPERTIES = {
  transform: 'transform',
  opacity: 'opacity',
  backgroundColor: 'background-color'
} as const;

// Utility to check for reduced motion preference
const prefersReducedMotion = () => css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

/**
 * Creates optimized transition styles for specified properties
 * @param properties - Array of properties to transition
 * @param options - Configuration options for timing and easing
 */
export const createTransitionStyles = (
  properties: Array<keyof typeof ANIMATION_PROPERTIES>,
  options: {
    duration?: keyof typeof ANIMATION_DURATION;
    easing?: keyof typeof ANIMATION_EASING;
  } = {}
) => {
  const {
    duration = 'standard',
    easing = 'easeInOut'
  } = options;

  return css`
    will-change: ${properties.join(', ')};
    transition: ${properties
      .map(prop => `${prop} ${ANIMATION_DURATION[duration]} ${ANIMATION_EASING[easing]}`)
      .join(', ')};
    ${prefersReducedMotion()}
  `;
};

// Fade in animation with hardware acceleration
export const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateZ(0);
  }
  to {
    opacity: 1;
    transform: translateZ(0);
  }
`;

// Fade out animation with hardware acceleration
export const fadeOut = keyframes`
  from {
    opacity: 1;
    transform: translateZ(0);
  }
  to {
    opacity: 0;
    transform: translateZ(0);
  }
`;

// Slide in animation with direction support
export const slideIn = (direction: 'left' | 'right' | 'up' | 'down' = 'right') => {
  const translations = {
    left: 'translate3d(-100%, 0, 0)',
    right: 'translate3d(100%, 0, 0)',
    up: 'translate3d(0, -100%, 0)',
    down: 'translate3d(0, 100%, 0)'
  };

  return keyframes`
    from {
      transform: ${translations[direction]};
    }
    to {
      transform: translate3d(0, 0, 0);
    }
  `;
};

// Slide out animation with direction support
export const slideOut = (direction: 'left' | 'right' | 'up' | 'down' = 'right') => {
  const translations = {
    left: 'translate3d(-100%, 0, 0)',
    right: 'translate3d(100%, 0, 0)',
    up: 'translate3d(0, -100%, 0)',
    down: 'translate3d(0, 100%, 0)'
  };

  return keyframes`
    from {
      transform: translate3d(0, 0, 0);
    }
    to {
      transform: ${translations[direction]};
    }
  `;
};

// Attention-grabbing pulse animation
export const pulse = keyframes`
  0% {
    transform: scale3d(1, 1, 1);
  }
  50% {
    transform: scale3d(1.05, 1.05, 1.05);
  }
  100% {
    transform: scale3d(1, 1, 1);
  }
`;

/**
 * Creates composable animations with performance optimizations
 * @param keyframeAnimation - Keyframe animation to apply
 * @param options - Animation configuration options
 */
export const createAnimation = (
  keyframeAnimation: ReturnType<typeof keyframes>,
  options: {
    duration?: keyof typeof ANIMATION_DURATION;
    easing?: keyof typeof ANIMATION_EASING;
    delay?: string;
    iterationCount?: number | 'infinite';
    fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
  } = {}
) => {
  const {
    duration = 'standard',
    easing = 'easeInOut',
    delay = '0s',
    iterationCount = 1,
    fillMode = 'both'
  } = options;

  return css`
    will-change: transform, opacity;
    transform-style: preserve-3d;
    backface-visibility: hidden;
    animation: ${keyframeAnimation} ${ANIMATION_DURATION[duration]} ${ANIMATION_EASING[easing]} 
      ${delay} ${iterationCount} ${fillMode};
    ${prefersReducedMotion()}
  `;
};