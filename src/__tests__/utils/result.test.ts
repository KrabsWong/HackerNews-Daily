/**
 * Tests for Result type utilities
 */

import { describe, it, expect } from 'vitest';
import {
  Ok,
  Err,
  fromPromise,
  collectResults,
  unwrapResults,
  allOk,
  mapResult,
} from '../../utils/result';

describe('result utils', () => {
  describe('Ok', () => {
    it('should create success result with value', () => {
      const result = Ok(42);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(42);
      }
    });

    it('should work with different types', () => {
      const stringResult = Ok('hello');
      const objectResult = Ok({ id: 1, name: 'test' });
      const arrayResult = Ok([1, 2, 3]);
      
      expect(stringResult.ok).toBe(true);
      expect(objectResult.ok).toBe(true);
      expect(arrayResult.ok).toBe(true);
    });

    it('should accept null and undefined', () => {
      const nullResult = Ok(null);
      const undefinedResult = Ok(undefined);
      
      expect(nullResult.ok).toBe(true);
      expect(undefinedResult.ok).toBe(true);
    });
  });

  describe('Err', () => {
    it('should create error result with error', () => {
      const error = new Error('Test error');
      const result = Err(error);
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(error);
      }
    });

    it('should work with different error types', () => {
      const stringErr = Err('string error');
      const numberErr = Err(404);
      const objectErr = Err({ code: 'E001', message: 'Custom error' });
      
      expect(stringErr.ok).toBe(false);
      expect(numberErr.ok).toBe(false);
      expect(objectErr.ok).toBe(false);
    });
  });

  describe('fromPromise', () => {
    it('should convert resolved promise to Ok', async () => {
      const promise = Promise.resolve(42);
      const result = await fromPromise(promise);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(42);
      }
    });

    it('should convert rejected promise to Err', async () => {
      const error = new Error('Test error');
      const promise = Promise.reject(error);
      const result = await fromPromise(promise);
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(error);
      }
    });

    it('should wrap non-Error rejections in Error', async () => {
      const promise = Promise.reject('string error');
      const result = await fromPromise(promise);
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe('string error');
      }
    });

    it('should handle async functions', async () => {
      const asyncFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'success';
      };
      
      const result = await fromPromise(asyncFn());
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('success');
      }
    });
  });

  describe('collectResults', () => {
    it('should collect all successes and failures', async () => {
      const promises = [
        Promise.resolve(Ok(1)),
        Promise.resolve(Ok(2)),
        Promise.resolve(Err(new Error('error 1'))),
        Promise.resolve(Ok(3)),
        Promise.resolve(Err(new Error('error 2'))),
      ];
      
      const result = await collectResults(promises);
      
      expect(result.successes).toEqual([1, 2, 3]);
      expect(result.failures).toHaveLength(2);
      expect(result.failures[0].message).toBe('error 1');
      expect(result.failures[1].message).toBe('error 2');
    });

    it('should handle all successes', async () => {
      const promises = [
        Promise.resolve(Ok(1)),
        Promise.resolve(Ok(2)),
        Promise.resolve(Ok(3)),
      ];
      
      const result = await collectResults(promises);
      
      expect(result.successes).toEqual([1, 2, 3]);
      expect(result.failures).toEqual([]);
    });

    it('should handle all failures', async () => {
      const promises = [
        Promise.resolve(Err(new Error('error 1'))),
        Promise.resolve(Err(new Error('error 2'))),
      ];
      
      const result = await collectResults(promises);
      
      expect(result.successes).toEqual([]);
      expect(result.failures).toHaveLength(2);
    });

    it('should handle empty array', async () => {
      const result = await collectResults([]);
      
      expect(result.successes).toEqual([]);
      expect(result.failures).toEqual([]);
    });
  });

  describe('unwrapResults', () => {
    it('should extract all success values', () => {
      const results = [Ok(1), Ok(2), Err(new Error('error')), Ok(3)];
      const values = unwrapResults(results);
      
      expect(values).toEqual([1, 2, 3]);
    });

    it('should return empty array when all are errors', () => {
      const results = [Err(new Error('e1')), Err(new Error('e2'))];
      const values = unwrapResults(results);
      
      expect(values).toEqual([]);
    });

    it('should handle empty array', () => {
      const values = unwrapResults([]);
      expect(values).toEqual([]);
    });

    it('should preserve value types', () => {
      const results = [
        Ok({ id: 1, name: 'a' }),
        Ok({ id: 2, name: 'b' }),
        Err(new Error('error')),
      ];
      
      const values = unwrapResults(results);
      
      expect(values).toHaveLength(2);
      expect(values[0]).toEqual({ id: 1, name: 'a' });
      expect(values[1]).toEqual({ id: 2, name: 'b' });
    });
  });

  describe('allOk', () => {
    it('should return true when all results are Ok', () => {
      const results = [Ok(1), Ok(2), Ok(3)];
      
      expect(allOk(results)).toBe(true);
    });

    it('should return false when any result is Err', () => {
      const results = [Ok(1), Err(new Error('error')), Ok(3)];
      
      expect(allOk(results)).toBe(false);
    });

    it('should return false when all results are Err', () => {
      const results = [Err(new Error('e1')), Err(new Error('e2'))];
      
      expect(allOk(results)).toBe(false);
    });

    it('should return true for empty array', () => {
      expect(allOk([])).toBe(true);
    });
  });

  describe('mapResult', () => {
    it('should map Ok value to new value', () => {
      const result = Ok(5);
      const mapped = mapResult(result, x => x * 2);
      
      expect(mapped.ok).toBe(true);
      if (mapped.ok) {
        expect(mapped.value).toBe(10);
      }
    });

    it('should not map Err', () => {
      const error = new Error('Test error');
      const result = Err(error);
      const mapped = mapResult(result, x => x * 2);
      
      expect(mapped.ok).toBe(false);
      if (!mapped.ok) {
        expect(mapped.error).toBe(error);
      }
    });

    it('should change value type', () => {
      const result = Ok(42);
      const mapped = mapResult(result, x => String(x));
      
      expect(mapped.ok).toBe(true);
      if (mapped.ok) {
        expect(mapped.value).toBe('42');
        expect(typeof mapped.value).toBe('string');
      }
    });

    it('should chain multiple maps', () => {
      const result = Ok(5);
      const mapped = mapResult(
        mapResult(result, x => x * 2),
        x => x + 3
      );
      
      expect(mapped.ok).toBe(true);
      if (mapped.ok) {
        expect(mapped.value).toBe(13); // (5 * 2) + 3
      }
    });

    it('should stop mapping on first error', () => {
      const result = Ok(5);
      const mapped1 = mapResult(result, x => x * 2);
      const error = Err(new Error('Test error'));
      const mapped2 = mapResult(error, (x: number) => x + 3);
      
      expect(mapped2.ok).toBe(false);
    });
  });
});
