import React from 'react'; // v18.0.0
import styled from 'styled-components'; // v5.3.0
import { Box, Typography, Link } from '@mui/material'; // v5.0.0
import { palette } from '../../styles/colors';

/**
 * Fixed height of the footer in pixels
 * Ensures consistent layout across all viewports
 */
const FOOTER_HEIGHT = 64;

/**
 * Navigation links displayed in the footer
 * Each link includes accessibility attributes
 */
const FOOTER_LINKS = [
  {
    label: 'Privacy Policy',
    href: '/privacy',
    ariaLabel: 'View Privacy Policy'
  },
  {
    label: 'Terms of Service',
    href: '/terms',
    ariaLabel: 'View Terms of Service'
  },
  {
    label: 'Support',
    href: '/support',
    ariaLabel: 'Get Support'
  }
] as const;

/**
 * Props interface for the Footer component
 */
interface FooterProps {
  className?: string;
}

/**
 * Styled footer container following Material Design 3.0 principles
 * Implements responsive design and theme support
 */
const FooterContainer = styled.footer`
  height: ${FOOTER_HEIGHT}px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background-color: ${({ theme }) => theme.palette.background.paper};
  border-top: 1px solid ${({ theme }) => theme.palette.divider};
  position: relative;
  z-index: 1000;
  transition: all 0.2s ease-in-out;
  box-shadow: ${({ theme }) => theme.shadows[1]};

  @media (max-width: 768px) {
    padding: 0 16px;
    flex-direction: column;
    height: auto;
    padding-top: 16px;
    padding-bottom: 16px;
  }

  @media (max-width: 320px) {
    padding: 0 8px;
  }
`;

/**
 * Styled container for footer navigation links
 * Implements responsive spacing and touch-friendly targets
 */
const FooterLinks = styled.div`
  display: flex;
  gap: 24px;
  align-items: center;

  @media (max-width: 768px) {
    gap: 16px;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 8px;
  }

  @media (max-width: 320px) {
    gap: 8px;
  }

  & a {
    min-height: 44px;
    display: flex;
    align-items: center;
    color: ${({ theme }) => theme.palette.text.secondary};
    text-decoration: none;
    transition: color 0.2s ease-in-out;

    &:hover {
      color: ${({ theme }) => theme.palette.primary.main};
    }

    &:focus-visible {
      outline: 2px solid ${({ theme }) => theme.palette.primary.main};
      outline-offset: 2px;
      border-radius: 4px;
    }
  }
`;

/**
 * Footer component that provides consistent application-wide footer content
 * Implements Material Design 3.0 principles with responsive design and accessibility
 */
const Footer: React.FC<FooterProps> = React.memo(({ className }) => {
  const currentYear = new Date().getFullYear();

  return (
    <FooterContainer className={className}>
      <Box component="div" sx={{ textAlign: { xs: 'center', md: 'left' } }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
        >
          © {currentYear} RefactorTrack. All rights reserved.
        </Typography>
      </Box>

      <FooterLinks>
        {FOOTER_LINKS.map(({ label, href, ariaLabel }) => (
          <Link
            key={href}
            href={href}
            aria-label={ariaLabel}
            underline="none"
            sx={{
              fontSize: { xs: '0.875rem', md: '1rem' },
              fontWeight: 500,
              '&:hover': {
                color: 'primary.main'
              }
            }}
          >
            {label}
          </Link>
        ))}
      </FooterLinks>
    </FooterContainer>
  );
});

// Display name for debugging purposes
Footer.displayName = 'Footer';

export default Footer;