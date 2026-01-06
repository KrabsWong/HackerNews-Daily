/**
 * Fetch utility wrapper that provides axios-like interface using native fetch API
 * Compatible with both Node.js and Cloudflare Workers environments
 */

import type { FetchOptions } from '../types/utils';
import { APIError, NetworkError } from '../types/errors';
import { TIMEOUT_CONFIG } from '../config/constants';

// Re-export type for backward compatibility
export type { FetchOptions } from '../types/utils';

/**
 * @deprecated Use APIError or NetworkError instead
 * Kept for backward compatibility
 */
export class FetchError extends Error {
  constructor(
    message: string,
    public status?: number,
    public statusText?: string
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

/**
 * Fetch JSON data with timeout and retry support
 */
export async function fetchJSON<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { 
    timeout = TIMEOUT_CONFIG.DEFAULT, 
    headers = {}, 
    retries = 0,
    retryDelay = 1000 
  } = options;

  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      clearTimeout(timeoutId);

      // Retry on 5xx server errors
      if (response.status >= 500 && attempt < retries) {
        const waitTime = retryDelay * Math.pow(2, attempt); // Exponential backoff
        console.warn(`Server error ${response.status}, retrying in ${waitTime}ms (attempt ${attempt + 1}/${retries + 1})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (!response.ok) {
        throw new APIError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          'fetch',
          { url }
        );
      }

      // Validate content-type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new APIError(
          `Expected JSON response but got ${contentType || 'unknown content type'}. Body: ${text.substring(0, 200)}`,
          response.status,
          'fetch',
          { url, contentType, preview: text.substring(0, 200) }
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new NetworkError(
          `Request timeout after ${timeout}ms`,
          url,
          timeout
        );
        
        // Retry on timeout
        if (attempt < retries) {
          const waitTime = retryDelay * Math.pow(2, attempt);
          console.warn(`Request timeout, retrying in ${waitTime}ms (attempt ${attempt + 1}/${retries + 1})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        throw lastError;
      }

      // If it's already an APIError, rethrow
      if (error instanceof APIError) {
        throw error;
      }

      // For network errors, retry
      if (error instanceof TypeError && attempt < retries) {
        const waitTime = retryDelay * Math.pow(2, attempt);
        console.warn(`Network error: ${error.message}, retrying in ${waitTime}ms (attempt ${attempt + 1}/${retries + 1})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        lastError = new NetworkError(error.message, url);
        continue;
      }

      // Convert other errors to NetworkError
      if (error instanceof TypeError) {
        throw new NetworkError(error.message, url);
      }

      throw error;
    }
  }

  throw lastError || new NetworkError('Request failed after retries', url);
}

/**
 * GET request helper
 */
export async function get<T>(
  url: string,
  options: FetchOptions = {}
): Promise<{ data: T }> {
  const data = await fetchJSON<T>(url, options);
  return { data };
}

/**
 * POST request helper
 */
export async function post<T>(
  url: string,
  body: any,
  options: FetchOptions = {}
): Promise<{ data: T }> {
  const { timeout = TIMEOUT_CONFIG.DEFAULT, headers = {} } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Try to get error message from response body
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json() as { message?: string; error?: string };
          errorMessage = errorData.message || errorData.error || errorMessage;
        } else {
          const text = await response.text();
          // Include first 200 chars of error page for debugging
          if (text && text.length > 0) {
            errorMessage += ` - ${text.substring(0, 200)}`;
          }
        }
      } catch (parseError) {
        // Ignore parsing errors, use default message
      }
      
      throw new APIError(
        errorMessage,
        response.status,
        'fetch-post',
        { url }
      );
    }

    // Validate content type before parsing JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new APIError(
        `Expected JSON response but got ${contentType || 'unknown content type'}. Body: ${text.substring(0, 200)}`,
        response.status,
        'fetch-post',
        { url, contentType, preview: text.substring(0, 200) }
      );
    }

    const data = await response.json() as T;
    return { data };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new NetworkError(`Request timeout after ${timeout}ms`, url, timeout);
    }

    // If it's already an APIError, rethrow
    if (error instanceof APIError) {
      throw error;
    }

    // Convert TypeError (network errors) to NetworkError
    if (error instanceof TypeError) {
      throw new NetworkError(error.message, url);
    }

    throw error;
  }
}
