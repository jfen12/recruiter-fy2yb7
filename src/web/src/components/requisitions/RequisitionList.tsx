/**
 * @fileoverview Enhanced requisition list component implementing Material Design 3.0 principles
 * with comprehensive accessibility support, responsive design, and performance optimization.
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Skeleton,
  useTheme,
  useMediaQuery,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import styled from '@mui/material/styles/styled';
import {
  Requisition,
  RequisitionStatus,
  RequisitionPriority
} from '../../interfaces/requisition.interface';
import Table from '../common/Table';
import { usePagination } from '../../hooks/usePagination';
import { truncateText, flexLayout, visuallyHidden } from '../../styles/mixins';
import { formatCurrency, formatDate } from '../../utils/formatters';

// Styled components following Material Design 3.0
const ListContainer = styled(Box)`
  ${({ theme }) => `
    padding: ${theme.spacing(3)};
    background-color: ${theme.palette.background.paper};
    border-radius: ${theme.shape.borderRadius}px;
    ${theme.breakpoints.down('sm')} {
      padding: ${theme.spacing(2)};
    }
  `}
`;

const HeaderContainer = styled(Box)`
  ${({ theme }) => flexLayout({
    justify: 'space-between',
    align: 'center',
    gap: theme.spacing(2)
  })}
  margin-bottom: ${({ theme }) => theme.spacing(3)};
`;

const StatusChip = styled(Chip)<{ status: RequisitionStatus }>`
  ${({ theme, status }) => `
    background-color: ${theme.palette[getStatusColor(status)].light};
    color: ${theme.palette[getStatusColor(status)].dark};
    font-weight: ${theme.typography.fontWeightMedium};
  `}
`;

// Props interface with comprehensive type definitions
export interface RequisitionListProps {
  clientId?: string;
  status?: RequisitionStatus;
  priority?: RequisitionPriority;
  onRequisitionSelect?: (requisition: Requisition) => void;
}

// Helper function to map status to color
const getStatusColor = (status: RequisitionStatus): string => {
  const statusColorMap: Record<RequisitionStatus, string> = {
    DRAFT: 'info',
    OPEN: 'success',
    IN_PROGRESS: 'primary',
    ON_HOLD: 'warning',
    CLOSED: 'error',
    CANCELLED: 'error'
  };
  return statusColorMap[status];
};

/**
 * Enhanced requisition list component with accessibility and responsive features
 */
export const RequisitionList: React.FC<RequisitionListProps> = React.memo(({
  clientId,
  status,
  priority,
  onRequisitionSelect
}) => {
  // Theme and responsive hooks
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useDispatch();

  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination hook
  const {
    paginationState,
    handlePageChange,
    handlePageSizeChange,
    updateFromResponse
  } = usePagination<Requisition>();

  // Memoized table columns with responsive configuration
  const columns = useMemo(() => [
    {
      field: 'title',
      header: 'Title',
      sortable: true,
      minWidth: '200px',
      renderCell: (value: string, row: Requisition) => (
        <Typography
          variant="body1"
          sx={truncateText(1)}
          component="div"
          role="cell"
        >
          {value}
        </Typography>
      )
    },
    {
      field: 'status',
      header: 'Status',
      sortable: true,
      width: '150px',
      renderCell: (value: RequisitionStatus) => (
        <StatusChip
          label={value}
          status={value}
          size="small"
          role="status"
        />
      )
    },
    {
      field: 'rate',
      header: 'Rate',
      sortable: true,
      width: '120px',
      hideOnMobile: true,
      renderCell: (value: number) => formatCurrency(value)
    },
    {
      field: 'deadline',
      header: 'Deadline',
      sortable: true,
      width: '150px',
      hideOnMobile: true,
      renderCell: (value: string) => formatDate(value)
    }
  ], [isMobile]);

  // Fetch requisitions with filters
  const fetchRequisitions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // API call would go here
      const response = await fetch('/api/requisitions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId,
          status,
          priority,
          page: paginationState.currentPage,
          pageSize: paginationState.pageSize
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch requisitions');
      }

      const data = await response.json();
      updateFromResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [clientId, status, priority, paginationState, updateFromResponse]);

  // Initial fetch and refetch on filter changes
  useEffect(() => {
    fetchRequisitions();
  }, [fetchRequisitions]);

  // Handle row click with keyboard support
  const handleRowClick = useCallback((requisition: Requisition) => {
    onRequisitionSelect?.(requisition);
  }, [onRequisitionSelect]);

  return (
    <ListContainer>
      <HeaderContainer>
        <Typography variant="h5" component="h2">
          Requisitions
          {loading && (
            <span className={visuallyHidden}>Loading requisitions</span>
          )}
        </Typography>
      </HeaderContainer>

      {error ? (
        <Typography color="error" role="alert">
          {error}
        </Typography>
      ) : (
        <Table
          columns={columns}
          data={[]} // Would come from API
          loading={loading}
          sortable
          filterable
          pagination={paginationState}
          onSort={(field, order) => {
            // Handle sort
          }}
          onFilter={(field, operator, value) => {
            // Handle filter
          }}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onRowClick={handleRowClick}
          emptyMessage="No requisitions found"
          loadingRows={5}
          stickyHeader
          aria-label="Requisitions list"
        />
      )}
    </ListContainer>
  );
});

RequisitionList.displayName = 'RequisitionList';

export default RequisitionList;