/**
 * HTTP Fetch 工具
 */

export interface FetchOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

export class FetchError extends Error {
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'FetchError';
  }
}

export async function post<T>(
  url: string,
  body: any,
  options: FetchOptions = {}
): Promise<{ data: T }> {
  const controller = new AbortController();
  const timeout = options.timeout || 30000;
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new FetchError(`HTTP ${response.status}`, response.status);
    }

    const data = await response.json() as T;
    return { data };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof FetchError) throw error;
    throw new FetchError(error instanceof Error ? error.message : String(error));
  }
}

export async function get<T>(
  url: string,
  options: FetchOptions = {}
): Promise<{ data: T }> {
  const controller = new AbortController();
  const timeout = options.timeout || 30000;
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: options.headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new FetchError(`HTTP ${response.status}`, response.status);
    }

    const data = await response.json() as T;
    return { data };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof FetchError) throw error;
    throw new FetchError(error instanceof Error ? error.message : String(error));
  }
}