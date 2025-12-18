import React from "react";
import config from "../../common/config";

/**
 * Dynamically load all assets from the assets folder
 * This automatically includes all SVG files without needing to import them individually
 */
const assetModules = import.meta.glob("../assets/*.svg", {
  eager: true,
}) as Record<string, { default: string }>;

/**
 * Create a map of asset names to their URLs
 * Extracts filename from path and maps it to the imported URL
 */
const assetMap: Record<string, string> = {};

Object.keys(assetModules).forEach((path) => {
  const fileName = path.split("/").pop()?.replace(".svg", "") || "";
  const fileNameWithExt = path.split("/").pop() || "";
  if (fileName) {
    assetMap[fileName] = assetModules[path].default;
    assetMap[fileNameWithExt] = assetModules[path].default;
  }
});

/**
 * Validates and resolves an image/icon URL
 * Priority:
 * 1. If URL is http:// or https://, use it directly
 * 2. If it's an asset name, return the asset import
 * 3. Otherwise, return the default icon/image (or custom default if provided)
 *
 * @param url - The URL or asset name to validate
 * @param type - Type of image: 'icon' for icons, 'image' for images, 'avatar' for avatars
 * @param defaultIcon - Optional custom default icon/asset name to use if url is invalid
 * @returns The validated URL or asset import
 */
export function validateImageUrl(
  url: string | null | undefined | { default?: string } | { default: string },
  type: "icon" | "image" | "avatar" = "image",
  defaultIcon?: string
): string {
  // Handle null, undefined
  if (!url) {
    return defaultIcon
      ? validateImageUrl(defaultIcon, type)
      : getDefaultImage(type);
  }

  // Handle imported asset modules (objects with default property)
  if (typeof url === "object" && "default" in url && url.default) {
    return url.default;
  }

  // Handle non-string types
  if (typeof url !== "string") {
    return defaultIcon
      ? validateImageUrl(defaultIcon, type)
      : getDefaultImage(type);
  }

  // Handle empty strings or placeholder
  if (url.trim() === "" || url === "image_url") {
    return defaultIcon
      ? validateImageUrl(defaultIcon, type)
      : getDefaultImage(type);
  }

  const trimmedUrl = url.trim();

  // Check if it's an HTTP/HTTPS URL
  if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
    return trimmedUrl;
  }

  // Check if it's an asset name (case-insensitive)
  const assetKey = Object.keys(assetMap).find(
    (key) => key.toLowerCase() === trimmedUrl.toLowerCase()
  );

  if (assetKey) {
    return assetMap[assetKey];
  }

  // Check if it's a path to an asset (e.g., "assets/ForkKnife.svg" or "/assets/ForkKnife.svg")
  const assetPathMatch = trimmedUrl.match(/assets\/([^/]+\.svg)$/i);
  if (assetPathMatch) {
    const assetFileName = assetPathMatch[1];
    const foundAssetKey = Object.keys(assetMap).find(
      (key) => key.toLowerCase() === assetFileName.toLowerCase()
    );
    if (foundAssetKey) {
      return assetMap[foundAssetKey];
    }
  }

  // Try to load asset dynamically using URL construction
  // This works for assets in public folder or when using relative paths
  try {
    // Try constructing URL for assets (works for public folder assets)
    const assetUrl = new URL(`../assets/${trimmedUrl}`, import.meta.url).href;
    // If URL construction succeeds, return it (browser will handle 404 if file doesn't exist)
    return assetUrl;
  } catch (error) {
    // URL construction failed, fall back to default
    console.warn(`Asset not found: ${trimmedUrl}, using default ${type}`);
  }

  // Fallback to custom default icon if provided, otherwise use type-based default
  if (defaultIcon) {
    // Try to resolve the custom default icon
    const customDefaultKey = Object.keys(assetMap).find(
      (key) => key.toLowerCase() === defaultIcon.toLowerCase()
    );
    if (customDefaultKey) {
      return assetMap[customDefaultKey];
    }
    // If custom default is an HTTP/HTTPS URL, use it
    if (
      defaultIcon.startsWith("http://") ||
      defaultIcon.startsWith("https://")
    ) {
      return defaultIcon;
    }
  }

  // Fallback to type-based default
  return getDefaultImage(type);
}

