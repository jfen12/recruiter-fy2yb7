/**
 * @fileoverview Enhanced client list component with advanced features
 * Implements Material Design 3.0, accessibility, virtual scrolling, and responsive design
 * @version 1.0.0
 */

import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { Box, Typography, TextField, Skeleton, Alert, useMediaQuery } from '@mui/material';
import { styled } from '@mui/material/styles';
import { DataGrid, GridColDef, GridSortModel, GridFilterModel } from '@mui/x-data-grid'; // v6.0.0
import { debounce } from 'lodash'; // v4.17.21
import { Virtuoso } from 'react-virtuoso'; // v3.0.0

import { IClient, IClientListResponse, ClientStatus, IClientFilter } from '../../interfaces/client.interface';
import { getClients, searchClients, validateClient } from '../../api/clients';
import { UI_CONSTANTS } from '../../config/constants';
import { hasRole } from '../../utils/auth';
import { UserRole } from '../../interfaces/auth.interface';

// Styled components for enhanced UI
const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  '& .MuiDataGrid-root': {
    border: 'none',
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
  },
  '& .MuiDataGrid-cell': {
    padding: theme.spacing(2),
    '&:focus': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: -2,
    },
  },
}));

const SearchContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  display: 'flex',
  gap: theme.spacing(2),
  alignItems: 'center',
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
  },
}));

// Interface definitions
interface ClientListProps {
  onClientSelect: (client: IClient) => void;
  initialFilters?: IClientFilter;
  onError?: (error: Error) => void;
  customColumns?: ColumnConfig[];
}

interface ColumnConfig {
  field: keyof IClient;
  headerName: string;
  width: number;
  sortable?: boolean;
  filterable?: boolean;
}

// Default column configuration
const defaultColumns: GridColDef[] = [
  {
    field: 'company_name',
    headerName: 'Company Name',
    flex: 1,
    minWidth: 200,
    renderCell: (params) => (
      <Typography variant="body2" noWrap title={params.value}>
        {params.value}
      </Typography>
    ),
  },
  {
    field: 'industry',
    headerName: 'Industry',
    flex: 0.7,
    minWidth: 150,
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 120,
    renderCell: (params) => (
      <Box
        sx={{
          px: 2,
          py: 0.5,
          borderRadius: 1,
          bgcolor: params.value === ClientStatus.ACTIVE ? 'success.light' : 'warning.light',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {params.value}
        </Typography>
      </Box>
    ),
  },
  {
    field: 'contacts',
    headerName: 'Primary Contact',
    flex: 0.8,
    minWidth: 180,
    renderCell: (params) => {
      const primaryContact = params.value?.find((contact: any) => contact.is_primary);
      return primaryContact ? (
        <Typography variant="body2" noWrap title={primaryContact.name}>
          {primaryContact.name}
        </Typography>
      ) : null;
    },
  },
];

/**
 * Enhanced ClientList component with advanced features and optimizations
 */
const ClientList: React.FC<ClientListProps> = React.memo(({
  onClientSelect,
  initialFilters,
  onError,
  customColumns,
}) => {
  // State management
  const [clients, setClients] = useState<IClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [filterModel, setFilterModel] = useState<GridFilterModel>({
    items: [],
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Refs for optimization
  const abortControllerRef = useRef<AbortController>();
  const isInitialMount = useRef(true);

  // Responsive design hooks
  const isMobile = useMediaQuery((theme: any) => theme.breakpoints.down('sm'));

  // Memoized columns configuration
  const columns = useMemo(() => {
    const baseColumns = customColumns || defaultColumns;
    return isMobile
      ? baseColumns.filter((col) => ['company_name', 'status'].includes(col.field))
      : baseColumns;
  }, [customColumns, isMobile]);

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      try {
        setLoading(true);
        const response = await searchClients({
          query,
          page: page + 1,
          limit: pageSize,
        });
        setClients(response.data);
        setTotal(response.total);
      } catch (err) {
        handleError(err as Error);
      } finally {
        setLoading(false);
      }
    }, 300),
    [page, pageSize]
  );

  // Error handler
  const handleError = (err: Error) => {
    const errorMessage = err.message || 'An error occurred while fetching clients';
    setError(errorMessage);
    onError?.(err);
  };

  // Fetch clients with pagination, sorting, and filtering
  const fetchClients = useCallback(async () => {
    try {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setLoading(true);
      const hasAccess = await hasRole(UserRole.SALES_REP);
      if (!hasAccess) {
        throw new Error('Insufficient permissions to view clients');
      }

      const response = await getClients({
        page: page + 1,
        limit: pageSize,
        sortBy: sortModel[0]?.field,
        sortOrder: sortModel[0]?.sort,
        ...filterModel,
        signal: abortControllerRef.current.signal,
      });

      // Validate client data
      response.data.forEach(validateClient);

      setClients(response.data);
      setTotal(response.total);
      setError(null);
    } catch (err) {
      if (err.name !== 'AbortError') {
        handleError(err as Error);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortModel, filterModel]);

  // Effect for initial load and updates
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (initialFilters) {
        setFilterModel({ items: Object.entries(initialFilters).map(([field, value]) => ({
          field,
          operator: 'equals',
          value,
        }))});
      }
    } else {
      if (searchQuery) {
        debouncedSearch(searchQuery);
      } else {
        fetchClients();
      }
    }

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchClients, debouncedSearch, searchQuery, initialFilters]);

  // Render loading skeleton
  if (loading && !clients.length) {
    return (
      <Box>
        {[...Array(5)].map((_, index) => (
          <Skeleton
            key={index}
            variant="rectangular"
            height={60}
            sx={{ my: 1, borderRadius: 1 }}
          />
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <SearchContainer>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            'aria-label': 'Search clients',
          }}
        />
      </SearchContainer>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <StyledDataGrid
        rows={clients}
        columns={columns}
        pagination
        paginationMode="server"
        sortingMode="server"
        filterMode="server"
        rowCount={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortModelChange={setSortModel}
        onFilterModelChange={setFilterModel}
        onRowClick={(params) => onClientSelect(params.row)}
        loading={loading}
        disableColumnMenu={isMobile}
        autoHeight
        getRowId={(row) => row.id}
        sx={{ minHeight: 400 }}
        aria-label="Client list"
        components={{
          NoRowsOverlay: () => (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No clients found
              </Typography>
            </Box>
          ),
        }}
      />
    </Box>
  );
});

ClientList.displayName = 'ClientList';

export default ClientList;