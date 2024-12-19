import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components'; // v5.3.0
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'; // v13.1.0
import RequisitionCard from './RequisitionCard';
import Card from '../common/Card';
import useTheme from '../../hooks/useTheme';
import { flexLayout, smoothTransition } from '../../styles/mixins';
import { Requisition, RequisitionStatus } from '../../interfaces/requisition.interface';

// Props interface with comprehensive documentation
interface RequisitionBoardProps {
  /** Optional CSS class name */
  className?: string;
  /** Handler for requisition click events */
  onRequisitionClick?: (requisition: Requisition) => void;
}

// Styled components with enhanced accessibility and responsive design
const BoardContainer = styled.div`
  ${flexLayout({
    direction: 'row',
    align: 'flex-start',
    gap: '24px'
  })}
  padding: 24px;
  min-height: calc(100vh - 200px);
  overflow-x: auto;
  scroll-padding: 24px;
  scroll-behavior: smooth;

  /* Reduced motion preference support */
  @media (prefers-reduced-motion) {
    scroll-behavior: auto;
  }

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    flex-direction: column;
    padding: 16px;
  }
`;

const Column = styled(Card)<{ isDraggingOver: boolean }>`
  min-width: 300px;
  max-width: 400px;
  height: fit-content;
  background-color: ${props => 
    props.isDraggingOver 
      ? props.theme.palette.background.contrast 
      : props.theme.palette.background.paper
  };
  ${smoothTransition(['background-color', 'box-shadow'])}

  /* Focus state for keyboard navigation */
  &:focus-within {
    box-shadow: ${props => props.theme.shadows.elevated};
  }

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    min-width: 100%;
    max-width: none;
  }
`;

const ColumnHeader = styled.div`
  ${flexLayout({
    direction: 'row',
    justify: 'space-between',
    align: 'center'
  })}
  margin-bottom: 16px;
`;

const ColumnTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 500;
  margin: 0;
  color: ${props => props.theme.palette.text.primary};
`;

const ItemCount = styled.span`
  padding: 4px 8px;
  border-radius: 16px;
  background-color: ${props => props.theme.palette.primary.main};
  color: ${props => props.theme.palette.primary.contrastText};
  font-size: 0.875rem;
  font-weight: 500;
`;

const DroppableArea = styled.div<{ isDraggingOver: boolean }>`
  min-height: 100px;
  padding: 8px 0;
  transition: background-color 0.2s ease;
  background-color: ${props => 
    props.isDraggingOver 
      ? props.theme.palette.action.hover 
      : 'transparent'
  };
`;

/**
 * A Kanban-style board component for managing job requisitions.
 * Implements Material Design 3.0 principles with enhanced accessibility features.
 */
const RequisitionBoard: React.FC<RequisitionBoardProps> = ({
  className,
  onRequisitionClick
}) => {
  // Theme and state management
  const { theme, isDarkMode } = useTheme();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);

  // Group requisitions by status using memoization
  const groupedRequisitions = useMemo(() => {
    return requisitions.reduce((acc, req) => {
      const status = req.status;
      if (!acc[status]) acc[status] = [];
      acc[status].push(req);
      return acc;
    }, {} as Record<RequisitionStatus, Requisition[]>);
  }, [requisitions]);

  // Handle drag end events with optimistic updates
  const handleDragEnd = useCallback((result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    setRequisitions(prevReqs => {
      const updatedReqs = [...prevReqs];
      const reqIndex = updatedReqs.findIndex(r => r.id === draggableId);
      
      if (reqIndex !== -1) {
        const [removed] = updatedReqs.splice(reqIndex, 1);
        removed.status = destination.droppableId as RequisitionStatus;
        updatedReqs.splice(destination.index, 0, removed);
      }
      
      return updatedReqs;
    });
  }, []);

  // Render column with proper ARIA roles and keyboard support
  const renderColumn = (status: RequisitionStatus, items: Requisition[]) => (
    <Droppable droppableId={status} key={status}>
      {(provided, snapshot) => (
        <Column
          elevation={2}
          isDraggingOver={snapshot.isDraggingOver}
          ref={provided.innerRef}
          {...provided.droppableProps}
          aria-label={`${status} requisitions`}
        >
          <ColumnHeader>
            <ColumnTitle>{status.replace('_', ' ')}</ColumnTitle>
            <ItemCount aria-label={`${items.length} items`}>
              {items.length}
            </ItemCount>
          </ColumnHeader>

          <DroppableArea isDraggingOver={snapshot.isDraggingOver}>
            {items.map((req, index) => (
              <Draggable key={req.id} draggableId={req.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                  >
                    <RequisitionCard
                      requisition={req}
                      onClick={onRequisitionClick}
                      highContrastMode={isDarkMode}
                      aria-label={`${req.title} - ${req.status}`}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </DroppableArea>
        </Column>
      )}
    </Droppable>
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <BoardContainer 
        className={className}
        role="region"
        aria-label="Requisition board"
      >
        {Object.entries(groupedRequisitions).map(([status, items]) =>
          renderColumn(status as RequisitionStatus, items)
        )}
      </BoardContainer>
    </DragDropContext>
  );
};

export default RequisitionBoard;