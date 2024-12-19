/**
 * @fileoverview Main layout component that provides the application shell structure
 * following Material Design 3.0 principles with enhanced security, accessibility,
 * and performance optimizations.
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect, memo } from 'react';
import { styled } from '@mui/material/styles';
import { Box, Container, useTheme, useMediaQuery } from '@mui/material';

// Internal imports
import Header from './Header';
import Footer from './Footer';
import Navigation from './Navigation';
import Sidebar from './Sidebar';
import useAuth from '../../hooks/useAuth';

// Constants
const SIDEBAR_WIDTH = 240;
const TRANSITION_DURATION = 225;

// Styled components with Material Design 3.0 principles
const LayoutContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  transition: theme.transitions.create(['background-color'], {
    duration: TRANSITION_DURATION,
    easing: theme.transitions.easing.easeInOut,
  }),
  touchAction: 'manipulation',
  position: 'relative',
  zIndex: theme.zIndex.layout,
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
}));

const MainContent = styled(Container, {
  shouldForwardProp: (prop) => prop !== 'isSidebarOpen',
})<{ isSidebarOpen?: boolean }>(({ theme, isSidebarOpen }) => ({
  flexGrow: 1,
  paddingTop: theme.spacing(8),
  paddingBottom: theme.spacing(3),
  marginLeft: isSidebarOpen ? `${SIDEBAR_WIDTH}px` : 0,
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: TRANSITION_DURATION,
  }),
  outline: 'none', // Will be visible only on focus
  position: 'relative',
  [theme.breakpoints.down('sm')]: {
    paddingTop: theme.spacing(6),
    marginLeft: 0,
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
}));

// Props interface with accessibility support
interface LayoutProps {
  children: React.ReactNode;
  role?: string;
  className?: string;
}

/**
 * Main layout component that provides the application shell structure
 * with enhanced security, accessibility, and performance features
 */
const Layout: React.FC<LayoutProps> = memo(({
  children,
  role = 'main',
  className,
}) => {
  // Hooks
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isAuthenticated, validateSession, userRole } = useAuth();
  
  // State
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [isNavigating, setIsNavigating] = useState(false);

  // Session validation on mount and auth state change
  useEffect(() => {
    const validateUserSession = async () => {
      if (isAuthenticated) {
        await validateSession();
      }
    };
    validateUserSession();
  }, [isAuthenticated, validateSession]);

  // Handle sidebar toggle
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && sidebarOpen && isMobile) {
      setSidebarOpen(false);
    }
  }, [sidebarOpen, isMobile]);

  // Add keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <LayoutContainer className={className}>
      {/* Skip navigation link for accessibility */}
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          left: '-999px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          '&:focus': {
            left: theme.spacing(2),
            top: theme.spacing(2),
            width: 'auto',
            height: 'auto',
            padding: theme.spacing(2),
            backgroundColor: theme.palette.background.paper,
            zIndex: theme.zIndex.tooltip,
          },
        }}
      >
        Skip to main content
      </Box>

      {/* Header */}
      <Header
        onMenuClick={handleSidebarToggle}
        elevation={isNavigating ? 4 : 0}
      />

      {/* Sidebar - Only render when authenticated */}
      {isAuthenticated && (
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          aria-label="Main navigation sidebar"
        />
      )}

      {/* Main content */}
      <MainContent
        id="main-content"
        role={role}
        isSidebarOpen={sidebarOpen && !isMobile}
        maxWidth={false}
        tabIndex={-1}
        component="main"
        aria-label="Main content"
      >
        {children}
      </MainContent>

      {/* Footer */}
      <Footer />
    </LayoutContainer>
  );
});

Layout.displayName = 'Layout';

export default Layout;