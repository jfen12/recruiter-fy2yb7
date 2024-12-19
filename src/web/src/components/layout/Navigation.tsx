import React, { useCallback, useEffect, useState, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // v6.0.0
import styled from '@mui/material/styles/styled'; // v5.0.0
import { 
  AppBar, 
  Toolbar, 
  IconButton, 
  Drawer, 
  useMediaQuery,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography
} from '@mui/material'; // v5.0.0

// Internal imports
import Button from '../common/Button';
import { PUBLIC_ROUTES } from '../../config/routes';
import useAuth from '../../hooks/useAuth';
import { UserRole } from '../../interfaces/auth.interface';
import { flexLayout, elevation } from '../../styles/mixins';

// Styled components with Material Design 3.0 principles
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  ...elevation(4, theme.palette.mode === 'dark'),
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
}));

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  width: 280,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: 280,
    boxSizing: 'border-box',
    backgroundColor: theme.palette.background.paper,
    ...elevation(2, theme.palette.mode === 'dark'),
  },
}));

const NavList = styled(List)(({ theme }) => ({
  padding: theme.spacing(2),
  '& .MuiListItem-root': {
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1),
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    '&.active': {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      ...elevation(1, theme.palette.mode === 'dark'),
    },
  },
}));

const Logo = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '1.5rem',
  color: theme.palette.primary.main,
  marginRight: theme.spacing(4),
}));

// Navigation items with role-based access control
const NAVIGATION_ITEMS = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'DashboardIcon',
    roles: [UserRole.RECRUITER, UserRole.SALES_REP, UserRole.ADMIN, UserRole.MANAGER],
    ariaLabel: 'Navigate to dashboard'
  },
  {
    label: 'Candidates',
    path: '/candidates',
    icon: 'PeopleIcon',
    roles: [UserRole.RECRUITER, UserRole.ADMIN],
    ariaLabel: 'Navigate to candidates'
  },
  {
    label: 'Requisitions',
    path: '/requisitions',
    icon: 'WorkIcon',
    roles: [UserRole.RECRUITER, UserRole.SALES_REP, UserRole.ADMIN],
    ariaLabel: 'Navigate to requisitions'
  },
  {
    label: 'Analytics',
    path: '/analytics',
    icon: 'AnalyticsIcon',
    roles: [UserRole.ADMIN, UserRole.MANAGER],
    ariaLabel: 'Navigate to analytics'
  }
];

interface NavigationProps {
  isMobile: boolean;
  onMenuToggle: () => void;
  highContrast: boolean;
}

const Navigation = memo<NavigationProps>(({ 
  isMobile, 
  onMenuToggle, 
  highContrast 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Filter navigation items based on user role
  const filteredNavItems = NAVIGATION_ITEMS.filter(item => {
    if (!user?.role) return false;
    return item.roles.includes(user.role);
  });

  // Handle navigation with security logging
  const handleNavigation = useCallback((path: string) => {
    if (PUBLIC_ROUTES.includes(path) || !isAuthenticated) {
      navigate(path);
      return;
    }

    // Log navigation event
    console.info('Navigation event:', {
      path,
      userId: user?.id,
      timestamp: new Date().toISOString()
    });

    navigate(path);
    if (isMobile) {
      setDrawerOpen(false);
    }
  }, [navigate, isAuthenticated, user, isMobile]);

  // Handle drawer toggle with ARIA announcements
  const handleDrawerToggle = useCallback(() => {
    setDrawerOpen(prev => !prev);
    onMenuToggle();
  }, [onMenuToggle]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && drawerOpen && isMobile) {
        handleDrawerToggle();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [drawerOpen, isMobile, handleDrawerToggle]);

  const navigationContent = (
    <NavList role="navigation" aria-label="Main navigation">
      {filteredNavItems.map((item) => (
        <ListItem
          key={item.path}
          button
          onClick={() => handleNavigation(item.path)}
          className={location.pathname === item.path ? 'active' : ''}
          aria-current={location.pathname === item.path ? 'page' : undefined}
          aria-label={item.ariaLabel}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            {/* Icon component would be rendered here */}
          </ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItem>
      ))}
    </NavList>
  );

  return (
    <>
      <StyledAppBar position="fixed">
        <Toolbar>
          {isAuthenticated && (
            <IconButton
              color="inherit"
              aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              {/* Menu icon would be rendered here */}
            </IconButton>
          )}
          
          <Logo variant="h1">RefactorTrack</Logo>

          {isAuthenticated && (
            <Box sx={{ ml: 'auto' }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={logout}
                aria-label="Sign out"
                size="small"
              >
                Sign Out
              </Button>
            </Box>
          )}
        </Toolbar>
      </StyledAppBar>

      {isAuthenticated && (
        <StyledDrawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={drawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 280,
            },
          }}
        >
          {navigationContent}
        </StyledDrawer>
      )}
    </>
  );
});

Navigation.displayName = 'Navigation';

export default Navigation;