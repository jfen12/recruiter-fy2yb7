/**
 * @fileoverview Analytics Dashboard component for displaying recruitment metrics and analytics
 * Implements Material Design 3.0 principles with enhanced error handling and real-time updates
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Grid, Paper, Skeleton, Alert, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import debounce from 'lodash/debounce';
import {
  RecruitmentMetrics,
  TimeToHireAnalytics,
  SkillDemand,
  AnalyticsRequest,
  MetricError
} from '../../interfaces/analytics.interface';
import {
  getRecruitmentMetrics,
  getTimeToHireAnalytics,
  getSkillDemandAnalytics,
  refreshMetrics
} from '../../api/analytics';

// Styled components following Material Design 3.0
const DashboardContainer = styled('div')(({ theme }) => ({
  padding: theme.spacing(3),
  width: '100%',
  height: '100%',
  overflowY: 'auto',
  position: 'relative',
  backgroundColor: theme.palette.background.default
}));

const MetricCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  transition: 'box-shadow 0.3s ease-in-out',
  '&:hover': {
    boxShadow: theme.shadows[4]
  }
}));

const ErrorContainer = styled(Alert)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  width: '100%'
}));

// Types for metric loading and error states
type MetricType = 'recruitment' | 'timeToHire' | 'skillDemand';

interface DashboardState {
  recruitmentMetrics: RecruitmentMetrics | null;
  timeToHireAnalytics: TimeToHireAnalytics | null;
  skillDemand: SkillDemand[] | null;
  loadingStates: Record<MetricType, boolean>;
  errors: Record<MetricType, MetricError | null>;
  lastRefresh: Date;
}

/**
 * Analytics Dashboard component displaying recruitment performance metrics
 * with real-time updates and error handling
 */
