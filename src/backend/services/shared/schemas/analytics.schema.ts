/**
 * @fileoverview Zod schema definitions for analytics data validation and type safety in RefactorTrack ATS.
 * @version 1.0.0
 * @package RefactorTrack
 */

import { z } from 'zod'; // v3.21.4
import { BaseEntity, DateRange } from '../types/common.types';

/**
 * Schema for trend data points in analytics
 */
const TrendPointSchema = z.object({
  date: z.date().describe('Date of the trend point'),
  value: z.number().min(0).describe('Numeric value for the trend point'),
  change_percentage: z.number().describe('Percentage change from previous period')
}).strict();

/**
 * Schema for skill demand metrics
 */
const SkillDemandSchema = z.object({
  skill_name: z.string().min(1).describe('Name of the skill'),
  demand_score: z.number().min(0).max(100).describe('Demand score out of 100'),
  requisition_count: z.number().int().min(0).describe('Number of requisitions requiring this skill'),
  growth_rate: z.number().describe('Growth rate compared to previous period')
}).strict();

/**
 * Schema for skill availability metrics
 */
const SkillAvailabilitySchema = z.object({
  skill_name: z.string().min(1).describe('Name of the skill'),
  candidate_count: z.number().int().min(0).describe('Number of candidates with this skill'),
  average_experience: z.number().min(0).describe('Average years of experience'),
  availability_score: z.number().min(0).max(100).describe('Availability score out of 100')
}).strict();

/**
 * Schema for skill gap analysis
 */
const SkillGapSchema = z.object({
  skill_name: z.string().min(1).describe('Name of the skill'),
  demand_score: z.number().min(0).max(100).describe('Demand score'),
  availability_score: z.number().min(0).max(100).describe('Availability score'),
  gap_score: z.number().min(-100).max(100).describe('Gap score (demand - availability)'),
  recommended_actions: z.array(z.string()).describe('Recommended actions to address gap')
}).strict();

/**
 * Schema for trending skills analysis
 */
const TrendingSkillSchema = z.object({
  skill_name: z.string().min(1).describe('Name of the skill'),
  trend_score: z.number().min(0).max(100).describe('Trending score'),
  growth_rate: z.number().describe('Growth rate'),
  market_demand: z.number().min(0).max(100).describe('Market demand score')
}).strict();

/**
 * Schema for recruitment metrics validation
 */
export const RecruitmentMetricsSchema = z.object({
  total_requisitions: z.number().int().min(0).describe('Total number of job requisitions'),
  filled_requisitions: z.number().int().min(0)
    .max(z.number().path(['total_requisitions']))
    .describe('Number of filled requisitions'),
  average_time_to_hire: z.number().min(0).describe('Average time to hire in days'),
  client_satisfaction_rate: z.number().min(0).max(100).describe('Client satisfaction percentage'),
  period_start: z.date().min(new Date('2020-01-01')).describe('Start date of the reporting period'),
  period_end: z.date().min(z.date().path(['period_start'])).describe('End date of the reporting period')
}).strict();

/**
 * Schema for time-to-hire analytics validation
 */
export const TimeToHireAnalyticsSchema = z.object({
  average_days: z.number().min(0).describe('Average days to hire'),
  median_days: z.number().min(0).describe('Median days to hire'),
  trend_data: z.array(TrendPointSchema).min(1).describe('Time series data points'),
  breakdown_by_department: z.record(
    z.string(),
    z.number().min(0)
  ).describe('Department-wise breakdown')
}).strict();

/**
 * Schema for skills analytics validation
 */
export const SkillsAnalyticsSchema = z.object({
  skill_demand: z.array(SkillDemandSchema).min(1).describe('Skill demand metrics'),
  skill_availability: z.array(SkillAvailabilitySchema).min(1).describe('Skill availability metrics'),
  skill_gaps: z.array(SkillGapSchema).min(1).describe('Skill gap analysis'),
  trending_skills: z.array(TrendingSkillSchema).max(20).describe('Top trending skills')
}).strict();

/**
 * Schema for analytics request parameters validation
 */
export const AnalyticsRequestSchema = z.object({
  date_range: z.object({
    start_date: z.date().min(new Date('2020-01-01')).describe('Start date for analysis'),
    end_date: z.date()
      .min(z.date().path(['start_date']))
      .describe('End date for analysis')
  }).describe('Query date range'),
  filters: z.record(z.string(), z.any()).describe('Query filters'),
  aggregation_level: z.enum(['daily', 'weekly', 'monthly']).describe('Data aggregation level'),
  metrics: z.array(z.string()).min(1).describe('Requested metrics')
}).strict();

/**
 * Type definitions inferred from schemas
 */
export type RecruitmentMetrics = z.infer<typeof RecruitmentMetricsSchema>;
export type TimeToHireAnalytics = z.infer<typeof TimeToHireAnalyticsSchema>;
export type SkillsAnalytics = z.infer<typeof SkillsAnalyticsSchema>;
export type AnalyticsRequest = z.infer<typeof AnalyticsRequestSchema>;

/**
 * Base analytics entity extending BaseEntity
 */
export const BaseAnalyticsSchema = z.object({
  ...BaseEntity,
  report_id: z.string().uuid().describe('Unique identifier for the analytics report'),
  generated_at: z.date().describe('Timestamp when the analytics were generated'),
  generated_by: z.string().uuid().describe('User ID who generated the report'),
  report_type: z.enum(['recruitment', 'time_to_hire', 'skills']).describe('Type of analytics report')
}).strict();

export type BaseAnalytics = z.infer<typeof BaseAnalyticsSchema>;