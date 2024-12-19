import React from 'react'; // v18.0.0
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // v14.0.0
import { ThemeProvider } from '@mui/material/styles'; // v5.0.0
import { axe, toHaveNoViolations } from '@axe-core/react'; // v4.7.0
import Button from '../../../src/components/common/Button';
import { lightTheme, darkTheme } from '../../../src/styles/theme';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Helper function to render button with theme context
const renderWithTheme = (ui: React.ReactElement, theme = lightTheme) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

// Helper function to create consistent button props
const createButtonProps = (overrides = {}) => ({
  children: 'Test Button',
  onClick: jest.fn(),
  ...overrides
});

describe('Button Component', () => {
  // Basic Rendering Tests
  describe('Rendering', () => {
    it('renders with default props', () => {
      renderWithTheme(<Button>Test Button</Button>);
      const button = screen.getByRole('button', { name: /test button/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-disabled', 'false');
    });

    it('renders with custom className', () => {
      renderWithTheme(<Button className="custom-class">Test Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('renders with children content correctly', () => {
      const content = 'Complex Content';
      renderWithTheme(
        <Button>
          <span data-testid="content">{content}</span>
        </Button>
      );
      expect(screen.getByTestId('content')).toHaveTextContent(content);
    });
  });

  // Variant Tests
  describe('Variants', () => {
    it('renders contained variant with correct styles', () => {
      renderWithTheme(<Button variant="contained">Contained</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        backgroundColor: lightTheme.palette.primary.main,
        color: lightTheme.palette.primary.contrastText
      });
    });

    it('renders outlined variant with correct styles', () => {
      renderWithTheme(<Button variant="outlined">Outlined</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        backgroundColor: 'transparent',
        border: `1px solid ${lightTheme.palette.primary.main}`
      });
    });

    it('renders text variant with correct styles', () => {
      renderWithTheme(<Button variant="text">Text</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        backgroundColor: 'transparent',
        color: lightTheme.palette.primary.main
      });
    });
  });

  // Size Tests
  describe('Sizes', () => {
    it.each(['small', 'medium', 'large'] as const)('renders %s size with correct dimensions', (size) => {
      renderWithTheme(<Button size={size}>Button</Button>);
      const button = screen.getByRole('button');
      const styles = window.getComputedStyle(button);
      
      // Verify button dimensions match Material Design specifications
      const expectedHeight = {
        small: '32px',
        medium: '40px',
        large: '48px'
      }[size];
      
      expect(styles.height).toBe(expectedHeight);
    });
  });

  // State Tests
  describe('States', () => {
    it('handles disabled state correctly', () => {
      const onClick = jest.fn();
      renderWithTheme(<Button disabled onClick={onClick}>Disabled</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
      
      fireEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('shows loading state with spinner', () => {
      renderWithTheme(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(button).toHaveStyle({ color: 'transparent' });
    });

    it('applies hover styles on mouse over', async () => {
      renderWithTheme(<Button>Hover Test</Button>);
      const button = screen.getByRole('button');
      
      fireEvent.mouseOver(button);
      await waitFor(() => {
        expect(button).toHaveStyle({
          backgroundColor: lightTheme.palette.primary.dark
        });
      });
    });
  });

  // Interaction Tests
  describe('Interactions', () => {
    it('handles click events', () => {
      const onClick = jest.fn();
      renderWithTheme(<Button onClick={onClick}>Click Me</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('supports keyboard navigation', () => {
      const onClick = jest.fn();
      renderWithTheme(<Button onClick={onClick}>Press Enter</Button>);
      const button = screen.getByRole('button');
      
      button.focus();
      expect(document.activeElement).toBe(button);
      
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('maintains focus states', () => {
      renderWithTheme(<Button>Focus Test</Button>);
      const button = screen.getByRole('button');
      
      button.focus();
      expect(document.activeElement).toBe(button);
      expect(button).toHaveStyle({
        outline: `2px solid ${lightTheme.palette.primary.main}`
      });
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    it('meets WCAG 2.1 Level AA standards', async () => {
      const { container } = renderWithTheme(<Button>Accessible Button</Button>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has correct ARIA attributes', () => {
      renderWithTheme(<Button loading disabled>ARIA Test</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('role', 'button');
    });

    it('provides accessible name when children is not string', () => {
      renderWithTheme(
        <Button ariaLabel="Icon Button">
          <span data-testid="icon">★</span>
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Icon Button');
    });
  });

  // Theme Support Tests
  describe('Theme Support', () => {
    it('applies light theme colors correctly', () => {
      renderWithTheme(<Button>Light Theme</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveStyle({
        backgroundColor: lightTheme.palette.primary.main,
        color: lightTheme.palette.primary.contrastText
      });
    });

    it('applies dark theme colors correctly', () => {
      renderWithTheme(<Button>Dark Theme</Button>, darkTheme);
      const button = screen.getByRole('button');
      
      expect(button).toHaveStyle({
        backgroundColor: darkTheme.palette.primary.main,
        color: darkTheme.palette.primary.contrastText
      });
    });

    it('maintains contrast ratios in both themes', async () => {
      const { container: lightContainer } = renderWithTheme(<Button>Light Theme</Button>);
      const { container: darkContainer } = renderWithTheme(<Button>Dark Theme</Button>, darkTheme);
      
      const lightResults = await axe(lightContainer);
      const darkResults = await axe(darkContainer);
      
      expect(lightResults).toHaveNoViolations();
      expect(darkResults).toHaveNoViolations();
    });
  });
});