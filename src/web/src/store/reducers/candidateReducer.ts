/**
 * @fileoverview Redux reducer for candidate state management in RefactorTrack
 * Implements normalized state structure with optimized performance and type safety
 * @version 1.0.0
 */

import { createReducer } from '@reduxjs/toolkit'; // ^1.9.5
import { CandidateActionTypes } from '../actions/candidateActions';
import { ICandidate, CandidateStatus } from '../../interfaces/candidate.interface';

/**
 * Interface defining the shape of candidate reducer state with normalized structure
 */
export interface ICandidateState {
  candidatesById: Record<string, ICandidate>;
  candidateIds: string[];
  selectedCandidateId: string | null;
  loading: boolean;
  error: { message: string; code: string } | null;
  total: number;
  searchResults: string[];
  documentUploadProgress: Record<string, number>;
}

/**
 * Initial state with normalized structure for optimized lookups
 */
const initialState: ICandidateState = {
  candidatesById: {},
  candidateIds: [],
  selectedCandidateId: null,
  loading: false,
  error: null,
  total: 0,
  searchResults: [],
  documentUploadProgress: {}
};

/**
 * Candidate reducer implementation using Redux Toolkit's createReducer
 * Implements normalized state management with immer-powered immutability
 */
const candidateReducer = createReducer(initialState, (builder) => {
  builder
    // Handle fetch candidates request
    .addCase(CandidateActionTypes.FETCH_CANDIDATES_REQUEST, (state) => {
      state.loading = true;
      state.error = null;
    })

    // Handle successful candidates fetch with normalization
    .addCase(CandidateActionTypes.FETCH_CANDIDATES_SUCCESS, (state, action) => {
      state.loading = false;
      state.error = null;
      
      // Normalize candidates data
      const { data, total } = action.payload;
      const newCandidatesById: Record<string, ICandidate> = {};
      const newCandidateIds: string[] = [];

      data.forEach((candidate) => {
        newCandidatesById[candidate.id] = {
          ...candidate,
          // Ensure proper date handling
          created_at: new Date(candidate.created_at),
          updated_at: new Date(candidate.updated_at)
        };
        newCandidateIds.push(candidate.id);
      });

      state.candidatesById = newCandidatesById;
      state.candidateIds = newCandidateIds;
      state.total = total;
    })

    // Handle fetch candidates failure
    .addCase(CandidateActionTypes.FETCH_CANDIDATES_FAILURE, (state, action) => {
      state.loading = false;
      state.error = {
        message: action.payload.message,
        code: action.payload.code || 'FETCH_ERROR'
      };
    })

    // Handle successful candidate creation with optimistic update
    .addCase(CandidateActionTypes.CREATE_CANDIDATE_SUCCESS, (state, action) => {
      const candidate = action.payload;
      state.candidatesById[candidate.id] = {
        ...candidate,
        created_at: new Date(candidate.created_at),
        updated_at: new Date(candidate.updated_at)
      };
      state.candidateIds.unshift(candidate.id);
      state.total += 1;
    })

    // Handle successful candidate update
    .addCase(CandidateActionTypes.UPDATE_CANDIDATE_SUCCESS, (state, action) => {
      const candidate = action.payload;
      state.candidatesById[candidate.id] = {
        ...candidate,
        updated_at: new Date(candidate.updated_at)
      };
    })

    // Handle successful candidate deletion
    .addCase(CandidateActionTypes.DELETE_CANDIDATE_SUCCESS, (state, action) => {
      const candidateId = action.payload;
      delete state.candidatesById[candidateId];
      state.candidateIds = state.candidateIds.filter(id => id !== candidateId);
      state.total -= 1;

      if (state.selectedCandidateId === candidateId) {
        state.selectedCandidateId = null;
      }
    })

    // Handle successful candidate search
    .addCase(CandidateActionTypes.SEARCH_CANDIDATES_SUCCESS, (state, action) => {
      const { data } = action.payload;
      state.searchResults = data.map(candidate => candidate.id);
      
      // Update normalized store with search results
      data.forEach(candidate => {
        state.candidatesById[candidate.id] = {
          ...candidate,
          created_at: new Date(candidate.created_at),
          updated_at: new Date(candidate.updated_at)
        };
      });
    })

    // Handle candidate selection
    .addCase(CandidateActionTypes.SELECT_CANDIDATE, (state, action) => {
      state.selectedCandidateId = action.payload;
    })

    // Handle document upload progress
    .addCase(CandidateActionTypes.UPLOAD_DOCUMENT_PROGRESS, (state, action) => {
      const { documentId, progress } = action.payload;
      state.documentUploadProgress[documentId] = progress;
    });
});

/**
 * Selector for getting a candidate by ID with memoization support
 * @param state Current candidate state
 * @param id Candidate ID to retrieve
 * @returns ICandidate | undefined
 */
export const selectCandidateById = (state: ICandidateState, id: string): ICandidate | undefined => {
  return state.candidatesById[id];
};

/**
 * Selector for getting all candidates as an array with memoization support
 * @param state Current candidate state
 * @returns ICandidate[]
 */
export const selectAllCandidates = (state: ICandidateState): ICandidate[] => {
  return state.candidateIds.map(id => state.candidatesById[id]);
};

/**
 * Selector for getting search results with memoization support
 * @param state Current candidate state
 * @returns ICandidate[]
 */
export const selectSearchResults = (state: ICandidateState): ICandidate[] => {
  return state.searchResults.map(id => state.candidatesById[id]);
};

export default candidateReducer;