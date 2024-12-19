/**
 * @fileoverview Enhanced skills matrix component for visualizing and managing candidate skills
 * with proficiency levels and job requirement matching. Implements Material Design 3.0
 * principles with comprehensive accessibility support and performance optimizations.
 * @version 1.0.0
 */

import React, { useCallback, useMemo, useRef } from 'react';
import styled from '@mui/material/styles/styled';
import { Chip, Tooltip, LinearProgress, useTheme } from '@mui/material';
import { ISkill, SkillProficiency } from '../../interfaces/candidate.interface';
import { RequiredSkill } from '../../interfaces/requisition.interface';
import DataGrid from '../common/DataGrid';

// Constants for accessibility and UX
const ARIA_LABELS = {
  matrix: 'Skills matrix showing candidate proficiency levels and job requirement matches',
  proficiency: 'Skill proficiency level: {level}',
  match: 'Skill match score: {score}%',
  gap: 'Experience gap: {years} years needed',
  update: 'Skill {name} updated to {level}',
} as const;

// Styled components following Material Design 3.0
const MatrixContainer = styled('div')`
  ${({ theme }) => `
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(2)};
    padding: ${theme.spacing(2)};
    background: ${theme.palette.background.paper};
    border-radius: ${theme.shape.borderRadius}px;
    box-shadow: ${theme.shadows[1]};
  `}
`;

const SkillChip = styled(Chip)<{ matchScore: number }>`
  ${({ theme, matchScore }) => `
    background-color: ${
      matchScore >= 90 ? theme.palette.success.main :
      matchScore >= 70 ? theme.palette.warning.main :
      theme.palette.error.main
    };
    color: ${theme.palette.getContrastText(
      matchScore >= 90 ? theme.palette.success.main :
      matchScore >= 70 ? theme.palette.warning.main :
      theme.palette.error.main
    )};
    font-weight: ${theme.typography.fontWeightMedium};
  `}
`;

const ProficiencyIndicator = styled(LinearProgress)`
  ${({ theme }) => `
    height: 8px;
    border-radius: ${theme.shape.borderRadius}px;
    background-color: ${theme.palette.grey[200]};
    
    .MuiLinearProgress-bar {
      border-radius: ${theme.shape.borderRadius}px;
    }
  `}
`;

// Enhanced interfaces for component props and state
interface SkillsMatrixProps {
  candidateSkills: ISkill[];
  requiredSkills?: RequiredSkill[];
  onSkillUpdate?: (skill: ISkill) => void;
  readOnly?: boolean;
  className?: string;
  isLoading?: boolean;
  onError?: (error: Error) => void;
}

interface SkillMatchScore {
  skillName: string;
  matchPercentage: number;
  missingYears: number;
  proficiencyGap: number;
  weightedScore: number;
}

// Utility function to calculate weighted skill match score
const calculateSkillMatch = (candidateSkill: ISkill, requiredSkill: RequiredSkill): SkillMatchScore => {
  const proficiencyValues = {
    [SkillProficiency.BEGINNER]: 1,
    [SkillProficiency.INTERMEDIATE]: 2,
    [SkillProficiency.ADVANCED]: 3,
    [SkillProficiency.EXPERT]: 4,
  };

  const candidateProficiencyValue = proficiencyValues[candidateSkill.proficiency_level];
  const requiredProficiencyValue = proficiencyValues[requiredSkill.required_level];
  
  const experienceMatch = Math.min(
    candidateSkill.years_of_experience / requiredSkill.minimum_years,
    1
  ) * 100;
  
  const proficiencyMatch = Math.min(
    candidateProficiencyValue / requiredProficiencyValue,
    1
  ) * 100;

  const missingYears = Math.max(
    0,
    requiredSkill.minimum_years - candidateSkill.years_of_experience
  );

  const proficiencyGap = Math.max(
    0,
    requiredProficiencyValue - candidateProficiencyValue
  );

  // Calculate weighted score with 60% weight on experience and 40% on proficiency
  const weightedScore = (experienceMatch * 0.6) + (proficiencyMatch * 0.4);

  return {
    skillName: candidateSkill.name,
    matchPercentage: Math.round(weightedScore),
    missingYears,
    proficiencyGap,
    weightedScore,
  };
};

/**
 * Enhanced SkillsMatrix component with accessibility and performance optimizations
 */
export const SkillsMatrix: React.FC<SkillsMatrixProps> = React.memo(({
  candidateSkills,
  requiredSkills = [],
  onSkillUpdate,
  readOnly = false,
  className,
  isLoading = false,
  onError,
}) => {
  const theme = useTheme();
  const announcerRef = useRef<HTMLDivElement>(null);

  // Memoized skill matches calculation
  const skillMatches = useMemo(() => {
    return candidateSkills.map(skill => {
      const requiredSkill = requiredSkills.find(req => req.skill_id === skill.name);
      return requiredSkill
        ? calculateSkillMatch(skill, requiredSkill)
        : null;
    });
  }, [candidateSkills, requiredSkills]);

  // Grid columns configuration with accessibility support
  const columns = useMemo(() => [
    {
      field: 'name',
      headerName: 'Skill',
      flex: 1,
      renderCell: (params: any) => (
        <Tooltip title={`${params.row.name} - ${params.row.proficiency_level}`}>
          <span>{params.row.name}</span>
        </Tooltip>
      ),
    },
    {
      field: 'proficiency_level',
      headerName: 'Proficiency',
      flex: 1,
      renderCell: (params: any) => (
        <ProficiencyIndicator
          variant="determinate"
          value={
            (proficiencyValues[params.row.proficiency_level] / 4) * 100
          }
          aria-label={ARIA_LABELS.proficiency.replace(
            '{level}',
            params.row.proficiency_level
          )}
        />
      ),
    },
    {
      field: 'years_of_experience',
      headerName: 'Experience',
      flex: 1,
      renderCell: (params: any) => (
        <span>{`${params.row.years_of_experience} years`}</span>
      ),
    },
    {
      field: 'match',
      headerName: 'Match',
      flex: 1,
      renderCell: (params: any) => {
        const match = skillMatches[params.row.id];
        if (!match) return null;

        return (
          <SkillChip
            label={`${match.matchPercentage}%`}
            matchScore={match.matchPercentage}
            aria-label={ARIA_LABELS.match.replace(
              '{score}',
              match.matchPercentage.toString()
            )}
          />
        );
      },
    },
  ], [skillMatches]);

  // Handle skill updates with announcements
  const handleSkillUpdate = useCallback((skill: ISkill) => {
    try {
      onSkillUpdate?.(skill);
      if (announcerRef.current) {
        announcerRef.current.textContent = ARIA_LABELS.update
          .replace('{name}', skill.name)
          .replace('{level}', skill.proficiency_level);
      }
    } catch (error) {
      onError?.(error as Error);
    }
  }, [onSkillUpdate, onError]);

  return (
    <MatrixContainer className={className}>
      <DataGrid
        rows={candidateSkills}
        columns={columns}
        loading={isLoading}
        getRowId={(row) => row.name}
        aria-label={ARIA_LABELS.matrix}
        onSelectionChange={readOnly ? undefined : handleSkillUpdate}
      />
      
      {/* Screen reader announcements */}
      <div
        ref={announcerRef}
        role="status"
        aria-live="polite"
        className="visually-hidden"
      />
    </MatrixContainer>
  );
});

SkillsMatrix.displayName = 'SkillsMatrix';

export default SkillsMatrix;