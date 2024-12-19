import { createGlobalStyle } from 'styled-components'; // v5.3.0
import { normalize } from 'styled-normalize'; // v8.0.7
import { palette } from './colors';
import { typography, fontFamily } from './typography';
import { breakpoints } from './breakpoints';

// Constants following Material Design 3.0 principles
const SPACING_UNIT = 8;

const ELEVATION = {
  0: 'none',
  1: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  2: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  3: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  4: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
} as const;

const TRANSITION = {
  standard: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  fast: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
  slow: 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)'
} as const;

const Z_INDEX = {
  modal: '1400',
  overlay: '1300',
  drawer: '1200',
  header: '1100',
  dropdown: '1000',
  tooltip: '900'
} as const;

export const GlobalStyles = createGlobalStyle`
  /* Apply CSS Reset */
  ${normalize}

  /* CSS Custom Properties for Theme Values */
  :root {
    /* Colors - Light Theme by default */
    --primary-main: ${palette.light.primary.main};
    --primary-light: ${palette.light.primary.light};
    --primary-dark: ${palette.light.primary.dark};
    --primary-contrast: ${palette.light.primary.contrastText};
    
    --text-primary: ${palette.light.text.primary};
    --text-secondary: ${palette.light.text.secondary};
    --text-disabled: ${palette.light.text.disabled};
    
    --background-default: ${palette.light.background.default};
    --background-paper: ${palette.light.background.paper};
    --background-contrast: ${palette.light.background.contrast};
    
    --border-color: ${palette.light.border};
    --divider-color: ${palette.light.divider};

    /* Spacing */
    --spacing-unit: ${SPACING_UNIT}px;
    --spacing-xs: ${SPACING_UNIT / 2}px;
    --spacing-sm: ${SPACING_UNIT}px;
    --spacing-md: ${SPACING_UNIT * 2}px;
    --spacing-lg: ${SPACING_UNIT * 3}px;
    --spacing-xl: ${SPACING_UNIT * 4}px;

    /* Z-Index Hierarchy */
    --z-modal: ${Z_INDEX.modal};
    --z-overlay: ${Z_INDEX.overlay};
    --z-drawer: ${Z_INDEX.drawer};
    --z-header: ${Z_INDEX.header};
    --z-dropdown: ${Z_INDEX.dropdown};
    --z-tooltip: ${Z_INDEX.tooltip};
  }

  /* Dark Theme Override */
  [data-theme="dark"] {
    --primary-main: ${palette.dark.primary.main};
    --primary-light: ${palette.dark.primary.light};
    --primary-dark: ${palette.dark.primary.dark};
    --primary-contrast: ${palette.dark.primary.contrastText};
    
    --text-primary: ${palette.dark.text.primary};
    --text-secondary: ${palette.dark.text.secondary};
    --text-disabled: ${palette.dark.text.disabled};
    
    --background-default: ${palette.dark.background.default};
    --background-paper: ${palette.dark.background.paper};
    --background-contrast: ${palette.dark.background.contrast};
    
    --border-color: ${palette.dark.border};
    --divider-color: ${palette.dark.divider};
  }

  /* Global Box Sizing */
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* HTML & Body Base Styles */
  html {
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-size-adjust: 100%;
    text-rendering: optimizeLegibility;
    scroll-behavior: smooth;

    @media (prefers-reduced-motion: reduce) {
      scroll-behavior: auto;
    }
  }

  body {
    font-family: ${fontFamily.primary};
    line-height: 1.5;
    color: var(--text-primary);
    background-color: var(--background-default);
    transition: ${TRANSITION.standard};

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }

  /* Typography */
  h1 { ${typography.h1} }
  h2 { ${typography.h2} }
  h3 { ${typography.h3} }
  h4 { ${typography.h4} }
  h5 { ${typography.h5} }
  h6 { ${typography.h6} }

  /* Links */
  a {
    color: var(--primary-main);
    text-decoration: none;
    transition: ${TRANSITION.fast};

    &:hover {
      color: var(--primary-dark);
      text-decoration: underline;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }

  /* Focus Management for Accessibility */
  :focus-visible {
    outline: 2px solid var(--primary-main);
    outline-offset: 2px;
    border-radius: 2px;
  }

  /* Button Reset */
  button {
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    font: inherit;
    color: inherit;
    
    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  /* Image Handling */
  img {
    max-width: 100%;
    height: auto;
    display: block;
  }

  /* List Reset */
  ul, ol {
    list-style: none;
  }

  /* Form Elements */
  input, textarea, select {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }

  /* Responsive Design Breakpoints */
  ${breakpoints.up('tablet')} {
    html {
      font-size: 18px;
    }
  }

  ${breakpoints.up('desktop')} {
    html {
      font-size: 20px;
    }
  }

  /* Reduced Motion */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* Print Styles */
  @media print {
    body {
      background-color: white;
      color: black;
    }

    a {
      text-decoration: underline;
    }

    @page {
      margin: 2cm;
    }
  }
`;

export default GlobalStyles;