/**
 * @fileoverview Redux reducer for analytics state management in RefactorTrack.
 * Handles state updates for recruitment metrics, time-to-hire analytics, and skill analytics
 * with comprehensive performance tracking and error handling.
 * @version 1.0.0
 */

import { createReducer, PayloadAction } from '@reduxjs/toolkit';
import {
  RecruitmentMetrics,
  TimeToHireAnalytics,
  SkillDemand,
  SkillAvailability,
  SkillGap,
  AnalyticsError
} from '../../interfaces/analytics.interface';
import {
  FETCH_RECRUITMENT_METRICS,
  FETCH_TIME_TO_HIRE_ANALYTICS,
  FETCH_SKILL_ANALYTICS,
  analyticsActions
} from '../actions/analyticsActions';

/**
 * Interface defining the structure of the analytics state
 */
interface AnalyticsState {
  recruitmentMetrics: RecruitmentMetrics | null;
  timeToHireAnalytics: TimeToHireAnalytics | null;
  skillDemand: SkillDemand[];
  skillAvailability: SkillAvailability[];
  skillGap: SkillGap[];
  loadingStates: {
    recruitmentMetrics: boolean;
    timeToHire: boolean;
    skillAnalytics: boolean;
  };
  errors: {
    recruitmentMetrics: AnalyticsError | null;
    timeToHire: AnalyticsError | null;
    skillAnalytics: AnalyticsError | null;
  };
  lastUpdated: {
    recruitmentMetrics: Date | null;
    timeToHire: Date | null;
    skillAnalytics: Date | null;
  };
  processingTime: {
    recruitmentMetrics: number;
    timeToHire: number;
    skillAnalytics: number;
  };
}

/**
 * Initial state for analytics
 */
const initialState: AnalyticsState = {
  recruitmentMetrics: null,
  timeToHireAnalytics: null,
  skillDemand: [],
  skillAvailability: [],
  skillGap: [],
  loadingStates: {
    recruitmentMetrics: false,
    timeToHire: false,
    skillAnalytics: false
  },
  errors: {
    recruitmentMetrics: null,
    timeToHire: null,
    skillAnalytics: null
  },
  lastUpdated: {
    recruitmentMetrics: null,
    timeToHire: null,
    skillAnalytics: null
  },
  processingTime: {
    recruitmentMetrics: 0,
    timeToHire: 0,
    skillAnalytics: 0
  }
};

/**
 * Redux reducer for analytics state management
 */
