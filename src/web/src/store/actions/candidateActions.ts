/**
 * @fileoverview Redux action creators and types for candidate management
 * Implements comprehensive CRUD operations, advanced search, and document management
 * with robust error handling and retry mechanisms.
 * @version 1.0.0
 */

import { createAction } from '@reduxjs/toolkit';
import { retry } from 'redux-saga/effects';
import { ValidationError } from 'yup';
import { ICandidate, CandidateStatus, ISkill } from '../../interfaces/candidate.interface';
import { getCandidates, searchCandidates, uploadCandidateDocument } from '../../api/candidates';
import { PaginatedResponse } from '../../interfaces/common.interface';

/**
 * Enum defining all possible candidate action types
 * Includes comprehensive error handling and progress tracking
 */
export enum CandidateActionTypes {
  // Fetch operations
  FETCH_CANDIDATES_REQUEST = '@candidate/FETCH_CANDIDATES_REQUEST',
  FETCH_CANDIDATES_SUCCESS = '@candidate/FETCH_CANDIDATES_SUCCESS',
  FETCH_CANDIDATES_FAILURE = '@candidate/FETCH_CANDIDATES_FAILURE',
  FETCH_CANDIDATES_RETRY = '@candidate/FETCH_CANDIDATES_RETRY',

  // Search operations
  SEARCH_CANDIDATES_REQUEST = '@candidate/SEARCH_CANDIDATES_REQUEST',
  SEARCH_CANDIDATES_SUCCESS = '@candidate/SEARCH_CANDIDATES_SUCCESS',
  SEARCH_CANDIDATES_FAILURE = '@candidate/SEARCH_CANDIDATES_FAILURE',
  SEARCH_CANDIDATES_CANCEL = '@candidate/SEARCH_CANDIDATES_CANCEL',

  // Document operations
  UPLOAD_DOCUMENT_REQUEST = '@candidate/UPLOAD_DOCUMENT_REQUEST',
  UPLOAD_DOCUMENT_PROGRESS = '@candidate/UPLOAD_DOCUMENT_PROGRESS',
  UPLOAD_DOCUMENT_SUCCESS = '@candidate/UPLOAD_DOCUMENT_SUCCESS',
  UPLOAD_DOCUMENT_FAILURE = '@candidate/UPLOAD_DOCUMENT_FAILURE',
  UPLOAD_DOCUMENT_CANCEL = '@candidate/UPLOAD_DOCUMENT_CANCEL',

  // Validation operations
  VALIDATE_CANDIDATE_DATA = '@candidate/VALIDATE_CANDIDATE_DATA',
  VALIDATE_CANDIDATE_ERROR = '@candidate/VALIDATE_CANDIDATE_ERROR'
}

/**
 * Interface for candidate fetch parameters
 */
interface FetchCandidatesParams {
  page: number;
  limit: number;
  status?: CandidateStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  retryCount?: number;
}

/**
 * Interface for candidate search parameters
 */
interface SearchCandidatesParams {
  query?: string;
  skills?: string[];
  experience?: {
    min?: number;
    max?: number;
  };
  status?: CandidateStatus;
  location?: string;
}

/**
 * Interface for document upload parameters
 */
interface UploadDocumentParams {
  candidateId: string;
  file: File;
  documentType: string;
  metadata?: Record<string, any>;
}

/**
 * Action creator for initiating candidate fetch request
 */
export const fetchCandidatesRequest = createAction<FetchCandidatesParams>(
  CandidateActionTypes.FETCH_CANDIDATES_REQUEST
);

/**
 * Action creator for successful candidate fetch
 */
export const fetchCandidatesSuccess = createAction<PaginatedResponse<ICandidate>>(
  CandidateActionTypes.FETCH_CANDIDATES_SUCCESS
);

/**
 * Action creator for failed candidate fetch
 */
export const fetchCandidatesFailure = createAction<Error>(
  CandidateActionTypes.FETCH_CANDIDATES_FAILURE
);

/**
 * Action creator for initiating candidate search
 */
export const searchCandidatesRequest = createAction<SearchCandidatesParams>(
  CandidateActionTypes.SEARCH_CANDIDATES_REQUEST
);

/**
 * Action creator for successful candidate search
 */
export const searchCandidatesSuccess = createAction<PaginatedResponse<ICandidate>>(
  CandidateActionTypes.SEARCH_CANDIDATES_SUCCESS
);

/**
 * Action creator for failed candidate search
 */
export const searchCandidatesFailure = createAction<Error>(
  CandidateActionTypes.SEARCH_CANDIDATES_FAILURE
);

/**
 * Action creator for cancelling candidate search
 */
export const searchCandidatesCancel = createAction(
  CandidateActionTypes.SEARCH_CANDIDATES_CANCEL
);

/**
 * Action creator for initiating document upload
 */
export const uploadDocumentRequest = createAction<UploadDocumentParams>(
  CandidateActionTypes.UPLOAD_DOCUMENT_REQUEST
);

/**
 * Action creator for document upload progress
 */
export const uploadDocumentProgress = createAction<{ progress: number }>(
  CandidateActionTypes.UPLOAD_DOCUMENT_PROGRESS
);

/**
 * Action creator for successful document upload
 */
export const uploadDocumentSuccess = createAction<{ documentUrl: string; metadata: Record<string, any> }>(
  CandidateActionTypes.UPLOAD_DOCUMENT_SUCCESS
);

/**
 * Action creator for failed document upload
 */
export const uploadDocumentFailure = createAction<Error>(
  CandidateActionTypes.UPLOAD_DOCUMENT_FAILURE
);

/**
 * Action creator for cancelling document upload
 */
export const uploadDocumentCancel = createAction(
  CandidateActionTypes.UPLOAD_DOCUMENT_CANCEL
);

/**
 * Action creator for validating candidate data
 */
export const validateCandidateData = createAction<ICandidate>(
  CandidateActionTypes.VALIDATE_CANDIDATE_DATA
);

/**
 * Action creator for candidate validation errors
 */
export const validateCandidateError = createAction<ValidationError>(
  CandidateActionTypes.VALIDATE_CANDIDATE_ERROR
);

/**
 * Type definitions for all candidate actions
 */
export type CandidateActions = 
  | ReturnType<typeof fetchCandidatesRequest>
  | ReturnType<typeof fetchCandidatesSuccess>
  | ReturnType<typeof fetchCandidatesFailure>
  | ReturnType<typeof searchCandidatesRequest>
  | ReturnType<typeof searchCandidatesSuccess>
  | ReturnType<typeof searchCandidatesFailure>
  | ReturnType<typeof searchCandidatesCancel>
  | ReturnType<typeof uploadDocumentRequest>
  | ReturnType<typeof uploadDocumentProgress>
  | ReturnType<typeof uploadDocumentSuccess>
  | ReturnType<typeof uploadDocumentFailure>
  | ReturnType<typeof uploadDocumentCancel>
  | ReturnType<typeof validateCandidateData>
  | ReturnType<typeof validateCandidateError>;

export default {
  fetchCandidatesRequest,
  fetchCandidatesSuccess,
  fetchCandidatesFailure,
  searchCandidatesRequest,
  searchCandidatesSuccess,
  searchCandidatesFailure,
  searchCandidatesCancel,
  uploadDocumentRequest,
  uploadDocumentProgress,
  uploadDocumentSuccess,
  uploadDocumentFailure,
  uploadDocumentCancel,
  validateCandidateData,
  validateCandidateError
};