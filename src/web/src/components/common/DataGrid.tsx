/**
 * @fileoverview Advanced data grid component implementing Material Design 3.0 principles
 * with comprehensive accessibility support, virtualization, and enterprise features.
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from '@mui/material/styles/styled';
import { 
  DataGrid as MuiDataGrid,
  GridColDef,
  GridRowSelectionModel,
  GridFilterModel,
  GridSortModel,
  GridRenderCellParams,
  gridClasses,
  useGridApiContext
} from '@mui/x-data-grid'; // v6.0.0
import { useTheme } from '@mui/material/styles';
import { PaginatedResponse, SortOrder, FilterOperator } from '../../interfaces/common.interface';
import Pagination from './Pagination';

// Constants for accessibility and UX
const ARIA_LABELS = {
  grid: 'Data grid with sortable columns and row selection',
  noRows: 'No data to display',
  loading: 'Loading data',
  selected: '{count} rows selected',
  filtered: 'Showing filtered results',
  sorted: 'Data sorted by {column} in {direction} order'
} as const;

// Styled components following Material Design 3.0
const GridContainer = styled('div')`
  ${({ theme }) => `
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(2)};
    height: 100%;
    min-height: 400px;
    background: ${theme.palette.background.paper};
    border-radius: ${theme.shape.borderRadius}px;
    ${theme.breakpoints.down('sm')} {
      min-height: 300px;
    }
  `}
`;

const StyledDataGrid = styled(MuiDataGrid)`
  ${({ theme }) => `
    border: none;
    
    // Header styling
    .${gridClasses.columnHeaders} {
      background: ${theme.palette.background.default};
      border-bottom: 1px solid ${theme.palette.divider};
      
      .${gridClasses.columnHeader} {
        outline: none;
        &:focus-visible {
          outline: 2px solid ${theme.palette.primary.main};
          outline-offset: -2px;
        }
      }
    }
    
    // Row styling
    .${gridClasses.row} {
      &:hover {
        background-color: ${theme.palette.action.hover};
      }
      &.${gridClasses.selected} {
        background-color: ${theme.palette.action.selected};
      }
      &:focus-visible {
        outline: 2px solid ${theme.palette.primary.main};
        outline-offset: -2px;
      }
    }
    
    // Cell styling
    .${gridClasses.cell} {
      border-bottom: 1px solid ${theme.palette.divider};
      &:focus-visible {
        outline: 2px solid ${theme.palette.primary.main};
        outline-offset: -2px;
      }
    }
    
    // Responsive adjustments
    ${theme.breakpoints.down('sm')} {
      .${gridClasses.columnHeaders} {
        font-size: 0.875rem;
      }
      .${gridClasses.cell} {
        font-size: 0.875rem;
        padding: ${theme.spacing(1)};
      }
    }
  `}
`;

// Enhanced column interface with accessibility features
export interface GridColumn extends GridColDef {
  ariaLabel?: string;
  responsiveHide?: 'sm' | 'md' | 'lg';
  minWidth?: number;
}

// Props interface with comprehensive configuration options
export interface DataGridProps<T> {
  columns: GridColumn[];
  rows: T[];
  loading?: boolean;
  error?: string;
  selectable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  pagination?: PaginatedResponse<T>;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSortChange?: (field: string, order: SortOrder) => void;
  onFilterChange?: (field: string, operator: FilterOperator, value: any) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  getRowId?: (row: T) => string;
  className?: string;
}

/**
 * Enhanced data grid component with comprehensive accessibility and enterprise features
 */
