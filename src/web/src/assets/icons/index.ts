// @ts-check
import React from 'react'; // ^18.0.0

/**
 * Standard icon sizes following Material Design 3.0 specifications
 */
export const ICON_SIZES = {
  small: '16',
  medium: '24',
  large: '32'
} as const;

/**
 * Standard SVG viewBox for Material Design icons
 */
export const ICON_VIEWBOX = '0 0 24 24';

/**
 * Theme-aware color system following Material Design color specifications
 */
export const THEME_COLORS = {
  light: {
    primary: 'rgba(0, 0, 0, 0.87)',
    secondary: 'rgba(0, 0, 0, 0.6)',
    disabled: 'rgba(0, 0, 0, 0.38)'
  },
  dark: {
    primary: 'rgba(255, 255, 255, 0.87)',
    secondary: 'rgba(255, 255, 255, 0.6)',
    disabled: 'rgba(255, 255, 255, 0.38)'
  }
} as const;

/**
 * Props interface for icon components following Material Design guidelines
 */
export interface IconProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  ariaLabel?: string;
  role?: string;
  focusable?: boolean;
  theme?: 'light' | 'dark';
}

interface IconOptions {
  defaultSize?: 'small' | 'medium' | 'large';
  defaultColor?: string;
  defaultTheme?: 'light' | 'dark';
}

/**
 * Factory function to create accessible, theme-aware SVG icon components
 * @param path - SVG path data
 * @param defaultTitle - Default hover tooltip text
 * @param options - Default icon options
 * @returns React functional component with consistent styling and accessibility
 */
export const createIcon = (
  path: string,
  defaultTitle: string,
  options: IconOptions = {}
): React.FC<IconProps> => {
  const {
    defaultSize = 'medium',
    defaultTheme = 'light',
    defaultColor
  } = options;

  return ({
    size = defaultSize,
    color = defaultColor,
    className,
    style,
    title = defaultTitle,
    ariaLabel = title,
    role = 'img',
    focusable = false,
    theme = defaultTheme
  }: IconProps) => {
    const iconSize = ICON_SIZES[size];
    const themeColor = color || THEME_COLORS[theme].primary;

    return React.createElement('svg', {
      width: iconSize,
      height: iconSize,
      viewBox: ICON_VIEWBOX,
      fill: 'currentColor',
      className,
      style: {
        color: themeColor,
        ...style
      },
      'aria-label': ariaLabel,
      role,
      focusable,
      children: [
        React.createElement('title', { key: 'title' }, title),
        React.createElement('path', {
          key: 'path',
          d: path,
          fill: 'currentColor'
        })
      ]
    });
  };
};

// Material Design icon paths
const ADD_ICON_PATH = 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z';
const SEARCH_ICON_PATH = 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z';
const FILTER_ICON_PATH = 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z';

/**
 * Add/plus action icon component
 */
export const AddIcon = createIcon(ADD_ICON_PATH, 'Add', {
  defaultSize: 'medium',
  defaultTheme: 'light'
});

/**
 * Search action icon component
 */
export const SearchIcon = createIcon(SEARCH_ICON_PATH, 'Search', {
  defaultSize: 'medium',
  defaultTheme: 'light'
});

/**
 * Filter/sort action icon component
 */
export const FilterIcon = createIcon(FILTER_ICON_PATH, 'Filter', {
  defaultSize: 'medium',
  defaultTheme: 'light'
});