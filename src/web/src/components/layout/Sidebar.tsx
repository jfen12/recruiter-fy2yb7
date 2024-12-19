/**
 * @fileoverview Layout-specific sidebar component implementing Material Design 3.0 principles
 * with role-based access control, responsive design, and enhanced accessibility features.
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState, memo } from 'react';
import { styled } from '@mui/material/styles';
import { 
  Drawer, 
  Box, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  Fade 
} from '@mui/material';
import { useTheme, useMediaQuery } from '@mui/material';

// Internal imports
import useAuth from '../../hooks/useAuth';
import Navigation from './Navigation';
import ErrorBoundary from '../common/ErrorBoundary';

// Interface for component props
interface SidebarProps {
  open: boolean;
  onClose: () => void;
  className?: string;
  ariaLabel?: string;
}

// Styled components with Material Design 3.0 principles
const SidebarContainer = styled(Box)(({ theme }) => ({
  width: theme.spacing(32), // 256px following 8px grid
  height: '100%',
  backgroundColor: theme.palette.background.paper,
  borderRight: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  zIndex: theme.zIndex.drawer,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
}));

const MenuList = styled(List)(({ theme }) => ({
  width: '100%',
  padding: theme.spacing(2),
  flexGrow: 1,
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.divider,
    borderRadius: theme.shape.borderRadius,
  },
  // Focus outline for keyboard navigation
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '-2px',
  },
}));

/**
 * Sidebar component implementing navigation menu with role-based access,
 * responsive design, and accessibility features
 */
const Sidebar = memo<SidebarProps>(({
  open,
  onClose,
  className,
  ariaLabel = 'Main navigation sidebar'
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isAuthenticated, user, validateSession } = useAuth();
  const [focusVisible, setFocusVisible] = useState(false);

  // Session validation
  useEffect(() => {
    const validateUserSession = async () => {
      if (isAuthenticated) {
        await validateSession();
      }
    };
    validateUserSession();
  }, [isAuthenticated, validateSession]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && open && isMobile) {
      onClose();
    }
  }, [open, isMobile, onClose]);

  // Focus management for accessibility
  useEffect(() => {
    const handleFocusIn = () => setFocusVisible(true);
    const handleFocusOut = () => setFocusVisible(false);

    document.addEventListener('keydown', handleFocusIn);
    document.addEventListener('mousedown', handleFocusOut);

    return () => {
      document.removeEventListener('keydown', handleFocusIn);
      document.removeEventListener('mousedown', handleFocusOut);
    };
  }, []);

  // Drawer variant based on viewport size
  const drawerVariant = isMobile ? 'temporary' : 'permanent';

  return (
    <ErrorBoundary>
      <Drawer
        variant={drawerVariant}
        open={open}
        onClose={onClose}
        className={className}
        sx={{
          width: theme.spacing(32),
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: theme.spacing(32),
            boxSizing: 'border-box',
          },
        }}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
      >
        <Fade in={open}>
          <SidebarContainer
            role="navigation"
            aria-label={ariaLabel}
            onKeyDown={handleKeyDown}
            tabIndex={focusVisible ? 0 : -1}
          >
            <Navigation
              isMobile={isMobile}
              onMenuToggle={onClose}
              onNavigationError={(error) => {
                console.error('Navigation error:', error);
              }}
            />
            <Divider />
            <MenuList
              aria-label="Additional navigation options"
              role="menu"
            >
              {/* Additional menu items can be added here */}
            </MenuList>
          </SidebarContainer>
        </Fade>
      </Drawer>
    </ErrorBoundary>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;