/**
 * Result 类型 - 函数式错误处理
 *
 * 使用 Result 替代 try-catch 可以：
 * 1. 让错误处理在类型系统中可见
 * 2. 避免静默失败
 * 3. 强制调用者处理错误情况
 */

/**
 * Success result with a value
 */
export type Success<T> = { ok: true; value: T };

/**
 * Error result with an error value
 */
export type ErrorResult<E = Error> = { ok: false; error: E };

/**
 * Result type - either success or error
 */
export type Result<T, E = Error> = Success<T> | ErrorResult<E>;



/**
 * 创建成功结果
 */
export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * 创建失败结果
 */
export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * 从 Promise 创建 Result
 * 将可能抛出异常的 Promise 转换为 Result 类型
 */
export async function fromPromise<T>(
  promise: Promise<T>
): Promise<Result<T, Error>> {
  try {
    const value = await promise;
    return Ok(value);
  } catch (e) {
    return Err(e instanceof Error ? e : new Error(String(e)));
  }
}


