import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { Tabs, Tab, Box, Typography, Button, useTheme, useMediaQuery } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RequisitionBoard from '../components/requisitions/RequisitionBoard';
import RequisitionList from '../components/requisitions/RequisitionList';
import RequisitionForm from '../components/requisitions/RequisitionForm';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { flexLayout, smoothTransition } from '../styles/mixins';
import { useNotification } from '../hooks/useNotification';
import { Requisition } from '../interfaces/requisition.interface';

// Styled components with Material Design 3.0 principles
const PageContainer = styled.div`
  ${flexLayout({
    direction: 'column',
    gap: '24px'
  })};
  padding: ${({ theme }) => theme.spacing(3)};
  height: 100%;
  background-color: ${({ theme }) => theme.palette.background.default};
  overflow: hidden;

  @media (max-width: 768px) {
    padding: ${({ theme }) => theme.spacing(2)};
  }
`;

const Header = styled.div`
  ${flexLayout({
    justify: 'space-between',
    align: 'center',
    gap: '16px'
  })};
  margin-bottom: ${({ theme }) => theme.spacing(3)};

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const TabsContainer = styled.div`
  ${flexLayout({
    direction: 'column'
  })};
  flex: 1;
  min-height: 0;
  ${smoothTransition(['background-color'])};
`;

const ContentContainer = styled.div`
  flex: 1;
  overflow: auto;
  padding: ${({ theme }) => theme.spacing(2)};
  background-color: ${({ theme }) => theme.palette.background.paper};
  border-radius: ${({ theme }) => theme.shape.borderRadius}px;
`;

// Interface for page state
interface RequisitionsPageState {
  activeTab: number;
  isFormModalOpen: boolean;
  selectedRequisitionId: string | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Main page component for managing job requisitions with enhanced accessibility
 */
const RequisitionsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { showNotification } = useNotification();
  const dispatch = useDispatch();

  // Local state management
  const [state, setState] = useState<RequisitionsPageState>({
    activeTab: 0,
    isFormModalOpen: false,
    selectedRequisitionId: null,
    isLoading: false,
    error: null
  });

  // Handle tab changes with accessibility announcements
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setState(prev => ({ ...prev, activeTab: newValue }));
    const viewType = newValue === 0 ? 'board' : 'list';
    showNotification({
      message: `Switched to ${viewType} view`,
      type: 'info',
      duration: 2000,
      ariaLive: 'polite'
    });
  }, [showNotification]);

  // Handle requisition selection
  const handleRequisitionSelect = useCallback((requisition: Requisition) => {
    setState(prev => ({
      ...prev,
      selectedRequisitionId: requisition.id,
      isFormModalOpen: true
    }));
  }, []);

  // Handle form modal state
  const handleFormModalClose = useCallback(() => {
    setState(prev => ({
      ...prev,
      isFormModalOpen: false,
      selectedRequisitionId: null
    }));
  }, []);

  // Handle new requisition creation
  const handleCreateRequisition = useCallback(() => {
    setState(prev => ({
      ...prev,
      isFormModalOpen: true,
      selectedRequisitionId: null
    }));
  }, []);

  // Handle form submission
  const handleFormSubmit = useCallback(async (values: Requisition) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      // API call would go here
      showNotification({
        message: `Requisition ${state.selectedRequisitionId ? 'updated' : 'created'} successfully`,
        type: 'success'
      });
      handleFormModalClose();
    } catch (error) {
      showNotification({
        message: 'Failed to save requisition',
        type: 'error'
      });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.selectedRequisitionId, showNotification, handleFormModalClose]);

  return (
    <ErrorBoundary>
      <PageContainer>
        <Header>
          <Typography
            variant="h4"
            component="h1"
            aria-label="Job Requisitions Management"
          >
            Job Requisitions
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateRequisition}
            aria-label="Create new requisition"
          >
            {isMobile ? 'New' : 'New Requisition'}
          </Button>
        </Header>

        <TabsContainer>
          <Tabs
            value={state.activeTab}
            onChange={handleTabChange}
            aria-label="Requisition view options"
            variant={isMobile ? 'fullWidth' : 'standard'}
          >
            <Tab
              label="Board View"
              id="requisitions-tab-0"
              aria-controls="requisitions-tabpanel-0"
            />
            <Tab
              label="List View"
              id="requisitions-tab-1"
              aria-controls="requisitions-tabpanel-1"
            />
          </Tabs>

          <ContentContainer
            role="tabpanel"
            id={`requisitions-tabpanel-${state.activeTab}`}
            aria-labelledby={`requisitions-tab-${state.activeTab}`}
          >
            {state.activeTab === 0 ? (
              <RequisitionBoard
                onRequisitionClick={handleRequisitionSelect}
              />
            ) : (
              <RequisitionList
                onRequisitionSelect={handleRequisitionSelect}
              />
            )}
          </ContentContainer>
        </TabsContainer>

        {state.isFormModalOpen && (
          <RequisitionForm
            initialValues={state.selectedRequisitionId ? {} : undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleFormModalClose}
            isEdit={Boolean(state.selectedRequisitionId)}
          />
        )}
      </PageContainer>
    </ErrorBoundary>
  );
};

export default RequisitionsPage;