/**
 * Gets the default image/icon based on type
 *
 * How default icons work:
 * - When you call validateImageUrl(url, "icon"), if the URL is invalid/empty,
 *   it automatically returns the default icon (ForkKnife)
 * - When you call validateImageUrl(url, "avatar"), it returns config.defaults.avatar
 * - When you call validateImageUrl(url, "image"), it returns config.defaults.avatar
 *
 * Usage examples:
 * 1. Always show icon (with fallback):
 *    <img src={validateImageUrl(iconUrl, "icon")} />
 *    → Shows iconUrl if valid, otherwise shows ForkKnife icon
 *
 * 2. Conditional icon (only if provided):
 *    {iconUrl && <img src={validateImageUrl(iconUrl, "icon")} />}
 *    → Only renders if iconUrl exists, but still validates it
 *
 * 3. With fallback UI:
 *    {iconUrl ? (
 *      <img src={validateImageUrl(iconUrl, "icon")} />
 *    ) : (
 *      <DefaultIconComponent />
 *    )}
 *    → Shows custom fallback if no iconUrl, otherwise validates and shows icon
 *
 * @param type - Type of image: 'icon' for icons, 'image' for images, 'avatar' for avatars
 * @returns The default image URL
 */
function getDefaultImage(type: "icon" | "image" | "avatar"): string {
  switch (type) {
    case "avatar":
      return config.defaults.avatar;
    case "icon":
      // Try to use ForkKnife as default icon, fallback to avatar if not available
      const defaultIcon = assetMap["ForkKnife"] || assetMap["ForkKnife.svg"];
      return defaultIcon || config.defaults.avatar;
    case "image":
    default:
      // Default image placeholder
      return config.defaults.avatar;
  }
}

/**
 * React component helper to render an image with validation
 * Handles error cases and shows default image on error
 *
 * @param url - The URL or asset name to validate
 * @param alt - Alt text for the image
 * @param type - Type of image: 'icon' for icons, 'image' for images, 'avatar' for avatars
 * @param className - Optional CSS class name
 * @param style - Optional inline styles
 * @returns JSX element for the image
 */
export function ValidatedImage({
  url,
  alt = "",
  type = "image",
  defaultIcon,
  className,
  style,
  ...props
}: {
  url: string | null | undefined;
  alt?: string;
  type?: "icon" | "image" | "avatar";
  defaultIcon?: string;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: unknown;
}): React.JSX.Element {
  const validatedUrl = validateImageUrl(url, type, defaultIcon);
  const defaultImage = defaultIcon
    ? validateImageUrl(defaultIcon, type)
    : getDefaultImage(type);

  return (
    <img
      src={validatedUrl}
      alt={alt}
      className={className}
      style={style}
      onError={(e) => {
        // If the validated URL fails to load, fall back to default
        const target = e.target as HTMLImageElement;
        if (target.src !== defaultImage) {
          target.src = defaultImage;
        }
      }}
      {...props}
    />
  );
}

/**
 * Hook to get validated image URL with error handling
 * Useful for components that need to handle image loading states
 *
 * @param url - The URL or asset name to validate
 * @param type - Type of image: 'icon' for icons, 'image' for images, 'avatar' for avatars
 * @returns Object with validatedUrl and error handler
 */
export function useValidatedImage(
  url: string | null | undefined,
  type: "icon" | "image" | "avatar" = "image",
  defaultIcon?: string
): {
  validatedUrl: string;
  handleError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
} {
  const validatedUrl = validateImageUrl(url, type, defaultIcon);
  const defaultImage = defaultIcon
    ? validateImageUrl(defaultIcon, type)
    : getDefaultImage(type);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    if (target.src !== defaultImage) {
      target.src = defaultImage;
    }
  };

  return { validatedUrl, handleError };
}
