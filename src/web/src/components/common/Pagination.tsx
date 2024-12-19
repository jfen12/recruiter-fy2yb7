/**
 * @fileoverview A comprehensive, accessible, and theme-aware pagination component
 * implementing Material Design 3.0 principles. Provides intuitive navigation through
 * paginated data sets with support for page size selection, keyboard navigation,
 * and screen reader announcements.
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useRef } from 'react';
import styled from '@mui/material/styles/styled';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from './Button';
import { usePagination } from '../../hooks/usePagination';
import { PaginatedResponse } from '../../interfaces/common.interface';

// Default page size options following common patterns
const DEFAULT_PAGE_SIZES = [10, 25, 50, 100] as const;

// ARIA labels for accessibility
const ARIA_LABELS = {
  nextPage: 'Go to next page',
  prevPage: 'Go to previous page',
  pageSize: 'Select number of items per page',
  currentPage: 'Current page, page {0} of {1}',
  pageButton: 'Go to page {0}',
  pageSizeLabel: '{0} items per page'
} as const;

// Styled components following Material Design 3.0
const PaginationContainer = styled('nav')`
  ${({ theme }) => `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${theme.spacing(2)};
    gap: ${theme.spacing(2)};
    
    @media (max-width: ${theme.breakpoints.values.sm}px) {
      flex-direction: column;
      align-items: stretch;
    }
  `}
`;

const PageSizeContainer = styled('div')`
  ${({ theme }) => `
    display: flex;
    align-items: center;
    gap: ${theme.spacing(1)};
  `}
`;

const PaginationControls = styled('div')`
  ${({ theme }) => `
    display: flex;
    align-items: center;
    gap: ${theme.spacing(1)};
  `}
`;

const PageNumber = styled(Button)<{ selected?: boolean }>`
  ${({ theme, selected }) => `
    min-width: 40px;
    height: 40px;
    padding: 0;
    border-radius: ${theme.shape.borderRadius}px;
    
    ${selected && `
      background-color: ${theme.palette.primary.main};
      color: ${theme.palette.primary.contrastText};
      
      &:hover {
        background-color: ${theme.palette.primary.dark};
      }
    `}
  `}
`;

// Props interface with comprehensive type definitions
export interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

/**
 * Pagination component with Material Design styling and accessibility features
 */
export const Pagination = React.memo<PaginationProps>(({
  currentPage,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  disabled = false,
  loading = false,
  className
}) => {
  // Refs for managing focus and announcements
  const announcerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible page range
  const getVisiblePages = useCallback(() => {
    const delta = 2; // Number of pages to show on each side of current page
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      }
    }

    range.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  }, [currentPage, totalPages]);

  // Announce page changes to screen readers
  const announcePageChange = useCallback((page: number) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = ARIA_LABELS.currentPage
        .replace('{0}', String(page))
        .replace('{1}', String(totalPages));
    }
  }, [totalPages]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled || loading) return;

    switch (e.key) {
      case 'ArrowLeft':
        if (currentPage > 1) onPageChange(currentPage - 1);
        break;
      case 'ArrowRight':
        if (currentPage < totalPages) onPageChange(currentPage + 1);
        break;
      case 'Home':
        onPageChange(1);
        break;
      case 'End':
        onPageChange(totalPages);
        break;
    }
  }, [currentPage, totalPages, onPageChange, disabled, loading]);

  // Announce initial page on mount and page changes
  useEffect(() => {
    announcePageChange(currentPage);
  }, [currentPage, announcePageChange]);

  return (
    <PaginationContainer
      ref={containerRef}
      className={className}
      role="navigation"
      aria-label="Pagination"
      onKeyDown={handleKeyDown}
    >
      <PageSizeContainer>
        <Select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          disabled={disabled || loading}
          aria-label={ARIA_LABELS.pageSize}
          size="small"
        >
          {pageSizeOptions.map((size) => (
            <MenuItem key={size} value={size}>
              {ARIA_LABELS.pageSizeLabel.replace('{0}', String(size))}
            </MenuItem>
          ))}
        </Select>
      </PageSizeContainer>

      <PaginationControls>
        <Button
          onClick={() => onPageChange(1)}
          disabled={disabled || loading || currentPage === 1}
          aria-label="Go to first page"
          variant="outlined"
          size="small"
        >
          «
        </Button>
        
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={disabled || loading || currentPage === 1}
          aria-label={ARIA_LABELS.prevPage}
          variant="outlined"
          size="small"
        >
          ‹
        </Button>

        {getVisiblePages().map((page, index) => (
          typeof page === 'number' ? (
            <PageNumber
              key={index}
              onClick={() => onPageChange(page)}
              disabled={disabled || loading}
              selected={page === currentPage}
              aria-label={ARIA_LABELS.pageButton.replace('{0}', String(page))}
              aria-current={page === currentPage ? 'page' : undefined}
              variant={page === currentPage ? 'contained' : 'outlined'}
              size="small"
            >
              {page}
            </PageNumber>
          ) : (
            <span key={index} aria-hidden="true">
              {page}
            </span>
          )
        ))}

        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={disabled || loading || currentPage === totalPages}
          aria-label={ARIA_LABELS.nextPage}
          variant="outlined"
          size="small"
        >
          ›
        </Button>

        <Button
          onClick={() => onPageChange(totalPages)}
          disabled={disabled || loading || currentPage === totalPages}
          aria-label="Go to last page"
          variant="outlined"
          size="small"
        >
          »
        </Button>
      </PaginationControls>

      {/* Screen reader announcements */}
      <div
        ref={announcerRef}
        role="status"
        aria-live="polite"
        className="visually-hidden"
      />
    </PaginationContainer>
  );
});

Pagination.displayName = 'Pagination';

export default Pagination;