import React, { useCallback } from 'react';
import styled from 'styled-components'; // v5.3.0
import { format } from 'date-fns'; // v2.30.0
import Card from '../common/Card';
import { Requisition, RequisitionStatus, SkillLevel } from '../../interfaces/requisition.interface';
import { truncateText, flexLayout, smoothTransition } from '../../styles/mixins';

// Enhanced props interface with accessibility and theme support
interface RequisitionCardProps {
  /** Requisition data object */
  requisition: Requisition;
  /** Optional click handler for card interaction */
  onClick?: (requisition: Requisition) => void;
  /** Optional CSS class name */
  className?: string;
  /** Toggle for high contrast mode */
  highContrastMode?: boolean;
  /** Custom aria label for accessibility */
  ariaLabel?: string;
}

// Styled components with enhanced accessibility and responsive design
const StyledCard = styled(Card)<{ isClickable: boolean }>`
  width: 100%;
  max-width: 400px;
  margin-bottom: 16px;
  cursor: ${props => props.isClickable ? 'pointer' : 'default'};
  ${smoothTransition(['transform', 'box-shadow'])}

  &:hover {
    transform: ${props => props.isClickable ? 'translateY(-2px)' : 'none'};
  }

  @media (prefers-reduced-motion: reduce) {
    transform: none;
  }
`;

const CardHeader = styled.div`
  ${flexLayout({
    direction: 'row',
    justify: 'space-between',
    align: 'flex-start',
    gap: '16px'
  })}
  margin-bottom: 16px;

  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

const Title = styled.h3`
  ${truncateText(2)}
  margin: 0;
  font-size: 1.25rem;
  color: ${props => props.theme.mode === 'dark' 
    ? props.theme.palette.text.primary 
    : props.theme.palette.text.primary};
`;

const StatusBadge = styled.span<{ status: RequisitionStatus }>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  background-color: ${props => {
    switch (props.status) {
      case RequisitionStatus.OPEN:
        return props.theme.palette.success.main;
      case RequisitionStatus.IN_PROGRESS:
        return props.theme.palette.info.main;
      case RequisitionStatus.ON_HOLD:
        return props.theme.palette.warning.main;
      case RequisitionStatus.CLOSED:
        return props.theme.palette.error.main;
      default:
        return props.theme.palette.secondary.main;
    }
  }};
  color: ${props => {
    const backgroundColor = props.theme.palette[
      props.status === RequisitionStatus.OPEN ? 'success' :
      props.status === RequisitionStatus.IN_PROGRESS ? 'info' :
      props.status === RequisitionStatus.ON_HOLD ? 'warning' :
      props.status === RequisitionStatus.CLOSED ? 'error' : 'secondary'
    ].main;
    return props.theme.palette.getContrastText(backgroundColor);
  }};
`;

const SkillsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 16px 0;
  ${flexLayout({
    direction: 'row',
    wrap: 'wrap',
    gap: '8px'
  })}
`;

const SkillItem = styled.li<{ level: SkillLevel }>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.875rem;
  background-color: ${props => props.theme.palette.background.contrast};
  border: 1px solid ${props => props.theme.palette.divider};
  
  &::after {
    content: '${props => "•".repeat(
      props.level === SkillLevel.EXPERT ? 4 :
      props.level === SkillLevel.ADVANCED ? 3 :
      props.level === SkillLevel.INTERMEDIATE ? 2 : 1
    )}';
    margin-left: 4px;
    color: ${props => props.theme.palette.primary.main};
  }
`;

const DeadlineText = styled.time`
  display: block;
  margin-top: 16px;
  font-size: 0.875rem;
  color: ${props => props.theme.palette.text.secondary};
`;

/**
 * A Material Design 3.0 card component for displaying job requisition information.
 * Implements WCAG 2.1 Level AA accessibility standards and responsive design patterns.
 */
export const RequisitionCard: React.FC<RequisitionCardProps> = React.memo(({
  requisition,
  onClick,
  className,
  highContrastMode = false,
  ariaLabel
}) => {
  // Memoize click handler to prevent unnecessary re-renders
  const handleClick = useCallback(() => {
    onClick?.(requisition);
  }, [onClick, requisition]);

  // Format deadline date with localization support
  const formattedDeadline = format(new Date(requisition.deadline), 'PPP');

  return (
    <StyledCard
      elevation={2}
      isClickable={Boolean(onClick)}
      onClick={handleClick}
      className={className}
      highContrastMode={highContrastMode}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel || `Job requisition for ${requisition.title}`}
      data-testid="requisition-card"
    >
      <CardHeader>
        <Title>{requisition.title}</Title>
        <StatusBadge 
          status={requisition.status}
          aria-label={`Status: ${requisition.status.toLowerCase()}`}
        >
          {requisition.status}
        </StatusBadge>
      </CardHeader>

      <div>
        <strong>Rate: </strong>
        <span aria-label={`${requisition.rate} dollars per hour`}>
          ${requisition.rate}/hr
        </span>
      </div>

      <SkillsList aria-label="Required skills">
        {requisition.required_skills.map(skill => (
          <SkillItem
            key={skill.skill_id}
            level={skill.required_level}
            aria-label={`${skill.skill_id} - ${skill.required_level.toLowerCase()} level required`}
          >
            {skill.skill_id}
          </SkillItem>
        ))}
      </SkillsList>

      <DeadlineText dateTime={requisition.deadline.toISOString()}>
        Deadline: {formattedDeadline}
      </DeadlineText>
    </StyledCard>
  );
});

// Display name for debugging
RequisitionCard.displayName = 'RequisitionCard';

export default RequisitionCard;