const AnalyticsDashboard: React.FC = () => {
  // State management
  const [state, setState] = useState<DashboardState>({
    recruitmentMetrics: null,
    timeToHireAnalytics: null,
    skillDemand: null,
    loadingStates: {
      recruitment: true,
      timeToHire: true,
      skillDemand: true
    },
    errors: {
      recruitment: null,
      timeToHire: null,
      skillDemand: null
    },
    lastRefresh: new Date()
  });

  // Refs for cleanup and optimization
  const refreshInterval = useRef<NodeJS.Timeout>();
  const mounted = useRef(true);

  /**
   * Fetches all dashboard data with error handling and caching
   */
  const fetchDashboardData = useCallback(async (forceRefresh: boolean = false) => {
    if (!mounted.current) return;

    const request: AnalyticsRequest = {
      dateRange: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate: new Date()
      },
      filters: {},
      aggregationLevel: 'daily',
      metrics: ['recruitment', 'timeToHire', 'skillDemand']
    };

    try {
      setState(prev => ({
        ...prev,
        loadingStates: { ...prev.loadingStates, recruitment: true }
      }));

      const [recruitmentData, timeToHireData, skillDemandData] = await Promise.all([
        getRecruitmentMetrics(request),
        getTimeToHireAnalytics(request),
        getSkillDemandAnalytics(request)
      ]);

      if (mounted.current) {
        setState(prev => ({
          ...prev,
          recruitmentMetrics: recruitmentData,
          timeToHireAnalytics: timeToHireData,
          skillDemand: [skillDemandData],
          loadingStates: {
            recruitment: false,
            timeToHire: false,
            skillDemand: false
          },
          errors: {
            recruitment: null,
            timeToHire: null,
            skillDemand: null
          },
          lastRefresh: new Date()
        }));
      }
    } catch (error) {
      if (mounted.current) {
        setState(prev => ({
          ...prev,
          loadingStates: {
            recruitment: false,
            timeToHire: false,
            skillDemand: false
          },
          errors: {
            ...prev.errors,
            recruitment: error as MetricError
          }
        }));
      }
    }
  }, []);

  /**
   * Handles retry attempts for failed metric fetches
   */
  const handleRetry = useCallback(async (metricType: MetricType) => {
    setState(prev => ({
      ...prev,
      loadingStates: { ...prev.loadingStates, [metricType]: true },
      errors: { ...prev.errors, [metricType]: null }
    }));

    await fetchDashboardData(true);
  }, [fetchDashboardData]);

  // Debounced refresh function to prevent excessive API calls
  const debouncedRefresh = useCallback(
    debounce(() => fetchDashboardData(true), 500),
    [fetchDashboardData]
  );

  // Initialize data fetching and refresh interval
  useEffect(() => {
    fetchDashboardData();

    refreshInterval.current = setInterval(() => {
      fetchDashboardData(true);
    }, 300000); // Refresh every 5 minutes

    return () => {
      mounted.current = false;
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [fetchDashboardData]);

  // Render error states if present
  const renderErrors = () => {
    return Object.entries(state.errors).map(([key, error]) => {
      if (!error) return null;
      return (
        <ErrorContainer
          key={key}
          severity="error"
          action={
            <button onClick={() => handleRetry(key as MetricType)}>
              Retry
            </button>
          }
        >
          {error.message}
        </ErrorContainer>
      );
    });
  };

  return (
    <DashboardContainer>
      {renderErrors()}
      
      <Grid container spacing={3}>
        {/* Recruitment Metrics Card */}
        <Grid item xs={12} md={4}>
          <MetricCard>
            {state.loadingStates.recruitment ? (
              <Skeleton variant="rectangular" height={200} />
            ) : (
              <Tooltip title="Recruitment performance metrics for the last 30 days">
                <div>
                  <h3>Recruitment Metrics</h3>
                  {state.recruitmentMetrics && (
                    <>
                      <div>Total Requisitions: {state.recruitmentMetrics.totalRequisitions}</div>
                      <div>Fill Rate: {state.recruitmentMetrics.requisitionFillRate}%</div>
                      <div>Avg Time to Hire: {state.recruitmentMetrics.averageTimeToHire} days</div>
                    </>
                  )}
                </div>
              </Tooltip>
            )}
          </MetricCard>
        </Grid>

        {/* Time to Hire Analytics Card */}
        <Grid item xs={12} md={4}>
          <MetricCard>
            {state.loadingStates.timeToHire ? (
              <Skeleton variant="rectangular" height={200} />
            ) : (
              <Tooltip title="Time to hire trends and analysis">
                <div>
                  <h3>Time to Hire Analytics</h3>
                  {state.timeToHireAnalytics && (
                    <>
                      <div>Average: {state.timeToHireAnalytics.averageDays} days</div>
                      <div>Median: {state.timeToHireAnalytics.medianDays} days</div>
                      <div>90th Percentile: {state.timeToHireAnalytics.percentileData.p90} days</div>
                    </>
                  )}
                </div>
              </Tooltip>
            )}
          </MetricCard>
        </Grid>

        {/* Skill Demand Card */}
        <Grid item xs={12} md={4}>
          <MetricCard>
            {state.loadingStates.skillDemand ? (
              <Skeleton variant="rectangular" height={200} />
            ) : (
              <Tooltip title="Current skill demand and market trends">
                <div>
                  <h3>Skill Demand Analysis</h3>
                  {state.skillDemand?.[0] && (
                    <>
                      <div>Top Skill: {state.skillDemand[0].skillName}</div>
                      <div>Demand Count: {state.skillDemand[0].demandCount}</div>
                      <div>Growth Rate: {state.skillDemand[0].growthRate}%</div>
                    </>
                  )}
                </div>
              </Tooltip>
            )}
          </MetricCard>
        </Grid>
      </Grid>

      <div style={{ textAlign: 'right', marginTop: '16px' }}>
        Last updated: {state.lastRefresh.toLocaleTimeString()}
      </div>
    </DashboardContainer>
  );
};

export default AnalyticsDashboard;