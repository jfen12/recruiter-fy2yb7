/**
 * @fileoverview Custom React hook for managing global notifications with accessibility and animation support
 * Implements Material Design 3.0 principles and WCAG 2.1 Level AA compliance
 * @version 1.0.0
 */

import { useState, useCallback, useRef, useEffect } from 'react'; // v18.0.0
import create from 'zustand'; // v4.3.0
import { motion, AnimatePresence } from 'framer-motion'; // v10.0.0
import { useTheme } from '@mui/material'; // v5.0.0
import { ApiResponse } from '../interfaces/common.interface';

/**
 * Interface defining a notification item in the queue
 */
interface NotificationItem extends Partial<NotificationState> {
  id: string;
}

/**
 * Interface defining the complete notification state
 */
interface NotificationState {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  position: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  duration: number;
  autoHide: boolean;
  ariaLive: 'polite' | 'assertive';
  role: 'alert' | 'status';
  animationDuration: number;
  autoFocus: boolean;
  queue: NotificationItem[];
}

/**
 * Default notification state with accessibility-first configuration
 */
const DEFAULT_NOTIFICATION_STATE: NotificationState = {
  visible: false,
  message: '',
  type: 'info',
  position: 'top-right',
  duration: 5000,
  autoHide: true,
  ariaLive: 'polite',
  role: 'status',
  animationDuration: 300,
  autoFocus: true,
  queue: [],
};

/**
 * Animation variants for notification transitions
 */
const ANIMATION_VARIANTS = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

/**
 * Creates a Zustand store for managing notification state
 */
const useNotificationStore = create<{
  state: NotificationState;
  setState: (state: Partial<NotificationState>) => void;
}>((set) => ({
  state: DEFAULT_NOTIFICATION_STATE,
  setState: (newState) =>
    set((prev) => ({ state: { ...prev.state, ...newState } })),
}));

/**
 * Custom hook for managing notifications with enhanced accessibility and animation
 * @returns Object containing notification state and control functions
 */
export const useNotification = () => {
  const theme = useTheme();
  const { state, setState } = useNotificationStore();
  const timerRef = useRef<NodeJS.Timeout>();
  const notificationRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  /**
   * Checks for reduced motion preference
   */
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  /**
   * Handles keyboard navigation and accessibility
   */
  useEffect(() => {
    if (state.visible && state.autoFocus && notificationRef.current) {
      notificationRef.current.focus();
    }
  }, [state.visible, state.autoFocus]);

  /**
   * Cleans up any existing timers
   */
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  /**
   * Hides the current notification and processes queue
   */
  const hideNotification = useCallback(() => {
    clearTimer();
    setState({ visible: false });

    // Process queue after current notification is hidden
    setTimeout(() => {
      const [nextNotification, ...remainingQueue] = state.queue;
      if (nextNotification) {
        setState({
          ...nextNotification,
          visible: true,
          queue: remainingQueue,
        });
      }
    }, state.animationDuration);
  }, [clearTimer, setState, state.queue, state.animationDuration]);

  /**
   * Shows a notification with given options
   * @param options Partial notification state to override defaults
   */
  const showNotification = useCallback(
    (options: Partial<NotificationState>) => {
      clearTimer();

      // If a notification is visible, queue the new one
      if (state.visible) {
        setState({
          queue: [
            ...state.queue,
            { ...options, id: Math.random().toString(36).substr(2, 9) },
          ],
        });
        return;
      }

      // Determine appropriate ARIA attributes based on notification type
      const ariaLive =
        options.type === 'error' || options.type === 'warning'
          ? 'assertive'
          : 'polite';
      const role = options.type === 'error' ? 'alert' : 'status';

      // Apply animation duration based on motion preferences
      const animationDuration = prefersReducedMotion ? 0 : options.animationDuration ?? DEFAULT_NOTIFICATION_STATE.animationDuration;

      const newState = {
        ...DEFAULT_NOTIFICATION_STATE,
        ...options,
        visible: true,
        ariaLive,
        role,
        animationDuration,
      };

      setState(newState);

      // Set auto-hide timer if enabled
      if (newState.autoHide && newState.duration > 0) {
        timerRef.current = setTimeout(hideNotification, newState.duration);
      }
    },
    [clearTimer, hideNotification, setState, state.visible, state.queue, prefersReducedMotion]
  );

  /**
   * Shows a notification for API responses
   * @param response API response object
   */
  const showApiNotification = useCallback(
    (response: ApiResponse<any>) => {
      showNotification({
        message: response.message,
        type: response.success ? 'success' : 'error',
        autoHide: response.success,
        duration: response.success ? 3000 : 5000,
      });
    },
    [showNotification]
  );

  return {
    notificationState: state,
    showNotification,
    hideNotification,
    showApiNotification,
    notificationRef,
  };
};

export type { NotificationState };