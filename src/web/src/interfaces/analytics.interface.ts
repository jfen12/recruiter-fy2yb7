/**
 * @fileoverview TypeScript interfaces for analytics and reporting data structures in RefactorTrack.
 * Provides comprehensive type definitions for recruitment metrics, time-to-hire analytics,
 * and skill analysis features with strict type safety.
 * @version 1.0.0
 */

import { PaginatedResponse } from './common.interface';

/**
 * Core interface for recruitment performance metrics and KPIs.
 * Tracks key recruitment efficiency and effectiveness indicators.
 */
export interface RecruitmentMetrics {
  /** Total number of active and completed requisitions */
  totalRequisitions: number;
  
  /** Number of successfully filled requisitions */
  filledRequisitions: number;
  
  /** Average time to hire in days */
  averageTimeToHire: number;
  
  /** Client satisfaction rate (0-100) */
  clientSatisfactionRate: number;
  
  /** Start date of the metrics period */
  periodStart: Date;
  
  /** End date of the metrics period */
  periodEnd: Date;
  
  /** Percentage of requisitions successfully filled */
  requisitionFillRate: number;
  
  /** Average candidate quality score (0-100) */
  candidateQualityScore: number;
}

/**
 * Interface for time-series data points in analytics trends.
 * Supports labeled data points with additional metadata.
 */
export interface TrendPoint {
  /** Timestamp for the data point */
  date: Date;
  
  /** Numeric value for the metric */
  value: number;
  
  /** Human-readable label for the data point */
  label: string;
  
  /** Additional contextual data for the point */
  metadata: Record<string, any>;
}

/**
 * Comprehensive interface for time-to-hire analytics.
 * Provides detailed insights into recruitment velocity.
 */
export interface TimeToHireAnalytics {
  /** Average days to hire across all positions */
  averageDays: number;
  
  /** Median days to hire */
  medianDays: number;
  
  /** Historical trend data for time-to-hire */
  trendData: TrendPoint[];
  
  /** Statistical percentile breakdowns */
  percentileData: {
    p90: number;  // 90th percentile
    p75: number;  // 75th percentile
    p25: number;  // 25th percentile
  };
  
  /** Time-to-hire breakdown by job role */
  breakdownByRole: Record<string, number>;
}

/**
 * Interface for skill demand analytics and market trends.
 * Tracks skill requirements and market comparisons.
 */
export interface SkillDemand {
  /** Name of the technical skill */
  skillName: string;
  
  /** Number of current requisitions requiring this skill */
  demandCount: number;
  
  /** Month-over-month demand growth rate */
  growthRate: number;
  
  /** Historical demand trend data */
  historicalTrend: TrendPoint[];
  
  /** Market demand comparisons */
  marketComparison: {
    industry: number;   // Industry average demand
    local: number;      // Local market demand
    national: number;   // National demand
  };
}

/**
 * Interface for skill availability metrics in candidate pool.
 * Analyzes candidate skills and experience distribution.
 */
export interface SkillAvailability {
  /** Name of the technical skill */
  skillName: string;
  
  /** Number of candidates with this skill */
  availableCandidates: number;
  
  /** Average years of experience with the skill */
  averageExperience: number;
  
  /** Distribution of experience levels */
  experienceDistribution: Record<string, number>;
  
  /** Statistics on relevant certifications */
  certificationStats: Record<string, number>;
}

/**
 * Interface for configurable analytics request parameters.
 * Supports flexible data querying and comparison options.
 */
export interface AnalyticsRequest {
  /** Date range for the analytics query */
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  
  /** Optional filters for data segmentation */
  filters: Record<string, any>;
  
  /** Time-based aggregation level */
  aggregationLevel: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  
  /** Specific metrics to include in the response */
  metrics: string[];
  
  /** Period comparison options */
  compareWithPeriod?: 'previous' | 'lastYear' | 'custom';
}

/**
 * Type alias for paginated recruitment metrics response.
 * Provides paginated access to recruitment performance data.
 */
export type PaginatedRecruitmentMetrics = PaginatedResponse<RecruitmentMetrics>;

/**
 * Type alias for paginated skill demand response.
 * Supports paginated access to skill demand analytics.
 */
export type PaginatedSkillDemand = PaginatedResponse<SkillDemand>;