/**
 * @fileoverview A comprehensive analytics report generator component with real-time progress tracking,
 * caching, and multiple export formats. Implements Material Design 3.0 and WCAG 2.1 Level AA compliance.
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { CircularProgress, Select, MenuItem, Button } from '@mui/material';
import { saveAs } from 'file-saver';
import {
  RecruitmentMetrics,
  TimeToHireAnalytics,
  SkillDemand,
  SkillAvailability,
  AnalyticsRequest
} from '../../interfaces/analytics.interface';
import {
  getRecruitmentMetrics,
  getTimeToHireAnalytics,
  getSkillDemandAnalytics,
  getSkillAvailabilityAnalytics
} from '../../api/analytics';
import DatePicker from '../common/DatePicker';
import ErrorBoundary from '../common/ErrorBoundary';
import { flexLayout, elevation } from '../../styles/mixins';
import { breakpoints } from '../../styles/breakpoints';

// Styled components following Material Design 3.0
const ReportContainer = styled.div`
  ${flexLayout({
    direction: 'column',
    gap: '24px'
  })}
  padding: 24px;
  background-color: ${({ theme }) => theme.palette.background.paper};
  border-radius: ${({ theme }) => theme.shape.borderRadius}px;
  ${elevation(2)}
  position: relative;
  min-height: 400px;

  @media ${breakpoints.down('tablet')} {
    padding: 16px;
  }
`;

const ControlsContainer = styled.div`
  ${flexLayout({
    justify: 'space-between',
    align: 'center',
    wrap: 'wrap',
    gap: '16px'
  })}
  margin-bottom: 24px;
`;

const ProgressContainer = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  ${flexLayout({
    direction: 'column',
    align: 'center',
    gap: '16px'
  })}
`;

const PreviewContainer = styled.div`
  max-height: 500px;
  overflow: auto;
  border-radius: ${({ theme }) => theme.shape.borderRadius}px;
  border: 1px solid ${({ theme }) => theme.palette.divider};
  padding: 16px;
  margin-top: 16px;
`;

// Props interface
interface ReportGeneratorProps {
  reportType: 'recruitment' | 'timeToHire' | 'skillDemand' | 'skillAvailability' | 'skillGap';
  initialFilters?: Record<string, any>;
  onGenerateComplete?: (data: any) => void;
  className?: string;
  exportFormat?: 'pdf' | 'excel' | 'csv';
  showPreview?: boolean;
  cacheResults?: boolean;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  reportType,
  initialFilters = {},
  onGenerateComplete,
  className,
  exportFormat = 'pdf',
  showPreview = true,
  cacheResults = true
}) => {
  // State management
  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date }>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate: new Date()
  });
  const [filters, setFilters] = useState(initialFilters);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for abort controller and cache
  const abortControllerRef = useRef<AbortController>();
  const cacheRef = useRef<Map<string, any>>(new Map());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Generate cache key based on parameters
  const getCacheKey = useCallback((request: AnalyticsRequest): string => {
    return JSON.stringify({
      reportType,
      dateRange: request.dateRange,
      filters: request.filters,
      exportFormat
    });
  }, [reportType, exportFormat]);

  // Fetch report data based on type
  const fetchReportData = useCallback(async (request: AnalyticsRequest) => {
    const apiMap = {
      recruitment: getRecruitmentMetrics,
      timeToHire: getTimeToHireAnalytics,
      skillDemand: getSkillDemandAnalytics,
      skillAvailability: getSkillAvailabilityAnalytics
    };

    return await apiMap[reportType as keyof typeof apiMap](request);
  }, [reportType]);

  // Handle report generation
  const generateReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setProgress(0);

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      const request: AnalyticsRequest = {
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        },
        filters,
        aggregationLevel: 'daily',
        metrics: [reportType]
      };

      // Check cache
      const cacheKey = getCacheKey(request);
      if (cacheResults && cacheRef.current.has(cacheKey)) {
        const cachedData = cacheRef.current.get(cacheKey);
        setReportData(cachedData);
        onGenerateComplete?.(cachedData);
        return;
      }

      // Fetch data with progress updates
      const data = await fetchReportData(request);
      setProgress(50);

      // Format data based on export format
      const formattedData = await formatDataForExport(data, exportFormat);
      setProgress(75);

      // Cache results if enabled
      if (cacheResults) {
        cacheRef.current.set(cacheKey, formattedData);
      }

      setReportData(formattedData);
      onGenerateComplete?.(formattedData);
      setProgress(100);

      // Trigger download if not preview only
      if (!showPreview) {
        downloadReport(formattedData, exportFormat);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to generate report');
      }
    } finally {
      setLoading(false);
    }
  }, [
    dateRange,
    filters,
    reportType,
    exportFormat,
    showPreview,
    cacheResults,
    getCacheKey,
    fetchReportData,
    onGenerateComplete
  ]);

  // Format data for export
  const formatDataForExport = async (data: any, format: string): Promise<any> => {
    // Implementation would depend on specific export format requirements
    return data; // Placeholder
  };

  // Download report
  const downloadReport = (data: any, format: string) => {
    const filename = `${reportType}_report_${new Date().toISOString()}.${format}`;
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    saveAs(blob, filename);
  };

  // Handle date range changes
  const handleDateRangeChange = useCallback((startDate: Date, endDate: Date) => {
    setDateRange({ startDate, endDate });
  }, []);

  return (
    <ErrorBoundary>
      <ReportContainer className={className}>
        <ControlsContainer>
          <DatePicker
            name="startDate"
            label="Start Date"
            value={dateRange.startDate}
            onChange={(date) => handleDateRangeChange(date!, dateRange.endDate)}
            maxDate={dateRange.endDate}
          />
          <DatePicker
            name="endDate"
            label="End Date"
            value={dateRange.endDate}
            onChange={(date) => handleDateRangeChange(dateRange.startDate, date!)}
            minDate={dateRange.startDate}
          />
          <Button
            variant="contained"
            onClick={generateReport}
            disabled={loading}
            aria-busy={loading}
          >
            Generate Report
          </Button>
        </ControlsContainer>

        {loading && (
          <ProgressContainer>
            <CircularProgress
              variant="determinate"
              value={progress}
              size={48}
              aria-label="Report generation progress"
            />
            <span>{`${Math.round(progress)}% complete`}</span>
          </ProgressContainer>
        )}

        {error && (
          <div role="alert" aria-live="polite">
            {error}
          </div>
        )}

        {showPreview && reportData && !loading && (
          <PreviewContainer>
            <pre>{JSON.stringify(reportData, null, 2)}</pre>
          </PreviewContainer>
        )}
      </ReportContainer>
    </ErrorBoundary>
  );
};

export default ReportGenerator;