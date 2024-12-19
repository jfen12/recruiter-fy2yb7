/**
 * @fileoverview 404 Not Found page component implementing Material Design 3.0 principles
 * with enhanced accessibility features and responsive design.
 * @version 1.0.0
 */

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Container } from '@mui/material';
import { styled } from '@mui/material/styles';

// Internal imports
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';

// Styled components with Material Design 3.0 principles
const NotFoundContainer = styled(Container)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 'calc(100vh - 200px)', // Account for header/footer
  textAlign: 'center',
  padding: theme.spacing(3),
  animation: 'fadeIn 0.3s ease-in-out',
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
  },
}));

const ErrorCode = styled(Typography)(({ theme }) => ({
  fontSize: 'clamp(3rem, 8vw, 6rem)',
  fontWeight: 700,
  color: theme.palette.primary.main,
  marginBottom: theme.spacing(2),
  lineHeight: 1.2,
}));

const ErrorMessage = styled(Typography)(({ theme }) => ({
  fontSize: 'clamp(1.25rem, 4vw, 2rem)',
  fontWeight: 500,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(4),
  maxWidth: '600px',
}));

const Description = styled(Typography)(({ theme }) => ({
  fontSize: 'clamp(1rem, 2vw, 1.25rem)',
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(4),
  maxWidth: '800px',
}));

/**
 * NotFound page component that displays a user-friendly 404 error message
 * with navigation options and accessibility features
 */
const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Focus management for accessibility
  useEffect(() => {
    // Set focus to the primary action button on mount
    buttonRef.current?.focus();
  }, []);

  // Navigation handler
  const handleNavigateHome = () => {
    navigate('/');
  };

  return (
    <Layout>
      <NotFoundContainer>
        <Box
          component="main"
          role="main"
          aria-labelledby="not-found-title"
        >
          <ErrorCode
            variant="h1"
            id="not-found-title"
            aria-label="Error 404 - Page Not Found"
          >
            404
          </ErrorCode>

          <ErrorMessage
            variant="h2"
            gutterBottom
            aria-live="polite"
          >
            Page Not Found
          </ErrorMessage>

          <Description
            variant="body1"
            paragraph
            aria-live="polite"
          >
            The page you're looking for doesn't exist or has been moved.
            Please check the URL or navigate back to the homepage.
          </Description>

          <Button
            ref={buttonRef}
            variant="contained"
            color="primary"
            size="large"
            onClick={handleNavigateHome}
            aria-label="Return to homepage"
            disableRipple={false}
          >
            Return to Homepage
          </Button>
        </Box>
      </NotFoundContainer>
    </Layout>
  );
};

export default NotFound;