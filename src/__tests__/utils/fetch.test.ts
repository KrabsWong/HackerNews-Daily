import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchJSON, get, post, FetchError } from '../../utils/fetch';

describe('fetch utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('FetchError', () => {
    it('should create error with message only', () => {
      const error = new FetchError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('FetchError');
      expect(error.status).toBeUndefined();
      expect(error.statusText).toBeUndefined();
    });

    it('should create error with status and statusText', () => {
      const error = new FetchError('Not found', 404, 'Not Found');
      expect(error.message).toBe('Not found');
      expect(error.status).toBe(404);
      expect(error.statusText).toBe('Not Found');
    });
  });

  describe('fetchJSON', () => {
    it('should fetch JSON successfully', async () => {
      const mockData = { id: 1, title: 'Test' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: vi.fn().mockResolvedValue(mockData),
      });

      const result = await fetchJSON('https://api.example.com/data');
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should include custom headers', async () => {
      const mockData = { success: true };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: vi.fn().mockResolvedValue(mockData),
      });

      await fetchJSON('https://api.example.com/data', {
        headers: { Authorization: 'Bearer token123' },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer token123',
          }),
        })
      );
    });

    it('should throw FetchError on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
      });

      await expect(
        fetchJSON('https://api.example.com/notfound')
      ).rejects.toThrow('HTTP 404: Not Found');
    });

    it('should throw FetchError when content-type is not JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('text/html'),
        },
        text: vi.fn().mockResolvedValue('<html>Error page</html>'),
      });

      await expect(
        fetchJSON('https://api.example.com/data')
      ).rejects.toThrow('Expected JSON response but got text/html');
    });

    it('should throw FetchError when content-type is missing', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
        text: vi.fn().mockResolvedValue('Plain text response'),
      });

      await expect(
        fetchJSON('https://api.example.com/data')
      ).rejects.toThrow('Expected JSON response but got unknown content type');
    });

    it('should handle timeout', async () => {
      global.fetch = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          }, 50);
        });
      });

      await expect(
        fetchJSON('https://api.example.com/slow', { timeout: 100 })
      ).rejects.toThrow('Request timeout after 100ms');
    });

    it('should retry on timeout', async () => {
      let attempts = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        attempts++;
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          }, 10);
        });
      });

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await expect(
        fetchJSON('https://api.example.com/slow', { 
          timeout: 50, 
          retries: 2,
          retryDelay: 10
        })
      ).rejects.toThrow('Request timeout after 50ms');

      expect(attempts).toBe(3); // Initial + 2 retries
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Request timeout, retrying')
      );
    });

    it('should retry on 5xx server errors', async () => {
      let attempts = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.resolve({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
              get: vi.fn().mockReturnValue('application/json'),
            },
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: {
            get: vi.fn().mockReturnValue('application/json'),
          },
          json: vi.fn().mockResolvedValue({ success: true }),
        });
      });

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchJSON('https://api.example.com/data', {
        retries: 2,
        retryDelay: 10,
      });

      expect(result).toEqual({ success: true });
      expect(attempts).toBe(3);
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Server error 503, retrying')
      );
    });

    it('should not retry on 4xx client errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
      });

      await expect(
        fetchJSON('https://api.example.com/data', { retries: 2 })
      ).rejects.toThrow('HTTP 400: Bad Request');

      expect(global.fetch).toHaveBeenCalledTimes(1); // No retries
    });

    it('should use exponential backoff for retries', async () => {
      let attempts = 0;

      global.fetch = vi.fn().mockImplementation(() => {
        attempts++;
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: {
            get: vi.fn().mockReturnValue('application/json'),
          },
        });
      });

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await expect(
        fetchJSON('https://api.example.com/data', {
          retries: 2,
          retryDelay: 100,
        })
      ).rejects.toThrow('HTTP 500');

      expect(attempts).toBe(3);
      // Verify exponential backoff was used by checking console warnings
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Server error 500, retrying in 100ms')
      );
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Server error 500, retrying in 200ms')
      );

      consoleWarn.mockRestore();
    });

    it('should retry on network errors', async () => {
      vi.useFakeTimers();
      
      let attempts = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          return Promise.reject(new TypeError('Network request failed'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: {
            get: vi.fn().mockReturnValue('application/json'),
          },
          json: vi.fn().mockResolvedValue({ success: true }),
        });
      });

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const promise = fetchJSON('https://api.example.com/data', {
        retries: 2,
        retryDelay: 10,
      });

      // Fast-forward timers to let retries happen
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toEqual({ success: true });
      expect(attempts).toBe(2);
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Network error')
      );

      consoleWarn.mockRestore();
      vi.useRealTimers();
    });

    it('should throw network error if all retries fail', async () => {
      vi.useFakeTimers();
      
      global.fetch = vi.fn().mockRejectedValue(new TypeError('Network request failed'));

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const promise = fetchJSON('https://api.example.com/data', { retries: 1, retryDelay: 10 });
      
      // Fast-forward timers and catch the promise rejection
      const timerPromise = vi.runAllTimersAsync();
      
      // Wait for both the timer advancement and the promise rejection
      await Promise.all([
        timerPromise,
        promise.catch(() => {}) // Catch to prevent unhandled rejection
      ]);

      // Now verify the promise rejects with the expected error
      await expect(promise).rejects.toThrow('Network request failed');

      expect(global.fetch).toHaveBeenCalledTimes(2); // Initial + 1 retry

      consoleWarn.mockRestore();
      vi.useRealTimers();
    });

    it('should throw non-retriable errors immediately', async () => {
      const customError = new Error('Custom error');
      global.fetch = vi.fn().mockRejectedValue(customError);

      await expect(
        fetchJSON('https://api.example.com/data', { retries: 2 })
      ).rejects.toThrow('Custom error');

      expect(global.fetch).toHaveBeenCalledTimes(1); // No retries for non-network errors
    });
  });

  describe('get', () => {
    it('should return data wrapped in object', async () => {
      const mockData = { id: 1, name: 'Test' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: vi.fn().mockResolvedValue(mockData),
      });

      const result = await get<typeof mockData>('https://api.example.com/item');
      expect(result).toEqual({ data: mockData });
    });

    it('should pass options to fetchJSON', async () => {
      const mockData = { value: 42 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: vi.fn().mockResolvedValue(mockData),
      });

      await get('https://api.example.com/data', {
        timeout: 5000,
        headers: { 'X-Custom': 'header' },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom': 'header',
          }),
        })
      );
    });
  });

  describe('post', () => {
    it('should send POST request with JSON body', async () => {
      const requestBody = { title: 'New Item', content: 'Content here' };
      const responseData = { id: 123, ...requestBody };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: vi.fn().mockResolvedValue(responseData),
      });

      const result = await post('https://api.example.com/items', requestBody);

      expect(result).toEqual({ data: responseData });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/items',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(requestBody),
        })
      );
    });

    it('should include custom headers', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      await post(
        'https://api.example.com/items',
        { data: 'test' },
        { headers: { Authorization: 'Bearer token' } }
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/items',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer token',
          }),
        })
      );
    });

    it('should throw FetchError on HTTP error with JSON error message', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: vi.fn().mockResolvedValue({ message: 'Validation failed' }),
      });

      await expect(
        post('https://api.example.com/items', { invalid: 'data' })
      ).rejects.toThrow('Validation failed');
    });

    it('should throw FetchError on HTTP error with error field', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: vi.fn().mockResolvedValue({ error: 'Invalid input' }),
      });

      await expect(
        post('https://api.example.com/items', {})
      ).rejects.toThrow('Invalid input');
    });

    it('should handle HTML error responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          get: vi.fn().mockReturnValue('text/html'),
        },
        text: vi.fn().mockResolvedValue('<html><body>Server error occurred</body></html>'),
      });

      await expect(
        post('https://api.example.com/items', {})
      ).rejects.toThrow(/HTTP 500.*Server error occurred/);
    });

    it('should handle empty error responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          get: vi.fn().mockReturnValue('text/plain'),
        },
        text: vi.fn().mockResolvedValue(''),
      });

      await expect(
        post('https://api.example.com/items', {})
      ).rejects.toThrow('HTTP 503: Service Unavailable');
    });

    it('should ignore error parsing failures', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      });

      await expect(
        post('https://api.example.com/items', {})
      ).rejects.toThrow('HTTP 400: Bad Request');
    });

    it('should throw FetchError when response content-type is not JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('text/plain'),
        },
        text: vi.fn().mockResolvedValue('Plain text response'),
      });

      await expect(
        post('https://api.example.com/items', { data: 'test' })
      ).rejects.toThrow('Expected JSON response but got text/plain');
    });

    it('should handle timeout', async () => {
      let abortCalled = false;
      const mockController = {
        abort: vi.fn(() => { abortCalled = true; }),
        signal: {} as AbortSignal,
      };
      
      global.AbortController = vi.fn().mockImplementation(() => mockController) as any;
      
      global.fetch = vi.fn().mockImplementation(() => {
        // Simulate slow request that gets aborted
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          }, 200);
        });
      });

      await expect(
        post('https://api.example.com/slow', { data: 'test' }, { timeout: 100 })
      ).rejects.toThrow('Request timeout after 100ms');
      
      // Verify abort was called on the controller
      expect(mockController.abort).toHaveBeenCalled();
    }, 10000); // Increase timeout for this test

    it('should use custom timeout', async () => {
      const mockData = { success: true };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: vi.fn().mockResolvedValue(mockData),
      });

      await post(
        'https://api.example.com/items',
        { data: 'test' },
        { timeout: 5000 }
      );

      // Verify request was made (timeout handling verified in timeout test)
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
