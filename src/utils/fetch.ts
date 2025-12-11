/**
 * Fetch utility wrapper that provides axios-like interface using native fetch API
 * Compatible with both Node.js and Cloudflare Workers environments
 */

export interface FetchOptions {
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number; // Number of retry attempts for transient errors (default: 0)
  retryDelay?: number; // Delay between retries in ms (default: 1000)
}

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
    timeout = 10000, 
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
        throw new FetchError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          response.statusText
        );
      }

      // Validate content-type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new FetchError(
          `Expected JSON response but got ${contentType || 'unknown content type'}. Body: ${text.substring(0, 200)}`
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new FetchError(`Request timeout after ${timeout}ms`);
        
        // Retry on timeout
        if (attempt < retries) {
          const waitTime = retryDelay * Math.pow(2, attempt);
          console.warn(`Request timeout, retrying in ${waitTime}ms (attempt ${attempt + 1}/${retries + 1})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        throw lastError;
      }

      // For network errors, retry
      if (error instanceof TypeError && attempt < retries) {
        const waitTime = retryDelay * Math.pow(2, attempt);
        console.warn(`Network error: ${error.message}, retrying in ${waitTime}ms (attempt ${attempt + 1}/${retries + 1})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('Request failed after retries');
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
  const { timeout = 10000, headers = {} } = options;

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
      
      throw new FetchError(
        errorMessage,
        response.status,
        response.statusText
      );
    }

    // Validate content type before parsing JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new FetchError(
        `Expected JSON response but got ${contentType || 'unknown content type'}. Body: ${text.substring(0, 200)}`,
        response.status,
        response.statusText
      );
    }

    const data = await response.json() as T;
    return { data };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new FetchError(`Request timeout after ${timeout}ms`);
    }

    throw error;
  }
}
