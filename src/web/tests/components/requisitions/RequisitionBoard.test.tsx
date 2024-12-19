import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { act } from 'react-dom/test-utils';
import RequisitionBoard from '../../src/components/requisitions/RequisitionBoard';
import { Requisition, RequisitionStatus } from '../../src/interfaces/requisition.interface';
import { RequisitionState } from '../../src/store/reducers/requisitionReducer';

// Mock react-beautiful-dnd
jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children, onDragEnd }: any) => children,
  Droppable: ({ children }: any) => children({
    draggableProps: {
      style: {},
    },
    innerRef: jest.fn(),
  }, {}),
  Draggable: ({ children }: any) => children({
    draggableProps: {
      style: {},
    },
    innerRef: jest.fn(),
    dragHandleProps: {},
  }, {}),
}));

// Mock sample requisitions data
const mockRequisitions: Requisition[] = [
  {
    id: '1',
    title: 'Senior Developer',
    client_id: 'client1',
    status: RequisitionStatus.OPEN,
    rate: 100,
    deadline: new Date('2024-12-31'),
    required_skills: [
      { skill_id: 'js', required_level: 'EXPERT', minimum_years: 5, is_mandatory: true }
    ],
    description: 'Senior developer position',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    title: 'DevOps Engineer',
    client_id: 'client1',
    status: RequisitionStatus.IN_PROGRESS,
    rate: 90,
    deadline: new Date('2024-12-31'),
    required_skills: [
      { skill_id: 'aws', required_level: 'ADVANCED', minimum_years: 3, is_mandatory: true }
    ],
    description: 'DevOps engineer position',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Helper function to setup test store
const setupTestStore = (initialState: Partial<RequisitionState> = {}) => {
  return configureStore({
    reducer: {
      requisitions: (state = {
        requisitions: mockRequisitions,
        loading: false,
        error: null,
        total: mockRequisitions.length,
        currentPage: 1,
        lastUpdated: Date.now(),
        stateVersion: 1,
        ...initialState
      }) => state
    }
  });
};

// Helper function to render component with Redux store
const renderWithRedux = (
  ui: React.ReactElement,
  initialState: Partial<RequisitionState> = {}
) => {
  const store = setupTestStore(initialState);
  return {
    ...render(
      <Provider store={store}>
        {ui}
      </Provider>
    ),
    store
  };
};

// Helper function to simulate drag and drop
const simulateDragAndDrop = async (draggableId: string, destinationId: string) => {
  const mockDragEvent = {
    draggableId,
    type: 'DEFAULT',
    source: {
      index: 0,
      droppableId: 'OPEN'
    },
    destination: {
      droppableId: destinationId,
      index: 0
    }
  };

  await act(async () => {
    fireEvent(window, new Event('dragstart'));
    fireEvent(window, new Event('drag'));
    fireEvent(window, new Event('dragend', { detail: mockDragEvent }));
  });
};

describe('RequisitionBoard Component', () => {
  beforeEach(() => {
    // Reset window dimensions
    window.innerWidth = 1024;
    window.innerHeight = 768;
  });

  it('renders all columns with correct requisitions', () => {
    renderWithRedux(<RequisitionBoard />);

    // Verify column headers
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();

    // Verify requisition cards
    expect(screen.getByText('Senior Developer')).toBeInTheDocument();
    expect(screen.getByText('DevOps Engineer')).toBeInTheDocument();

    // Verify Material Design elevation
    const columns = screen.getAllByRole('region');
    columns.forEach(column => {
      expect(column).toHaveStyle('box-shadow: 0 2px 4px rgba(0,0,0,0.2)');
    });
  });

  it('handles drag and drop between columns', async () => {
    const { store } = renderWithRedux(<RequisitionBoard />);

    // Simulate drag and drop
    await simulateDragAndDrop('1', 'IN_PROGRESS');

    // Verify store update
    const state = store.getState();
    expect(state.requisitions.requisitions[0].status).toBe(RequisitionStatus.IN_PROGRESS);

    // Verify UI update
    const inProgressColumn = screen.getByRole('region', { name: /in progress/i });
    expect(within(inProgressColumn).getByText('Senior Developer')).toBeInTheDocument();
  });

  it('maintains accessibility during drag operations', async () => {
    renderWithRedux(<RequisitionBoard />);

    // Verify ARIA attributes
    const board = screen.getByRole('region', { name: /requisition board/i });
    expect(board).toHaveAttribute('aria-label', 'Requisition board');

    const columns = screen.getAllByRole('region');
    columns.forEach(column => {
      expect(column).toHaveAttribute('aria-label');
    });

    // Verify keyboard navigation
    const cards = screen.getAllByRole('button');
    cards.forEach(card => {
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    // Verify focus management
    fireEvent.keyDown(cards[0], { key: 'Space' });
    expect(cards[0]).toHaveAttribute('aria-grabbed', 'true');
  });

  it('adapts layout for mobile viewport', async () => {
    // Set mobile viewport
    window.innerWidth = 375;
    fireEvent(window, new Event('resize'));

    renderWithRedux(<RequisitionBoard />);

    // Verify column stacking
    const board = screen.getByRole('region', { name: /requisition board/i });
    expect(board).toHaveStyle('flex-direction: column');

    // Verify touch interactions
    const card = screen.getByText('Senior Developer').closest('div');
    expect(card).toHaveAttribute('draggable', 'true');

    // Verify responsive padding
    expect(board).toHaveStyle('padding: 16px');
  });

  it('handles loading state correctly', () => {
    renderWithRedux(<RequisitionBoard />, { loading: true });

    // Verify loading indicators
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Loading requisitions...')).toBeInTheDocument();
  });

  it('handles error state appropriately', () => {
    const error = {
      message: 'Failed to load requisitions',
      code: 'REQ_LOAD_ERROR'
    };

    renderWithRedux(<RequisitionBoard />, { error });

    // Verify error message
    expect(screen.getByText(error.message)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('updates column counts correctly', async () => {
    renderWithRedux(<RequisitionBoard />);

    const openColumn = screen.getByRole('region', { name: /open requisitions/i });
    const openCount = within(openColumn).getByText('1');
    expect(openCount).toBeInTheDocument();

    // Simulate adding a new requisition
    await act(async () => {
      const newRequisition = {
        ...mockRequisitions[0],
        id: '3',
        title: 'New Position'
      };
      store.dispatch({ 
        type: 'requisition/createSuccess',
        payload: { requisition: newRequisition }
      });
    });

    // Verify updated count
    expect(within(openColumn).getByText('2')).toBeInTheDocument();
  });

  it('supports high contrast mode', () => {
    renderWithRedux(<RequisitionBoard />, { highContrastMode: true });

    const columns = screen.getAllByRole('region');
    columns.forEach(column => {
      expect(column).toHaveStyle({
        backgroundColor: '#FFFFFF',
        color: '#000000'
      });
    });
  });
});