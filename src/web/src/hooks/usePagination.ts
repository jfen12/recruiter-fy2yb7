/**
 * @fileoverview Custom React hook for managing pagination state with comprehensive validation,
 * accessibility support, and performance optimization. Provides type-safe pagination
 * functionality for data tables and lists across the RefactorTrack application.
 * @version 1.0.0
 */

import { useState, useCallback } from 'react'; // v18.0.0
import { PaginatedResponse } from '../interfaces/common.interface';

/**
 * Configuration options for pagination behavior
 */
interface PaginationOptions {
  /** Minimum allowed page size */
  minPageSize?: number;
  /** Maximum allowed page size */
  maxPageSize?: number;
  /** Callback fired when pagination state changes */
  onStateChange?: (state: PaginationState) => void;
}

/**
 * Complete pagination state with validation constraints
 */
interface PaginationState {
  /** Current active page number (must be >= 1) */
  currentPage: number;
  /** Number of items per page (must be >= 1) */
  pageSize: number;
  /** Total number of items across all pages (must be >= 0) */
  totalItems: number;
  /** Total number of available pages (calculated) */
  totalPages: number;
  /** Flag indicating if current page is first page */
  isFirstPage: boolean;
  /** Flag indicating if current page is last page */
  isLastPage: boolean;
}

/**
 * Return type for the usePagination hook with enhanced functionality
 */
interface PaginationHookReturn<T> {
  /** Current pagination state with validation flags */
  paginationState: PaginationState;
  /** Validated function to handle page changes */
  handlePageChange: (page: number) => void;
  /** Validated function to handle page size changes */
  handlePageSizeChange: (size: number) => void;
  /** Function to reset pagination to initial state */
  resetPagination: () => void;
  /** Navigate to next page with validation */
  goToNextPage: () => void;
  /** Navigate to previous page with validation */
  goToPreviousPage: () => void;
  /** Navigate to first page */
  goToFirstPage: () => void;
  /** Navigate to last page */
  goToLastPage: () => void;
  /** Update pagination from API response */
  updateFromResponse: (response: PaginatedResponse<T>) => void;
}

/**
 * Default pagination configuration values
 */
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MIN_PAGE_SIZE = 1;
const MAX_PAGE_SIZE = 100;

/**
 * Custom hook for managing pagination state with validation and accessibility support
 * @template T Type of items being paginated
 * @param initialPage Initial page number (defaults to 1)
 * @param initialPageSize Initial page size (defaults to 10)
 * @param options Optional configuration for pagination behavior
 * @returns Object containing validated pagination state and handler functions
 */
export function usePagination<T>(
  initialPage: number = DEFAULT_PAGE,
  initialPageSize: number = DEFAULT_PAGE_SIZE,
  options: PaginationOptions = {}
): PaginationHookReturn<T> {
  // Validate and normalize initial values
  const validatedInitialPage = Math.max(1, initialPage);
  const validatedInitialPageSize = Math.min(
    Math.max(options.minPageSize ?? MIN_PAGE_SIZE, initialPageSize),
    options.maxPageSize ?? MAX_PAGE_SIZE
  );

  // Initialize pagination state
  const [state, setState] = useState<PaginationState>({
    currentPage: validatedInitialPage,
    pageSize: validatedInitialPageSize,
    totalItems: 0,
    totalPages: 1,
    isFirstPage: true,
    isLastPage: true,
  });

  /**
   * Validates page number against boundaries
   * @param page Page number to validate
   * @returns Validated page number
   */
  const validatePage = useCallback((page: number): number => {
    return Math.min(Math.max(1, page), state.totalPages);
  }, [state.totalPages]);

  /**
   * Validates page size against configured limits
   * @param size Page size to validate
   * @returns Validated page size
   */
  const validatePageSize = useCallback((size: number): number => {
    return Math.min(
      Math.max(options.minPageSize ?? MIN_PAGE_SIZE, size),
      options.maxPageSize ?? MAX_PAGE_SIZE
    );
  }, [options.minPageSize, options.maxPageSize]);

  /**
   * Updates pagination state with validation and derived values
   * @param updates Partial state updates to apply
   */
  const updateState = useCallback((updates: Partial<PaginationState>) => {
    setState(prevState => {
      const newState = {
        ...prevState,
        ...updates,
      };

      // Calculate derived values
      newState.totalPages = Math.max(
        1,
        Math.ceil(newState.totalItems / newState.pageSize)
      );
      newState.isFirstPage = newState.currentPage === 1;
      newState.isLastPage = newState.currentPage === newState.totalPages;

      // Notify on state change if callback provided
      options.onStateChange?.(newState);

      return newState;
    });
  }, [options]);

  /**
   * Handles page changes with validation
   */
  const handlePageChange = useCallback((page: number) => {
    const validatedPage = validatePage(page);
    updateState({ currentPage: validatedPage });
  }, [validatePage, updateState]);

  /**
   * Handles page size changes with recalculation
   */
  const handlePageSizeChange = useCallback((size: number) => {
    const validatedSize = validatePageSize(size);
    const newTotalPages = Math.max(1, Math.ceil(state.totalItems / validatedSize));
    const newCurrentPage = Math.min(state.currentPage, newTotalPages);

    updateState({
      pageSize: validatedSize,
      currentPage: newCurrentPage,
    });
  }, [validatePageSize, updateState, state.currentPage, state.totalItems]);

  /**
   * Navigation convenience functions
   */
  const goToNextPage = useCallback(() => {
    if (!state.isLastPage) {
      handlePageChange(state.currentPage + 1);
    }
  }, [state.isLastPage, state.currentPage, handlePageChange]);

  const goToPreviousPage = useCallback(() => {
    if (!state.isFirstPage) {
      handlePageChange(state.currentPage - 1);
    }
  }, [state.isFirstPage, state.currentPage, handlePageChange]);

  const goToFirstPage = useCallback(() => {
    handlePageChange(1);
  }, [handlePageChange]);

  const goToLastPage = useCallback(() => {
    handlePageChange(state.totalPages);
  }, [handlePageChange, state.totalPages]);

  /**
   * Resets pagination to initial state
   */
  const resetPagination = useCallback(() => {
    updateState({
      currentPage: validatedInitialPage,
      pageSize: validatedInitialPageSize,
      totalItems: 0,
      totalPages: 1,
    });
  }, [validatedInitialPage, validatedInitialPageSize, updateState]);

  /**
   * Updates pagination state from API response
   */
  const updateFromResponse = useCallback((response: PaginatedResponse<T>) => {
    updateState({
      currentPage: response.page,
      pageSize: response.pageSize,
      totalItems: response.total,
      totalPages: response.totalPages,
    });
  }, [updateState]);

  return {
    paginationState: state,
    handlePageChange,
    handlePageSizeChange,
    resetPagination,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    updateFromResponse,
  };
}