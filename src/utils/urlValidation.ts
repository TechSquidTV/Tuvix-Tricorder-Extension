export interface UrlValidationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
}

/**
 * Validate and normalize a URL for Tuvix instance configuration
 * @param urlString The URL string to validate
 * @returns Validation result with normalized URL if valid
 */
export function validateUrl(urlString: string): UrlValidationResult {
  if (!urlString || urlString.trim() === '') {
    return { valid: false, error: 'URL cannot be empty' };
  }

  const trimmed = urlString.trim();

  // Check if it has a protocol
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return { valid: false, error: 'URL must start with http:// or https://' };
  }

  // Try to parse the URL
  try {
    const url = new URL(trimmed);

    // Validate hostname
    if (!url.hostname || url.hostname === '') {
      return { valid: false, error: 'Invalid hostname' };
    }

    // Build normalized URL from origin and pathname
    let normalized = url.origin + url.pathname;

    // Remove all trailing slashes
    normalized = normalized.replace(/\/+$/, '');

    // Add back search params if any
    if (url.search) {
      normalized += url.search;
    }

    return { valid: true, normalized };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}
