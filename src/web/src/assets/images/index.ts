// Image Assets Index v1.0.0
// Centralizes all static image assets for RefactorTrack web application
// Following Material Design 3.0 principles

// Type definitions for image sizes
type ImageSize = {
  width: number;
  height: number;
};

// Interfaces for image asset types
export interface ILogoVariants {
  LIGHT: string;
  DARK: string;
  MOBILE: string;
}

export interface IPlaceholderImages {
  PROFILE: string;
  COMPANY: string;
  AVATAR: string;
}

export interface IUIElements {
  LOADING_SPINNER: string;
  ERROR_ILLUSTRATION: string;
  EMPTY_STATE: string;
}

// Logo variations for different themes and screen sizes
export const LOGO_VARIANTS: ILogoVariants = {
  LIGHT: 'logo-light.svg',
  DARK: 'logo-dark.svg',
  MOBILE: 'logo-mobile.svg',
} as const;

// Placeholder images for various content types
export const PLACEHOLDER_IMAGES: IPlaceholderImages = {
  PROFILE: 'profile-placeholder.png',
  COMPANY: 'company-placeholder.png',
  AVATAR: 'avatar-placeholder.svg',
} as const;

// Common UI element images
export const UI_ELEMENTS: IUIElements = {
  LOADING_SPINNER: 'loading-spinner.svg',
  ERROR_ILLUSTRATION: 'error-state.svg',
  EMPTY_STATE: 'empty-state.svg',
} as const;

// Standard image size configurations
export const IMAGE_SIZES = {
  LOGO: {
    DESKTOP: { width: 240, height: 80 },
    MOBILE: { width: 120, height: 40 },
  },
  AVATAR: {
    SMALL: { width: 32, height: 32 },
    MEDIUM: { width: 64, height: 64 },
    LARGE: { width: 128, height: 128 },
  },
  PLACEHOLDER: {
    PROFILE: { width: 300, height: 300 },
    COMPANY: { width: 400, height: 200 },
  },
} as const;

// Decorator for image validation
function validateImage(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  descriptor.value = function(...args: any[]) {
    const [imageName, size] = args;
    if (!imageName) {
      throw new Error('Image name is required');
    }
    return originalMethod.apply(this, args);
  };
  return descriptor;
}

// Helper function to check WebP support
const supportsWebP = async (): Promise<boolean> => {
  const webP = new Image();
  return new Promise((resolve) => {
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

// Get full path for an image asset with validation
@validateImage
export const getImagePath = async (
  imageName: string,
  size?: ImageSize
): Promise<string> => {
  const baseUrl = process.env.REACT_APP_ASSETS_URL || '/assets/images';
  const hasWebPSupport = await supportsWebP();
  
  // Convert PNG/JPG to WebP if supported
  if (hasWebPSupport && (imageName.endsWith('.png') || imageName.endsWith('.jpg'))) {
    imageName = imageName.replace(/\.(png|jpg)$/, '.webp');
  }

  // Add size parameters if provided
  if (size) {
    return `${baseUrl}/${imageName}?w=${size.width}&h=${size.height}`;
  }

  return `${baseUrl}/${imageName}`;
};

// Preload critical images for performance
export const preloadCriticalImages = async (
  imageNames: string[]
): Promise<void> => {
  const criticalImages = [
    LOGO_VARIANTS.LIGHT,
    LOGO_VARIANTS.DARK,
    UI_ELEMENTS.LOADING_SPINNER,
    ...imageNames,
  ];

  const preloadPromises = criticalImages.map((imageName) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to preload image: ${imageName}`));
      img.src = `${process.env.REACT_APP_ASSETS_URL || '/assets/images'}/${imageName}`;
    });
  });

  try {
    await Promise.all(preloadPromises);
  } catch (error) {
    console.error('Error preloading critical images:', error);
  }
};

// Export all image-related types
export type { ImageSize };

// Export image asset maps for type safety
export const ImageAssets = {
  Logos: LOGO_VARIANTS,
  Placeholders: PLACEHOLDER_IMAGES,
  UI: UI_ELEMENTS,
  Sizes: IMAGE_SIZES,
} as const;