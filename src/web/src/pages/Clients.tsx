/**
 * @fileoverview Main client management page component implementing Material Design 3.0
 * principles with comprehensive client management features, accessibility support,
 * and responsive design.
 * @version 1.0.0
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { Box, Button, Typography, useMediaQuery, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import { IClient, IClientListResponse, ClientStatus } from '../../interfaces/client.interface';
import ClientDashboard from '../components/clients/ClientDashboard';
import ClientList from '../components/clients/ClientList';
import ClientForm from '../components/clients/ClientForm';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { useNotification } from '../../hooks/useNotification';

// Styled components following Material Design 3.0
const PageContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
}));

const HeaderContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(3),
}));

const ViewToggleContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  alignItems: 'center',
}));

// Interface for page-level state
interface ClientPageState {
  isFormOpen: boolean;
  selectedClient: IClient | null;
  view: 'dashboard' | 'list';
  error: Error | null;
}

/**
 * Main Clients page component with comprehensive client management capabilities
 */
const Clients: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { showNotification } = useNotification();

  // Page-level state management
  const [state, setState] = useState<ClientPageState>({
    isFormOpen: false,
    selectedClient: null,
    view: 'dashboard',
    error: null,
  });

  // Handler for creating new clients
  const handleCreateClient = useCallback(() => {
    setState(prev => ({
      ...prev,
      isFormOpen: true,
      selectedClient: null,
    }));
  }, []);

  // Handler for editing existing clients
  const handleEditClient = useCallback((client: IClient) => {
    setState(prev => ({
      ...prev,
      isFormOpen: true,
      selectedClient: client,
    }));
  }, []);

  // Handler for form submission success
  const handleFormSuccess = useCallback((client: IClient) => {
    setState(prev => ({
      ...prev,
      isFormOpen: false,
      selectedClient: null,
    }));
    showNotification({
      message: `Client ${client.company_name} ${state.selectedClient ? 'updated' : 'created'} successfully`,
      type: 'success',
    });
  }, [showNotification, state.selectedClient]);

  // Handler for form cancellation
  const handleFormCancel = useCallback(() => {
    setState(prev => ({
      ...prev,
      isFormOpen: false,
      selectedClient: null,
    }));
  }, []);

  // Handler for view toggle
  const handleViewChange = useCallback((view: 'dashboard' | 'list') => {
    setState(prev => ({
      ...prev,
      view,
    }));
  }, []);

  // Error handler for API operations
  const handleError = useCallback((error: Error) => {
    setState(prev => ({
      ...prev,
      error,
    }));
    showNotification({
      message: error.message,
      type: 'error',
      duration: 5000,
    });
  }, [showNotification]);

  return (
    <ErrorBoundary onError={handleError}>
      <PageContainer>
        <HeaderContainer>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 'bold' }}
            aria-label="Client Management"
          >
            Clients
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {!isMobile && (
              <ViewToggleContainer>
                <Button
                  variant={state.view === 'dashboard' ? 'contained' : 'outlined'}
                  onClick={() => handleViewChange('dashboard')}
                  aria-pressed={state.view === 'dashboard'}
                >
                  Dashboard
                </Button>
                <Button
                  variant={state.view === 'list' ? 'contained' : 'outlined'}
                  onClick={() => handleViewChange('list')}
                  aria-pressed={state.view === 'list'}
                >
                  List View
                </Button>
              </ViewToggleContainer>
            )}

            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateClient}
              aria-label="Create new client"
            >
              {isMobile ? 'Add' : 'New Client'}
            </Button>
          </Box>
        </HeaderContainer>

        {state.view === 'dashboard' ? (
          <ClientDashboard onClientSelect={handleEditClient} />
        ) : (
          <ClientList onClientSelect={handleEditClient} />
        )}

        {state.isFormOpen && (
          <ClientForm
            mode={state.selectedClient ? 'edit' : 'create'}
            initialData={state.selectedClient}
            onSubmitSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        )}
      </PageContainer>
    </ErrorBoundary>
  );
};

export default Clients;