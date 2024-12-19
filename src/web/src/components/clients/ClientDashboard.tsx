/**
 * @fileoverview Client Dashboard component providing comprehensive client management
 * with real-time metrics, advanced filtering, and accessibility support following
 * Material Design 3.0 principles and WCAG 2.1 Level AA standards.
 * @version 1.0.0
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { useMediaQuery } from '@mui/material';
import { IClient, ClientStatus } from '../../interfaces/client.interface';
import Card from '../common/Card';
import DataGrid from '../common/DataGrid';
import { useTheme } from '@mui/material/styles';
import { GridColumn } from '../common/DataGrid';
import { PaginatedResponse, SortOrder, FilterOperator } from '../../interfaces/common.interface';
import { usePagination } from '../../hooks/usePagination';

// Constants for accessibility and UI
const ARIA_LABELS = {
  dashboard: 'Client management dashboard',
  metrics: 'Client metrics overview',
  clientList: 'Client list with filtering and sorting',
  totalClients: 'Total number of clients',
  activeClients: 'Number of active clients',
  openRequisitions: 'Number of open requisitions'
} as const;

// Styled components following Material Design 3.0
const DashboardContainer = styled.div`
  ${({ theme }) => `
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: ${theme.spacing(3)};
    padding: ${theme.spacing(3)};
    margin: 0 auto;
    max-width: 1440px;

    @media (max-width: ${theme.breakpoints.values.sm}px) {
      grid-template-columns: 1fr;
      padding: ${theme.spacing(2)};
    }
  `}
`;

const MetricsContainer = styled.div`
  ${({ theme }) => `
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: ${theme.spacing(2)};
    margin-bottom: ${theme.spacing(3)};

    @media (max-width: ${theme.breakpoints.values.md}px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (max-width: ${theme.breakpoints.values.sm}px) {
      grid-template-columns: 1fr;
    }
  `}
`;

const MetricCard = styled(Card)`
  ${({ theme }) => `
    padding: ${theme.spacing(2)};
    text-align: center;
    
    h3 {
      ${theme.typography.h6};
      color: ${theme.palette.text.secondary};
      margin-bottom: ${theme.spacing(1)};
    }
    
    p {
      ${theme.typography.h4};
      color: ${theme.palette.text.primary};
      margin: 0;
    }
  `}
`;

// Interface for client metrics
interface ClientMetrics {
  totalClients: number;
  activeClients: number;
  openRequisitions: number;
  averageRequisitionsPerClient: number;
}

/**
 * Custom hook for calculating client metrics with memoization
 */
const useClientMetrics = (clients: IClient[]): ClientMetrics => {
  return useMemo(() => {
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === ClientStatus.ACTIVE).length;
    const openRequisitions = clients.reduce((total, client) => 
      total + (client.requisitions?.filter(r => r.status === 'OPEN').length || 0), 0);
    
    return {
      totalClients,
      activeClients,
      openRequisitions,
      averageRequisitionsPerClient: totalClients ? openRequisitions / totalClients : 0
    };
  }, [clients]);
};

/**
 * Client Dashboard component providing comprehensive client management functionality
 */
export const ClientDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useDispatch();
  
  // State management
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  
  // Fetch clients from Redux store
  const clients = useSelector((state: any) => state.clients.data);
  const loading = useSelector((state: any) => state.clients.loading);
  const error = useSelector((state: any) => state.clients.error);
  
  // Calculate metrics
  const metrics = useClientMetrics(clients);
  
  // Pagination management
  const {
    paginationState,
    handlePageChange,
    handlePageSizeChange,
    updateFromResponse
  } = usePagination<IClient>();

  // Grid columns configuration with accessibility support
  const columns: GridColumn[] = useMemo(() => [
    {
      field: 'company_name',
      headerName: 'Company Name',
      flex: 2,
      minWidth: 200,
      ariaLabel: 'Company name column',
      renderCell: (params) => (
        <div role="cell" aria-label={`Company: ${params.value}`}>
          {params.value}
        </div>
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      minWidth: 120,
      ariaLabel: 'Client status column',
      renderCell: (params) => (
        <div role="cell" aria-label={`Status: ${params.value}`}>
          {params.value}
        </div>
      )
    },
    {
      field: 'industry',
      headerName: 'Industry',
      flex: 1.5,
      minWidth: 150,
      ariaLabel: 'Industry column',
      responsiveHide: 'sm'
    },
    {
      field: 'created_at',
      headerName: 'Created',
      flex: 1,
      minWidth: 120,
      ariaLabel: 'Creation date column',
      responsiveHide: 'sm',
      valueFormatter: (params) => new Date(params.value).toLocaleDateString()
    }
  ], []);

  // Event handlers
  const handleSortChange = useCallback((field: string, order: SortOrder) => {
    dispatch({ type: 'SORT_CLIENTS', payload: { field, order } });
  }, [dispatch]);

  const handleFilterChange = useCallback((field: string, operator: FilterOperator, value: any) => {
    dispatch({ type: 'FILTER_CLIENTS', payload: { field, operator, value } });
  }, [dispatch]);

  const handleSelectionChange = useCallback((selectedIds: string[]) => {
    setSelectedClients(selectedIds);
  }, []);

  return (
    <div role="main" aria-label={ARIA_LABELS.dashboard}>
      <DashboardContainer>
        <MetricsContainer role="region" aria-label={ARIA_LABELS.metrics}>
          <MetricCard elevation={2} ariaLabel={ARIA_LABELS.totalClients}>
            <h3>Total Clients</h3>
            <p>{metrics.totalClients}</p>
          </MetricCard>
          
          <MetricCard elevation={2} ariaLabel={ARIA_LABELS.activeClients}>
            <h3>Active Clients</h3>
            <p>{metrics.activeClients}</p>
          </MetricCard>
          
          <MetricCard elevation={2} ariaLabel={ARIA_LABELS.openRequisitions}>
            <h3>Open Requisitions</h3>
            <p>{metrics.openRequisitions}</p>
          </MetricCard>
        </MetricsContainer>

        <DataGrid<IClient>
          columns={columns}
          rows={clients}
          loading={loading}
          error={error}
          selectable
          sortable
          filterable
          pagination={paginationState}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onSortChange={handleSortChange}
          onFilterChange={handleFilterChange}
          onSelectionChange={handleSelectionChange}
          getRowId={(row) => row.id}
          aria-label={ARIA_LABELS.clientList}
        />
      </DashboardContainer>
    </div>
  );
};

export default ClientDashboard;