/**
 * @fileoverview Test suite for AnalyticsDashboard component
 * Verifies rendering, data fetching, accessibility, performance, and user interactions
 * with comprehensive timing assertions and error handling scenarios
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { act } from '@testing-library/react-hooks';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { axe } from '@testing-library/jest-dom';
import AnalyticsDashboard from '../../../../src/components/analytics/AnalyticsDashboard';
import { 
  getRecruitmentMetrics, 
  getTimeToHireAnalytics, 
  getSkillDemandAnalytics 
} from '../../../../src/api/analytics';

// Mock API functions
vi.mock('../../../../src/api/analytics');

// Test data constants
const mockRecruitmentMetrics = {
  totalRequisitions: 100,
  filledRequisitions: 75,
  averageTimeToHire: 25,
  clientSatisfactionRate: 85,
  requisitionFillRate: 75,
  candidateQualityScore: 90,
  periodStart: new Date('2023-01-01'),
  periodEnd: new Date('2023-12-31')
};

const mockTimeToHireAnalytics = {
  averageDays: 25,
  medianDays: 22,
  trendData: [
    { date: new Date('2023-01-01'), value: 28, label: 'Jan', metadata: {} }
  ],
  percentileData: {
    p90: 35,
    p75: 30,
    p25: 20
  },
  breakdownByRole: {
    'Software Engineer': 24,
    'DevOps Engineer': 28
  }
};

const mockSkillDemand = {
  skillName: 'React',
  demandCount: 150,
  growthRate: 12,
  historicalTrend: [
    { date: new Date('2023-01-01'), value: 100, label: 'Jan', metadata: {} }
  ],
  marketComparison: {
    industry: 85,
    local: 90,
    national: 88
  }
};

describe('AnalyticsDashboard Component', () => {
  let performanceObserver: any;
  let performanceEntries: any[];

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    performanceEntries = [];

    // Mock Performance Observer
    performanceObserver = {
      observe: vi.fn(),
      disconnect: vi.fn()
    };
    global.PerformanceObserver = vi.fn(() => performanceObserver);

    // Setup API mocks with timing simulation
    (getRecruitmentMetrics as jest.Mock).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockRecruitmentMetrics;
    });

    (getTimeToHireAnalytics as jest.Mock).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockTimeToHireAnalytics;
    });

    (getSkillDemandAnalytics as jest.Mock).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockSkillDemand;
    });

    // Mock date
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
    performanceObserver.disconnect();
  });

  it('renders loading state and accessibility features', async () => {
    const { container } = render(<AnalyticsDashboard />);

    // Check loading indicators
    expect(screen.getAllByTestId('skeleton-loader')).toHaveLength(3);

    // Verify loading state accessibility
    const loadingElements = screen.getAllByRole('progressbar');
    loadingElements.forEach(element => {
      expect(element).toHaveAttribute('aria-busy', 'true');
      expect(element).toHaveAttribute('aria-label');
    });

    // Run accessibility audit
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('fetches and displays analytics data within performance threshold', async () => {
    const startTime = performance.now();
    
    render(<AnalyticsDashboard />);

    // Wait for all data to load
    await waitFor(() => {
      expect(getRecruitmentMetrics).toHaveBeenCalled();
      expect(getTimeToHireAnalytics).toHaveBeenCalled();
      expect(getSkillDemandAnalytics).toHaveBeenCalled();
    }, { timeout: 30000 });

    // Verify loading completed within 30 seconds
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(30000);

    // Verify recruitment metrics display
    expect(screen.getByText(`Total Requisitions: ${mockRecruitmentMetrics.totalRequisitions}`)).toBeInTheDocument();
    expect(screen.getByText(`Fill Rate: ${mockRecruitmentMetrics.requisitionFillRate}%`)).toBeInTheDocument();

    // Verify time to hire analytics display
    expect(screen.getByText(`Average: ${mockTimeToHireAnalytics.averageDays} days`)).toBeInTheDocument();
    expect(screen.getByText(`Median: ${mockTimeToHireAnalytics.medianDays} days`)).toBeInTheDocument();

    // Verify skill demand display
    expect(screen.getByText(`Top Skill: ${mockSkillDemand.skillName}`)).toBeInTheDocument();
    expect(screen.getByText(`Growth Rate: ${mockSkillDemand.growthRate}%`)).toBeInTheDocument();

    // Verify tooltips accessibility
    const tooltips = screen.getAllByRole('tooltip');
    tooltips.forEach(tooltip => {
      expect(tooltip).toHaveAttribute('aria-label');
    });
  });

  it('handles error scenarios gracefully', async () => {
    // Mock API error
    const errorMessage = 'Failed to fetch analytics data';
    (getRecruitmentMetrics as jest.Mock).mockRejectedValue(new Error(errorMessage));

    render(<AnalyticsDashboard />);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Verify error message accessibility
    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toHaveAttribute('aria-live', 'assertive');

    // Test retry functionality
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    // Mock successful retry
    (getRecruitmentMetrics as jest.Mock).mockResolvedValueOnce(mockRecruitmentMetrics);
    
    await act(async () => {
      fireEvent.click(retryButton);
    });

    // Verify data loads after retry
    await waitFor(() => {
      expect(screen.getByText(`Total Requisitions: ${mockRecruitmentMetrics.totalRequisitions}`)).toBeInTheDocument();
    });
  });

  it('updates data periodically and maintains performance', async () => {
    render(<AnalyticsDashboard />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(`Total Requisitions: ${mockRecruitmentMetrics.totalRequisitions}`)).toBeInTheDocument();
    });

    // Mock updated data
    const updatedMetrics = { ...mockRecruitmentMetrics, totalRequisitions: 120 };
    (getRecruitmentMetrics as jest.Mock).mockResolvedValueOnce(updatedMetrics);

    // Fast-forward 5 minutes
    act(() => {
      vi.advanceTimersByTime(300000);
    });

    // Verify auto-refresh
    await waitFor(() => {
      expect(screen.getByText(`Total Requisitions: ${updatedMetrics.totalRequisitions}`)).toBeInTheDocument();
    });

    // Verify performance after updates
    const performanceEntries = performance.getEntriesByType('measure');
    performanceEntries.forEach(entry => {
      expect(entry.duration).toBeLessThan(1000); // Each update should take less than 1 second
    });
  });

  it('maintains accessibility standards during data updates', async () => {
    const { container } = render(<AnalyticsDashboard />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(`Total Requisitions: ${mockRecruitmentMetrics.totalRequisitions}`)).toBeInTheDocument();
    });

    // Verify focus management during updates
    const focusableElements = screen.getAllByRole('button');
    focusableElements.forEach(element => {
      element.focus();
      expect(document.activeElement).toBe(element);
    });

    // Run accessibility audit after data load
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});