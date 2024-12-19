import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components'; // v5.3.0
import { ICandidate } from '../../interfaces/candidate.interface';
import Card from '../common/Card';
import { truncateText } from '../../utils/formatting';

/**
 * Props interface for CandidateCard component with enhanced accessibility options
 */
interface CandidateCardProps {
  /** Candidate data to display */
  candidate: ICandidate;
  /** Optional click handler for card selection */
  onClick?: (id: string) => void;
  /** Optional selected state for the card */
  selected?: boolean;
  /** Optional high contrast mode flag */
  highContrast?: boolean;
}

/**
 * Styled card container with Material Design elevation and responsive layout
 */
const StyledCandidateCard = styled(Card)<{ selected?: boolean; highContrast?: boolean }>`
  width: 100%;
  max-width: min(400px, calc(100vw - 32px));
  margin-bottom: 16px;
  cursor: ${props => props.onClick ? 'pointer' : 'default'};
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;

  &:hover {
    transform: ${props => props.onClick ? 'translateY(-2px)' : 'none'};
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.palette.primary.main};
    outline-offset: 2px;
  }

  ${props => props.selected && `
    border: 2px solid ${props.theme.palette.primary.main};
  `}

  ${props => props.highContrast && `
    border: 3px solid ${props.theme.palette.common.black};
  `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  @media (max-width: 768px) {
    margin-bottom: 12px;
  }
`;

/**
 * Styled container for candidate name with proper typography
 */
const CandidateName = styled.h3`
  font-size: 1.125rem;
  font-weight: 500;
  color: ${props => props.theme.palette.text.primary};
  margin: 0 0 8px 0;
  line-height: 1.5;
`;

/**
 * Styled container for skills list with proper spacing
 */
const SkillsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
`;

/**
 * Styled skill chip with proper contrast and hover states
 */
const SkillChip = styled.span<{ highContrast?: boolean }>`
  background-color: ${props => props.highContrast 
    ? props.theme.palette.common.black 
    : props.theme.palette.background.contrast};
  color: ${props => props.highContrast 
    ? props.theme.palette.common.white 
    : props.theme.palette.text.primary};
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: nowrap;
`;

/**
 * Styled status indicator with proper WCAG contrast
 */
const StatusIndicator = styled.div<{ status: string; highContrast?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  background-color: ${props => getStatusColor(props.status, props.highContrast)};
  color: ${props => props.highContrast ? '#000000' : '#FFFFFF'};
`;

/**
 * Returns the appropriate color for candidate status with contrast checking
 */
const getStatusColor = (status: string, highContrast?: boolean): string => {
  if (highContrast) {
    return '#000000';
  }

  switch (status) {
    case 'ACTIVE':
      return '#4CAF50';
    case 'INACTIVE':
      return '#9E9E9E';
    case 'PLACED':
      return '#2196F3';
    case 'BLACKLISTED':
      return '#F44336';
    default:
      return '#9E9E9E';
  }
};

/**
 * CandidateCard component displaying candidate information with accessibility support
 */
const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  onClick,
  selected = false,
  highContrast = false
}) => {
  // Memoize formatted candidate name
  const fullName = useMemo(() => {
    return `${candidate.first_name} ${candidate.last_name}`;
  }, [candidate.first_name, candidate.last_name]);

  // Memoize truncated skills list
  const displaySkills = useMemo(() => {
    return candidate.skills
      .slice(0, 3)
      .map(skill => truncateText(skill.name, 20));
  }, [candidate.skills]);

  // Click handler with keyboard support
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(candidate.id);
    }
  }, [onClick, candidate.id]);

  // Keyboard handler for accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  return (
    <StyledCandidateCard
      elevation={selected ? 2 : 1}
      padding={16}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      selected={selected}
      highContrast={highContrast}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-selected={selected}
      aria-label={`Candidate ${fullName}`}
      data-testid={`candidate-card-${candidate.id}`}
    >
      <CandidateName>
        {fullName}
      </CandidateName>

      <SkillsList aria-label="Candidate skills">
        {displaySkills.map((skill, index) => (
          <SkillChip
            key={`${candidate.id}-skill-${index}`}
            highContrast={highContrast}
          >
            {skill}
          </SkillChip>
        ))}
      </SkillsList>

      <StatusIndicator
        status={candidate.status}
        highContrast={highContrast}
        aria-label={`Status: ${candidate.status.toLowerCase()}`}
      >
        {candidate.status}
      </StatusIndicator>
    </StyledCandidateCard>
  );
};

// Add display name for debugging
CandidateCard.displayName = 'CandidateCard';

export default CandidateCard;