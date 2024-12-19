import React, { useCallback, useEffect, useRef } from 'react';
import { Modal as MuiModal, Fade, useMediaQuery } from '@mui/material'; // v5.0.0
import { styled } from '@mui/material/styles'; // v5.0.0
import useTheme from '../../hooks/useTheme';
import { UI_CONSTANTS } from '../../config/constants';

// Interface for Modal component props
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | false;
  fullWidth?: boolean;
  disableBackdropClick?: boolean;
  disableEscapeKeyDown?: boolean;
}

// Styled components with theme-aware styling
const StyledModalContainer = styled('div')(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[UI_CONSTANTS.ELEVATION.MODAL],
  padding: theme.spacing(3),
  outline: 'none',
  maxHeight: `calc(100vh - ${theme.spacing(8)})`,
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  scrollbarColor: `${theme.palette.primary.main} transparent`,
  
  // Responsive width handling
  width: (props: { maxWidth?: ModalProps['maxWidth'] }) => {
    if (!props.maxWidth) return 'auto';
    const breakpoint = theme.breakpoints.values[props.maxWidth];
    return `min(${breakpoint}px, calc(100% - ${theme.spacing(4)}))`
  },

  // Smooth transitions
  transition: theme.transitions.create(['transform', 'opacity'], {
    duration: theme.transitions.duration.enteringScreen,
    easing: theme.transitions.easing.easeOut,
  }),

  // Accessibility focus styles
  '&:focus-visible': {
    outline: `${UI_CONSTANTS.ACCESSIBILITY.KEYBOARD_FOCUS_WIDTH}px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },

  // Reduced motion preference
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },

  // Mobile responsiveness
  [theme.breakpoints.down('sm')]: {
    width: `calc(100% - ${theme.spacing(4)})`,
    maxHeight: `calc(100vh - ${theme.spacing(16)})`,
    padding: theme.spacing(2),
  },
}));

const StyledTitle = styled('h2')(({ theme }) => ({
  margin: 0,
  marginBottom: theme.spacing(2),
  color: theme.palette.text.primary,
  ...theme.typography.h6,
}));

/**
 * Modal component implementing Material Design 3.0 principles with accessibility features
 * and responsive behavior
 */
const Modal = React.memo<ModalProps>(({
  open,
  onClose,
  title,
  children,
  maxWidth = 'sm',
  fullWidth = false,
  disableBackdropClick = false,
  disableEscapeKeyDown = false,
}) => {
  const { theme } = useTheme();
  const modalRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Handle click outside
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (disableBackdropClick || event.target !== event.currentTarget) return;
    onClose();
  }, [disableBackdropClick, onClose]);

  // Focus trap implementation
  useEffect(() => {
    if (!open || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    modalRef.current.addEventListener('keydown', handleTabKey);
    firstFocusable?.focus();

    return () => {
      modalRef.current?.removeEventListener('keydown', handleTabKey);
    };
  }, [open]);

  return (
    <MuiModal
      open={open}
      onClose={onClose}
      closeAfterTransition
      disableEscapeKeyDown={disableEscapeKeyDown}
      aria-labelledby="modal-title"
      aria-modal="true"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Fade in={open} timeout={theme.transitions.duration.enteringScreen}>
        <StyledModalContainer
          ref={modalRef}
          onClick={handleBackdropClick}
          maxWidth={maxWidth}
          role="dialog"
          aria-labelledby="modal-title"
          tabIndex={-1}
          style={{ width: fullWidth ? '100%' : undefined }}
        >
          <StyledTitle id="modal-title">
            {title}
          </StyledTitle>
          {children}
        </StyledModalContainer>
      </Fade>
    </MuiModal>
  );
});

Modal.displayName = 'Modal';

export default Modal;
```

This implementation:

1. Follows Material Design 3.0 principles with proper elevation, spacing, and transitions.

2. Implements comprehensive accessibility features:
   - ARIA attributes for screen readers
   - Keyboard focus trap
   - Focus visible indicators
   - Proper heading structure
   - Reduced motion support

3. Provides responsive behavior:
   - Mobile-first approach
   - Flexible width handling
   - Proper spacing adjustments
   - Touch-friendly interactions

4. Includes theme support:
   - Theme-aware styling
   - Dark/light mode compatibility
   - Consistent elevation shadows
   - Proper color contrast

5. Implements performance optimizations:
   - React.memo for preventing unnecessary re-renders
   - Proper cleanup in useEffect
   - Optimized event handlers
   - Efficient styled-components usage

6. Provides extensive customization options:
   - Multiple size options
   - Full-width support
   - Backdrop click handling
   - Escape key handling

The component can be used as follows:

```typescript
<Modal
  open={isOpen}
  onClose={handleClose}
  title="Modal Title"
  maxWidth="md"
  fullWidth
>
  <div>Modal content goes here</div>
</Modal>