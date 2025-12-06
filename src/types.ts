import { NoFeedsFoundError } from '@tuvixrss/tricorder';

export type ErrorType = 'no-feeds' | 'network' | 'timeout' | 'invalid-url' | 'unknown';

export interface DiscoveryError {
  type: ErrorType;
  message: string;
  suggestion?: string;
}

export function createDiscoveryError(error: unknown): DiscoveryError {
  if (error instanceof NoFeedsFoundError) {
    return {
      type: 'no-feeds',
      message: 'No feeds found on this page',
      suggestion: 'This site might not have RSS feeds available',
    };
  }

  const errorMessage = error instanceof Error ? error.message : String(error);

  if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
    return {
      type: 'timeout',
      message: 'Discovery took too long',
      suggestion: 'This site is slow to respond. Try again or check your connection',
    };
  }

  if (
    errorMessage.includes('fetch') ||
    errorMessage.includes('network') ||
    errorMessage.includes('Failed to fetch')
  ) {
    return {
      type: 'network',
      message: 'Network error occurred',
      suggestion: 'Check your internet connection and try again',
    };
  }

  if (errorMessage.includes('Invalid URL') || errorMessage.includes('URL')) {
    return {
      type: 'invalid-url',
      message: 'Invalid page URL',
      suggestion: 'This URL cannot be scanned for feeds',
    };
  }

  return {
    type: 'unknown',
    message: errorMessage || 'An unexpected error occurred',
    suggestion: 'Please try again',
  };
}
