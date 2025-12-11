/**
 * Fetch utility wrapper that provides axios-like interface using native fetch API
 * Compatible with both Node.js and Cloudflare Workers environments
 */

export interface FetchOptions {
  timeout?: number;
  headers?: Record<string, string>;
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
 * Fetch JSON data with timeout support
 */
export async function fetchJSON<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { timeout = 10000, headers = {} } = options;

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

    if (!response.ok) {
      throw new FetchError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        response.statusText
      );
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new FetchError(`Request timeout after ${timeout}ms`);
    }

    throw error;
  }
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
      throw new FetchError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        response.statusText
      );
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new FetchError(`Request timeout after ${timeout}ms`);
    }

    throw error;
  }
}
