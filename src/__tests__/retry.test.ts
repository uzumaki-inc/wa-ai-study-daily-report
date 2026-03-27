import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry } from '../utils/retry';

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('成功時は即座に結果を返す', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, 'test');
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('失敗後にリトライして成功する', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const promise = withRetry(fn, 'test', 3);
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('最大リトライ回数を超えるとエラーを投げる', async () => {
    // maxRetries=1 で即失敗（タイマー不要）
    const fn = vi.fn().mockRejectedValueOnce(new Error('always fail'));
    await expect(withRetry(fn, 'test', 1)).rejects.toThrow('always fail');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
