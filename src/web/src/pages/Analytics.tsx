/**
 * @fileoverview Analytics page component that serves as the container for analytics 
 * and reporting functionality, providing comprehensive recruitment metrics with 
 * real-time updates and role-based access control.
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import { 
  Box, 
  Typography, 
  Alert, 
  CircularProgress 
} from '@mui/material';
import useAuth from '../hooks/useAuth';
import Layout from '../components/layout/Layout';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';
import ErrorBoundary from '../components/common/ErrorBoundary';

// Styled components with Material Design 3.0 principles
const PageContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  width: '100%',
  height: '100%',
  overflowY: 'auto',
  position: 'relative',
  backgroundColor: theme.palette.background.default,
  transition: theme.transitions.create(['background-color'], {
    duration: theme.transitions.duration.standard,
  }),
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  }
}));

const PageTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  fontWeight: 500,
  color: theme.palette.text.primary,
  fontSize: theme.typography.h4.fontSize,
  '@media (max-width: 768px)': {
    fontSize: theme.typography.h5.fontSize,
  }
}));

const LoadingOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  zIndex: theme.zIndex.modal - 1
}));

// Interface for component props
interface AnalyticsPageProps {
  title?: string;
  refreshInterval?: number;
  initialData?: any;
}

/**
 * Analytics page component providing comprehensive recruitment metrics
 * and analytics with real-time updates and role-based access control
 */
const Analytics: React.FC<AnalyticsPageProps> = ({
  title = 'Analytics & Reporting',
  refreshInterval = 30000, // 30 seconds
  initialData
}) => {
  const { user, isAuthenticated, validateSession } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Session validation effect
  useEffect(() => {
    const validateUserSession = async () => {
      try {
        if (isAuthenticated) {
          await validateSession();
        }
      } catch (error) {
        setError(error as Error);
      }
    };
    validateUserSession();
  }, [isAuthenticated, validateSession]);

  // Handle data refresh
  const handleRefresh = useCallback(async () => {
    try {
      setIsLoading(true);
      // Refresh logic will be handled by AnalyticsDashboard component
      setLastRefresh(new Date());
    } catch (error) {
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set up refresh interval
  useEffect(() => {
    const intervalId = setInterval(handleRefresh, refreshInterval);
    return () => clearInterval(intervalId);
  }, [handleRefresh, refreshInterval]);

  // Initial data load
  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  return (
    <ErrorBoundary>
      <Layout>
        <PageContainer>
          <PageTitle variant="h4" component="h1">
            {title}
          </PageTitle>

          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              onClose={() => setError(null)}
            >
              {error.message}
            </Alert>
          )}

          <AnalyticsDashboard
            initialData={initialData}
            lastRefresh={lastRefresh}
            onError={(error) => setError(error)}
          />

          {isLoading && (
            <LoadingOverlay>
              <CircularProgress
                size={40}
                aria-label="Loading analytics data"
              />
            </LoadingOverlay>
          )}

          <Box sx={{ mt: 2, textAlign: 'right' }}>
            <Typography variant="caption" color="textSecondary">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </Typography>
          </Box>
        </PageContainer>
      </Layout>
    </ErrorBoundary>
  );
};

export default Analytics;