export const DataGrid = React.memo(<T extends object>({
  columns,
  rows,
  loading = false,
  error,
  selectable = false,
  sortable = true,
  filterable = true,
  pagination,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onFilterChange,
  onSelectionChange,
  getRowId = (row: any) => row.id,
  className
}: DataGridProps<T>) => {
  const theme = useTheme();
  const announcerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<GridRowSelectionModel>([]);
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });

  // Process columns with accessibility and responsive features
  const processedColumns = useMemo(() => {
    return columns.map((column): GridColDef => ({
      ...column,
      sortable: sortable && column.sortable,
      filterable: filterable && column.filterable,
      headerName: column.header || column.field,
      flex: column.flex || 1,
      minWidth: column.minWidth || 100,
      renderHeader: (params) => (
        <div role="columnheader" aria-label={column.ariaLabel || column.header}>
          {params.colDef.headerName}
        </div>
      ),
      renderCell: column.renderCell || ((params: GridRenderCellParams) => (
        <div role="cell" aria-label={`${column.header}: ${params.value}`}>
          {params.value}
        </div>
      ))
    }));
  }, [columns, sortable, filterable]);

  // Handle selection changes with announcements
  const handleSelectionChange = useCallback((newSelection: GridRowSelectionModel) => {
    setSelection(newSelection);
    if (announcerRef.current) {
      announcerRef.current.textContent = ARIA_LABELS.selected.replace(
        '{count}',
        newSelection.length.toString()
      );
    }
    onSelectionChange?.(newSelection as string[]);
  }, [onSelectionChange]);

  // Handle sort changes with announcements
  const handleSortChange = useCallback((model: GridSortModel) => {
    setSortModel(model);
    if (model.length > 0 && onSortChange) {
      const { field, sort } = model[0];
      onSortChange(field, sort as SortOrder);
      if (announcerRef.current) {
        announcerRef.current.textContent = ARIA_LABELS.sorted
          .replace('{column}', field)
          .replace('{direction}', sort || 'asc');
      }
    }
  }, [onSortChange]);

  // Handle filter changes with announcements
  const handleFilterChange = useCallback((model: GridFilterModel) => {
    setFilterModel(model);
    if (model.items.length > 0 && onFilterChange) {
      const { field, operator, value } = model.items[0];
      onFilterChange(field, operator as FilterOperator, value);
      if (announcerRef.current) {
        announcerRef.current.textContent = ARIA_LABELS.filtered;
      }
    }
  }, [onFilterChange]);

  return (
    <GridContainer className={className}>
      <StyledDataGrid
        rows={rows}
        columns={processedColumns}
        loading={loading}
        error={error}
        getRowId={getRowId}
        
        // Selection configuration
        checkboxSelection={selectable}
        disableSelectionOnClick
        rowSelectionModel={selection}
        onRowSelectionModelChange={handleSelectionChange}
        
        // Sorting configuration
        sortingMode="server"
        sortModel={sortModel}
        onSortModelChange={handleSortChange}
        
        // Filtering configuration
        filterMode="server"
        filterModel={filterModel}
        onFilterModelChange={handleFilterChange}
        
        // Pagination integration
        paginationMode="server"
        rowCount={pagination?.total || 0}
        page={pagination?.page ? pagination.page - 1 : 0}
        pageSize={pagination?.pageSize || 10}
        
        // Accessibility configuration
        aria-label={ARIA_LABELS.grid}
        aria-busy={loading}
        components={{
          NoRowsOverlay: () => (
            <div role="alert">{ARIA_LABELS.noRows}</div>
          ),
          LoadingOverlay: () => (
            <div role="alert" aria-busy="true">
              {ARIA_LABELS.loading}
            </div>
          ),
          Pagination: () => pagination ? (
            <Pagination
              currentPage={pagination.page}
              pageSize={pagination.pageSize}
              totalPages={pagination.totalPages}
              onPageChange={onPageChange!}
              onPageSizeChange={onPageSizeChange!}
            />
          ) : null
        }}
        
        // Performance optimization
        columnBuffer={8}
        rowBuffer={10}
        
        // Additional configuration
        disableColumnMenu={!filterable}
        disableVirtualization={false}
        density="standard"
        showCellRightBorder={false}
        showColumnRightBorder={false}
      />
      
      {/* Screen reader announcements */}
      <div
        ref={announcerRef}
        role="status"
        aria-live="polite"
        className="visually-hidden"
      />
    </GridContainer>
  );
});

DataGrid.displayName = 'DataGrid';

export default DataGrid;