/**
 * Result 类型 - 函数式错误处理
 *
 * 使用 Result 替代 try-catch 可以：
 * 1. 让错误处理在类型系统中可见
 * 2. 避免静默失败
 * 3. 强制调用者处理错误情况
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

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

/**
 * 批量执行并收集结果（不会因单个失败而中断）
 * 适用于批量操作需要知道哪些成功哪些失败的场景
 */
export async function collectResults<T>(
  promises: Promise<Result<T>>[]
): Promise<{ successes: T[]; failures: Error[] }> {
  const results = await Promise.all(promises);
  const successes: T[] = [];
  const failures: Error[] = [];

  for (const result of results) {
    if (result.ok) {
      successes.push(result.value);
    } else {
      failures.push(result.error);
    }
  }

  return { successes, failures };
}

/**
 * 将 Result 数组展平为单个值数组（忽略错误）
 * 适用于只关心成功结果的场景
 */
export function unwrapResults<T>(results: Result<T>[]): T[] {
  return results.filter((r): r is { ok: true; value: T } => r.ok).map((r) => r.value);
}

/**
 * 检查是否所有结果都成功
 */
export function allOk<T>(results: Result<T>[]): results is { ok: true; value: T }[] {
  return results.every((r) => r.ok);
}

/**
 * 将 Result 映射为新的值（如果成功）
 */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (result.ok) {
    return Ok(fn(result.value));
  }
  return result;
}
