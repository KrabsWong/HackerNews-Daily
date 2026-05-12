/**
 * Tests for Result type utilities
 */

import { describe, it, expect } from 'vitest';
import {
  Ok,
  Err,
  fromPromise,
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
});