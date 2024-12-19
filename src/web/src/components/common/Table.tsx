/**
 * @fileoverview Enhanced table component implementing Material Design 3.0 principles
 * with comprehensive accessibility support, responsive design, and performance optimization.
 * Supports sorting, filtering, pagination, and keyboard navigation.
 * @version 1.0.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'; // v18.0.0
import styled from '@mui/material/styles/styled'; // v5.0.0
import {
  Table as MuiTable,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableSortLabel,
  useTheme,
  useMediaQuery,
  Skeleton
} from '@mui/material'; // v5.0.0
import { PaginatedResponse, SortOrder, FilterOperator } from '../../interfaces/common.interface';
import Pagination from './Pagination';
import { visuallyHidden, truncateText, flexLayout } from '../../styles/mixins';

// Enhanced table column interface with accessibility support
export interface TableColumn<T = any> {
  field: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  minWidth?: string;
  hideOnMobile?: boolean;
  ariaLabel?: string;
  renderCell?: (value: any, row: T) => React.ReactNode;
}

// Table props interface with comprehensive configuration options
export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data?: T[];
  loading?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  pagination?: PaginatedResponse<T>;
  onSort?: (field: string, order: SortOrder) => void;
  onFilter?: (field: string, operator: FilterOperator, value: any) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loadingRows?: number;
  stickyHeader?: boolean;
  className?: string;
}

// Styled components following Material Design 3.0
const StyledTable = styled(MuiTable)`
  ${({ theme }) => `
    border-collapse: separate;
    border-spacing: 0;
    min-width: 100%;
    background-color: ${theme.palette.background.paper};
  `}
`;

const StyledTableHead = styled(TableHead)`
  ${({ theme }) => `
    background-color: ${theme.palette.background.default};
  `}
`;

const StyledTableRow = styled(TableRow)<{ clickable?: boolean }>`
  ${({ theme, clickable }) => `
    &:hover {
      background-color: ${clickable ? theme.palette.action.hover : 'inherit'};
    }
    
    &:focus-within {
      outline: 2px solid ${theme.palette.primary.main};
      outline-offset: -2px;
    }
  `}
`;

const StyledTableCell = styled(TableCell)`
  ${({ theme }) => `
    padding: ${theme.spacing(2)};
    
    &.header-cell {
      font-weight: ${theme.typography.fontWeightBold};
      white-space: nowrap;
      ${flexLayout({ align: 'center', gap: theme.spacing(1) })}
    }
  `}
`;

const EmptyMessage = styled('div')`
  ${({ theme }) => `
    padding: ${theme.spacing(4)};
    text-align: center;
    color: ${theme.palette.text.secondary};
  `}
`;

const ScreenReaderOnly = styled('span')`
  ${visuallyHidden}
`;

/**
 * Enhanced table component with Material Design styling and accessibility features
 */
export const Table = React.memo(<T extends Record<string, any>>(props: TableProps<T>) => {
  const {
    columns,
    data = [],
    loading = false,
    sortable = true,
    filterable = true,
    pagination,
    onSort,
    onFilter,
    onPageChange,
    onPageSizeChange,
    onRowClick,
    emptyMessage = 'No data available',
    loadingRows = 5,
    stickyHeader = false,
    className
  } = props;

  // Theme and responsive hooks
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State management
  const [sortField, setSortField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const tableRef = useRef<HTMLTableElement>(null);
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);
  const [announcement, setAnnouncement] = useState<string>('');

  // Filter visible columns based on screen size
  const visibleColumns = columns.filter(col => !isMobile || !col.hideOnMobile);

  // Handle sort changes
  const handleSort = useCallback((field: string) => {
    if (!sortable) return;

    const newOrder: SortOrder = field === sortField && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortOrder(newOrder);
    onSort?.(field, newOrder);

    // Announce sort change to screen readers
    setAnnouncement(`Table sorted by ${field} in ${newOrder}ending order`);
  }, [sortable, sortField, sortOrder, onSort]);

  // Keyboard navigation handlers
  const handleKeyDown = useCallback((event: React.KeyboardEvent, rowIndex: number) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedRowIndex(Math.min(rowIndex + 1, data.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedRowIndex(Math.max(rowIndex - 1, 0));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (onRowClick && data[rowIndex]) {
          onRowClick(data[rowIndex]);
        }
        break;
    }
  }, [data, onRowClick]);

  // Focus management
  useEffect(() => {
    if (focusedRowIndex >= 0) {
      const rows = tableRef.current?.getElementsByTagName('tr');
      rows?.[focusedRowIndex + 1]?.focus(); // +1 to account for header row
    }
  }, [focusedRowIndex]);

  // Render loading skeleton
  const renderSkeleton = () => (
    <TableBody>
      {Array.from({ length: loadingRows }).map((_, index) => (
        <TableRow key={`skeleton-${index}`}>
          {visibleColumns.map((column, cellIndex) => (
            <TableCell key={`skeleton-cell-${cellIndex}`}>
              <Skeleton animation="wave" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );

  return (
    <>
      <StyledTable
        ref={tableRef}
        stickyHeader={stickyHeader}
        className={className}
        aria-busy={loading}
        role="grid"
      >
        <StyledTableHead>
          <TableRow>
            {visibleColumns.map(column => (
              <StyledTableCell
                key={column.field}
                className="header-cell"
                style={{ width: column.width, minWidth: column.minWidth }}
                aria-sort={sortField === column.field ? sortOrder : 'none'}
              >
                {column.sortable && sortable ? (
                  <TableSortLabel
                    active={sortField === column.field}
                    direction={sortField === column.field ? sortOrder : 'asc'}
                    onClick={() => handleSort(column.field)}
                    aria-label={`Sort by ${column.header}`}
                  >
                    {column.header}
                    {sortField === column.field && (
                      <ScreenReaderOnly>
                        {sortOrder === 'desc' ? 'sorted descending' : 'sorted ascending'}
                      </ScreenReaderOnly>
                    )}
                  </TableSortLabel>
                ) : (
                  column.header
                )}
              </StyledTableCell>
            ))}
          </TableRow>
        </StyledTableHead>

        {loading ? (
          renderSkeleton()
        ) : (
          <TableBody>
            {data.length > 0 ? (
              data.map((row, rowIndex) => (
                <StyledTableRow
                  key={rowIndex}
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={(e) => handleKeyDown(e, rowIndex)}
                  tabIndex={rowIndex === focusedRowIndex ? 0 : -1}
                  clickable={!!onRowClick}
                  role="row"
                  aria-rowindex={rowIndex + 1}
                >
                  {visibleColumns.map((column, cellIndex) => (
                    <TableCell
                      key={`${rowIndex}-${column.field}`}
                      role="gridcell"
                      aria-colindex={cellIndex + 1}
                    >
                      {column.renderCell?.(row[column.field], row) ?? row[column.field]}
                    </TableCell>
                  ))}
                </StyledTableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={visibleColumns.length}>
                  <EmptyMessage>{emptyMessage}</EmptyMessage>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        )}
      </StyledTable>

      {pagination && (
        <Pagination
          currentPage={pagination.page}
          pageSize={pagination.pageSize}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange!}
          onPageSizeChange={onPageSizeChange!}
          disabled={loading}
        />
      )}

      {/* Announcements for screen readers */}
      <ScreenReaderOnly
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </ScreenReaderOnly>
    </>
  );
});

Table.displayName = 'Table';

export default Table;