/**
 * @fileoverview Main dashboard page component implementing Material Design 3.0 principles
 * with enhanced accessibility, real-time updates, and comprehensive error handling
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { styled } from '@mui/material/styles';
import { 
  useMediaQuery, 
  Box, 
  Grid, 
  AppBar, 
  Toolbar, 
  IconButton, 
  Typography, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Skeleton, 
  Alert 
} from '@mui/material';
import ErrorBoundary from '../components/common/ErrorBoundary';
import Card from '../components/common/Card';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';
import useAuth from '../hooks/useAuth';
import useTheme from '../hooks/useTheme';

// Interface for dashboard state management
interface DashboardState {
  loading: Record<string, boolean>;
  error: Record<string, Error | null>;
  lastRefresh: Date;
  offlineMode: boolean;
  metrics: {
    totalRequisitions: number;
    activeRequisitions: number;
    pendingSubmissions: number;
    timeToHire: number;
  };
}

// Styled components with Material Design 3.0 principles
const DashboardContainer = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  height: '100vh',
  overflow: 'hidden',
  position: 'relative',
  backgroundColor: theme.palette.background.default,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
  '@media print': {
    backgroundColor: 'white',
  },
}));

const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  marginTop: theme.spacing(8),
  overflow: 'auto',
  minHeight: '100vh',
}));

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
}));

/**
 * Main dashboard page component with enhanced error handling and accessibility
 */
const Dashboard: React.FC = () => {
  // Hooks for authentication and theme
  const { user, permissions } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  // State management
  const [state, setState] = useState<DashboardState>({
    loading: {
      metrics: true,
      analytics: true,
    },
    error: {},
    lastRefresh: new Date(),
    offlineMode: !navigator.onLine,
    metrics: {
      totalRequisitions: 0,
      activeRequisitions: 0,
      pendingSubmissions: 0,
      timeToHire: 0,
    },
  });

  // Refs for WebSocket and intervals
  const wsRef = useRef<WebSocket | null>(null);
  const refreshInterval = useRef<NodeJS.Timeout>();

  // Media queries for responsive design
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  /**
   * Initializes WebSocket connection for real-time updates
   */
  const initializeWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(process.env.REACT_APP_WS_URL || '');
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setState(prev => ({
          ...prev,
          metrics: { ...prev.metrics, ...data },
          lastRefresh: new Date(),
        }));
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setState(prev => ({
        ...prev,
        error: { ...prev.error, websocket: new Error('Real-time updates unavailable') },
      }));
    };

    wsRef.current = ws;
  }, []);

  /**
   * Handles offline mode and service worker registration
   */
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('ServiceWorker registered:', registration);
        })
        .catch(error => {
          console.error('ServiceWorker registration failed:', error);
        });
    }

    const handleOnline = () => setState(prev => ({ ...prev, offlineMode: false }));
    const handleOffline = () => setState(prev => ({ ...prev, offlineMode: true }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Sets up real-time updates and periodic refresh
   */
  useEffect(() => {
    initializeWebSocket();
    refreshInterval.current = setInterval(() => {
      setState(prev => ({ ...prev, lastRefresh: new Date() }));
    }, 30000); // Refresh every 30 seconds

    return () => {
      wsRef.current?.close();
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [initializeWebSocket]);

  return (
    <ErrorBoundary>
      <DashboardContainer>
        <StyledAppBar position="fixed">
          <Toolbar>
            <Typography variant="h6" noWrap component="h1">
              RefactorTrack Dashboard
            </Typography>
            {state.offlineMode && (
              <Alert severity="warning" sx={{ ml: 2 }}>
                Offline Mode - Limited functionality available
              </Alert>
            )}
          </Toolbar>
        </StyledAppBar>

        <MainContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <AnalyticsDashboard />
            </Grid>

            {/* Additional dashboard content */}
            {Object.entries(state.metrics).map(([key, value]) => (
              <Grid item xs={12} sm={6} md={3} key={key}>
                <Card
                  elevation={2}
                  padding={16}
                  ariaLabel={`${key} metric card`}
                  highContrastMode={theme.palette.mode === 'dark'}
                >
                  {state.loading.metrics ? (
                    <Skeleton variant="rectangular" height={100} />
                  ) : (
                    <>
                      <Typography variant="h6" component="h2">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Typography>
                      <Typography variant="h4" component="p">
                        {value}
                      </Typography>
                    </>
                  )}
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 2, textAlign: 'right' }}>
            <Typography variant="caption" color="textSecondary">
              Last updated: {state.lastRefresh.toLocaleTimeString()}
            </Typography>
          </Box>
        </MainContent>
      </DashboardContainer>
    </ErrorBoundary>
  );
};

export default Dashboard;