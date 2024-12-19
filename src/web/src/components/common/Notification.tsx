/**
 * @fileoverview A reusable notification component that displays toast messages and alerts
 * following Material Design 3.0 principles and WCAG 2.1 Level AA accessibility compliance.
 * @version 1.0.0
 */

import React, { useEffect, useRef } from 'react'; // v18.0.0
import { Snackbar, Alert, AlertTitle } from '@mui/material'; // v5.0.0
import { styled } from '@mui/material/styles'; // v5.0.0
import { motion, AnimatePresence } from 'framer-motion'; // v6.0.0
import { useNotification } from '../../hooks/useNotification';

/**
 * Props interface for the Notification component
 */
interface NotificationProps {
  className?: string;
  autoHideDuration?: number;
  disableAutoHide?: boolean;
  onClose?: () => void;
}

/**
 * Animation variants for notifications with motion support
 */
const ANIMATION_VARIANTS = {
  initial: {
    opacity: 0,
    y: -20,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: {
      duration: 0.15,
      ease: 'easeIn',
    },
  },
};

/**
 * Reduced motion variants for users who prefer reduced motion
 */
const REDUCED_MOTION_VARIANTS = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Styled Snackbar component with accessibility enhancements
 */
const StyledSnackbar = styled(Snackbar)(({ theme }) => ({
  zIndex: theme.zIndex.snackbar,
  margin: theme.spacing(1),
  maxWidth: 600,
  minWidth: 300,
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
}));

/**
 * Styled Alert component with Material Design 3.0 styling
 */
const StyledAlert = styled(Alert)(({ theme }) => ({
  width: '100%',
  boxShadow: theme.shadows[3],
  borderRadius: theme.shape.borderRadius,
  ...theme.typography.body2,
  '& .MuiAlert-message': {
    width: '100%',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
}));

/**
 * Maps notification type to Material UI Alert severity
 * @param type - The notification type
 * @returns The corresponding Material UI severity
 */
const getAlertSeverity = (type: string): 'success' | 'error' | 'warning' | 'info' => {
  const severityMap: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info',
  };
  return severityMap[type] || 'info';
};

/**
 * Notification component that displays toast messages and alerts with accessibility support
 */
const Notification: React.FC<NotificationProps> = ({
  className,
  autoHideDuration,
  disableAutoHide = false,
  onClose,
}) => {
  const {
    notificationState,
    hideNotification,
    notificationRef,
  } = useNotification();

  const alertRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Handle notification close events
  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    
    hideNotification();
    onClose?.();
  };

  // Focus management for accessibility
  useEffect(() => {
    if (notificationState.visible && alertRef.current) {
      alertRef.current.focus();
    }
  }, [notificationState.visible]);

  // Determine ARIA attributes based on notification type
  const ariaLive = notificationState.type === 'error' ? 'assertive' : 'polite';
  const role = notificationState.type === 'error' ? 'alert' : 'status';

  return (
    <AnimatePresence mode="wait">
      {notificationState.visible && (
        <motion.div
          initial="initial"
          animate="animate"
          exit="exit"
          variants={prefersReducedMotion ? REDUCED_MOTION_VARIANTS : ANIMATION_VARIANTS}
        >
          <StyledSnackbar
            ref={notificationRef}
            open={notificationState.visible}
            className={className}
            anchorOrigin={{
              vertical: notificationState.position.split('-')[0] as 'top' | 'bottom',
              horizontal: notificationState.position.split('-')[1] as 'left' | 'right' | 'center',
            }}
            autoHideDuration={disableAutoHide ? null : (autoHideDuration || notificationState.duration)}
            onClose={handleClose}
          >
            <StyledAlert
              ref={alertRef}
              severity={getAlertSeverity(notificationState.type)}
              onClose={handleClose}
              role={role}
              aria-live={ariaLive}
              tabIndex={0}
              elevation={6}
            >
              {notificationState.type === 'error' && (
                <AlertTitle>Error</AlertTitle>
              )}
              {notificationState.message}
            </StyledAlert>
          </StyledSnackbar>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Notification;