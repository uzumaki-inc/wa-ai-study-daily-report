import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../utils/retry';

describe('withRetry', () => {
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
    const result = await withRetry(fn, 'test', 3);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('最大リトライ回数を超えるとエラーを投げる', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fail'));
    await expect(withRetry(fn, 'test', 2)).rejects.toThrow('always fail');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
