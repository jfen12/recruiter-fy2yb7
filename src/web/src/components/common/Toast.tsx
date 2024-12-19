/**
 * @fileoverview Enhanced Toast notification component with accessibility support
 * Implements Material Design 3.0 principles and WCAG 2.1 Level AA compliance
 * @version 1.0.0
 */

import React from 'react'; // v18.0.0
import { styled } from '@mui/material/styles'; // v5.0.0
import { Snackbar, Alert, useTheme } from '@mui/material'; // v5.0.0
import { motion, AnimatePresence } from 'framer-motion'; // v6.0.0
import {
  useNotification,
  NotificationState,
} from '../../hooks/useNotification';

/**
 * Props interface for the Toast component
 */
interface ToastProps {
  className?: string;
  ariaRole?: string;
  autoHideDuration?: number;
}

/**
 * Styled Alert component with enhanced accessibility and Material Design 3.0
 */
const StyledAlert = styled(Alert)(({ theme }) => ({
  borderRadius: '8px',
  padding: '12px 24px',
  alignItems: 'center',
  gap: '12px',
  boxShadow: theme.shadows[3],
  fontSize: '14px',
  lineHeight: 1.5,
  color: theme.palette.text.primary,
  backgroundColor: theme.palette.background.paper,
  
  // Enhanced focus styles for accessibility
  '&:focus': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },

  // High contrast mode support
  '@media (forced-colors: active)': {
    borderColor: 'CanvasText',
  },

  // Ensure sufficient color contrast for WCAG 2.1
  '& .MuiAlert-icon': {
    color: 'inherit',
    opacity: 0.9,
  },

  // Enhanced touch target size
  '& .MuiAlert-action': {
    padding: '8px',
    marginRight: '-8px',
  },
}));

/**
 * Styled Snackbar component with accessibility improvements
 */
const StyledSnackbar = styled(Snackbar)(({ theme }) => ({
  margin: '8px',
  maxWidth: 'calc(100% - 16px)',
  minWidth: '288px',

  // Respect reduced motion preferences
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },

  // Ensure proper spacing on mobile
  [theme.breakpoints.down('sm')]: {
    width: '100%',
    maxWidth: '100%',
    margin: '0',
    bottom: '0',
    left: '0',
    right: '0',
  },
}));

/**
 * Animation variants for toast notifications
 */
const ANIMATION_VARIANTS = {
  initial: { opacity: 0, y: 50 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0, 
    y: 50,
    transition: { duration: 0.2 }
  },
};

/**
 * ARIA live region mappings for different notification types
 */
const ARIA_LIVE_REGIONS = {
  success: 'polite' as const,
  error: 'assertive' as const,
  warning: 'polite' as const,
  info: 'polite' as const,
};

/**
 * Enhanced Toast component with accessibility support
 */
const Toast: React.FC<ToastProps> = React.memo(({
  className,
  ariaRole,
  autoHideDuration,
}) => {
  const theme = useTheme();
  const {
    notificationState,
    hideNotification,
    notificationRef,
  } = useNotification();

  /**
   * Enhanced close handler with accessibility support
   */
  const handleClose = React.useCallback(
    (event?: React.SyntheticEvent | Event, reason?: string) => {
      if (reason === 'clickaway') return;

      // Ensure proper focus management
      if (notificationRef.current) {
        const focusTarget = document.activeElement;
        hideNotification();
        if (focusTarget instanceof HTMLElement) {
          setTimeout(() => focusTarget.focus(), 100);
        }
      } else {
        hideNotification();
      }
    },
    [hideNotification, notificationRef]
  );

  /**
   * Keyboard event handler for accessibility
   */
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    },
    [handleClose]
  );

  return (
    <AnimatePresence mode="wait">
      {notificationState.visible && (
        <StyledSnackbar
          open={notificationState.visible}
          autoHideDuration={autoHideDuration || notificationState.duration}
          onClose={handleClose}
          anchorOrigin={{
            vertical: notificationState.position.includes('top') ? 'top' : 'bottom',
            horizontal: notificationState.position.includes('right') ? 'right' : 'left',
          }}
          className={className}
        >
          <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={ANIMATION_VARIANTS}
          >
            <StyledAlert
              ref={notificationRef}
              severity={notificationState.type}
              onClose={handleClose}
              role={ariaRole || notificationState.role}
              aria-live={ARIA_LIVE_REGIONS[notificationState.type]}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              elevation={6}
              variant="filled"
              sx={{
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              {notificationState.message}
            </StyledAlert>
          </motion.div>
        </StyledSnackbar>
      )}
    </AnimatePresence>
  );
});

Toast.displayName = 'Toast';

export default Toast;