const analyticsReducer = createReducer(initialState, (builder) => {
  builder
    // Recruitment Metrics Handlers
    .addCase(`${FETCH_RECRUITMENT_METRICS}/pending`, (state) => {
      const startTime = Date.now();
      state.loadingStates.recruitmentMetrics = true;
      state.errors.recruitmentMetrics = null;
      state.processingTime.recruitmentMetrics = startTime;
    })
    .addCase(
      `${FETCH_RECRUITMENT_METRICS}/fulfilled`,
      (state, action: PayloadAction<RecruitmentMetrics>) => {
        const endTime = Date.now();
        state.recruitmentMetrics = action.payload;
        state.loadingStates.recruitmentMetrics = false;
        state.lastUpdated.recruitmentMetrics = new Date();
        state.processingTime.recruitmentMetrics = endTime - state.processingTime.recruitmentMetrics;

        // Validate processing time against requirements
        if (state.processingTime.recruitmentMetrics > 30000) {
          console.warn('Recruitment metrics processing exceeded 30-second threshold');
        }
      }
    )
    .addCase(
      `${FETCH_RECRUITMENT_METRICS}/rejected`,
      (state, action: PayloadAction<AnalyticsError>) => {
        const endTime = Date.now();
        state.loadingStates.recruitmentMetrics = false;
        state.errors.recruitmentMetrics = action.payload;
        state.processingTime.recruitmentMetrics = endTime - state.processingTime.recruitmentMetrics;
      }
    )

    // Time-to-Hire Analytics Handlers
    .addCase(`${FETCH_TIME_TO_HIRE_ANALYTICS}/pending`, (state) => {
      const startTime = Date.now();
      state.loadingStates.timeToHire = true;
      state.errors.timeToHire = null;
      state.processingTime.timeToHire = startTime;
    })
    .addCase(
      `${FETCH_TIME_TO_HIRE_ANALYTICS}/fulfilled`,
      (state, action: PayloadAction<TimeToHireAnalytics>) => {
        const endTime = Date.now();
        state.timeToHireAnalytics = action.payload;
        state.loadingStates.timeToHire = false;
        state.lastUpdated.timeToHire = new Date();
        state.processingTime.timeToHire = endTime - state.processingTime.timeToHire;

        // Validate processing time against requirements
        if (state.processingTime.timeToHire > 30000) {
          console.warn('Time-to-hire analytics processing exceeded 30-second threshold');
        }
      }
    )
    .addCase(
      `${FETCH_TIME_TO_HIRE_ANALYTICS}/rejected`,
      (state, action: PayloadAction<AnalyticsError>) => {
        const endTime = Date.now();
        state.loadingStates.timeToHire = false;
        state.errors.timeToHire = action.payload;
        state.processingTime.timeToHire = endTime - state.processingTime.timeToHire;
      }
    )

    // Skill Analytics Handlers
    .addCase(`${FETCH_SKILL_ANALYTICS}/pending`, (state) => {
      const startTime = Date.now();
      state.loadingStates.skillAnalytics = true;
      state.errors.skillAnalytics = null;
      state.processingTime.skillAnalytics = startTime;
    })
    .addCase(
      `${FETCH_SKILL_ANALYTICS}/fulfilled`,
      (state, action: PayloadAction<{ demand: SkillDemand[]; availability: SkillAvailability[] }>) => {
        const endTime = Date.now();
        state.skillDemand = action.payload.demand;
        state.skillAvailability = action.payload.availability;
        state.loadingStates.skillAnalytics = false;
        state.lastUpdated.skillAnalytics = new Date();
        state.processingTime.skillAnalytics = endTime - state.processingTime.skillAnalytics;

        // Calculate skill gaps
        state.skillGap = calculateSkillGaps(action.payload.demand, action.payload.availability);

        // Validate processing time against requirements
        if (state.processingTime.skillAnalytics > 30000) {
          console.warn('Skill analytics processing exceeded 30-second threshold');
        }
      }
    )
    .addCase(
      `${FETCH_SKILL_ANALYTICS}/rejected`,
      (state, action: PayloadAction<AnalyticsError>) => {
        const endTime = Date.now();
        state.loadingStates.skillAnalytics = false;
        state.errors.skillAnalytics = action.payload;
        state.processingTime.skillAnalytics = endTime - state.processingTime.skillAnalytics;
      }
    );
});

/**
 * Helper function to calculate skill gaps between demand and availability
 * @param demand Array of skill demand data
 * @param availability Array of skill availability data
 * @returns Array of calculated skill gaps
 */
const calculateSkillGaps = (
  demand: SkillDemand[],
  availability: SkillAvailability[]
): SkillGap[] => {
  const gaps: SkillGap[] = [];
  
  demand.forEach(demandItem => {
    const availabilityItem = availability.find(a => a.skillName === demandItem.skillName);
    if (availabilityItem) {
      gaps.push({
        skillName: demandItem.skillName,
        demandCount: demandItem.demandCount,
        availableCount: availabilityItem.availableCandidates,
        gap: demandItem.demandCount - availabilityItem.availableCandidates,
        gapPercentage: ((demandItem.demandCount - availabilityItem.availableCandidates) / demandItem.demandCount) * 100
      });
    }
  });

  return gaps;
};

export default analyticsReducer;