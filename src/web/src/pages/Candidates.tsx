/**
 * @fileoverview Main page component for candidate management in RefactorTrack ATS.
 * Implements comprehensive search, filtering, and list management with accessibility
 * support and performance optimization.
 * @version 1.0.0
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { styled } from '@mui/material/styles';
import {
  Container,
  Paper,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import CandidateList from '../components/candidates/CandidateList';
import CandidateSearch from '../components/candidates/CandidateSearch';
import { getCandidates, searchCandidates } from '../api/candidates';
import { ICandidate } from '../interfaces/candidate.interface';
import { useNotification } from '../hooks/useNotification';
import usePagination from '../hooks/usePagination';
import { truncateText } from '../utils/formatting';

// Styled components with Material Design 3.0 principles
const PageContainer = styled(Container)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: '100%',
  [theme.breakpoints.up('lg')]: {
    maxWidth: theme.breakpoints.values.lg,
  },
}));

const ContentWrapper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
}));

const LoadingOverlay = styled('div')(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  zIndex: theme.zIndex.modal,
  borderRadius: theme.shape.borderRadius,
}));

// Search debounce timeout in milliseconds
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Main Candidates page component with enhanced search and accessibility
 */
const Candidates: React.FC = () => {
  // State management
  const [candidates, setCandidates] = useState<ICandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const { showNotification } = useNotification();

  // Initialize pagination
  const {
    paginationState,
    handlePageChange,
    updateFromResponse,
  } = usePagination<ICandidate>();

  /**
   * Fetches candidates with retry mechanism
   */
  const fetchCandidatesWithRetry = useCallback(async (
    params: { page: number; limit: number; retryCount?: number }
  ) => {
    const maxRetries = 3;
    const retryCount = params.retryCount || 0;

    try {
      setIsLoading(true);
      setError(null);

      const response = await getCandidates({
        page: params.page,
        limit: params.limit,
      });

      setCandidates(response.data.data);
      updateFromResponse(response.data);
    } catch (err) {
      if (retryCount < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          fetchCandidatesWithRetry({
            ...params,
            retryCount: retryCount + 1,
          });
        }, delay);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch candidates';
        setError(errorMessage);
        showNotification({
          message: errorMessage,
          type: 'error',
          duration: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [showNotification, updateFromResponse]);

  // Initial data fetch
  useEffect(() => {
    fetchCandidatesWithRetry({
      page: paginationState.currentPage,
      limit: paginationState.pageSize,
    });
  }, [fetchCandidatesWithRetry, paginationState.currentPage, paginationState.pageSize]);

  /**
   * Handles debounced candidate search
   */
  const handleSearch = useCallback(async (searchParams: {
    query: string;
    filters: Record<string, unknown>;
  }) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await searchCandidates({
          query: searchParams.query,
          page: paginationState.currentPage,
          limit: paginationState.pageSize,
          ...searchParams.filters,
        });

        setCandidates(response.data.data);
        updateFromResponse(response.data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed';
        setError(errorMessage);
        showNotification({
          message: errorMessage,
          type: 'error',
          duration: 5000,
        });
      } finally {
        setIsLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
  }, [paginationState.currentPage, paginationState.pageSize, showNotification, updateFromResponse]);

  /**
   * Handles candidate selection
   */
  const handleCandidateSelect = useCallback((id: string) => {
    // Navigate to candidate detail page
    window.location.href = `/candidates/${id}`;
  }, []);

  return (
    <PageContainer>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ mb: 4 }}
        aria-label="Candidate Management"
      >
        Candidate Management
      </Typography>

      <ContentWrapper>
        <CandidateSearch
          onSearch={handleSearch}
          debounceTime={SEARCH_DEBOUNCE_MS}
        />

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            role="alert"
          >
            {error}
          </Alert>
        )}

        <div 
          role="region" 
          aria-label="Candidates list"
          style={{ position: 'relative', minHeight: '400px' }}
        >
          {isLoading && (
            <LoadingOverlay>
              <CircularProgress
                size={40}
                aria-label="Loading candidates"
              />
            </LoadingOverlay>
          )}

          <CandidateList
            candidates={{
              data: candidates,
              total: paginationState.totalItems,
              page: paginationState.currentPage,
              pageSize: paginationState.pageSize,
            }}
            onCandidateSelect={handleCandidateSelect}
            virtualization={{
              enabled: true,
              itemHeight: 200,
              overscan: 5,
            }}
          />
        </div>
      </ContentWrapper>
    </PageContainer>
  );
};

// Add display name for debugging
Candidates.displayName = 'Candidates';

export default Candidates;