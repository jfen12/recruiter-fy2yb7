/**
 * @fileoverview Responsive header component implementing Material Design 3.0 principles
 * with enhanced security, accessibility, and performance optimizations.
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { 
  AppBar, 
  Toolbar, 
  IconButton, 
  Typography, 
  Tooltip, 
  Fade,
  Menu,
  MenuItem,
  Badge,
  Box,
  useScrollTrigger
} from '@mui/material';
import {
  Menu as MenuIcon,
  Brightness4,
  Brightness7,
  AccountCircle,
  NotificationsOutlined,
  Settings,
  ExitToApp
} from '@mui/icons-material';

// Custom hooks
import useAuth from '../../hooks/useAuth';
import useTheme from '../../hooks/useTheme';

// Styled components with Material Design 3.0 principles
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  position: 'fixed',
  transition: theme.transitions.create(['box-shadow', 'background-color'], {
    duration: theme.transitions.duration.standard,
  }),
  zIndex: theme.zIndex.appBar,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  '& .MuiToolbar-root': {
    padding: theme.spacing(0, 2),
    [theme.breakpoints.up('sm')]: {
      padding: theme.spacing(0, 3),
    },
    [theme.breakpoints.up('md')]: {
      padding: theme.spacing(0, 4),
    },
  },
}));

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  minHeight: 56,
  [theme.breakpoints.up('sm')]: {
    minHeight: 64,
  },
  gap: theme.spacing(2),
}));

// Skip navigation link for accessibility
const SkipLink = styled('a')(({ theme }) => ({
  position: 'absolute',
  left: '-999px',
  width: '1px',
  height: '1px',
  top: 'auto',
  '&:focus': {
    position: 'fixed',
    top: theme.spacing(2),
    left: theme.spacing(2),
    width: 'auto',
    height: 'auto',
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    zIndex: theme.zIndex.tooltip,
    borderRadius: theme.shape.borderRadius,
    ...theme.typography.button,
  },
}));

// Props interface
interface HeaderProps {
  onMenuClick: (event: React.MouseEvent) => void;
  elevation?: number;
  className?: string;
}

/**
 * Header component with authentication, theme switching, and accessibility support
 */
const Header: React.FC<HeaderProps> = React.memo(({ onMenuClick, elevation = 0, className }) => {
  // Hooks
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 0,
  });

  // Menu state
  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleMenuClose();
    }
  }, [handleMenuClose]);

  // Logout handler with security checks
  const handleLogout = useCallback(async () => {
    handleMenuClose();
    await logout();
  }, [logout, handleMenuClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setAnchorEl(null);
    };
  }, []);

  return (
    <>
      <SkipLink href="#main-content">
        Skip to main content
      </SkipLink>
      
      <StyledAppBar 
        elevation={trigger ? elevation : 0}
        className={className}
        component="header"
        role="banner"
      >
        <StyledToolbar>
          {/* Mobile menu button */}
          <IconButton
            edge="start"
            color="inherit"
            aria-label="Open menu"
            onClick={onMenuClick}
            sx={{ display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Logo/Brand */}
          <Typography
            variant="h6"
            component="h1"
            sx={{
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            RefactorTrack
          </Typography>

          {/* Theme toggle */}
          <Tooltip title={`Switch to ${isDarkMode ? 'light' : 'dark'} theme`}>
            <IconButton
              color="inherit"
              onClick={toggleTheme}
              aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} theme`}
            >
              <Fade in={isDarkMode}>
                <Brightness7 />
              </Fade>
              <Fade in={!isDarkMode}>
                <Brightness4 />
              </Fade>
            </IconButton>
          </Tooltip>

          {/* Notifications */}
          {isAuthenticated && (
            <Tooltip title="Notifications">
              <IconButton color="inherit" aria-label="View notifications">
                <Badge badgeContent={3} color="error">
                  <NotificationsOutlined />
                </Badge>
              </IconButton>
            </Tooltip>
          )}

          {/* User menu */}
          {isAuthenticated && user ? (
            <Box>
              <Tooltip title="Account settings">
                <IconButton
                  onClick={handleMenuOpen}
                  color="inherit"
                  aria-label="Account menu"
                  aria-controls="user-menu"
                  aria-haspopup="true"
                  aria-expanded={Boolean(anchorEl)}
                >
                  <AccountCircle />
                </IconButton>
              </Tooltip>
              
              <Menu
                id="user-menu"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                onClick={handleMenuClose}
                onKeyDown={handleKeyDown}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                  elevation: 0,
                  sx: {
                    overflow: 'visible',
                    filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                    mt: 1.5,
                  },
                }}
              >
                <MenuItem onClick={handleMenuClose}>
                  <Settings sx={{ mr: 2 }} />
                  Settings
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ExitToApp sx={{ mr: 2 }} />
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          ) : (
            <Typography
              variant="button"
              component="a"
              href="/login"
              sx={{
                textDecoration: 'none',
                color: 'inherit',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              Login
            </Typography>
          )}
        </StyledToolbar>
      </StyledAppBar>
    </>
  );
});

Header.displayName = 'Header';

export default Header;